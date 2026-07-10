# Game Maturity Contract

## Purpose

A playable game is not mature just because a child can complete it.

A mature learning game must keep the child experience simple while making the learning challenge better fitted to the child. When observation shows that a game is too easy, the next pass should increase cognitive challenge without increasing physical complexity, emotional pressure, or UI noise.

## Product Rule

The app adapts cognitive difficulty upward while keeping physical interaction and emotional feedback preschool-safe.

## Child UI Rule

Child mode must follow:

```txt
One screen.
One goal.
One main action.
Everything else hidden, icon-only, or parent-only.
```

## Game Maturity Requirements

A game-maturity pass may:

- reduce child-visible text
- replace labels with visual objects
- add short multi-round progression
- increase difficulty using existing skills
- add richer order or problem logic
- emit stronger evidence through the existing event shape
- improve completion payoff without adding reward loops

A game-maturity pass must not:

- add a new game
- add backend services, auth, cloud sync, open web content, ads, rewards, streaks, leaderboards, or public sharing
- weaken parent approval
- weaken safety rules
- weaken mastery or transfer rules
- create a second progress system
- turn challenge into speed pressure, shame, or punishment

## UI Noise Standard

Child mode should prefer:

- character portraits
- spoken prompts
- visual tickets or task objects
- large tappable objects
- trays, baskets, boards, or other pretend-play containers
- icon-only home and repeat controls
- small progress dots or tickets

Child mode should reduce or remove:

- long visible prompts
- repeated labels
- adult-style control text
- debug or evidence language
- unnecessary headings
- multiple competing action buttons
- cluttered control groups

## Evidence Standard

Game maturity must improve observation, not hide it.

Use the existing `ActivityAttemptEvent` shape. A mature game should emit events for:

- meaningful correct selections
- meaningful incorrect selections
- hint usage
- activity or order completion
- final shift or round-set completion when applicable

Use event metadata for game-specific details such as:

- round number
- order type
- requested quantity
- selected quantity
- target sound
- correction requirement

## Safety Standard

Feedback must remain gentle:

- correct actions may pop, sparkle, move to the tray, or trigger warm speech
- incorrect actions may wiggle or prompt checking
- no harsh sounds
- no red X as primary feedback
- no timers
- no failure screens
- no public sharing
- no external content

