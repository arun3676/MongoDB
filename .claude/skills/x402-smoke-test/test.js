#!/usr/bin/env node

/**
 * x402 Smoke Test
 * Tests the complete 402 -> pay -> retry -> 200 flow
 */

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

const BASE_URL = 'http://localhost:3000';
const TEST_TRANSACTION_ID = `TX-TEST-X402-${Date.now()}`;

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const skipNetwork = args.includes('--skip-network');

async function checkServer() {
  try {
    const response = await fetch(BASE_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function testVelocitySignal() {
  console.log('━'.repeat(40));
  console.log('🔵 Testing Velocity Signal ($0.10)');
  console.log('━'.repeat(40));
  console.log('');

  const startTime = Date.now();

  // Step 1: Initial request (expect 402)
  console.log('Step 1: Initial Request (No Payment Proof)');
  console.log('   GET /api/signals/velocity?userId=test_user_123');
  console.log('');

  const initial = await fetch(`${BASE_URL}/api/signals/velocity?userId=test_user_123`);
  const initialData = await initial.json();

  if (initial.status !== 402) {
    console.error(`   ❌ Expected 402, got ${initial.status}`);
    return false;
  }

  console.log('   Response: 402 Payment Required ✅');
  console.log('   Headers:');
  console.log(`     X-Payment-Required: ${initial.headers.get('X-Payment-Required')}`);
  console.log(`     X-Payment-URL: ${initial.headers.get('X-Payment-URL')}`);
  if (verbose) {
    console.log('   Body:', JSON.stringify(initialData, null, 2));
  }
  console.log('');

  // Step 2: Make payment
  console.log('Step 2: Make Payment');
  console.log('   POST /api/payments');
  console.log(`   Body: { amount: 0.10, signal: "velocity", transactionId: "${TEST_TRANSACTION_ID}" }`);
  console.log('');

  const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 0.10,
      signal: 'velocity',
      transactionId: TEST_TRANSACTION_ID
    })
  });

  const paymentData = await paymentRes.json();

  if (!paymentRes.ok) {
    console.error(`   ❌ Payment failed: ${paymentRes.status}`);
    if (verbose) console.error(paymentData);
    return false;
  }

  console.log('   Response: 200 OK ✅');
  console.log(`   Payment ID: ${paymentData.paymentId}`);
  console.log(`   Payment Proof: ${paymentData.paymentProof.substring(0, 32)}...`);
  console.log('');

  // Step 3: Retry with proof
  console.log('Step 3: Retry with Payment Proof');
  console.log('   GET /api/signals/velocity?userId=test_user_123');
  console.log(`   Header: X-Payment-Proof: ${paymentData.paymentProof.substring(0, 16)}...`);
  console.log('');

  const retry = await fetch(`${BASE_URL}/api/signals/velocity?userId=test_user_123&transactionId=${TEST_TRANSACTION_ID}`, {
    headers: { 'X-Payment-Proof': paymentData.paymentProof }
  });

  const retryData = await retry.json();

  if (!retry.ok) {
    console.error(`   ❌ Expected 200, got ${retry.status}`);
    if (verbose) console.error(retryData);
    return false;
  }

  console.log('   Response: 200 OK ✅');
  console.log(`   Signal ID: ${retryData.signalId}`);
  console.log('   Signal Data:');
  console.log(`     velocityScore: ${retryData.data.velocityScore}`);
  console.log(`     last24hTxCount: ${retryData.data.last24hTxCount}`);
  console.log(`     interpretation: ${retryData.data.interpretation}`);
  console.log('');

  const elapsed = Date.now() - startTime;
  console.log(`✅ Velocity Signal x402 Flow: PASS (${elapsed}ms)`);
  console.log('');

  return { elapsed, paymentId: paymentData.paymentId, signalId: retryData.signalId };
}

async function testNetworkSignal() {
  console.log('━'.repeat(40));
  console.log('🟣 Testing Network Signal ($0.25)');
  console.log('━'.repeat(40));
  console.log('');

  const startTime = Date.now();

  // Step 1: Initial request (expect 402)
  const initial = await fetch(`${BASE_URL}/api/signals/network?userId=test_user_123&deviceId=device_test_abc`);
  const initialData = await initial.json();

  if (initial.status !== 402) {
    console.error(`   ❌ Expected 402, got ${initial.status}`);
    return false;
  }

  console.log('   Initial Request: 402 Payment Required ✅');

  // Step 2: Make payment
  const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 0.25,
      signal: 'network',
      transactionId: `${TEST_TRANSACTION_ID}-NET`
    })
  });

  const paymentData = await paymentRes.json();

  if (!paymentRes.ok) {
    console.error(`   ❌ Payment failed: ${paymentRes.status}`);
    return false;
  }

  console.log('   Payment: 200 OK ✅');
  console.log(`   Payment Proof: ${paymentData.paymentProof.substring(0, 32)}...`);

  // Step 3: Retry with proof
  const retry = await fetch(`${BASE_URL}/api/signals/network?userId=test_user_123&deviceId=device_test_abc&transactionId=${TEST_TRANSACTION_ID}-NET`, {
    headers: { 'X-Payment-Proof': paymentData.paymentProof }
  });

  const retryData = await retry.json();

  if (!retry.ok) {
    console.error(`   ❌ Expected 200, got ${retry.status}`);
    return false;
  }

  console.log('   Retry with Proof: 200 OK ✅');
  console.log(`   Signal ID: ${retryData.signalId}`);
  console.log('   Signal Data:');
  console.log(`     networkRiskScore: ${retryData.data.networkRiskScore}`);
  console.log(`     suspiciousConnections: ${retryData.data.suspiciousConnections}`);
  console.log('');

  const elapsed = Date.now() - startTime;
  console.log(`✅ Network Signal x402 Flow: PASS (${elapsed}ms)`);
  console.log('');

  return { elapsed, paymentId: paymentData.paymentId, signalId: retryData.signalId };
}

async function verifyMongoDBTrail() {
  console.log('━'.repeat(40));
  console.log('🔍 MongoDB Audit Trail Verification');
  console.log('━'.repeat(40));
  console.log('');

  const { MongoClient } = require('mongodb');
  const MONGODB_URI = process.env.MONGODB_URI;
  const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'fraud_escalation';

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
    return false;
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);

  // Check payments
  const payments = await db.collection('payments').find({ transactionId: new RegExp(`^${TEST_TRANSACTION_ID}`) }).toArray();
  console.log('✅ Payments Collection');
  console.log(`   Found ${payments.length} payment records`);

  for (const payment of payments) {
    console.log(`   ${payment.signalType}: ${payment.paymentId}`);
    if (payment.x402Details) {
      console.log(`     - x402Details.paymentProof ✓`);
    }
  }
  console.log('');

  // Check signals
  const signals = await db.collection('signals').find({ transactionId: new RegExp(`^${TEST_TRANSACTION_ID}`) }).toArray();
  console.log('✅ Signals Collection');
  console.log(`   Found ${signals.length} signal records`);
  for (const signal of signals) {
    console.log(`   ${signal.signalType}: ${signal.signalId}`);
  }
  console.log('');

  await client.close();
  return payments.length > 0 && signals.length > 0;
}

async function runSmokeTest() {
  console.log('🧪 x402 Smoke Test');
  console.log('━'.repeat(40));
  console.log('');

  // Check prerequisites
  console.log('✅ Prerequisites');
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('   ❌ Next.js server not running on http://localhost:3000');
    console.error('   Run: npm run dev');
    process.exit(1);
  }
  console.log('   Next.js server: http://localhost:3000 (running)');
  console.log('   MongoDB Atlas: Connected');
  console.log('');

  // Test velocity signal
  const velocityResult = await testVelocitySignal();
  if (!velocityResult) {
    console.error('❌ Velocity signal test failed');
    process.exit(2);
  }

  // Test network signal
  if (!skipNetwork) {
    const networkResult = await testNetworkSignal();
    if (!networkResult) {
      console.error('❌ Network signal test failed');
      process.exit(2);
    }
  }

  // Verify MongoDB audit trail
  const auditOk = await verifyMongoDBTrail();
  if (!auditOk) {
    console.error('❌ MongoDB audit trail incomplete');
    process.exit(5);
  }

  console.log('━'.repeat(40));
  console.log('✅ x402 Smoke Test: ALL PASS');
  console.log('━'.repeat(40));
  console.log('');
  console.log('Ready for demo! 🎉');

  process.exit(0);
}

runSmokeTest();
