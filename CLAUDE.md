# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The app lives in `learning-playground/` — run all commands from there. The repo root also holds `adaptive_learning_playground.md`, the original design document whose contracts were extracted into `learning-playground/docs/contracts/`.

## Commands

All from `learning-playground/`:

```bash
npm run dev        # Vite dev server
npm run build      # tsc && vite build
npm run typecheck  # tsc --noEmit
npm test           # check:work-contract + vitest run (full suite)
npm run test:watch # vitest watch mode
npx vitest run tests/contract/parent-gate.test.ts   # single test file
npx vitest run -t "test name"                       # single test by name
```

`npm test` first runs `scripts/check-work-contract.mjs`, which fails if the workflow docs in `docs/contracts/` and `docs/templates/` lose their required section headings — do not rename headings in those files.

## What this project is

A local-first, preschool-safe adaptive learning playground for one child, written in vanilla TypeScript + Vite (no framework, no runtime dependencies). There is deliberately no backend, no accounts, no cloud sync, no analytics, and no open web access. All state lives in localStorage. The core design principle: adapt cognitive difficulty upward while keeping physical interaction and emotional feedback preschool-safe — body age, cognitive level, emotional age, parent control, and system safety are separate layers.

## Hard constraints (protected surface)

These are product contracts, not preferences; contract tests in `tests/contract/` enforce many of them:

- **Safety** (`docs/contracts/safety.contract.md`): child mode never exposes external links, open web/YouTube, ads, chat, uploads, sharing, autoplay chains, infinite scroll, leaderboards, streaks, or random reward loops. Every child activity must set `external_links_allowed: false` and `requires_parent_approval: true`; child content must not contain `http://`/`https://`.
- **No new game types** — new learning content reuses the existing runtimes (tap-choice, coloring, video vault). Activity schema changes are limited to what approved local activities need.
- **No automatic difficulty routing** — adaptation is parent-approved only. The child experience never changes without an explicit parent decision recorded locally.
- **Parent gate** — the `#parent` route is gated behind a local challenge phrase.
- **No child-facing AI output** — nothing generative appears in child mode without parent approval.

## Change workflow (enforced process)

`docs/contracts/change-workflow.contract.md` requires every change to start with a written change contract (Root Cause / Correct Fix Must Touch / Must Not Change) using `docs/templates/change-contract.md`, build only to that scope (amend the contract before touching anything outside it), and end with a cold diff audit: gaps first, change-by-change reconstruction with file/line citations, contract traceability, and the verification commands actually run. Reviewing reported findings follows `docs/contracts/finding-verification.contract.md` (classify each claim confirmed / contradicted / could-not-determine from a cold code read).

## Architecture

Vanilla DOM, no framework. Each screen module exports a `render*`/`destroy*` function pair; `src/app/main.ts` wires services and destroys all views on every route change.

- `src/app/` — entry point, hash router (`#home`, `#parent`, `#activity/:id`), session timer.
- `src/modules/` — UI renderers: `home`, `parent-gate`, `parent-panel`, and the three activity runtimes: `tap-choice` (Words/Math/Puzzle), `coloring-book` (Art), `video-vault` (local approved video only). The runtime is selected by the activity's `interaction_model` (`color_fill`, `watch_then_do`, otherwise tap-choice).
- `src/content/` — data, not code: activity JSON files registered via `activity-catalog.ts`, the curriculum graph (`curriculum/curriculum.v1.json`), content packs, and the approved-video manifest. Activities are validated against the JSON Schemas in `src/contracts/` by contract tests (ajv).
- `src/core/` — all logic, deterministic and DOM-free:
  - **Event/data layer**: `event-log`, `storage` (localStorage service), `progress`, `export-data`. Data flow: an activity emits an `ActivityAttemptEvent` → `appendEvent` → the progress profile is re-derived from all stored events.
  - **Learning engines**: `curriculum-graph` (domains/skills/prerequisites/unlocks + integrity validation), `mastery-engine` (mastery evaluation with evidence citing local event/observation IDs; transfer required before `mastered`), `transfer-coverage` (single-context fluency vs likely mastery; weak-only transfer cannot promote), `review-scheduler`, `content-gap-engine`, `recommendation-engine`, `adaptive-engine`.
  - **Parent lane**: `parent-gate`, `parent-panel-summary`, `parent-interpretation`, `parent-review-format`, plus session-review/notes/difficulty modules. Parent-approved difficulty is stored as overrides (`parent-difficulty-overrides`) and applied as a bounded runtime copy of an activity (`parent-difficulty-application`) — supported for tap-choice activities only.
- `src/types/` — shared type definitions. Import alias `@/*` → `src/*` (tsconfig + vitest config).

Tests split into `tests/contract/` (behavioral contracts: safety rules, schema validation, parent approval boundaries, persistence, export/clear behavior) and `tests/core/` (engine logic).

## Docs to keep current

`CURRENT_STATUS_AND_ROADMAP.md` tracks what is built, the verification state, and the protected non-goals; `MVP_BASELINE.md` records the working MVP baseline. Release commits bump the `package.json` version and align these docs (`Release v0.2.x ...` pattern).
