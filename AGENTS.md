# Subagent Responsibilities

This document defines the 4 specialized subagents for the fraud escalation project. Each subagent has clear boundaries and done criteria.

---

## 1. Explore Agent

### Responsibility
Codebase exploration, research, and understanding existing patterns. Read-only operations.

### When to Invoke
- "How does the x402 flow work in this codebase?"
- "Find all MongoDB queries in the project"
- "Show me where agents write to the database"
- "What's the current project structure?"
- "Find the Fireworks AI integration code"
- "Search for TypeScript interfaces related to signals"

### Tools Available
- Glob (file pattern search)
- Grep (code content search)
- Read (file reading)
- Bash (directory listing, git log)

### Prohibited Actions
- ❌ NEVER write/edit files
- ❌ NEVER install packages
- ❌ NEVER run the application
- ❌ NEVER modify configuration

### Output Format
Structured findings with:
- File locations (path:line format)
- Code snippets (relevant sections only, max 20 lines)
- Pattern analysis (common helpers, naming conventions)
- Recommendations for implementation

### Example Workflow
```
User: "Where do we write agent steps to MongoDB?"

Explore Agent:
1. Searches for "agent_steps" using Grep
2. Finds insertions in lib/agents/*.ts files
3. Identifies common helper: writeAgentStep()
4. Reports file locations with line numbers
5. Suggests pattern to follow for new agents
```

### Done Criteria
- ✅ Findings presented with file:line references
- ✅ Code snippets included (if relevant)
- ✅ Patterns/conventions identified
- ✅ Recommendations actionable
- ✅ No files modified (verification)

---

## 2. UI Agent

### Responsibility
Frontend UI implementation - React components, Tailwind CSS, user interactions, API polling.

### When to Invoke
- "Build the case detail page UI"
- "Create the agent timeline stepper component"
- "Add the signal cost display card"
- "Implement the audit download button"
- "Style the final decision card"
- "Add loading states and error handling to UI"
- "Make the form responsive for mobile"

### Scope
- `/app/page.tsx` - Main fraud case viewer
- `/app/components/*` - Reusable UI components
- `/app/globals.css` - Global styles (Tailwind only)
- Client-side state (React useState/useEffect)
- API polling logic (GET /api/case/:id every 2s)

### Constraints
- ✅ MUST use Tailwind CSS (no custom CSS files beyond globals.css)
- ✅ MUST be responsive (test mobile breakpoints)
- ✅ MUST show real-time updates via polling (no WebSockets)
- ❌ NO complex state management libraries (Redux/Zustand)
- ❌ NO external UI libraries (MUI, Chakra) - build from scratch
- ❌ NO backend logic in UI components

### UI Requirements

**1. Transaction Header Card**
- Transaction ID (monospace font)
- Amount (large, bold, $1,250.00 format)
- User ID, Merchant name
- Status badge (Processing=yellow, Completed=green/red)
- Risk score gauge (0-100%, color-coded)

**2. Agent Timeline (Vertical Stepper)**
- Step number (1, 2, 3...)
- Agent name + icon/badge
- Action description
- Timestamp (relative: "2s ago", "1m ago")
- Signal purchases highlighted with 💰 and cost
- Connect steps with vertical line

**3. Signals Purchased Card**
- Table: Signal Type | Cost | Purchased By | Status
- Expandable data preview (JSON viewer)
- Total cost prominently displayed
- Badge for each signal type (velocity=blue, network=purple)

**4. Final Decision Card**
- Large APPROVED/DENIED badge (green/red)
- Confidence percentage (95% confidence)
- Full reasoning text (multi-line, readable)
- Agent chain summary (L1→L2→Final)
- Timestamp of final decision

**5. Audit Download Button**
- Downloads JSON file on click
- Shows file size before download
- Loading spinner during export
- Success toast after download

**6. Submit Transaction Form (Homepage)**
- Fields: Amount (number), User ID (text), Merchant ID (text)
- Validation (amount > 0, fields required)
- Submit button → POST /api/case/create
- Redirect to case detail page on success
- Error message display

### Design Aesthetic
- Clean, professional fintech vibe
- Color coding: Red (high risk), Yellow (medium), Green (low/approved)
- Monospace font for IDs, codes, JSON
- Card-based layout with shadows
- Subtle animations (fade-in 200ms, slide-up 150ms)
- White background, gray-50 page background

### Component Structure
```
/app/components/
  ├── TransactionHeader.tsx    (case overview)
  ├── AgentTimeline.tsx        (vertical stepper)
  ├── SignalCard.tsx           (purchased signals table)
  ├── DecisionCard.tsx         (final approve/deny)
  ├── AuditDownload.tsx        (export button)
  └── SubmitForm.tsx           (transaction submission)
```

### Done Criteria
- ✅ All 6 components implemented
- ✅ Tailwind CSS styling complete (no custom CSS)
- ✅ Responsive on mobile (tested at 375px width)
- ✅ API polling updates UI every 2 seconds
- ✅ Loading states shown during API calls
- ✅ Error states displayed with user-friendly messages
- ✅ Audit download works (triggers file download)
- ✅ Form validation prevents invalid submissions
- ✅ No console errors when rendering
- ✅ Accessible (semantic HTML, ARIA labels where needed)

---

## 3. Orchestration Agent

### Responsibility
Agent logic, LLM integration, decision-making flow, MongoDB state management. The brain of the fraud system.

### When to Invoke
- "Implement the 4 fraud detection agents"
- "Add Fireworks AI LLM integration"
- "Create the agent orchestration flow"
- "Implement decision-making logic with policies"
- "Connect agents to MongoDB for state reads/writes"
- "Add agent reasoning and confidence scoring"

### Scope
- `/lib/agents/orchestrator.ts` - Creates cases, routes to L1
- `/lib/agents/l1-analyst.ts` - Basic checks, velocity signal
- `/lib/agents/l2-analyst.ts` - Deep analysis, network signal
- `/lib/agents/final-reviewer.ts` - Final approve/deny
- `/lib/fireworks.ts` - Fireworks AI LLM integration
- `/lib/mongodb.ts` - MongoDB connection and utilities

### Agent Implementation Requirements

**Orchestrator Agent**
```typescript
Input: Transaction data from API
Actions:
  1. Insert into transactions collection (status: PROCESSING)
  2. Insert step into agent_steps (action: CASE_CREATED)
  3. Call L1 Analyst
Output: Case ID
```

**L1 Analyst**
```typescript
Input: Transaction ID
Actions:
  1. Read case from transactions collection
  2. Call Fireworks AI: "Analyze this transaction for fraud"
  3. Evaluate policies (amount threshold, basic checks)
  4. If suspicious: Purchase velocity signal (x402 flow)
  5. Make decision: APPROVE | ESCALATE
  6. Write to decisions collection
  7. Write steps to agent_steps
  8. If ESCALATE: Call L2 Analyst
Output: Decision object
```

**L2 Analyst**
```typescript
Input: Transaction ID
Actions:
  1. Read case + L1 decision from MongoDB
  2. Read velocity signal (if purchased)
  3. Call Fireworks AI: "Deep analysis with velocity data"
  4. If high risk: Purchase network signal (x402 flow)
  5. Make decision: APPROVE | ESCALATE
  6. Write to decisions collection
  7. Write steps to agent_steps
  8. If ESCALATE: Call Final Reviewer
Output: Decision object
```

**Final Reviewer**
```typescript
Input: Transaction ID
Actions:
  1. Read case + all decisions from MongoDB
  2. Read all purchased signals
  3. Call Fireworks AI: "Make final approve/deny decision"
  4. Write decision to decisions (isFinal: true)
  5. Update transactions (finalDecision, status: COMPLETED)
  6. Write final step to agent_steps
Output: Final decision (APPROVE | DENY)
```

### Fireworks AI Integration

```typescript
// lib/fireworks.ts
interface LLMRequest {
  systemPrompt: string
  userPrompt: string
  context: any
  maxTokens?: number
}

interface LLMResponse {
  decision: "APPROVE" | "ESCALATE" | "DENY"
  confidence: number  // 0-1
  reasoning: string
  riskScore: number   // 0-1
}

async function callFireworks(request: LLMRequest): Promise<LLMResponse>
```

**Model:** `accounts/fireworks/models/llama-v3p1-70b-instruct`
**Timeout:** 10 seconds
**Retry:** 1 attempt (on failure → escalate)

### MongoDB Patterns

**Always read before writing:**
```typescript
const case = await db.collection('transactions').findOne({ transactionId })
// Analyze case
await db.collection('decisions').insertOne({ ...decision })
```

**Atomic step increments:**
```typescript
const lastStep = await db.collection('agent_steps')
  .find({ transactionId })
  .sort({ stepNumber: -1 })
  .limit(1)
  .toArray()
const nextStepNumber = lastStep[0]?.stepNumber + 1 || 1
```

**Update transactions atomically:**
```typescript
await db.collection('transactions').updateOne(
  { transactionId },
  {
    $set: {
      status: 'COMPLETED',
      finalDecision: 'DENY',
      updatedAt: new Date()
    }
  }
)
```

### Decision Structure

```typescript
interface AgentDecision {
  decisionId: string
  transactionId: string
  agent: "Orchestrator" | "L1_Analyst" | "L2_Analyst" | "Final_Reviewer"
  decisionType: "APPROVE" | "ESCALATE" | "DENY"
  confidence: number  // 0-1
  reasoning: string   // LLM-generated explanation
  riskScore: number   // 0-1
  evidenceUsed: Evidence[]
  llmCall: {
    model: string
    tokens: { input: number, output: number, total: number }
    latency_ms: number
  }
  action: string      // "ESCALATE_TO_L2" | "DENY_TRANSACTION" | etc
  nextAgent: string | null
  timestamp: Date
  isFinal?: boolean   // Only Final Reviewer sets this
}
```

### Error Handling

- **LLM timeout (10s):** Log error, escalate to next agent with confidence=0.5
- **Signal purchase fails:** Log error, continue without signal data
- **MongoDB write fails:** Retry 3x with exponential backoff, then fail case
- **Invalid data:** Return 400 error to API caller

### Done Criteria
- ✅ All 4 agents implemented (orchestrator, L1, L2, final)
- ✅ Fireworks AI integration working (test with mock transaction)
- ✅ Agents read from MongoDB before acting
- ✅ Agents write decisions to MongoDB atomically
- ✅ Agent timeline (agent_steps) populates sequentially
- ✅ x402 signal purchase integrated in L1 and L2
- ✅ Final decision updates transactions collection
- ✅ Error handling for LLM timeouts
- ✅ Logging to console for debugging
- ✅ No infinite loops or hung agents
- ✅ Example LLM prompts documented in code comments

---

## 4. Payments Agent

### Responsibility
x402 payment protocol implementation, paywalled signal endpoints, mock payment provider, MongoDB payment ledger.

### When to Invoke
- "Implement the x402 payment flow"
- "Create the velocity and network signal endpoints"
- "Build the mock payment provider"
- "Add payment proof verification logic"
- "Implement the 402 → pay → retry → 200 flow"
- "Generate realistic mock signal data"

### Scope
- `/app/api/signals/velocity/route.ts` - Velocity signal endpoint
- `/app/api/signals/network/route.ts` - Network signal endpoint
- `/app/api/payments/route.ts` - Mock payment provider
- `/lib/x402.ts` - Payment flow utilities and helpers

### x402 Flow Implementation

**Step 1: Signal Endpoint (Initial Request - No Payment)**

```typescript
// GET /api/signals/velocity?userId=XXX&transactionId=YYY

const paymentProof = request.headers.get('X-Payment-Proof')

if (!paymentProof) {
  return new Response(JSON.stringify({
    error: "Payment Required",
    amount: 0.10,
    currency: "USD",
    signal: "velocity",
    paymentUrl: "/api/payments",
    description: "User velocity analysis signal"
  }), {
    status: 402,
    headers: {
      "X-Payment-Required": "0.10 USD",
      "X-Payment-URL": "/api/payments",
      "Content-Type": "application/json"
    }
  })
}
```

**Step 2: Payment Provider**

```typescript
// POST /api/payments
// Body: { amount: 0.10, signal: "velocity", transactionId: "TX-123" }

1. Validate amount matches signal price (0.10 for velocity, 0.25 for network)
2. Generate unique paymentId (pay_XXXXX)
3. Generate paymentProof token (crypto.randomBytes(32).toString('hex'))
4. Insert into payments collection with x402Details
5. Return payment proof to caller
```

**Step 3: Signal Endpoint (Retry with Proof - Payment Verified)**

```typescript
// GET /api/signals/velocity?userId=XXX&transactionId=YYY
// Header: X-Payment-Proof: proof_token_abc123xyz

1. Verify payment proof exists in payments collection
2. Check payment status === "COMPLETED"
3. Check payment not expired (createdAt within 1 hour)
4. Generate signal data (velocity or network metrics)
5. Insert into signals collection
6. Return 200 with signal data
```

### Signal Data Generation (Mock)

**Velocity Signal**
```typescript
function generateVelocitySignal(userId: string) {
  const last24hTxCount = Math.floor(Math.random() * 20) + 5
  const avgDailyTxCount = Math.floor(Math.random() * 8) + 3
  const velocityScore = Math.min(last24hTxCount / (avgDailyTxCount * 2.5), 1.0)

  return {
    userId,
    last24hTxCount,
    last7dTxCount: last24hTxCount * 3,
    avgDailyTxCount,
    velocityScore,
    firstTxDate: "2025-11-15",
    accountAgeHours: Math.floor(Math.random() * 5000) + 100,
    interpretation: velocityScore > 0.7
      ? `ELEVATED - ${(velocityScore / 0.7).toFixed(1)}x normal velocity`
      : "NORMAL"
  }
}
```

**Network Signal**
```typescript
function generateNetworkSignal(userId: string, deviceId: string) {
  const suspiciousConnections = Math.floor(Math.random() * 4)
  const networkRiskScore = Math.min(
    suspiciousConnections * 0.35 + Math.random() * 0.3,
    1.0
  )

  return {
    userId,
    deviceId,
    connectedUsers: Math.floor(Math.random() * 15) + 1,
    sharedDevices: Math.floor(Math.random() * 6),
    sharedIPs: Math.floor(Math.random() * 20) + 2,
    suspiciousConnections,
    networkRiskScore,
    flaggedConnections: suspiciousConnections > 0 ? [
      {
        userId: "user_fraud_001",
        relationship: "shared_ip",
        fraudHistory: true,
        riskLevel: "HIGH"
      }
    ] : [],
    interpretation: networkRiskScore > 0.6
      ? `HIGH RISK - Connected to ${suspiciousConnections} known fraudulent accounts`
      : "LOW RISK"
  }
}
```

### Payment Proof Security

```typescript
// Generate secure proof token
import crypto from 'crypto'
const paymentProof = crypto.randomBytes(32).toString('hex')

// Verify proof (lookup in MongoDB)
const payment = await db.collection('payments').findOne({
  'x402Details.paymentProof': paymentProof,
  status: 'COMPLETED'
})

if (!payment) {
  return new Response(JSON.stringify({ error: "Invalid payment proof" }), {
    status: 402
  })
}

// Check expiry (1 hour)
const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
if (payment.createdAt < hourAgo) {
  return new Response(JSON.stringify({ error: "Payment proof expired" }), {
    status: 402
  })
}
```

### MongoDB Audit Trail

Every x402 flow MUST write complete audit to `payments` collection:

```typescript
await db.collection('payments').insertOne({
  paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  transactionId,
  signalType: 'velocity',
  amount: 0.10,
  currency: 'USD',
  status: 'COMPLETED',
  provider: 'mock-payment-provider',
  x402Details: {
    initialEndpoint: '/api/signals/velocity',
    http402Response: {
      status: 402,
      headers: { 'X-Payment-Required': '0.10 USD' },
      timestamp: new Date(Date.now() - 300)
    },
    paymentRequest: {
      method: 'POST',
      endpoint: '/api/payments',
      body: { amount: 0.10, signal: 'velocity', transactionId },
      timestamp: new Date(Date.now() - 200)
    },
    paymentProof,
    retryRequest: {
      method: 'GET',
      endpoint: '/api/signals/velocity',
      headers: { 'X-Payment-Proof': paymentProof },
      timestamp: new Date(Date.now() - 50)
    },
    http200Response: {
      status: 200,
      dataReceived: true,
      timestamp: new Date()
    }
  },
  createdAt: new Date(),
  completedAt: new Date(),
  duration_ms: 300
})
```

### Testing Checklist

Manual testing (use curl or Postman):

- [ ] Velocity signal returns 402 on first request (no proof)
- [ ] Payment provider accepts POST and returns proof token
- [ ] Velocity signal returns 200 with valid proof header
- [ ] Velocity signal returns realistic data (velocityScore, txCount)
- [ ] Network signal returns 402 on first request (no proof)
- [ ] Network signal returns 200 with valid proof header
- [ ] Network signal returns realistic data (networkRiskScore, connections)
- [ ] Invalid proof returns 402 or 401
- [ ] Expired proof (>1 hour) returns 402
- [ ] Wrong amount in payment returns 400 error
- [ ] payments collection contains x402Details with all timestamps
- [ ] signals collection contains purchased signal data

### Done Criteria
- ✅ GET /api/signals/velocity implemented (402 → 200 flow)
- ✅ GET /api/signals/network implemented (402 → 200 flow)
- ✅ POST /api/payments implemented (proof generation)
- ✅ Payment proof verification working
- ✅ Mock signal data generation realistic
- ✅ MongoDB payments collection logs complete x402 flow
- ✅ MongoDB signals collection stores purchased signals
- ✅ Payment proofs expire after 1 hour
- ✅ Error handling for invalid/expired proofs
- ✅ All testing checklist items pass
- ✅ Example curl commands documented in code comments
- ✅ No security vulnerabilities (proof validation, amount checks)

---

## Subagent Handoff Protocol

When a subagent completes its work, it hands back to the main agent with:

1. **Summary** - What was accomplished
2. **File List** - Files created/modified with line counts
3. **Next Steps** - Recommended actions or dependencies
4. **Blockers** - Any issues encountered (if applicable)
5. **Verification** - How to test the implementation

Example handoff:
```
UI Agent: Complete

Summary: Implemented all 6 UI components with Tailwind CSS styling.

Files Created:
- app/components/TransactionHeader.tsx (85 lines)
- app/components/AgentTimeline.tsx (120 lines)
- app/components/SignalCard.tsx (95 lines)
- app/components/DecisionCard.tsx (78 lines)
- app/components/AuditDownload.tsx (62 lines)
- app/components/SubmitForm.tsx (110 lines)

Files Modified:
- app/page.tsx (integrated components, added polling)

Next Steps:
- Test UI with real API data once backend is ready
- Implement API routes to provide data for UI
- Verify responsive design on mobile

Verification:
- Run: npm run dev
- Open: http://localhost:3000
- Check: No console errors, components render
```

---

**End of AGENTS.md** - This is the source of truth for subagent responsibilities.
