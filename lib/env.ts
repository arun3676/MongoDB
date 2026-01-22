/**
 * Environment Variable Validation
 * 
 * Validates required environment variables at runtime.
 * Provides clear error messages for missing configuration.
 */

interface EnvConfig {
  // Required for basic functionality
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
  
  // Required for agent reasoning
  FIREWORKS_API_KEY: string;
  
  // CDP Configuration (required for real payments)
  CDP_API_KEY_NAME?: string;
  CDP_API_KEY_PRIVATE_KEY?: string;
  CDP_NETWORK_ID?: string;
  CDP_RECIPIENT_ADDRESS?: string;
  CDP_WALLET_ID?: string;
  
  // Optional: Mock mode
  USE_MOCK_PAYMENTS?: string;
  USE_MOCK_SMS?: string;
  
  // Optional: Twilio (for real SMS)
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
  
  // Optional: ML Service
  ML_SERVICE_URL?: string;
  
  // Optional: Voyage AI (for embeddings)
  VOYAGE_API_KEY?: string;
  
  // System
  NODE_ENV?: string;
  PORT?: string;
  LOG_LEVEL?: string;
}

interface ValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingOptional: string[];
  warnings: string[];
}

const REQUIRED_VARS = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'FIREWORKS_API_KEY',
] as const;

const CDP_VARS = [
  'CDP_API_KEY_NAME',
  'CDP_API_KEY_PRIVATE_KEY',
  'CDP_NETWORK_ID',
  'CDP_RECIPIENT_ADDRESS',
] as const;

const TWILIO_VARS = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_FROM_NUMBER',
] as const;

/**
 * Validate environment variables
 * 
 * @returns ValidationResult with status and any issues found
 */
export function validateEnv(): ValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missingRequired.push(key);
    }
  }
  
  // Check CDP variables (required if not using mock payments)
  const useMockPayments = process.env.USE_MOCK_PAYMENTS === 'true';
  if (!useMockPayments) {
    for (const key of CDP_VARS) {
      if (!process.env[key]) {
        missingOptional.push(key);
        warnings.push(`${key} not set - payments will use mock mode`);
      }
    }
  }
  
  // Check Twilio variables (required if not using mock SMS)
  const useMockSMS = process.env.USE_MOCK_SMS === 'true';
  if (!useMockSMS) {
    for (const key of TWILIO_VARS) {
      if (!process.env[key]) {
        missingOptional.push(key);
        warnings.push(`${key} not set - SMS will use mock mode`);
      }
    }
  }
  
  // Check for production-specific concerns
  if (process.env.NODE_ENV === 'production') {
    if (useMockPayments) {
      warnings.push('USE_MOCK_PAYMENTS is enabled in production - real payments disabled');
    }
    if (useMockSMS) {
      warnings.push('USE_MOCK_SMS is enabled in production - real SMS disabled');
    }
    if (!process.env.VOYAGE_API_KEY) {
      warnings.push('VOYAGE_API_KEY not set - semantic search features disabled');
    }
  }
  
  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
    warnings,
  };
}

/**
 * Get validated environment configuration
 * 
 * @throws Error if required variables are missing
 * @returns EnvConfig object with all environment variables
 */
export function getEnv(): EnvConfig {
  const validation = validateEnv();
  
  if (!validation.isValid) {
    throw new Error(
      `Missing required environment variables:\n${validation.missingRequired.map(v => `  - ${v}`).join('\n')}\n\n` +
      `Please check your .env.local file or environment configuration.`
    );
  }
  
  return {
    MONGODB_URI: process.env.MONGODB_URI!,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME!,
    FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY!,
    CDP_API_KEY_NAME: process.env.CDP_API_KEY_NAME,
    CDP_API_KEY_PRIVATE_KEY: process.env.CDP_API_KEY_PRIVATE_KEY,
    CDP_NETWORK_ID: process.env.CDP_NETWORK_ID,
    CDP_RECIPIENT_ADDRESS: process.env.CDP_RECIPIENT_ADDRESS,
    CDP_WALLET_ID: process.env.CDP_WALLET_ID,
    USE_MOCK_PAYMENTS: process.env.USE_MOCK_PAYMENTS,
    USE_MOCK_SMS: process.env.USE_MOCK_SMS,
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_FROM_NUMBER: process.env.TWILIO_FROM_NUMBER,
    ML_SERVICE_URL: process.env.ML_SERVICE_URL,
    VOYAGE_API_KEY: process.env.VOYAGE_API_KEY,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if mock payments are enabled
 */
export function isMockPaymentsEnabled(): boolean {
  return process.env.USE_MOCK_PAYMENTS === 'true';
}

/**
 * Check if mock SMS is enabled
 */
export function isMockSMSEnabled(): boolean {
  return process.env.USE_MOCK_SMS === 'true';
}

/**
 * Print environment validation status to console
 * Useful for debugging deployment issues
 */
export function printEnvStatus(): void {
  const validation = validateEnv();
  
  console.log('\n========================================');
  console.log('Environment Configuration Status');
  console.log('========================================\n');
  
  console.log(`Status: ${validation.isValid ? 'VALID' : 'INVALID'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Port: ${process.env.PORT || '3000 (default)'}`);
  
  if (validation.missingRequired.length > 0) {
    console.log('\n❌ Missing Required Variables:');
    validation.missingRequired.forEach(v => console.log(`   - ${v}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    validation.warnings.forEach(w => console.log(`   - ${w}`));
  }
  
  console.log('\n✅ Feature Status:');
  console.log(`   - MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
  console.log(`   - LLM (Fireworks): ${process.env.FIREWORKS_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`   - Payments (CDP): ${isMockPaymentsEnabled() ? 'Mock Mode' : (process.env.CDP_API_KEY_NAME ? 'Configured' : 'Not Configured')}`);
  console.log(`   - SMS (Twilio): ${isMockSMSEnabled() ? 'Mock Mode' : (process.env.TWILIO_ACCOUNT_SID ? 'Configured' : 'Not Configured')}`);
  console.log(`   - Embeddings (Voyage): ${process.env.VOYAGE_API_KEY ? 'Configured' : 'Not Configured'}`);
  console.log(`   - ML Service: ${process.env.ML_SERVICE_URL ? 'Configured' : 'Default (localhost:8020)'}`);
  
  console.log('\n========================================\n');
}
