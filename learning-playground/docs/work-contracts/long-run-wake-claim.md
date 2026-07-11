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

None.

## Cold Diff Audit

### Gaps

- CONFIRMED — no P1/P2 remains in the contracted claim primitive. Exact input
  identity, private canonical state, atomic publication, token-bound
  transitions, replay receipts, and bounded reads/growth gate every successful
  decision (`learning-playground/scripts/pr-wake-claim.mjs:34`,
  `learning-playground/scripts/pr-wake-claim.mjs:100`,
  `learning-playground/scripts/pr-wake-claim.mjs:176`,
  `learning-playground/scripts/pr-wake-claim.mjs:223`,
  `learning-playground/scripts/pr-wake-claim.mjs:330`).
- CONFIRMED — concurrency is controlled by exclusive hard-link publication for
  active records and a second exclusive transition marker for completion or
  abandonment (`learning-playground/scripts/pr-wake-claim.mjs:118`,
  `learning-playground/scripts/pr-wake-claim.mjs:223`,
  `learning-playground/scripts/pr-wake-claim.mjs:356`).
- CONFIRMED — no outcome grants merge authority and no GitHub, process-launch,
  polling, or merge surface exists (`learning-playground/scripts/pr-wake-claim.mjs:84`,
  `learning-playground/scripts/pr-wake-claim.mjs:391`).
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
  busy, enforces capacity, and exclusively publishes one active token
  (`learning-playground/scripts/pr-wake-claim.mjs:100`).
- Completion writes a durable replay receipt before releasing the head;
  abandonment releases without a receipt; both recover their own interrupted
  transition markers (`learning-playground/scripts/pr-wake-claim.mjs:136`,
  `learning-playground/scripts/pr-wake-claim.mjs:162`).
- State paths are digest-derived under a private canonical root; records are
  read through bounded descriptors and published only after full write/fsync
  (`learning-playground/scripts/pr-wake-claim.mjs:176`,
  `learning-playground/scripts/pr-wake-claim.mjs:210`,
  `learning-playground/scripts/pr-wake-claim.mjs:330`,
  `learning-playground/scripts/pr-wake-claim.mjs:356`).
- Thirty-four tests attack both sides of ownership, replay, token, transition,
  malformed-state, symlink, permission, capacity, exit, and real-process race
  boundaries (`learning-playground/tests/scripts/pr-wake-claim.test.ts:27`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:135`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:222`).

### Contract Traceability

- Claim identity and acquire: contract lines 22-42; runtime lines 100-133;
  tests lines 27-75 and 250-257.
- Complete/abandon and interrupted transitions: contract lines 44-54; runtime
  lines 136-174 and 223-260; tests lines 77-131 and 259-268.
- Filesystem safety/resource boundary: contract lines 10-20 and 39-42; runtime
  lines 176-220 and 330-380; tests lines 135-219.
- Output/authority boundary: contract lines 56-67; runtime lines 84-97 and
  383-399; tests lines 222-248.
- Durable enrollment: `learning-playground/scripts/check-work-contract.mjs:272`.

### Verification

- `npx vitest run tests/scripts/pr-wake-claim.test.ts` — 34 passed.
- `npm test` — 53 files / 629 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:viewport` — 6 browser scenarios passed.
- `node scripts/check-work-contract.mjs` — passed.
- `git diff --check` — passed.
- No GitHub event, worker, review/thread, ruleset, or merge mutation was performed
  by this slice's runtime or tests.
