/**
 * x402 Payment Protocol - Simple Explanation
 *
 * Think of this like a vending machine for data:
 * 1. You ask for data (like a candy bar)
 * 2. Machine says "That'll be $0.10" (HTTP 402 error)
 * 3. You pay at the counter
 * 4. You come back with your receipt (payment proof)
 * 5. Machine gives you the data
 *
 * Why use this pattern?
 * - Agents only buy expensive signals when they really need them
 * - We track every dollar spent (audit trail)
 * - Prevents waste - L1 agent doesn't buy network signal if it can decide without it
 */

import crypto from 'crypto';
import { getDatabase, COLLECTIONS } from './mongodb';

// How much each signal costs
export const SIGNAL_PRICES = {
  velocity: 0.10,  // Cheaper - just counts transactions
  network: 0.25,   // More expensive - analyzes connections between users
} as const;

export type SignalType = keyof typeof SIGNAL_PRICES;

/**
 * Generate a unique payment ID
 * Format: pay_1704556800000_abc123xyz
 */
export function generatePaymentId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `pay_${timestamp}_${random}`;
}

/**
 * Generate a secure payment proof token
 * This is like a receipt - you show it to get your data
 * Uses crypto to make it impossible to fake
 */
export function generatePaymentProof(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a unique signal ID
 * Format: sig_velocity_1704556800000_xyz
 */
export function generateSignalId(signalType: SignalType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `sig_${signalType}_${timestamp}_${random}`;
}

/**
 * Create a mock velocity signal
 *
 * Velocity = how fast is this user transacting?
 * - If someone makes 20 transactions in 1 day but normally does 3, that's suspicious
 * - New accounts doing lots of transactions = red flag
 */
export function generateVelocitySignal(userId: string, transactionId: string) {
  // Randomize for demo - in real life this would query actual transaction history
  const last24hTxCount = Math.floor(Math.random() * 20) + 5; // 5-25 transactions
  const avgDailyTxCount = Math.floor(Math.random() * 8) + 3; // Normal is 3-11 per day

  // Velocity score: how much faster than normal?
  // 0 = normal, 1 = extremely high velocity
  const velocityScore = Math.min(last24hTxCount / (avgDailyTxCount * 2.5), 1.0);

  const accountAgeHours = Math.floor(Math.random() * 5000) + 100;

  return {
    signalType: 'velocity' as const,
    signalId: generateSignalId('velocity'),
    transactionId,
    userId,

    // The actual data we're buying
    data: {
      last24hTxCount,           // Transactions in last 24 hours
      last7dTxCount: last24hTxCount * 4,  // Transactions in last week
      avgDailyTxCount,          // User's normal daily transaction count
      velocityScore,            // 0-1 risk score
      accountAgeHours,          // How old is this account?
      firstTxDate: new Date(Date.now() - accountAgeHours * 60 * 60 * 1000).toISOString().split('T')[0],

      // Human-readable interpretation
      interpretation: velocityScore > 0.7
        ? `⚠️ ELEVATED - User is transacting ${(velocityScore / 0.7).toFixed(1)}x faster than normal`
        : velocityScore > 0.5
        ? `⚡ MODERATE - Slightly elevated transaction velocity`
        : `✅ NORMAL - Transaction velocity is within expected range`,

      // Risk flags
      flags: [
        ...(velocityScore > 0.8 ? ['HIGH_VELOCITY'] : []),
        ...(accountAgeHours < 168 ? ['NEW_ACCOUNT'] : []), // Less than 7 days old
        ...(last24hTxCount > 15 ? ['BURST_ACTIVITY'] : []),
      ],
    },

    purchasedAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
    cost: SIGNAL_PRICES.velocity,
  };
}

/**
 * Create a mock network signal
 *
 * Network = who is this user connected to?
 * - Shared IP addresses with known fraudsters = bad
 * - Using same device as fraudulent accounts = bad
 * - Being in a network of suspicious users = bad
 */
export function generateNetworkSignal(userId: string, transactionId: string) {
  // Randomize for demo - in real life this would analyze actual graph database
  const connectedUsers = Math.floor(Math.random() * 15) + 1;
  const sharedDevices = Math.floor(Math.random() * 6);
  const sharedIPs = Math.floor(Math.random() * 20) + 2;

  // How many connections are to known bad actors?
  const suspiciousConnections = Math.floor(Math.random() * 4);

  // Network risk score: 0 = isolated clean user, 1 = connected to fraud ring
  const networkRiskScore = Math.min(
    suspiciousConnections * 0.35 + Math.random() * 0.3,
    1.0
  );

  // Generate fake flagged connections if there are suspicious ones
  const flaggedConnections = suspiciousConnections > 0 ? Array.from({ length: suspiciousConnections }, (_, i) => ({
    userId: `user_fraud_${String(i + 1).padStart(3, '0')}`,
    relationship: ['shared_ip', 'shared_device', 'payment_link'][Math.floor(Math.random() * 3)],
    fraudHistory: true,
    riskLevel: ['HIGH', 'MEDIUM'][Math.floor(Math.random() * 2)] as 'HIGH' | 'MEDIUM',
    lastSeenDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })) : [];

  return {
    signalType: 'network' as const,
    signalId: generateSignalId('network'),
    transactionId,
    userId,

    // The actual data we're buying
    data: {
      connectedUsers,         // Total users in network
      sharedDevices,          // Devices used by multiple accounts
      sharedIPs,              // IP addresses shared with others
      suspiciousConnections,  // Connections to known fraudsters
      networkRiskScore,       // 0-1 risk score
      flaggedConnections,     // Details about bad connections

      // Graph metrics (how central is this user in fraud network?)
      graphMetrics: {
        clusteringCoefficient: Math.random() * 0.5,  // How tightly connected
        centralityScore: Math.random() * 0.3,        // How central in network
      },

      // Human-readable interpretation
      interpretation: networkRiskScore > 0.7
        ? `🚨 HIGH RISK - Connected to ${suspiciousConnections} known fraudulent accounts`
        : networkRiskScore > 0.4
        ? `⚠️ MODERATE RISK - Some suspicious network connections detected`
        : `✅ LOW RISK - Network connections appear normal`,

      // Risk flags
      flags: [
        ...(networkRiskScore > 0.7 ? ['FRAUD_NETWORK'] : []),
        ...(suspiciousConnections >= 2 ? ['MULTIPLE_BAD_ACTORS'] : []),
        ...(sharedDevices > 3 ? ['DEVICE_SHARING'] : []),
        ...(connectedUsers > 10 ? ['LARGE_NETWORK'] : []),
      ],
    },

    purchasedAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // Expires in 1 hour
    cost: SIGNAL_PRICES.network,
  };
}

/**
 * Verify a payment proof is valid
 *
 * Checks:
 * 1. Does this proof exist in our database?
 * 2. Was the payment actually completed?
 * 3. Is it for the right signal type?
 * 4. Has it expired? (proofs only last 1 hour)
 */
export async function verifyPaymentProof(
  paymentProof: string,
  signalType: SignalType
): Promise<{ valid: boolean; paymentId?: string; error?: string }> {
  try {
    const db = await getDatabase();

    // Look up the payment in our database
    const payment = await db.collection(COLLECTIONS.PAYMENTS).findOne({
      'x402Details.paymentProof': paymentProof,
      signalType,
    });

    if (!payment) {
      return { valid: false, error: 'Payment proof not found' };
    }

    if (payment.status !== 'COMPLETED') {
      return { valid: false, error: 'Payment not completed' };
    }

    // Check if expired (1 hour expiry)
    // Handle both Date objects and ISO strings
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const createdAt = payment.createdAt instanceof Date
      ? payment.createdAt
      : new Date(payment.createdAt);

    if (createdAt < oneHourAgo) {
      return { valid: false, error: 'Payment proof expired (valid for 1 hour only)' };
    }

    return { valid: true, paymentId: payment.paymentId };
  } catch (error) {
    console.error('Payment verification error:', error);
    return { valid: false, error: 'Payment verification failed' };
  }
}

/**
 * Check if a signal has already been purchased for this transaction
 * This prevents double-charging - if L1 bought velocity, L2 can read it for free
 */
export async function getExistingSignal(
  transactionId: string,
  signalType: SignalType
) {
  const db = await getDatabase();

  const signal = await db.collection(COLLECTIONS.SIGNALS).findOne({
    transactionId,
    signalType,
  });

  return signal;
}

/**
 * Save a purchased signal to the database
 * Returns true on success, false on failure (logs error)
 */
export async function saveSignal(signalData: any): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.collection(COLLECTIONS.SIGNALS).insertOne(signalData);
    return true;
  } catch (error) {
    console.error('Failed to save signal:', error);
    return false;
  }
}

/**
 * Save a payment record to the database
 * Returns true on success, false on failure (logs error)
 */
export async function savePayment(paymentData: any): Promise<boolean> {
  try {
    const db = await getDatabase();
    await db.collection(COLLECTIONS.PAYMENTS).insertOne(paymentData);
    return true;
  } catch (error) {
    console.error('Failed to save payment:', error);
    return false;
  }
}

/**
 * Update payment record with retry request and success response
 * This completes the x402 audit trail when signal is successfully retrieved
 */
export async function updatePaymentWithRetry(
  paymentProof: string,
  signalType: SignalType,
  requestUrl: string,
  requestHeaders: Record<string, string>
): Promise<boolean> {
  try {
    const db = await getDatabase();
    const now = new Date();

    // Find the payment record
    const payment = await db.collection(COLLECTIONS.PAYMENTS).findOne({
      'x402Details.paymentProof': paymentProof,
      signalType,
    });

    if (!payment) {
      console.warn(`Payment record not found for proof: ${paymentProof}`);
      return false;
    }

    // Calculate duration from payment creation to signal retrieval
    const createdAt = payment.createdAt instanceof Date
      ? payment.createdAt
      : new Date(payment.createdAt);
    const duration_ms = now.getTime() - createdAt.getTime();

    // Update with retry request and success response
    await db.collection(COLLECTIONS.PAYMENTS).updateOne(
      { paymentId: payment.paymentId },
      {
        $set: {
          'x402Details.retryRequest': {
            method: 'GET',
            endpoint: requestUrl,
            headers: requestHeaders,
            timestamp: now,
          },
          'x402Details.http200Response': {
            status: 200,
            dataReceived: true,
            timestamp: now,
          },
          duration_ms,
          updatedAt: now,
        },
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to update payment with retry:', error);
    return false;
  }
}
