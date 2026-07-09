# MVP Baseline

Version: v0.3.17 Word-game more-initial-sounds baseline

## Current Working MVP

The Learning Playground is a local-first adaptive learning playground for a preschool child. The current MVP has a child home shell, four large child choices, playable activities, a child home Bear Cafe entry backed by the direct-route Kennedi's Orders adapter and Parent Panel launch path, a local Video Vault shell reachable by direct route, a parent panel, local attempt logging, local progress tracking, and parent-controlled export/reset.

## Child Modules

- Home shell with exactly four primary choices: Words, Cafe, Math, Art.
- Words activity: initial-sound phonics matcher. It runs on its own `phonics-match` runtime module (the foundation of the Word-game arc), not the shared generic tap-choice grid; Math/Shapes still use tap-choice.
- The Word game is now a multi-word session: after a correct match the child gets a "Next word" button that advances through a fixed, parent-approved chain of initial-sound words — /b/ bear → /m/ moon → /s/ sun → /c/ cat → /t/ top — each a new illustrated card with the same tap-a-picture mechanic (`same_format_new_examples` transfer). The chain is hand-authored via `content.next_activity_id` (no auto-difficulty routing, no reward loop); the last word ends on Home only. Parent transfer recommendation is unchanged (the reverse_mapping "rich transfer" activity is still recommended first).
- Math activity: tap-choice counting/subitizing activity.
- Art activity: tap-fill coloring activity.
- Video Vault: parent-approved local video shell, currently empty until local video assets are added and reachable by direct route.
- Targeted transfer variants for Words, Math, Art, and shape/spatial practice use the same existing runtimes.
- The first rich transfer variant is a phonics reverse-mapping activity that asks from a word back to its starting letter.
- Math now has a medium transfer activity that asks from a visual dot card to the matching numeral.
- Kennedi's Orders / Bear Cafe is registered as a six-activity local game route, can be started from the Parent Panel, and now occupies the second child home grid slot.
- Bear Cafe delivery now plays a short handoff beat: the plated food travels to the bear and the bear reacts before the order-delivered screen (reduced-motion-guarded); the same completion event still fires.
- The Bear Cafe bear is now an illustrated inline-SVG character (first slice of the chosen illustrated art standard) that expresses the order arc through its face — waiting while its order is prepared, receiving at the handoff, happy on completion — tinted per caller. Local SVG only (no external assets/network/deps); the emoji `content.character.icon` stays in the data (no schema change). This supersedes the earlier emoji reaction accents.
- The seven Bear Cafe foods (apple, banana, berry, bread, cookie, cupcake, soup) are now illustrated inline SVG matching the bear's style — in the choice buttons, the tray, and the count-expanded plating/handoff plates. Local SVG only; `content.food.icon` stays in the data (no schema change); plate count integrity preserved.
- The four Bear Cafe decorations (bubbles, hearts, sprinkles, stars) are now illustrated inline SVG matching the bear/food style — in the decoration choice buttons and the tray plate badge. Local SVG only; `content.decoration.icon` stays in the data (no schema change). This completes the Bear Cafe item art (bear + foods + decorations all illustrated).
- The child home screen now has an illustrated Bear Cafe environment backdrop (a cozy scene — window, hanging sign, pendant light, counter with treats) sitting softened behind the four choices. Local inline SVG only; scoped to the home screen (decorative, `aria-hidden`, `pointer-events: none`), so it sets the mood without competing with the play.
- A correct Bear Cafe check now plays a short cook/plating beat (the order plates up) before "Order ready!"; `tray_checked` still emits on the check (the beat is cosmetic), reduced-motion-guarded.
- Feedback cues (`soft_chime`, `soft_boing`) now produce real sound — synthesized in-process with the Web Audio API (no external assets/network/deps, so the local-only safety boundary holds), soft and short, gated by the parent Sound Effects setting. Shared across all game runtimes; silent no-op where Web Audio is unavailable.
- The Bear Cafe complete screen now plays a one-time celebration burst (a consistent 12-piece confetti/star burst) — positive completion feedback, deterministic (no randomness), not a reward loop or streak; reduced-motion hides it.
- If the child pauses ~9s on the make/fix stage, the order card plays a gentle bounded nudge (a 3-pulse scale/glow) to re-draw attention; it resets on any interaction and fires no speech (not a nag/loop), reduced-motion-guarded.
- Puzzle activity remains registered and reachable by direct route, but is not currently on the four-slot home grid.

## Parent Modules

- Parent Panel behind a visible local parent check.
- Parent Panel includes a Bear Cafe launch button for parent-led play.
- Settings summary for display name, difficulty mode, session length, audio, speech, video, and enabled domains.
- Local progress summary by skill.
- Parent-readable session review with completed activities, skills touched, accuracy by skill, hints used, abandoned activities, most repeated activity, recent attempts, parent-approved guidance evidence, applied-fit review, and parent notes.
- Recent Attempts includes Bear Cafe delivered-order completion evidence so parent review can show the order prompt, selected tray, correct order, outcome, hint state, and response time after child-started Cafe play without duplicating its matching tray-check success, hiding a later unfinished identical order, or crowding out earlier struggle evidence.
- Parent Guidance with plain-language status and parent-controlled recommendations by reviewed skill.
- Parent Guidance includes skill graph evidence, mastery status, suggested next action, evidence summary, graph rule, and source references.
- Parent Guidance shows transfer quality so weak-only coverage is visible to the adult.
- Parent Guidance shows coverage-driven activity briefs when richer transfer evidence is missing.
- Parent Panel groups latest activity brief decisions into an approved/held/archived design queue.
- Parent Guidance can show a concrete approved transfer activity and let the parent start or hold it.
- Local progress export and reset.
- Local parent gate phrase setting.
- Active parent-approved guidance state by skill, applied only to supported tap-choice activities.
- Applied Guidance Review summarizes local attempts after active guidance affects a supported activity.
- Curriculum graph and mastery engine reason over prerequisites, transfer, retention, and review timing.
- Curriculum skill levels now carry difficulty bands, so parent-visible progress levels are grounded in declared rungs instead of raw activity ordering.
- Transfer Coverage shows when a skill is fluent in one context, ready for transfer, or blocked by missing approved transfer content.
- Transfer Coverage assigns strength tiers to transfer contexts and prevents weak-only transfer from becoming likely mastery.
- Core evidence-bearing MVP skills now have one approved same-format/new-example transfer variant.
- Phonics now has one approved reverse-mapping transfer variant that references its originating brief.
- Math now has one approved different-prompt-mode transfer variant that references its originating brief.
- Parent transfer content decisions are stored locally and included in export.
- Parent activity brief decisions are stored locally and included in export.
- Parent mastery snapshots are stored locally when the Parent Panel reviews a skill.
- Parent review schedule records are stored locally from mastery snapshots and shown in the Parent Panel.
- Compound Bear Cafe rounds can record per-skill outcomes so progress and mastery evidence distinguish the quantity signal from the color signal while preserving the overall order result.

## Local Data

- Parent settings are stored in localStorage.
- Activity attempt events are stored in localStorage.
- Attempt events include prompt text, selected answer, correct answer, response time, hint usage, outcome, and optional per-skill outcomes for compound rounds.
- Pre-v0.1.1 local attempt events are migrated on read rather than dropped.
- Progress profiles are derived from local activity events and stored in localStorage.
- Progress and mastery evidence prefer per-skill outcomes when present and fall back to the global event outcome for older local events.
- Progress level starts at the lowest declared curriculum rung, promotes only from evidence in the current rung's difficulty band, and clamps current-version out-of-range values to the declared max rung.
- Stored progress profiles are normalized on read, so stale pre-v0.3.10 raw levels are translated onto the current curriculum ladder before Parent Panel review or export.
- Parent observations are stored in localStorage and included in export.
- Parent difficulty action history and active guidance state are stored in localStorage and included in export.
- Attempt event metadata records when parent-approved guidance affected a supported activity.
- Applied-fit review is derived from local event metadata and active guidance records.
- Mastery evidence is derived from local events and parent observations, with source IDs cited.
- Transfer coverage and parent transfer decisions are local-first and export with progress data.
- Parent-started transfer activity decisions include the selected activity when available.
- Parent activity brief decisions, mastery snapshots, and review schedule records are local-first and export with progress data.
- Export includes metadata, app baseline/version, section list, and local data health.
- Child data does not leave the device by default.

## Safety Baseline

- No backend services.
- No public accounts.
- No cloud analytics.
- No open web search.
- No external child-facing links.
- No open YouTube.
- No ads, feeds, comments, chat, upload forms, or social sharing.
- No autoplay chains.
- No generative AI output is shown directly to the child.

## Activity Runtime Baseline

- Existing MVP runtimes plus the scoped Kennedi's Orders adapter: tap choice, coloring, local video vault shell, and Bear Cafe.
- Activities conform to the existing activity schema.
- Approved transfer variants and Kennedi's Orders activities conform to the same activity schema and safety rules.
- Rich transfer variants must pass truth checks that verify the activity content matches the declared transfer context.
- Math prompt-mode transfer variants must prove a visual quantity-card prompt with numeral choices.
- Bear Cafe category-sort and fix-order prompt-mode activities must pass game-specific truth checks.
- Supported tap-choice activities can receive a bounded runtime copy from active parent-approved guidance; source activity JSON is not mutated.
- Wrong answers guide gently and do not remove progress.
- Completion remains short and returns control to the child or parent.

## v0.1.1 Hardening Scope

- Preserve the working MVP.
- Improve baseline documentation.
- Strengthen local event logging.
- Add parent observation storage.
- Add parent session review.
- Add parent-readable activity titles and recent attempts.
- Add parent interpretation and parent-only recommendations.
- Add export metadata and local data health.
- Add tests for event logging and observation storage.
- Add tests for review formatting, interpretation, and export structure.

## Intentional Non-Goals

- No additional games beyond the scoped Kennedi's Orders adapter.
- No `Nature Camera Safari`.
- No additional home-screen tiles beyond Words, Cafe, Math, and Art.
- No backend services.
- No schema expansion unless strictly required.
- No automatic adaptive routing.
- No hidden difficulty changes without parent approval.
- No rewards, streaks, leaderboards, or pressure loops.
