# Skill: audit-packet-export

## What It's For

Exports complete fraud case audit packets from MongoDB to JSON files. Creates a comprehensive audit trail including transaction data, agent timeline, signals purchased, payment records, and decision chain. Ideal for compliance, offline analysis, and demo presentations.

## When to Use

Run this skill:
- **After completing a demo case** - Export for presentation
- **For compliance review** - Generate immutable audit trail
- **Before judging presentation** - Prepare audit packet to show
- **For offline analysis** - Export data for investigation
- **When sharing with stakeholders** - Send complete case history

## What It Does

1. Connects to MongoDB Atlas
2. Queries for the latest completed case (or specific transaction ID)
3. Aggregates data from all 6 collections:
   - `transactions` - Core case data
   - `agent_steps` - Timeline of agent actions
   - `signals` - Purchased signal data
   - `payments` - x402 payment ledger
   - `decisions` - Agent reasoning chain
   - `policies` - Active fraud policies at time of case
4. Computes summary statistics (total cost, duration, confidence)
5. Writes formatted JSON to `/exports/` directory
6. Prints file location and summary

## Inputs

**Environment Variables (from `.env.local`):**
- `MONGODB_URI` - MongoDB Atlas connection string (required)
- `MONGODB_DB_NAME` - Database name (default: `fraud_escalation`)

**Command-Line Arguments:**
```powershell
# Export latest completed case
node .claude\skills\audit-packet-export\export.js

# Export specific transaction by ID
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-002

# Export to custom location
node .claude\skills\audit-packet-export\export.js --output=C:\demo\audit.json
```

## Outputs

**Console Output:**
```
📦 Audit Packet Export
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Connected to MongoDB Atlas
   Database: fraud_escalation

🔍 Finding latest completed case...
   Transaction ID: TX-DEMO-2026-002
   Status: COMPLETED (DENIED)
   Completed: 2026-01-02 10:30:07

📊 Aggregating audit data...
   Transactions: 1
   Agent Steps: 8
   Signals: 2
   Payments: 2
   Decisions: 3
   Policies: 4 (active)

💾 Writing audit packet...
   File: C:\Users\arunk\hackathon\fraudagent\exports\audit-TX-DEMO-2026-002-20260102-103010.json
   Size: 18.4 KB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Audit Packet Exported Successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Transaction Summary:
   ID: TX-DEMO-2026-002
   Amount: $1,250.00
   User: user_demo_suspicious
   Merchant: Electronics Warehouse

Case Summary:
   Duration: 7.2 seconds
   Agents Involved: 4 (Orchestrator, L1, L2, Final)
   Signals Purchased: 2 ($0.35 total)
   Final Decision: DENY (95% confidence)

Timeline:
   1. [00:00] Orchestrator: CASE_CREATED
   2. [00:01] L1_Analyst: ANALYZING
   3. [00:02] L1_Analyst: SIGNAL_PURCHASED (velocity)
   4. [00:03] L1_Analyst: ESCALATED
   5. [00:04] L2_Analyst: ANALYZING
   6. [00:04] L2_Analyst: SIGNAL_PURCHASED (network)
   7. [00:05] L2_Analyst: ESCALATED
   8. [00:07] Final_Reviewer: DECISION_MADE (DENY)

File Location:
   C:\Users\arunk\hackathon\fraudagent\exports\audit-TX-DEMO-2026-002-20260102-103010.json

Open in VS Code? (Y/N):
```

**JSON File Structure:**
```json
{
  "auditPacket": {
    "version": "1.0",
    "generatedAt": "2026-01-02T10:30:10.000Z",
    "generatedBy": "audit-packet-export-skill",
    "transactionId": "TX-DEMO-2026-002",

    "case": { /* Full transaction document */ },
    "timeline": [ /* All agent_steps sorted by stepNumber */ ],
    "signals": [ /* All purchased signals with data */ ],
    "payments": [ /* All x402 payment records */ ],
    "decisions": [ /* Full decision chain */ ],
    "policies": [ /* Active policies at time of case */ ],

    "summary": {
      "totalSteps": 8,
      "agentsInvolved": ["Orchestrator", "L1_Analyst", "L2_Analyst", "Final_Reviewer"],
      "signalsPurchased": 2,
      "totalCost": 0.35,
      "duration_seconds": 7.2,
      "finalDecision": "DENY",
      "confidence": 0.95
    },

    "x402FlowAnalysis": {
      "totalPayments": 2,
      "totalSpent": 0.35,
      "averageLatency_ms": 350,
      "signals": [
        {
          "signal": "velocity",
          "cost": 0.10,
          "latency_ms": 400,
          "purchasedBy": "L1_Analyst"
        },
        {
          "signal": "network",
          "cost": 0.25,
          "latency_ms": 300,
          "purchasedBy": "L2_Analyst"
        }
      ]
    }
  }
}
```

**File Naming:**
- Pattern: `audit-{transactionId}-{timestamp}.json`
- Example: `audit-TX-DEMO-2026-002-20260102-103010.json`
- Location: `./exports/` (created if not exists)

**Exit Codes:**
- `0` - Success (file exported)
- `1` - MongoDB connection failed
- `2` - No completed cases found
- `3` - Export failed (file write error)

## Windows Commands

```powershell
# Export latest completed case
node .claude\skills\audit-packet-export\export.js

# Export specific transaction
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-002

# Export and open in VS Code
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-002 && code exports\audit-*.json

# Export all completed cases (loop)
for /f %i in ('node -e "console.log('TX-DEMO-2026-001 TX-DEMO-2026-002 TX-DEMO-2026-003')"') do node .claude\skills\audit-packet-export\export.js %i
```

## Use Cases

### 1. Demo Preparation
```powershell
# Seed demo data
node .claude\skills\synth-fraud-data\seed.js

# Export all demo cases
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-001
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-002
node .claude\skills\audit-packet-export\export.js TX-DEMO-2026-003

# Show exported files to judges
start exports\
```

### 2. Compliance Audit
```powershell
# Export specific case for review
node .claude\skills\audit-packet-export\export.js TX-PROD-2026-12345

# Share audit packet with compliance team
# File is self-contained and can be sent via email
```

### 3. Debugging
```powershell
# Export failing case for analysis
node .claude\skills\audit-packet-export\export.js TX-ERROR-2026-999

# Open in VS Code to inspect timeline
code exports\audit-TX-ERROR-2026-999-*.json
```

## Data Included in Audit Packet

**Transaction Data:**
- Transaction ID, amount, user ID, merchant
- Status, risk score, final decision
- Timestamps (created, updated, completed)

**Agent Timeline:**
- All steps in chronological order
- Agent name, action, description
- Timestamps (relative and absolute)
- Signal purchases highlighted

**Signals Purchased:**
- Signal type (velocity, network)
- Cost, purchased by which agent
- Signal data (scores, metrics)
- x402 flow latency

**Payment Records:**
- Payment IDs, proof tokens
- x402 flow timestamps (402→pay→200)
- Payment amounts and status

**Decisions:**
- Agent reasoning at each level
- Confidence scores
- Risk scores
- Evidence used (signals, policies)

**Policies:**
- Active fraud policies at time of case
- Thresholds and rules applied

## Integration with Other Skills

**Typical Workflow:**
1. `synth-fraud-data` - Create demo cases
2. `npm run dev` - Start server
3. Test cases in UI (http://localhost:3000/case/TX-...)
4. ✅ **audit-packet-export** (this skill) - Export audit packets
5. Present exported JSON files to judges

## Notes

- Exported files are read-only (do not modify MongoDB)
- Safe to run multiple times (creates new files each time)
- Files are self-contained (no external dependencies)
- JSON is formatted for readability (indented, sorted)
- Large cases may produce 50-100 KB files
- `/exports/` directory is gitignored (not committed)
