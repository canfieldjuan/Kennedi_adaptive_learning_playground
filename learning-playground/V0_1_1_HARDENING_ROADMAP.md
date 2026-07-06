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

## Slice 1: Parent Review Readability

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

## Slice 2: Parent Interpretation Layer

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

## Slice 3: Export Polish

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

## Slice 4: Adaptive Recommendation v1

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

## Next Slice

Parent Review UX Polish should come before new child activities.

Build next:

* Better empty states for no attempts, no guidance, and no parent notes.
* Parent Panel data-health summary using local counts already included in export.
* Easier scanning of guidance rows.
* Focused tests for empty-state and data-health formatting.

Still not changing:

* No new games.
* No backend.
* No accounts or cloud sync.
* No automatic child-facing routing.
* No rewards, streaks, rankings, or pressure loops.
