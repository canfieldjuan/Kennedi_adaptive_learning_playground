# Long-Run Active-Builder Merge Executor

## Before Code

### Root Cause

Issue #54 now has a live readiness producer and scheduled confirmation report,
but the final merge is still an ad hoc active-builder command. No tracked
runtime binds persisted operator authority and exact local ownership to a fresh
proof, expected-head merge, and verified receipt.

### Correct Fix Must Touch

- `docs/contracts/pr-merge-executor.contract.md` defines trusted authority,
  local/live/merge guards, output, exits, and non-scope.
- `scripts/pr-merge-executor.mjs` strictly parses the session record, proves
  clean exact local state, runs the live producer, validates scheduled
  confirmation, performs one argument-array expected-head merge, and verifies
  the receipt through injectable command seams.
- `tests/scripts/pr-merge-executor.test.ts` attacks both sides of authority,
  local ownership, proof, command, and receipt boundaries.
- `scripts/check-work-contract.mjs` enrolls required behavior and prohibits
  shell/admin/delete-branch/event mutation paths.
- This work contract records cold audit and verification.

### Must Not Change

- Do not edit existing producer, attention, confirmation, workflow, AGENTS,
  template, package, lockfile, application, game, graphics, or content files.
- Do not touch the shared checkout or its untracked wake draft.
- Do not add authority through environment, proof, event payload, label, or
  confirmation output.
- Do not add workflow wiring, polling, locks, retries, thread/review mutation,
  branch deletion, receipt persistence, cleanup, or queue selection.

### Acceptance Standard

- Every authority and local-ownership field must match exactly before a live
  proof or mutation runs.
- A fresh producer proof and scheduled confirmation must be ready for the exact
  head while remaining merge-unauthorized.
- The merge command uses argument arrays, `--match-head-commit`, and no bypass.
- A verified merged receipt is required for exit `0`; every other path exits
  `2` without claiming a merge.
- Dedicated/full tests, contract gate, typecheck, build, viewport, and diff
  checks pass.

## Contract Amendments

### 2026-07-10 cold concurrency and outcome correction

- Cold review found a local check-to-merge race and a false-negative receipt
  claim after mutation uncertainty.
- The full clean/root/branch/head guard must run before live proof and again
  immediately before merge.
- Once the merge command is invoked, command or receipt uncertainty reports
  `merge_performed:null` so callers cannot assume that no merge occurred.

### 2026-07-10 live review hardening

- Threads `PRRT_kwDOTPmar86QDN3I`, `PRRT_kwDOTPmar86QDN3L`,
  `PRRT_kwDOTPmar86QDN3N`, `PRRT_kwDOTPmar86QDN3O`,
  `PRRT_kwDOTPmar86QDN3P`, and `PRRT_kwDOTPmar86QDN3R` found six P2
  boundaries: blank authority, special-file reads, subdirectory invocation,
  malformed receipt types, unpinned GitHub host, and merge-queue enqueueing.
- The correction requires a nonblank/case-insensitive non-`none` operator
  source, bounded regular authority files, Git-root ownership, typed receipts,
  `github.com`-pinned reads/mutations, and fail-closed merge-queue detection.
- All original no-event-authority, exact-head, no-admin, and non-scope
  boundaries remain unchanged.

## Cold Diff Audit

### Gaps

- CONFIRMED — no P1/P2 remains in the contracted executor. Exact CLI identity,
  unique persisted authority fields, two local-state checks, live producer and
  confirmation, expected-head merge arguments, and verified receipt all gate
  success (`learning-playground/scripts/pr-merge-executor.mjs:30`,
  `learning-playground/scripts/pr-merge-executor.mjs:65`,
  `learning-playground/scripts/pr-merge-executor.mjs:95`,
  `learning-playground/scripts/pr-merge-executor.mjs:129`).
- CONFIRMED — event/proof/environment authority cannot reach the effect; only
  the exact scheduled session record unlocks execution
  (`learning-playground/scripts/pr-merge-executor.mjs:53`,
  `learning-playground/scripts/pr-merge-executor.mjs:79`).
- CONFIRMED — mutation uncertainty never claims `false`; after merge invocation
  an unverified command or receipt reports unknown
  (`learning-playground/scripts/pr-merge-executor.mjs:130`,
  `learning-playground/scripts/pr-merge-executor.mjs:177`).
- CONFIRMED — the six live-review boundaries are addressed before publication:
  authority source and file type are strict, Git-root invocation supports
  subdirectories, GitHub commands are host pinned, merge queues fail closed,
  and malformed receipt types remain unknown.
- COULD NOT DETERMINE — no workflow invokes this executor, and duplicate-wake
  serialization is not implemented. Both remain explicit non-scope.
- COULD NOT DETERMINE — receipt persistence and owned-lane cleanup remain active
  builder responsibilities after the verified JSON receipt.

### Change By Change Reconstruction

- CLI parsing accepts only scheduled exact ownership identifiers and absolute
  state/worktree paths (`learning-playground/scripts/pr-merge-executor.mjs:30`).
- Authority parsing caps input, rejects duplicate fields, and requires matching
  scheduled status, action, one-shot authorization, and operator source
  (`learning-playground/scripts/pr-merge-executor.mjs:65`).
- Local state is checked before live proof and immediately before mutation
  (`learning-playground/scripts/pr-merge-executor.mjs:106`,
  `learning-playground/scripts/pr-merge-executor.mjs:129`).
- The live producer and scheduled confirmation must prove ready while the
  confirmation remains merge-unauthorized
  (`learning-playground/scripts/pr-merge-executor.mjs:108`,
  `learning-playground/scripts/pr-merge-executor.mjs:117`).
- The only mutation uses argument-array `gh pr merge`, merge strategy, and the
  exact-head guard; the following read must prove the merged head and commit
  (`learning-playground/scripts/pr-merge-executor.mjs:130`,
  `learning-playground/scripts/pr-merge-executor.mjs:138`).

### Contract Traceability

- Trusted authority: runtime lines 30-93; tests lines 31-60.
- Local guard and race recheck: runtime lines 95-106, 129, 196-202; tests lines
  62-77.
- Live proof/confirmation: runtime lines 108-127; tests lines 79-87.
- Exact merge and receipt: runtime lines 130-164; tests lines 15-29, 89-101.
- Unknown mutation outcome: runtime lines 135-153, 177-188; tests lines 89-101.
- Durable enrollment: `scripts/check-work-contract.mjs` executor entries.

### Verification

- `npx vitest run tests/scripts/pr-merge-executor.test.ts` — 36 passed.
- `npm test` — 52 files / 595 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:viewport` — 6 browser scenarios passed.
- `node scripts/check-work-contract.mjs` — passed.
- `git diff --check` — passed.
- No live merge was performed by tests; injected command seams prove exact argv,
  sequencing, failures, races, and receipts without mutating GitHub.
