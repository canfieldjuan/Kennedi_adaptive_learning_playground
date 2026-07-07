# Current Status and Roadmap

## Where We Are Now

The MVP is working as a local-first adaptive learning playground. The child can open the app, choose from the home screen, play working activities, and return home. The parent can open the Parent Panel, see progress, export local data, clear progress, review session-level information, add notes, and see parent-readable guidance.

The important shift is that Phase 2 is complete: the app has a parent-approved fit loop: observe, recommend, approve, apply, show evidence, and review fit. Phase 3 now includes a curriculum graph, mastery engine, transfer coverage layer, transfer context strength tiers, content gap engine, coverage-driven activity variant briefs, a parent-only activity brief design queue, local parent transfer and brief-decision persistence, targeted transfer variants within existing game types, parent-approved transfer launch, parent-visible mastery snapshots, and parent-visible review schedule records.

## What We Have Built

### Child Experience

- Home screen with four large child-facing choices: Words, Videos, Math, Art.
- Words activity using tap-choice phonics.
- Math activity using tap-choice counting and subitizing.
- Art activity using tap-fill coloring.
- Video Vault shell for approved local videos.
- Approved transfer variants for Words, Math, Art, and the registered shape/spatial activity, using existing runtimes only.
- Existing puzzle activity remains registered and reachable directly, but is not currently on the four-slot home grid.
- Home navigation waits for the spoken menu label before changing screens, so speech is not cut off.

### Activity Runtime

- Tap-choice runtime for Words, Math, and Puzzle-style activities.
- Supported tap-choice activities can receive a bounded runtime copy from active parent-approved guidance.
- Coloring runtime for Art.
- Video Vault runtime for local, parent-approved media only.
- Activity schema includes required transfer metadata for approved local activities.
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
- Curriculum graph data defines domains, skills, skill levels, prerequisites, unlocks, evidence requirements, and review policy for existing activities.
- Mastery evidence cites local event IDs or parent observation IDs.
- Transfer coverage distinguishes single-context fluency from likely mastery.
- Transfer quality distinguishes weak transfer from medium, strong, and retention evidence.
- Weak-only transfer practice cannot promote a skill to `likely_mastered`.
- Approved transfer variants give core evidence-bearing MVP skills a second local context to try.
- Parent transfer-content decisions are stored locally and included in parent review/export.
- Parent activity brief decisions are stored locally and included in parent review/export.
- The latest parent activity brief decision per skill and brief is organized into an approved/held/archived design queue.
- Parent mastery snapshots are stored locally when the Parent Panel reviews a skill.
- Parent review schedule records are stored locally from mastery snapshots and shown to the parent.

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
- Parent Guidance includes skill graph evidence, mastery status, suggested next action, evidence summary, graph rule, and source references.
- Parent Guidance includes transfer coverage status, successful/required context counts, missing context types, and targeted transfer content recommendations when required content is still missing.
- Parent Guidance shows transfer quality so adults can see when coverage is weak-only.
- Parent Guidance can save an active parent-approved guidance choice per skill.
- Parent Guidance can store parent approve/hold transfer-content choices locally.
- Parent Guidance can show a concrete approved transfer activity and let the parent start or hold it.
- Recent Attempts shows when parent-approved guidance was applied to a supported activity.
- Applied Guidance Review summarizes the attempts after active guidance affected a supported activity and offers a keep/reset/support review.
- Parent notes are stored locally as `ParentObservation` records.
- Shows Parent Gate Settings for changing the local adult gate phrase.
- Export now includes settings, progress profile, raw activity events, parent observations, parent difficulty actions, active parent guidance, parent transfer decisions, parent activity brief decisions, mastery snapshots, review schedule records, export metadata, and local data health.
- Clear progress clears events, progress, observations, parent difficulty actions, active parent guidance, parent transfer decisions, parent activity brief decisions, mastery snapshots, and review schedule records.

### Documentation and Process

- `MVP_BASELINE.md` documents the current working MVP baseline.
- Workflow contracts were added so future changes begin with root cause, correct fix surface, and protected surface.
- Finding-verification docs were added to keep future issue review grounded in code.
- Contract tests enforce activity schema, safety rules, progress behavior, event logging, parent observations, session review, curriculum graph integrity, transfer coverage, content gaps, mastery rules, review scheduling, persistence, and parent approval boundaries.

## Current Verification State

The current implementation has passed:

- `npm run typecheck`
- `npm test`
- `npm run build`

The most recent test state was:

- 28 test files passing
- 111 tests passing

Browser smoke checks confirmed:

- Home screen renders with the four primary choices.
- Parent Check renders before the Parent Panel.
- Parent Check uses the configured local gate phrase after reload.
- Parent Panel renders.
- Parent Gate Settings renders with the current phrase and can apply/reset the local phrase.
- Session Review renders.
- Recent Attempts renders.
- Recent Attempts shows applied parent guidance after a supported tap-choice activity uses it.
- Applied Guidance Review renders and summarizes post-guidance attempts.
- Parent Guidance renders.
- Parent Guidance shows graph-backed mastery evidence and source references.
- Parent Guidance shows transfer coverage and content gap evidence.
- Parent Guidance shows coverage-driven activity briefs when richer transfer content is needed.
- Parent Guidance records parent activity brief decisions locally.
- Parent Panel renders the Activity Brief Design Queue from latest local brief decisions.
- Parent Panel renders Recent Mastery Checks and Review Schedule from local snapshot records.
- Parent Guidance lets a parent record local difficulty action decisions.
- Active Parent Guidance renders, applies a parent-approved guidance choice, and can reset it.
- Supported Math tap-choice activity used an active Counting support override with two choices and stored applied-guidance metadata.
- Seeded applied guidance events produced a parent-visible "Keep current guidance" review with local metrics.
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
- No activity schema expansion beyond required transfer metadata for approved local activities.

## Remaining Risks

### Guidance Quality

Parent Guidance is deterministic and now graph-backed, with local mastery snapshots and review schedule records. The thresholds should still be reviewed against real sessions before becoming more prominent.

### Data Growth

Events, observations, and progress currently live in localStorage. That is fine for v0.1.x, but larger event histories should eventually move to IndexedDB.

### Parent Notes Model

Parent notes now preserve history for the reviewed session. A later version may want editing or categorization, but the lightweight local note history is in place.

### Active Parent Guidance

Parent difficulty actions, transfer decisions, activity brief decisions, the activity brief design queue, mastery snapshots, and review schedules remain local parent-side records. Active Parent Guidance is applied only to supported tap-choice activities. Applied Guidance Review summarizes local post-application evidence, but does not mutate active guidance automatically. Coloring and Video Vault remain unsupported for difficulty application in this lane.

### Transfer Evidence

The app no longer treats one-context fluency as likely mastery. Core evidence-bearing MVP skills now have one approved same-format/new-example transfer variant, and the parent can start an approved transfer activity from the Parent Panel. Weak transfer can generate targeted activity variant briefs, and parent choices on those briefs persist locally. Richer implemented transfer contexts are still future work. Video/vocabulary evidence remains limited by the empty local Video Vault shell.

## Where We Are Headed

Phase 2 is complete. Phase 3 is skill graph, mastery, transfer coverage, and content gap work, still without adding games.

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

### Completed Phase 2 Work

- Parent Review Readability: friendly activity titles, recent attempts, parent-friendly labels, raw ids preserved in export.
- Parent Interpretation Layer: status, reasons, repeated error pattern detection, non-pressure guidance.
- Export Polish: export metadata, app baseline/version, data sections included, and local data health.
- Adaptive Recommendation v1: parent-visible recommendations only, with no automatic child routing.
- Parent Notes History: previous notes display newest first, and saving a note appends instead of overwriting.
- Parent Review UX Polish: compact local data snapshot, clearer empty states, and easier-to-scan guidance rows.
- Parent-Approved Difficulty Actions: local action records, recent action history, export inclusion, and clear-data support.
- Parent Gate Hardening: visible parent access button, local-only challenge, and direct `#parent` route gating.
- Parent Gate Settings Polish: configurable local gate phrase, default fallback, export preservation, and focused tests.
- Parent-Approved Difficulty Override Model: active local guidance state, export inclusion, reset support, and focused tests.
- Parent-Approved Difficulty Application v1: bounded tap-choice runtime copies, event metadata, and visible Recent Attempts evidence.
- Applied Guidance Fit Review: post-application attempts, accuracy, hints, stops, and parent-safe keep/reset/support review.

### Current Phase Status

Phase 3 has continued through v0.2.8 with transfer quality, activity variant briefs, durable parent brief decisions, the parent-only activity brief design queue, mastery snapshot persistence, and parent-visible review schedule records.

What this lane now covers:

- Curriculum graph for the existing MVP skills.
- Graph validation for missing references, self-unlocks, and prerequisite cycles.
- Evidence records with local event or observation source IDs.
- Mastery evaluation with transfer required before `mastered`.
- Review scheduling after likely mastery, successful reviews, and regression.
- Parent Guidance showing graph rule, mastery status, evidence summary, and suggested next action.
- Parent approval still required before active guidance changes.
- Transfer coverage showing single-context fluency, transfer readiness, blocked content gaps, missing context types, and targeted content recommendations.
- First same-format/new-example transfer variants for Words, Math, Art, and shape/spatial practice.
- Parent-approved transfer launch from Parent Guidance into an existing activity route.
- Local parent transfer-content decisions included in export and clear-data behavior.
- Coverage-driven activity variant briefs that tell the parent/builder what richer context a skill needs.
- Local parent activity brief decisions included in export and clear-data behavior.
- Parent-only activity brief design queue grouped by approved, held, and archived latest decisions.
- Local mastery snapshots created from parent-reviewed mastery evaluations.
- Local review schedule records derived from mastery snapshots and shown in the Parent Panel.

Still protected:

- No new games.
- No backend.
- No new child activity UI concepts.
- Activity schema changes are limited to required transfer metadata for existing approved activities.
- No hidden automatic difficulty changes or routing.
- No coloring or Video Vault difficulty application yet.
- No rewards, streaks, rankings, or pressure loops.

### Next Phase Work

Goal: deepen Phase 3 without breaking Phase 2.

Good candidates:

- Add stronger implemented transfer contexts beyond same-format/new-example variants.
- Add more nuanced parent observation categories.
- Add accessibility polish for the child activity screens.
- Plan a future IndexedDB move for larger local histories.
- No streaks, grind loops, hidden routing, or child-facing pressure.

## Current Product Shape

The app is now best described as:

> A working local-first preschool-safe learning playground with playable MVP activities, targeted transfer variants inside existing game types, parent-approved transfer launch, parent-controlled local progress, local event logging, parent observations, parent difficulty action records, active parent-approved guidance state, bounded application for supported tap-choice activities, applied-guidance fit review, curriculum graph, mastery engine, transfer coverage with context strength tiers, coverage-driven activity briefs, a parent-only activity brief design queue, local parent brief decisions, persisted mastery snapshots, parent-visible review schedules, configurable local parent gate friction, and a parent session review layer.

The current v0.2.8 base grounds parent recommendations in a curriculum graph, mastery evidence, transfer coverage, transfer quality, approved local transfer variants, parent-clicked transfer launch, durable parent decisions, an activity brief design queue, mastery snapshots, and review schedules while keeping accounts, backend auth, cloud sync, and automatic routing out of scope.
