# Current Status and Roadmap

## Where We Are Now

The MVP is working as a local-first adaptive learning playground. The child can open the app, choose from the home screen, play working activities, and return home. The parent can open the Parent Panel, see progress, export local data, clear progress, review session-level information, add notes, and see parent-readable guidance.

The important shift is that the app is no longer just a set of playable screens. It now has a baseline observability layer: local events, progress state, parent observations, parent-readable session review, local export health, and parent-facing recommendations.

## What We Have Built

### Child Experience

- Home screen with four large child-facing choices: Words, Videos, Math, Art.
- Words activity using tap-choice phonics.
- Math activity using tap-choice counting and subitizing.
- Art activity using tap-fill coloring.
- Video Vault shell for approved local videos.
- Existing puzzle activity remains registered and reachable directly, but is not currently on the four-slot home grid.
- Home navigation waits for the spoken menu label before changing screens, so speech is not cut off.

### Activity Runtime

- Tap-choice runtime for Words, Math, and Puzzle-style activities.
- Coloring runtime for Art.
- Video Vault runtime for local, parent-approved media only.
- Existing activity schema remains unchanged.
- No new game types have been added after the MVP became playable.

### Safety Baseline

- No backend services.
- No accounts.
- No cloud analytics.
- No open web.
- No open YouTube.
- No external child-facing links.
- No ads, feeds, comments, chat, upload forms, or sharing.
- No autoplay chains.
- No generative AI shown directly to the child.
- Parent data and child activity data stay local by default.

### Local Data and Progress

- Parent settings are stored locally.
- Activity attempt events are stored locally.
- Attempts include prompt text, selected answer, correct answer, response time, hint usage, and outcome.
- Older pre-v0.1.1 local events are migrated on read and marked in metadata for export health.
- Progress profiles are derived from local events.
- Progress tracks mastery signals rather than raw engagement.
- Skill state now includes attempts, correct attempts, recent accuracy, average response time, confidence, review flag, and promotion state.
- Parent observations are stored locally and included in parent review/export.

### Parent Panel

- Shows child profile settings.
- Shows progress summary by skill.
- Shows a parent-only Session Review.
- Session Review includes:
  - completed activities with friendly titles
  - skills touched with parent-friendly labels
  - accuracy by skill
  - hints used
  - abandoned activities
  - most repeated activity
  - recent attempts with prompt, selected answer, correct answer, outcome, hint usage, and response time
  - parent notes
- Shows Parent Guidance by reviewed skill.
- Parent Guidance includes recent accuracy, attempts, hint use, abandoned activity count, repeated error pattern when present, plain-language status, and parent-controlled recommendation.
- Parent notes are stored locally as `ParentObservation` records.
- Shows Parent Gate Settings for changing the local adult gate phrase.
- Export now includes settings, progress profile, raw activity events, parent observations, parent difficulty actions, export metadata, and local data health.
- Clear progress clears events, progress, observations, and parent difficulty actions.

### Documentation and Process

- `MVP_BASELINE.md` documents the current working MVP baseline.
- Workflow contracts were added so future changes begin with root cause, correct fix surface, and protected surface.
- Finding-verification docs were added to keep future issue review grounded in code.
- Contract tests enforce activity schema, safety rules, progress behavior, event logging, parent observations, and session review.

## Current Verification State

The current implementation has passed:

- `npm run typecheck`
- `npm test`
- `npm run build`

The most recent test state was:

- 16 test files passing
- 51 tests passing

Browser smoke checks confirmed:

- Home screen renders with the four primary choices.
- Parent Check renders before the Parent Panel.
- Parent Check uses the configured local gate phrase after reload.
- Parent Panel renders.
- Parent Gate Settings renders with the current phrase and can apply/reset the local phrase.
- Session Review renders.
- Recent Attempts renders.
- Parent Guidance renders.
- Parent Guidance lets a parent record local difficulty action decisions.
- Parent Notes history, textbox, and save button render.
- Local Data Snapshot renders.
- No Vite/browser error overlay appeared.

## What We Intentionally Have Not Built

- No new game types.
- No adaptive activity routing yet.
- No backend.
- No user accounts.
- No cloud sync.
- No analytics service.
- No public sharing.
- No rewards, streaks, leaderboards, or pressure loops.
- No child-facing AI generation.
- No activity schema expansion beyond what was already needed for the original MVP.

## Remaining Risks

### Guidance Quality

Parent Guidance is deterministic and intentionally simple. It is useful for v0.1.1, but the language and thresholds should be reviewed against real sessions before becoming more prominent.

### Data Growth

Events, observations, and progress currently live in localStorage. That is fine for v0.1.x, but larger event histories should eventually move to IndexedDB.

### Parent Notes Model

Parent notes now preserve history for the reviewed session. A later version may want editing or categorization, but the lightweight local note history is in place.

### Parent Difficulty Actions

Parent difficulty actions are local decision records only. They are useful for tracking what the parent chose to do with a recommendation, but they do not yet change future activity difficulty.

## Where We Are Headed

The next lane is still parent understanding and data quality, not adding games.

### MVP Phase 2 Definition of Done

Parent can answer:

- [ ] What did my child do?
- [ ] What skills were practiced?
- [ ] What seemed easy?
- [ ] What seemed difficult?
- [ ] What should we try next?
- [ ] Why is the app making that recommendation?
- [ ] Can I export everything?
- [ ] Can I delete everything?
- [ ] Does the child experience remain identical?
- [ ] Does every safety guarantee still hold?

### Completed v0.1.1 Hardening Slices

- Parent Review Readability: friendly activity titles, recent attempts, parent-friendly labels, raw ids preserved in export.
- Parent Interpretation Layer: status, reasons, repeated error pattern detection, non-pressure guidance.
- Export Polish: export metadata, app baseline/version, data sections included, and local data health.
- Adaptive Recommendation v1: parent-visible recommendations only, with no automatic child routing.
- Parent Notes History: previous notes display newest first, and saving a note appends instead of overwriting.
- Parent Review UX Polish: compact local data snapshot, clearer empty states, and easier-to-scan guidance rows.
- Parent-Approved Difficulty Actions: local action records, recent action history, export inclusion, and clear-data support.
- Parent Gate Hardening: visible parent access button, local-only challenge, and direct `#parent` route gating.
- Parent Gate Settings Polish: configurable local gate phrase, default fallback, export preservation, and focused tests.

### Current Lane Status

The parent understanding and local-control lane is complete enough to plan the next phase after v0.1.5 verification.

What this lane now covers:

- What the child did.
- What skills were practiced.
- What seemed easy or difficult.
- What the app recommends next, with reasons.
- Local export and local delete.
- Parent notes and parent action records.
- Local-only parent access friction.

Still protected:

- No new games.
- No backend.
- No child activity UI changes.
- No activity schema changes.
- No automatic difficulty changes or routing.
- No rewards, streaks, rankings, or pressure loops.

### Next Phase Planning

The next phase should be planned before implementation. Strong candidates are parent-controlled difficulty application, larger local storage durability, or a carefully scoped new activity lane.

Parent-controlled difficulty application remains the nearest product continuation if we stay in the adaptation lane:

- Parent sees the recommendation first.
- Parent can ignore it.
- Parent can choose a difficulty adjustment manually.
- Any future application is explicit and reversible.
- No streaks or grind loops.
- No adaptive routing until parent review is proven trustworthy.

## Current Product Shape

The app is now best described as:

> A working local-first preschool-safe learning playground with playable MVP activities, parent-controlled local progress, local event logging, parent observations, parent difficulty action records, configurable local parent gate friction, and a parent session review layer.

The current v0.1.5 base has parent review usability polish, parent-approved difficulty action records, local parent route gating, and configurable local gate settings in place. The next smart move is phase planning, still without accounts, backend auth, or child-facing automatic adaptation.
