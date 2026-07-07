# Game Intake Contract

## Purpose

Game intake turns an external or branch-built game into an integration decision. It is not the same as wiring the game into the child experience.

The intake step exists to protect the working app from old-base merges, broad branch payloads, unvalidated activity claims, and child-facing behavior changes that have not been checked against the current product contracts.

## Required Before Wiring

Before a built game can be wired into current main, the repo must have an intake record that states:

- source branch, source path, and source commit
- game modules, activities, styles, tests, and app wiring found
- exact game scope being considered
- explicit non-scope
- compatibility with the current activity schema
- compatibility with current safety rules
- compatibility with current event logging requirements
- compatibility with current transfer truth rules
- current blockers and required adapter work
- recommended integration strategy

## Approved Intake Outcomes

- `ready_for_adapter`: the game is useful, but must be extracted into current main through a dedicated implementation slice.
- `ready_for_direct_wire`: the game is already based on current main and has no broad or out-of-scope payload.
- `hold_for_redesign`: the game does not satisfy safety, evidence, or activity-contract requirements.
- `out_of_scope`: the game is not part of the current product lane.

## Rules

- Do not direct-merge an old-base game branch into current main.
- Do not import unrelated games while integrating one game.
- Do not expose a game on the child home screen during intake.
- Do not treat branch tests as sufficient for current main if current main has newer contracts.
- Do not weaken activity schema, transfer truth, mastery, parent approval, event logging, storage, or safety rules to fit a game.
- Do not add backend services, auth, cloud sync, AI tutor chat, open web content, rewards, streaks, leaderboards, or public sharing as part of game intake.

## Wiring Gate

A game may move from intake to implementation only when the next slice names:

- the exact files to extract or rewrite
- the specific activity IDs to register
- the current-main tests to add
- how child entry is exposed or withheld
- how parent approval remains required
- how rich transfer claims are proven by game-specific truth guards

