/**
 * Isolation Forest ML Service Client
 * 
 * WHAT THIS DOES:
 * - Calls the FastAPI Isolation Forest service
 * - Sends transaction data, receives anomaly score
 * - Handles errors and retries
 * 
 * HOW IT WORKS:
 * 1. Suspicion Agent calls this function
 * 2. This function sends HTTP POST to FastAPI service
 * 3. FastAPI loads model, makes prediction
 * 4. Returns anomaly score back to Suspicion Agent
 * 5. Suspicion Agent uses score to enhance suspicion calculation
 */

interface IsolationForestRequest {
  amount: number;
  accountAgeDays?: number;
  confidence?: number;
  totalCost?: number;
  newAccount?: boolean;
  internationalTransfer?: boolean;
  unusualHour?: boolean;
  riskFlagCount?: number;
}

interface IsolationForestResponse {
  anomalyScore: number; // 0-1, higher = more anomalous
  isAnomaly: boolean;
  confidence: number;
  explanation: string;
}

// Note: 8000/8010 are commonly used by other local APIs; we default to 8020 to avoid collisions.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8020';

/**
 * Get anomaly score from Isolation Forest ML service
 * 
 * INTEGRATION FLOW:
 * Suspicion Agent → This Function → FastAPI Service → Isolation Forest Model → Returns Score
 * 
 * WHY THIS DESIGN:
 * - Separation of concerns (TypeScript handles business logic, Python handles ML)
 * - FastAPI service can be scaled independently
 * - Model can be updated without changing TypeScript code
 * - Easy to test (can mock this function)
 */
export async function getAnomalyScore(
  transaction: IsolationForestRequest
): Promise<IsolationForestResponse | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transaction),
      // Timeout after 5 seconds (ML predictions should be fast)
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ML Service] Error ${response.status}: ${errorText}`);
      return null; // Return null on error (fallback to heuristics)
    }

    const data: IsolationForestResponse = await response.json();
    return data;
  } catch (error) {
    // Handle network errors, timeouts, etc.
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.warn('[ML Service] Request timeout - falling back to heuristics');
      } else {
        console.error(`[ML Service] Network error: ${error.message}`);
      }
    } else {
      console.error('[ML Service] Unknown error:', error);
    }
    return null; // Return null on error (fallback to heuristics)
  }
}

/**
 * Health check for ML service
 */
export async function checkMLServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
