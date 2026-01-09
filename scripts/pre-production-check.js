#!/usr/bin/env node

/**
 * Pre-Production Validation Script
 * Validates TypeScript compilation, component structure, and production readiness
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message) {
  console.log('');
  log('═'.repeat(80), colors.cyan);
  log(`  ${message}`, colors.cyan);
  log('═'.repeat(80), colors.cyan);
}

function success(message) {
  log(`✓ ${message}`, colors.green);
}

function error(message) {
  log(`✗ ${message}`, colors.red);
}

function warn(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ ${message}`, colors.blue);
}

let hasErrors = false;

// Test 1: TypeScript Compilation
header('Test 1: TypeScript Compilation');
try {
  execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: __dirname + '/..' });
  success('TypeScript compilation passed with no errors');
} catch (err) {
  error('TypeScript compilation failed:');
  console.log(err.stdout.toString());
  hasErrors = true;
}

// Test 2: File Structure Validation
header('Test 2: File Structure Validation');

const requiredFiles = [
  'app/page.tsx',
  'app/case/[transactionId]/page.tsx',
  'app/components/CaseHeader.tsx',
  'app/components/CostTracker.tsx',
  'app/components/AgentTimeline.tsx',
  'app/components/SignalCard.tsx',
  'app/components/DecisionCard.tsx',
  'app/components/FinalDecision.tsx',
  'app/components/AuditDownload.tsx',
  'app/components/SubmitForm.tsx',
  'app/components/StatusBadge.tsx',
  'app/components/TimelineStep.tsx',
];

const projectRoot = path.resolve(__dirname, '..');
let missingFiles = 0;

requiredFiles.forEach((file) => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    success(`Found: ${file}`);
  } else {
    error(`Missing: ${file}`);
    missingFiles++;
    hasErrors = true;
  }
});

if (missingFiles === 0) {
  success('All required files are present');
}

// Test 3: Component Import Validation
header('Test 3: Component Import Validation');

function checkImports(filePath, requiredImports) {
  const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf-8');
  let allPresent = true;

  requiredImports.forEach((imp) => {
    if (content.includes(imp)) {
      success(`  ${filePath}: ${imp}`);
    } else {
      error(`  ${filePath}: Missing import "${imp}"`);
      allPresent = false;
      hasErrors = true;
    }
  });

  return allPresent;
}

info('Checking home page imports...');
checkImports('app/page.tsx', ['import SubmitForm']);

info('Checking case detail page imports...');
checkImports('app/case/[transactionId]/page.tsx', [
  'import CaseHeader',
  'import CostTracker',
  'import AgentTimeline',
  'import SignalCard',
  'import DecisionCard',
  'import FinalDecision',
  'import AuditDownload',
]);

// Test 4: Client Component Validation
header('Test 4: Client Component Validation');

const clientComponents = [
  'app/case/[transactionId]/page.tsx',
  'app/components/CostTracker.tsx',
  'app/components/AgentTimeline.tsx',
  'app/components/SignalCard.tsx',
  'app/components/DecisionCard.tsx',
  'app/components/AuditDownload.tsx',
  'app/components/SubmitForm.tsx',
  'app/components/TimelineStep.tsx',
];

clientComponents.forEach((file) => {
  const filePath = path.join(projectRoot, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes("'use client'")) {
      success(`${file} has 'use client' directive`);
    } else {
      warn(`${file} missing 'use client' directive (may be intentional)`);
    }
  }
});

// Test 5: TypeScript Strict Mode Validation
header('Test 5: TypeScript Types Validation');

function checkTypeDefinitions(filePath, requiredTypes) {
  const content = fs.readFileSync(path.join(projectRoot, filePath), 'utf-8');
  let allPresent = true;

  requiredTypes.forEach((type) => {
    if (content.includes(`interface ${type}`) || content.includes(`type ${type}`)) {
      success(`  ${filePath}: ${type} defined`);
    } else {
      warn(`  ${filePath}: Type "${type}" not found (may use external type)`);
    }
  });

  return allPresent;
}

info('Checking case detail page types...');
checkTypeDefinitions('app/case/[transactionId]/page.tsx', [
  'Transaction',
  'TimelineItem',
  'Signal',
  'Decision',
  'CaseData',
]);

// Test 6: Polling Logic Validation
header('Test 6: Polling Logic Validation');

const caseDetailPath = path.join(projectRoot, 'app/case/[transactionId]/page.tsx');
if (fs.existsSync(caseDetailPath)) {
  const content = fs.readFileSync(caseDetailPath, 'utf-8');

  const pollingChecks = [
    { pattern: 'useState.*isPolling', name: 'isPolling state' },
    { pattern: 'setInterval.*2000', name: '2-second polling interval' },
    { pattern: 'clearInterval', name: 'interval cleanup' },
    { pattern: "status === 'COMPLETED'", name: 'COMPLETED status check' },
    { pattern: "status === 'FAILED'", name: 'FAILED status check' },
    { pattern: 'setIsPolling\\(false\\)', name: 'polling stop logic' },
  ];

  pollingChecks.forEach((check) => {
    if (new RegExp(check.pattern).test(content)) {
      success(`Polling logic: ${check.name}`);
    } else {
      error(`Missing polling logic: ${check.name}`);
      hasErrors = true;
    }
  });
} else {
  error('Case detail page not found');
  hasErrors = true;
}

// Test 7: Layout Structure Validation
header('Test 7: Layout Structure Validation');

if (fs.existsSync(caseDetailPath)) {
  const content = fs.readFileSync(caseDetailPath, 'utf-8');

  const layoutChecks = [
    { pattern: 'lg:col-span-2', name: 'Timeline 2/3 width column' },
    { pattern: '<AgentTimeline', name: 'AgentTimeline component' },
    { pattern: '<SignalCard', name: 'SignalCard component' },
    { pattern: '<DecisionCard', name: 'DecisionCard component' },
    { pattern: '<FinalDecision', name: 'FinalDecision component' },
    { pattern: '<AuditDownload', name: 'AuditDownload component' },
    { pattern: "status === 'COMPLETED' && <AuditDownload", name: 'Conditional audit download' },
  ];

  layoutChecks.forEach((check) => {
    if (new RegExp(check.pattern).test(content)) {
      success(`Layout structure: ${check.name}`);
    } else {
      warn(`Layout check: ${check.name} not found (may use different pattern)`);
    }
  });
}

// Test 8: Responsive Design Validation
header('Test 8: Responsive Design Validation');

const responsivePatterns = [
  { file: 'app/page.tsx', pattern: 'md:grid-cols-3', name: 'Home page responsive grid' },
  {
    file: 'app/case/[transactionId]/page.tsx',
    pattern: 'lg:grid-cols-3',
    name: 'Case detail responsive grid',
  },
  { file: 'app/components/CaseHeader.tsx', pattern: 'sm:flex-row', name: 'Header responsive flex' },
];

responsivePatterns.forEach((check) => {
  const filePath = path.join(projectRoot, check.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(check.pattern)) {
      success(`${check.name}`);
    } else {
      warn(`${check.name} not found`);
    }
  }
});

// Test 9: Error Handling Validation
header('Test 9: Error Handling Validation');

if (fs.existsSync(caseDetailPath)) {
  const content = fs.readFileSync(caseDetailPath, 'utf-8');

  const errorChecks = [
    { pattern: 'useState.*error', name: 'Error state' },
    { pattern: 'catch.*err', name: 'Try-catch blocks' },
    { pattern: 'isLoading', name: 'Loading state' },
    { pattern: 'Case not found', name: '404 error message' },
    { pattern: 'Failed to fetch', name: 'Fetch error handling' },
  ];

  errorChecks.forEach((check) => {
    if (new RegExp(check.pattern).test(content)) {
      success(`Error handling: ${check.name}`);
    } else {
      warn(`Error handling: ${check.name} not found`);
    }
  });
}

// Test 10: Build Validation
header('Test 10: Next.js Build Validation');
try {
  info('Running Next.js build (this may take a minute)...');
  execSync('npm run build', { stdio: 'pipe', cwd: projectRoot });
  success('Next.js build completed successfully');
} catch (err) {
  error('Next.js build failed:');
  console.log(err.stdout.toString());
  hasErrors = true;
}

// Summary
header('Production Readiness Summary');

if (hasErrors) {
  error('Pre-production validation FAILED');
  error('Please fix the errors above before deploying to production');
  process.exit(1);
} else {
  success('All pre-production checks PASSED');
  success('Frontend is ready for production deployment');
  console.log('');
  info('Next steps:');
  info('  1. Implement backend API routes (/api/case/create, /api/case/:id)');
  info('  2. Test end-to-end flow with real MongoDB');
  info('  3. Implement x402 payment endpoints');
  info('  4. Run manual QA testing');
  info('  5. Deploy to production');
  process.exit(0);
}
