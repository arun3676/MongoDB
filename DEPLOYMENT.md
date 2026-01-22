# Deployment Guide

This guide covers deploying Vigil to production environments.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [Railway Deployment](#railway-deployment) (Recommended)
- [Docker Deployment](#docker-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Deployment Overview

### Project Structure

Your project has two components:
1. **Next.js App** (root directory) - Main fraud detection application
2. **ML Service** (`ml_service/` directory) - Python FastAPI service for Isolation Forest model

### Root Directory Detection

✅ **Railway**: Automatically detects the root directory and builds the Next.js app. No configuration needed.

✅ **Vercel**: Automatically detects Next.js in the root directory. No configuration needed.

Both platforms will:
- Auto-detect `package.json` in root
- Run `npm install` and `npm run build`
- Start the Next.js server

### ML Service Deployment

The `ml_service` is a **separate Python service** that needs its own deployment:

**Option 1: Deploy ML Service on Railway (Recommended)**
1. Create a **second Railway service** in the same project
2. Set root directory to `ml_service/`
3. Railway will auto-detect Python and use `requirements.txt`
4. Set environment variable: `ML_SERVICE_URL=https://your-ml-service.railway.app`

**Option 2: Deploy ML Service Separately**
- Deploy to Render, Fly.io, or any Python hosting
- Update `ML_SERVICE_URL` in your Next.js app to point to the ML service URL

**Option 3: Skip ML Service (Optional)**
- The app works without the ML service
- Suspicion Agent will use heuristics only (no ML anomaly scores)
- Set `ML_SERVICE_URL` to empty or omit it

### Environment Variables Split

#### For Railway (Next.js App)

All environment variables go into the **Next.js service**:

```
# Required
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=fraud_agent
FIREWORKS_API_KEY=your_key

# Production
NODE_ENV=production

# Payments (CDP)
CDP_API_KEY_NAME=your_key_id
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...
CDP_NETWORK_ID=base-sepolia
CDP_RECIPIENT_ADDRESS=0x...

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+15551234567

# ML Service (if deployed separately)
ML_SERVICE_URL=https://your-ml-service.railway.app

# Optional
VOYAGE_API_KEY=your_key
```

#### For Vercel (Next.js App Only)

**Important**: Vercel only supports the Next.js app. The ML service must be deployed elsewhere (Railway, Render, etc.).

Add these environment variables in Vercel dashboard:

```
# Required
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=fraud_agent
FIREWORKS_API_KEY=your_key

# Production
NODE_ENV=production

# Payments (CDP)
CDP_API_KEY_NAME=your_key_id
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...
CDP_NETWORK_ID=base-sepolia
CDP_RECIPIENT_ADDRESS=0x...

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+15551234567

# ML Service (point to external deployment)
ML_SERVICE_URL=https://your-ml-service.onrender.com

# Optional
VOYAGE_API_KEY=your_key
```

#### For ML Service (Separate Deployment)

If deploying ML service separately, only these are needed:

```
# Python service environment (minimal)
PORT=8000
# (Model files should be in the deployment)
```

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
4. Railway will auto-detect Next.js in the root directory

### Step 2b: Deploy ML Service (Optional)

If you want to use the ML service:

1. In the same Railway project, click **"+ New"** → **"Service"**
2. Select **"Deploy from GitHub repo"** again
3. Choose the same `VIGIL` repository
4. In the service settings, set **Root Directory** to `ml_service`
5. Railway will auto-detect Python and install from `requirements.txt`
6. Note the ML service URL (e.g., `https://ml-service.railway.app`)

### Step 3: Configure Environment Variables

In Railway dashboard, go to Variables and add:

```
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=fraud_agent
FIREWORKS_API_KEY=your_fireworks_api_key

# Production settings
NODE_ENV=production

# Payments (requires CDP setup)
CDP_API_KEY_NAME=your_cdp_key_id
CDP_API_KEY_PRIVATE_KEY=-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----
CDP_NETWORK_ID=base-sepolia
CDP_RECIPIENT_ADDRESS=0x...

# SMS Notifications (requires Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+15551234567

# ML Service (if deployed separately)
# If you deployed ML service in Step 2b, use that URL:
ML_SERVICE_URL=https://your-ml-service.railway.app
# If not using ML service, omit this variable

# Optional: Embeddings
VOYAGE_API_KEY=your_voyage_key
```

### Step 4: Deploy

Railway automatically deploys when you:
- Push to the main branch
- Manually trigger a deploy in the dashboard

Build process:
1. `npm ci` - Install dependencies
2. `npm run build` - Build Next.js app (environment variables NOT required during build)
3. `npm start` - Start production server (environment variables required at runtime)

**Note**: Environment variables are only needed when the app runs, not during the Docker build phase. The code uses lazy initialization to validate environment variables at runtime.

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
      - CDP_API_KEY_NAME=${CDP_API_KEY_NAME}
      - CDP_API_KEY_PRIVATE_KEY=${CDP_API_KEY_PRIVATE_KEY}
      - CDP_NETWORK_ID=${CDP_NETWORK_ID}
      - CDP_RECIPIENT_ADDRESS=${CDP_RECIPIENT_ADDRESS}
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

### Important: ML Service Limitation

⚠️ **Vercel only supports Next.js (serverless functions).** The Python ML service (`ml_service/`) cannot run on Vercel.

**Options:**
1. **Deploy ML service separately** on Railway/Render/Fly.io, then set `ML_SERVICE_URL` in Vercel
2. **Skip ML service** - The app works without it (uses heuristics only)

### Deploy via CLI

```bash
npm install -g vercel
vercel
```

### Deploy via GitHub

1. Import project at [vercel.com/new](https://vercel.com/new)
2. Connect GitHub repository
3. **Root directory**: Leave empty (auto-detects root)
4. Configure environment variables (see [Environment Variables Split](#environment-variables-split))
5. Deploy

### Configure Environment Variables

Add all environment variables in Vercel dashboard → Settings → Environment Variables.

**Important**: Set `ML_SERVICE_URL` to your externally deployed ML service URL, or omit it if not using ML service.

### Limitations on Vercel

- Serverless functions have 10-second timeout (free tier)
- Cold starts may affect first request
- Long-running agent operations may timeout
- **Cannot run Python ML service** (must deploy separately)

For production use, Railway is recommended over Vercel (supports both Next.js and ML service).

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
| `LOG_LEVEL` | Logging level | `warn` (production) |

### CDP Variables (Blockchain Payments)

| Variable | Description |
|----------|-------------|
| `CDP_API_KEY_NAME` | CDP API key ID (UUID) |
| `CDP_API_KEY_PRIVATE_KEY` | EC private key (PEM) |
| `CDP_NETWORK_ID` | Network (`base-sepolia`) |
| `CDP_RECIPIENT_ADDRESS` | Payment recipient |
| `CDP_WALLET_ID` | Wallet ID (auto-created) |

### Twilio Variables (SMS Notifications)

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

**Error: Missing MONGODB_URI in environment variables (during build)**
This error occurs during `npm run build` when Next.js tries to collect page data.

**Solution**: This has been fixed in the latest code. The app now uses lazy initialization - environment variables are validated at runtime, not during build.

If you still see this error:
```bash
# Pull latest changes
git pull origin main

# Rebuild
npm run build
```

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
2. **Monitor usage** - Railway dashboard shows resource consumption
3. **Use M0 MongoDB cluster** - Free tier for development/demos
4. **Configure rate limits** - Prevent excessive API usage

---

## Security Checklist

- [ ] Environment variables set (not hardcoded)
- [ ] MongoDB IP whitelist configured
- [ ] HTTPS enabled (automatic on Railway/Vercel)
- [ ] No secrets in git history
- [ ] Production `NODE_ENV` set
- [ ] CDP and Twilio credentials configured securely
- [ ] Database user has minimal required permissions

---

## Quick Reference

### What Goes Where?

| Component | Railway | Vercel | Notes |
|-----------|---------|--------|-------|
| **Next.js App** | ✅ Auto-detected (root) | ✅ Auto-detected (root) | No config needed |
| **ML Service** | ✅ Separate service (set root: `ml_service/`) | ❌ Not supported | Deploy separately for Vercel |
| **Environment Variables** | All in Next.js service | All in Vercel dashboard | See [Environment Variables Split](#environment-variables-split) |

### Environment Variables Summary

**Required for Both:**
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `FIREWORKS_API_KEY`
- `NODE_ENV=production`

**For Payments:**
- `CDP_API_KEY_NAME`
- `CDP_API_KEY_PRIVATE_KEY`
- `CDP_NETWORK_ID`
- `CDP_RECIPIENT_ADDRESS`

**For SMS:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

**For ML Service:**
- `ML_SERVICE_URL` (point to deployed ML service, or omit if not using)

**Optional:**
- `VOYAGE_API_KEY` (for semantic embeddings)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/arun3676/VIGIL/issues)
- **Documentation**: [AGENTS.md](AGENTS.md)
- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
