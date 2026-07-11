# MVP Baseline

Version: v0.3.51 Kennedi's Story Stage slice 1 baseline

## Current Working MVP

The Learning Playground is a local-first adaptive learning playground for a preschool child. The current MVP has a child home shell, four large child choices, playable activities, a child home Bear Cafe entry backed by the direct-route Kennedi's Orders adapter and Parent Panel launch path, a local Video Vault with one approved clip and separate response activity reachable by direct route, a parent panel, local attempt logging, local progress tracking, and parent-controlled export/reset.

## Child Modules

- Home shell with exactly four primary choices: Words, Cafe, Math, Art. The cards are warm cream/ink with accent borders over the cafe backdrop, and each carries a small illustrated inline-SVG icon (book, cafe phone, train engine, paint palette — the cafe and math icons are the games' own art). No emoji remains anywhere in child mode (the Bear Cafe completion now bursts illustrated SVG confetti); the direct-route Shapes lane gets a light "shape garden" tint (spatial domain only). Structure, routes, labels, speech-on-tap, and tap targets unchanged (visual arc stage 6).
- Home keeps its four primary choices inside short-wide viewports through a
  height-aware compact mode; browser geometry tests cover 940/941px and
  1024x600 boundaries.
- The three Words modes now play inside **Pip's Word Workshop** (visual arc stage 3): one game-owned illustrated scene (soft warm wall, window, plain-spine bookshelf, pin-board with abstract shapes, rug and prop corners — inert: `aria-hidden`, `pointer-events: none`, and guaranteed letter-free so nothing reads as a choice) behind the matcher, blending, and word builder. Cards hang on a warm display board, sound chips sit on a rail, builder slots sit on a table board, and text/cards switch to ink-on-warm; minor props hide on phones; no gameplay, event, or hint changes and no new animation.
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
- Word Builder short landscape reflows its visual object and Pip beside the
  slots and tile tray, preserving 80x80px letter tiles without required visible
  instruction text. Coloring likewise preserves 80px swatches.
- Existing phonics chain steps now carry versioned difficulty grades that make
  every declared phonics rung reachable without relaxing current-rung evidence
  checks. The rung labels describe the approved word sequence rather than
  claiming unsupported fluency.
- Math activity: the Math tile now opens **Number Train**, the first dedicated Math game runtime (arc slice 1). The child sees a structured quantity — an illustrated engine plus train cars of ten seats in a stable 2×5 layout so fives and tens read at a glance — and taps the matching numeral (a deterministic, seeded six-round trip with a station journey strip, arrival celebration, and Play Again from the next stable seed. Rounds mix reading and building quantities: Count-the-Train rounds, plus Load-the-Train rounds mid-trip where the child seats passengers (tap seats or large Add/Remove controls, remove-before-submit) and presses Check — evaluated only on Check, never per tap, with bounded "how many more" hints that never auto-fill — and a Missing Station round where a short consecutive number path of station signs has one blank the child fills from numeral choices, hinted by walking the track one number at a time. Rounds record honest per-skill evidence via `skill_outcomes`: count rounds exercise counting + numeral recognition, load rounds counting + quantity construction, sequence rounds number sequence + numeral recognition — three new Math curriculum skills alongside generalized counting rungs ("Counts structured quantities accurately", "Counts grouped quantities across tens"); subitizing stays bounded to the small-set legacy activities and never receives Number Train evidence. The trip is phone-ready (one compaction block covers portrait and short landscape; only the display train/journey/path shrink — numeral choices and load controls keep child-safe sizes), the journey strip announces the current station to assistive tech, and Home mid-round clears all pending timers (test-proven). Future Math world seams (world menu, Number Trail, Balance Garden, the 21–50 range, comparison rounds) are documented in the v0.3.32 work contract — described, not built). Counting-only evidence (no subitizing for structured counting), bounded structural hint (occupied seats pulse while the count is spoken), reduced-motion-guarded, local inline SVG art. The three legacy tap-choice Math activities remain registered and reachable by direct route/parent transfer lane.
- The Number Train now rides through **a friendly station world** (visual arc stage 5): a game-owned illustrated scene (soft sky and sun, continuous hills, a solid town silhouette, a station house with an icon-only sign, platform and rail bands — inert: `aria-hidden`, `pointer-events: none`) that contains **nothing countable** (no birds, window rows, or sleeper ties), because every round is a counting task. The journey dots become station markers on a route line (same DOM and progress semantics), the train and number path stand on a platform band that warms on arrival (CSS-only on the existing state class), and numeral cards switch to cream/ink so cars and occupied seats stay stronger than all scenery. The scene remounts with every Play Again trip (test-proven), minor props hide on phones, and plan/seat/hint/evidence behavior is unchanged.
- The Number Train now has three trips: the entry **Number Train** (the Math tile, difficulty 1), the **Number Train Express** (difficulty 3, quantities to 20, medium distractors), and the **Number Train to the Summit** (difficulty 5, the reserved 21-50 range: three-to-five cars of ten, so counting grouped quantities across tens is visible on screen; hard near-miss distractors). Express and Summit are reachable by direct route and the parent transfer lane; the Math tile keeps opening the entry trip. Together they fill six "blocked by content gap" rungs (numeral_recognition, quantity_construction, and number_sequence at levels 1 and 2) — every declared rung of the train skills is now playable, band-fit test-pinned. The one remaining content gap (subitizing level 2) is deliberate: subitizing evidence stays bounded to the small-set legacy activities.
- Art activity: the Art tile now opens **Bear Art Studio**, the dedicated Art game runtime — the child is the artist for the Bear family. A bear requester (Baby Polar Bear, Mama Bear, or Daddy Bear, reusing the Bear Cafe portrait art with waiting/receiving/happy reactions) asks for an art piece via an icon-first visual request card plus a short spoken prompt, and the child works one large art board with big swatches and sticker chips (local inline SVG: star, heart, flower, sun, bubble). Five modes climb the cognitive ask while touch stays preschool-easy: **free decorate** (no wrong answers; creative choices logged, completion on Finish art), **color request** (match the color shown on the bear's card — the color is never spoken, a `different_prompt_mode` transfer for color_fill), **quantity decorate** (first "add 3 stars," then the difficulty-3 "add 5 flowers" card with one extra spot — counting evidence judged only on Check, over/under-count recorded, hint pulses but never auto-fills), **pattern** (continue pink/yellow on Daddy Bear's scarf, per-position evidence — color_fill level 2 "combined orders"), and **fix the art** (one region painted wrong vs the request card; find it and repaint it — error detection + correction, `different_prompt_mode`). Gentle feedback only (wiggle + supportive line, glow hints, bear reactions, no failure states); all six activities are parent-approved with `next_activity_id` chaining and honest per-mode event metadata on the shared ActivityAttemptEvent shape. The studio rides the Art-studio scene from the visual arc.
- Bear Art Studio slice 2 (visual arc follow-on): the chain now runs seven pieces and ends in play — fix-card leads into a **Story Card** ("Baby Polar Bear plays in the garden today" — the spoken story never names the stickers; the child infers what belongs from a pool with day/night distractors, honest per-pick vocabulary evidence at level 2 "uses words flexibly in pretend play", `different_prompt_mode` transfer) and finishes with **Dress Baby Polar Bear** (the shirt is the art surface: swatches repaint it, stickers decorate it). Every mode's finished piece now gets a one-shot **gallery lift-and-frame** beat (reduced-motion keeps the frame, drops the motion). A new moon sticker joins the set.
- Bear Art Studio slice 3: finished pieces become **the child's gallery** — a pure view derived from the event log (the progress-profile pattern: no new storage key, so persistence, parent export, and Clear Progress Data all come from the event log for free, and the derivation is capped at 12 pieces). On every finish a gallery shelf appears under the framed piece: the just-made art slides in first (one-shot, reduced-motion-guarded), followed by up to three earlier pieces, each re-rendered as a tiny framed card from its completion metadata (no stored images). Works for every mode including content variants added by other builders. The finish also scrolls the shelf and Next/Home into view, and the warm scenes' feedback line now pairs its ink text with a cream pill on phones (the dark pill remains for dark-background games).
- Bear Art Studio slice 4: two new free-decorate surfaces complete the spec's surface list — **Poster for the Show** (Mama Bear's performing ask: a portrait poster with a curtain header and a blank banner — never letters — that the child paints and decorates) and **Picture for the Bear House** (Daddy Bear's ask: a landscape canvas in a wood frame with a hanging nail). The shirt's backdrop machinery generalized to a surface map (card/shirt/poster/wall_frame); completion metadata carries the new `art_surface_id`s so the gallery includes them automatically. The chain is now nine pieces: free → pink → stars → pattern → fix → story → poster → wall picture → dress-up finale.
- Bear Art Studio slice 5 — **the canvas pass**: the studio now plays like an art table, not slot placement. A pointer-driven canvas (mouse and touch; fat round-cap strokes, taps leave dots, `touch-action: none` so finger painting never scrolls) with a tool tray — **brush** (draw anywhere in the selected color), **fill** (repaint the surface: card/shirt/poster/wall picture), **stickers** (place anywhere; the empty-boxes grid is gone from free modes). Color requests complete when the asked color is used by either brush or fill (one attempt per stroke end, never per pointer move); sticker-quantity places freely and completes at the asked count (tap a placed sticker to remove below the goal). Brush evidence is summarized (one first-mark event, one per distinct color, completion summary with `colors_used`/`canvas_action_count`). Noise reduction across the studio: icon-only Home/Repeat at every width, title/prompt are screen-reader-only (the spoken prompt + visual request card carry the ask), and a floating green Done check sits on the easel corner. Pattern, story-card, and fix keep their guided interactions; the gallery keeps deriving from the same completion metadata.
- **Kennedi's Story Stage** (slice 1 of 7, `#story-stage` — direct route + Parent Panel launch; deliberately NOT on the home grid yet): the first storytelling runtime. One fixed, fully narrated tale ("Poppy and Biscuit's Forest Adventure", a Lost Friend story where Biscuit is explicitly safe from the first mention) with a six-scene play path, two real decisions (WHERE to look — two distinct illustrated consequences — and HOW to help — two ending variants), a one-line readable caption per scene (usable when speech is off), a neutral six-dot story path, no autoplay (the child advances by choice or Continue), Repeat, and Tell It Again. **Architecturally non-evaluative**: Story Stage is its own route, not a catalog activity — the runtime takes speech only and has no event sink, so creative choices can never become skill evidence, coverage producers, or transfer contexts. Remaining slices (authored model + validator, Pick Three setup, three story families, Tell It Together with adult cues, non-evaluative story history, story-room polish + child-entry proposal) are documented in `docs/contracts/story-stage.contract.md`.
- The legacy tap-fill coloring activities (`art-color-circle`, cool-colors, and the visual color-card transfer) remain registered and reachable by direct route and the parent lane on the untouched `ColoringActivity` runtime.
- Coloring now plays inside **the Art studio** (visual arc stage 4): a game-owned illustrated scene (pinned artwork frames, window, brush shelf, floor and mat, brush pot — inert: `aria-hidden`, `pointer-events: none`) that is deliberately **all-neutral** (creams, wood tones, gray-beige — test-asserted against a named palette) so color on this screen belongs only to the palette swatches and the filled shape. The shape reads as a canvas on an easel, the swatches sit on a wood supply tray, text/cards switch to ink-on-warm, and completing a fill sweeps one paint-shine across the canvas (one-shot, reduced-motion-disabled). Minor props and easel legs hide on phones; the landscape coloring grid, interaction, events, and request-mode behavior are unchanged.
- Art now has one parent-launchable medium transfer activity that shows a visual
  color request card. A mismatched applied color remains correctable and emits
  incorrect evidence; legacy free-choice coloring remains unchanged.
- Video Vault: validated repo-bundled-only video intake, reachable by direct or
  parent-started observation route, with one short local narrated clip,
  `Bear Bakes Bread`. Completion is
  exposure-only. When the clip ends, a manual question action opens a separate
  three-picture vocabulary response; only that response records correct or
  incorrect evidence.
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
- Short-landscape Bear Cafe uses the two-column workbench from 568px upward,
  keeping 80px food choices, Check, wrong feedback, Deliver, and completion
  commands reachable in browser-tested phone viewports.
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
- Parent Panel includes Bear Cafe and Video Observation launch buttons for
  parent-led play. Video Observation opens the existing local vault and emits no
  evidence until the clip itself ends.
- Settings summary for display name, difficulty mode, session length, audio, speech, video, and enabled domains.
- Local progress summary by skill.
- Parent-readable session review with completed activities, skills touched, accuracy by skill, hints used, abandoned activities, most repeated activity, recent attempts, parent-approved guidance evidence, applied-fit review, and structured parent observations.
- Recent Attempts includes Bear Cafe delivered-order completion evidence so parent review can show the order prompt, selected tray, correct order, outcome, hint state, and response time after child-started Cafe play without duplicating its matching tray-check success, hiding a later unfinished identical order, or crowding out earlier struggle evidence.
- Parent Guidance with plain-language status and parent-controlled recommendations by reviewed skill.
- Parent Guidance includes skill graph evidence, mastery status, suggested next action, evidence summary, graph rule, and source references.
- Parent Guidance now joins each stored current curriculum rung to the approved
  activity catalog. It shows whether that rung has playable content, its
  inclusive difficulty band, approved activity count, playable/missing rung
  counts, and explicitly labels missing activity coverage as an app content gap
  rather than a judgment about the child.
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
- The first local video links to its response activity in manifest metadata;
  ending the clip reveals that route but never opens or scores it automatically.

## Local Data

- Parent settings are stored in localStorage.
- Activity attempt events are stored in localStorage.
- Attempt events include prompt text, selected answer, correct answer, response time, hint usage, outcome, and optional per-skill outcomes for compound rounds.
- Pre-v0.1.1 local attempt events are migrated on read rather than dropped.
- Progress profiles are derived from local activity events and stored in localStorage.
- Progress and mastery evidence prefer per-skill outcomes when present and fall back to the global event outcome for older local events.
- Progress level starts at the lowest declared curriculum rung, promotes only from evidence in the current rung's difficulty band, and clamps current-version out-of-range values to the declared max rung.
- Stored progress profiles are normalized on read, so stale pre-v0.3.10 raw levels are translated onto the current curriculum ladder before Parent Panel review or export.
- Parent observations are stored in localStorage and included in export. New
  observations can carry a parent-only fit/support category and optional skill
  scope; legacy free-text notes remain valid.
- Parent difficulty action history and active guidance state are stored in localStorage and included in export.
- Attempt event metadata records when parent-approved guidance affected a supported activity.
- Applied-fit review is derived from local event metadata and active guidance records.
- Mastery evidence is derived from local events and parent observations, with
  source IDs cited. Structured observation evidence is limited to tagged
  independent success or real-world transfer; difficulty and frustration
  signals never become positive mastery evidence.
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
