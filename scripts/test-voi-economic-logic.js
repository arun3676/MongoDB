/**
 * Test Script: VOI Economic Logic
 *
 * Tests that the VOI agent properly refuses unprofitable signals
 * when signal cost exceeds expected loss.
 *
 * Test Cases:
 * 1. Low-value transaction ($5) with high suspicion (70%) - Should refuse $0.25 signal
 * 2. Medium-value transaction ($50) with medium suspicion (50%) - Should buy both signals
 * 3. High-value transaction ($1000) with low suspicion (30%) - Should buy both signals
 *
 * Expected Behavior:
 * - If signal cost > expected loss → ECONOMIC_REFUSAL
 * - If VOI > 0 → BUY
 * - Otherwise → SKIP
 *
 * Usage: node scripts/test-voi-economic-logic.js
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// Test cases with different economic scenarios
const TEST_CASES = [
  {
    name: 'Low-value transaction (should refuse expensive signals)',
    amount: 5.0,
    description: 'Small purchase - agent should refuse $0.25 network signal',
    expectedRefusals: 1, // Network signal should be refused
  },
  {
    name: 'Medium-value transaction',
    amount: 50.0,
    description: 'Medium purchase - agent should buy both signals',
    expectedRefusals: 0,
  },
  {
    name: 'High-value transaction',
    amount: 1000.0,
    description: 'Large purchase - agent should definitely buy both signals',
    expectedRefusals: 0,
  },
  {
    name: 'Very low-value transaction (should refuse all signals)',
    amount: 0.5,
    description: 'Tiny purchase - agent should refuse both signals',
    expectedRefusals: 2, // Both signals should be refused
  },
];

async function runTest(testCase) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test: ${testCase.name}`);
  console.log(`Amount: $${testCase.amount}`);
  console.log(`Description: ${testCase.description}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Create a test transaction
    const createResponse = await fetch(`${API_BASE}/api/case/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: testCase.amount,
        currency: 'USD',
        userId: `test_user_${Date.now()}`,
        merchantId: 'test_merchant',
        metadata: {
          test: true,
          testCase: testCase.name,
        },
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create case: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    const transactionId = createData.transactionId;

    console.log(`✓ Created transaction: ${transactionId}`);
    console.log(`  Waiting for agents to process...`);

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    let caseData = null;

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s

      const caseResponse = await fetch(`${API_BASE}/api/case/${transactionId}`);
      if (!caseResponse.ok) {
        throw new Error(`Failed to fetch case: ${caseResponse.statusText}`);
      }

      caseData = await caseResponse.json();

      if (caseData.status === 'COMPLETED' || caseData.status === 'FAILED') {
        break;
      }

      attempts++;
      if (attempts % 5 === 0) {
        console.log(`  Still processing... (${attempts * 2}s elapsed)`);
      }
    }

    if (!caseData || caseData.status !== 'COMPLETED') {
      throw new Error('Case did not complete in time');
    }

    console.log(`✓ Case completed\n`);

    // Find VOI analysis in timeline
    const voiStep = caseData.timeline.find(
      (step) => step.action === 'VOI_ANALYSIS' && step.agentName === 'VOI/Budget Agent'
    );

    if (!voiStep || !voiStep.output) {
      throw new Error('VOI analysis step not found in timeline');
    }

    const voiOutput = voiStep.output;
    const summary = voiOutput.summary || {};
    const voiDecisions = voiOutput.voiDecisions || [];

    // Analyze results
    console.log(`📊 VOI Analysis Results:`);
    console.log(`   Total Tools Evaluated: ${summary.totalConsidered || 0}`);
    console.log(`   Purchased: ${summary.purchased || 0}`);
    console.log(`   Skipped: ${summary.skipped || 0}`);
    console.log(`   Economic Refusals: ${summary.economicRefusals || 0}`);

    console.log(`\n💰 Decision Breakdown:`);
    voiDecisions.forEach((decision) => {
      const costVsLoss =
        decision.toolCost > decision.expectedLoss ? ' (Cost > Loss)' : ' (Cost ≤ Loss)';
      console.log(
        `   ${decision.toolConsidered}: ${decision.decision} - VOI=$${decision.voi.toFixed(2)}${costVsLoss}`
      );
      console.log(`      Cost: $${decision.toolCost}, Expected Loss: $${decision.expectedLoss.toFixed(2)}`);
      console.log(`      Reasoning: ${decision.reasoning.substring(0, 100)}...`);
    });

    // Verify test expectations
    console.log(`\n✓ Test Validation:`);
    const actualRefusals = summary.economicRefusals || 0;

    if (actualRefusals === testCase.expectedRefusals) {
      console.log(
        `   ✅ PASS - Expected ${testCase.expectedRefusals} economic refusals, got ${actualRefusals}`
      );
      return { passed: true, testCase: testCase.name };
    } else {
      console.log(
        `   ❌ FAIL - Expected ${testCase.expectedRefusals} economic refusals, got ${actualRefusals}`
      );
      return { passed: false, testCase: testCase.name };
    }
  } catch (error) {
    console.error(`\n❌ Test failed with error:`, error.message);
    return { passed: false, testCase: testCase.name, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🧪 VOI Economic Logic Test Suite');
  console.log('Testing that agents refuse unprofitable signal purchases\n');

  const results = [];

  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase);
    results.push(result);

    // Wait 5 seconds between tests
    if (testCase !== TEST_CASES[TEST_CASES.length - 1]) {
      console.log('\n⏳ Waiting 5 seconds before next test...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test Summary`);
  console.log(`${'='.repeat(80)}\n`);

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  results.forEach((result) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testCase}`);
  });

  console.log(`\nTotal: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    console.log(`\n🎉 All tests passed! VOI economic logic is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some tests failed. Review the output above for details.`);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runTest, runAllTests };
