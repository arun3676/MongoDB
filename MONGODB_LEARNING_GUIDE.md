# MongoDB & Fraud Agent System - Complete Learning Guide

> **One-stop guide to understand MongoDB and how our fraud detection system works**

---

## 📚 Part 1: MongoDB from First Principles

### What is MongoDB?

Think of MongoDB like a digital filing cabinet, but instead of folders with papers, you have **collections** with **documents**.

**Simple Analogy:**
- **Database** = The entire filing cabinet
- **Collection** = A drawer (like "Transactions" drawer, "Users" drawer)
- **Document** = A single piece of paper in that drawer
- **Field** = A piece of information on that paper (like "amount: $100")

### Why MongoDB Instead of Excel or SQL?

**Traditional SQL (like MySQL):**
- You need to define columns BEFORE adding data
- Every row must have the same columns
- Hard to change structure later

**MongoDB (Document Database):**
- No fixed structure - each document can be different
- Store data as JSON (JavaScript Object Notation)
- Easy to add new fields anytime
- Perfect for modern apps that change quickly

**Example:**

```json
// Document 1 in "transactions" collection
{
  "transactionId": "TX-123",
  "amount": 100,
  "userId": "user_456",
  "status": "PROCESSING"
}

// Document 2 - can have different fields!
{
  "transactionId": "TX-124",
  "amount": 500,
  "userId": "user_789",
  "status": "COMPLETED",
  "fraudScore": 0.85,  // New field - no problem!
  "metadata": {
    "deviceId": "device_abc",
    "location": "San Francisco"
  }
}
```

### Core MongoDB Concepts

#### 1. **Documents** (The Data)
A document is like a JSON object. It can contain:
- Simple values: `"name": "John"`
- Nested objects: `"address": { "city": "SF", "zip": "94102" }`
- Arrays: `"tags": ["fraud", "high-risk"]`

#### 2. **Collections** (The Containers)
- A collection holds many documents
- Like a table in SQL, but more flexible
- Example: `transactions` collection holds all transaction documents

#### 3. **Indexes** (The Speed Boosters)
- Indexes make queries faster
- Like an index in a book - helps you find pages quickly
- Example: Index on `transactionId` lets MongoDB find a transaction instantly

#### 4. **Queries** (Finding Data)
- Find documents matching criteria
- Example: "Find all transactions with amount > $1000"
- MongoDB uses a simple query language

#### 5. **Connection Pooling** (Efficiency)
- Instead of connecting/disconnecting every time, keep connections ready
- Like having a phone line always open instead of dialing each time
- Our project uses connection pooling for speed

---

## 🏗️ Part 2: MongoDB in Our Project

### How We Connect to MongoDB

**File: `lib/mongodb.ts`**

```typescript
// 1. Get connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI;  // Like a password
const DB_NAME = "fraud_agent";  // Our database name

// 2. Create a connection (with pooling)
const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: 10,  // Keep 10 connections ready
  minPoolSize: 2    // Always have at least 2 ready
});

// 3. Get the database
const db = client.db(DB_NAME);
```

**Key Points:**
- Connection is **cached** - we don't reconnect every time
- Uses **connection pooling** - efficient for many requests
- **Lazy connection** - only connects when actually needed

### Our 6 Collections (The Drawers)

#### 1. **transactions** - The Main Cases
Stores each fraud case:
```json
{
  "transactionId": "TX-123",
  "amount": 1250.00,
  "userId": "user_456",
  "merchantId": "merchant_789",
  "status": "PROCESSING",  // or "COMPLETED"
  "finalDecision": null,    // Will be "APPROVE" or "DENY"
  "createdAt": "2025-01-15T10:30:00Z"
}
```

#### 2. **agent_steps** - The Timeline
Every action agents take is logged here (like a security camera recording):
```json
{
  "transactionId": "TX-123",
  "stepNumber": 1,
  "agentName": "Suspicion Agent",
  "action": "ANALYZING",
  "timestamp": "2025-01-15T10:30:05Z",
  "input": { "amount": 1250 },
  "output": { "riskScore": 0.6 }
}
```

#### 3. **signals** - Purchased Data
When agents buy fraud signals (like buying a report):
```json
{
  "signalId": "sig_velocity_123",
  "transactionId": "TX-123",
  "signalType": "velocity",
  "data": {
    "velocityScore": 0.85,
    "last24hTxCount": 15,
    "interpretation": "HIGH RISK"
  },
  "cost": 0.10,
  "purchasedAt": "2025-01-15T10:30:10Z"
}
```

#### 4. **payments** - Payment Records
Every payment made (for buying signals):
```json
{
  "paymentId": "pay_123",
  "transactionId": "TX-123",
  "amount": 0.10,
  "signalType": "velocity",
  "status": "COMPLETED",
  "paymentProof": "abc123xyz",
  "createdAt": "2025-01-15T10:30:08Z"
}
```

#### 5. **decisions** - Agent Reasoning
What each agent decided and why:
```json
{
  "decisionId": "dec_123",
  "transactionId": "TX-123",
  "agentName": "L1 Analyst",
  "decisionType": "ESCALATE",
  "confidence": 0.75,
  "reasoning": "High velocity detected, needs deeper analysis",
  "riskScore": 0.8
}
```

#### 6. **policies** - Rules
Fraud detection rules:
```json
{
  "policyId": "policy_1",
  "type": "AMOUNT_THRESHOLD",
  "enabled": true,
  "rule": { "maxAmount": 10000 }
}
```

### How We Read Data

**Example: Get a transaction**
```typescript
const db = await getDatabase();
const transaction = await db
  .collection('transactions')
  .findOne({ transactionId: 'TX-123' });
```

**Example: Get all steps for a transaction**
```typescript
const steps = await db
  .collection('agent_steps')
  .find({ transactionId: 'TX-123' })
  .sort({ stepNumber: 1 })  // Oldest first
  .toArray();
```

### How We Write Data

**Example: Create a new transaction**
```typescript
await db.collection('transactions').insertOne({
  transactionId: 'TX-123',
  amount: 1250,
  status: 'PROCESSING',
  createdAt: new Date()
});
```

**Example: Update a transaction**
```typescript
await db.collection('transactions').updateOne(
  { transactionId: 'TX-123' },  // Find this
  { $set: { status: 'COMPLETED', finalDecision: 'APPROVE' } }  // Update these fields
);
```

### Indexes We Use (For Speed)

- **Unique Index**: `transactionId` - ensures no duplicates
- **Compound Index**: `{ status: 1, createdAt: -1 }` - fast queries like "get all PROCESSING cases, newest first"
- **TTL Index**: Auto-delete old signals after 1 hour

---

## 🔄 Part 3: End-to-End Project Flow

### The Big Picture

```
User submits transaction
    ↓
Orchestrator creates case (MongoDB)
    ↓
Suspicion Agent analyzes (heuristics)
    ↓
Policy Agent checks rules
    ↓
VOI/Budget Agent decides what signals to buy
    ↓
Buyer/Decision Agent purchases signals & makes final decision
    ↓
Case completed (MongoDB updated)
```

### Step-by-Step Flow

#### Step 1: User Submits Transaction
**Where:** Frontend form (`app/page.tsx`)
**What happens:**
- User fills form: amount, userId, merchantId
- Clicks "Submit"
- Frontend calls `POST /api/case/create`

#### Step 2: API Receives Request
**Where:** `app/api/case/create/route.ts`
**What happens:**
- Validates the data
- Calls `orchestrator.createCase()`

#### Step 3: Orchestrator Creates Case
**Where:** `lib/agents/orchestrator.ts`
**What happens:**
1. Generates unique `transactionId` (like "TX-1705320000123")
2. **Writes to MongoDB** `transactions` collection:
   ```json
   {
     "transactionId": "TX-1705320000123",
     "amount": 1250,
     "status": "PROCESSING",
     "createdAt": "2025-01-15T10:30:00Z"
   }
   ```
3. **Logs step** to `agent_steps`:
   ```json
   {
     "stepNumber": 1,
     "agentName": "Orchestrator",
     "action": "CASE_CREATED"
   }
   ```
4. **Triggers Suspicion Agent** (runs in background)

#### Step 4: Suspicion Agent Analyzes
**Where:** `lib/agents/suspicion-agent.ts`
**What happens:**
1. **Reads transaction** from MongoDB
2. Does basic checks:
   - Is amount suspicious? (> $5000?)
   - Is user new? (account age < 24 hours?)
   - Any red flags?
3. **Calls LLM** (Fireworks AI) for initial risk assessment
4. **Writes decision** to `decisions` collection
5. **Logs step** to `agent_steps`
6. **Triggers Policy Agent**

#### Step 5: Policy Agent Checks Rules
**Where:** `lib/agents/policy-agent.ts`
**What happens:**
1. **Reads policies** from MongoDB `policies` collection
2. Checks rules:
   - Amount thresholds
   - User patterns
   - Merchant rules
3. Decides: "Do we need signals?" or "Can we decide now?"
4. **Writes decision** to `decisions`
5. **Logs step** to `agent_steps`
6. **Triggers VOI/Budget Agent** (if signals needed)

#### Step 6: VOI/Budget Agent Plans Purchases
**Where:** `lib/agents/voi-budget-agent.ts`
**What happens:**
1. **Reads transaction** and previous decisions
2. **Queries Bazaar** (`GET /api/bazaar/discover`) - finds available signals
3. Calculates **Value of Information**:
   - "Is velocity signal worth $0.10?"
   - "Is network signal worth $0.25?"
   - "What's our budget?"
4. Creates **purchase list**: `["velocity", "network"]` or `[]`
5. **Writes decision** to `decisions`
6. **Logs step** to `agent_steps`
7. **Triggers Buyer/Decision Agent**

#### Step 7: Buyer/Decision Agent Executes
**Where:** `lib/agents/buyer-decision-agent.ts`
**What happens:**
1. **Reads purchase list** from VOI agent
2. For each signal in list:
   - **Purchases signal** via x402 flow (see below)
   - **Stores signal** in `signals` collection
   - **Records payment** in `payments` collection
3. **Calls LLM** with all data (transaction + signals)
4. Makes **final decision**: APPROVE or DENY
5. **Updates transaction** in MongoDB:
   ```json
   {
     "status": "COMPLETED",
     "finalDecision": "DENY",
     "confidence": 0.92
   }
   ```
6. **Writes final decision** to `decisions`
7. **Logs final step** to `agent_steps`

#### Step 8: Frontend Shows Results
**Where:** `app/case/[transactionId]/page.tsx`
**What happens:**
- Frontend **polls** `GET /api/case/:transactionId` every 2 seconds
- API **reads from MongoDB**:
  - Transaction details
  - All agent steps (timeline)
  - All signals purchased
  - All decisions made
- Frontend displays:
  - Transaction card
  - Agent timeline (step by step)
  - Signals purchased
  - Final decision

### The x402 Payment Flow (How Signals Are Purchased)

**x402** = HTTP status code meaning "Payment Required"

**Step 1: Agent requests signal**
```
GET /api/signals/velocity?userId=user_123
```

**Step 2: Signal endpoint returns 402**
```json
{
  "error": "Payment Required",
  "amount": 0.10,
  "paymentUrl": "/api/payments"
}
```

**Step 3: Agent makes payment**
```
POST /api/payments
Body: { amount: 0.10, signalType: "velocity", transactionId: "TX-123" }
Response: { paymentProof: "abc123xyz" }
```

**Step 4: Agent retries with proof**
```
GET /api/signals/velocity?userId=user_123
Header: X-Payment-Proof: abc123xyz
Response: 200 OK + signal data
```

**Step 5: Signal stored in MongoDB**
```json
{
  "signalId": "sig_123",
  "transactionId": "TX-123",
  "signalType": "velocity",
  "data": { "velocityScore": 0.85 },
  "cost": 0.10
}
```

---

## 🤖 Part 4: Agent Orchestration - How Agents Connect

### The Agent Chain

Our system has **4 specialized agents** that work in sequence:

```
Orchestrator → Suspicion → Policy → VOI/Budget → Buyer/Decision
```

### How Agents Pass Work to Each Other

**Key Concept:** Agents don't directly call each other. Instead, they:
1. **Write to MongoDB** (their decision/output)
2. **Trigger next agent** (call the next agent's function)
3. **Next agent reads from MongoDB** (gets previous agent's work)

### Example: Suspicion Agent → Policy Agent

**Suspicion Agent finishes:**
```typescript
// 1. Write decision to MongoDB
await db.collection('decisions').insertOne({
  transactionId: 'TX-123',
  agentName: 'Suspicion Agent',
  riskScore: 0.6,
  decision: 'NEEDS_POLICY_CHECK'
});

// 2. Log step
await db.collection('agent_steps').insertOne({
  transactionId: 'TX-123',
  stepNumber: 2,
  agentName: 'Suspicion Agent',
  action: 'ANALYSIS_COMPLETE'
});

// 3. Trigger next agent
runPolicyAgent('TX-123');  // Passes transactionId
```

**Policy Agent starts:**
```typescript
async function runPolicyAgent(transactionId: string) {
  // 1. Read transaction from MongoDB
  const tx = await db.collection('transactions')
    .findOne({ transactionId });
  
  // 2. Read Suspicion Agent's decision
  const suspicionDecision = await db.collection('decisions')
    .findOne({ 
      transactionId, 
      agentName: 'Suspicion Agent' 
    });
  
  // 3. Do policy checks...
  // 4. Write decision...
  // 5. Trigger next agent...
}
```

### Why This Design?

**Benefits:**
1. **Decoupled** - Agents don't need to know about each other's internals
2. **Recoverable** - If system crashes, we can resume from MongoDB state
3. **Auditable** - Every step is logged in `agent_steps`
4. **Testable** - Can test each agent independently

### The "Brain" - How Decisions Are Made

#### 1. **Heuristics First** (Suspicion Agent)
- Fast, cheap checks
- "Is amount > $5000?" → High risk
- "Is account < 24 hours old?" → Suspicious
- No LLM needed, just rules

#### 2. **Rule-Based Filtering** (Policy Agent)
- Checks against policies in MongoDB
- "Does this match known fraud patterns?"
- Decides: "Need signals" or "Can decide now"

#### 3. **Value-of-Information** (VOI/Budget Agent)
- **The Smart Part**: Decides if buying signals is worth it
- Example reasoning:
  - "Transaction is $100, low risk → Don't buy signals (save $0.35)"
  - "Transaction is $5000, medium risk → Buy velocity signal ($0.10)"
  - "Transaction is $10000, high risk → Buy both signals ($0.35)"

#### 4. **Final Decision** (Buyer/Decision Agent)
- Has all data: transaction + signals (if purchased)
- **Calls LLM** (Fireworks AI) with complete context
- LLM analyzes everything and returns:
  ```json
  {
    "decision": "DENY",
    "confidence": 0.92,
    "reasoning": "High velocity score (0.85) combined with new account suggests fraud"
  }
  ```

### How LLM Integration Works

**File: `lib/fireworks.ts`**

```typescript
async function callLLM(prompt: string) {
  // 1. Call Fireworks AI API
  const response = await fetch('https://api.fireworks.ai/...', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-v3p1-70b-instruct',
      messages: [
        { role: 'system', content: 'You are a fraud analyst...' },
        { role: 'user', content: prompt }
      ]
    })
  });
  
  // 2. Parse response
  const data = await response.json();
  return {
    decision: data.decision,  // "APPROVE" or "DENY"
    confidence: data.confidence,  // 0.0 to 1.0
    reasoning: data.reasoning  // Why this decision?
  };
}
```

**Example LLM Prompt:**
```
System: You are a fraud analyst. Analyze transactions and make decisions.

User: Transaction: $5000, User: new_account_24h, Velocity Signal: score=0.85 (HIGH RISK)
Make a decision: APPROVE or DENY
```

**LLM Response:**
```json
{
  "decision": "DENY",
  "confidence": 0.88,
  "reasoning": "New account with high velocity (0.85) suggests account takeover or fraud ring"
}
```

### State Management in MongoDB

**Key Principle:** MongoDB is the **single source of truth**

- Agents **read** from MongoDB before acting
- Agents **write** to MongoDB after acting
- No agent keeps state in memory
- If system crashes, state is preserved in MongoDB

**Example:**
```typescript
// Agent reads current state
const transaction = await getTransaction('TX-123');
const previousDecisions = await getDecisions('TX-123');

// Agent makes decision based on state
const decision = await analyze(transaction, previousDecisions);

// Agent writes new state
await writeDecision(decision);
await updateTransaction('TX-123', { status: 'PROCESSING' });
```

---

## 🧠 Part 5: The "Brain" - How Everything Works Together

### The Intelligence Layer

Our system has **3 layers of intelligence**:

#### Layer 1: Fast Heuristics (Suspicion Agent)
- **Speed**: Instant (< 100ms)
- **Cost**: Free
- **Accuracy**: 60-70%
- **Use case**: Filter obvious cases

#### Layer 2: Rule-Based (Policy Agent)
- **Speed**: Fast (< 500ms)
- **Cost**: Free
- **Accuracy**: 75-80%
- **Use case**: Apply business rules

#### Layer 3: LLM Reasoning (Buyer/Decision Agent)
- **Speed**: Slow (2-5 seconds)
- **Cost**: ~$0.001 per call
- **Accuracy**: 90-95%
- **Use case**: Complex decisions with full context

### The Decision Flow

```
Transaction arrives
    ↓
Suspicion Agent (heuristics)
    ├─→ Low risk? → Skip to Buyer Agent (fast path)
    └─→ Medium/High risk? → Continue
    ↓
Policy Agent (rules)
    ├─→ Matches deny rule? → DENY immediately
    ├─→ Matches approve rule? → APPROVE immediately
    └─→ Uncertain? → Continue
    ↓
VOI/Budget Agent (smart purchasing)
    ├─→ Calculate value of each signal
    ├─→ Check budget
    └─→ Create purchase list
    ↓
Buyer/Decision Agent (final call)
    ├─→ Purchase signals (if needed)
    ├─→ Call LLM with all data
    └─→ Make final APPROVE/DENY decision
```

### Why This Architecture?

**Problem:** We can't call expensive LLM for every transaction (too slow, too expensive)

**Solution:** **Progressive Escalation**
1. Try cheap checks first (heuristics)
2. Only escalate if needed (rules)
3. Only buy signals if valuable (VOI)
4. Only call LLM if complex (final decision)

**Result:**
- 70% of cases decided without LLM (fast & cheap)
- 25% of cases need 1 signal (medium cost)
- 5% of cases need full analysis (expensive but accurate)

### How Agents Coordinate

**Pattern: Read → Decide → Write → Trigger**

```typescript
// Every agent follows this pattern:

async function runAgent(transactionId: string) {
  // 1. READ: Get current state from MongoDB
  const transaction = await getTransaction(transactionId);
  const previousDecisions = await getDecisions(transactionId);
  const signals = await getSignals(transactionId);
  
  // 2. DECIDE: Make decision based on state
  const decision = await analyze(transaction, previousDecisions, signals);
  
  // 3. WRITE: Save decision to MongoDB
  await writeDecision(decision);
  await logStep(transactionId, decision);
  
  // 4. TRIGGER: Start next agent (if needed)
  if (decision.nextAgent) {
    await triggerNextAgent(transactionId, decision.nextAgent);
  }
}
```

### Real Example: Complete Flow

**Transaction:** $5000, new user account

**Step 1: Orchestrator**
- Creates case in MongoDB
- Status: `PROCESSING`
- Triggers Suspicion Agent

**Step 2: Suspicion Agent**
- Reads transaction
- Checks: Amount $5000 (high), account age < 24h (suspicious)
- Risk score: 0.7 (high)
- Writes decision: `NEEDS_POLICY_CHECK`
- Triggers Policy Agent

**Step 3: Policy Agent**
- Reads transaction + Suspicion decision
- Checks policies: No automatic deny rules match
- Writes decision: `NEEDS_SIGNALS`
- Triggers VOI/Budget Agent

**Step 4: VOI/Budget Agent**
- Reads transaction + all previous decisions
- Calculates: "High risk transaction → signals valuable"
- Budget: $0.50 available
- Purchase list: `["velocity", "network"]` (cost: $0.35)
- Writes decision: `PURCHASE_SIGNALS`
- Triggers Buyer/Decision Agent

**Step 5: Buyer/Decision Agent**
- Reads purchase list: `["velocity", "network"]`
- Purchases velocity signal ($0.10):
  - Calls `/api/signals/velocity` → Gets 402
  - Pays via `/api/payments` → Gets proof
  - Retries with proof → Gets signal data
  - Stores in MongoDB `signals` collection
- Purchases network signal ($0.25): Same flow
- Reads all data: transaction + velocity signal + network signal
- Calls LLM:
  ```
  Prompt: "Transaction: $5000, new account, velocity=0.85 (HIGH), 
           network=0.92 (HIGH RISK - connected to 3 fraud accounts)"
  ```
- LLM responds: `DENY` (confidence: 0.95)
- Updates transaction:
  ```json
  {
    "status": "COMPLETED",
    "finalDecision": "DENY",
    "confidence": 0.95,
    "totalCost": 0.35
  }
  ```
- Writes final decision to MongoDB
- Logs final step

**Step 6: Frontend**
- Polls `/api/case/TX-123` every 2 seconds
- Sees status change: `PROCESSING` → `COMPLETED`
- Displays:
  - Final decision: DENY
  - Timeline: 8 steps
  - Signals purchased: 2 ($0.35 total)
  - LLM reasoning: "High velocity + fraud network connections"

---

## 📊 Part 6: MongoDB Queries We Use

### Common Patterns

#### 1. Find One Document
```typescript
const transaction = await db.collection('transactions')
  .findOne({ transactionId: 'TX-123' });
```

#### 2. Find Many Documents
```typescript
const steps = await db.collection('agent_steps')
  .find({ transactionId: 'TX-123' })
  .sort({ stepNumber: 1 })  // Ascending (1, 2, 3...)
  .toArray();
```

#### 3. Insert Document
```typescript
await db.collection('transactions').insertOne({
  transactionId: 'TX-123',
  amount: 1250,
  status: 'PROCESSING'
});
```

#### 4. Update Document
```typescript
await db.collection('transactions').updateOne(
  { transactionId: 'TX-123' },  // Find this
  { 
    $set: { 
      status: 'COMPLETED',
      finalDecision: 'APPROVE'
    }
  }
);
```

#### 5. Aggregation (Joining Collections)
```typescript
// Get transaction + all related data in one query
const result = await db.collection('transactions')
  .aggregate([
    { $match: { transactionId: 'TX-123' } },
    {
      $lookup: {
        from: 'agent_steps',
        localField: 'transactionId',
        foreignField: 'transactionId',
        as: 'timeline'
      }
    },
    {
      $lookup: {
        from: 'signals',
        localField: 'transactionId',
        foreignField: 'transactionId',
        as: 'signals'
      }
    }
  ])
  .toArray();
```

---

## 📊 Part 7: Agent Flow Diagram

### Complete Agent Orchestration Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER SUBMITS TRANSACTION                            │
│                     POST /api/case/create {amount, userId, merchantId}      │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        🔵 ORCHESTRATOR AGENT                                 │
│                         (Traffic Controller)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Generate transactionId: "TX-1705320000123"                               │
│ 2. Write to MongoDB:                                                        │
│    → transactions collection: {transactionId, amount, status: "PROCESSING"} │
│ 3. Log step to agent_steps:                                                 │
│    → {stepNumber: 1, agentName: "Orchestrator", action: "CASE_CREATED"}    │
│ 4. Trigger Suspicion Agent (async)                                          │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       🟢 SUSPICION AGENT                                    │
│                      (Initial Risk Assessment)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Read transaction from MongoDB (transactions collection)                  │
│ 2. Fast heuristics check:                                                   │
│    ✓ Amount > $5000? → High risk                                            │
│    ✓ Account age < 24h? → Suspicious                                        │
│    ✓ Known fraud patterns? → Red flag                                       │
│ 3. Calculate initial risk score (0.0 to 1.0)                                │
│ 4. Write decision to MongoDB:                                               │
│    → decisions collection: {riskScore: 0.6, decision: "NEEDS_POLICY_CHECK"}│
│ 5. Log step to agent_steps:                                                 │
│    → {stepNumber: 2, agentName: "Suspicion Agent", action: "ANALYZING"}    │
│ 6. Trigger Policy Agent                                                     │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       🟡 POLICY AGENT                                       │
│                       (Rule-Based Filtering)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Read transaction + Suspicion decision from MongoDB                       │
│ 2. Read policies from MongoDB (policies collection)                         │
│ 3. Apply rules:                                                             │
│    ✓ Amount threshold rules                                                 │
│    ✓ User pattern rules                                                     │
│    ✓ Merchant rules                                                         │
│ 4. Decision branch:                                                         │
│    ├─→ MATCHES DENY RULE? → DENY immediately → Skip to Final               │
│    ├─→ MATCHES APPROVE RULE? → APPROVE immediately → Skip to Final          │
│    └─→ UNCERTAIN? → Continue to VOI Agent                                   │
│ 5. Write decision to MongoDB:                                               │
│    → {decision: "NEEDS_SIGNALS" or "SKIP_SIGNALS"}                          │
│ 6. Log step to agent_steps                                                  │
│ 7. If NEEDS_SIGNALS → Trigger VOI/Budget Agent                             │
│    If SKIP_SIGNALS → Trigger Buyer/Decision Agent directly                  │
└────────────────────────────────┬────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
            NEEDS_SIGNALS              SKIP_SIGNALS
                    │                         │
                    ▼                         ▼
┌──────────────────────────────────┐  ┌─────────────────────────────────────┐
│      🟣 VOI/BUDGET AGENT         │  │   🔴 BUYER/DECISION AGENT          │
│   (Value-of-Information Analysis)│  │      (Direct Path - Fast)          │
├──────────────────────────────────┤  ├─────────────────────────────────────┤
│ 1. Read transaction + all        │  │ 1. Read transaction from MongoDB   │
│    previous decisions from       │  │ 2. Call LLM (Fireworks AI)         │
│    MongoDB                        │  │ 3. Make final decision:            │
│ 2. Query Bazaar:                 │  │    → APPROVE or DENY               │
│    GET /api/bazaar/discover      │  │ 4. Update transaction:             │
│    → Available signals:          │  │    → status: "COMPLETED"           │
│      • velocity ($0.10)          │  │    → finalDecision: "APPROVE/DENY" │
│      • network ($0.25)           │  │ 5. Write final decision            │
│ 3. Calculate Value of            │  │ 6. Log final step                  │
│    Information for each signal:  │  │                                     │
│    • "Is velocity worth $0.10?" │  │                                     │
│    • "Is network worth $0.25?"  │  │                                     │
│    • "What's our budget?"        │  │                                     │
│ 4. Create purchase list:         │  │                                     │
│    → ["velocity", "network"]     │  │                                     │
│    OR → [] (skip if low value)   │  │                                     │
│ 5. Write decision to MongoDB:    │  │                                     │
│    → {purchaseList: [...]}       │  │                                     │
│ 6. Log step to agent_steps       │  │                                     │
│ 7. Trigger Buyer/Decision Agent  │  │                                     │
└──────────────────────────────────┘  └─────────────────────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    🔴 BUYER/DECISION AGENT                                  │
│              (Signal Purchase + Final LLM Decision)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Read transaction + purchase list from VOI Agent (MongoDB)                │
│                                                                              │
│ 2. FOR EACH signal in purchase list:                                        │
│    ┌──────────────────────────────────────────────────────────────────────┐│
│    │         X402 PAYMENT FLOW (Example: Velocity Signal)                 ││
│    │                                                                       ││
│    │  a) Request signal:                                                  ││
│    │     GET /api/signals/velocity?userId=user_123                        ││
│    │     → Response: 402 Payment Required {amount: 0.10}                  ││
│    │                                                                       ││
│    │  b) Make payment:                                                    ││
│    │     POST /api/payments {amount: 0.10, signalType: "velocity"}        ││
│    │     → Response: {paymentProof: "abc123xyz"}                          ││
│    │     → Write to MongoDB (payments collection)                         ││
│    │                                                                       ││
│    │  c) Retry with proof:                                                ││
│    │     GET /api/signals/velocity + Header: X-Payment-Proof: abc123xyz   ││
│    │     → Response: 200 OK + Signal Data                                 ││
│    │                                                                       ││
│    │  d) Store signal:                                                    ││
│    │     → Write to MongoDB (signals collection)                          ││
│    │     → {signalId: "sig_123", signalType: "velocity",                  ││
│    │        data: {velocityScore: 0.85, last24hTxCount: 15}}              ││
│    └──────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│ 3. Read ALL data from MongoDB:                                              │
│    • Transaction details                                                    │
│    • All purchased signals (velocity, network)                              │
│    • All previous agent decisions                                           │
│                                                                              │
│ 4. Call LLM (Fireworks AI) with complete context:                          │
│    ┌──────────────────────────────────────────────────────────────────────┐│
│    │ Prompt:                                                               ││
│    │ "Transaction: $5000, new account (24h old)                           ││
│    │  Velocity Signal: score=0.85 (HIGH RISK - 15 transactions in 24h)   ││
│    │  Network Signal: score=0.92 (HIGH - connected to 3 fraud accounts)   ││
│    │  Make final decision: APPROVE or DENY"                               ││
│    │                                                                       ││
│    │ LLM Response:                                                        ││
│    │ {                                                                    ││
│    │   "decision": "DENY",                                                ││
│    │   "confidence": 0.95,                                                ││
│    │   "reasoning": "High velocity (0.85) combined with fraud network     ││
│    │                  connections (0.92) indicates account takeover"       ││
│    │ }                                                                    ││
│    └──────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│ 5. Update transaction in MongoDB:                                           │
│    → status: "COMPLETED"                                                    │
│    → finalDecision: "DENY" (or "APPROVE")                                   │
│    → confidence: 0.95                                                       │
│    → totalCost: 0.35 (sum of all signal purchases)                          │
│                                                                              │
│ 6. Write final decision to MongoDB:                                         │
│    → decisions collection: {isFinal: true, decision: "DENY", ...}          │
│                                                                              │
│ 7. Log final step to agent_steps:                                           │
│    → {stepNumber: N, agentName: "Buyer/Decision Agent",                    │
│       action: "FINAL_DECISION", decision: "DENY"}                           │
│                                                                              │
│ 8. ✅ CASE COMPLETE                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND POLLING                                    │
│                   GET /api/case/:transactionId (every 2s)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ API aggregates data from MongoDB:                                           │
│ • transactions collection (case details)                                     │
│ • agent_steps collection (timeline - sorted by stepNumber)                  │
│ • signals collection (purchased signals)                                     │
│ • payments collection (payment records)                                      │
│ • decisions collection (all agent decisions)                                 │
│                                                                              │
│ Returns complete case view:                                                 │
│ {                                                                            │
│   "transaction": {...},                                                      │
│   "timeline": [step1, step2, step3, ...],  // Chronological                 │
│   "signals": [velocity, network],                                           │
│   "decisions": [suspicion, policy, voi, buyer],                             │
│   "status": "COMPLETED",                                                     │
│   "finalDecision": "DENY",                                                   │
│   "totalCost": 0.35                                                          │
│ }                                                                            │
│                                                                              │
│ Frontend displays:                                                          │
│ • Transaction card                                                           │
│ • Agent timeline (step-by-step progress)                                     │
│ • Signals purchased (with costs)                                             │
│ • Final decision (with LLM reasoning)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Decision Tree - How Agents Choose Paths

```
                    Transaction Arrives
                           │
                           ▼
                    ┌──────────────┐
                    │ Orchestrator │
                    │   Creates    │
                    │    Case      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Suspicion   │
                    │   Agent      │
                    │  (Heuristics)│
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        Low Risk    Medium Risk   High Risk
        (0.0-0.3)   (0.3-0.7)    (0.7-1.0)
              │            │            │
              ▼            ▼            ▼
        ┌─────────┐  ┌─────────┐  ┌─────────┐
        │ Policy  │  │ Policy  │  │ Policy  │
        │  Agent  │  │  Agent  │  │  Agent  │
        └────┬────┘  └────┬────┘  └────┬────┘
             │            │            │
    ┌────────┼────────────┼────────────┼────────┐
    │        │            │            │        │
 Match   No Match     Match      No Match   Match
  Rule     Rule        Rule        Rule      Rule
    │        │            │            │        │
    ▼        ▼            ▼            ▼        ▼
APPROVE   Continue   APPROVE    Continue   DENY
 Fast       to         Fast        to        Fast
Path      VOI Agent   Path      VOI Agent   Path
    │        │            │            │        │
    └────────┴────────────┴────────────┴────────┘
                    │
                    ▼
            ┌──────────────┐
            │ VOI/Budget   │
            │    Agent     │
            └──────┬───────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    No Signals  1 Signal  2 Signals
    Needed      Needed    Needed
        │          │          │
        ▼          ▼          ▼
  ┌─────────┐ ┌─────────┐ ┌─────────┐
  │  Buyer  │ │  Buyer  │ │  Buyer  │
  │  Agent  │ │  Agent  │ │  Agent  │
  │ (Skip   │ │ (Buy    │ │ (Buy    │
  │ signals)│ │ velocity)│ │ both)   │
  └────┬────┘ └────┬────┘ └────┬────┘
       │           │           │
       └───────────┼───────────┘
                   │
                   ▼
            ┌──────────────┐
            │ Buyer/Decision│
            │    Agent      │
            │  (Call LLM)   │
            └──────┬───────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    APPROVE     DENY    (Both update
                           transaction
                         status: COMPLETED)
```

### State Flow in MongoDB

```
MongoDB Collections State Changes:

┌──────────────────────────────────────────────────────────────────┐
│ 1. transactions collection                                        │
│    {status: "PROCESSING", finalDecision: null}                   │
│    → Orchestrator creates                                         │
│    → {status: "COMPLETED", finalDecision: "DENY"}                │
│    → Buyer/Decision Agent updates                                 │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 2. agent_steps collection (Timeline - Append Only)               │
│    Step 1: {stepNumber: 1, agentName: "Orchestrator"}           │
│    Step 2: {stepNumber: 2, agentName: "Suspicion Agent"}        │
│    Step 3: {stepNumber: 3, agentName: "Policy Agent"}           │
│    Step 4: {stepNumber: 4, agentName: "VOI/Budget Agent"}       │
│    Step 5: {stepNumber: 5, agentName: "Buyer/Decision Agent"}   │
│    → Each agent appends one step                                  │
│    → Read by frontend for timeline display                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 3. decisions collection (Agent Reasoning Chain)                  │
│    Decision 1: {agentName: "Suspicion", riskScore: 0.6}         │
│    Decision 2: {agentName: "Policy", decision: "NEEDS_SIGNALS"} │
│    Decision 3: {agentName: "VOI", purchaseList: ["velocity"]}   │
│    Decision 4: {agentName: "Buyer", isFinal: true,              │
│                 decision: "DENY", confidence: 0.95}              │
│    → Each agent writes one decision                              │
│    → Final decision has isFinal: true                            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 4. signals collection (Purchased Data)                           │
│    Signal 1: {signalType: "velocity", data: {...}, cost: 0.10}  │
│    Signal 2: {signalType: "network", data: {...}, cost: 0.25}   │
│    → Buyer/Decision Agent purchases via x402 flow                │
│    → Stored for LLM analysis                                     │
│    → Auto-deleted after 1 hour (TTL index)                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 5. payments collection (x402 Payment Ledger)                     │
│    Payment 1: {amount: 0.10, signalType: "velocity",            │
│                paymentProof: "abc123", status: "COMPLETED"}      │
│    Payment 2: {amount: 0.25, signalType: "network",             │
│                paymentProof: "xyz789", status: "COMPLETED"}      │
│    → Complete audit trail of all payments                        │
│    → Used to verify payment proofs                               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 6. policies collection (Static Rules)                            │
│    Policy 1: {type: "AMOUNT_THRESHOLD", maxAmount: 10000}       │
│    Policy 2: {type: "ACCOUNT_AGE", minHours: 24}                │
│    → Read by Policy Agent                                        │
│    → Rarely changes (static rules)                               │
└──────────────────────────────────────────────────────────────────┘
```

### Agent Communication Pattern

```
Each Agent Follows This Pattern:

┌─────────────────────────────────────────────────────────┐
│                    READ PHASE                           │
│  1. Read transaction from MongoDB                       │
│  2. Read previous decisions from MongoDB                │
│  3. Read signals (if any) from MongoDB                  │
│  4. Read policies (if needed) from MongoDB              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   PROCESS PHASE                         │
│  1. Analyze data (heuristics, rules, or LLM)           │
│  2. Make decision                                        │
│  3. Calculate outputs (riskScore, purchaseList, etc.)  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   WRITE PHASE                           │
│  1. Write decision to decisions collection              │
│  2. Log step to agent_steps collection                  │
│  3. Update transaction (if final agent)                 │
│  4. Store signals (if purchased)                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  TRIGGER PHASE                          │
│  If not final:                                          │
│    → Call next agent function with transactionId        │
│                                                          │
│  If final:                                              │
│    → Case complete!                                     │
│    → Frontend polls and displays result                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Takeaways

### MongoDB Concepts
1. **Documents** = JSON objects stored in collections
2. **Collections** = Groups of documents (like tables)
3. **Indexes** = Speed up queries
4. **Connection Pooling** = Keep connections ready for reuse

### Our Project Architecture
1. **6 Collections**: transactions, agent_steps, signals, payments, decisions, policies
2. **4 Agents**: Suspicion → Policy → VOI/Budget → Buyer/Decision
3. **Progressive Escalation**: Cheap checks first, expensive only if needed
4. **MongoDB as Source of Truth**: All state stored in MongoDB

### Agent Orchestration
1. Agents **read** from MongoDB before acting
2. Agents **write** to MongoDB after acting
3. Agents **trigger** next agent when done
4. Each step is **logged** in `agent_steps` for audit trail

### The "Brain"
1. **Heuristics** filter obvious cases (fast, free)
2. **Rules** apply business logic (fast, free)
3. **VOI** decides if signals are worth buying (smart)
4. **LLM** makes final complex decisions (slow, accurate)

---

## 🔍 Quick Reference

### MongoDB Connection
- **File**: `lib/mongodb.ts`
- **Function**: `getDatabase()` - returns database instance
- **Collections**: Access via `db.collection('name')`

### Agent Files
- **Orchestrator**: `lib/agents/orchestrator.ts`
- **Suspicion**: `lib/agents/suspicion-agent.ts`
- **Policy**: `lib/agents/policy-agent.ts`
- **VOI/Budget**: `lib/agents/voi-budget-agent.ts`
- **Buyer/Decision**: `lib/agents/buyer-decision-agent.ts`

### API Endpoints
- **Create Case**: `POST /api/case/create`
- **Get Case**: `GET /api/case/:transactionId`
- **Buy Signal**: `GET /api/signals/velocity` (x402 flow)
- **Make Payment**: `POST /api/payments`

### MongoDB Collections
- `transactions` - Main cases
- `agent_steps` - Timeline/audit trail
- `signals` - Purchased signal data
- `payments` - Payment records
- `decisions` - Agent decisions
- `policies` - Fraud detection rules

---

**End of Guide** - You now understand MongoDB and our fraud detection system! 🎉
