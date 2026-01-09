# Skill: synth-fraud-data

## What It's For

Seeds MongoDB Atlas with realistic demo fraud cases for testing and demo purposes. Creates 3 transaction scenarios: clean approval, suspicious block, and false-positive that gets escalated but approved.

## When to Use

Run this skill:
- **Before first demo** - Populate database with demo cases
- **After resetting database** - Restore demo data
- **For testing UI** - See how different scenarios display
- **Before presenting to judges** - Show variety of cases
- **When developing agents** - Test with realistic data

## What It Does

1. Connects to MongoDB Atlas
2. Generates 3 demo transaction cases:
   - **Case 1: Clean Approval** - Low risk, approved by L1
   - **Case 2: Suspicious Block** - High velocity + bad network, denied by Final
   - **Case 3: False Positive** - Initially suspicious, but approved after analysis
3. Inserts transactions into `transactions` collection
4. Creates complete agent timeline in `agent_steps`
5. Adds signal purchases to `signals` and `payments`
6. Writes decision chain to `decisions`
7. Prints summary with transaction IDs for testing

## Inputs

**Environment Variables (from `.env.local`):**
- `MONGODB_URI` - MongoDB Atlas connection string (required)
- `MONGODB_DB_NAME` - Database name (default: `fraud_escalation`)

**Command-Line Flags (optional):**
- `--clear` - Delete existing demo data before seeding
- `--count=N` - Number of cases to generate (default: 3)

## Outputs

**Console Output:**
```
🌱 Seeding Demo Fraud Data
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Connected to MongoDB Atlas
   Database: fraud_escalation

🗑️  Clearing existing demo data... (if --clear)
   Deleted 5 transactions
   Deleted 28 agent steps
   Deleted 7 signals
   Deleted 7 payments
   Deleted 11 decisions

📝 Creating demo cases...

Case 1: Clean Approval
   Transaction ID: TX-DEMO-2026-001
   Amount: $45.00
   User: user_demo_clean
   Status: APPROVED (L1)
   Risk Score: 0.15

Case 2: Suspicious Block
   Transaction ID: TX-DEMO-2026-002
   Amount: $1,250.00
   User: user_demo_suspicious
   Status: DENIED (Final)
   Risk Score: 0.92
   Signals: velocity ($0.10), network ($0.25)

Case 3: False Positive
   Transaction ID: TX-DEMO-2026-003
   Amount: $750.00
   User: user_demo_edge
   Status: APPROVED (L2)
   Risk Score: 0.48
   Signals: velocity ($0.10)

✅ Seeding Complete!

Summary:
   Transactions: 3
   Agent Steps: 15
   Signals: 3
   Payments: 3
   Decisions: 6
   Total Signal Cost: $0.60

Test URLs:
   http://localhost:3000/case/TX-DEMO-2026-001
   http://localhost:3000/case/TX-DEMO-2026-002
   http://localhost:3000/case/TX-DEMO-2026-003
```

**Files Created:**
- None (data written to MongoDB only)

**Exit Codes:**
- `0` - Success (data seeded)
- `1` - MongoDB connection failed
- `2` - Missing environment variables
- `3` - Seeding failed

## Windows Commands

```powershell
# Seed demo data (default 3 cases)
node .claude\skills\synth-fraud-data\seed.js

# Clear existing demo data first
node .claude\skills\synth-fraud-data\seed.js --clear

# Generate more cases
node .claude\skills\synth-fraud-data\seed.js --count=5

# Clear and regenerate
node .claude\skills\synth-fraud-data\seed.js --clear --count=3
```

## Demo Case Details

### Case 1: Clean Approval (Low Risk)
```json
{
  "transactionId": "TX-DEMO-2026-001",
  "amount": 45.00,
  "userId": "user_demo_clean",
  "merchantName": "Coffee Shop",
  "status": "COMPLETED",
  "finalDecision": "APPROVE",
  "riskScore": 0.15,
  "currentAgent": null,
  "timeline": [
    "Orchestrator: CASE_CREATED",
    "L1_Analyst: ANALYZING",
    "L1_Analyst: APPROVED"
  ],
  "signals": [],
  "totalCost": 0.00
}
```

### Case 2: Suspicious Block (High Risk)
```json
{
  "transactionId": "TX-DEMO-2026-002",
  "amount": 1250.00,
  "userId": "user_demo_suspicious",
  "merchantName": "Electronics Warehouse",
  "status": "COMPLETED",
  "finalDecision": "DENY",
  "riskScore": 0.92,
  "currentAgent": null,
  "timeline": [
    "Orchestrator: CASE_CREATED",
    "L1_Analyst: ANALYZING",
    "L1_Analyst: SIGNAL_PURCHASED (velocity $0.10)",
    "L1_Analyst: ESCALATED",
    "L2_Analyst: ANALYZING",
    "L2_Analyst: SIGNAL_PURCHASED (network $0.25)",
    "L2_Analyst: ESCALATED",
    "Final_Reviewer: DECISION_MADE (DENY)"
  ],
  "signals": [
    { "type": "velocity", "score": 0.87, "cost": 0.10 },
    { "type": "network", "score": 0.78, "cost": 0.25 }
  ],
  "totalCost": 0.35
}
```

### Case 3: False Positive (Edge Case)
```json
{
  "transactionId": "TX-DEMO-2026-003",
  "amount": 750.00,
  "userId": "user_demo_edge",
  "merchantName": "Department Store",
  "status": "COMPLETED",
  "finalDecision": "APPROVE",
  "riskScore": 0.48,
  "currentAgent": null,
  "timeline": [
    "Orchestrator: CASE_CREATED",
    "L1_Analyst: ANALYZING",
    "L1_Analyst: SIGNAL_PURCHASED (velocity $0.10)",
    "L1_Analyst: ESCALATED",
    "L2_Analyst: ANALYZING",
    "L2_Analyst: APPROVED"
  ],
  "signals": [
    { "type": "velocity", "score": 0.62, "cost": 0.10 }
  ],
  "totalCost": 0.10
}
```

## Data Integrity

The seeded data ensures:
- ✅ Sequential step numbers in `agent_steps` (1, 2, 3...)
- ✅ Valid foreign key relationships (transactionId links)
- ✅ Realistic timestamps (distributed over last hour)
- ✅ Complete decision chains
- ✅ Proper x402 audit trails in `payments`
- ✅ Signal data matches payment records

## Integration with Other Skills

**Run Order:**
1. `atlas-setup-check` - Verify MongoDB connection
2. ✅ **synth-fraud-data** (this skill) - Seed demo data
3. `npm run dev` - Start Next.js dev server
4. Open demo URLs in browser
5. `audit-packet-export` - Export demo case audits

## Testing with Seeded Data

```powershell
# After seeding, test the UI
npm run dev

# Open browser to demo cases
start http://localhost:3000/case/TX-DEMO-2026-001
start http://localhost:3000/case/TX-DEMO-2026-002
start http://localhost:3000/case/TX-DEMO-2026-003

# Verify in MongoDB Compass
# Connect to MongoDB Atlas and browse collections
```

## Notes

- Demo transaction IDs follow pattern: `TX-DEMO-2026-XXX`
- Seeded data is static (not generated by real agents)
- Safe to run multiple times (creates new transactions each time)
- Use `--clear` flag to remove previous demo data
- Does not require Next.js dev server to be running
