# Fraud Escalation Agent

A multi-agent fraud detection system that uses value-of-information reasoning to autonomously decide when to purchase premium fraud signals. The system implements the x402 payment protocol for paywalled signals, with complete auditability through MongoDB Atlas.

## Features

✨ **Multi-Agent Architecture**: Four specialized agents working in sequence (Suspicion → Policy → VOI/Budget → Buyer/Decision)  
📞 **Customer Notification & Verification**: Automatic outreach + secure verification on fraud suspicions  
💰 **Budget-Aware Decisions**: VOI (Value of Information) reasoning for every signal purchase  
🔗 **Paywalled Signals (x402)**: Coinbase Developer Platform wallets on Base Sepolia testnet  
📊 **Complete Audit Trail**: Every action logged in MongoDB Atlas  

---

## Overview

This system implements an agentic fraud detection workflow where agents start with cheap heuristics and progressively escalate by purchasing premium signals only when the value justifies the cost. All decisions, payments, and agent reasoning are immutably recorded in MongoDB Atlas for complete auditability.

## Quick Start

### 1. Configure Environment Variables

Copy the example environment file and configure your credentials:

```bash
# Copy example environment file
cp env.local.template .env.local

# Edit .env.local with your credentials
```

Required environment variables:
- `MONGODB_URI` - MongoDB Atlas connection string
- `MONGODB_DB_NAME` - Database name (default: `fraud_agent`)
- `FIREWORKS_API_KEY` - Fireworks AI API key (for agent reasoning)
- `CDP_API_KEY_NAME` - Coinbase Developer Platform API key ID
- `CDP_API_KEY_PRIVATE_KEY` - CDP API key private key (PEM format)
- `CDP_NETWORK_ID` - Network ID (e.g., `base-sepolia`)
- `CDP_RECIPIENT_ADDRESS` - Ethereum address to receive payments
- `CDP_WALLET_ID` - CDP wallet ID (auto-created if not set)

### 2. Install Dependencies

```powershell
npm install
```

### 3. Start Development Server

```powershell
npm run dev
```

Server runs at: http://localhost:3001

### 4. Initialize Database

```bash
node init-database.js
```

### 5. Verify Setup

```bash
# Check environment variables
node scripts/check-env.js

# Test API health endpoint
curl http://localhost:3001/api/health
```

Expected health response:
```json
{
  "status": "ok",
  "database": {
    "connected": true,
    "name": "fraud_agent",
    "initialized": true
  },
  "collections": [
    "transactions",
    "agent_steps",
    "signals",
    "payments",
    "decisions",
    "policies"
  ]
}
```

### 6. Set Up CDP Wallet (First Time Only)

```bash
# Create CDP wallet and get wallet ID
node scripts/get-cdp-wallet-id.js

# Add the returned wallet ID to your .env.local file
```

### 7. Start Using the Application

Open your browser:
- http://localhost:3001

## Project Structure

```
fraudagent/
├── app/
│   ├── api/                # API routes
│   │   ├── analytics/      # Analytics endpoints
│   │   ├── bazaar/         # Bazaar endpoints
│   │   ├── case/           # Case management endpoints
│   │   ├── marketplace/    # Marketplace endpoints
│   │   ├── payments/       # Payment processing
│   │   ├── signals/        # Signal endpoints (x402 paywalled)
│   │   ├── verification/   # Verification endpoints
│   │   └── health/         # Health check
│   ├── analytics/          # Analytics UI
│   ├── case/               # Case details UI
│   ├── cases/              # Cases list UI
│   ├── components/         # React UI components
│   ├── marketplace/        # Marketplace UI
│   ├── verify/             # Verification UI
│   └── page.tsx            # Homepage
├── lib/
│   ├── agents/             # Agent implementations
│   │   ├── buyer-decision-agent.ts
│   │   ├── customer-notification-agent.ts
│   │   ├── final-reviewer.ts
│   │   ├── l1-analyst.ts
│   │   ├── l2-analyst.ts
│   │   ├── orchestrator.ts
│   │   ├── policy-agent.ts
│   │   ├── suspicion-agent.ts
│   │   └── voi-budget-agent.ts
│   ├── cdp-wallet.ts       # Coinbase CDP wallet integration
│   ├── fireworks.ts        # Fireworks AI integration
│   ├── initDb.ts           # Database schema initialization
│   ├── marketplace/        # Marketplace utilities
│   ├── mongodb.ts          # MongoDB connection
│   ├── notifications.ts    # Notification utilities
│   ├── voyage.ts           # Voyage AI integration
│   └── x402.ts             # x402 payment protocol utilities
├── scripts/                # Utility scripts
│   ├── check-env.js        # Environment variable validation
│   ├── get-cdp-wallet-id.js # CDP wallet setup
│   ├── pre-production-check.js # Pre-production checks
│   └── seed-demo.js        # Seed demo data
├── AGENTS.md               # Agent architecture documentation
├── env.local.template      # Environment variable template
└── .env.local              # Your environment variables (not committed)
```

## MongoDB Collections

The system uses 6 collections:

1. **transactions** - Core fraud cases with transaction details
2. **agent_steps** - Timeline/audit trail (append-only, immutable)
3. **signals** - Purchased signal data (velocity, network, etc.)
4. **payments** - x402 payment ledger with complete audit trail
5. **decisions** - Agent reasoning chain and decisions
6. **policies** - Fraud detection rules and escalation policies

All collections and indexes are created automatically on first API request via `initDb.ts`.

## API Endpoints

### Core Endpoints
- `GET /api/health` - Health check and database status
- `POST /api/case/create` - Create a new fraud case
- `GET /api/case/:transactionId` - Get case details with full timeline

### Signal Endpoints (x402 Paywalled)
- `GET /api/signals/velocity` - Velocity signal ($0.10 USDC)
- `GET /api/signals/network` - Network signal ($0.25 USDC)

### Payment Endpoints
- `POST /api/payments` - Process x402 payment and return proof token

### Bazaar Endpoint
- `GET /api/bazaar/discover` - Discover available fraud detection tools

## Agent Architecture

The system uses four specialized agents that work sequentially, each with distinct responsibilities (see `AGENTS.md` for details):

1. **Explore Agent** - Codebase exploration, research, and understanding existing patterns (read-only operations).
2. **UI Agent** - Frontend UI implementation - React components, Tailwind CSS, user interactions, API polling.
3. **Orchestration Agent** - Agent logic, LLM integration, decision-making flow, MongoDB state management.
4. **Payments Agent** - x402 payment protocol implementation, paywalled signal endpoints, mock payment provider, MongoDB payment ledger.

See `AGENTS.md` for detailed agent documentation.

## MongoDB Atlas Features Showcased

✅ **Connection Pooling** - Efficient connection management
✅ **Auto Schema Setup** - Collections + indexes created on startup
✅ **TTL Indexes** - Auto-cleanup of expired signals (1 hour)
✅ **Compound Indexes** - Fast queries on multiple fields
✅ **Unique Constraints** - Prevent duplicate transaction IDs
✅ **Aggregation Pipelines** - Join data from 6 collections
✅ **Audit Trail** - Immutable append-only writes

## Troubleshooting

### Error: "Missing MONGODB_URI"
- Ensure `.env.local` exists with valid MongoDB Atlas connection string
- Copy from `.env.local.example` if needed

### Error: "Connection timeout"
- Check MongoDB Atlas IP whitelist (allow your IP or 0.0.0.0/0 for testing)
- Verify cluster is running (not paused)

### Error: "Authentication failed"
- Verify username and password in MONGODB_URI are correct
- Ensure user has read/write permissions on database

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Development setup
- Code style
- Agent development patterns
- Testing procedures
- Pull request process

### Quick Contribution Checklist

- [ ] Read `AGENTS.md` to understand the architecture
- [ ] Follow existing code patterns
- [ ] Test MongoDB operations locally
- [ ] Test x402 payment flows with testnet
- [ ] Update documentation if needed
- [ ] Never commit secrets or `.env.local`

## Architecture Notes

- **Multi-Agent System**: Four specialized agents work sequentially (see `AGENTS.md`)
- **MongoDB as Source of Truth**: All agent state and decisions are stored in MongoDB
- **x402 Protocol**: Paywalled signals require payment before access
- **Audit Trail**: Every action is logged immutably in `agent_steps` collection

## Technology Stack

- **Frontend**: Next.js 15, React 18, Tailwind CSS
- **Backend**: Next.js API routes
- **Database**: MongoDB Atlas
- **LLM**: Fireworks AI (Llama-v3p1-70b-instruct)
- **Payments**: Coinbase Developer Platform (Base Sepolia)
- **Language**: TypeScript

## License

MIT License - see [LICENSE](LICENSE) for details
