# MVP Baseline

Version: v0.3.34 Bear Cafe environment baseline

## Current Working MVP

The Learning Playground is a local-first adaptive learning playground for a preschool child. The current MVP has a child home shell, four large child choices, playable activities, a child home Bear Cafe entry backed by the direct-route Kennedi's Orders adapter and Parent Panel launch path, a local Video Vault shell reachable by direct route, a parent panel, local attempt logging, local progress tracking, and parent-controlled export/reset.

## Child Modules

- Home shell with exactly four primary choices: Words, Cafe, Math, Art.
- Words activity: initial-sound phonics matcher. It runs on its own `phonics-match` runtime module (the foundation of the Word-game arc), not the shared generic tap-choice grid; Math/Shapes still use tap-choice.
- The Word game is now a multi-word session: after a correct match the child gets a "Next word" button that advances through a fixed, parent-approved chain of initial-sound words — /b/ bear → /m/ moon → /s/ sun → /c/ cat → /t/ top — each a new illustrated card with the same tap-a-picture mechanic (`same_format_new_examples` transfer). The chain is hand-authored via `content.next_activity_id` (no auto-difficulty routing, no reward loop); the last word ends on Home only. Parent transfer recommendation is unchanged (the reverse_mapping "rich transfer" activity is still recommended first).
- The Word game has a recurring illustrated character, **Pip** (local inline SVG in the Bear Cafe standard, distinct coral palette). Pip sits between the prompt and the choices and shows the target sound as a child-legible mouth shape (lips pressed for /b//m/, teeth for /s/, open for /c/, tongue for /t/), pulsing when the prompt is spoken or repeated. On a correct match Pip "comes alive" — cheers and the matched picture pops once. Affect only: the same attempt events fire; deterministic, not a reward loop; all motion reduced-motion-guarded.
- The Word game teaches **sound blending** (the next ladder rung after initial sounds): the child sees a word broken into a sound-out strip (c · a · t) with Pip resting on the first sound, and taps the whole word from a rhyming `-at` set (cat / bat / hat), so success requires attending to every sound. Three chained blends (blend-cat → blend-hat → blend-bat) run on the same `phonics-match` runtime; the initial-sound chain now climbs into them (find-t's "Next" → blend-cat). New `blending` curriculum skill (prerequisite letter_sound_match); new bat/hat illustrated cards. Parent-approved, no auto-difficulty routing, no reward loop.
- Blending now has one parent-launchable medium transfer activity that speaks a
  new phoneme sequence without showing the fixed chain's visual sound strip.
  The existing chain remains unchanged; Parent Guidance can offer the spoken
  activity only after weak visual blending evidence makes transfer appropriate.
- The ten Word-game picture cards (bear, cat, sun, moon, top, dog, fish, ball, bat, hat) are now one **cohesive illustrated set** matching Pip and the Bear Cafe — ink outline `#3a2461`, warm flat fills, friendly rounded forms (previously a mix of flat no-outline and dark-outline clip-art). Pure local-SVG asset swap: same file paths and subjects, so every activity is unchanged; no code, logic, or schema change.
- The Word game's top rung is a **word builder**: the child spells a pictured word by tapping letter tiles into slots in order (c + a + t), each correct letter snaps into the next slot, and completing the word cheers Pip + pops the picture. It is a new tap-then-place interaction added as a **mode of the phonics Word-game runtime** (`WordBuilderActivity`, a separate runtime that reuses Pip; the matcher is untouched) — not a new top-level game type; routed by `interaction_model: tap_then_place` + `domain: phonics` (Bear Cafe's tap_then_place is matched first by its game id). Three chained builds (build-cat → build-dog → build-sun) over existing picture cards; the blending chain now climbs into them (blend-bat's "Next" → build-cat). New `word_building` curriculum skill (prerequisite blending, non-overlapping difficulty bands). Emits the same attempt events; parent-approved, no auto-difficulty routing, deterministic completion (no reward loop); the tile-snap is reduced-motion-guarded.
- Word building now has one parent-launchable medium transfer activity that
  replaces the picture prompt with a printed model word. The child copies
  `map` from shuffled tiles using the same runtime; the fixed picture-building
  chain remains unchanged.
- Existing phonics chain steps now carry versioned difficulty grades that make
  every declared phonics rung reachable without relaxing current-rung evidence
  checks. The rung labels describe the approved word sequence rather than
  claiming unsupported fluency.
- Math activity: the Math tile now opens **Number Train**, the first dedicated Math game runtime (arc slice 1). The child sees a structured quantity — an illustrated engine plus train cars of ten seats in a stable 2×5 layout so fives and tens read at a glance — and taps the matching numeral (a deterministic, seeded six-round trip with a station journey strip, arrival celebration, and Play Again from the next stable seed. Rounds mix reading and building quantities: Count-the-Train rounds, plus Load-the-Train rounds mid-trip where the child seats passengers (tap seats or large Add/Remove controls, remove-before-submit) and presses Check — evaluated only on Check, never per tap, with bounded "how many more" hints that never auto-fill — and a Missing Station round where a short consecutive number path of station signs has one blank the child fills from numeral choices, hinted by walking the track one number at a time. Rounds record honest per-skill evidence via `skill_outcomes`: count rounds exercise counting + numeral recognition, load rounds counting + quantity construction, sequence rounds number sequence + numeral recognition — three new Math curriculum skills alongside generalized counting rungs ("Counts structured quantities accurately", "Counts grouped quantities across tens"); subitizing stays bounded to the small-set legacy activities and never receives Number Train evidence. The trip is phone-ready (one compaction block covers portrait and short landscape; only the display train/journey/path shrink — numeral choices and load controls keep child-safe sizes), the journey strip announces the current station to assistive tech, and Home mid-round clears all pending timers (test-proven). Future Math world seams (world menu, Number Trail, Balance Garden, the 21–50 range, comparison rounds) are documented in the v0.3.32 work contract — described, not built). Counting-only evidence (no subitizing for structured counting), bounded structural hint (occupied seats pulse while the count is spoken), reduced-motion-guarded, local inline SVG art. The three legacy tap-choice Math activities remain registered and reachable by direct route/parent transfer lane.
- Art activity: tap-fill coloring activity.
- Art now has one parent-launchable medium transfer activity that shows a visual
  color request card. A mismatched applied color remains correctable and emits
  incorrect evidence; legacy free-choice coloring remains unchanged.
- Video Vault: parent-approved local video shell, currently empty and reachable
  by direct route. Its manifest now has a validated repo-bundled-only intake
  policy; video completion is explicitly exposure-only and cannot count as a
  vocabulary response or mastery evidence.
- Targeted transfer variants for Words, Math, Art, and shape/spatial practice use the same existing runtimes.
- The first rich transfer variant is a phonics reverse-mapping activity that asks from a word back to its starting letter.
- Math now has a medium transfer activity that asks from a visual dot card to the matching numeral.
- Blending now has a medium different-prompt-mode activity that asks the child
  to combine spoken sounds and choose the matching picture.
- Word building now has a medium symbolic-prompt activity that asks the child
  to copy a printed word with shuffled letter tiles.
- Art now has a medium visual-prompt activity that asks the child to match a
  request-card swatch before filling the circle.
- Spatial practice now has one parent-launchable medium scene-prompt activity.
  The child sees a local illustrated house and identifies the triangle roof,
  crossing from isolated circle cards to a new target shape in context.
- Kennedi's Orders / Bear Cafe is registered as a six-activity local game route, can be started from the Parent Panel, and now occupies the second child home grid slot.
- Bear Cafe now plays inside one continuous illustrated cafe (visual arc stage 2): a game-owned decorative environment layer (wall, window, pendant, icon-only menu board, shelf, plant, counter, floor — inert: `aria-hidden`, `pointer-events: none`) sits behind every stage and reframes per stage — the wall phone station appears during the call, and the customer waits at an illustrated service window (sky, ink frame, counter sill) instead of a floating card. The delivery stage's bell/basket emoji are replaced by illustrated SVG (the Deliver control renders the serving tray, accessible name unchanged); the order sits visibly on the tray at the counter. Scenery hides minor props on phones and never covers controls; no event, timing, or rule changes.
- Bear Cafe delivery now plays a short handoff beat: the plated food travels to the bear and the bear reacts before the order-delivered screen (reduced-motion-guarded); the same completion event still fires.
- The Bear Cafe bear is now an illustrated inline-SVG character (first slice of the chosen illustrated art standard) that expresses the order arc through its face — waiting while its order is prepared, receiving at the handoff, happy on completion — tinted per caller. Local SVG only (no external assets/network/deps); the emoji `content.character.icon` stays in the data (no schema change). This supersedes the earlier emoji reaction accents.
- The seven Bear Cafe foods (apple, banana, berry, bread, cookie, cupcake, soup) are now illustrated inline SVG matching the bear's style — in the choice buttons, the tray, and the count-expanded plating/handoff plates. Local SVG only; `content.food.icon` stays in the data (no schema change); plate count integrity preserved.
- The four Bear Cafe decorations (bubbles, hearts, sprinkles, stars) are now illustrated inline SVG matching the bear/food style — in the decoration choice buttons and the tray plate badge. Local SVG only; `content.decoration.icon` stays in the data (no schema change). This completes the Bear Cafe item art (bear + foods + decorations all illustrated).
- The child home screen now has an illustrated Bear Cafe environment backdrop (a cozy scene — window, hanging sign, pendant light, counter with treats) sitting softened behind the four choices. Local inline SVG only; scoped to the home screen (decorative, `aria-hidden`, `pointer-events: none`), so it sets the mood without competing with the play.
- A correct Bear Cafe check now plays a short cook/plating beat (the order plates up) before "Order ready!"; `tray_checked` still emits on the check (the beat is cosmetic), reduced-motion-guarded.
- Feedback cues (`soft_chime`, `soft_boing`) now produce real sound — synthesized in-process with the Web Audio API (no external assets/network/deps, so the local-only safety boundary holds), soft and short, gated by the parent Sound Effects setting. Shared across all game runtimes; silent no-op where Web Audio is unavailable.
- The Bear Cafe complete screen now plays a one-time celebration burst (a consistent 12-piece confetti/star burst) — positive completion feedback, deterministic (no randomness), not a reward loop or streak; reduced-motion hides it.
- If the child pauses ~9s on the make/fix stage, the order card plays a gentle bounded nudge (a 3-pulse scale/glow) to re-draw attention; it resets on any interaction and fires no speech (not a nag/loop), reduced-motion-guarded.
- Bear Cafe food, color, and decoration choices expose selected state to assistive technology; food choices also include the current tray count in their accessible names.
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
- Voice setting: the parent can choose the spoken-prompt voice from the device's installed speech voices (with a Test-voice preview), stored locally as `speech_voice_uri`. Child voice stays on-device browser speech synthesis (no cloud, no model voice, no recording); when the chosen voice is unavailable or unset, the device default is used; the existing Speech Prompts on/off still applies.
- Active parent-approved guidance state by skill, applied only to supported tap-choice activities.
- Applied Guidance Review summarizes local attempts after active guidance affects a supported activity.
- Curriculum graph and mastery engine reason over prerequisites, transfer, retention, and review timing.
- Curriculum skill levels now carry difficulty bands, so parent-visible progress levels are grounded in declared rungs instead of raw activity ordering.
- Transfer Coverage shows when a skill is fluent in one context, ready for transfer, or blocked by missing approved transfer content.
- Transfer Coverage assigns strength tiers to transfer contexts and prevents weak-only transfer from becoming likely mastery.
- Curriculum coverage validation now rejects phonics rungs with no approved
  activity inside their difficulty band.
- Blending, word-building, and letter-sound content gaps now recommend work for
  the named skill in the existing Word game instead of falling back to generic
  initial-sound Bear Cafe briefs.
- Core evidence-bearing MVP skills now have one approved same-format/new-example transfer variant.
- Phonics now has one approved reverse-mapping transfer variant that references its originating brief.
- Math now has one approved different-prompt-mode transfer variant that references its originating brief.
- Word building now has one approved symbolic different-prompt-mode transfer
  variant that references its originating brief.
- Art now has one approved visual different-prompt-mode transfer variant that
  references its originating brief.
- Spatial now has one approved scene-based different-prompt-mode transfer
  variant that references its originating brief.
- Parent transfer content decisions are stored locally and included in export.
- Parent activity brief decisions are stored locally and included in export.
- Parent mastery snapshots are stored locally when the Parent Panel reviews a skill.
- Parent review schedule records are stored locally from mastery snapshots and shown in the Parent Panel.
- Compound Bear Cafe rounds can record per-skill outcomes so progress and mastery evidence distinguish the quantity signal from the color signal while preserving the overall order result.
- Video completion events carry explicit local provenance and `exposure_only`
  metadata. They may create completion evidence but never a counted vocabulary
  attempt, successful transfer context, or mastery promotion.

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

- Existing MVP runtimes plus the scoped Kennedi's Orders adapter: phonics-match, tap choice, coloring, local video vault shell, and Bear Cafe.
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
