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
- Export now includes settings, progress profile, raw activity events, parent observations, export metadata, and local data health.
- Clear progress clears events, progress, and observations.

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

- 10 test files passing
- 31 tests passing

Browser smoke checks confirmed:

- Home screen renders with the four primary choices.
- Parent Panel renders.
- Session Review renders.
- Recent Attempts renders.
- Parent Guidance renders.
- Parent Notes textbox and save button render.
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
- No schema expansion beyond what was already needed for the original MVP.

## Remaining Risks

### Guidance Quality

Parent Guidance is deterministic and intentionally simple. It is useful for v0.1.1, but the language and thresholds should be reviewed against real sessions before becoming more prominent.

### Data Growth

Events, observations, and progress currently live in localStorage. That is fine for v0.1.x, but larger event histories should eventually move to IndexedDB.

### Parent Notes Model

Storage supports multiple observations, but the UI currently behaves like one editable latest note for the reviewed session. That is acceptable for now, but a later version may want a note history.

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

### Next Slice: Parent Review UX Polish

Goal: make the Parent Panel easier to scan during ordinary parent use.

Planned work:

- Improve empty states when there are no attempts, no guidance, or no observations.
- Add a compact local data health summary inside the Parent Panel using the same counts as export.
- Make the guidance rows easier to scan by grouping status, recommendation, and reason.
- Keep raw ids in export data only, not as primary parent labels.
- Add focused tests for data-health summary formatting and empty-state behavior.

Not in scope:

- No new games.
- No backend.
- No child UI changes.
- No activity schema changes.
- No automatic difficulty changes.
- No rewards, streaks, rankings, or pressure loops.

### After That: Parent Notes History

Goal: let the parent preserve more than the latest note without turning notes into a heavy journaling system.

Possible work:

- Show previous notes for the reviewed session.
- Allow adding a new note without overwriting the latest note.
- Keep notes local and included in export.

### Later: Parent-Approved Difficulty Actions

Goal: let a parent act on recommendations without automatic child-facing routing.

Possible work:

- Parent sees the recommendation first.
- Parent can ignore it.
- Parent can choose a difficulty adjustment manually.
- No streaks or grind loops.
- No adaptive routing until parent review is proven trustworthy.

## Current Product Shape

The app is now best described as:

> A working local-first preschool-safe learning playground with playable MVP activities, parent-controlled local progress, local event logging, parent observations, and a basic parent session review layer.

That is now the correct base for v0.1.1 hardening. The next smart move is polishing parent review usability and data-health visibility before adding more activity types.
