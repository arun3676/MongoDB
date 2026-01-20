"""
FastAPI Service for Isolation Forest Fraud Detection

WHAT THIS DOES:
- Loads the trained Isolation Forest model
- Exposes REST API endpoint for fraud predictions
- Accepts transaction data, returns anomaly score
- Integrates with your TypeScript Suspicion Agent

WHY FASTAPI:
- Fast and modern Python web framework
- Automatic API documentation (Swagger UI)
- Type validation (Pydantic models)
- Easy to deploy (Docker, cloud, etc.)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pickle
import numpy as np
import pandas as pd
from typing import Optional
import os

# Initialize FastAPI app
app = FastAPI(
    title="Fraud Detection ML Service",
    description="Isolation Forest model for anomaly detection",
    version="1.0.0"
)

# Enable CORS (so your TypeScript app can call this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and scaler at startup
MODEL_PATH = "isolation_forest_model.pkl"
SCALER_PATH = "feature_scaler.pkl"

model = None
scaler = None
feature_columns = [
    'amount',
    'accountAgeDays',
    'confidence',
    'totalCost',
    'newAccount',
    'internationalTransfer',
    'unusualHour',
    'riskFlagCount'
]


@app.on_event("startup")
async def load_model():
    """
    Load model and scaler when API starts
    
    WHY AT STARTUP:
    - Model loading is expensive (only do it once)
    - All requests can use the same loaded model
    - Faster response times (no loading delay per request)
    """
    global model, scaler
    
    try:
        # Load Isolation Forest model
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(f'[SUCCESS] Loaded model from {MODEL_PATH}')
        
        # Load feature scaler
        with open(SCALER_PATH, 'rb') as f:
            scaler = pickle.load(f)
        print(f'[SUCCESS] Loaded scaler from {SCALER_PATH}')
        
    except FileNotFoundError as e:
        print(f'[ERROR] Model files not found: {e}')
        print('[INFO] Run train_isolation_forest.py first to train the model')
        raise
    except Exception as e:
        print(f'[ERROR] Failed to load model: {e}')
        raise


# Request/Response models (Pydantic for validation)
class TransactionRequest(BaseModel):
    """
    Input schema for fraud prediction
    
    WHAT WE NEED:
    - All the features the model was trained on
    - These match the features we extracted during training
    """
    amount: float = Field(..., description="Transaction amount", ge=0)
    accountAgeDays: Optional[int] = Field(None, description="Account age in days")
    confidence: Optional[float] = Field(None, description="Agent confidence score", ge=0, le=1)
    totalCost: Optional[float] = Field(0.0, description="Total cost of signals purchased", ge=0)
    newAccount: Optional[bool] = Field(False, description="Is this a new account?")
    internationalTransfer: Optional[bool] = Field(False, description="Is this an international transfer?")
    unusualHour: Optional[bool] = Field(False, description="Is this at an unusual hour?")
    riskFlagCount: Optional[int] = Field(0, description="Number of risk flags", ge=0)


class FraudPredictionResponse(BaseModel):
    """
    Output schema for fraud prediction
    
    WHAT WE RETURN:
    - anomalyScore: 0-1 scale (higher = more anomalous)
    - isAnomaly: Boolean flag (True if score > 0.5)
    - confidence: How confident the model is
    - explanation: Human-readable explanation
    """
    anomalyScore: float = Field(..., description="Anomaly score (0-1, higher = more anomalous)")
    isAnomaly: bool = Field(..., description="Is this transaction anomalous?")
    confidence: float = Field(..., description="Model confidence (0-1)")
    explanation: str = Field(..., description="Human-readable explanation")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Fraud Detection ML Service",
        "model": "Isolation Forest",
        "model_loaded": model is not None
    }


@app.get("/health")
async def health():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None
    }


@app.post("/predict", response_model=FraudPredictionResponse)
async def predict_fraud(transaction: TransactionRequest):
    """
    Predict fraud using Isolation Forest
    
    HOW IT WORKS:
    1. Receive transaction data from TypeScript Suspicion Agent
    2. Extract features in the same order as training
    3. Scale features using the same scaler from training
    4. Get anomaly score from Isolation Forest model
    5. Convert score to 0-1 scale (higher = more anomalous)
    6. Return prediction with explanation
    
    INTEGRATION FLOW:
    TypeScript Suspicion Agent → HTTP POST → This API → Returns anomaly score
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Step 1: Extract features in the same order as training
        features = np.array([[
            transaction.amount,
            transaction.accountAgeDays or 0,
            transaction.confidence or 0.0,
            transaction.totalCost or 0.0,
            1 if transaction.newAccount else 0,
            1 if transaction.internationalTransfer else 0,
            1 if transaction.unusualHour else 0,
            transaction.riskFlagCount or 0
        ]])
        
        # Step 2: Scale features (same as training)
        features_scaled = scaler.transform(features)
        
        # Step 3: Get anomaly score from model
        # Isolation Forest returns: -1 = anomaly, 1 = normal
        prediction = model.predict(features_scaled)[0]
        
        # Get raw score (negative = anomaly, positive = normal)
        raw_score = model.score_samples(features_scaled)[0]
        
        # Step 4: Convert to 0-1 scale (normalize)
        # We need to normalize based on the training data distribution
        # For simplicity, we'll use a sigmoid-like transformation
        # Higher absolute negative values = more anomalous
        if prediction == -1:  # Anomaly
            # Convert negative score to 0-1 (more negative = closer to 1)
            anomaly_score = 1 / (1 + np.exp(raw_score))  # Sigmoid transformation
            anomaly_score = max(0.5, min(1.0, anomaly_score))  # Clamp to 0.5-1.0
        else:  # Normal
            # Convert positive score to 0-1 (more positive = closer to 0)
            anomaly_score = 1 / (1 + np.exp(-raw_score))  # Inverse sigmoid
            anomaly_score = max(0.0, min(0.5, anomaly_score))  # Clamp to 0.0-0.5
        
        # Alternative: Use decision function for better score
        decision_score = model.decision_function(features_scaled)[0]
        # Decision function: negative = anomaly, positive = normal
        # Normalize to 0-1
        normalized_score = 1 / (1 + np.exp(decision_score))
        
        # Use normalized score
        anomaly_score = normalized_score
        
        # Step 5: Determine if anomaly (threshold = 0.5)
        is_anomaly = anomaly_score > 0.5
        
        # Step 6: Generate explanation
        explanation = generate_explanation(transaction, anomaly_score, is_anomaly)
        
        # Step 7: Calculate confidence (how far from threshold)
        confidence = abs(anomaly_score - 0.5) * 2  # 0-1 scale
        
        return FraudPredictionResponse(
            anomalyScore=round(anomaly_score, 4),
            isAnomaly=is_anomaly,
            confidence=round(confidence, 4),
            explanation=explanation
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


def generate_explanation(transaction: TransactionRequest, score: float, is_anomaly: bool) -> str:
    """
    Generate human-readable explanation
    
    WHY THIS MATTERS:
    - Regulators need explanations for denials
    - Helps Suspicion Agent understand why transaction is flagged
    - Improves transparency and trust
    """
    risk_factors = []
    
    if transaction.amount > 5000:
        risk_factors.append(f"high amount (${transaction.amount:,.2f})")
    if transaction.newAccount:
        risk_factors.append("new account")
    if transaction.internationalTransfer:
        risk_factors.append("international transfer")
    if transaction.unusualHour:
        risk_factors.append("unusual hour")
    if transaction.riskFlagCount > 2:
        risk_factors.append(f"multiple risk flags ({transaction.riskFlagCount})")
    
    if is_anomaly:
        if risk_factors:
            return f"Anomaly detected (score: {score:.2f}). Risk factors: {', '.join(risk_factors)}"
        else:
            return f"Anomaly detected (score: {score:.2f}). Transaction pattern deviates significantly from normal behavior."
    else:
        return f"Normal transaction (score: {score:.2f}). No significant anomalies detected."


if __name__ == "__main__":
    import uvicorn
    print("Starting Fraud Detection ML Service...")
    print("API Documentation available at: http://localhost:8020/docs")
    uvicorn.run(app, host="0.0.0.0", port=8020)
