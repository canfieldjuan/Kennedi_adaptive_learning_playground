# Current Status and Roadmap

## Where We Are Now

The MVP is working as a local-first adaptive learning playground. The child can open the app, choose from the home screen, play working activities, and return home. The parent can open the Parent Panel, see progress, export local data, clear progress, review session-level information, add notes, and see parent-readable guidance.

The important shift is that Phase 2 is complete: the app has a parent-approved fit loop: observe, recommend, approve, apply, show evidence, and review fit. Phase 3 now includes a curriculum graph, mastery engine, transfer coverage layer, transfer context strength tiers, content gap engine, coverage-driven activity variant briefs, a parent-only activity brief design queue, local parent transfer and brief-decision persistence, targeted transfer variants, implemented rich phonics, word-building, Art, spatial, math, and video-response variants, a validated repo-bundled Video Vault intake and exposure-only evidence boundary, parent-approved transfer launch, parent-visible mastery snapshots, parent-visible review schedule records, curriculum-grounded progress level rungs with read-time legacy storage translation, compound-round per-skill evidence modeling, a dedicated phonics-match runtime for Words, a multi-word initial-sound chain, Pip the recurring phonics character, the first sound-blending rung, the Number Train Math runtime foundation, a current-main Kennedi's Orders adapter, a Parent Panel Bear Cafe launch path, a child home Bear Cafe entry, parent-readable Bear Cafe delivered-order evidence, Bear Cafe handoff/reaction/cook/audio/celebration/idle richness, the first illustrated Bear Cafe art standard pass: bear, foods, decorations, and home scene backdrop, and Bear Cafe choice controls that expose selected/count state to assistive technology.

## What We Have Built

### Child Experience

- Home screen with four large child-facing choices: Words, Cafe, Math, Art.
- Words activity using a dedicated `phonics-match` runtime at parity with the prior tap-choice phonics behavior.
- Word-game initial sounds now run as a fixed, parent-approved multi-word chain: /b/ bear, /m/ moon, /s/ sun, /c/ cat, and /t/ top.
- Word-game activities include Pip, a recurring local illustrated phonics character that mouths the target sound and reacts after a correct match.
- Word-game blending activities now introduce the next rung: segmented sound-out prompts such as `c - a - t` with whole-word choices from a rhyming set.
- Word building includes a parent-launchable symbolic transfer card that shows a
  printed model word and uses the existing shuffled letter-tile interaction.
- Math home play now opens the Number Train counting foundation; legacy Math
  tap-choice activities remain available by direct or parent transfer routes.
- Art home play opens Bear Art Studio; legacy tap-fill coloring remains
  registered for direct and parent-led play.
- Bear Art Studio now climbs from three-star counting to a difficulty-3
  five-flower card with one extra spot, filling the structured-counting rung
  without changing the existing child interaction.
- Art includes a parent-launchable visual request-card round with correctable
  mismatch evidence; free-choice coloring keeps its original behavior.
- Spatial includes a parent-launchable house-scene round that asks for the
  roof's shape and introduces triangle as a correct contextual target.
- Video Vault with one validated repo-bundled, parent-approved local clip using
  level-matched parent-recorded narration, a Parent Panel observation launch,
  and a manual handoff to a separate three-picture vocabulary response.
- Approved transfer variants for Words, Math, Art, and the registered shape/spatial activity, using existing local runtimes only.
- A phonics reverse-mapping transfer variant asks from a word back to its starting letter, using the dedicated phonics-match runtime.
- A math different-prompt-mode transfer variant asks from a visual dot card to the matching numeral, using the existing tap-choice runtime.
- Kennedi's Orders / Bear Cafe is registered as a six-activity local game route, can be started from the Parent Panel, and now replaces Videos on the four-slot home grid.
- Existing puzzle activity remains registered and reachable directly, but is not currently on the four-slot home grid.
- Home navigation waits for the spoken menu label before changing screens, so speech is not cut off.

### Activity Runtime

- Dedicated phonics-match runtime for Words activities.
- Tap-choice runtime for Math and Puzzle-style activities.
- Dedicated Number Train runtime for structured counting from the Math home tile.
- Supported tap-choice activities can receive a bounded runtime copy from active parent-approved guidance.
- Coloring runtime for Art.
- Video Vault runtime for local, parent-approved media only.
- Kennedi's Orders runtime for the Bear Cafe `tap_then_place` activities.
- Bear Cafe food, color, and decoration choices expose selected state through `aria-pressed`; food choices also include the current tray count in their accessible names.
- Activity schema includes required transfer metadata for approved local activities.
- Rich transfer context labels are guarded by content-shape tests so same-format clones cannot be mislabeled as stronger evidence.
- No additional game branch payloads have been imported beyond the scoped Kennedi's Orders adapter.

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
- Compound attempts can include optional per-skill outcomes, so one Bear Cafe order can preserve the overall result while scoring quantity and color evidence separately.
- Older pre-v0.1.1 local events are migrated on read and marked in metadata for export health.
- Progress profiles are derived from local events.
- Progress tracks mastery signals rather than raw engagement.
- Skill state now includes attempts, correct attempts, recent accuracy, average response time, confidence, review flag, and promotion state.
- Parent observations are stored locally with optional fit/support categories
  and skill scope, and remain included in parent review/export.
- Curriculum graph data defines domains, skills, skill levels, prerequisites, unlocks, evidence requirements, and review policy for existing activities.
- Curriculum skill levels carry difficulty bands, and local progress levels now seed, promote, cap, display, and read-translate legacy stored values through those declared rungs.
- Mastery evidence cites local event IDs or parent observation IDs.
- Progress and mastery evidence prefer per-skill outcomes when present and use the global outcome fallback for older local events.
- Transfer coverage distinguishes single-context fluency from likely mastery.
- Transfer quality distinguishes weak transfer from medium, strong, and retention evidence.
- Weak-only transfer practice cannot promote a skill to `likely_mastered`.
- Approved transfer variants give core evidence-bearing MVP skills a second local context to try.
- Phonics now includes one approved strong `reverse_mapping` context that can support likely mastery after successful evidence exists in both weak and rich contexts.
- Math now includes one approved medium `different_prompt_mode` context that can support likely mastery after successful evidence exists in both weak and medium contexts.
- Word building now includes one approved medium `different_prompt_mode`
  context using a symbolic printed-word model.
- Art now includes one approved medium `different_prompt_mode` context using a
  visual color request card.
- Spatial now includes one approved medium `different_prompt_mode` context using
  a local illustrated scene and the existing tap-choice event path.
- Video completion is explicit exposure only: it produces no counted vocabulary
  attempt, accuracy, successful context, or mastery promotion.
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
- Recent Attempts includes Bear Cafe delivered-order completion events with prompt, selected tray, correct order, outcome, hint state, and response time, while collapsing only the specific matching Bear Cafe tray-check success row so other evidence is not crowded out.
- Applied Guidance Review summarizes the attempts after active guidance affected a supported activity and offers a keep/reset/support review.
- Parent notes are stored locally as `ParentObservation` records.
- Shows Parent Gate Settings for changing the local adult gate phrase.
- Export now includes settings, progress profile, raw activity events, parent observations, parent difficulty actions, active parent guidance, parent transfer decisions, parent activity brief decisions, mastery snapshots, review schedule records, export metadata, and local data health.
- Clear progress clears events, progress, observations, parent difficulty actions, active parent guidance, parent transfer decisions, parent activity brief decisions, mastery snapshots, and review schedule records.

### Documentation and Process

- `MVP_BASELINE.md` documents the current working MVP baseline.
- Workflow contracts were added so future changes begin with root cause, correct fix surface, and protected surface.
- Finding-verification docs were added to keep future issue review grounded in code.
- Game intake docs were added so branch-built games are audited before they are wired into the child experience.
- `Kennedi's Orders` has a readiness audit, a current-main adapter implementation record, and a parent-launch implementation record.
- Contract tests enforce activity schema, safety rules, progress behavior, event logging, parent observations, session review, curriculum graph integrity, transfer coverage, content gaps, mastery rules, review scheduling, persistence, and parent approval boundaries.

## Current Verification State

The current implementation has passed:

- `npm run typecheck`
- `npm test`
- `npm run build`

The most recent test state was:

- 48 test files passing
- 420 tests passing
- 6 Playwright browser tests passing

Browser smoke checks confirmed:

- Home screen renders with the four primary choices.
- Parent Check renders before the Parent Panel.
- Parent Check uses the configured local gate phrase after reload.
- Parent Panel renders.
- Parent Gate Settings renders with the current phrase and can apply/reset the local phrase.
- Session Review renders.
- Recent Attempts renders.
- Recent Attempts shows Bear Cafe delivered-order completion evidence after child-started play without duplicating its matching tray-check success, hiding a later unfinished identical order, or crowding out earlier struggle evidence.
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

- No `Nature Camera Safari` integration.
- No additional home-screen tiles beyond Words, Cafe, Math, and Art.
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

Parent observations preserve history for the reviewed session and now show a
parent-only fit/support category plus optional skill scope. Legacy free-text
notes remain readable and exportable.

### Active Parent Guidance

Parent difficulty actions, transfer decisions, activity brief decisions, the activity brief design queue, mastery snapshots, and review schedules remain local parent-side records. Active Parent Guidance is applied only to supported tap-choice activities. Applied Guidance Review summarizes local post-application evidence, but does not mutate active guidance automatically. Coloring and Video Vault remain unsupported for difficulty application in this lane.

### Transfer Evidence

The app no longer treats one-context fluency as likely mastery. Core evidence-bearing MVP skills now have one approved same-format/new-example transfer variant, initial-sound phonics has one approved reverse-mapping transfer variant, blending has one approved spoken different-prompt-mode variant, word building has one approved symbolic different-prompt-mode variant, Art has one approved visual different-prompt-mode variant, spatial has one approved scene-based different-prompt-mode variant, and math has one approved visual different-prompt-mode variant. Each richer activity is tied to an originating brief and can be started from the Parent Panel when coverage is ready. Weak transfer can generate targeted activity variant briefs, and parent choices on those briefs persist locally. Video/vocabulary now has one local exposure clip paired with one medium response context; that proves the evidence boundary and handoff, not vocabulary breadth, repeated evidence, or retention.

### Game Adapter

`Kennedi's Orders` has been extracted manually into current main as a v0.3 adapter. It adds only the Bear Cafe runtime, six local activities, scoped styles, routing for `content.game === "kennedis-orders"`, and current-main tests. `Nature Camera Safari` remains out of scope. Cafe can now be started from the Parent Panel and from the second child home grid slot.

## Where We Are Headed

Phase 2 is complete. Phase 3 established skill graph, mastery, transfer coverage, and content gap work. The first v0.3 adapter work integrated Kennedi's Orders without changing the home grid, the next slice added a Parent Panel Bear Cafe launch path for testing, v0.3.2 moved Bear Cafe into the child home grid, v0.3.3 made Bear Cafe delivered orders visible in Recent Attempts, v0.3.4 added the delivery handoff beat, v0.3.5 added Bear Cafe reaction states, v0.3.6 added the cook/plating beat, v0.3.7 synthesized real feedback cues, v0.3.8 added the completion celebration burst, v0.3.9 added idle nudge, v0.3.10 aligned parent-visible progress levels to curriculum rungs, v0.3.11 translates legacy stored progress levels before review/export, v0.3.12 models per-skill evidence for compound Bear Cafe rounds and proves the illustrated bear style, v0.3.13 illustrates Bear Cafe foods, v0.3.14 illustrates Bear Cafe decorations, v0.3.15 adds the home-screen Bear Cafe scene backdrop, v0.3.16 adds the dedicated phonics-match runtime foundation and Bear Cafe choice accessibility polish, v0.3.17 adds the multi-word initial-sound chain, v0.3.18 adds Pip as the recurring phonics character, v0.3.19 adds the first sound-blending rung, v0.3.20 adds word building, v0.3.21 unifies Word-game card art, v0.3.22 makes phonics rung coverage and content-gap briefs skill-aware, v0.3.23 adds truthful spoken prompt-mode transfer for blending, v0.3.24 adds symbolic prompt-mode transfer for word building, v0.3.25 establishes the dedicated Number Train Math runtime, v0.3.26 adds the deterministic Number Train multi-round session, v0.3.27 adds visual request-card transfer for Art, v0.3.28 adds Number Train's Load-the-Train construction rounds, v0.3.29 adds Number Train's Missing Station sequence round, v0.3.30 aligns Number Train curriculum and per-skill evidence, v0.3.31 adds scene-based spatial transfer, v0.3.32 polishes Number Train's mobile layout and extension seams, v0.3.33 validates Video Vault intake and exposure-only evidence, v0.3.34 adds the first local clip with a separate vocabulary response, v0.3.35 adds the continuous Bear Cafe environment, v0.3.36 adds Pip's Word Workshop, v0.3.37 adds structured parent observation signals and skill scope, v0.3.38 adds the Art Studio environment, v0.3.39 adds the Train Station environment, v0.3.40 completes the visual-cohesion pass, v0.3.41 adds browser-verified mobile viewport geometry, v0.3.42 adds Bear Art Studio, v0.3.43 adds parent-visible difficulty coverage truth, v0.3.44 fills the structured-counting band with one bounded Bear Art variant, v0.3.45 adds Bear Art Studio story, dress-up, and gallery play, v0.3.46 adds a parent-only video observation launch, v0.3.47 adds the event-derived Bear Art gallery, v0.3.48 adds poster and wall-picture surfaces, v0.3.49 adds the Bear Art canvas pass, v0.3.50 adds Number Train upper-band trips, v0.3.51 adds the first Story Stage tale, and v0.3.52 replaces the first clip's poor synthetic narration with level-matched parent-recorded speech.

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

Phase 3 has continued through v0.3.52 with transfer quality, activity variant briefs, durable parent brief decisions, the parent-only activity brief design queue, mastery snapshot persistence, parent-visible review schedule records, structured parent observation fit signals and skill scope, the completed visual-cohesion arc, Bear Art Studio story, dress-up, gallery, expanded-surface play, and free canvas, Number Train upper-band trips, the first Story Stage tale, browser-verified mobile viewport geometry, parent-visible difficulty coverage truth, one coverage-driven structured-counting variant, a parent-only local video observation launch, parent-recorded narration for the first local clip, truth-checked initial-sound, blending, word-building, Art, spatial, math, and video-response variants, a validated local Video Vault intake and exposure-only evidence boundary, one local narrated clip paired with an independently scored vocabulary response, the dedicated Word-game initial-sound, blending, and word-building chains inside Pip's Word Workshop, the phone-ready Number Train Math multi-round foundation with quantity-construction and number-sequence rounds plus honest per-skill evidence, cohesive Word-game card art, skill-aware phonics activity briefs, all-skill approved-activity coverage auditing, the current-main Kennedi's Orders adapter and continuous cafe environment, parent-readable Bear Cafe evidence, curriculum-grounded progress level rungs, read-time legacy level translation, and compound-round per-skill evidence.

What this lane now covers:

- Curriculum graph for the existing MVP skills.
- Catalog-derived difficulty coverage for every curriculum rung, including the
  exact current eight-gap inventory and parent-only current-rung explanation.
- Curriculum-grounded progress levels with rung labels, difficulty bands, and read-time legacy storage translation.
- Graph validation for missing references, self-unlocks, and prerequisite cycles.
- Graph-to-catalog validation that every declared phonics rung has an approved
  activity inside its difficulty band.
- Evidence records with local event or observation source IDs.
- Mastery evaluation with transfer required before `mastered`.
- Review scheduling after likely mastery, successful reviews, and regression.
- Parent Guidance showing graph rule, mastery status, evidence summary, and suggested next action.
- Parent approval still required before active guidance changes.
- Transfer coverage showing single-context fluency, transfer readiness, blocked content gaps, missing context types, and targeted content recommendations.
- First same-format/new-example transfer variants for Words, Math, Art, and shape/spatial practice.
- First truth-checked rich transfer variant: phonics reverse mapping from word to starting letter.
- Dedicated phonics-match runtime for Word-game activities, with Math and Shapes still routed through the generic tap-choice runtime.
- Word-game chain across five parent-approved initial-sound activities.
- Pip phonics character with target-sound mouth shapes and deterministic correct-match reaction.
- First sound-blending skill and activity chain using segmented prompts and rhyming whole-word choices.
- First truth-checked medium blending transfer variant: spoken phoneme sequence
  to matching picture, available through parent-approved transfer launch and
  intentionally outside the fixed child chain.
- First truth-checked medium word-building transfer variant: printed symbolic
  model to shuffled letter tiles, available through parent-approved transfer
  launch and intentionally outside the fixed child chain.
- First truth-checked medium Art transfer variant: visual request-card color to
  correctable tap-fill match, available through parent-approved transfer launch.
- First truth-checked medium spatial transfer variant: a contextual house scene
  asks for the triangle roof through the existing parent-approved tap-choice route.
- Video Vault repo-bundled manifest validation and explicit exposure-only event
  provenance, with tests proving video completion cannot advance vocabulary mastery.
- First approved local Video Vault clip with local narration and a manual route
  to a separate three-picture vocabulary response; exposure remains unscored.
- Parent-only structured observation categories and optional skill scope, with
  polarity-aware mastery evidence and legacy note compatibility.
- First truth-checked medium math transfer variant: visual dot card to numeral match.
- Dedicated Number Train foundation for structured counting from the Math home tile.
- Parent-approved transfer launch from Parent Guidance into an existing activity route.
- Local parent transfer-content decisions included in export and clear-data behavior.
- Coverage-driven activity variant briefs that tell the parent/builder what richer context a skill needs.
- Skill-aware Word-game briefs for letter-sound matching, blending, and word
  building; initial-sound briefs retain their Bear Cafe/category-sort path.
- Local parent activity brief decisions included in export and clear-data behavior.
- Parent-only activity brief design queue grouped by approved, held, and archived latest decisions.
- Local mastery snapshots created from parent-reviewed mastery evaluations.
- Local review schedule records derived from mastery snapshots and shown in the Parent Panel.
- A game-intake contract, `Kennedi's Orders` readiness audit, and v0.3 adapter contract that protect current main from old-base direct merges.
- Kennedi's Orders / Bear Cafe as a registered game with six safe local activities, a Parent Panel launch button, and a child home entry that starts the full shift.
- Bear Cafe delivered orders included in parent Recent Attempts with friendly activity title, skills, prompt, selected tray, correct order, hint state, response time, and completed outcome.
- Compound Bear Cafe checks can record quantity and color outcomes separately while preserving the single overall order outcome.
- Bear Cafe now uses local illustrated SVG art for the caller bear, foods, decorations, and child-home scene backdrop without external assets or network content.
- Bear Cafe choice controls expose selected state and tray counts through accessible button state without changing the child-facing game flow.

Still protected:

- No backend.
- No `Nature Camera Safari`.
- No fifth home-screen entry; Cafe replaces Videos in the existing four-slot grid.
- Activity schema changes are limited to required transfer metadata for existing approved activities.
- No hidden automatic difficulty changes or routing.
- No coloring or Video Vault difficulty application yet.
- No rewards, streaks, rankings, or pressure loops.

### Next Phase Work

Goal: deepen Phase 3 without breaking Phase 2.

Good candidates:

- Re-run the parent-started video/response observation with the child using the
  human-narrated clip, then record a parent note before adding vocabulary
  breadth or delayed review.
- Use the remaining reported difficulty gaps to drive later variants only after
  the current game evidence is observed; do not generate broad content.
- Continue child accessibility work only from observed or browser-measured gaps.
- Plan a future IndexedDB move for larger local histories.
- No streaks, grind loops, hidden routing, or child-facing pressure.

## Current Product Shape

The app is now best described as:

> A working local-first preschool-safe learning playground with playable MVP activities, a dedicated phonics-match Word-game runtime foundation, a dedicated Number Train Math foundation, a fixed initial-sound word chain, Pip as a recurring phonics character, a first sound-blending rung, targeted transfer variants, truth-checked phonics and math transfer variants, a direct-route Kennedi's Orders adapter plus Parent Panel and child home Bear Cafe launch paths, parent-approved transfer launch, parent-controlled local progress with curriculum-grounded rung labels, read-time legacy level translation, compound-round per-skill evidence, local event logging, structured parent observations, parent difficulty action records, active parent-approved guidance state, bounded application for supported tap-choice activities, applied-guidance fit review, curriculum graph, mastery engine, transfer coverage with context strength tiers, coverage-driven activity briefs, a parent-only activity brief design queue, local parent brief decisions, persisted mastery snapshots, parent-visible review schedules, configurable local parent gate friction, illustrated Bear Cafe bear/foods/decorations/home backdrop, Bear Cafe delivered-order evidence in Recent Attempts, Bear Cafe accessible choice state, and a parent session review layer.

The current v0.3.52 base grounds parent recommendations in a curriculum graph, mastery evidence, transfer coverage, transfer quality, approved local transfer variants including truthful spoken blending, symbolic word-building transfer, visual Art request matching, contextual spatial matching, a bounded structured-counting Bear Art variant, and a separate vocabulary response after local video exposure, validated repo-bundled exposure-only video intake with a parent-only observation launch and level-matched parent-recorded narration, polarity-aware structured parent observations with optional skill scope, browser-verified mobile geometry, catalog-derived current-rung difficulty coverage, skill-aware content briefs, activity-band coverage validation, parent-clicked transfer launch, durable parent decisions, an activity brief design queue, mastery snapshots, review schedules, curriculum-aligned progress rungs with legacy-profile read migration, compound-round per-skill evidence, the dedicated Word-game initial-sound, blending, and word-building chains inside Pip's Word Workshop, the phone-ready Number Train Math multi-round foundation with upper-band trips, quantity construction, number sequences, and per-skill evidence, Bear Art Studio story/dress-up/gallery/surface/canvas play, the first Story Stage tale, cohesive local Word-game art, the completed visual-cohesion arc, the scoped Bear Cafe adapter with its continuous cafe environment, and parent-readable evidence while keeping accounts, backend auth, cloud sync, and automatic adaptive routing out of scope.
