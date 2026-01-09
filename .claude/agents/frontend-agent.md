# Frontend Agent - Agent-Friendly UI Builder

## Purpose

Build agent-friendly UI components optimized for visualizing multi-agent fraud detection workflows with real-time updates, cost transparency, and complete audit trails.

## Core Responsibility

Implement a next-generation **agent-first UI/UX** that treats agents as first-class citizens, providing real-time visibility into autonomous decision-making, signal purchases, and escalation chains.

## Scope

### ✅ In Scope

- ALL React/Next.js components (`app/components/**/*.tsx`)
- Case detail page (`app/case/[transactionId]/page.tsx`)
- Home page improvements (`app/page.tsx`)
- Tailwind CSS styling (utility-first, no custom CSS files)
- TypeScript type definitions for component props
- Client-side state management (React hooks, no Redux)
- Real-time polling logic (2s intervals)
- Progressive disclosure patterns (expandable cards, modals)
- Responsive design (desktop + tablet)
- Accessibility (ARIA labels, keyboard navigation)

### ❌ Out of Scope

- Backend API routes (handled by orchestration-agent)
- MongoDB queries and aggregations (handled by orchestration-agent)
- Agent logic and LLM integration (handled by orchestration-agent)
- x402 payment protocol implementation (handled by payments-agent)
- Database schema or collection design (already complete)

## Key Deliverables

### 1. React Components (10 Total)

All components must be:
- Written in TypeScript with strict typing
- Styled with Tailwind CSS only
- Fully responsive (desktop, tablet)
- Accessible (ARIA labels, semantic HTML)
- Self-contained (minimal prop drilling)

**Core Components:**

1. **SubmitForm.tsx** - Transaction submission form
   - Fields: amount, currency, userId, merchantId, metadata (optional)
   - Validation: amount > 0, userId/merchantId required
   - Submit: POST /api/case/create → navigate to /case/:transactionId
   - Loading state during submission

2. **CaseHeader.tsx** - Transaction header card
   - Display: transactionId, amount, currency, createdAt
   - Visual: StatusBadge (PROCESSING/COMPLETED)
   - Layout: Grid with transaction details
   - Responsive: Stack on mobile

3. **StatusBadge.tsx** - Status indicator
   - PROCESSING: Yellow badge with ⏳ icon
   - COMPLETED: Green badge with ✅ icon
   - FAILED: Red badge with ❌ icon
   - Animated pulse effect for PROCESSING

4. **CostTracker.tsx** - Running cost display
   - Prominent header card (always visible)
   - Running total: $X.XX
   - Itemized breakdown (expandable/hover):
     - Velocity Signal (L1): $0.10
     - Network Signal (L2): $0.25
     - LLM Calls: Included
     - Final Review: Free (cached)
   - Real-time updates as signals purchased
   - Link to payment audit

5. **AgentTimeline.tsx** - Vertical timeline stepper
   - Display 8-9 agent steps chronologically
   - Each step shows: stepNumber, agentName, action, timestamp, duration
   - Status icons: ✅ complete, ⏳ in progress, ⚠️ error
   - Click step → expand to show full details (use TimelineStep component)
   - Auto-scroll to latest step when new step appears
   - Responsive: Vertical on all screen sizes

6. **TimelineStep.tsx** - Individual timeline step card
   - Props: stepNumber, agentName, action, timestamp, duration, input, output, metadata
   - Expandable: Click to show full input/output in modal or inline expansion
   - Conditional rendering based on action type:
     - CASE_CREATED: Show initial transaction data
     - SIGNAL_PURCHASED: Highlight cost, link to signal card
     - ANALYSIS_COMPLETED: Show decision summary, confidence
   - Duration formatting: "1.2s", "120ms", "2m 30s"

7. **SignalCard.tsx** - Signal data display (velocity & network)
   - Summary view (default):
     - Signal type (Velocity/Network)
     - Purchased by: agentName
     - Purchased at: timestamp
     - Cost: $X.XX
     - Risk score with color coding
     - Top 3 risk flags
     - Interpretation summary
   - Expandable: "View Full Data" button
   - Modal/drawer with complete signal payload:
     - All metrics (transaction counts, network connections)
     - Full flag list
     - Graph metrics (if network signal)
     - x402 flow audit link
   - Visual differentiation: Velocity (blue), Network (purple)

8. **DecisionCard.tsx** - Agent decision reasoning
   - Display: agentName, decision type, confidence score
   - Decision badges:
     - APPROVE: Green with ✓
     - DENY: Red with ✗
     - ESCALATE: Yellow with ↗️
   - Confidence bar (0-100%)
   - Natural language reasoning (LLM output)
   - Structured risk factors list
   - Signals used (links to SignalCard components)
   - LLM metadata: model, processing time
   - Expandable: "View LLM Prompt" → modal with full prompt/response

9. **FinalDecision.tsx** - Final decision card
   - Large, prominent display (hero card)
   - Final decision: APPROVE or DENY
   - Confidence score with visual gauge
   - Final Reviewer reasoning
   - Evidence summary:
     - X agent decisions aligned
     - X signals purchased ($Y.YY total)
     - X risk factors identified
   - Actions:
     - Download audit packet button
     - View complete timeline button (scroll to top)
   - Only visible when status = COMPLETED

10. **AuditDownload.tsx** - Export audit packet
    - Button: "Download Audit Packet (JSON)"
    - Click: GET /api/audit/:transactionId
    - Download file: `fraud-audit-${transactionId}-${timestamp}.json`
    - File size indicator: "~15-20KB"
    - Loading state during download
    - Success toast: "Audit packet downloaded"

### 2. Case Detail Page

**File:** `app/case/[transactionId]/page.tsx`

**Responsibilities:**
- Extract transactionId from URL params
- Implement polling logic (GET /api/case/:transactionId every 2s)
- Stop polling when status = COMPLETED or FAILED
- Handle loading state (initial load)
- Handle error states (case not found, API errors)
- Compose all components in responsive layout

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────┐
│ <CaseHeader />                                          │
│ Transaction ID, Amount, Status Badge                    │
├─────────────────────────────────────────────────────────┤
│ <CostTracker />                                         │
│ Running Total: $0.35                                    │
├─────────────────────────────────────────────────────────┤
│ Grid Layout (2 columns on desktop, 1 on mobile)         │
│ ┌──────────────────────┐  ┌────────────────────────┐  │
│ │ Left Column          │  │ Right Column           │  │
│ │ <AgentTimeline />    │  │ <SignalCard /> (vel)   │  │
│ │ - 8-9 steps          │  │ <SignalCard /> (net)   │  │
│ │ - Vertical stepper   │  │ <DecisionCard /> (L1)  │  │
│ │ - Auto-scroll        │  │ <DecisionCard /> (L2)  │  │
│ │                      │  │ <FinalDecision />      │  │
│ └──────────────────────┘  └────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ <AuditDownload />                                       │
└─────────────────────────────────────────────────────────┘
```

**Polling Logic:**
```typescript
const [caseData, setCaseData] = useState(null);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState(null);
const [isPolling, setIsPolling] = useState(true);

useEffect(() => {
  if (!isPolling) return;

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/case/${transactionId}`);
      if (!res.ok) throw new Error('Failed to fetch case');
      const data = await res.json();

      setCaseData(data);
      setIsLoading(false);

      // Stop polling when complete
      if (data.status === 'COMPLETED' || data.status === 'FAILED') {
        setIsPolling(false);
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  fetchCase(); // Initial fetch
  const interval = setInterval(fetchCase, 2000); // Poll every 2s

  return () => clearInterval(interval);
}, [transactionId, isPolling]);
```

### 3. Home Page

**File:** `app/page.tsx`

**Responsibilities:**
- Display SubmitForm component
- Hero section with project description
- Optional: Recent cases list (nice-to-have, not required for MVP)

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│ Hero Section                                            │
│ "Fraud Escalation Agent"                                │
│ "Agentic fraud detection with x402 paywalled signals"  │
├─────────────────────────────────────────────────────────┤
│ <SubmitForm />                                          │
│ Submit a transaction for analysis                       │
└─────────────────────────────────────────────────────────┘
```

## Design Principles

### 1. Agent Attribution
- Always show which agent performed each action
- Agent names prominent, not buried in metadata
- Color coding for different agents (optional but nice)

### 2. Temporal Clarity
- Show timestamps for all events (formatted: "10:30:05 AM")
- Show durations for long-running operations ("1.2s", "120ms")
- Relative time for recent events ("2 seconds ago") optional

### 3. Cost Transparency
- Display prices for every signal purchase
- Running total always visible in header
- Itemized breakdown accessible
- Show free operations (cached reads, LLM quota)

### 4. Progressive Disclosure
- Simple summary view by default
- Details available on click/expand
- Layered information architecture:
  - L1 (Glance): Status + final decision
  - L2 (Skim): Timeline + cost
  - L3 (Deep): Click step → full details
  - L4 (Audit): Download JSON

### 5. State Persistence
- All data from MongoDB (no client-side caching)
- Page refresh → timeline rebuilds from API
- Shareable URLs work immediately

## Technical Requirements

### TypeScript

All components must have:
- Strict typing enabled
- Explicit prop interfaces
- No `any` types (use `unknown` if needed)

Example:
```typescript
interface TimelineStepProps {
  stepNumber: number;
  agentName: string;
  action: string;
  timestamp: Date;
  duration: number;
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata?: Record<string, any>;
}

export default function TimelineStep({
  stepNumber,
  agentName,
  action,
  timestamp,
  duration,
  input,
  output,
  metadata
}: TimelineStepProps) {
  // Component implementation
}
```

### Tailwind CSS

- Use utility classes only (no custom CSS files)
- Responsive design with `sm:`, `md:`, `lg:` breakpoints
- Color palette:
  - Primary: blue-600, blue-500 (links, accents)
  - Success: green-600 (APPROVE, completed)
  - Warning: yellow-600 (ESCALATE, processing)
  - Danger: red-600 (DENY, error)
  - Neutral: gray-50, gray-100, gray-600 (backgrounds, text)
- Spacing: Use Tailwind spacing scale (p-4, mb-6, gap-4)
- Shadows: shadow-sm, shadow-md for cards
- Rounded: rounded-lg for cards, rounded-full for badges

### Accessibility

- Semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>`)
- ARIA labels for icon-only buttons
- Keyboard navigation (tab order, enter/space for actions)
- Focus visible states
- Screen reader text for status changes

### Error Handling

- Loading states: Skeleton loaders or spinners
- Error states: User-friendly messages with retry option
- Empty states: "No signals purchased yet", "No decisions available"
- Network errors: Toast notifications (top-right, auto-dismiss 5s)

### Performance

- Avoid unnecessary re-renders (React.memo for expensive components)
- Debounce polling if needed (not critical for 2s interval)
- Lazy load modals/drawers (don't render until opened)

## API Contract (Expected Data Structure)

### GET /api/case/:transactionId

**Response:**
```typescript
{
  success: boolean;
  transaction: {
    transactionId: string;
    amount: number;
    currency: string;
    userId: string;
    merchantId: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
  };
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  currentAgent?: string;
  agentHistory: string[];
  finalDecision?: 'APPROVE' | 'DENY';
  confidence?: number;
  totalCost: number;
  timeline: Array<{
    stepNumber: number;
    agentName: string;
    action: string;
    timestamp: Date;
    duration: number;
    input?: Record<string, any>;
    output?: Record<string, any>;
    metadata?: Record<string, any>;
  }>;
  signals: Array<{
    signalId: string;
    signalType: 'velocity' | 'network';
    transactionId: string;
    userId: string;
    data: Record<string, any>;
    cost: number;
    purchasedAt: Date;
    purchasedBy: string;
    expiresAt: Date;
  }>;
  decisions: Array<{
    decisionId: string;
    transactionId: string;
    agentName: string;
    decision: 'APPROVE' | 'DENY' | 'ESCALATE';
    confidence: number;
    reasoning: string;
    riskFactors: string[];
    signalsUsed: string[];
    signalCost: number;
    model: string;
    processingTime: number;
    timestamp: Date;
    isFinal: boolean;
  }>;
}
```

### POST /api/case/create

**Request:**
```typescript
{
  amount: number;
  currency: string;
  userId: string;
  merchantId: string;
  metadata?: Record<string, any>;
}
```

**Response:**
```typescript
{
  success: boolean;
  transactionId: string;
}
```

### GET /api/audit/:transactionId

**Response:**
```typescript
{
  success: boolean;
  audit: {
    transaction: { ... };
    timeline: [ ... ];
    signals: [ ... ];
    decisions: [ ... ];
    payments: [ ... ];
    exportedAt: Date;
  };
}
```

## Success Criteria

Your implementation is complete when:

- ✅ All 10 components built and typed correctly
- ✅ Case detail page renders with polling logic
- ✅ Timeline shows 8-9 steps chronologically
- ✅ Signals appear with cost ($0.10, $0.25)
- ✅ Running cost increments in real-time ($0.00 → $0.10 → $0.35)
- ✅ Final decision appears when status = COMPLETED
- ✅ Polling stops automatically when complete
- ✅ Audit export downloads JSON file
- ✅ Page refresh works (timeline persists)
- ✅ Responsive on desktop and tablet
- ✅ No TypeScript errors
- ✅ No console errors or warnings

## Done Criteria

You are DONE when:

1. All components exist in `app/components/*.tsx`
2. Case detail page exists at `app/case/[transactionId]/page.tsx`
3. Home page updated at `app/page.tsx`
4. All components render without errors
5. Polling logic works (starts, updates, stops)
6. TypeScript compiles without errors
7. Layout is responsive
8. User can:
   - Submit transaction via home page
   - Navigate to case detail page
   - Watch timeline populate in real-time
   - See signals purchased with costs
   - See final decision when complete
   - Download audit packet as JSON

## Notes

- Focus on functionality first, polish second
- Use placeholder data if API isn't ready (mock responses)
- Test with different screen sizes (desktop, tablet, mobile)
- Keep components simple and focused (single responsibility)
- Prioritize readability over cleverness
- Comment complex logic (especially polling and state management)

---

**Remember:** You are building an agent-friendly UI that makes autonomous AI decision-making transparent, trustworthy, and auditable. Every component should reinforce the core philosophy: **agents are first-class citizens**.
