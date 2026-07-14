# Change Contract: Number Train world packs (arc)

Owner directive (2026-07-13): a game world-pack system — same learning
mechanics, different fantasy. Number Train is the proof game with two
worlds: Train Station (default, the current fantasy) and Space Shuttle.
"A good world pack changes the fantasy, not the learning contract."
Worlds are expression, never progression: no earning, unlocking,
purchasing, or random receipt.

## Root Cause

Game fantasy and game mechanics are too closely coupled to support
multiple visual worlds safely: the engine/passenger art, the scene, the
palette, and the flavor copy are direct imports and literals inside the
Number Train runtime. Adding a second world today would mean duplicated
runtime or `if (world)` branches through core logic.

## Protected Number Train behavior (the behavior map)

Verified from code on main; every item below MUST be unchanged by every
slice of this arc:

- **Plans**: `buildSessionPlan(config)` — seeded (`content.seed` fixed in
  the three activity JSONs), ramped quantities, deterministic round kinds
  (`roundKindAt`: 6-round trips = count ×3, load at index 3,
  missing-station at index 4 when max ≥ 3, stretch count last)
  (`src/modules/number-train/round-plan.ts`).
- **Round types and evaluation**: count (choices, correct = quantity),
  load (tappable seats, evaluated ONLY on Check, `built === target`),
  missing-station (sequence with blank, correct = hidden value)
  (`NumberTrainActivity.ts` renderCountRound/renderLoadRound/
  renderSequenceRound).
- **Seat integrity**: `SEATS_PER_CAR = 10`; cars =
  `ceil(capacity/10)`; load seats rendered = `loadSeatCapacity(target)`;
  ten-structure and five/ten grouping stay visually obvious.
- **Spoken lines**: ALL from `train-lines.ts` pure builders + activity
  JSON — enumerated by the voice packs (three packs; lockstep contract
  test). New world flavor lines MUST enter through the same enumeration.
- **Evidence**: `createAttemptEvent` shapes — outcome, selected,
  attempt_number, response_time_ms, hint flags; per-skill ids from the
  activity. Session completion emits the existing arrival flow.
- **Hints**: counting hint after `maxAttemptsBeforeHint`, structural load
  hints (`loadStructuralHintLine`), sequence walk hint; hints glow, never
  auto-fill.
- **Cleanup**: `cleanupHandlers` + `timeoutHandles` torn down on destroy;
  Home mid-beat must not leak timers.
- **Environment inertness**: the scene is `aria-hidden`,
  `pointer-events: none`, behind content (`station-environment.ts`,
  game-environment contract); mobile uses the `<picture>` bands-only swap
  at the compact query; the backdrop holds ZERO countable clusters
  (counting guardrail comment, station-environment.ts:6-9).
- **Reduced motion / mobile**: existing `prefers-reduced-motion` blocks
  and the compact-query structural rules in `child-ui.css`
  (mobile-child-ui contract tests pin them).
- **Accessibility**: aria labels on train image ("A train carrying N
  passengers"), seats ("Empty seat…"/"Seat with passenger…"), Repeat/Home
  icon buttons, aria-live feedback.

## Governing contracts (read, and binding)

- `reward.contract.md`: "Random scenery variation is allowed when it does
  not alter access or learning truth. Randomized access to customization
  is forbidden." Customization available without points/streaks/labor.
- `ownership-completion.contract.md`: completion object with exact-choice
  continuity, unscored choices, revisitable, bounded, local, malformed-
  safe; expressive choices never touch evidence.
- `game-environment.contract.md`: style law (purple ink, warm flat fills,
  silhouettes, no readable words in scenes), scene layering, inertness.
- `art-production-assets.contract.md`: editable design-source, local
  exports, provenance ledger per asset family, look approval.
- `safety.contract.md` / no-auto-change: world SELECTION is the child's
  explicit act (owner decision: "kennedi picks"); nothing changes behind
  anyone's back.

## Arc slices

1. **Contract + world boundary** (this slice): this document; the
   `NumberTrainWorldPack` type; pure validator; registry with Train
   Station as the stable default, its manifest REFERENCING the existing
   renderers; resolution/fallback rules; contract tests. Runtime
   untouched — the game renders exactly as before.
2. **Train Station extraction**: runtime consumes presentation through
   the pack (engine, passenger, scene, palette via world-scoped CSS
   variables). No visual redesign; existing tests are the parity proof.
3. **Space Shuttle style proof**: ONE representative visual (module +
   ten-pod structure + mission guide + mobile layout + a count round +
   customization preview) → owner look approval BEFORE building the full
   world. Side-by-side with Train Station.
4. **Space Shuttle world**: full manifest + assets (design-source +
   provenance), poses, scenes, progress, completion destination, sound
   mappings, mobile/reduced-motion. Acceptance: primarily manifest+assets;
   world-specific conditionals stay behind explicit pack capabilities.
5. **Child world selection**: two large preview cards, spoken labels, no
   locks/prices/progress gates, selected state, one Start control; local
   preference with safe fallback (invalid/missing → default); world
   stable for the session; selector skipped when only one world exists;
   NOT on the home screen.
6. **Ownership customization**: 1–2 expressive choices per world
   (semantically parallel slots where honest: guide_headwear,
   vehicle_badge, vehicle_accent); exact-choice continuity through
   departure/arrival/completion; smallest non-evaluative completion
   record (follow the cafe #116 ownership-completion pattern); export/
   clear handling if persistence changes.
7. **Polish + audit**: captures (both worlds × desktop/mobile/reduced-
   motion), accessibility + performance review, provenance completion,
   cold diff audit, how-to-add-a-third-world doc.

## Non-scope (arc-wide)

No themes for other games (future seams documented at the end only); no
unlock/currency/streak/random-reward systems; no accounts/cloud/remote
assets/uploads/generative theme creation; no global theming engine or
design-token rewrite; no plugin architecture or visual editor; no new
home tile; no new learning mechanics, skills, or evidence
interpretations; no gameplay redesign; no broad refactors.

## Slice 1 scope

Touch: `docs/work-contracts/number-train-world-packs.md` (this file),
`src/modules/number-train/world-pack.types.ts`,
`src/modules/number-train/world-validator.ts`,
`src/modules/number-train/world-registry.ts`,
`src/modules/number-train/worlds/train-station/train-station.world.ts`,
`tests/contract/number-train-world-packs.test.ts`.

Must not touch: `NumberTrainActivity.ts`, `round-plan.ts`,
`train-lines.ts`, `train-art.ts`, `station-environment.ts`, CSS, any
other game, persistence, voice manifests.

## Slice 1 verification

- Full gate (`npm test` incl. work-contract check) + typecheck + build.
- New contract tests: Train Station validates; it is the default; unknown/
  malformed preferred ids resolve to the default; duplicate ids, wrong
  game id, missing slots, external URLs, invalid colors, empty spoken
  labels, missing provenance all FAIL validation.
- Existing Number Train tests unchanged and green (parity by
  construction — runtime untouched).

## Slice 6 decisions (ownership customization)

- The decorate beat runs AFTER the completed evidence fires: expressive
  choices can never touch evidence by construction. No events are emitted
  during decoration (test-pinned).
- Trip records mirror the cafe order-history pattern exactly: capped (12),
  deduped by completion_id, per-record malformed-safe reads, exported
  under `train_trip_history`, cleared by the parent data-clear (which now
  also clears the world preference).
- Replay contract: Play Again keeps the world and re-runs the decorate
  beat with defaults — a fresh trip is a fresh decoration; her PREVIOUS
  trip is preserved in the history and greets her as the keepsake chip
  on the world-choice screen (the revisit surface).
- The badge overlays the vehicle-front element (tracked reference, no
  DOM queries); the accent rides a --vehicle-accent CSS variable read by
  accent regions inside the vehicle art of BOTH worlds.

## Contract Amendments

- **Slice 2 — partial palette wiring is deliberate**: only the palette
  keys whose current CSS values are plain hex (vehicleBody -> car
  background, seatOccupied -> occupied-seat background) are wired as
  world-scoped CSS variables now, with the exact current values as
  fallbacks. The alpha-based styles (empty seat, ink borders) and the
  sky/ground (owned by the scene SVG itself) wire up when the Space
  Shuttle actually varies them — extracting them speculatively would
  invite alpha/hex mismatches for zero present benefit.
- **Slice 3 — dark-sky worlds need a text-ink capability (proof
  finding)**: the first shuttle mock rendered the title/prompt/chrome in
  ink-on-space (unreadable). The palette gained required textInk +
  textSoft keys; the runtime applies them (plus a derived translucent
  chrome background) as world-scoped variables on the title, prompt,
  feedback, and icon-button rules with the Train Station values as
  fallbacks — the default world is pixel-unchanged. Validator requires
  both keys.
- **Slice 4 — the `.train-station` container class is the legacy
  screen-scope class** (like `.bear-cafe`), applied identically for every
  world; the shuttle renders under it. Renaming it would churn pinned
  selectors across the mobile contract tests for zero behavior — kept,
  and the no-conditionals contract test pins it to exactly one
  occurrence so a real world branch can never hide behind it.
- **Slice 3 — proof notes for the full world**: the moon needs to move
  clear of the Repeat button zone; the scene should reserve the same
  clear zones the station scene established. The prototype world was
  probed via a TEMPORARY registry patch (never committed) — the shuttle
  registers as a real world only in slice 4, after look approval.
