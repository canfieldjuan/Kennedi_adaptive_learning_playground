# Game Maturity Contract

## Purpose
Game modules should feel like replayable child fantasies, not one-shot worksheets. A mature game keeps physical interaction preschool-safe while adding enough rounds, visual context, progression variants, and evidence events to support adaptive learning over time.

## Maturity Ladder
- Level 0: Activity renders.
- Level 1: One-shot playable.
- Level 2: Multi-round playable.
- Level 3: Progression variants exist.
- Level 4: Strong transfer evidence exists.
- Level 5: Replayable child fantasy feels complete.

## v0.3.0 Target
- `Kennedi's Orders`: Level 3.
- `Nature Camera Safari`: Level 3.

## Required Before Implementation
For any maturity pass, write:
- root cause
- required change surface
- explicit non-scope
- assumptions or blockers
- verification plan

## Allowed Surface
- existing game modules
- game-specific activity JSON
- game-specific CSS in the existing child UI stylesheet
- game-specific tests
- activity catalog or title lookup only when needed for existing game variants
- routing only when required by existing game behavior

## Protected Surface
Do not change:
- activity schema
- skill graph
- mastery rules
- transfer strength rules
- parent approval rules
- storage or migrations
- backend, auth, cloud sync, real camera, AI tutor chat, public sharing, rewards, streaks, leaderboards, or open web behavior
- future roadmap games

## Required Game Guarantees
Each mature game must provide:
- a clear child fantasy
- at least 3 rounds or replay states
- at least 3 progression variants
- clear visual feedback
- an obvious finish moment
- evidence events per meaningful round
- parent-readable evidence through existing event fields and metadata
- safe retry behavior
- no reading dependency
- no external content

## Verification
Run the repo's actual checks:
- `npm test`
- `npm run typecheck`
- `npm run build`

Browser verification should cover at least one successful path and one safe retry path when UI behavior changed.
