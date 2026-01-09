/**
 * Verify CDP setup and show wallet status
 * 
 * Run: node scripts/verify-cdp-setup.js
 */

const fs = require('fs');
const path = require('path');
const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');

async function verifySetup() {
  try {
    // Load .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error('❌ .env.local not found!');
      process.exit(1);
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();
          envVars[key.trim()] = value;
        }
      }
    });

    // Check required variables
    const required = ['CDP_API_KEY_NAME', 'CDP_API_KEY_PRIVATE_KEY', 'CDP_WALLET_ID', 'CDP_NETWORK_ID'];
    const missing = required.filter(key => !envVars[key]);

    if (missing.length > 0) {
      console.error('❌ Missing required variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      process.exit(1);
    }

    console.log('✅ All required variables found\n');

    // Initialize CDP client
    console.log('🔌 Connecting to Coinbase Developer Platform...');
    const cdp = new Coinbase({
      apiKeyName: envVars.CDP_API_KEY_NAME,
      privateKey: envVars.CDP_API_KEY_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });

    // Load wallet
    console.log(`📦 Loading wallet: ${envVars.CDP_WALLET_ID}...`);
    const wallet = await Wallet.fetch(envVars.CDP_WALLET_ID);
    const address = await wallet.getDefaultAddress();

    console.log('\n✅ CDP Setup Verified!\n');
    console.log('📋 Configuration:');
    console.log(`   API Key ID: ${envVars.CDP_API_KEY_NAME}`);
    console.log(`   Network: ${envVars.CDP_NETWORK_ID}`);
    console.log(`   Wallet ID: ${wallet.getId()}`);
    console.log(`   Wallet Address: ${address?.getId() || 'N/A'}`);

    // Get balances
    try {
      const balances = await wallet.listBalances();
      const usdcBalance = balances.get('usdc') || 0;
      const ethBalance = balances.get('eth') || 0;
      
      console.log(`\n💰 Wallet Balances:`);
      console.log(`   USDC: ${usdcBalance}`);
      console.log(`   ETH: ${ethBalance}`);
      
      if (parseFloat(usdcBalance.toString()) === 0) {
        console.log('\n⚠️  WARNING: Wallet has 0 USDC!');
        console.log('   Fund your wallet with testnet USDC from Base Sepolia faucet');
        console.log(`   Wallet Address: ${address?.getId()}`);
        console.log(`   Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet`);
      } else {
        console.log('\n✅ Wallet is funded and ready!');
      }
    } catch (err) {
      console.log('\n⚠️  Could not fetch balances:', err.message);
    }

    // Check recipient address
    if (envVars.CDP_RECIPIENT_ADDRESS && envVars.CDP_RECIPIENT_ADDRESS !== '0x0000000000000000000000000000000000000000') {
      console.log(`\n✅ Recipient Address: ${envVars.CDP_RECIPIENT_ADDRESS}`);
    } else {
      console.log(`\n⚠️  Recipient Address not set (using default)`);
      console.log(`   Set CDP_RECIPIENT_ADDRESS in .env.local`);
    }

    console.log('\n✨ Setup verification complete!');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

verifySetup();
