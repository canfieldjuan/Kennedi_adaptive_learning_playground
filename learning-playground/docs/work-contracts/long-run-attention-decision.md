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

## Cold Diff Audit

### Gaps

- CONFIRMED — the review found three blocking gaps in the first implementation:
  incomplete non-ready pagination could wait, stale or contradictory non-ready
  evidence could wait, and successful required-result summaries were not
  reconciled with raw contexts. The correction now rejects incomplete evidence
  (`learning-playground/scripts/pr-attention.mjs:98`), derives attention from
  contradictory evidence (`learning-playground/scripts/pr-attention.mjs:271`),
  and recomputes every summarized result (`learning-playground/scripts/pr-attention.mjs:347`).
- CONFIRMED — contract requirement still not delivered after correction: none.
  Regression coverage exercises stale and contradictory waiting evidence,
  incomplete pagination, row counts, raw success, and app-id matching
  (`learning-playground/tests/scripts/pr-attention.test.ts:46`,
  `learning-playground/tests/scripts/pr-attention.test.ts:233`,
  `learning-playground/tests/scripts/pr-attention.test.ts:245`,
  `learning-playground/tests/scripts/pr-attention.test.ts:276`).
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
  (`learning-playground/scripts/pr-attention.mjs:29`).
- CONFIRMED — schema parsing caps input at 2 MiB and rejects incomplete,
  unsupported, duplicate, inconsistent, non-paginated, or contradictory proof
  input before classification and verifies summarized required-check results
  against raw contexts (`learning-playground/scripts/pr-attention.mjs:39`,
  `learning-playground/scripts/pr-attention.mjs:98`,
  `learning-playground/scripts/pr-attention.mjs:347`).
- CONFIRMED — decision precedence stops stable terminal PRs, makes
  push/review/comment attention-only, maps producer errors to attention,
  derives attention from stale/contradictory evidence even when failure codes
  omit it, reports complete ready checks without merge authority, and delegates
  only pending-only proofs to waiting (`learning-playground/scripts/pr-attention.mjs:142`,
  `learning-playground/scripts/pr-attention.mjs:271`).
- CONFIRMED — streaming stdin is bounded before concatenation and the CLI emits
  schema-v1 decisions with exits `0`/`1`/`2`/`3`
  (`learning-playground/scripts/pr-attention.mjs:203`,
  `learning-playground/scripts/pr-attention.mjs:217`,
  `learning-playground/scripts/pr-attention.mjs:301`).
- CONFIRMED — pending classification requires matching required rows and known
  pending context states; missing, terminal, unknown, or contradictory check
  evidence becomes attention or input error
  (`learning-playground/scripts/pr-attention.mjs:252`,
  `learning-playground/scripts/pr-attention.mjs:308`,
  `learning-playground/scripts/pr-attention.mjs:328`,
  `learning-playground/scripts/pr-attention.mjs:347`).
- CONFIRMED — 52 dedicated tests cover direct-event precedence, stale and
  contradictory evidence, pending and terminal checks, terminal PRs, ready
  reporting, completeness, context/result reconciliation, app-id boundaries,
  schema/resource rejection, and every exit with merge unauthorized
  (`learning-playground/tests/scripts/pr-attention.test.ts:9`,
  `learning-playground/tests/scripts/pr-attention.test.ts:35`,
  `learning-playground/tests/scripts/pr-attention.test.ts:46`,
  `learning-playground/tests/scripts/pr-attention.test.ts:130`,
  `learning-playground/tests/scripts/pr-attention.test.ts:233`,
  `learning-playground/tests/scripts/pr-attention.test.ts:245`,
  `learning-playground/tests/scripts/pr-attention.test.ts:276`,
  `learning-playground/tests/scripts/pr-attention.test.ts:317`).
- CONFIRMED — the contract checker requires the durable contract, runtime safety
  markers, original behavior tests, and the review-driven boundary tests while
  rejecting network, mutation, merge, file-write, and process-launch surfaces
  (`learning-playground/scripts/check-work-contract.mjs:158`,
  `learning-playground/scripts/check-work-contract.mjs:173`,
  `learning-playground/scripts/check-work-contract.mjs:198`).

### Contract Traceability

- CONFIRMED — event precedence and the no-merge output trace directly to Root
  Cause and Acceptance Standard (`learning-playground/scripts/pr-attention.mjs:142`).
- CONFIRMED — pending-versus-failed check classification traces to Correct Fix
  Must Touch (`learning-playground/scripts/pr-attention.mjs:252`).
- CONFIRMED — complete-proof validation, input cap, and error exit trace to the
  trusted-input/resource boundary
  (`learning-playground/scripts/pr-attention.mjs:39`,
  `learning-playground/scripts/pr-attention.mjs:203`,
  `learning-playground/scripts/pr-attention.mjs:217`).
- CONFIRMED — no workflow, GitHub/network, dispatch, process, filesystem-write,
  subscription, review/thread, branch/ruleset, queue, merge, product, package,
  PR #69, or shared wake-draft surface was added; the runtime imports only
  Node's URL helper (`learning-playground/scripts/pr-attention.mjs:3`).

### Verification

- PASS — `npx vitest run tests/scripts/pr-attention.test.ts`: 52 dedicated tests
  (`learning-playground/tests/scripts/pr-attention.test.ts:8`).
- PASS — `npm test`: contract enrollment plus 464 tests across 49 files; command
  composition is defined at `learning-playground/package.json:11` and
  `learning-playground/package.json:12`.
- PASS — `npm run test:viewport`: 6 browser scenarios; command is defined at
  `learning-playground/package.json:13`.
- PASS — `npm run typecheck` and `npm run build`; commands are defined at
  `learning-playground/package.json:8` and `learning-playground/package.json:10`.
- PASS — the merged live readiness producer piped into this CLI for PR #69; a
  check wake emitted `attention` for `base_not_current` and
  `merge_state_not_clean` with `merge_authorized=false`, as controlled at
  `learning-playground/scripts/pr-attention.mjs:142`.
- PASS — a temporary forbidden `fetch(` marker made the contract checker fail
  on the intended network boundary (`learning-playground/scripts/check-work-contract.mjs:184`,
  `learning-playground/scripts/check-work-contract.mjs:283`) and was removed
  before the final diff (`learning-playground/scripts/pr-attention.mjs:1`).
- PASS — `git diff --check` completed without error across the five contracted
  files (`learning-playground/docs/work-contracts/long-run-attention-decision.md:18`).
- CONFIRMED — no P1/P2 finding remains after the security, data-integrity,
  concurrency, contract, resource, validator, and effect-claim audit; the
  fail-closed boundaries are implemented at
  `learning-playground/scripts/pr-attention.mjs:39`,
  `learning-playground/scripts/pr-attention.mjs:142`,
  `learning-playground/scripts/pr-attention.mjs:203`, and
  `learning-playground/scripts/pr-attention.mjs:347`.
