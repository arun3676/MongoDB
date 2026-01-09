/**
 * Helper script to get/create CDP wallet ID
 * 
 * Run: node scripts/get-cdp-wallet-id.js
 * 
 * This will:
 * 1. Connect to CDP using your credentials
 * 2. Create a wallet if one doesn't exist
 * 3. Print the wallet ID to add to .env.local
 */

// Load .env.local manually (dotenv not required)
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value.trim();
        }
      }
    });
  }
}

loadEnvFile();
const { Coinbase, Wallet } = require('@coinbase/coinbase-sdk');

async function getOrCreateWallet() {
  try {
    const apiKeyName = process.env.CDP_API_KEY_NAME;
    const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

    if (!apiKeyName || !privateKey) {
      console.error('❌ Missing CDP credentials in .env.local');
      console.error('   Required: CDP_API_KEY_NAME, CDP_API_KEY_PRIVATE_KEY');
      process.exit(1);
    }
    
    // Validate API key format
    if (!apiKeyName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.error('⚠️  Warning: CDP_API_KEY_NAME should be a UUID format');
      console.error(`   Got: ${apiKeyName}`);
      console.error('   Example: 3be6bdb4-687b-48dc-87fb-55d7569c39d5');
    }
    
    if (privateKey.length < 20) {
      console.error('⚠️  Warning: CDP_API_KEY_PRIVATE_KEY seems too short');
      console.error('   Make sure you copied the full private key from the JSON file');
    }

    console.log('🔌 Connecting to Coinbase Developer Platform...');
    
    // Validate API key format
    console.log(`   API Key Name: ${apiKeyName.substring(0, 8)}...`);
    console.log(`   Private Key: ${privateKey.substring(0, 20)}...`);
    
    let cdp;
    try {
      cdp = new Coinbase({
        apiKeyName,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      });
    } catch (initError) {
      console.error('\n❌ Failed to initialize CDP client:');
      console.error('   Error:', initError?.message || initError);
      console.error('\n💡 Check your CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY in .env.local');
      throw initError;
    }

    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    const existingWalletId = process.env.CDP_WALLET_ID;

    if (existingWalletId) {
      console.log(`📦 Loading existing wallet: ${existingWalletId}`);
      
      try {
        const wallet = await Wallet.fetch(existingWalletId);
        
        let address = null;
        try {
          address = await wallet.getDefaultAddress();
        } catch (addrError) {
          console.log('⚠️  Could not get default address, continuing...');
        }
        
        console.log('\n✅ Wallet loaded successfully!');
        console.log(`   Wallet ID: ${wallet.getId()}`);
        console.log(`   Address: ${address?.getId() || 'N/A'}`);
        console.log(`   Network: ${networkId}`);
        
        // Get balances
        try {
          const balances = await wallet.listBalances();
          const usdcBalance = balances?.get('usdc') || 0;
          const ethBalance = balances?.get('eth') || 0;
          
          console.log(`\n💰 Balances:`);
          console.log(`   USDC: ${usdcBalance}`);
          console.log(`   ETH: ${ethBalance}`);
          
          if (parseFloat(usdcBalance.toString()) === 0) {
            console.log('\n⚠️  WARNING: Wallet has 0 USDC!');
            console.log('   Fund your wallet with testnet USDC from Base Sepolia faucet');
            console.log(`   Wallet Address: ${address?.getId() || 'N/A'}`);
          }
        } catch (err) {
          console.log('\n⚠️  Could not fetch balances (wallet may be new)');
        }
        
        return wallet.getId();
      } catch (fetchError) {
        // Wallet fetch failed - might be invalid wallet ID or API issue
        console.error('\n⚠️  Failed to fetch existing wallet. Error details:');
        
        // Extract all error properties
        const errorDetails = {
          name: fetchError?.name,
          message: fetchError?.message,
          status: fetchError?.status,
          statusCode: fetchError?.statusCode,
          code: fetchError?.code,
        };
        
        // Check if it's an APIError with response
        if (fetchError?.response) {
          errorDetails.responseStatus = fetchError.response.status;
          errorDetails.responseData = fetchError.response.data;
        }
        
        console.error('   Error:', JSON.stringify(errorDetails, null, 2));
        
        // If it's a 404 or invalid wallet, suggest creating new one
        if (fetchError?.status === 404 || fetchError?.statusCode === 404 || 
            (fetchError?.message && fetchError.message.includes('404'))) {
          console.log('\n💡 Wallet not found (404). This wallet ID might be invalid.');
          console.log('   Options:');
          console.log('   1. Remove CDP_WALLET_ID from .env.local to create a new wallet');
          console.log('   2. Or verify the wallet ID is correct in CDP portal');
          throw fetchError;
        }
        
        // For other errors, re-throw
        throw fetchError;
      }
    } else {
      console.log(`🆕 Creating new wallet on ${networkId}...`);
      
      let wallet;
      try {
        wallet = await Wallet.create({
          networkId,
        });
      } catch (createError) {
        console.error('\n❌ Failed to create wallet. Error details:');
        
        // Try to extract HTTP response details
        if (createError?.response) {
          console.error('   HTTP Status:', createError.response.status);
          console.error('   Status Text:', createError.response.statusText);
          console.error('   Response Data:', JSON.stringify(createError.response.data, null, 2));
        }
        
        // Check for common error codes
        if (createError?.httpCode === 401 || createError?.response?.status === 401) {
          console.error('\n💡 Authentication Failed (401):');
          console.error('   - Your API key credentials are invalid');
          console.error('   - Verify CDP_API_KEY_NAME matches your API key ID');
          console.error('   - Verify CDP_API_KEY_PRIVATE_KEY is correct');
          console.error('   - Check API key permissions in CDP portal');
        }
        
        if (createError?.httpCode === 403 || createError?.response?.status === 403) {
          console.error('\n💡 Permission Denied (403):');
          console.error('   - Your API key might not have Server Wallet permissions');
          console.error('   - Go to CDP portal and check API key permissions');
        }
        
        throw createError;
      }

      const walletId = wallet.getId();
      const address = await wallet.getDefaultAddress();

      console.log('\n✅ Wallet created successfully!');
      console.log(`\n📋 Add this to your .env.local:`);
      console.log(`CDP_WALLET_ID=${walletId}`);
      console.log(`\n📍 Wallet Address: ${address?.getId() || 'N/A'}`);
      console.log(`\n💰 Next steps:`);
      console.log(`   1. Fund this wallet with testnet USDC from Base Sepolia faucet`);
      console.log(`   2. Add CDP_WALLET_ID=${walletId} to .env.local`);
      console.log(`   3. Set CDP_RECIPIENT_ADDRESS to the signal provider address`);

      return walletId;
    }
  } catch (error) {
    // Extract error details
    const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error';
    const errorStatus = error?.status || error?.statusCode || error?.code;
    
    console.error('\n❌ Error:', errorMessage);
    if (errorStatus) {
      console.error(`   Status Code: ${errorStatus}`);
    }
    
    // Extract APIError response details if available
    if (error?.response) {
      console.error('\n📋 API Response Details:');
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
      if (error.response.data) {
        console.error(`   Response Data:`, JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Check for Coinbase SDK specific error properties
    if (error?.httpCode) {
      console.error(`\n📋 HTTP Code: ${error.httpCode}`);
    }
    if (error?.apiCode) {
      console.error(`   API Code: ${error.apiCode}`);
    }
    if (error?.apiMessage) {
      console.error(`   API Message: ${error.apiMessage}`);
    }
    if (error?.correlationId) {
      console.error(`   Correlation ID: ${error.correlationId}`);
    }
    
    // Try to access underlying axios error
    if (error?.config) {
      console.error('\n📋 Request Details:');
      console.error(`   URL: ${error.config.url}`);
      console.error(`   Method: ${error.config.method}`);
    }
    
    // Specific error handling
    if (errorStatus === 401 || errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      console.error('\n💡 Troubleshooting (401 Unauthorized):');
      console.error('   1. CDP_API_KEY_NAME should be just the API key ID (UUID), e.g., "3be6bdb4-687b-48dc-87fb-55d7569c39d5"');
      console.error('   2. Verify CDP_API_KEY_PRIVATE_KEY is correct');
      console.error('   3. Make sure your API key has Server Wallet permissions');
      console.error('   4. Check if API key is still active in CDP portal');
    }
    
    if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
      console.error('\n💡 Troubleshooting (404 Not Found):');
      console.error('   1. Wallet ID might be invalid or deleted');
      console.error('   2. Remove CDP_WALLET_ID from .env.local to create a new wallet');
      console.error('   3. Or verify wallet ID in CDP portal');
    }
    
    if (errorMessage.includes('EC PRIVATE KEY')) {
      console.error('\n💡 Your SECRET may need to be converted to EC private key format');
      console.error('   Download the API key JSON from CDP portal - it contains the private key');
    }
    
    // Log full error for debugging
    if (error && typeof error === 'object') {
      const errorKeys = Object.getOwnPropertyNames(error);
      const errorObj = {};
      errorKeys.forEach(key => {
        try {
          errorObj[key] = error[key];
        } catch (e) {
          errorObj[key] = '[Cannot serialize]';
        }
      });
      console.error('\n📋 Full error object:', JSON.stringify(errorObj, null, 2));
    }
    
    process.exit(1);
  }
}

getOrCreateWallet()
  .then((walletId) => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    const errorMessage = error?.message || error?.toString() || String(error) || 'Unknown error';
    console.error('Fatal error:', errorMessage);
    if (error && typeof error === 'object') {
      console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    }
    process.exit(1);
  });
