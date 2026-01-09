# Skill: x402-smoke-test

## What It's For

Verifies the complete x402 payment protocol implementation by performing a live test: 402 Payment Required → POST payment → retry with proof → 200 with data. Tests both velocity and network signal endpoints.

## When to Use

Run this skill:
- **After implementing x402 endpoints** - Verify payment flow works
- **Before hackathon demo** - Ensure no errors in payment protocol
- **When debugging payment issues** - Test end-to-end flow
- **After changing signal endpoints** - Regression testing
- **For integration testing** - Verify MongoDB audit trail

## What It Does

1. Checks if Next.js dev server is running (localhost:3000)
2. Tests **Velocity Signal** x402 flow:
   - Initial GET request (no proof) → Expect 402
   - POST /api/payments → Get payment proof
   - Retry GET request (with proof) → Expect 200 with data
3. Tests **Network Signal** x402 flow (same pattern)
4. Verifies MongoDB audit trail:
   - Check `payments` collection for x402Details
   - Check `signals` collection for signal data
5. Measures latency of full x402 flow
6. Prints detailed report with proof tokens

## Inputs

**Prerequisites:**
- Next.js dev server must be running (`npm run dev`)
- MongoDB Atlas connected
- x402 endpoints implemented:
  - `GET /api/signals/velocity`
  - `GET /api/signals/network`
  - `POST /api/payments`

**Command-Line Flags (optional):**
- `--verbose` - Show full request/response bodies
- `--skip-network` - Only test velocity signal

## Outputs

**Console Output:**
```
🧪 x402 Smoke Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Prerequisites
   Next.js server: http://localhost:3000 (running)
   MongoDB Atlas: Connected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 Testing Velocity Signal ($0.10)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Initial Request (No Payment Proof)
   GET /api/signals/velocity?userId=test_user_123

   Response: 402 Payment Required ✅
   Headers:
     X-Payment-Required: 0.10 USD
     X-Payment-URL: /api/payments
   Body:
     {
       "error": "Payment Required",
       "amount": 0.10,
       "signal": "velocity",
       "paymentUrl": "/api/payments"
     }

Step 2: Make Payment
   POST /api/payments
   Body: { amount: 0.10, signal: "velocity", transactionId: "TX-TEST-X402-001" }

   Response: 200 OK ✅
   Payment ID: pay_1735876543_abc123
   Payment Proof: 8f3a2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a

Step 3: Retry with Payment Proof
   GET /api/signals/velocity?userId=test_user_123
   Header: X-Payment-Proof: 8f3a2b1c9d4e5f6a...

   Response: 200 OK ✅
   Signal ID: sig_velocity_1735876544_xyz789
   Signal Data:
     {
       "velocityScore": 0.67,
       "last24hTxCount": 12,
       "interpretation": "MODERATE - Slightly elevated activity"
     }

✅ Velocity Signal x402 Flow: PASS (285ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🟣 Testing Network Signal ($0.25)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Similar output for network signal...]

✅ Network Signal x402 Flow: PASS (320ms)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 MongoDB Audit Trail Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Payments Collection
   Found 2 payment records
   Velocity: pay_1735876543_abc123
     - x402Details.http402Response ✓
     - x402Details.paymentRequest ✓
     - x402Details.paymentProof ✓
     - x402Details.retryRequest ✓
     - x402Details.http200Response ✓

✅ Signals Collection
   Found 2 signal records
   Velocity: sig_velocity_1735876544_xyz789
   Network: sig_network_1735876545_def456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ x402 Smoke Test: ALL PASS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Performance:
   Velocity Flow: 285ms
   Network Flow: 320ms
   Average: 302ms (target: <500ms)

MongoDB Audit Trail: Complete ✓

Ready for demo! 🎉
```

**Exit Codes:**
- `0` - All tests passed
- `1` - Server not running
- `2` - 402 flow failed (wrong status code)
- `3` - Payment processing failed
- `4` - Data delivery failed (200 not received)
- `5` - MongoDB audit trail incomplete

## Windows Commands

```powershell
# Ensure dev server is running first
npm run dev

# In a separate terminal, run smoke test
node .claude\skills\x402-smoke-test\test.js

# With verbose output
node .claude\skills\x402-smoke-test\test.js --verbose

# Skip network signal test (faster)
node .claude\skills\x402-smoke-test\test.js --skip-network
```

## Test Scenarios Covered

### ✅ Happy Path
- Initial request without proof → 402
- Payment generates proof token → 200
- Retry with valid proof → 200 with data

### ✅ Error Cases
- Invalid payment proof → 402
- Missing payment proof → 402
- Wrong amount in payment → 400
- Expired proof (if test waits 1 hour) → 402

### ✅ Data Validation
- Signal data contains required fields
- Payment record in MongoDB has x402Details
- Signal record in MongoDB matches payment

### ✅ Performance
- Full x402 flow completes in < 500ms
- Latency measured and reported

## Troubleshooting

**Error: "Cannot connect to http://localhost:3000"**
- Start Next.js dev server: `npm run dev`
- Wait for "Ready in X.Xs" message
- Verify server is listening on port 3000

**Error: "402 expected but got 500"**
- Check server console for errors
- Verify MongoDB connection in .env.local
- Ensure x402 endpoints are implemented

**Error: "Payment proof rejected"**
- Check payments collection has the proof token
- Verify proof not expired (< 1 hour old)
- Check payment status is "COMPLETED"

**Error: "MongoDB audit trail incomplete"**
- Verify payments collection writes on POST /api/payments
- Check signals collection writes on successful 200 response
- Ensure x402Details object has all required fields

## Integration with Other Skills

**Run Order:**
1. `atlas-setup-check` - Verify MongoDB connection
2. Implement x402 endpoints (orchestration-agent, payments-agent)
3. `npm run dev` - Start Next.js server
4. ✅ **x402-smoke-test** (this skill) - Test payment flow
5. `synth-fraud-data` - Seed demo cases
6. Test full agent flow with real transactions

## Clean Up Test Data

After running smoke test, clean up test records:

```powershell
# Connect to MongoDB and delete test records
node -e "require('mongodb').MongoClient.connect(process.env.MONGODB_URI).then(async client => { const db = client.db('fraud_escalation'); await db.collection('payments').deleteMany({ transactionId: /TX-TEST-X402/ }); await db.collection('signals').deleteMany({ transactionId: /TX-TEST-X402/ }); console.log('Test data cleaned'); await client.close(); })"
```

## Notes

- Creates test transactions with ID pattern: `TX-TEST-X402-*`
- Test payments use mock proof tokens (not real money)
- Safe to run multiple times (creates new test records each time)
- Does not interfere with demo data (different transaction ID pattern)
- Requires Next.js dev server running (port 3000)
