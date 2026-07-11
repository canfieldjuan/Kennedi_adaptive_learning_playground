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

### 2026-07-10 second live review correction

- Threads `PRRT_kwDOTPmar86QDjxd`, `PRRT_kwDOTPmar86QDjxe`, and
  `PRRT_kwDOTPmar86QDjxf` confirmed three more P2 boundaries: an old completed
  wake retry rejected a newer active owner, deterministic temporary-file
  contention was misclassified as a published-record collision, and crashes in
  the reservation-to-active gap could strand all capacity slots.
- The correction makes a matching receipt authoritative without touching a
  newer active owner, distinguishes temporary contention from a published
  record, and records publisher PIDs so only provably dead and ownerless slot
  reservations can be reclaimed through an inode-stable orphan link. The
  orphan cleanup removes the reservation's slot-keyed active-publication
  residue before permitting slot reuse.
- Live publishers, active/completed/transition owners, unknown process state,
  merge authority, workflow wiring, and every prior non-scope remain fail
  closed.

### 2026-07-10 third live review correction

- Threads `PRRT_kwDOTPmar86QDxVl`, `PRRT_kwDOTPmar86QDxVm`,
  `PRRT_kwDOTPmar86QDxVo`, `PRRT_kwDOTPmar86QDxVp`, and
  `PRRT_kwDOTPmar86QDxVr` confirmed five more P2 boundaries: abandon released
  its slot before removing the blocking marker, slot release could strand an
  active-publication temp, deterministic temps had no crash-owner recovery,
  completion could lose an active/receipt race, and shared transitions took
  precedence over exact replay receipts.
- The correction keeps the abandon slot through marker cleanup, removes owned
  publication residue before completing an inode-stable release quarantine,
  gives every bounded publication path an atomic PID-and-nonce lock with
  dead-owner recovery, retries completion state observation, and gives exact
  receipts precedence over shared markers.
- Live or malformed publication ownership, stale active-claim takeover, merge
  authority, workflow wiring, and every prior non-scope remain fail closed.

## Cold Diff Audit

### Gaps

- CONFIRMED — no P1/P2 remains in the contracted claim primitive. Exact input
  identity, private canonical state, atomic publication, token-bound
  transitions, replay receipts, and bounded reads/growth gate every successful
  decision (`learning-playground/scripts/pr-wake-claim.mjs:34`,
  `learning-playground/scripts/pr-wake-claim.mjs:100`,
  `learning-playground/scripts/pr-wake-claim.mjs:258`,
  `learning-playground/scripts/pr-wake-claim.mjs:299`,
  `learning-playground/scripts/pr-wake-claim.mjs:657`).
- CONFIRMED — concurrency is controlled by exclusive hard-link publication for
  active/capacity records and a second exclusive transition marker for
  completion or abandonment (`learning-playground/scripts/pr-wake-claim.mjs:127`,
  `learning-playground/scripts/pr-wake-claim.mjs:299`,
  `learning-playground/scripts/pr-wake-claim.mjs:360`,
  `learning-playground/scripts/pr-wake-claim.mjs:692`).
- CONFIRMED — all three live-review paths are closed: same-token/action retries
  validate and resume existing transitions, capacity admission uses one of
  4,096 atomically exclusive slots, and lstat presence checks expose dangling
  paths to bounded no-follow reads (`learning-playground/scripts/pr-wake-claim.mjs:102`,
  `learning-playground/scripts/pr-wake-claim.mjs:312`,
  `learning-playground/scripts/pr-wake-claim.mjs:360`).
- CONFIRMED — the second three live-review paths are closed: completed retries
  return from their exact receipt without mutating a newer active owner,
  temporary contention cannot masquerade as a published record, and dead-publisher
  capacity reservations and their active-publication residue are reclaimed only
  when no final owner path exists
  (`learning-playground/scripts/pr-wake-claim.mjs:158`,
  `learning-playground/scripts/pr-wake-claim.mjs:360`,
  `learning-playground/scripts/pr-wake-claim.mjs:502`,
  `learning-playground/scripts/pr-wake-claim.mjs:532`,
  `learning-playground/scripts/pr-wake-claim.mjs:692`).
- CONFIRMED — the third five live-review paths are closed: exact replay receipts
  precede shared markers, completion rechecks state after a lost active read,
  abandon quarantines its exact slot through marker cleanup, owned residue is
  removed without touching a successor, and PID-and-nonce publication locks
  recover only provably dead owners (`learning-playground/scripts/pr-wake-claim.mjs:102`,
  `learning-playground/scripts/pr-wake-claim.mjs:158`,
  `learning-playground/scripts/pr-wake-claim.mjs:217`,
  `learning-playground/scripts/pr-wake-claim.mjs:419`,
  `learning-playground/scripts/pr-wake-claim.mjs:731`,
  `learning-playground/scripts/pr-wake-claim.mjs:754`).
- CONFIRMED — no outcome grants merge authority and no GitHub, process-launch,
  polling, or merge surface exists (`learning-playground/scripts/pr-wake-claim.mjs:84`,
  `learning-playground/scripts/pr-wake-claim.mjs:827`).
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
  `learning-playground/scripts/pr-wake-claim.mjs:360`).
- Completion writes a durable replay receipt before releasing the head;
  abandonment releases without a receipt; both recover their own interrupted
  transition markers (`learning-playground/scripts/pr-wake-claim.mjs:158`,
  `learning-playground/scripts/pr-wake-claim.mjs:217`,
  `learning-playground/scripts/pr-wake-claim.mjs:299`).
- State paths are digest-derived under a private canonical root; records are
  read through bounded descriptors and published only after full write/fsync
  (`learning-playground/scripts/pr-wake-claim.mjs:258`,
  `learning-playground/scripts/pr-wake-claim.mjs:280`,
  `learning-playground/scripts/pr-wake-claim.mjs:657`,
  `learning-playground/scripts/pr-wake-claim.mjs:692`).
- Fifty-six tests attack both sides of ownership, replay, token, transition,
  malformed-state, symlink, permission, capacity, exit, and real-process race
  boundaries (`learning-playground/tests/scripts/pr-wake-claim.test.ts:27`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:135`,
  `learning-playground/tests/scripts/pr-wake-claim.test.ts:222`).

### Contract Traceability

- Claim identity and acquire: contract lines 28-50; runtime lines 100-156 and
  360-568; tests lines 29-128 and 516-546.
- Complete/abandon and interrupted transitions: contract lines 52-72; runtime
  lines 158-256 and 299-358; tests lines 72-316 and 548-578.
- Filesystem safety/resource boundary: contract lines 10-26 and 38-50; runtime
  lines 258-297, 360-568, and 657-825; tests lines 129-484 and 516-546.
- Output/authority boundary: contract lines 74-85; runtime lines 84-97 and
  827-843; tests lines 485-515.
- Durable enrollment: `learning-playground/scripts/check-work-contract.mjs:272`.

### Verification

- `npx vitest run tests/scripts/pr-wake-claim.test.ts` — 56 passed.
- `npm test` — 53 files / 652 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:viewport` — 6 browser scenarios passed.
- `node scripts/check-work-contract.mjs` — passed.
- `git diff --check` — passed.
- No GitHub event, worker, review/thread, ruleset, or merge mutation was performed
  by this slice's runtime or tests.
