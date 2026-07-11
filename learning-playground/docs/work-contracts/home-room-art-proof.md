# Home room production-art proof (art arc slice 3)

One-scene visual proof for the child home backdrop under
`art-production-assets.contract.md`, following the Bear Cafe pilot
pattern (PR #92). Draft PR, no version bump, merge blocked on Juan's
look approval.

## Before Code

### Root Cause

The home backdrop is a 480×340 inline SVG stretched cover over the
viewport, so its props land unpredictably relative to the FIXED layout
zones: the "Bear Cafe" sign sits center-top exactly where the greeting
renders (text-on-text collision), the cake stand sits dead center where
the 2×2 card grid lives (a prop trapped behind cards), and the sign is
cropped by the Cafe card. It also embeds a `<text>` element with a
system font — exactly what the art contract's export rules exclude.

### Correct Fix Must Touch

- `design-source/home/home-room-proof.svg` (new) + 
  `public/assets/images/home-room-proof.svg` (new, same geometry):
  a 1370×900 room scene with RESERVED CLEAR ZONES — center column
  (card grid), top-center strip (greeting), bottom-right corner
  (Parent button) — and every prop in the margins: window + cat +
  plant on the left edge, a lettering-free Bear Cafe sign (bear-face
  emblem, no fonts) top-right, lamp right edge, counter with jar and
  the relocated cake bottom-right. Palette matched to the Bear Cafe
  pilot; drawn as basic shapes/paths only.
- `src/modules/home/cafe-scene.ts` — `createCafeBackdrop()` renders
  the local export via `<img>` (decoration-only: aria-hidden,
  draggable=false); the inline `CAFE_SCENE_SVG` string and its font
  text go away.
- `src/styles/child-ui.css` — img sizing inside the existing
  `.cafe-backdrop` layer (cover, bottom-anchored; layer opacity
  mechanism unchanged).
- `docs/art/asset-provenance.md` — Category A entry (original, with
  project-owned motif lineage from the previous home scene), look
  approval pending.
- Captures: home desktop + mobile + before/after contact sheet
  (before = today's audit capture of main).
- This contract.

### Must Not Change

- The home GRID, cards, greeting, routes, speech, and Parent button:
  zero behavioral or layout change — backdrop only.
- No rollout to other surfaces; no home-entry change (the Story Stage
  child-entry proposal remains a separate pending decision).
- `.cafe-backdrop` class name and layer mechanics stay (no test
  churn).

### Verification Plan

- `npm run typecheck` / `npm test` / `npm run test:viewport` /
  `npm run build` / `git diff --check`; headless Inkscape render of
  the export; live captures at 1366×900 + 390×844 with the grid
  visibly clear of all props.

## Contract Amendments

- **Component-library restructure (Juan's mid-slice clarification):** the
  goal is REUSABLE artwork across games, not one-off scenes. The scene
  is now composed from a new canonical shared library
  (`design-source/art-direction/cafe-component-library.svg`, 10
  components); the home source instances those components. New props go
  into the library first — this is the standing pattern for every
  later scene slice.

## Cold Diff Audit

Gaps first: **none found.** One amendment (the reuse restructure)
recorded above. Non-scope held: grid/cards/greeting/routes/speech/
Parent button untouched (only the backdrop builder changed); no other
surface touched; `.cafe-backdrop` class and opacity mechanism kept.

Change-by-change reconstruction (9 files):

1. `design-source/art-direction/cafe-component-library.svg` (new) —
   the canonical shared components, each an Inkscape layer-labeled
   group on a sheet: four-pane window, sill/floor plants, sitting cat,
   lettering-free Bear Cafe sign (bear emblem — kills the system-font
   `<text>`), hanging lamp, counter block, cookie jar, cake stand,
   cocoa cup.
2. `design-source/home/home-room-proof.svg` (new) — the home scene as
   room shell + positioned INSTANCES of library components, with
   reserved clear zones: card-grid center column, greeting strip,
   Parent-button corner.
3. `public/assets/images/home-room-proof.svg` (new) — self-contained
   production export of the same composition (no external refs, no
   fonts; `preserveAspectRatio=xMidYMax slice`).
4. `src/modules/home/cafe-scene.ts` — the 60-line inline
   `CAFE_SCENE_SVG` (480×340, font text, center-trapped cake) is
   removed; `createCafeBackdrop()` renders the local export via a
   decoration-only `<img>`.
5. `src/styles/child-ui.css` — `.cafe-backdrop__img` (cover,
   bottom-anchored, pointer-events none); the layer's 0.5-opacity
   softening mechanism unchanged.
6. `docs/art/asset-provenance.md` — two Category A families appended
   (shared library; home scene) with look approval pending.
7.–8. `docs/captures/cohesion/home-room-proof-{desktop,mobile}.webp` —
   live captures; desktop shows the greeting and grid clear of all
   props; mobile cover-crops to the reserved center (props-free wall
   by design — flagged as an owner look call).
9. `docs/captures/cohesion/home-room-proof-contact-sheet.webp` —
   before (today's main audit capture: sign-vs-greeting collision,
   cake trapped behind cards) beside the proof.

Verification actually run: `npm run typecheck` (clean); `npm test`
(57 files / 762 tests); `npm run build` (clean); headless Inkscape
renders of BOTH the library sheet and the scene export inspected;
live dev-server captures at 1366×900 + 390×844; `git diff --check`
pending in the commit gate below.

Gap audit: **DONE**.
