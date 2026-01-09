#!/usr/bin/env node

/**
 * Audit Packet Export
 * Exports complete fraud case audit from MongoDB to JSON
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

// Parse command-line arguments
const args = process.argv.slice(2);
const transactionId = args.find(arg => !arg.startsWith('--'));
const outputMatch = args.find(arg => arg.startsWith('--output='));
const outputPath = outputMatch ? outputMatch.split('=')[1] : null;

async function exportAuditPacket() {
  console.log('📦 Audit Packet Export');
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

    // Find transaction
    console.log('🔍 Finding case...');
    let transaction;

    if (transactionId) {
      transaction = await db.collection('transactions').findOne({ transactionId });
      if (!transaction) {
        console.error(`   ❌ Transaction not found: ${transactionId}`);
        await client.close();
        process.exit(2);
      }
    } else {
      // Get latest completed case
      transaction = await db.collection('transactions')
        .find({ status: 'COMPLETED' })
        .sort({ completedAt: -1 })
        .limit(1)
        .toArray();

      if (transaction.length === 0) {
        console.error('   ❌ No completed cases found');
        await client.close();
        process.exit(2);
      }
      transaction = transaction[0];
    }

    console.log(`   Transaction ID: ${transaction.transactionId}`);
    console.log(`   Status: ${transaction.status} (${transaction.finalDecision || 'PROCESSING'})`);
    if (transaction.completedAt) {
      console.log(`   Completed: ${transaction.completedAt.toISOString()}`);
    }
    console.log('');

    // Aggregate all data
    console.log('📊 Aggregating audit data...');

    const timeline = await db.collection('agent_steps')
      .find({ transactionId: transaction.transactionId })
      .sort({ stepNumber: 1 })
      .toArray();

    const signals = await db.collection('signals')
      .find({ transactionId: transaction.transactionId })
      .sort({ purchasedAt: 1 })
      .toArray();

    const payments = await db.collection('payments')
      .find({ transactionId: transaction.transactionId })
      .sort({ createdAt: 1 })
      .toArray();

    const decisions = await db.collection('decisions')
      .find({ transactionId: transaction.transactionId })
      .sort({ timestamp: 1 })
      .toArray();

    const policies = await db.collection('policies')
      .find({ enabled: true })
      .toArray();

    console.log(`   Transactions: 1`);
    console.log(`   Agent Steps: ${timeline.length}`);
    console.log(`   Signals: ${signals.length}`);
    console.log(`   Payments: ${payments.length}`);
    console.log(`   Decisions: ${decisions.length}`);
    console.log(`   Policies: ${policies.length} (active)`);
    console.log('');

    // Compute summary
    const totalCost = payments.reduce((sum, p) => sum + p.amount, 0);
    const duration_seconds = transaction.completedAt && transaction.createdAt
      ? (transaction.completedAt - transaction.createdAt) / 1000
      : 0;
    const agentsInvolved = [...new Set(timeline.map(s => s.agent))];
    const finalDecision = decisions.find(d => d.isFinal);

    // Build audit packet
    const auditPacket = {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      generatedBy: 'audit-packet-export-skill',
      transactionId: transaction.transactionId,

      case: transaction,
      timeline,
      signals,
      payments,
      decisions,
      policies,

      summary: {
        totalSteps: timeline.length,
        agentsInvolved,
        signalsPurchased: signals.length,
        totalCost: parseFloat(totalCost.toFixed(2)),
        duration_seconds: parseFloat(duration_seconds.toFixed(1)),
        finalDecision: transaction.finalDecision || 'PROCESSING',
        confidence: finalDecision ? finalDecision.confidence : null
      },

      x402FlowAnalysis: {
        totalPayments: payments.length,
        totalSpent: parseFloat(totalCost.toFixed(2)),
        signals: signals.map(s => ({
          signal: s.signalType,
          cost: s.cost,
          purchasedBy: s.purchasedBy,
          data: s.data
        }))
      }
    };

    // Write to file
    console.log('💾 Writing audit packet...');

    const exportsDir = outputPath ? path.dirname(outputPath) : path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
    const filename = outputPath || path.join(exportsDir, `audit-${transaction.transactionId}-${timestamp}.json`);

    fs.writeFileSync(filename, JSON.stringify({ auditPacket }, null, 2));
    const stats = fs.statSync(filename);

    console.log(`   File: ${filename}`);
    console.log(`   Size: ${(stats.size / 1024).toFixed(1)} KB`);
    console.log('');

    console.log('━'.repeat(40));
    console.log('✅ Audit Packet Exported Successfully');
    console.log('━'.repeat(40));
    console.log('');

    // Print summary
    console.log('Transaction Summary:');
    console.log(`   ID: ${transaction.transactionId}`);
    console.log(`   Amount: $${transaction.amount.toFixed(2)}`);
    console.log(`   User: ${transaction.userId}`);
    console.log(`   Merchant: ${transaction.merchantName || transaction.merchantId}`);
    console.log('');

    console.log('Case Summary:');
    console.log(`   Duration: ${duration_seconds.toFixed(1)} seconds`);
    console.log(`   Agents Involved: ${agentsInvolved.length} (${agentsInvolved.join(', ')})`);
    console.log(`   Signals Purchased: ${signals.length} ($${totalCost.toFixed(2)} total)`);
    console.log(`   Final Decision: ${transaction.finalDecision || 'PROCESSING'} ${finalDecision ? `(${(finalDecision.confidence * 100).toFixed(0)}% confidence)` : ''}`);
    console.log('');

    console.log('Timeline:');
    timeline.forEach((step, i) => {
      const relativeTime = step.timestamp && transaction.createdAt
        ? Math.round((step.timestamp - transaction.createdAt) / 1000)
        : i;
      console.log(`   ${step.stepNumber}. [${String(relativeTime).padStart(2, '0')}:${String(relativeTime % 60).padStart(2, '0')}] ${step.agent}: ${step.action}`);
    });
    console.log('');

    console.log('File Location:');
    console.log(`   ${filename}`);
    console.log('');

    await client.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (client) await client.close();
    process.exit(3);
  }
}

exportAuditPacket();
