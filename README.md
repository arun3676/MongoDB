<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.3-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-green?style=for-the-badge&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Railway-Deploy-purple?style=for-the-badge&logo=railway" alt="Railway" />
</p>

# Vigil

**Autonomous Economic Fraud Defense**

A multi-agent fraud detection system that uses value-of-information reasoning to autonomously decide when to purchase premium fraud signals. The system implements the x402 payment protocol for paywalled signals, with complete auditability through MongoDB Atlas.

## Key Features

- **Multi-Agent Architecture** - Sequential agents (Suspicion → Policy → VOI/Budget → Buyer/Decision)
- **Customer Verification** - Automatic outreach + secure identity verification
- **Budget-Aware Decisions** - VOI (Value of Information) reasoning for signal purchases
- **x402 Payment Protocol** - Coinbase Developer Platform wallets on Base Sepolia
- **Complete Audit Trail** - Every action logged immutably in MongoDB Atlas
- **Real-time Dashboard** - Live case monitoring with agent timeline visualization

---

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- Fireworks AI API key

### 1. Clone and Install

```bash
git clone https://github.com/arun3676/VIGIL.git
cd VIGIL
npm install
```

### 2. Configure Environment

```bash
cp env.local.template .env.local
# Edit .env.local with your credentials
```

### 3. Initialize Database

```bash
npm run db:init
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) to view the application.

---

## Deployment

Vigil can be deployed to any Node.js hosting platform. See [DEPLOYMENT.md](DEPLOYMENT.md) for comprehensive deployment instructions.

**Quick Deploy Options:**
- **Railway** - Recommended for production ($5/month, always-on)
- **Docker** - Containerized deployment
- **Vercel** - Serverless deployment (free tier available)

For production deployments, ensure all required environment variables are configured and `NODE_ENV=production` is set.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Yes | Database name (default: `fraud_agent`) |
| `FIREWORKS_API_KEY` | Yes | Fireworks AI API key for LLM |
| `CDP_API_KEY_NAME` | No* | Coinbase Developer Platform API key ID |
| `CDP_API_KEY_PRIVATE_KEY` | No* | CDP private key (PEM format) |
| `CDP_NETWORK_ID` | No* | Network ID (e.g., `base-sepolia`) |
| `CDP_RECIPIENT_ADDRESS` | No* | Ethereum address for payments |
| `USE_MOCK_PAYMENTS` | No | Enable mock payment mode (development only) |
| `USE_MOCK_SMS` | No | Enable mock SMS mode (development only) |
| `VOYAGE_API_KEY` | No | Voyage AI API key for semantic embeddings |

*Required for production blockchain payments. See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup.

---

## Project Structure

```
vigil/
├── app/
│   ├── api/                 # API routes
│   │   ├── case/            # Case management
│   │   ├── signals/         # x402 paywalled signals
│   │   ├── payments/        # Payment processing
│   │   └── health/          # Health check
│   ├── components/          # React UI components
│   └── page.tsx             # Homepage
├── lib/
│   ├── agents/              # Agent implementations
│   │   ├── orchestrator.ts
│   │   ├── suspicion-agent.ts
│   │   ├── policy-agent.ts
│   │   ├── voi-budget-agent.ts
│   │   └── buyer-decision-agent.ts
│   ├── mongodb.ts           # Database connection
│   ├── fireworks.ts         # LLM integration
│   ├── cdp-wallet.ts        # Blockchain payments
│   └── env.ts               # Environment validation
├── Dockerfile               # Production container
├── railway.json             # Railway configuration
└── package.json
```

---

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check and database status |
| POST | `/api/case/create` | Create new fraud case |
| GET | `/api/case/[transactionId]` | Get case details with timeline |
| GET | `/api/case/list` | List all cases |

### Signal Endpoints (x402 Paywalled)

| Method | Endpoint | Cost | Description |
|--------|----------|------|-------------|
| GET | `/api/signals/velocity` | $0.10 | User velocity analysis |
| GET | `/api/signals/network` | $0.25 | Network graph analysis |

### Payment Endpoint

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Process x402 payment |

---

## Architecture

### Agent Flow

```
Transaction → Suspicion Agent → Policy Agent → VOI/Budget Agent → Buyer/Decision Agent
                  ↓                  ↓                ↓                    ↓
            Risk Score          Policy Check     Signal Value         Final Decision
                                                 Calculation          (APPROVE/DENY)
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | MongoDB Atlas |
| LLM | Fireworks AI (Llama 3.1 70B) |
| Payments | Coinbase Developer Platform |
| Embeddings | Voyage AI |

### MongoDB Collections

| Collection | Purpose |
|------------|---------|
| `transactions` | Fraud cases with transaction data |
| `agent_steps` | Immutable audit trail |
| `signals` | Purchased signal data |
| `payments` | x402 payment ledger |
| `decisions` | Agent reasoning chain |
| `policies` | Fraud detection rules |

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### MongoDB Connection Issues

- Check IP whitelist in MongoDB Atlas (add `0.0.0.0/0` for Railway)
- Verify connection string format
- Ensure cluster is not paused

### Environment Variables

```bash
# Validate environment
npm run env:check
```

### Railway Deployment Issues

- Check build logs in Railway dashboard
- Verify all required environment variables are set
- Ensure `NODE_ENV=production` is configured

---

## Development

### Run Tests

```bash
npm run lint
```

### Database Operations

```bash
# Initialize database
npm run db:init

# Check environment
npm run env:check
```

### Local Development

```bash
npm run dev
```

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

See [AGENTS.md](AGENTS.md) for agent development guidelines.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with Next.js, MongoDB Atlas, and Fireworks AI
</p>
