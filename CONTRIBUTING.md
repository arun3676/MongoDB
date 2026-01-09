# Contributing to Fraud Escalation Agent

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/fraudagent.git
   cd fraudagent
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Environment**
   ```bash
   cp env.local.template .env.local
   # Edit .env.local with your credentials
   ```

4. **Initialize Database**
   ```bash
   node init-database.js
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns in the codebase
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions focused and single-purpose

## Agent Development

If you're working on agent logic:

1. Read `AGENTS.md` to understand the agent architecture
2. Each agent should:
   - Read from MongoDB before acting
   - Write decisions/steps to MongoDB atomically
   - Include proper error handling
   - Log important actions (use descriptive console.log statements)
   - Never hardcode credentials or secrets

## Testing

- Test your changes locally before submitting
- Ensure MongoDB connection works
- Test x402 payment flows with testnet USDC
- Verify agent timeline updates correctly

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly
4. Update documentation if needed
5. Submit a pull request with a clear description

## MongoDB Collections

When adding new fields to collections:

1. Update the schema in `lib/initDb.ts`
2. Document the change in the README
3. Consider migration needs for existing data

## Security

- **Never commit** `.env.local` or any files with API keys
- All secrets must use environment variables
- Test with testnet tokens only (never mainnet)
- Review payment flows carefully before production use

## Questions?

Open an issue for questions or discussions about the codebase.
