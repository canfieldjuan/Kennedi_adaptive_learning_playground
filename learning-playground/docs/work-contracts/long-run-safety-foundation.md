# Long-Run Safety Foundation

## Before Code

### Root Cause

Kennedi's repository has adversarial review rules but no builder-side ownership,
handoff, or guarded-merge contract. A short-lived worker cannot prove which PR
it owns, which head it evaluated, what woke it, or whether a later slice was
approved. The default branch also has no tracked CI workflow, branch protection,
or ruleset, so there is no stable repository check for a readiness probe to
require.

The shared checkout contains an untracked `pr-review-wake.yml` draft, but that
workflow only writes a summary for PR lifecycle events. It neither establishes a
quality gate nor proves thread/check/merge readiness. It belongs to another
working surface and is not source for this slice.

### Correct Fix Must Touch

- `AGENTS.md` must bind builders to one owned slice/PR and point to a canonical
  long-running-slice contract and persisted session-state schema.
- `docs/contracts/long-running-slices.contract.md` must define the states,
  ownership/head invariants, event-versus-scheduled authority split, fail-closed
  merge predicate, resume behavior, and approved-queue handoff.
- `docs/templates/long-run-session-state.md` must provide the exact state that a
  short-lived worker persists outside Git.
- `scripts/check-work-contract.mjs` must enroll both new durable documents in
  the existing workflow-contract test.
- `.github/workflows/learning-playground-quality.yml` must create one stable,
  read-only `quality-gate` context that installs from the lockfile and runs the
  existing work-contract, unit, mobile-viewport, typecheck, and
  production-build commands.
- This work contract must record the slice boundary and cold audit.

### Must Not Change

- Do not touch PR #63's viewport, package, baseline, roadmap, contract, CSS,
  activity, Playwright, or browser-test files.
- Do not modify, copy, delete, or claim the shared checkout's untracked
  `.github/workflows/pr-review-wake.yml` draft.
- Do not change application code, child or parent behavior, content, assets,
  game graphics, package versions, dependencies, or lockfiles.
- Do not add a watcher, wake bridge, polling loop, auto-merge command, issue
  queue selector, or GitHub mutation runtime in this foundation slice.
- Do not enable branch protection until `quality-gate` exists on the default
  branch; doing so now could strand the active viewport PR on a check its head
  cannot produce.

### Acceptance Standard

- Pull requests and pushes to `main` run a pinned, least-privilege
  `quality-gate` job with a timeout and per-ref concurrency cancellation.
- The job executes `npm ci`, installs Chromium from the locked Playwright CLI,
  and runs `npm test`, `npm run test:viewport`, `npm run typecheck`, and
  `npm run build` from `learning-playground/`.
- Repository guidance requires exact PR/head ownership, persisted handoff state,
  write-back after open/push, attention-only event wakes, scheduled-only merge
  consideration, zero unresolved threads, a non-empty required-check set that
  includes `quality-gate`, no changes requested, and clean mergeability before
  an authorized merge.
- Missing or contradictory state is non-ready; watchers and wake handlers never
  gain merge authority.
- A new push invalidates prior readiness, and a new slice requires an explicit
  ordered approval.
- `npm test`, `npm run test:viewport`, typecheck, build, workflow syntax
  inspection, and `git diff --check` pass without touching the protected
  viewport/product surfaces.

## Contract Amendments

- 2026-07-10 — PR #63 merged while this isolated slice was under audit, moving
  `origin/main` from `466ec92` to `14b54a2`. Its viewport paths remain protected
  non-scope; this branch must be rebased onto the new main and all gates rerun
  before publication. References above to the active viewport PR record the
  source state when the contract was written.
- 2026-07-10 — the rebase made `test:viewport` part of current `main`
  (`learning-playground/package.json:13`). The quality job must install Chromium
  and execute that existing browser command so the required context covers the
  accepted game/graphics viewport behavior without editing PR #63's files.

## Cold Diff Audit

### Gaps

- CONFIRMED — change without contract trace: none. Every changed file is named
  by the correct-fix boundary (`docs/work-contracts/long-run-safety-foundation.md:19`).
- CONFIRMED — contract requirement not delivered: none. Builder ownership is
  bound at `AGENTS.md:46`; the durable predicate is defined at
  `learning-playground/docs/contracts/long-running-slices.contract.md:88`; its
  state fields exist at
  `learning-playground/docs/templates/long-run-session-state.md:11`; and the
  check is created at `.github/workflows/learning-playground-quality.yml:17`.
- CONFIRMED — protected surface touched: none. The diff is confined to the root
  builder guidance (`AGENTS.md:32`), root quality workflow
  (`.github/workflows/learning-playground-quality.yml:1`), long-run contract
  (`learning-playground/docs/contracts/long-running-slices.contract.md:1`),
  state template (`learning-playground/docs/templates/long-run-session-state.md:1`),
  contract enrollment (`learning-playground/scripts/check-work-contract.mjs:75`),
  and this work contract (`learning-playground/docs/work-contracts/long-run-safety-foundation.md:1`).
- COULD NOT DETERMINE — GitHub-hosted execution cannot be proven until the new
  workflow is pushed. The locally inspected trigger and job are defined at
  `.github/workflows/learning-playground-quality.yml:3` and
  `.github/workflows/learning-playground-quality.yml:17`; the first PR run is
  required external follow-up, not evidence available in the local diff.

### Change By Change Reconstruction

- CONFIRMED — `AGENTS.md` now requires an isolated one-PR lane, persisted
  write-back after open/push, subscription followed by stop, attention-only
  event wakes, and scheduled authorized merge confirmation (`AGENTS.md:46`).
- CONFIRMED — the long-run contract defines the state transitions, exact
  persisted baton, ownership test, wake authority, non-vacuous current-head
  readiness predicate, guarded merge, explicit queue handoff, and fail-closed
  behavior (`learning-playground/docs/contracts/long-running-slices.contract.md:13`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:31`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:61`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:72`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:88`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:110`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:124`,
  `learning-playground/docs/contracts/long-running-slices.contract.md:134`).
- CONFIRMED — the state template records owned PR/head/worktree authority,
  non-owned surfaces, required checks, thread ids, wake source, next scheduled
  confirmation, ordered next slice, and resume baton
  (`learning-playground/docs/templates/long-run-session-state.md:11`,
  `learning-playground/docs/templates/long-run-session-state.md:24`,
  `learning-playground/docs/templates/long-run-session-state.md:32`,
  `learning-playground/docs/templates/long-run-session-state.md:46`,
  `learning-playground/docs/templates/long-run-session-state.md:51`).
- CONFIRMED — the existing contract checker now requires the long-run contract,
  state template, builder rules, pinned quality workflow, and command set while
  rejecting privileged or merge-capable workflow text
  (`learning-playground/scripts/check-work-contract.mjs:75`,
  `learning-playground/scripts/check-work-contract.mjs:96`,
  `learning-playground/scripts/check-work-contract.mjs:113`,
  `learning-playground/scripts/check-work-contract.mjs:123`,
  `learning-playground/scripts/check-work-contract.mjs:143`).
- CONFIRMED — the new workflow runs on PRs, pushes to `main`, and manual
  dispatch with read-only contents permission, per-PR/ref cancellation, a
  20-minute timeout, pinned official actions, locked install, unit and viewport
  tests, typecheck, and build (`.github/workflows/learning-playground-quality.yml:3`,
  `.github/workflows/learning-playground-quality.yml:10`,
  `.github/workflows/learning-playground-quality.yml:13`,
  `.github/workflows/learning-playground-quality.yml:17`,
  `.github/workflows/learning-playground-quality.yml:26`).

### Contract Traceability

- CONFIRMED — one owned slice/head and persisted resume state are enforced in
  builder guidance (`AGENTS.md:46`) and specified in the canonical contract
  (`learning-playground/docs/contracts/long-running-slices.contract.md:31`).
- CONFIRMED — events cannot merge, scheduled confirmation does not manufacture
  authority, and duplicate wakes must serialize
  (`learning-playground/docs/contracts/long-running-slices.contract.md:72`).
- CONFIRMED — readiness requires a stable head, non-empty required checks that
  include `quality-gate`, paginated zero unresolved threads, no changes
  requested, and known clean mergeability
  (`learning-playground/docs/contracts/long-running-slices.contract.md:88`).
- CONFIRMED — merge requires a clean matching local/remote/persisted head,
  explicit per-slice authorization, and an expected-head guard without admin
  bypass (`learning-playground/docs/contracts/long-running-slices.contract.md:110`).
- CONFIRMED — this slice creates no wake, polling, issue-selection, or merge
  runtime; the only executable addition is the read-only quality job
  (`.github/workflows/learning-playground-quality.yml:10`,
  `.github/workflows/learning-playground-quality.yml:17`).

### Verification

- PASS — `npm ci` installed the existing lockfile with zero reported
  vulnerabilities; the CI equivalent is fixed at
  `.github/workflows/learning-playground-quality.yml:37`.
- PASS — `npm test` ran the enrolled contract checker and 356 tests across 44
  files; the command composition is defined at `learning-playground/package.json:11`
  and `learning-playground/package.json:12`.
- PASS — `npm run typecheck` and `npm run build`; the exact commands are defined
  at `learning-playground/package.json:8` and `learning-playground/package.json:10`.
- PASS — `npm run test:viewport` ran all 5 browser scenarios against the local
  Playwright server; the command and server wiring are defined at
  `learning-playground/package.json:13` and
  `learning-playground/playwright.config.ts:16`.
- PASS — the negative validator probe temporarily inserted
  `pull_request_target` and the checker failed on the intended forbidden-text
  branch (`learning-playground/scripts/check-work-contract.mjs:143`,
  `learning-playground/scripts/check-work-contract.mjs:167`). The probe was
  removed before the final diff (`.github/workflows/learning-playground-quality.yml:3`).
- PASS — YAML syntax parsing and `git diff --check` completed without error; the
  inspected workflow spans `.github/workflows/learning-playground-quality.yml:1`
  through `.github/workflows/learning-playground-quality.yml:53`.
