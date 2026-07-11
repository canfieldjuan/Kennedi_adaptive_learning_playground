# Game Environment Contract

The shared art-direction law for the visual enrichment arc (issue #55) and all
future game scenery. Every game should feel like its own small illustrated
place — a child should recognize the game from the environment before reading
a title. This contract governs presentation only: it never changes curriculum,
difficulty, evidence, mastery, routing, game rules, activity outcomes, or
parent behavior, and any narrowly required visual-state hook must be
documented in the game's work contract before implementation.

## Style

Extend the established language of Bear Cafe's characters/foods, Pip, and the
illustrated word cards:

- Purple ink outlines (`#3a2461` family), rounded child-friendly geometry.
- Warm flat fills; soft depth (overlap + softened tone), never photorealism.
- Clear silhouettes, large readable subjects, friendly expressions.
- Restrained decorative detail with intentional areas of rest — no even
  scatter of props.
- Cohesive local project-owned art governed by
  `art-production-assets.contract.md`: inline SVG or optimized local exports,
  with editable source and provenance. No unverified stock clip art, remote
  assets, base64 blobs, or emoji left inside completed illustrated scenes when
  a local illustrated part can replace them.
- No child-facing text added for scenery; no readable words inside scenes
  (menus, signs, and labels use shapes/icons).

## Scene layers

Every game scene composes three layers:

- **Background** — the setting: walls, windows, sky, landscape, shelves,
  large environmental shapes.
- **Middle ground** — objects that establish the activity: counters, tables,
  tracks, easels, station platforms, kitchen equipment.
- **Foreground** — subtle framing near the play: counter edges, floor
  shapes, rugs, plants, nearby props. Foreground decoration must never cover
  controls or reduce tap space, and stays shallow on mobile.

## Visual hierarchy

Decoration frames the play; it never competes with it. Priority order:

1. Current task
2. Available choices
3. Main character or active subject
4. Progress or current stage
5. Environmental decoration

Backgrounds use lower contrast and saturation than interactive controls. The
interactive object remains the clearest element on screen. Never shrink
activity content to make room for scenery, and never add labels merely to
explain the art.

## Motion

Sparing, purposeful, one-shot. Allowed: a sign settling when a scene begins,
steam over a finished order, a leaf shifting during a transition, a character
reacting to an answer, a train arriving, a one-time finishing flourish, a
service window opening during handoff. Forbidden: infinite bouncing, multiple
simultaneous loops, fast parallax, flashing scenery, decorative motion near
answer choices, random motion, particles during normal interaction, anything
that pressures the child. All motion respects `prefers-reduced-motion`.

## Implementation

- Runtime scenes are **game-owned** (`src/modules/<game>/…`) and use either
  small focused inline-art modules or optimized local exports under the
  production-art contract. No universal background component with per-game
  conditions; shared primitives are extracted only after two real game
  implementations need the same behavior.
- Decorative layers are `aria-hidden="true"` with `pointer-events: none`,
  scoped CSS, and stable DOM hooks (a `*-scene` class per game) for tests.
- No canvas without proven need, no new runtime dependencies, no global CSS
  changes that affect other activities, no text baked into SVG.
- Decorative elements are never rendered as buttons or focusable elements.

## Mobile

Check every scene near 390×844 and the phone-landscape breakpoint. Scenery
may crop responsively (hide minor props, crop wide edges, reduce background
detail); interactive content may not shrink below safe target sizes, hide
behind scenery, fall below the fold for decoration's sake, or overlap fixed
controls. Preserve the primary character and activity area first.

## Performance

No network requests for art, no large raster assets without explicit
approval, no unnecessary repeated decorative SVG DOM, no animation-driven
layout thrashing, no timers left active after navigation, no material initial
load growth, no noticeable input delay on mobile hardware.

## Verification

Automated tests prove: the scene renders for its game only; decorative layers
are `aria-hidden` and cannot intercept taps; existing controls, accessible
labels, events, navigation, and single-emission completion behavior are
unchanged; reduced-motion disables nonessential animation; mobile structural
contracts hold; no external URLs. Do not assert every SVG path.

Every game PR also ships screenshots or preview captures — desktop start,
mobile start, main interaction, incorrect/hint state where applicable,
completion, and reduced-motion when motion is present (all stages for Bear
Cafe) — and names the images that need owner look approval. A visual pass is
never complete solely because TypeScript and tests pass.
