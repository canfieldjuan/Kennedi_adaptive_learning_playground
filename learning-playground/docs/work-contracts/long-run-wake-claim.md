# Long-Run Wake Claim

## Before Code

### Root Cause

The readiness, attention, confirmation, and merge runtimes are exact-head
one-shot tools, but no repository-owned boundary prevents two short-lived
workers from claiming the same PR/head concurrently. Workflow wiring before
that boundary would violate issue #54's duplicate-wake invariant.

### Correct Fix Must Touch

- `docs/contracts/pr-wake-claim.contract.md` defines identity, atomic acquire,
  completion, abandonment, outputs, failure behavior, and non-scope.
- `scripts/pr-wake-claim.mjs` owns the bounded local-state protocol.
- `tests/scripts/pr-wake-claim.test.ts` attacks replay, overlap, token,
  malformed-state, path, and real-process concurrency boundaries.
- `scripts/check-work-contract.mjs` enrolls the new contract, runtime, and tests.
- This work contract records cold audit and verification before publication.

### Must Not Change

- Do not edit existing readiness, attention, confirmation, merge, workflow,
  AGENTS, template, application, game, graphics, content, package, or lock files.
- Do not touch shared checkouts or another branch/worktree.
- Do not add GitHub calls, worker launch, event wiring, polling, time-based lock
  stealing, merge authority, merge commands, branch/ruleset mutation, session
  state updates, worktree cleanup, or queue selection.

## Contract Amendments

### 2026-07-10 live review correction

- Threads `PRRT_kwDOTPmar86QDaf1`, `PRRT_kwDOTPmar86QDaf3`, and
  `PRRT_kwDOTPmar86QDaf5` confirmed three P2 boundaries: a rightful retry could
  not resume a transition marker left before active removal, root capacity was
  check-then-act across different heads, and dangling receipt/transition
  symlinks were treated as absent.
- The correction requires same-token/action transition recovery with idempotent
  finalization, exclusive per-delivery capacity-slot reservation, and lstat
  presence checks followed by bounded no-follow reads.
- Workflow wiring, time-based stale takeover, merge authority, and every prior
  non-scope boundary remain unchanged.

## Cold Diff Audit

### Gaps

- CONFIRMED — no P1/P2 remains in the contracted claim primitive. Exact input
  identity, private canonical state, atomic publication, token-bound
  transitions, replay receipts, and bounded reads/growth gate every successful
  decision (`learning-playground/scripts/pr-wake-claim.mjs:34`,
  `learning-playground/scripts/pr-wake-claim.mjs:100`,
  `learning-playground/scripts/pr-wake-claim.mjs:200`,
  `learning-playground/scripts/pr-wake-claim.mjs:236`,
  `learning-playground/scripts/pr-wake-claim.mjs:439`).
- CONFIRMED — concurrency is controlled by exclusive hard-link publication for
  active/capacity records and a second exclusive transition marker for
  completion or abandonment (`learning-playground/scripts/pr-wake-claim.mjs:127`,
  `learning-playground/scripts/pr-wake-claim.mjs:236`,
  `learning-playground/scripts/pr-wake-claim.mjs:291`,
  `learning-playground/scripts/pr-wake-claim.mjs:490`).
- CONFIRMED — all three live-review paths are closed: same-token/action retries
  validate and resume existing transitions, capacity admission uses one of
  4,096 atomically exclusive slots, and lstat presence checks expose dangling
  paths to bounded no-follow reads (`learning-playground/scripts/pr-wake-claim.mjs:102`,
  `learning-playground/scripts/pr-wake-claim.mjs:249`,
  `learning-playground/scripts/pr-wake-claim.mjs:291`).
- CONFIRMED — no outcome grants merge authority and no GitHub, process-launch,
  polling, or merge surface exists (`learning-playground/scripts/pr-wake-claim.mjs:84`,
  `learning-playground/scripts/pr-wake-claim.mjs:528`).
- COULD NOT DETERMINE — no workflow or worker invokes this primitive yet. Event
  wiring and worker lifecycle remain explicit later slices.
- COULD NOT DETERMINE — a crashed owner before finalization leaves a permanent
  active claim. Automatic stale takeover is intentionally prohibited; operator
  recovery remains a later slice.

### Change By Change Reconstruction

- The contract defines one active owner per exact PR/head, per-delivery replay
  receipts, token-bound finalization, exits, and non-scope
  (`learning-playground/docs/contracts/pr-wake-claim.contract.md:3`).
- The CLI accepts only exact bounded action, repository, PR, head, source, wake,
  root, and action-specific token inputs
  (`learning-playground/scripts/pr-wake-claim.mjs:34`).
- Acquisition checks receipts and transitions, distinguishes duplicate from
  busy, reserves one exclusive capacity slot, and publishes one active token
  (`learning-playground/scripts/pr-wake-claim.mjs:100`,
  `learning-playground/scripts/pr-wake-claim.mjs:291`).
- Completion writes a durable replay receipt before releasing the head;
  abandonment releases without a receipt; both recover their own interrupted
  transition markers (`learning-playground/scripts/pr-wake-claim.mjs:152`,
  `learning-playground/scripts/pr-wake-claim.mjs:181`,
  `learning-playground/scripts/pr-wake-claim.mjs:236`).
- State paths are digest-derived under a private canonical root; records are
  read through bounded descriptors and published only after full write/fsync
  (`learning-playground/scripts/pr-wake-claim.mjs:200`,
  `learning-playground/scripts/pr-wake-claim.mjs:222`,
  `learning-playground/scripts/pr-wake-claim.mjs:439`,
  `learning-playground/scripts/pr-wake-claim.mjs:474`).
- Forty-one tests attack both sides of ownership, replay, token, transition,
  malformed-state, symlink, permission, capacity, exit, and real-process race
  boundaries (`learning-playground/tests/scripts/pr-wake-claim.test.ts:27`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:135`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:222`).

### Contract Traceability

- Claim identity and acquire: contract lines 25-45; runtime lines 100-149 and
  291-347; tests lines 27-75 and 322-345.
- Complete/abandon and interrupted transitions: contract lines 48-60; runtime
  lines 152-198 and 236-289; tests lines 77-145 and 347-369.
- Filesystem safety/resource boundary: contract lines 10-20 and 39-42; runtime
  lines 200-233, 291-347, and 439-519; tests lines 171-291 and 331-345.
- Output/authority boundary: contract lines 62-73; runtime lines 84-97 and
  527-543; tests lines 294-320.
- Durable enrollment: `learning-playground/scripts/check-work-contract.mjs:272`.

### Verification

- `npx vitest run tests/scripts/pr-wake-claim.test.ts` — 41 passed.
- `npm test` — 53 files / 636 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:viewport` — 6 browser scenarios passed.
- `node scripts/check-work-contract.mjs` — passed.
- `git diff --check` — passed.
- No GitHub event, worker, review/thread, ruleset, or merge mutation was performed
  by this slice's runtime or tests.
