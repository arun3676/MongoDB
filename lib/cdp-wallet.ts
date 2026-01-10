/**
 * Coinbase Developer Platform (CDP) Wallet Integration
 *
 * Handles real on-chain payments via CDP Server Wallet on Base Sepolia testnet.
 * Used by agents to pay for fraud detection signals.
 */

import { Coinbase, Wallet } from '@coinbase/coinbase-sdk';

// Singleton instances
let cdpClient: Coinbase | null = null;
let serverWallet: Wallet | null = null;

/**
 * Get or initialize CDP client
 */
export async function getCDPClient(): Promise<Coinbase> {
  if (cdpClient) return cdpClient;

  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const privateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !privateKey) {
    throw new Error('Missing CDP credentials: CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY required');
  }

  // CDP SDK accepts just the API key ID (UUID), not the full organization path
  // Format: Just the UUID like "3be6bdb4-687b-48dc-87fb-55d7569c39d5"
  cdpClient = new Coinbase({
    apiKeyName,
    privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
  });

  console.log('✅ [CDP] Client initialized');
  return cdpClient;
}

/**
 * Get or create server wallet
 * 
 * CRITICAL: The wallet must be associated with the CDP client that has the private key.
 * Without this association, transfers will fail with "Cannot transfer from address without private key loaded"
 */
export async function getServerWallet(): Promise<Wallet> {
  if (serverWallet) return serverWallet;

  // Initialize CDP client first (CRITICAL: wallet needs client context for private key)
  const client = await getCDPClient();

  const walletId = process.env.CDP_WALLET_ID;

  if (walletId) {
    // Load existing wallet
    // NOTE: Wallet.fetch() is a static method, but the wallet needs client context for signing
    // The Coinbase SDK should automatically use the initialized client, but we need to ensure
    // the wallet is properly associated with the client's private key
    try {
      // Fetch wallet - SDK should use the client context from getCDPClient()
      serverWallet = await Wallet.fetch(walletId);
      
      // Verify wallet can access client context by checking if it has signing capability
      // If the wallet doesn't have the client context, we'll get an error when trying to transfer
      console.log(`✅ [CDP] Loaded wallet: ${walletId}`);
      
      // Test if wallet has access to signing (by getting default address which requires auth)
      try {
        await serverWallet.getDefaultAddress();
        console.log(`✅ [CDP] Wallet has signing capability`);
      } catch (authError) {
        console.warn(`⚠️  [CDP] Wallet may not have proper authentication context`);
        console.warn(`   Error: ${authError instanceof Error ? authError.message : 'Unknown'}`);
        // Continue anyway - error will surface during transfer if there's a real issue
      }
    } catch (error) {
      console.error(`[CDP] Failed to fetch wallet ${walletId}:`, error);
      throw new Error(
        `Failed to load wallet ${walletId}. ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Verify CDP_WALLET_ID is correct and your API key has access to this wallet.`
      );
    }
  } else {
    // Create new wallet on first run
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    try {
      serverWallet = await Wallet.create({
        networkId,
      });
      console.log(`⚠️  [CDP] Created new wallet: ${serverWallet.getId()}`);
      console.log(`   Add to .env.local: CDP_WALLET_ID=${serverWallet.getId()}`);
    } catch (error) {
      console.error(`[CDP] Failed to create wallet:`, error);
      throw new Error(
        `Failed to create wallet. ` +
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Verify your CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY are correct and have Server Wallet permissions.`
      );
    }
  }

  return serverWallet;
}

/**
 * Pay for a signal via CDP wallet (REAL on-chain transaction)
 *
 * @param signalType - Type of signal (velocity, network)
 * @param amount - Amount in USDC
 * @param transactionId - Transaction ID for tracking
 * @returns Payment result with transaction hash
 */
export async function payForSignal(
  signalType: string,
  amount: number,
  transactionId: string
): Promise<{
  success: boolean;
  txHash?: string;
  walletId?: string;
  networkId?: string;
  error?: string;
}> {
  try {
    // Ensure client is initialized (needed for wallet signing)
    const client = await getCDPClient();
    const wallet = await getServerWallet();
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    const recipientAddress = process.env.CDP_RECIPIENT_ADDRESS;

    if (!recipientAddress) {
      throw new Error('Missing CDP_RECIPIENT_ADDRESS in environment variables');
    }

    console.log(`[CDP] Initiating payment: ${amount} USDC for ${signalType} signal`);
    console.log(`[CDP] Transaction ID: ${transactionId}`);
    console.log(`[CDP] Wallet ID: ${wallet.getId()}`);
    console.log(`[CDP] Recipient: ${recipientAddress}`);

    // Verify wallet has default address (tests signing capability)
    try {
      const defaultAddress = await wallet.getDefaultAddress();
      console.log(`[CDP] Wallet address: ${defaultAddress?.getId() || 'N/A'}`);
    } catch (addrError) {
      console.warn(`[CDP] Warning: Could not get wallet address - ${addrError instanceof Error ? addrError.message : 'Unknown error'}`);
      // Continue anyway - might still work for transfer
    }

    // Transfer USDC on Base Sepolia
    const transfer = await wallet.createTransfer({
      amount,
      assetId: 'usdc', // Use USDC stablecoin
      destination: recipientAddress,
    });

    console.log(`[CDP] Transfer created, waiting for confirmation...`);

    // Wait for blockchain confirmation
    await transfer.wait();

    const txHash = transfer.getTransactionHash();

    console.log(`✅ [CDP] Payment confirmed`);
    console.log(`   TX Hash: ${txHash}`);
    console.log(`   Explorer: https://sepolia.basescan.org/tx/${txHash}`);

    return {
      success: true,
      txHash,
      walletId: wallet.getId(),
      networkId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown CDP error';
    console.error('[CDP] Payment failed:', errorMessage);
    
    // Provide helpful error context
    if (errorMessage.includes('private key') || errorMessage.includes('without private key')) {
      console.error('\n💡 TROUBLESHOOTING: "Cannot transfer from address without private key loaded"');
      console.error('   This usually means:');
      console.error('   1. The wallet was not created with your API key');
      console.error('   2. Your API key does not have Server Wallet permissions');
      console.error('   3. The wallet ID is incorrect or belongs to a different organization');
      console.error('\n   Solutions:');
      console.error('   - Remove CDP_WALLET_ID from .env.local and let the system create a new Server Wallet');
      console.error('   - Or verify the wallet was created with your current API key');
      console.error('   - Check API key permissions in CDP portal (needs "Server Wallet" permission)');
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Get wallet balance (for debugging/monitoring)
 */
export async function getWalletBalance(): Promise<{
  usdc: number;
  eth: number;
}> {
  try {
    const wallet = await getServerWallet();

    // Get balances
    const balances = await wallet.listBalances();

    // BalanceMap has a get() method
    const usdcBalance = balances.get('usdc') || 0;
    const ethBalance = balances.get('eth') || 0;

    return {
      usdc: parseFloat(usdcBalance.toString()),
      eth: parseFloat(ethBalance.toString()),
    };
  } catch (error) {
    console.error('[CDP] Failed to get wallet balance:', error);
    return { usdc: 0, eth: 0 };
  }
}

/**
 * Get wallet address (for funding)
 */
export async function getWalletAddress(): Promise<string | null> {
  try {
    const wallet = await getServerWallet();
    const defaultAddress = await wallet.getDefaultAddress();
    return defaultAddress?.getId() || null;
  } catch (error) {
    console.error('[CDP] Failed to get wallet address:', error);
    return null;
  }
}
