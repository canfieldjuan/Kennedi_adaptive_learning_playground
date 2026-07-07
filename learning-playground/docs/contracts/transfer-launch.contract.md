# Transfer Launch Contract

Transfer launch closes the parent-controlled loop for approved transfer variants. The app may suggest a concrete transfer activity, but the parent decides whether and when to start it.

## Requirements

- A transfer launch recommendation must point to an approved local activity.
- The recommended activity must support the same skill and an approved transfer context that has not yet produced successful evidence.
- The Parent Panel must show the recommended activity title before launch.
- Starting a transfer activity must require a parent click in the Parent Panel.
- Starting a transfer activity must record a local parent transfer decision before navigating.
- Holding a transfer activity must record a local parent transfer decision and stay in the Parent Panel.
- Transfer launch must use existing activity routes and existing activity runtimes.
- Transfer launch decisions must remain local and export with progress data.

## Non-Scope

- No automatic child-facing routing.
- No new child home menu items.
- No new game types.
- No backend content service.
- No cloud sync or accounts.
- No rewards, streaks, rankings, or pressure loops.
