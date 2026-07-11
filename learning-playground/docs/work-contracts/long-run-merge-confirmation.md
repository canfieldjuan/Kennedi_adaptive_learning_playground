# Long-Run Scheduled Merge Confirmation

## Before Code

### Root Cause

Issue #54 requires a scheduled wake to re-prove all current-head merge gates
without allowing an event wake or watcher to merge. The repository now has a
live readiness-proof producer and an attention-only event consumer, but no
scheduled-only consumer converts a complete proof into a bounded confirmation
report. An external worker would otherwise have to interpret `ready` directly
or reuse the event classifier, leaving the scheduled boundary implicit.

### Correct Fix Must Touch

- `docs/contracts/pr-merge-confirmation.contract.md` must define the scheduled
  source, trusted proof, decision precedence, output/exit schema, and absolute
  no-authority/no-merge boundary.
- `scripts/pr-merge-confirmation.mjs` must provide a dependency-free stdin CLI
  and exported test seam that:
  - requires `--wake-source scheduled` plus the owned repository, PR number,
    and persisted expected head;
  - reuses the complete readiness-proof validator;
  - rejects a proof whose repository, PR, head, or observation timestamp does
    not match the owned command inputs;
  - reports `ready` only for a fully ready proof;
  - distinguishes complete non-readiness, producer errors, terminal PR state,
    and malformed/contradictory input;
  - caps stdin at 2 MiB; and
  - hard-codes `merge_authorized=false` in every output.
- `tests/scripts/pr-merge-confirmation.test.ts` must prove ready/non-ready/error/
  terminal behavior, exact source rejection, full proof validation, resource
  caps, exit codes, and the no-authority invariant.
- `scripts/check-work-contract.mjs` must enroll the durable contract, runtime
  safety markers, mutation prohibitions, and dedicated boundary tests.
- This work contract must preserve the slice boundary and contain the cold diff
  audit.

### Must Not Change

- Do not edit the readiness producer/proof contract/tests or the attention
  consumer/contract/tests except to consume their existing exported validator.
- Do not edit workflows, `AGENTS.md`, the long-running-slice contract/template,
  product application source, games, graphics, content, version, dependencies,
  package files, or lockfile.
- Do not modify, copy, delete, rename, or claim the shared checkout's untracked
  `.github/workflows/pr-review-wake.yml` draft.
- Do not add GitHub/network calls, tokens, session-state reads, event listeners,
  polling, workflow dispatch, process launch, subscription/thread/review writes,
  branch/ruleset mutation, merge commands, authority inputs, persistent
  snapshots, cleanup, or queue/next-slice selection.
- Expected-head merge execution, receipt recording, duplicate-wake locking,
  workflow/event wiring, and the disposable overnight arc remain later work.

### Acceptance Standard

- One bounded proof plus the explicit scheduled source and ownership identity produces one
  schema-versioned confirmation decision without network, subprocess, or
  filesystem writes.
- A fully ready proof reports `ready_for_guarded_merge=true` while keeping
  `merge_authorized=false`.
- Complete non-ready evidence reports `not_ready`; producer errors and invalid,
  incomplete, stale, or contradictory proofs fail closed as `error`.
- Stable closed/merged state reports `terminal` before readiness.
- Event wake sources and unexpected arguments are rejected.
- Every valid/error output sets `merge_authorized=false`.
- Dedicated tests, full tests, typecheck, build, viewport tests, the contract
  checker, and `git diff --check` pass without touching non-scope.

## Contract Amendments

### 2026-07-10 ownership-binding correction

- Cold adversarial review found that a structurally ready proof alone is not
  tied to the active session's repository and PR. A proof from another lane
  could otherwise produce a false confirmation report.
- The scheduled command must require repository, PR number, and expected head
  inputs and reject any non-error proof whose identity or observation timestamp
  is missing, malformed, or different.
- These identifiers bind the report but cannot carry merge authority. All
  original no-network/no-subprocess/no-mutation boundaries remain unchanged.

### 2026-07-10 contract-schema review correction

- Live review threads `PRRT_kwDOTPmar86QC0-i` and
  `PRRT_kwDOTPmar86QC0-n` found two documentation claims that exceeded the
  runtime schema: a second proof-head output field and unconditional identity/
  timestamp evidence on producer error proofs.
- The output contract must describe the single accepted expected-head field,
  which is verified against every non-error proof, plus the proof observation
  timestamp when available.
- The trusted-input contract must preserve the readiness-proof producer's
  explicit error boundary: unavailable identity/timestamp evidence may be
  omitted from an error proof, which remains blocked and bound to command-input
  identifiers in the confirmation output.
- Runtime behavior and all no-authority/no-mutation boundaries remain unchanged.

## Cold Diff Audit

### Gaps

- CONFIRMED — contract requirement not delivered: none. The scheduled source,
  owned repository/PR/head binding, complete shared proof validation, bounded
  stdin, ready/non-ready/error/terminal decisions, and no-authority invariant
  are implemented (`learning-playground/scripts/pr-merge-confirmation.mjs:21`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:53`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:114`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:157`).
- CONFIRMED — the review contract/schema mismatches are corrected: non-error
  ownership evidence is mandatory and verified, producer error proofs may omit
  unavailable evidence while remaining blocked, and the output schema claims
  only fields the runtime emits
  (`learning-playground/docs/contracts/pr-merge-confirmation.contract.md:11`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:53`).
- CONFIRMED — effect-controlling boundary reaches the result: only
  `proof.ready` after `parseReadinessProof` and exact ownership validation can
  set `ready_for_guarded_merge=true`; every base and error output hard-codes
  `merge_authorized=false`
  (`learning-playground/scripts/pr-merge-confirmation.mjs:53`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:63`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:93`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:142`).
- CONFIRMED — protected/non-scope surface touched: none. The diff is confined
  to the confirmation contract, pure CLI, dedicated tests, contract enrollment,
  and this work contract.
- COULD NOT DETERMINE — no repository-owned workflow invokes this scheduled
  consumer. Workflow wiring, duplicate-wake serialization, operator authority,
  and merge execution remain explicit non-scope
  (`learning-playground/docs/contracts/pr-merge-confirmation.contract.md:81`).
- COULD NOT DETERMINE — proof clock age alone cannot establish freshness. The
  scheduled worker must run the live producer for the recorded PR/head and pipe
  that current proof into this consumer; the consumer validates the proof's
  observation timestamp and identity but makes no network call
  (`learning-playground/scripts/pr-merge-confirmation.mjs:157`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:75`).

### Change By Change Reconstruction

- CONFIRMED — the durable contract defines exact trusted identifiers, decision
  precedence, the full ready boundary, output/exit schemas, and no-resource/
  no-mutation behavior
  (`learning-playground/docs/contracts/pr-merge-confirmation.contract.md:9`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:22`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:37`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:49`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:64`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:75`,
  `learning-playground/docs/contracts/pr-merge-confirmation.contract.md:81`).
- CONFIRMED — CLI parsing accepts only the scheduled source and validates one
  repository, positive PR number, and exact SHA; duplicates, omissions, event
  sources, authority flags, and malformed values fail closed
  (`learning-playground/scripts/pr-merge-confirmation.mjs:21`).
- CONFIRMED — non-error proofs must match the owned repository, PR, expected
  head, and contain a valid observation timestamp before classification
  (`learning-playground/scripts/pr-merge-confirmation.mjs:157`).
- CONFIRMED — stable closed/merged state stops first, producer errors block,
  fully ready proofs only report readiness, and complete non-ready proofs return
  to waiting (`learning-playground/scripts/pr-merge-confirmation.mjs:66`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:82`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:93`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:104`).
- CONFIRMED — stdin uses the existing 2 MiB bounded reader and full proof
  validator; the runtime has no network, token, subprocess, persistence, or
  mutation implementation (`learning-playground/scripts/pr-merge-confirmation.mjs:4`,
  `learning-playground/scripts/pr-merge-confirmation.mjs:114`).
- CONFIRMED — the contract gate enrolls required markers, dedicated boundary
  tests, and forbidden network/authority/mutation strings
  (`learning-playground/scripts/check-work-contract.mjs:198`).

### Contract Traceability

- Scheduled-only ownership-bound input: runtime lines 21-50; tests lines 75-116.
- Full readiness proof and identity validation: runtime lines 53-54 and 157-179;
  tests lines 99-166.
- Ready/non-ready/error/terminal decisions: runtime lines 66-111; tests lines
  17-73 and 169-195.
- No merge authority: runtime lines 55-64 and 130-145; tests lines 17-73 and
  169-195.
- Resource cap and malformed input: runtime lines 114-147; tests lines 118-166
  and 185-195.
- Durable safety enrollment: contract checker lines 198-260.

### Verification

- `npx vitest run tests/scripts/pr-merge-confirmation.test.ts` — 29 passed.
- `npm test` — 50 files / 552 tests passed.
- `npm run typecheck` — passed.
- `npm run build` — passed.
- `npm run test:viewport` — 6 browser scenarios passed.
- `node scripts/check-work-contract.mjs` — passed.
- Live producer-to-consumer probe against merged PR #70 — producer exited `1`
  with current terminal evidence; confirmation emitted `terminal`, kept merge
  unauthorized, and exited `3`.
- Forbidden-effect scan — no network, token, mutation, subprocess, merge, or
  filesystem-write marker in the runtime.
- `git diff --check` — passed.
