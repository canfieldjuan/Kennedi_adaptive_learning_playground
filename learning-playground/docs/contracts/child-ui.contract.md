# Child UI Contract

## Navigation
- Child-facing navigation must be icon-first.
- Text labels are optional support, never required for navigation.
- Each main screen may show no more than 4 primary choices.
- Every primary action must be tappable.

## Touch targets
- Selectable play objects must be visually large (minimum 80px by 80px).
- Wide command buttons may be shorter than play objects, but must remain at
  least 56px tall and 96px wide.
- Compact Home and Repeat utility controls may be 44px minimum.
- Primary targets must include forgiving hit zones larger than the visible asset.
- Interactive objects must not be packed tightly together.
- Accidental miss must never trigger punishment.

## Input priority
Preferred interaction order:
1. Tap
2. Tap-then-select
3. Tap-and-hold
4. Drag only when the activity requires it

## Feedback
Every interaction must produce feedback:
- Correct: snap/glow/sound/speech/animation
- Incorrect: bounce/gentle cue/retry
- Idle: subtle prompt after delay
- Completion: short celebration, then return or next choice

## Failure behavior
Wrong answers must:
- Not remove progress
- Not shame the child
- Not display red X as primary feedback
- Offer one hint after repeated miss

## Session rules
- Activities must be short (15-300 seconds).
- Parent may set session limits.
- No autoplay next activity.
- No infinite feed.
