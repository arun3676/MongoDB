# Skill: atlas-setup-check

## What It's For

Verifies MongoDB Atlas connectivity and ensures the fraud escalation database is properly configured with all required collections and indexes. This is the first skill to run after setting up `.env.local`.

## When to Use

Run this skill:
- **After initial project setup** - Verify MongoDB Atlas connection works
- **After updating `.env.local`** - Test new MongoDB URI
- **Before running the app** - Ensure database is ready
- **After schema changes** - Verify new collections/indexes created
- **When debugging database issues** - Check connection and schema

## What It Does

1. Loads environment variables from `.env.local`
2. Connects to MongoDB Atlas using `MONGODB_URI`
3. Lists all collections in the database
4. Checks if required collections exist:
   - `transactions`
   - `agent_steps`
   - `signals`
   - `payments`
   - `decisions`
   - `policies`
5. Verifies indexes on each collection
6. Prints a summary report

## Inputs

**Environment Variables (from `.env.local`):**
- `MONGODB_URI` - MongoDB Atlas connection string (required)
- `MONGODB_DB_NAME` - Database name (default: `fraud_escalation`)

**No command-line arguments required.**

## Outputs

**Console Output:**
```
🔍 MongoDB Atlas Setup Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Environment Variables
   MONGODB_URI: mongodb+srv://***@cluster.mongodb.net/...
   MONGODB_DB_NAME: fraud_escalation

✅ MongoDB Connection: OK
   Cluster: cluster0.abc123.mongodb.net
   Database: fraud_escalation

✅ Collections: 6/6 found
   ✓ transactions
   ✓ agent_steps
   ✓ signals
   ✓ payments
   ✓ decisions
   ✓ policies

✅ Indexes: 20/20 verified
   transactions: 4 indexes
   agent_steps: 3 indexes
   signals: 4 indexes
   payments: 3 indexes
   decisions: 4 indexes
   policies: 2 indexes

✅ Document Counts:
   transactions: 0
   agent_steps: 0
   signals: 0
   payments: 0
   decisions: 0
   policies: 4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Atlas OK - Ready for fraud detection!
```

**Exit Codes:**
- `0` - Success (all checks passed)
- `1` - Connection failed
- `2` - Missing environment variables
- `3` - Missing collections
- `4` - Missing indexes

## Windows Commands

```powershell
# Run the skill
node .claude\skills\atlas-setup-check\check.js

# Or from project root
node .\.claude\skills\atlas-setup-check\check.js

# With verbose output (if supported)
node .\.claude\skills\atlas-setup-check\check.js --verbose
```

## Expected Behavior

**First Run (Before Setup):**
- Collections do not exist
- Script will report missing collections
- Exit code: 3

**After Running MongoDB Setup:**
- All collections exist
- All indexes created
- Policies seeded
- Exit code: 0

## Troubleshooting

**Error: "MONGODB_URI not set"**
- Ensure `.env.local` exists in project root
- Verify `MONGODB_URI` is defined (no spaces, valid format)

**Error: "Connection timeout"**
- Check network connectivity
- Verify MongoDB Atlas IP whitelist includes your IP
- Confirm Atlas cluster is running (not paused)

**Error: "Authentication failed"**
- Verify username/password in `MONGODB_URI` are correct
- Check Atlas user has read/write permissions

**Error: "Missing collections"**
- Run MongoDB setup script first (orchestration-agent creates collections)
- Or manually create collections via MongoDB Compass

## Integration with Other Skills

**Run Order:**
1. ✅ **atlas-setup-check** (this skill) - Verify connection
2. `synth-fraud-data` - Seed demo data
3. `x402-smoke-test` - Test payment flow
4. `audit-packet-export` - Export audit packets

## Notes

- This skill is **read-only** - it does not create collections or indexes
- If collections/indexes are missing, use orchestration-agent to create them
- Safe to run multiple times (idempotent)
- Does not require the Next.js dev server to be running
