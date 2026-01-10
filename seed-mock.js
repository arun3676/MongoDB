// seed-mock.js
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'fraud_escalation');
    
    const transactionId = "TX-DEMO-HACKER"; // Use this ID in your URL: /case/TX-DEMO-HACKER

    // 1. Create a dummy transaction
    await db.collection('transactions').insertOne({
      transactionId, amount: 5000, status: 'PROCESSING', createdAt: new Date()
    });

    // 2. Create the Debate Steps for your UI
    await db.collection('agent_steps').insertMany([
      {
        transactionId,
        agentName: 'Prosecution Agent',
        action: 'DEFENSE_ARGUMENT',
        output: { reasoning: "This IP is linked to a known botnet. High probability of account takeover.", confidence: 0.85 }
      },
      {
        transactionId,
        agentName: 'Defense Agent',
        action: 'PROSECUTION_ARGUMENT',
        output: { reasoning: "The user is on a business trip. Their device hardware matches our records perfectly.", confidence: 0.90 }
      }
    ]);

    console.log("✅ Mock data created! Visit: http://localhost:3001/case/TX-DEMO-HACKER");
  } finally {
    await client.close();
  }
}
seed();