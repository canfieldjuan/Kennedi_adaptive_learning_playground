import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const checks = [
  {
    file: 'docs/contracts/change-workflow.contract.md',
    requiredText: [
      '# Change Workflow Contract',
      '## Required Before Code',
      '### Root Cause',
      '### Correct Fix Must Touch',
      '### Must Not Change',
      '## Build Rule',
      '## Required Before Done',
      '### Gaps',
      '### Change By Change Reconstruction',
      '### Contract Traceability',
      '### Verification',
      'docs/templates/change-contract.md',
    ],
  },
  {
    file: 'docs/templates/change-contract.md',
    requiredText: [
      '# Change Contract',
      '## Before Code',
      '### Root Cause',
      '### Correct Fix Must Touch',
      '### Must Not Change',
      '## Contract Amendments',
      '## Cold Diff Audit',
      '### Gaps',
      '### Change By Change Reconstruction',
      '### Contract Traceability',
      '### Verification',
    ],
  },
  {
    file: 'docs/contracts/finding-verification.contract.md',
    requiredText: [
      '# Finding Verification Contract',
      '## Purpose',
      '## Required Before Assessing Findings',
      '### Code Read Cold',
      '### Claim Breakdown',
      '## Required Claim Classification',
      '### Confirmed',
      '### Contradicted',
      '### Could Not Determine',
      '## Required Report Order',
      '## Fix Eligibility',
      'docs/templates/finding-verification.md',
    ],
  },
  {
    file: 'docs/templates/finding-verification.md',
    requiredText: [
      '# Finding Verification',
      '## Code Read Cold',
      '## Finding Claim Breakdown',
      'existence:',
      'location:',
      'cause:',
      'severity:',
      'fix:',
      '## Gaps First',
      '## Confirmed Claims',
      '## Contradicted Claims',
      '## Could Not Determine',
      '## Fix Eligibility',
    ],
  },
];

const failures = [];

for (const check of checks) {
  const content = readFileSync(join(root, check.file), 'utf8');

  for (const text of check.requiredText) {
    if (!content.includes(text)) {
      failures.push(`${check.file} is missing required text: ${text}`);
    }
  }
}

if (failures.length > 0) {
  console.error('Change workflow contract check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Change workflow contract check passed.');
