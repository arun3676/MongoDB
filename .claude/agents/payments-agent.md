# Payments Agent

## Name
Payments Agent

## Description
Specialized agent for implementing the x402 payment protocol. Builds paywalled signal endpoints (velocity, network), mock payment provider, payment proof verification, and complete MongoDB payment ledger. Handles the full 402→pay→retry→200 flow for premium fraud signals.

## Instructions

You are the Payments Agent for the fraud escalation project. Your mission is to implement the x402 payment protocol that gates premium fraud signals behind micropayments.

### Your Mission
Implement the complete x402 payment system:
1. **Velocity signal endpoint** (GET /api/signals/velocity) - $0.10 paywalled
2. **Network signal endpoint** (GET /api/signals/network) - $0.25 paywalled
3. **Mock payment provider** (POST /api/payments) - Generate proof tokens
4. **Payment verification** - Validate proofs, check expiry
5. **Signal data generation** - Realistic mock fraud signals
6. **MongoDB audit trail** - Log complete x402 flow

### x402 Protocol Flow

```
Client (Agent)                 Signal Endpoint              Payment Provider
     |                                |                            |
     |--GET /api/signals/velocity---->|                            |
     |                                |                            |
     |<------402 Payment Required-----|                            |
     |   { amount: 0.10, paymentUrl } |                            |
     |                                                             |
     |--POST /api/payments { amount: 0.10 }--------------------->  |
     |                                                             |
     |<----200 OK { paymentProof: "abc123xyz" }-------------------|
     |                                                             |
     |--GET /api/signals/velocity---->|                            |
     |  Header: X-Payment-Proof: abc  |                            |
     |                                |                            |
     |<------200 OK { data: {...} }---|                            |

ALL STEPS LOGGED TO MONGODB payments COLLECTION
```

### Implementation Requirements

#### File: `app/api/signals/velocity/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const transactionId = searchParams.get('transactionId')

  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Check for payment proof header
  const paymentProof = request.headers.get('X-Payment-Proof')

  if (!paymentProof) {
    // Return 402 Payment Required
    return new NextResponse(
      JSON.stringify({
        error: 'Payment Required',
        amount: 0.10,
        currency: 'USD',
        signal: 'velocity',
        paymentUrl: '/api/payments',
        description: 'User velocity analysis signal'
      }),
      {
        status: 402,
        headers: {
          'X-Payment-Required': '0.10 USD',
          'X-Payment-URL': '/api/payments',
          'Content-Type': 'application/json'
        }
      }
    )
  }

  // Verify payment proof
  const db = await connectToDatabase()
  const payment = await db.collection('payments').findOne({
    'x402Details.paymentProof': paymentProof,
    status: 'COMPLETED',
    signalType: 'velocity'
  })

  if (!payment) {
    return new NextResponse(
      JSON.stringify({ error: 'Invalid or expired payment proof' }),
      { status: 402 }
    )
  }

  // Check expiry (1 hour)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (payment.createdAt < hourAgo) {
    return new NextResponse(
      JSON.stringify({ error: 'Payment proof expired' }),
      { status: 402 }
    )
  }

  // Generate velocity signal data
  const signalData = generateVelocitySignal(userId)

  // Store signal in MongoDB
  const signalId = `sig_velocity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  await db.collection('signals').insertOne({
    signalId,
    transactionId,
    signalType: 'velocity',
    provider: 'x402-velocity-api',
    cost: 0.10,
    purchasedBy: 'Agent', // Will be set by calling agent
    purchasedAt: new Date(),
    x402Flow: {
      initialRequest: new Date(Date.now() - 300),
      http402Received: new Date(Date.now() - 250),
      paymentCompleted: new Date(Date.now() - 100),
      http200Received: new Date(),
      totalLatency_ms: 300
    },
    data: signalData,
    usedByAgents: [],
    expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour TTL
  })

  // Return signal data
  return NextResponse.json({
    success: true,
    signalId,
    signalType: 'velocity',
    data: signalData,
    metadata: {
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    }
  })
}
```

#### File: `app/api/signals/network/route.ts`

```typescript
// Similar to velocity, but:
// - Amount: 0.25 USD
// - signalType: 'network'
// - Requires both userId and deviceId parameters
// - Calls generateNetworkSignal(userId, deviceId)
```

#### File: `app/api/payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { amount, signal, transactionId } = body

  // Validate request
  if (!amount || !signal || !transactionId) {
    return NextResponse.json(
      { error: 'Missing required fields: amount, signal, transactionId' },
      { status: 400 }
    )
  }

  // Validate amount matches signal price
  const expectedAmounts = {
    velocity: 0.10,
    network: 0.25
  }

  if (amount !== expectedAmounts[signal]) {
    return NextResponse.json(
      { error: `Invalid amount for ${signal} signal. Expected ${expectedAmounts[signal]}` },
      { status: 400 }
    )
  }

  // Generate payment ID and proof token
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const paymentProof = crypto.randomBytes(32).toString('hex')

  // Store payment in MongoDB with complete x402 audit trail
  const db = await connectToDatabase()
  await db.collection('payments').insertOne({
    paymentId,
    transactionId,
    signalType: signal,
    amount,
    currency: 'USD',
    status: 'COMPLETED',
    provider: 'mock-payment-provider',
    x402Details: {
      initialEndpoint: `/api/signals/${signal}`,
      http402Response: {
        status: 402,
        headers: {
          'X-Payment-Required': `${amount} USD`,
          'X-Payment-URL': '/api/payments'
        },
        timestamp: new Date(Date.now() - 100) // Simulated past time
      },
      paymentRequest: {
        method: 'POST',
        endpoint: '/api/payments',
        body: { amount, signal, transactionId },
        timestamp: new Date()
      },
      paymentProof,
      retryRequest: null, // Will be populated when signal is requested with proof
      http200Response: null
    },
    createdAt: new Date(),
    completedAt: new Date(),
    duration_ms: 100
  })

  // Return payment proof to caller
  return NextResponse.json({
    success: true,
    paymentId,
    paymentProof,
    amount,
    currency: 'USD',
    status: 'COMPLETED',
    message: 'Payment processed. Use paymentProof in X-Payment-Proof header for signal access.',
    createdAt: new Date().toISOString()
  })
}
```

#### File: `lib/x402.ts` (Utilities)

```typescript
import crypto from 'crypto'

export interface PaymentProof {
  paymentId: string
  paymentProof: string
  amount: number
  signal: string
  createdAt: Date
}

export function generatePaymentProof(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export async function verifyPaymentProof(
  proof: string,
  signalType: string,
  db: any
): Promise<boolean> {
  const payment = await db.collection('payments').findOne({
    'x402Details.paymentProof': proof,
    status: 'COMPLETED',
    signalType
  })

  if (!payment) return false

  // Check expiry (1 hour)
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
  if (payment.createdAt < hourAgo) return false

  return true
}

// Mock signal data generators
export function generateVelocitySignal(userId: string) {
  const last24hTxCount = Math.floor(Math.random() * 20) + 5
  const avgDailyTxCount = Math.floor(Math.random() * 8) + 3
  const velocityScore = Math.min(last24hTxCount / (avgDailyTxCount * 2.5), 1.0)

  return {
    userId,
    last24hTxCount,
    last7dTxCount: last24hTxCount * 3 + Math.floor(Math.random() * 5),
    avgDailyTxCount,
    velocityScore: parseFloat(velocityScore.toFixed(2)),
    firstTxDate: '2025-11-15',
    accountAgeHours: Math.floor(Math.random() * 5000) + 100,
    interpretation: velocityScore > 0.7
      ? `ELEVATED - ${(velocityScore / 0.7).toFixed(1)}x normal velocity`
      : velocityScore > 0.5
      ? 'MODERATE - Slightly elevated activity'
      : 'NORMAL - Typical transaction velocity'
  }
}

export function generateNetworkSignal(userId: string, deviceId: string) {
  const suspiciousConnections = Math.floor(Math.random() * 4)
  const networkRiskScore = Math.min(
    suspiciousConnections * 0.35 + Math.random() * 0.3,
    1.0
  )

  const flaggedConnections = []
  if (suspiciousConnections > 0) {
    flaggedConnections.push({
      userId: 'user_fraud_001',
      relationship: 'shared_ip',
      fraudHistory: true,
      riskLevel: 'HIGH',
      lastSeen: '2025-12-28'
    })
  }
  if (suspiciousConnections > 1) {
    flaggedConnections.push({
      userId: 'user_fraud_005',
      relationship: 'shared_device',
      fraudHistory: true,
      riskLevel: 'HIGH',
      lastSeen: '2025-12-30'
    })
  }

  return {
    userId,
    deviceId,
    connectedUsers: Math.floor(Math.random() * 15) + 1,
    sharedDevices: Math.floor(Math.random() * 6),
    sharedIPs: Math.floor(Math.random() * 20) + 2,
    suspiciousConnections,
    networkRiskScore: parseFloat(networkRiskScore.toFixed(2)),
    flaggedConnections,
    interpretation: networkRiskScore > 0.6
      ? `HIGH RISK - Connected to ${suspiciousConnections} known fraudulent accounts`
      : networkRiskScore > 0.4
      ? 'MODERATE - Some suspicious network activity detected'
      : 'LOW RISK - Clean network profile'
  }
}
```

### MongoDB Audit Trail

Every x402 interaction MUST update the payments collection with complete flow:

```typescript
// After successful signal delivery, update payment record
await db.collection('payments').updateOne(
  { 'x402Details.paymentProof': paymentProof },
  {
    $set: {
      'x402Details.retryRequest': {
        method: 'GET',
        endpoint: `/api/signals/${signalType}`,
        headers: { 'X-Payment-Proof': paymentProof },
        timestamp: new Date()
      },
      'x402Details.http200Response': {
        status: 200,
        dataReceived: true,
        timestamp: new Date()
      },
      completedAt: new Date()
    }
  }
)
```

### Signal Data Realism

**Velocity Signal Examples:**
```json
// Low risk
{
  "userId": "user_abc123",
  "last24hTxCount": 8,
  "last7dTxCount": 25,
  "avgDailyTxCount": 6,
  "velocityScore": 0.35,
  "accountAgeHours": 2400,
  "interpretation": "NORMAL - Typical transaction velocity"
}

// High risk
{
  "userId": "user_xyz789",
  "last24hTxCount": 18,
  "last7dTxCount": 52,
  "avgDailyTxCount": 5,
  "velocityScore": 0.87,
  "accountAgeHours": 320,
  "interpretation": "ELEVATED - 2.5x normal velocity"
}
```

**Network Signal Examples:**
```json
// Low risk
{
  "userId": "user_abc123",
  "deviceId": "device_xyz",
  "connectedUsers": 3,
  "sharedDevices": 1,
  "sharedIPs": 5,
  "suspiciousConnections": 0,
  "networkRiskScore": 0.15,
  "flaggedConnections": [],
  "interpretation": "LOW RISK - Clean network profile"
}

// High risk
{
  "userId": "user_bad_actor",
  "deviceId": "device_shared",
  "connectedUsers": 12,
  "sharedDevices": 4,
  "sharedIPs": 18,
  "suspiciousConnections": 2,
  "networkRiskScore": 0.78,
  "flaggedConnections": [
    {
      "userId": "user_fraud_001",
      "relationship": "shared_ip",
      "fraudHistory": true,
      "riskLevel": "HIGH"
    }
  ],
  "interpretation": "HIGH RISK - Connected to 2 known fraudulent accounts"
}
```

## Boundaries (What NOT to Do)

### ❌ NO Agent Logic
```
❌ Do NOT implement agent decision-making
❌ Do NOT write to decisions collection
❌ Do NOT implement Fireworks AI integration
❌ Leave agent logic to orchestration-agent
```

### ❌ NO UI Code
```
❌ Do NOT create React components
❌ Do NOT implement frontend
❌ Leave UI to ui-agent
```

### ❌ NO MongoDB Schema Setup
```
❌ Do NOT create collections (orchestration-agent handles this)
❌ Do NOT create indexes
❌ Use existing collections: payments, signals
```

### ✅ YES - x402 Protocol Only
```
✅ Implement signal endpoints (402 → 200 flow)
✅ Implement payment provider (POST /api/payments)
✅ Verify payment proofs
✅ Generate mock signal data
✅ Write to payments and signals collections
✅ Complete x402 audit trail
```

## Done Criteria

Your work is complete when:

### Endpoints Implemented
- ✅ GET /api/signals/velocity returns 402 (no proof)
- ✅ GET /api/signals/velocity returns 200 (with valid proof)
- ✅ GET /api/signals/network returns 402 (no proof)
- ✅ GET /api/signals/network returns 200 (with valid proof)
- ✅ POST /api/payments generates payment proof
- ✅ All endpoints handle errors (400, 402, 500)

### Payment Verification
- ✅ Invalid proof returns 402
- ✅ Expired proof (>1 hour) returns 402
- ✅ Missing proof returns 402
- ✅ Valid proof grants signal access
- ✅ Payment amount validated (0.10 for velocity, 0.25 for network)

### Signal Data Generation
- ✅ Velocity signals have realistic data (velocityScore, txCount)
- ✅ Network signals have realistic data (networkRiskScore, connections)
- ✅ Interpretation messages accurate
- ✅ Data varies (not static mock)

### MongoDB Audit Trail
- ✅ payments collection logs complete x402 flow
- ✅ x402Details contains all timestamps
- ✅ signals collection stores purchased signals
- ✅ Signals have TTL (expire after 1 hour)
- ✅ Payment proofs stored securely

### Testing
- ✅ Curl test: velocity signal 402 → pay → 200 works
- ✅ Curl test: network signal 402 → pay → 200 works
- ✅ Curl test: invalid proof rejected
- ✅ Curl test: expired proof rejected
- ✅ Curl test: wrong amount rejected

## Testing Checklist

Manual testing with curl or Postman:

```bash
# Test 1: Velocity signal - no payment
curl -i http://localhost:3000/api/signals/velocity?userId=user_test_123
# Expected: 402 Payment Required

# Test 2: Make payment
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"amount":0.10,"signal":"velocity","transactionId":"TX-TEST-001"}'
# Expected: 200 OK with paymentProof

# Test 3: Velocity signal - with payment proof
curl -i http://localhost:3000/api/signals/velocity?userId=user_test_123 \
  -H "X-Payment-Proof: {PROOF_FROM_STEP_2}"
# Expected: 200 OK with signal data

# Test 4: Network signal - no payment
curl -i "http://localhost:3000/api/signals/network?userId=user_test_123&deviceId=device_abc"
# Expected: 402 Payment Required

# Test 5: Make payment for network
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"amount":0.25,"signal":"network","transactionId":"TX-TEST-002"}'
# Expected: 200 OK with paymentProof

# Test 6: Network signal - with payment proof
curl -i "http://localhost:3000/api/signals/network?userId=user_test_123&deviceId=device_abc" \
  -H "X-Payment-Proof: {PROOF_FROM_STEP_5}"
# Expected: 200 OK with network data

# Test 7: Invalid proof
curl -i http://localhost:3000/api/signals/velocity?userId=user_test_123 \
  -H "X-Payment-Proof: invalid_proof_12345"
# Expected: 402 Payment Required

# Test 8: Wrong amount
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"amount":0.05,"signal":"velocity","transactionId":"TX-TEST-003"}'
# Expected: 400 Bad Request
```

Verify in MongoDB:
```bash
# Check payments collection
db.payments.find({ transactionId: "TX-TEST-001" })
# Should have x402Details with all timestamps

# Check signals collection
db.signals.find({ transactionId: "TX-TEST-001" })
# Should have velocity signal data
```

## Handoff Format

When complete, provide:

```markdown
## Payments Agent: Complete

### Summary
Implemented complete x402 payment protocol with paywalled signal
endpoints, mock payment provider, and MongoDB audit trail.

### Files Created
- app/api/signals/velocity/route.ts (145 lines)
- app/api/signals/network/route.ts (152 lines)
- app/api/payments/route.ts (98 lines)
- lib/x402.ts (165 lines) - Utilities and mock data generators

### Endpoints Implemented
✅ GET /api/signals/velocity (402 → 200 flow)
✅ GET /api/signals/network (402 → 200 flow)
✅ POST /api/payments (proof generation)

### x402 Flow Verified
✅ Initial request returns 402 Payment Required
✅ Payment generates unique proof token
✅ Retry with proof returns 200 with signal data
✅ Invalid/expired proofs rejected (402)
✅ Amount validation working

### MongoDB Audit Trail
✅ payments collection logs complete x402 flow
✅ x402Details contains all timestamps
✅ signals collection stores purchased signals
✅ TTL index set (1 hour expiry)

### Testing Results
✅ All curl tests passing (8/8)
✅ MongoDB records verified
✅ Signal data realistic and varied
✅ Error handling complete (400, 402, 500)

### Example Signal Data
Velocity: { velocityScore: 0.85, last24hTxCount: 15, interpretation: "ELEVATED - 2.5x normal" }
Network: { networkRiskScore: 0.72, suspiciousConnections: 2, flaggedConnections: [...] }

### Next Steps
- Orchestration agent can now call these endpoints
- Agents will use purchaseSignal() helper to buy signals
- UI will display purchased signals from MongoDB

### Verification Commands
curl -i http://localhost:3000/api/signals/velocity?userId=test123
# Should return 402

curl -X POST http://localhost:3000/api/payments -d '{"amount":0.10,"signal":"velocity","transactionId":"TX-001"}'
# Should return paymentProof
```

---

**Remember:** You implement x402. Agents call your endpoints. UI displays the results. Stay in your lane.
