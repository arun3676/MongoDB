# Deployment Guide

This guide covers deploying Vigil to production environments.

## Table of Contents

- [Railway Deployment](#railway-deployment) (Recommended)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Railway Deployment

Railway is the recommended platform for Vigil. It offers:
- Always-on hosting (no cold starts)
- $5/month Hobby plan with 512MB RAM
- Automatic deployments from GitHub
- Built-in logging and metrics

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Verify your account

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose the `VIGIL` repository
4. Railway will auto-detect Next.js

### Step 3: Configure Environment Variables

In Railway dashboard, go to Variables and add:

```
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=fraud_agent
FIREWORKS_API_KEY=your_fireworks_api_key

# Production settings
NODE_ENV=production

# Optional: Mock mode for demos (set to false for production)
USE_MOCK_PAYMENTS=true
USE_MOCK_SMS=true

# Optional: Real payments (requires CDP setup)
CDP_API_KEY_NAME=your_cdp_key_id
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----
CDP_NETWORK_ID=base-sepolia
CDP_RECIPIENT_ADDRESS=0x...

# Optional: Real SMS (requires Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+15551234567

# Optional: Embeddings
VOYAGE_API_KEY=your_voyage_key
```

### Step 4: Deploy

Railway automatically deploys when you:
- Push to the main branch
- Manually trigger a deploy in the dashboard

Build process:
1. `npm ci` - Install dependencies
2. `npm run build` - Build Next.js app
3. `npm start` - Start production server

### Step 5: Configure Domain (Optional)

1. Go to Settings > Domains
2. Add a custom domain or use Railway's generated URL
3. SSL is automatic

### Step 6: Verify Deployment

```bash
# Check health endpoint
curl https://your-app.railway.app/api/health

# Expected response
{
  "status": "ok",
  "database": {
    "connected": true,
    "name": "fraud_agent",
    "initialized": true
  }
}
```

---

## Docker Deployment

### Build Image

```bash
docker build -t vigil:latest .
```

### Run Container

```bash
docker run -d \
  --name vigil \
  -p 3000:3000 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e MONGODB_DB_NAME="fraud_agent" \
  -e FIREWORKS_API_KEY="..." \
  -e NODE_ENV="production" \
  vigil:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  vigil:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - MONGODB_DB_NAME=${MONGODB_DB_NAME}
      - FIREWORKS_API_KEY=${FIREWORKS_API_KEY}
      - USE_MOCK_PAYMENTS=true
      - USE_MOCK_SMS=true
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with:

```bash
docker-compose up -d
```

---

## Vercel Deployment

### Deploy via CLI

```bash
npm install -g vercel
vercel
```

### Deploy via GitHub

1. Import project at [vercel.com/new](https://vercel.com/new)
2. Connect GitHub repository
3. Configure environment variables
4. Deploy

### Limitations on Vercel

- Serverless functions have 10-second timeout (free tier)
- Cold starts may affect first request
- Long-running agent operations may timeout

For production use, Railway is recommended over Vercel.

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.net/` |
| `MONGODB_DB_NAME` | Database name | `fraud_agent` |
| `FIREWORKS_API_KEY` | Fireworks AI API key | `fw_...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3000` |
| `USE_MOCK_PAYMENTS` | Use mock payment system | `false` |
| `USE_MOCK_SMS` | Use mock SMS system | `false` |
| `LOG_LEVEL` | Logging level | `warn` (production) |

### CDP Variables (Real Payments)

| Variable | Description |
|----------|-------------|
| `CDP_API_KEY_NAME` | CDP API key ID (UUID) |
| `CDP_API_KEY_PRIVATE_KEY` | EC private key (PEM) |
| `CDP_NETWORK_ID` | Network (`base-sepolia`) |
| `CDP_RECIPIENT_ADDRESS` | Payment recipient |
| `CDP_WALLET_ID` | Wallet ID (auto-created) |

### Twilio Variables (Real SMS)

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Twilio auth token |
| `TWILIO_FROM_NUMBER` | Sender phone number |

---

## Database Setup

### MongoDB Atlas Configuration

1. **Create Cluster**
   - Go to [MongoDB Atlas](https://cloud.mongodb.com)
   - Create M0 (free) or M2+ cluster
   - Choose region close to deployment

2. **Create Database User**
   - Go to Database Access
   - Add new database user
   - Note username and password

3. **Configure Network Access**
   - Go to Network Access
   - Add IP Address: `0.0.0.0/0` (allows all IPs)
   - This is required for Railway/Vercel

4. **Get Connection String**
   - Click "Connect" on cluster
   - Choose "Connect your application"
   - Copy connection string
   - Replace `<password>` with actual password

### Initialize Database

After deployment, initialize the database schema:

```bash
# Option 1: Via npm script (local)
npm run db:init

# Option 2: Via Railway CLI
railway run node init-database.js

# Option 3: Via API (first request auto-initializes)
curl https://your-app.railway.app/api/health
```

---

## Post-Deployment

### Verify Health

```bash
curl https://your-app.railway.app/api/health
```

### Test Case Creation

```bash
curl -X POST https://your-app.railway.app/api/case/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "currency": "USD",
    "userId": "user_test_001",
    "merchantId": "merchant_001"
  }'
```

### Check Case Status

```bash
curl https://your-app.railway.app/api/case/TX-xxx
```

---

## Monitoring

### Railway Dashboard

- View real-time logs
- Monitor memory/CPU usage
- Set up deployment notifications

### Health Endpoint

The `/api/health` endpoint provides:
- Database connection status
- Collection initialization status
- System health metrics

### Logging

Logs are structured JSON in production:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "context": "API:Case",
  "message": "Case created",
  "data": { "transactionId": "TX-123" }
}
```

Set `LOG_LEVEL` to control verbosity:
- `debug` - All logs (development)
- `info` - Info and above
- `warn` - Warnings and errors (production default)
- `error` - Errors only

---

## Troubleshooting

### Build Failures

**Error: Module not found**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

**Error: TypeScript errors**
```bash
npm run lint
# Fix reported issues
```

### Runtime Errors

**Error: Missing MONGODB_URI**
- Verify environment variables in Railway dashboard
- Check for typos in variable names

**Error: Connection timeout**
- Check MongoDB Atlas IP whitelist
- Verify cluster is running
- Check network connectivity

**Error: 502 Bad Gateway**
- Check Railway logs for errors
- Verify build completed successfully
- Check memory usage (may need upgrade)

### Database Issues

**Collections not created**
```bash
# Re-initialize database
npm run db:init
```

**Connection refused**
- Verify MongoDB URI format
- Check database user permissions
- Ensure network access allows Railway IPs

### Performance Issues

**Slow responses**
- Check MongoDB indexes
- Monitor Railway memory usage
- Review agent processing times in logs

**Memory exceeded**
- Upgrade Railway plan
- Optimize MongoDB queries
- Review connection pool settings

---

## Cost Optimization

### Railway Pricing

| Plan | Price | RAM | Always-On |
|------|-------|-----|-----------|
| Hobby | $5/mo | 512MB | Yes |
| Pro | $20/mo | 8GB | Yes |

### Tips

1. **Use connection pooling** - Already configured in `lib/mongodb.ts`
2. **Enable mock mode for demos** - Saves API costs
3. **Monitor usage** - Railway dashboard shows resource consumption
4. **Use M0 MongoDB cluster** - Free tier for development/demos

---

## Security Checklist

- [ ] Environment variables set (not hardcoded)
- [ ] MongoDB IP whitelist configured
- [ ] HTTPS enabled (automatic on Railway/Vercel)
- [ ] No secrets in git history
- [ ] Production `NODE_ENV` set
- [ ] Mock mode disabled for production payments
- [ ] Database user has minimal required permissions

---

## Support

- **Issues**: [GitHub Issues](https://github.com/arun3676/VIGIL/issues)
- **Documentation**: [AGENTS.md](AGENTS.md)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
