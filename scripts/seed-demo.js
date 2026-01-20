/* eslint-disable no-console */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const DB_NAME = process.env.MONGODB_DB_NAME;
const MONGO_URI = process.env.MONGODB_URI;

if (!DB_NAME || !MONGO_URI) {
  throw new Error('Missing MONGODB_URI or MONGODB_DB_NAME in .env.local');
}

const now = new Date();
const iso = (date) => new Date(date).toISOString();

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function velocitySignalData({ velocityScore, last24h, avgDaily, flags, interpretation }) {
  return {
    last24hTxCount: last24h,
    last7dTxCount: last24h * 3,
    avgDailyTxCount: avgDaily,
    velocityScore,
    accountAgeHours: 1400,
    firstTxDate: '2025-11-15',
    interpretation,
    flags,
  };
}

function networkSignalData({ riskScore, suspiciousConnections, flags, interpretation }) {
  return {
    connectedUsers: 9,
    sharedDevices: 2,
    sharedIPs: 6,
    suspiciousConnections,
    networkRiskScore: riskScore,
    flaggedConnections:
      suspiciousConnections > 0
        ? [
            {
              userId: 'user_fraud_001',
              relationship: 'shared_ip',
              fraudHistory: true,
              riskLevel: 'HIGH',
              lastSeenDate: '2025-12-12',
            },
          ]
        : [],
    interpretation,
    flags,
  };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const collectionsToClean = [
    'transactions',
    'agent_steps',
    'signals',
    'payments',
    'decisions',
    'budget',
    'verification_sessions',
    'verifications',
  ];

  for (const name of collectionsToClean) {
    await db.collection(name).deleteMany({ transactionId: { $regex: '^TX-DEMO-' } });
  }

  const cases = [];

  // Case 1: Low-risk approved (COMPLETED)
  const txApproved = makeId('TX-DEMO-APPROVE');
  cases.push(txApproved);
  await db.collection('transactions').insertOne({
    transactionId: txApproved,
    amount: 120,
    currency: 'USD',
    userId: 'user_approved_001',
    merchantId: 'merchant_grocery_01',
    metadata: { deviceId: 'dev_01', location: 'NYC' },
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    currentAgent: 'Buyer/Decision Agent',
    agentHistory: ['Suspicion Agent', 'Policy Agent', 'Buyer/Decision Agent'],
    finalDecision: 'APPROVE',
    confidence: 0.92,
    totalCost: 0,
  });

  await db.collection('budget').insertOne({
    budgetId: makeId('budget'),
    transactionId: txApproved,
    startingBudget: 1.0,
    spentSoFar: 0,
    remainingBudget: 1.0,
    spendByTool: {},
    voiDecisions: [],
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('agent_steps').insertMany([
    {
      transactionId: txApproved,
      stepNumber: 1,
      agentName: 'Suspicion Agent',
      action: 'SUSPICION_ANALYSIS',
      timestamp: now,
      output: { suspicionScore: 0.12, riskLevel: 'LOW' },
    },
    {
      transactionId: txApproved,
      stepNumber: 2,
      agentName: 'Policy Agent',
      action: 'POLICY_ENFORCEMENT',
      timestamp: now,
      output: { decision: 'APPROVE', nextAgent: 'Buyer/Decision Agent' },
    },
    {
      transactionId: txApproved,
      stepNumber: 3,
      agentName: 'Buyer/Decision Agent',
      action: 'FINAL_DECISION',
      timestamp: now,
      output: { decision: 'APPROVE', confidence: 0.92 },
    },
  ]);

  await db.collection('decisions').insertMany([
    {
      decisionId: makeId('dec_policy'),
      transactionId: txApproved,
      agentName: 'Policy Agent',
      decision: 'APPROVE',
      confidence: 1.0,
      reasoning: 'Low suspicion score; no additional signals needed.',
      riskFactors: [],
      signalsUsed: [],
      timestamp: now,
      isFinal: false,
    },
    {
      decisionId: makeId('dec_buyer'),
      transactionId: txApproved,
      agentName: 'Buyer/Decision Agent',
      decision: 'APPROVE',
      confidence: 0.92,
      reasoning: 'Low amount, consistent history, no risk flags.',
      riskFactors: [],
      signalsUsed: [],
      signalCost: 0,
      timestamp: now,
      isFinal: true,
    },
  ]);

  // Case 2: High-risk denied (COMPLETED)
  const txDenied = makeId('TX-DEMO-DENY');
  cases.push(txDenied);
  await db.collection('transactions').insertOne({
    transactionId: txDenied,
    amount: 6800,
    currency: 'USD',
    userId: 'user_highrisk_002',
    merchantId: 'merchant_electronics_99',
    metadata: { deviceId: 'dev_98', location: 'Unknown', newAccount: true },
    status: 'COMPLETED',
    createdAt: now,
    updatedAt: now,
    completedAt: now,
    currentAgent: 'Buyer/Decision Agent',
    agentHistory: ['Suspicion Agent', 'Policy Agent', 'VOI/Budget Agent', 'Buyer/Decision Agent'],
    finalDecision: 'DENY',
    confidence: 0.9,
    totalCost: 0.35,
  });

  await db.collection('budget').insertOne({
    budgetId: makeId('budget'),
    transactionId: txDenied,
    startingBudget: 1.0,
    spentSoFar: 0.35,
    remainingBudget: 0.65,
    spendByTool: { velocity: 0.1, network: 0.25 },
    voiDecisions: [],
    createdAt: now,
    updatedAt: now,
  });

  await db.collection('signals').insertMany([
    {
      signalId: makeId('sig_velocity'),
      signalType: 'velocity',
      transactionId: txDenied,
      userId: 'user_highrisk_002',
      data: velocitySignalData({
        velocityScore: 0.88,
        last24h: 18,
        avgDaily: 4,
        flags: ['HIGH_VELOCITY', 'NEW_ACCOUNT'],
        interpretation: 'ELEVATED - 1.3x normal velocity',
      }),
      cost: 0.1,
      purchasedAt: now,
      purchasedBy: 'Buyer/Decision Agent',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
    {
      signalId: makeId('sig_network'),
      signalType: 'network',
      transactionId: txDenied,
      userId: 'user_highrisk_002',
      data: networkSignalData({
        riskScore: 0.78,
        suspiciousConnections: 2,
        flags: ['FRAUD_RING_RISK'],
        interpretation: 'HIGH RISK - Connected to 2 known fraudulent accounts',
      }),
      cost: 0.25,
      purchasedAt: now,
      purchasedBy: 'Buyer/Decision Agent',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  ]);

  await db.collection('payments').insertMany([
    {
      paymentId: makeId('pay_velocity'),
      transactionId: txDenied,
      amount: 0.1,
      currency: 'USD',
      signalType: 'velocity',
      status: 'COMPLETED',
      provider: 'mock-payment-provider',
      agentName: 'Buyer/Decision Agent',
      createdAt: now,
      completedAt: now,
    },
    {
      paymentId: makeId('pay_network'),
      transactionId: txDenied,
      amount: 0.25,
      currency: 'USD',
      signalType: 'network',
      status: 'COMPLETED',
      provider: 'mock-payment-provider',
      agentName: 'Buyer/Decision Agent',
      createdAt: now,
      completedAt: now,
    },
  ]);

  await db.collection('agent_steps').insertMany([
    {
      transactionId: txDenied,
      stepNumber: 1,
      agentName: 'Suspicion Agent',
      action: 'SUSPICION_ANALYSIS',
      timestamp: now,
      output: { suspicionScore: 0.82, riskLevel: 'HIGH' },
    },
    {
      transactionId: txDenied,
      stepNumber: 2,
      agentName: 'Policy Agent',
      action: 'POLICY_ENFORCEMENT',
      timestamp: now,
      output: { decision: 'ESCALATE', nextAgent: 'VOI/Budget Agent' },
    },
    {
      transactionId: txDenied,
      stepNumber: 3,
      agentName: 'VOI/Budget Agent',
      action: 'VOI_ANALYSIS',
      timestamp: now,
      output: { purchaseList: ['velocity', 'network'] },
    },
    {
      transactionId: txDenied,
      stepNumber: 4,
      agentName: 'Buyer/Decision Agent',
      action: 'FINAL_DECISION',
      timestamp: now,
      output: { decision: 'DENY', confidence: 0.9 },
    },
  ]);

  await db.collection('decisions').insertMany([
    {
      decisionId: makeId('dec_policy'),
      transactionId: txDenied,
      agentName: 'Policy Agent',
      decision: 'ESCALATE',
      confidence: 1.0,
      reasoning: 'High suspicion score; VOI analysis required.',
      riskFactors: ['HIGH_SUSPICION', 'HIGH_AMOUNT'],
      signalsUsed: [],
      timestamp: now,
      isFinal: false,
    },
    {
      decisionId: makeId('dec_buyer'),
      transactionId: txDenied,
      agentName: 'Buyer/Decision Agent',
      decision: 'DENY',
      confidence: 0.9,
      reasoning: 'Velocity and network signals indicate strong fraud risk.',
      riskFactors: ['HIGH_VELOCITY', 'FRAUD_RING_RISK'],
      signalsUsed: ['velocity', 'network'],
      signalCost: 0.35,
      timestamp: now,
      isFinal: true,
    },
  ]);

  // Case 3: Medium-risk pending verification (PROCESSING)
  const txVerify = makeId('TX-DEMO-VERIFY');
  cases.push(txVerify);
  await db.collection('transactions').insertOne({
    transactionId: txVerify,
    amount: 500,
    currency: 'USD',
    userId: 'user_verify_003',
    merchantId: 'merchant_apparel_07',
    metadata: { phone: '+15551234567', location: 'CA' },
    status: 'PROCESSING',
    createdAt: now,
    updatedAt: now,
    currentAgent: 'Customer Notification Agent',
    agentHistory: ['Suspicion Agent', 'Policy Agent', 'Buyer/Decision Agent', 'Customer Notification Agent'],
    finalDecision: null,
    confidence: null,
    totalCost: 0,
    verificationRequired: true,
    verificationStatus: 'PENDING',
  });

  const verifySessionId = makeId('v');
  await db.collection('verification_sessions').insertOne({
    sessionId: verifySessionId,
    transactionId: txVerify,
    userId: 'user_verify_003',
    sessionTokenHash: 'demo_token_hash',
    status: 'PENDING',
    createdAt: now,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    identityVerified: false,
    metadata: {
      notificationSent: true,
      notificationChannel: 'sms',
      notificationTarget: {
        phone: '+15551234567',
        email: 'user@example.com',
      },
    },
  });

  await db.collection('verifications').insertMany([
    {
      verificationId: makeId('ver'),
      transactionId: txVerify,
      sessionId: verifySessionId,
      eventType: 'SESSION_CREATED',
      channel: 'sms',
      payload: { note: 'Demo session created' },
      createdAt: now,
    },
    {
      verificationId: makeId('ver'),
      transactionId: txVerify,
      sessionId: verifySessionId,
      eventType: 'NOTIFICATION_SENT',
      channel: 'sms',
      payload: { to: '+15551234567' },
      createdAt: now,
    },
  ]);

  await db.collection('agent_steps').insertMany([
    {
      transactionId: txVerify,
      stepNumber: 1,
      agentName: 'Suspicion Agent',
      action: 'SUSPICION_ANALYSIS',
      timestamp: now,
      output: { suspicionScore: 0.55, riskLevel: 'MEDIUM' },
    },
    {
      transactionId: txVerify,
      stepNumber: 2,
      agentName: 'Policy Agent',
      action: 'POLICY_ENFORCEMENT',
      timestamp: now,
      output: { decision: 'ESCALATE', nextAgent: 'Buyer/Decision Agent' },
    },
    {
      transactionId: txVerify,
      stepNumber: 3,
      agentName: 'Buyer/Decision Agent',
      action: 'VERIFICATION_REQUESTED',
      timestamp: now,
      output: { decision: 'ESCALATE', reason: 'Medium risk - verify customer' },
    },
  ]);

  await db.collection('decisions').insertOne({
    decisionId: makeId('dec_buyer'),
    transactionId: txVerify,
    agentName: 'Buyer/Decision Agent',
    decision: 'ESCALATE',
    confidence: 0.68,
    reasoning: 'Medium risk; customer verification required.',
    riskFactors: ['MEDIUM_SUSPICION'],
    signalsUsed: [],
    signalCost: 0,
    timestamp: now,
    isFinal: false,
    action: 'REQUEST_CUSTOMER_VERIFICATION',
  });

  console.log('Demo cases created:');
  cases.forEach((id) => console.log(`- ${id}`));

  await client.close();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
