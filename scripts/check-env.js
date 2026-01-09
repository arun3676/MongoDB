/**
 * Debug script to check .env.local format
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found!');
  process.exit(1);
}

console.log('✅ .env.local file exists\n');

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

console.log('📋 Checking environment variables:\n');

const envVars = {};
lines.forEach((line, index) => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      envVars[key.trim()] = value.trim();
    }
  }
});

// Check required CDP variables
const required = ['CDP_API_KEY_NAME', 'CDP_API_KEY_PRIVATE_KEY', 'CDP_NETWORK_ID', 'CDP_RECIPIENT_ADDRESS'];
const optional = ['CDP_WALLET_ID'];

console.log('Required variables:');
required.forEach(key => {
  const value = envVars[key];
  if (value) {
    // Mask sensitive values
    if (key === 'CDP_API_KEY_PRIVATE_KEY') {
      const masked = value.length > 20 ? value.substring(0, 20) + '...' : '***';
      console.log(`  ✅ ${key} = ${masked}`);
    } else {
      console.log(`  ✅ ${key} = ${value}`);
    }
  } else {
    console.log(`  ❌ ${key} = MISSING`);
  }
});

console.log('\nOptional variables:');
optional.forEach(key => {
  const value = envVars[key];
  if (value) {
    console.log(`  ✅ ${key} = ${value}`);
  } else {
    console.log(`  ⚠️  ${key} = (empty - will be auto-created)`);
  }
});

console.log('\n📊 Summary:');
const missing = required.filter(key => !envVars[key]);
if (missing.length === 0) {
  console.log('  ✅ All required variables are set!');
  console.log('\n💡 Next step: Run `node scripts/get-cdp-wallet-id.js`');
} else {
  console.log(`  ❌ Missing ${missing.length} required variable(s):`);
  missing.forEach(key => console.log(`     - ${key}`));
  console.log('\n💡 Add missing variables to .env.local');
}
