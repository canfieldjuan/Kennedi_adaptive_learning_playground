# Adaptive Learning Playground - v0.1.1 Hardening Roadmap

## Current Product State

The app is a working local-first preschool-safe learning playground with playable MVP activities, local event logging, progress tracking, parent observations, export/reset, and basic session review.

The child experience is functional. The next work should improve parent understanding, not expand child-facing scope.

## Governing Rule

Protect the working child experience. Improve the parent's ability to understand what happened, why it matters, and what to do next.

## Not Changing In This Phase

* No new games
* No backend
* No user accounts
* No cloud sync
* No analytics service
* No child-facing AI
* No reward loops
* No streaks
* No adaptive child routing
* No activity schema expansion unless required for review readability

## Phase 2.1: Parent Review Readability

Status: complete.

### Goal

Make the Parent Panel readable to a non-debugging adult.

### Build

* Resolve activity ids to friendly activity titles.
* Keep raw ids in export data.
* Add a compact Recent Attempts section.
* Show each attempt with:
  * activity title
  * skill
  * prompt
  * selected answer
  * correct answer
  * outcome
  * hint usage
  * response time
* Use parent-friendly labels instead of raw internal names.

### Acceptance Checks

* Parent Panel does not expose raw activity ids as primary labels.
* Export still includes raw ids.
* Recent Attempts can be understood without reading source code.
* Tests cover title resolution and fallback behavior.
* Tests cover recent-attempt formatting.

## Phase 2.2: Parent Interpretation Layer

Status: complete.

### Goal

Turn raw review data into useful parent guidance.

### Build

For each reviewed skill, show:

* recent accuracy
* attempts
* hint use
* abandoned activity count
* repeated error pattern, if detected
* plain-language status

Allowed statuses:

* Ready for next challenge
* Keep practicing here
* Needs more support
* Not enough data yet

### Acceptance Checks

* Recommendations include reasons.
* Recommendations do not use pressure language.
* Recommendations do not compare the child to other children.
* Recommendations do not mention streaks, ranking, or performance pressure.
* Parent can understand what to offer next.

## Phase 2.3: Export Polish

Status: complete.

### Goal

Make local export easier to inspect and safer to preserve.

### Build

Add export metadata:

* export version
* app baseline/version
* export timestamp
* data sections included

Add local data health summary:

* total events
* total sessions
* total observations
* first event timestamp
* latest event timestamp
* migrated event count, if available

### Acceptance Checks

* Export remains valid JSON.
* Export includes all existing data.
* Export structure is documented.
* Export does not send data anywhere.
* Clear progress still clears events, progress, and observations.

## Phase 2.4: Adaptive Recommendation v1

Status: complete for parent-visible recommendation only.

### Goal

Use existing progress data to suggest difficulty changes to the parent without automatically steering the child.

### Build

Recommendation types:

* Promote gently
* Keep stable
* Add support
* Review later
* Not enough data

Recommendation inputs:

* recent accuracy
* attempt count
* hint usage
* repeated incorrect answers
* abandonments
* parent frustration note
* response time trend, if reliable

### Acceptance Checks

* No automatic child-facing routing.
* Parent sees recommendation before any difficulty change.
* Recommendation includes a reason.
* Recommendation can be ignored.
* No streaks, timers, pressure loops, or shame language.

## MVP Phase 2 Definition of Done

Parent can answer:

* [ ] What did my child do?
* [ ] What skills were practiced?
* [ ] What seemed easy?
* [ ] What seemed difficult?
* [ ] What should we try next?
* [ ] Why is the app making that recommendation?
* [ ] Can I export everything?
* [ ] Can I delete everything?
* [ ] Does the child experience remain identical?
* [ ] Does every safety guarantee still hold?

Only after the checklist is satisfied should the app add new activities or automatic adaptation.

## Completed Phase Work: Parent Review UX Polish

Status: Parent Review UX Polish is complete in v0.1.2.

Completed:

* Better empty states for no attempts, no guidance, and no parent notes.
* Parent Panel data-health summary using local counts already included in export.
* Easier scanning of guidance rows.
* Focused tests for empty-state and data-health formatting.

## Completed Phase Work: Parent-Approved Difficulty Actions

Status: Parent-Approved Difficulty Actions are complete in v0.1.3.

Completed:

* Local parent-only difficulty action records.
* Parent controls to record use-suggestion, keep-stable, add-support, promote-gently, review-later, or ignore-for-now decisions.
* Recent parent action history in the Parent Panel.
* Export includes action records.
* Clear Progress Data clears action records.
* Focused tests for action storage, export, clear behavior, and labels.

## Completed Phase Work: Parent Gate Hardening

Status: Parent Gate Hardening is complete in v0.1.4.

Completed:

* Replace the hidden five-tap gear with a clearer parent-gate interaction.
* Require a local parent challenge before rendering `#parent`.
* Keep the gate local-only.
* Do not add accounts, backend auth, or cloud sync.
* Add focused tests for route gating and local-only gate behavior.

## Completed Phase Work: Parent Gate Settings Polish

Status: Parent Gate Settings Polish is complete in v0.1.5.

Completed:

* Let the parent choose a local gate phrase or PIN from the Parent Panel.
* Keep the default simple challenge for first-run use.
* Explain that the gate is local adult friction, not a cloud account login.
* Do not add accounts, backend auth, or cloud sync.
* Add focused tests for saving, exporting, clearing, and applying the local gate setting.

## Lane Status

The v0.1.1 hardening lane is complete enough for next-phase planning.

## Phase 2 Work: Parent-Approved Difficulty Override Model

Status: Phase 2 parent-approved guidance state is complete in v0.1.6.

Completed:

* Add active local parent-approved guidance by skill.
* Keep parent difficulty action history intact.
* Export active guidance with local progress data.
* Clear active guidance with local progress data.
* Stage active guidance before child activity runtime application.

## Completed Phase Work: Parent-Approved Difficulty Application v1

Status: Phase 2 parent-approved guidance application is complete in v0.1.7.

Completed:

* Apply active parent-approved guidance to supported tap-choice activities through a bounded runtime copy.
* Keep source activity JSON and the existing activity schema unchanged.
* Record applied guidance in local attempt event metadata.
* Show applied guidance in parent Recent Attempts.
* Leave coloring and Video Vault unsupported for difficulty application in this phase work.

## Completed Phase Work: Applied Guidance Fit Review

Status: Phase 2 applied fit review is complete in v0.1.8.

Completed:

* Summarize attempts after active parent-approved guidance affects an activity.
* Show accuracy, hints, stops, activity titles, and a parent-safe keep/reset/support review.
* Keep the review local and deterministic.
* Do not mutate active guidance automatically from the review.
* Do not add new games, backend services, accounts, cloud sync, or child-facing routing.

Still not changing:

* No new games.
* No backend.
* No accounts or cloud sync.
* No automatic child-facing routing.
* No hidden or automatic difficulty changes without parent approval.
* No rewards, streaks, rankings, or pressure loops.

## Phase 3: Skill Graph + Mastery Engine

Status: Phase 3 starts in v0.2.0.

Completed:

* Add curriculum graph contracts.
* Add a local curriculum graph for existing MVP skills only.
* Add graph validation for missing references, self-unlocks, and circular prerequisites.
* Add source-cited mastery evidence.
* Add mastery evaluation with transfer required before `mastered`.
* Add deterministic review scheduling.
* Add graph-backed evidence to Parent Guidance without auto-applying recommendations.

Still not changing:

* No new games.
* No backend.
* No accounts or cloud sync.
* No automatic child-facing routing.
* No reward system, streaks, rankings, or pressure loops.

## Phase 3.5: Transfer Coverage + Content Gap Engine

Status: Phase 3.5 continued in v0.2.1, added targeted transfer variants in v0.2.2, added parent-approved transfer launch in v0.2.3, and added transfer quality/context strength rules in v0.2.4.

Completed:

* Add required transfer metadata to existing approved activities.
* Add planned transfer context types to the curriculum graph.
* Add transfer coverage evaluation for approved, successful, and missing contexts.
* Add content gap recommendations that cite missing context type and suggested template.
* Keep single-context fluency separate from likely mastery.
* Store parent approve/hold transfer-content choices locally.
* Include parent transfer decisions in export and clear-data behavior.
* Add same-format/new-example transfer variants for core evidence-bearing MVP skills using existing runtimes.
* Keep the child home grid unchanged while variants become approved local contexts.
* Let the parent start or hold a concrete approved transfer activity from Parent Guidance.

Still not changing:

* No new games.
* No backend.
* No accounts or cloud sync.
* No automatic child-facing routing.
* No mass-generated activities.
* No reward system, streaks, rankings, or pressure loops.
