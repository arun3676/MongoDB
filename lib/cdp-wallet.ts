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
 */
export async function getServerWallet(): Promise<Wallet> {
  if (serverWallet) return serverWallet;

  // Initialize CDP client first
  await getCDPClient();

  const walletId = process.env.CDP_WALLET_ID;

  if (walletId) {
    // Load existing wallet
    serverWallet = await Wallet.fetch(walletId);
    console.log(`✅ [CDP] Loaded wallet: ${walletId}`);
  } else {
    // Create new wallet on first run
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    serverWallet = await Wallet.create({
      networkId,
    });

    console.log(`⚠️  [CDP] Created new wallet: ${serverWallet.getId()}`);
    console.log(`   Add to .env.local: CDP_WALLET_ID=${serverWallet.getId()}`);
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
    const wallet = await getServerWallet();
    const networkId = process.env.CDP_NETWORK_ID || 'base-sepolia';
    const recipientAddress = process.env.CDP_RECIPIENT_ADDRESS;

    if (!recipientAddress) {
      throw new Error('Missing CDP_RECIPIENT_ADDRESS in environment variables');
    }

    console.log(`[CDP] Initiating payment: ${amount} USDC for ${signalType} signal`);
    console.log(`[CDP] Transaction ID: ${transactionId}`);

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
    console.error('[CDP] Payment failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown CDP error',
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
