# Long-Run Live Readiness Producer

## Before Code

### Root Cause

Issue #54 requires decisions to be tied to one exact PR head, all configured
required checks, every review-thread page, review decision, and clean
mergeability. The repository contract now states those rules and the
`quality-gate` workflow supplies a stable check context, but no tracked runtime
code queries GitHub or emits the current-head proof. A later wake worker would
therefore have only prose or ad hoc CLI output and could accidentally treat an
empty policy, partial pagination, or stale head as ready.

Live repository state also has no branch protection or ruleset. The producer
must represent that as a non-ready empty required-check policy; it must not
silently substitute observed optional checks for server configuration.

### Correct Fix Must Touch

- `docs/contracts/pr-readiness-proof.contract.md` must define the versioned
  proof, trusted inputs, current-head sampling order, ready predicate, failure
  reasons, exit behavior, and explicit lack of GitHub mutation authority.
- `scripts/pr-readiness.mjs` must provide a dependency-free Node 22 CLI and
  exported test seams that:
  - require repository, positive PR number, exact expected head SHA, and a token
    from `GH_TOKEN` or `GITHUB_TOKEN`;
  - discover classic branch-protection and applicable branch-ruleset required
    check contexts without treating observed checks as policy;
  - fetch initial and final PR metadata plus the live base-branch target,
    paginate exact-head check rollups, and paginate every review thread with
    bounded, advancing cursors;
  - count outdated unresolved threads as unresolved;
  - emit a schema-versioned JSON proof and fail closed for missing, malformed,
    contradictory, stale, incomplete, or non-green state;
  - make no GitHub mutation and never accept merge authorization.
- `tests/scripts/pr-readiness.test.ts` must prove the ready path and the second
  side of every important boundary: zero/one unresolved thread,
  outdated-unresolved, more than 100 threads, empty/missing/non-green policy or
  checks, pending/skipped/failed checks, changed head/base, changes requested,
  draft/closed/conflict/unknown merge state, malformed pagination, and API
  failure.
- `scripts/check-work-contract.mjs` must enroll the durable proof contract and
  producer safety markers in the existing contract gate.
- This work contract must preserve the slice boundary and contain the cold diff
  audit.

### Must Not Change

- Do not touch PR #66's roadmap, baseline, difficulty-coverage contract,
  package/lockfile, difficulty core/parent modules, or its contract/core/browser
  tests.
- Do not modify, copy, delete, or claim the shared checkout's untracked
  `.github/workflows/pr-review-wake.yml` draft.
- Do not edit `AGENTS.md`, the long-running-slice contract/template, the
  `quality-gate` workflow, application source, games, graphics, content, version,
  dependencies, or lockfile.
- Do not add event listeners, polling, worker dispatch, subscription mutation,
  merge commands, thread resolution, branch protection, ruleset mutation,
  persistent snapshot files, or automatic next-slice selection.
- Duplicate-wake serialization, scheduled merge execution, branch protection,
  and the disposable end-to-end overnight PR remain later slices. This producer
  only emits the live proof those surfaces must consume.

### Acceptance Standard

- A single CLI run performs bounded read-only GitHub requests and emits proof
  schema version `1` without exposing its token.
- Readiness is false unless the expected head is stable across initial and final
  reads, the PR base and live base-branch SHA are equal and stable, the PR is
  open/non-draft, the required-policy set is non-empty and includes
  `quality-gate`, every required check is present and successful on that exact
  head, every thread page is complete with zero unresolved threads, review
  decision is not changes-requested, and mergeability is known, mergeable, and
  `CLEAN`.
- Classic protection and applicable branch rules are both policy sources;
  missing protection/rules produce a valid non-ready proof, while API or schema
  uncertainty produces an error proof and nonzero exit.
- Ready exits `0`, proven non-ready exits `1`, and producer/input/API failure
  exits `2`.
- The tests cover the issue #54 producer boundaries without changing package
  enrollment or any product/PR #66 surface.
- `npm test`, `npm run typecheck`, `npm run build`, targeted readiness tests,
  and `git diff --check` pass.

## Contract Amendments

- 2026-07-10 — PR #66 merged while this isolated slice was under final audit,
  moving `origin/main` from `0182f3f` to `12d683d`. Its formerly protected paths
  remain absent from this diff; this branch must be rebased onto the new main
  and all repository gates rerun before publication.

## Cold Diff Audit

### Gaps

- CONFIRMED — change without contract trace: none. The five changed files are
  the five implementation surfaces named by the correct-fix boundary
  (`learning-playground/docs/work-contracts/long-run-live-readiness-producer.md:19`).
- CONFIRMED — contract requirement not delivered: none. The durable predicate
  is specified at `learning-playground/docs/contracts/pr-readiness-proof.contract.md:21`,
  the live collector/evaluator is implemented at
  `learning-playground/scripts/pr-readiness.mjs:74`, the required boundaries are
  exercised at `learning-playground/tests/scripts/pr-readiness.test.ts:20`, and
  their enrollment is enforced at
  `learning-playground/scripts/check-work-contract.mjs:113`.
- CONFIRMED — protected surface touched: none. The diff is limited to the proof
  contract (`learning-playground/docs/contracts/pr-readiness-proof.contract.md:1`),
  producer (`learning-playground/scripts/pr-readiness.mjs:1`), producer tests
  (`learning-playground/tests/scripts/pr-readiness.test.ts:1`), contract checker
  (`learning-playground/scripts/check-work-contract.mjs:113`), and this work
  contract (`learning-playground/docs/work-contracts/long-run-live-readiness-producer.md:1`).
- COULD NOT DETERMINE — a live `ready=true` proof cannot exist until server
  policy requires `quality-gate`; the producer intentionally classifies empty
  policy as non-ready (`learning-playground/scripts/pr-readiness.mjs:301`).
  Branch protection and the disposable ready-path PR remain explicit later
  slices (`learning-playground/docs/work-contracts/long-run-live-readiness-producer.md:61`).

### Change By Change Reconstruction

- CONFIRMED — the proof contract defines trusted inputs, two-phase PR/policy
  observation, bounded pagination, policy sources, exact success semantics,
  unresolved-thread handling, ready predicate, versioned JSON, exit codes, and
  the no-mutation boundary
  (`learning-playground/docs/contracts/pr-readiness-proof.contract.md:9`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:21`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:40`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:52`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:75`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:82`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:100`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:118`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:128`).
- CONFIRMED — the CLI accepts only repository/PR/expected-head arguments and
  reads its token from supported environment variables
  (`learning-playground/scripts/pr-readiness.mjs:23`).
- CONFIRMED — the GitHub client applies a 15-second request timeout, sanitizes
  HTTP/GraphQL shape failures, uses the current versioned REST contract, and
  issues only fixed-host REST reads and GraphQL queries
  (`learning-playground/scripts/pr-readiness.mjs:74`,
  `learning-playground/scripts/pr-readiness.mjs:114`).
- CONFIRMED — policy discovery reads classic protection and every bounded page
  of active branch rules (`learning-playground/scripts/pr-readiness.mjs:139`),
  while exact-head checks and review threads use bounded cursor pagination with
  thread total-count and duplicate-id validation
  (`learning-playground/scripts/pr-readiness.mjs:173`,
  `learning-playground/scripts/pr-readiness.mjs:196`,
  `learning-playground/scripts/pr-readiness.mjs:230`).
- CONFIRMED — the evaluator compares initial/final head, PR base, live base tip,
  metadata, and policy; rejects empty/missing/non-green required checks;
  includes outdated unresolved threads; and requires mergeable/CLEAN state
  (`learning-playground/scripts/pr-readiness.mjs:265`).
- CONFIRMED — the CLI emits schema-v1 ready/not-ready/error JSON, returns
  `0`/`1`/`2`, and redacts both supported token values from error messages
  (`learning-playground/scripts/pr-readiness.mjs:365`,
  `learning-playground/scripts/pr-readiness.mjs:589`).
- CONFIRMED — 38 dedicated tests exercise ready and non-ready checks/threads,
  policy and base/head races, pagination failures, policy source pagination,
  input/secret handling, and all three CLI exits
  (`learning-playground/tests/scripts/pr-readiness.test.ts:20`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:68`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:151`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:218`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:240`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:281`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:371`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:396`,
  `learning-playground/tests/scripts/pr-readiness.test.ts:422`).
- CONFIRMED — the existing contract checker now requires the proof/schema,
  runtime safety markers, and boundary-test markers while rejecting mutation,
  merge, file-write, and child-process surfaces
  (`learning-playground/scripts/check-work-contract.mjs:113`,
  `learning-playground/scripts/check-work-contract.mjs:131`,
  `learning-playground/scripts/check-work-contract.mjs:158`).

### Contract Traceability

- CONFIRMED — current-head and live-base race handling traces to Root Cause and
  Correct Fix Must Touch (`learning-playground/scripts/pr-readiness.mjs:265`).
- CONFIRMED — policy inventory, exact-head check evaluation, and complete
  thread pagination trace to Correct Fix Must Touch
  (`learning-playground/scripts/pr-readiness.mjs:139`,
  `learning-playground/scripts/pr-readiness.mjs:173`,
  `learning-playground/scripts/pr-readiness.mjs:196`).
- CONFIRMED — schema/exit/no-authority behavior traces to the proof contract and
  acceptance standard (`learning-playground/docs/contracts/pr-readiness-proof.contract.md:100`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:118`,
  `learning-playground/docs/contracts/pr-readiness-proof.contract.md:128`).
- CONFIRMED — no package, dependency, workflow, product, PR #66, shared wake
  draft, protection, dispatch, subscription, thread-write, or merge surface was
  added; the runtime imports only Node's URL helper and uses fixed GitHub reads
  (`learning-playground/scripts/pr-readiness.mjs:3`,
  `learning-playground/scripts/pr-readiness.mjs:74`).

### Verification

- PASS — `npx vitest run tests/scripts/pr-readiness.test.ts`: 38 dedicated tests
  (`learning-playground/tests/scripts/pr-readiness.test.ts:16`).
- PASS — `npm test`: contract enrollment plus 412 tests across 48 files; command
  composition is defined at `learning-playground/package.json:11` and
  `learning-playground/package.json:12`.
- PASS — `npm run test:viewport`: 6 browser scenarios; command is defined at
  `learning-playground/package.json:13`.
- PASS — `npm run typecheck` and `npm run build`; commands are defined at
  `learning-playground/package.json:8` and `learning-playground/package.json:10`.
- PASS — the live CLI read of PR #66 exited `1` with stable exact head and zero
  threads while proving `base_not_current`, dirty/conflicting merge state, and
  an empty server policy that omits `quality-gate`; those classifications are
  enforced at `learning-playground/scripts/pr-readiness.mjs:285`.
- PASS — a temporary forbidden `mutation` marker made the contract checker fail
  on the intended branch (`learning-playground/scripts/check-work-contract.mjs:146`,
  `learning-playground/scripts/check-work-contract.mjs:228`) and was removed
  before the final diff (`learning-playground/scripts/pr-readiness.mjs:1`).
- PASS — `git diff --check` completed without error across the five contracted
  files (`learning-playground/docs/work-contracts/long-run-live-readiness-producer.md:19`).
- CONFIRMED — no P1/P2 finding remains after the security, data-integrity,
  concurrency, contract, resource, validator, and effect-claim audit; the
  fail-closed guards are implemented at
  `learning-playground/scripts/pr-readiness.mjs:74`,
  `learning-playground/scripts/pr-readiness.mjs:230`, and
  `learning-playground/scripts/pr-readiness.mjs:265`.
