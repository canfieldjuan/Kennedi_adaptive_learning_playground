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
  {
    file: 'docs/contracts/long-running-slices.contract.md',
    requiredText: [
      '# Long-Running PR Slice Contract',
      '## Purpose',
      '## State Machine',
      '## Persisted Session State',
      '## Ownership',
      '## Wake Authority',
      '## Readiness Predicate',
      '## Merge Guard',
      '## Next Slice',
      '## Failure Behavior',
      'docs/templates/long-run-session-state.md',
      'An event wake never transitions directly to `merged`.',
      'The persisted required-check set is non-empty',
      'Every GraphQL `reviewThreads` page is fetched',
      'Merge requires explicit operator authorization',
      'Never use `--admin`',
    ],
  },
  {
    file: 'docs/templates/long-run-session-state.md',
    requiredText: [
      '# Kennedi Long-Run Session State',
      '## Owned Active PR',
      'Expected head SHA:',
      'Merge authorization:',
      '## Ownership Boundaries',
      '## Last Live Observation',
      'Wake source:',
      'Configured required checks: quality-gate',
      'Unresolved review thread ids:',
      '## Ordered Next Slice',
      '## Resume Baton',
      '## Resume Checklist',
    ],
  },
  {
    file: 'docs/contracts/pr-readiness-proof.contract.md',
    requiredText: [
      '# PR Readiness Proof Contract',
      '## Trusted Inputs',
      '## Observation Order',
      '## Pagination',
      '## Required Check Policy',
      '## Review Threads',
      '## Ready Predicate',
      '## Proof Schema',
      '## Exit Contract',
      '## Mutation Boundary',
      'schema_version: 1',
      '`quality-gate`',
      '`isResolved=false` is unresolved even',
    ],
  },
  {
    file: 'scripts/pr-readiness.mjs',
    requiredText: [
      "PROOF_SCHEMA_VERSION = 1",
      "PROOF_TYPE = 'kennedi.pr-readiness'",
      "REQUIRED_BASELINE_CONTEXT = 'quality-gate'",
      "'X-GitHub-Api-Version': '2026-03-10'",
      'paginateConnection',
      'required_status_checks',
      'baseRef { target { oid } }',
      "failureCodes.add('base_not_current')",
      'statusCheckRollup',
      'reviewThreads(first: 100',
      "process.exitCode = await runCli()",
    ],
    forbiddenText: [
      'mutation ',
      'updateSubscription',
      'resolveReviewThread',
      'workflow_dispatch',
      'gh pr merge',
      '--admin',
      'writeFile',
      'rename(',
      'node:child_process',
    ],
  },
  {
    file: 'tests/scripts/pr-readiness.test.ts',
    requiredText: [
      'one unresolved thread blocks readiness',
      'an outdated unresolved thread still blocks readiness',
      'more than 100 threads are retained across advancing pages',
      'duplicate thread ids fail closed instead of lowering confidence',
      'discovers required checks beyond the first 100 applicable branch rules',
      'empty required policy is non-ready rather than vacuously green',
      'a head change during collection invalidates the snapshot',
      'a base change during collection invalidates the snapshot',
      'returns an error proof and redacts token text',
      'returns zero only for a complete ready proof',
      'returns one for a complete proof of non-readiness',
    ],
  },
  {
    file: '../AGENTS.md',
    requiredText: [
      '## Builder and long-running slice rules',
      'docs/contracts/long-running-slices.contract.md',
      'docs/templates/long-run-session-state.md',
      'A review/check/push event is attention-only; it never authorizes merge.',
      'Never use admin bypass.',
    ],
  },
  {
    file: '../.github/workflows/learning-playground-quality.yml',
    requiredText: [
      'name: Learning Playground Quality',
      'pull_request:',
      'permissions:',
      'contents: read',
      'cancel-in-progress: true',
      'name: quality-gate',
      'timeout-minutes:',
      'working-directory: learning-playground',
      'uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
      'uses: actions/setup-node@2028fbc5c25fe9cf00d9f06a71cc4710d4507903',
      'npm ci',
      'npx playwright install --with-deps chromium',
      'npm test',
      'npm run test:viewport',
      'npm run typecheck',
      'npm run build',
    ],
    forbiddenText: [
      'pull_request_target',
      'permissions: write-all',
      'contents: write',
      'actions: write',
      'id-token: write',
      'pull-requests: write',
      'gh pr merge',
      '--admin',
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

  for (const text of check.forbiddenText ?? []) {
    if (content.includes(text)) {
      failures.push(`${check.file} contains forbidden text: ${text}`);
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
