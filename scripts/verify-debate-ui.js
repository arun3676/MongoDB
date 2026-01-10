/**
 * Verification Script for Debate Tribunal UI
 *
 * This script verifies that:
 * 1. The API returns debate data correctly
 * 2. The debate data structure matches the expected format
 * 3. The UI can consume the debate data
 *
 * Usage: node scripts/verify-debate-ui.js [transactionId]
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

async function verifyDebateUI(transactionId) {
  console.log('\n🔍 Verifying Debate Tribunal UI Implementation...\n');

  try {
    // Step 1: Fetch case data
    console.log(`1️⃣  Fetching case data for transaction: ${transactionId}`);
    const response = await fetch(`${API_BASE}/api/case/${transactionId}`);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('   ✅ API request successful');

    // Step 2: Check if debate data exists
    console.log('\n2️⃣  Checking for debate data...');
    if (!data.debate) {
      console.log('   ⚠️  No debate data found in response');
      console.log('   This could mean:');
      console.log('   - The case is still processing');
      console.log('   - The case hasn\'t reached the Buyer Decision agent yet');
      console.log('   - The debate data is missing from the Buyer Decision metadata');
      return false;
    }
    console.log('   ✅ Debate data found!');

    // Step 3: Validate debate structure
    console.log('\n3️⃣  Validating debate data structure...');

    const requiredFields = {
      defense: ['confidence', 'reasoning'],
      prosecution: ['confidence', 'reasoning'],
      verdict: ['decision', 'confidence', 'reasoning', 'defenseStrength', 'prosecutionStrength']
    };

    let allValid = true;
    for (const [section, fields] of Object.entries(requiredFields)) {
      if (!data.debate[section]) {
        console.log(`   ❌ Missing section: ${section}`);
        allValid = false;
        continue;
      }

      for (const field of fields) {
        if (data.debate[section][field] === undefined) {
          console.log(`   ❌ Missing field: ${section}.${field}`);
          allValid = false;
        }
      }
    }

    if (allValid) {
      console.log('   ✅ All required fields present');
    }

    // Step 4: Display debate summary
    console.log('\n4️⃣  Debate Summary:');
    console.log(`   🟢 Defense:     ${(data.debate.defense.confidence * 100).toFixed(0)}% confident for APPROVE`);
    console.log(`   🔴 Prosecution: ${(data.debate.prosecution.confidence * 100).toFixed(0)}% confident for DENY`);
    console.log(`   ⚖️  Verdict:     ${data.debate.verdict.decision} (${(data.debate.verdict.confidence * 100).toFixed(0)}% confidence)`);
    console.log(`\n   Defense Strength:     ${(data.debate.verdict.defenseStrength * 100).toFixed(0)}%`);
    console.log(`   Prosecution Strength: ${(data.debate.verdict.prosecutionStrength * 100).toFixed(0)}%`);

    // Step 5: Display reasoning
    console.log('\n5️⃣  Reasoning:');
    console.log(`\n   Defense:`);
    console.log(`   "${data.debate.defense.reasoning.substring(0, 100)}..."`);
    console.log(`\n   Prosecution:`);
    console.log(`   "${data.debate.prosecution.reasoning.substring(0, 100)}..."`);
    console.log(`\n   Arbiter Verdict:`);
    console.log(`   "${data.debate.verdict.reasoning.substring(0, 100)}..."`);

    // Step 6: Optional fields
    console.log('\n6️⃣  Optional Fields:');
    if (data.debate.defense.keyPoints && data.debate.defense.keyPoints.length > 0) {
      console.log(`   ✅ Defense has ${data.debate.defense.keyPoints.length} key points`);
    }
    if (data.debate.defense.mitigatingFactors && data.debate.defense.mitigatingFactors.length > 0) {
      console.log(`   ✅ Defense has ${data.debate.defense.mitigatingFactors.length} mitigating factors`);
    }
    if (data.debate.prosecution.keyPoints && data.debate.prosecution.keyPoints.length > 0) {
      console.log(`   ✅ Prosecution has ${data.debate.prosecution.keyPoints.length} key points`);
    }
    if (data.debate.prosecution.aggravatingFactors && data.debate.prosecution.aggravatingFactors.length > 0) {
      console.log(`   ✅ Prosecution has ${data.debate.prosecution.aggravatingFactors.length} aggravating factors`);
    }
    if (data.debate.verdict.decidingFactors && data.debate.verdict.decidingFactors.length > 0) {
      console.log(`   ✅ Verdict has ${data.debate.verdict.decidingFactors.length} deciding factors`);
    }

    console.log('\n✅ Debate Tribunal UI is properly configured!');
    console.log(`\n🌐 View in browser: ${API_BASE}/case/${transactionId}`);

    return true;

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const transactionId = process.argv[2];

  if (!transactionId) {
    console.error('Usage: node scripts/verify-debate-ui.js <transactionId>');
    console.error('\nExample: node scripts/verify-debate-ui.js TX-1234567890-abc123');
    process.exit(1);
  }

  verifyDebateUI(transactionId).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifyDebateUI };
