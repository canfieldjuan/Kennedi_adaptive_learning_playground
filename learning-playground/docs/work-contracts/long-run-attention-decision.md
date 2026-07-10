# Long-Run One-Shot Attention Decision

## Before Code

### Root Cause

Issue #54 requires cheap event wakes for new commits, review activity, failed
checks, and contradictory state, while forbidding event-triggered merge. The
repository now emits a complete exact-head readiness proof, but no tracked
consumer maps an explicit event source plus that proof to `attention`,
`waiting`, or `terminal`. A wake bridge would otherwise have to duplicate the
predicate or could treat a green check event as merge authority.

The shared checkout's untracked `.github/workflows/pr-review-wake.yml` remains a
summary-only draft owned by another working surface. It does not consume the
readiness proof and is not available to this isolated branch.

### Correct Fix Must Touch

- `docs/contracts/pr-attention-decision.contract.md` must define trusted proof
  input, allowed event sources, decision precedence, output schema, exit codes,
  and the absolute no-merge/no-dispatch boundary.
- `scripts/pr-attention.mjs` must provide a dependency-free Node CLI and
  exported test seam that:
  - accepts exactly one event source (`push`, `review`, `comment`, or `check`);
  - reads exactly one schema-v1 `kennedi.pr-readiness` proof from stdin;
  - stops for terminal PR state before considering event attention;
  - treats push/review/comment as attention even when checks are pending or the
    proof is otherwise ready;
  - treats proof errors, stale/changed/contradictory state, unresolved review
    state, policy/check failures, and terminal check conclusions as attention;
  - treats only pending required checks as waiting;
  - reports a complete `ready=true` check wake as ready for a later scheduled
    confirmation while remaining in `waiting` with merge unauthorized;
  - rejects malformed/oversized input and never reads tokens or calls GitHub.
- `tests/scripts/pr-attention.test.ts` must prove event precedence, pending versus
  failed checks, error/contradiction handling, terminal PR behavior, ready
  reporting, malformed/oversized proof rejection, all exit codes, and an
  invariant that every output has `merge_authorized=false`.
- `scripts/check-work-contract.mjs` must enroll the durable attention contract,
  runtime safety markers, and dedicated tests in the existing contract gate.
- This work contract must preserve the slice boundary and contain the cold diff
  audit.

### Must Not Change

- Do not touch PR #69's roadmap, baseline, package/lockfile, content activities,
  curriculum/catalog, or product/browser/contract/module tests.
- Do not modify, copy, delete, rename, or claim the shared checkout's untracked
  `.github/workflows/pr-review-wake.yml` draft.
- Do not edit workflows, `AGENTS.md`, the long-running-slice contract/template,
  the readiness producer/proof contract/tests, application source, games,
  graphics, content, version, dependencies, or lockfile.
- Do not add GitHub/network calls, event listeners, polling, workflow dispatch,
  worker launch, subscription mutation, thread/review writes, branch/ruleset
  mutation, merge commands, persistent snapshots, or queue/next-slice selection.
- Duplicate-wake serialization, workflow/event wiring, scheduled merge
  confirmation, expected-head merge execution, and the disposable overnight arc
  remain later slices.

### Acceptance Standard

- One bounded stdin proof plus one explicit event source produces one
  schema-versioned JSON attention decision without network or filesystem writes.
- Closed/merged state produces `terminal` before any event precedence.
- Push, review, and comment sources produce `attention` and can never produce a
  merge-ready or merge-authorized decision.
- Check wakes produce:
  - `attention` for failed/missing/contradictory/error proof state;
  - `waiting` for only pending required checks;
  - `waiting` plus `ready_for_scheduled_confirmation=true` for `ready=true`.
- Every valid output sets `merge_authorized=false`; scheduled is not an accepted
  event source.
- Exit `0` means attention, exit `1` means waiting/report-ready, exit `2` means
  malformed input/proof, and exit `3` means terminal.
- `npm test`, targeted attention tests, `npm run typecheck`, `npm run build`,
  `npm run test:viewport`, and `git diff --check` pass without touching PR #69
  or the shared wake draft.

## Contract Amendments

### 2026-07-10 review-feedback correction

- Live review threads `PRRT_kwDOTPmar86P-rOH`, `PRRT_kwDOTPmar86P-rOJ`, and
  `PRRT_kwDOTPmar86P-rOO` prove that the first implementation does not enforce
  the contract's complete-and-consistent evidence boundary for every non-error
  proof.
- The correction remains within the original required surfaces: strengthen
  `scripts/pr-attention.mjs`, add regression coverage in
  `tests/scripts/pr-attention.test.ts`, enroll the new boundary tests in
  `scripts/check-work-contract.mjs`, and refresh this cold audit.
- Correct behavior must reject incomplete check or thread pagination, prevent
  stale or contradictory non-ready evidence from entering `waiting`, and
  reconcile every summarized required-check result with its matching raw check
  contexts before readiness or waiting can be reported.
- The Must Not Change list and all no-merge/no-network/no-mutation boundaries
  remain unchanged.

### 2026-07-10 full-predicate review correction

- Live current-head review threads `PRRT_kwDOTPmar86P_F7n`,
  `PRRT_kwDOTPmar86P_F7p`, `PRRT_kwDOTPmar86P_F7s`,
  `PRRT_kwDOTPmar86P_F7w`, and `PRRT_kwDOTPmar86P_F70` prove that the consumer
  still accepts five contradictory projections of the readiness proof as
  `waiting`.
- The correction must validate every proof field that controls the producer's
  ready predicate: complete initial/final PR and base state, normalized policy
  requirements, required-result coverage, review-thread identity/counts, and
  coherent check status/conclusion pairs.
- Waiting must be derived from reconciled evidence as well as failure codes. A
  draft-only summary cannot hide a failed required row, and stale base,
  changes-requested, conflict, dirty/unknown merge state, or incomplete policy
  evidence cannot enter `waiting` or `report_ready`.
- The correction remains confined to the attention runtime, its dedicated
  tests, contract-test enrollment, and this cold audit. The readiness producer,
  its contract/tests, workflows, merge runtime, and all prior non-scope remain
  unchanged.

### 2026-07-10 schema-domain review correction

- Live current-head review threads `PRRT_kwDOTPmar86QALIY`,
  `PRRT_kwDOTPmar86QALIh`, `PRRT_kwDOTPmar86QALIn`, and
  `PRRT_kwDOTPmar86QALIr` prove four remaining schema-domain gaps: truncated
  policy-source summaries, unknown PR enum values, impossible thread totals for
  the reported page count, and page counts beyond the producer cap.
- The correction must validate the producer's exact normalized policy-source
  fields and numeric relationships, GitHub's legal pull-request enum domains,
  the hard 100-page limit, and the 100-item upper bound per review-thread page.
- Positive boundaries must remain accepted: page counts 1 and 100, a thread
  total equal to `pages * 100`, every legal non-ready PR enum, and complete
  normalized policy-source evidence.
- The correction remains confined to the attention runtime, its dedicated
  tests, contract-test enrollment, and this audit; all prior non-scope remains
  unchanged.

## Cold Diff Audit

### Gaps

- CONFIRMED — the first review's three gaps remain addressed: incomplete
  pagination is rejected, stale/contradictory evidence is derived independently
  of summary codes, and policy results are reconciled with raw contexts
  (`learning-playground/scripts/pr-attention.mjs:59`,
  `learning-playground/scripts/pr-attention.mjs:292`,
  `learning-playground/scripts/pr-attention.mjs:565`).
- CONFIRMED — the second review's five gaps remain addressed: full PR/base/policy
  state controls ready and waiting, draft-only summaries cannot hide failed rows,
  policy/result coverage is exact, thread ids/counts reconcile, and pending
  statuses cannot carry terminal conclusions
  (`learning-playground/scripts/pr-attention.mjs:271`,
  `learning-playground/scripts/pr-attention.mjs:292`,
  `learning-playground/scripts/pr-attention.mjs:396`,
  `learning-playground/scripts/pr-attention.mjs:474`,
  `learning-playground/scripts/pr-attention.mjs:526`,
  `learning-playground/scripts/pr-attention.mjs:542`).
- CONFIRMED — the third review's four gaps are addressed: normalized policy
  source fields/counts are complete, PR enums are restricted to GitHub's legal
  domains, all producer page counts are capped at 100, and check/thread counts
  cannot exceed page capacity (`learning-playground/scripts/pr-attention.mjs:8`,
  `learning-playground/scripts/pr-attention.mjs:396`,
  `learning-playground/scripts/pr-attention.mjs:432`,
  `learning-playground/scripts/pr-attention.mjs:542`).
- CONFIRMED — contract requirement still not delivered after all three review
  corrections: none. Tests probe both sides of every reviewed boundary,
  including valid pending check runs/statuses, legal blocking enums, maximum
  policy/check/thread pages and counts, draft/empty-policy evidence, app-id
  matching, and coherent unresolved threads
  (`learning-playground/tests/scripts/pr-attention.test.ts:37`,
  `learning-playground/tests/scripts/pr-attention.test.ts:49`,
  `learning-playground/tests/scripts/pr-attention.test.ts:234`,
  `learning-playground/tests/scripts/pr-attention.test.ts:243`,
  `learning-playground/tests/scripts/pr-attention.test.ts:356`,
  `learning-playground/tests/scripts/pr-attention.test.ts:381`,
  `learning-playground/tests/scripts/pr-attention.test.ts:406`,
  `learning-playground/tests/scripts/pr-attention.test.ts:438`,
  `learning-playground/tests/scripts/pr-attention.test.ts:483`,
  `learning-playground/tests/scripts/pr-attention.test.ts:503`,
  `learning-playground/tests/scripts/pr-attention.test.ts:616`).
- CONFIRMED — protected surface touched: none. The diff is confined to the
  attention contract (`learning-playground/docs/contracts/pr-attention-decision.contract.md:1`),
  attention CLI (`learning-playground/scripts/pr-attention.mjs:1`), its tests
  (`learning-playground/tests/scripts/pr-attention.test.ts:1`), contract checker
  (`learning-playground/scripts/check-work-contract.mjs:158`), and this work
  contract (`learning-playground/docs/work-contracts/long-run-attention-decision.md:1`).
- COULD NOT DETERMINE — no repository-owned event workflow currently invokes
  this one-shot consumer. Workflow/event wiring and duplicate-wake locking are
  explicit later slices (`learning-playground/docs/contracts/pr-attention-decision.contract.md:78`),
  so this is not represented as delivered by the current diff.

### Change By Change Reconstruction

- CONFIRMED — the attention contract defines bounded trusted input, decision
  precedence, pending-versus-failed checks, schema, exit codes, resource cap,
  and no-mutation boundary
  (`learning-playground/docs/contracts/pr-attention-decision.contract.md:10`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:20`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:39`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:49`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:64`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:73`,
  `learning-playground/docs/contracts/pr-attention-decision.contract.md:78`).
- CONFIRMED — the CLI accepts only push/review/comment/check and rejects
  scheduled or malformed argument shapes
  (`learning-playground/scripts/pr-attention.mjs:49`).
- CONFIRMED — schema parsing caps input at 2 MiB and rejects incomplete,
  unsupported, duplicate, inconsistent, non-paginated, or contradictory proof
  input before classification; it validates legal PR enums, normalized policy
  sources/requirements, exact policy/result/context coverage, coherent check
  status/conclusion pairs, pagination caps/capacity, and thread summaries
  (`learning-playground/scripts/pr-attention.mjs:59`,
  `learning-playground/scripts/pr-attention.mjs:396`,
  `learning-playground/scripts/pr-attention.mjs:416`,
  `learning-playground/scripts/pr-attention.mjs:432`,
  `learning-playground/scripts/pr-attention.mjs:474`,
  `learning-playground/scripts/pr-attention.mjs:526`,
  `learning-playground/scripts/pr-attention.mjs:542`,
  `learning-playground/scripts/pr-attention.mjs:565`).
- CONFIRMED — decision precedence stops stable terminal PRs, makes
  push/review/comment attention-only, maps producer errors to attention,
  derives the producer's complete blocking predicate independently of failure
  codes, reports only a complete ready proof without merge authority, and
  delegates only coherent pending rows/draft state to waiting
  (`learning-playground/scripts/pr-attention.mjs:162`,
  `learning-playground/scripts/pr-attention.mjs:271`,
  `learning-playground/scripts/pr-attention.mjs:292`).
- CONFIRMED — streaming stdin is bounded before concatenation and the CLI emits
  schema-v1 decisions with exits `0`/`1`/`2`/`3`
  (`learning-playground/scripts/pr-attention.mjs:222`,
  `learning-playground/scripts/pr-attention.mjs:236`,
  `learning-playground/scripts/pr-attention.mjs:389`).
- CONFIRMED — pending classification requires matching required rows and known
  pending context states with coherent conclusions; missing, terminal, unknown,
  policy-omitted, or contradictory check evidence becomes attention or input
  error (`learning-playground/scripts/pr-attention.mjs:271`,
  `learning-playground/scripts/pr-attention.mjs:351`,
  `learning-playground/scripts/pr-attention.mjs:474`,
  `learning-playground/scripts/pr-attention.mjs:526`,
  `learning-playground/scripts/pr-attention.mjs:565`).
- CONFIRMED — 103 dedicated tests cover direct-event precedence, full
  ready/non-ready PR and base state, all legal/unknown enums, pending check runs
  and commit statuses, normalized policy sources, pagination caps/capacity,
  policy/result/context reconciliation, draft-only failure hiding, thread
  identity/counts, app-id boundaries, terminal PRs, schema/resources, and every
  exit with merge unauthorized
  (`learning-playground/tests/scripts/pr-attention.test.ts:10`,
  `learning-playground/tests/scripts/pr-attention.test.ts:37`,
  `learning-playground/tests/scripts/pr-attention.test.ts:49`,
  `learning-playground/tests/scripts/pr-attention.test.ts:101`,
  `learning-playground/tests/scripts/pr-attention.test.ts:126`,
  `learning-playground/tests/scripts/pr-attention.test.ts:193`,
  `learning-playground/tests/scripts/pr-attention.test.ts:313`,
  `learning-playground/tests/scripts/pr-attention.test.ts:356`,
  `learning-playground/tests/scripts/pr-attention.test.ts:381`,
  `learning-playground/tests/scripts/pr-attention.test.ts:406`,
  `learning-playground/tests/scripts/pr-attention.test.ts:438`,
  `learning-playground/tests/scripts/pr-attention.test.ts:483`,
  `learning-playground/tests/scripts/pr-attention.test.ts:503`,
  `learning-playground/tests/scripts/pr-attention.test.ts:616`,
  `learning-playground/tests/scripts/pr-attention.test.ts:650`).
- CONFIRMED — the contract checker requires the durable contract, runtime safety
  markers, original behavior tests, and the review-driven boundary tests while
  rejecting network, mutation, merge, file-write, and process-launch surfaces
  (`learning-playground/scripts/check-work-contract.mjs:158`,
  `learning-playground/scripts/check-work-contract.mjs:173`,
  `learning-playground/scripts/check-work-contract.mjs:198`).

### Contract Traceability

- CONFIRMED — event precedence and the no-merge output trace directly to Root
  Cause and Acceptance Standard (`learning-playground/scripts/pr-attention.mjs:162`).
- CONFIRMED — pending-versus-failed check classification traces to Correct Fix
  Must Touch and now derives from reconciled rows rather than summary codes
  (`learning-playground/scripts/pr-attention.mjs:271`).
- CONFIRMED — complete-proof validation, input cap, and error exit trace to the
  trusted-input/resource boundary
  (`learning-playground/scripts/pr-attention.mjs:59`,
  `learning-playground/scripts/pr-attention.mjs:222`,
  `learning-playground/scripts/pr-attention.mjs:236`).
- CONFIRMED — no workflow, GitHub/network, dispatch, process, filesystem-write,
  subscription, review/thread, branch/ruleset, queue, merge, product, package,
  PR #69, or shared wake-draft surface was added; the runtime imports only
  Node's URL helper (`learning-playground/scripts/pr-attention.mjs:3`).

### Verification

- PASS — `npx vitest run tests/scripts/pr-attention.test.ts`: 103 dedicated tests
  (`learning-playground/tests/scripts/pr-attention.test.ts:10`).
- PASS — `npm test`: contract enrollment plus 515 tests across 49 files; command
  composition is defined at `learning-playground/package.json:11` and
  `learning-playground/package.json:12`.
- PASS — `npm run test:viewport`: 6 browser scenarios; command is defined at
  `learning-playground/package.json:13`.
- PASS — `npm run typecheck` and `npm run build`; commands are defined at
  `learning-playground/package.json:8` and `learning-playground/package.json:10`.
- PASS — the live readiness producer piped into the corrected CLI for PR #70; a
  check wake accepted the real producer schema and emitted `attention` for
  `base_not_current`, `merge_state_not_clean`, and `review_threads_unresolved`
  with `merge_authorized=false`, as controlled at
  `learning-playground/scripts/pr-attention.mjs:162`.
- PASS — a temporary forbidden `fetch(` marker made the contract checker fail
  on the intended network boundary (`learning-playground/scripts/check-work-contract.mjs:184`,
  `learning-playground/scripts/check-work-contract.mjs:283`) and was removed
  before the final diff (`learning-playground/scripts/pr-attention.mjs:1`).
- PASS — `git diff --check` completed without error across the five contracted
  files (`learning-playground/docs/work-contracts/long-run-attention-decision.md:18`).
- CONFIRMED — no P1/P2 finding remains after the security, data-integrity,
  concurrency, contract, resource, validator, and effect-claim audit; the
  fail-closed boundaries are implemented at
  `learning-playground/scripts/pr-attention.mjs:59`,
  `learning-playground/scripts/pr-attention.mjs:162`,
  `learning-playground/scripts/pr-attention.mjs:222`,
  `learning-playground/scripts/pr-attention.mjs:271`,
  `learning-playground/scripts/pr-attention.mjs:292`, and
  `learning-playground/scripts/pr-attention.mjs:396`.
