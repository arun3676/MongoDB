#!/usr/bin/env node

/**
 * Synth Fraud Data
 * Seeds MongoDB with realistic demo fraud cases
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'fraud_escalation';

// Parse command-line flags
const args = process.argv.slice(2);
const clearData = args.includes('--clear');
const countMatch = args.find(arg => arg.startsWith('--count='));
const caseCount = countMatch ? parseInt(countMatch.split('=')[1]) : 3;

function generateTimestamp(minutesAgo) {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
}

const demoCases = [
  {
    // Case 1: Clean Approval
    transaction: {
      transactionId: `TX-DEMO-${Date.now()}-001`,
      amount: 45.00,
      currency: 'USD',
      userId: 'user_demo_clean',
      merchantId: 'merchant_coffee_123',
      merchantName: 'Coffee Shop',
      paymentMethod: 'credit_card',
      cardLast4: '4242',
      ipAddress: '192.168.1.100',
      deviceId: 'device_clean_abc',
      location: { country: 'US', city: 'San Francisco' },
      status: 'COMPLETED',
      currentAgent: null,
      riskScore: 0.15,
      finalDecision: 'APPROVE',
      finalReasoning: 'Low transaction amount, normal velocity, clean network profile. Approved.',
      totalSignalCost: 0.00,
      createdAt: generateTimestamp(30),
      updatedAt: generateTimestamp(29),
      completedAt: generateTimestamp(29)
    },
    steps: [
      { stepNumber: 1, agent: 'Orchestrator', action: 'CASE_CREATED', description: 'Transaction received and case initialized', minutesAgo: 30 },
      { stepNumber: 2, agent: 'L1_Analyst', action: 'ANALYZING', description: 'Performing basic fraud checks', minutesAgo: 30 },
      { stepNumber: 3, agent: 'L1_Analyst', action: 'APPROVED', description: 'Transaction approved', minutesAgo: 29 }
    ],
    signals: [],
    payments: [],
    decisions: [
      {
        decisionId: `dec_L1_${Date.now()}_001`,
        agent: 'L1_Analyst',
        decisionType: 'APPROVE',
        confidence: 0.92,
        reasoning: 'Low transaction amount, normal velocity, clean network profile. Approved.',
        riskScore: 0.15,
        action: 'APPROVE_TRANSACTION',
        nextAgent: null,
        minutesAgo: 29
      }
    ]
  },
  {
    // Case 2: Suspicious Block
    transaction: {
      transactionId: `TX-DEMO-${Date.now()}-002`,
      amount: 1250.00,
      currency: 'USD',
      userId: 'user_demo_suspicious',
      merchantId: 'merchant_electronics_456',
      merchantName: 'Electronics Warehouse',
      paymentMethod: 'credit_card',
      cardLast4: '5555',
      ipAddress: '192.168.1.200',
      deviceId: 'device_suspicious_xyz',
      location: { country: 'US', city: 'New York' },
      status: 'COMPLETED',
      currentAgent: null,
      riskScore: 0.92,
      finalDecision: 'DENY',
      finalReasoning: 'High velocity (15 tx/24h), network connections to known fraudulent accounts. Transaction DENIED.',
      totalSignalCost: 0.35,
      createdAt: generateTimestamp(20),
      updatedAt: generateTimestamp(18),
      completedAt: generateTimestamp(18)
    },
    steps: [
      { stepNumber: 1, agent: 'Orchestrator', action: 'CASE_CREATED', description: 'Transaction received and case initialized', minutesAgo: 20 },
      { stepNumber: 2, agent: 'L1_Analyst', action: 'ANALYZING', description: 'Performing basic fraud checks', minutesAgo: 20 },
      { stepNumber: 3, agent: 'L1_Analyst', action: 'SIGNAL_PURCHASED', description: 'Purchased velocity signal via x402 ($0.10)', minutesAgo: 20, metadata: { cost: 0.10 } },
      { stepNumber: 4, agent: 'L1_Analyst', action: 'ESCALATED', description: 'Case escalated to L2 for deeper analysis', minutesAgo: 19 },
      { stepNumber: 5, agent: 'L2_Analyst', action: 'ANALYZING', description: 'Deep analysis with velocity data', minutesAgo: 19 },
      { stepNumber: 6, agent: 'L2_Analyst', action: 'SIGNAL_PURCHASED', description: 'Purchased network signal via x402 ($0.25)', minutesAgo: 19, metadata: { cost: 0.25 } },
      { stepNumber: 7, agent: 'L2_Analyst', action: 'ESCALATED', description: 'Case escalated to Final Reviewer', minutesAgo: 19 },
      { stepNumber: 8, agent: 'Final_Reviewer', action: 'DECISION_MADE', description: 'Final decision: DENY', minutesAgo: 18 }
    ],
    signals: [
      {
        signalId: `sig_velocity_demo_${Date.now()}_001`,
        signalType: 'velocity',
        cost: 0.10,
        purchasedBy: 'L1_Analyst',
        data: { velocityScore: 0.87, last24hTxCount: 15, interpretation: 'ELEVATED - 2.5x normal velocity' },
        minutesAgo: 20
      },
      {
        signalId: `sig_network_demo_${Date.now()}_001`,
        signalType: 'network',
        cost: 0.25,
        purchasedBy: 'L2_Analyst',
        data: { networkRiskScore: 0.78, suspiciousConnections: 2, interpretation: 'HIGH RISK - Connected to known fraud accounts' },
        minutesAgo: 19
      }
    ],
    payments: [
      { paymentId: `pay_demo_${Date.now()}_001`, signalType: 'velocity', amount: 0.10, minutesAgo: 20 },
      { paymentId: `pay_demo_${Date.now()}_002`, signalType: 'network', amount: 0.25, minutesAgo: 19 }
    ],
    decisions: [
      { decisionId: `dec_L1_${Date.now()}_002`, agent: 'L1_Analyst', decisionType: 'ESCALATE', confidence: 0.75, reasoning: 'High velocity detected', riskScore: 0.78, action: 'ESCALATE_TO_L2', nextAgent: 'L2_Analyst', minutesAgo: 19 },
      { decisionId: `dec_L2_${Date.now()}_002`, agent: 'L2_Analyst', decisionType: 'ESCALATE', confidence: 0.88, reasoning: 'Network risk confirmed', riskScore: 0.85, action: 'ESCALATE_TO_FINAL', nextAgent: 'Final_Reviewer', minutesAgo: 19 },
      { decisionId: `dec_FINAL_${Date.now()}_002`, agent: 'Final_Reviewer', decisionType: 'DENY', confidence: 0.95, reasoning: 'High velocity and bad network. DENY.', riskScore: 0.92, action: 'DENY_TRANSACTION', nextAgent: null, isFinal: true, minutesAgo: 18 }
    ]
  },
  {
    // Case 3: False Positive (Approved after escalation)
    transaction: {
      transactionId: `TX-DEMO-${Date.now()}-003`,
      amount: 750.00,
      currency: 'USD',
      userId: 'user_demo_edge',
      merchantId: 'merchant_dept_store_789',
      merchantName: 'Department Store',
      paymentMethod: 'credit_card',
      cardLast4: '4111',
      ipAddress: '192.168.1.150',
      deviceId: 'device_edge_def',
      location: { country: 'US', city: 'Chicago' },
      status: 'COMPLETED',
      currentAgent: null,
      riskScore: 0.48,
      finalDecision: 'APPROVE',
      finalReasoning: 'Initially flagged for medium velocity, but network analysis clean. Approved.',
      totalSignalCost: 0.10,
      createdAt: generateTimestamp(10),
      updatedAt: generateTimestamp(8),
      completedAt: generateTimestamp(8)
    },
    steps: [
      { stepNumber: 1, agent: 'Orchestrator', action: 'CASE_CREATED', description: 'Transaction received and case initialized', minutesAgo: 10 },
      { stepNumber: 2, agent: 'L1_Analyst', action: 'ANALYZING', description: 'Performing basic fraud checks', minutesAgo: 10 },
      { stepNumber: 3, agent: 'L1_Analyst', action: 'SIGNAL_PURCHASED', description: 'Purchased velocity signal via x402 ($0.10)', minutesAgo: 10, metadata: { cost: 0.10 } },
      { stepNumber: 4, agent: 'L1_Analyst', action: 'ESCALATED', description: 'Case escalated to L2 for deeper analysis', minutesAgo: 9 },
      { stepNumber: 5, agent: 'L2_Analyst', action: 'ANALYZING', description: 'Deep analysis with velocity data', minutesAgo: 9 },
      { stepNumber: 6, agent: 'L2_Analyst', action: 'APPROVED', description: 'Transaction approved', minutesAgo: 8 }
    ],
    signals: [
      {
        signalId: `sig_velocity_demo_${Date.now()}_002`,
        signalType: 'velocity',
        cost: 0.10,
        purchasedBy: 'L1_Analyst',
        data: { velocityScore: 0.62, last24hTxCount: 9, interpretation: 'MODERATE - Slightly elevated activity' },
        minutesAgo: 10
      }
    ],
    payments: [
      { paymentId: `pay_demo_${Date.now()}_003`, signalType: 'velocity', amount: 0.10, minutesAgo: 10 }
    ],
    decisions: [
      { decisionId: `dec_L1_${Date.now()}_003`, agent: 'L1_Analyst', decisionType: 'ESCALATE', confidence: 0.68, reasoning: 'Medium velocity, needs review', riskScore: 0.58, action: 'ESCALATE_TO_L2', nextAgent: 'L2_Analyst', minutesAgo: 9 },
      { decisionId: `dec_L2_${Date.now()}_003`, agent: 'L2_Analyst', decisionType: 'APPROVE', confidence: 0.82, reasoning: 'Velocity acceptable, network clean. APPROVE.', riskScore: 0.48, action: 'APPROVE_TRANSACTION', nextAgent: null, minutesAgo: 8 }
    ]
  }
];

async function seedDemoData() {
  console.log('🌱 Seeding Demo Fraud Data');
  console.log('━'.repeat(40));
  console.log('');

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env.local');
    process.exit(2);
  }

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();

    const db = client.db(MONGODB_DB_NAME);
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`   Database: ${MONGODB_DB_NAME}`);
    console.log('');

    // Clear existing demo data if --clear flag
    if (clearData) {
      console.log('🗑️  Clearing existing demo data...');
      const txResult = await db.collection('transactions').deleteMany({ transactionId: /^TX-DEMO-/ });
      const stepResult = await db.collection('agent_steps').deleteMany({ transactionId: /^TX-DEMO-/ });
      const sigResult = await db.collection('signals').deleteMany({ transactionId: /^TX-DEMO-/ });
      const payResult = await db.collection('payments').deleteMany({ transactionId: /^TX-DEMO-/ });
      const decResult = await db.collection('decisions').deleteMany({ transactionId: /^TX-DEMO-/ });
      console.log(`   Deleted ${txResult.deletedCount} transactions`);
      console.log(`   Deleted ${stepResult.deletedCount} agent steps`);
      console.log(`   Deleted ${sigResult.deletedCount} signals`);
      console.log(`   Deleted ${payResult.deletedCount} payments`);
      console.log(`   Deleted ${decResult.deletedCount} decisions`);
      console.log('');
    }

    console.log('📝 Creating demo cases...');
    console.log('');

    const casesToSeed = demoCases.slice(0, caseCount);
    let totalSteps = 0, totalSignals = 0, totalPayments = 0, totalDecisions = 0, totalCost = 0;

    for (let i = 0; i < casesToSeed.length; i++) {
      const demoCase = casesToSeed[i];
      const tx = demoCase.transaction;

      console.log(`Case ${i + 1}: ${tx.finalDecision === 'APPROVE' ? 'Approved' : 'Denied'}`);
      console.log(`   Transaction ID: ${tx.transactionId}`);
      console.log(`   Amount: $${tx.amount.toFixed(2)}`);
      console.log(`   User: ${tx.userId}`);
      console.log(`   Status: ${tx.finalDecision} (${demoCase.steps[demoCase.steps.length - 1].agent})`);
      console.log(`   Risk Score: ${tx.riskScore.toFixed(2)}`);
      if (demoCase.signals.length > 0) {
        console.log(`   Signals: ${demoCase.signals.map(s => `${s.signalType} ($${s.cost.toFixed(2)})`).join(', ')}`);
      }
      console.log('');

      // Insert transaction
      await db.collection('transactions').insertOne(tx);

      // Insert agent steps
      for (const step of demoCase.steps) {
        await db.collection('agent_steps').insertOne({
          ...step,
          transactionId: tx.transactionId,
          timestamp: generateTimestamp(step.minutesAgo),
          duration_ms: Math.floor(Math.random() * 1000) + 500
        });
        totalSteps++;
      }

      // Insert signals
      for (const signal of demoCase.signals) {
        await db.collection('signals').insertOne({
          ...signal,
          transactionId: tx.transactionId,
          purchasedAt: generateTimestamp(signal.minutesAgo),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        });
        totalSignals++;
        totalCost += signal.cost;
      }

      // Insert payments
      for (const payment of demoCase.payments) {
        await db.collection('payments').insertOne({
          ...payment,
          transactionId: tx.transactionId,
          status: 'COMPLETED',
          x402Details: {
            paymentProof: `proof_demo_${Math.random().toString(36).substr(2, 9)}`
          },
          createdAt: generateTimestamp(payment.minutesAgo),
          completedAt: generateTimestamp(payment.minutesAgo)
        });
        totalPayments++;
      }

      // Insert decisions
      for (const decision of demoCase.decisions) {
        await db.collection('decisions').insertOne({
          ...decision,
          transactionId: tx.transactionId,
          timestamp: generateTimestamp(decision.minutesAgo),
          evidenceUsed: []
        });
        totalDecisions++;
      }
    }

    console.log('✅ Seeding Complete!');
    console.log('');
    console.log('Summary:');
    console.log(`   Transactions: ${casesToSeed.length}`);
    console.log(`   Agent Steps: ${totalSteps}`);
    console.log(`   Signals: ${totalSignals}`);
    console.log(`   Payments: ${totalPayments}`);
    console.log(`   Decisions: ${totalDecisions}`);
    console.log(`   Total Signal Cost: $${totalCost.toFixed(2)}`);
    console.log('');
    console.log('Test URLs:');
    for (const demoCase of casesToSeed) {
      console.log(`   http://localhost:3000/case/${demoCase.transaction.transactionId}`);
    }

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) await client.close();
    process.exit(3);
  }
}

seedDemoData();
