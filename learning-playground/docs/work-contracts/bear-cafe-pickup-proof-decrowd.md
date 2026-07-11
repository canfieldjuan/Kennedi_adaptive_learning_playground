# Bear Cafe pickup-window proof — decrowd revision (art arc slice 1)

Revision of the pickup-window production-art proof (draft PR #92 @
4eead82) addressing Juan's verdict: "looks okay, but crowded and
elements overlap." No version bump — the proof branch still does not
consume a release number pending look approval (per the pilot's own
contract).

## Before Code

### Root Cause

The proof composed a complete scene UNDERNEATH pre-existing dynamic and
environment layers instead of composing WITH them. Four concrete
overlap classes, confirmed against the capture pixels and the SVG
source:

1. **Awning self-overlap** — nine FULL circles (r=58, spacing 116 <
   diameter 123) centered ON the awning's bottom edge, with a border
   rect re-stroked over them: neighbors collide and the rail cuts
   through every ball.
2. **Backdrop vs dynamic layers** — the painted counter plate
   (ellipse at 430,500) sits exactly under the CSS-positioned live
   order (left 36% / bottom 12%) → double plate; the glass shine
   (944,254 r23) overlaps the live bear's ear.
3. **Backdrop internal crowding** — the wall shelf (teapot/jar/cup,
   y166–238) intrudes into the awning band (scallop bottom ≈ y210).
4. **Environment collisions + mobile dead band** — the base
   `bear-cafe-environment` wall props (window, menu board, lamp, wall
   shelf) stay at full strength behind the proof scene and the
   floating bell chip / topbar pills; on mobile the base counter band
   fills the bottom half of the viewport with dead space below the
   compact scene.

### Correct Fix Must Touch

- `public/assets/images/bear-cafe-pickup-window-proof.svg` AND
  `design-source/bear-cafe/bear-cafe-pickup-window-proof.svg` (kept in
  step): true half-disc scallops hanging below the valance edge
  (edge-to-edge, alternating colors, no overlay stroke through them);
  painted counter plate REMOVED (the live order owns that zone); glass
  shine shrunk + moved to the glass corner away from the bear; wall
  shelf lowered out of the awning band.
- `src/styles/child-ui.css` —
  - during the art-proof delivery stage
    (`.bear-cafe-environment[data-stage='delivery']`), quiet the minor
    wall props (`cafe-env__prop--minor`) so the proof scene owns the
    frame (fade, not remove: the environment remains one system);
  - mobile: let the delivery layout center and the scene breathe
    (reduce the dead counter band below the scene).
- Fresh captures (desktop / mobile / contact sheet) replacing the
  pilot's, same filenames.
- Provenance ledger entry: revision noted, look approval still
  pending.
- This contract.

### Must Not Change

- No gameplay, ordering, delivery, event, or speech change; the scene
  stays decoration-only (`aria-hidden`, `pointer-events: none`).
- The dynamic order/tray/bear elements and their tap behavior are
  untouched (their CSS positions may be tuned only if a reserved zone
  requires it — record if so).
- No rollout beyond the delivery stage; no other game touched; PR #92
  stays draft; merge stays blocked on Juan's look approval.
- Editable source and export must not diverge (same geometry edits in
  both).

### Verification Plan

- `npm run typecheck` / `npm test` / `npm run test:viewport` /
  `npm run build` / `git diff --check`.
- Inkscape (flatpak, 1.4.4) export verification: render the revised
  source headless and diff against the shipped export geometry.
- Live dev-server pass at 1366×900 + 390×844 through the real order →
  delivery flow; recapture all three evidence images; zero console
  errors.

## Contract Amendments

- **Stage centering scoped to the delivery section** — the first
  attempt (`justify-content: center` on the stage) pulled the topbar
  pills down with everything else at 390×844; replaced with
  `margin-block: auto` on `.bear-cafe-delivery` so the chrome stays
  top-anchored and only the delivery cluster centers. Caught in the
  live capture pass.

## Cold Diff Audit

Gaps first: **none found.** Every contract item is in the diff; one
amendment recorded above. Non-scope held: zero gameplay/event/speech
changes (no `.ts` file touched), the dynamic order/bear CSS positions
untouched, no rollout beyond the delivery stage, source and export
carry identical geometry.

Change-by-change reconstruction (7 files):

1. `public/assets/images/bear-cafe-pickup-window-proof.svg` — nine
   overlapping full circles (r=58 at cy=153) + the border rect
   re-stroked over them replaced by nine edge-to-edge half-disc
   scallops hanging from y=152 (`M x 152 a 58,58 0 0 0 116,0 z`,
   alternating fills); valance fill rect trimmed 112→100 tall so its
   edge meets the scallop tops; painted counter plate (two ellipses at
   430,500) removed — the live order owns that zone; glass shine
   944,254 r23 → 972,236 r14 (off the customer's ear); wall shelf
   rail + teapot/jar/cup lowered 44px out of the awning band.
2. `design-source/bear-cafe/bear-cafe-pickup-window-proof.svg` — the
   identical geometry edits in the Inkscape source (kept in step;
   verified by headless flatpak Inkscape render of the export).
3. `src/styles/child-ui.css` —
   `[data-stage='delivery'] .cafe-env__prop--minor { opacity: 0.28 }`
   (wall props step back while the proof scene is on stage) and
   `.bear-cafe:has(--art-proof scene) .bear-cafe-delivery
   { margin-block: auto }` (mobile dead band becomes ground under the
   centered scene; amendment 1).
4. `docs/art/asset-provenance.md` — revision note appended to the
   proof-family entry; status unchanged (`rights_verified`, look
   approval still pending).
5.–6. `docs/captures/bear-cafe/pickup-window-proof-desktop.webp` /
   `-mobile.webp` — recaptured through the REAL order flow (call →
   banana → check → delivery) at 1366×900 and 390×844.
7. `docs/captures/bear-cafe/pickup-window-proof-contact-sheet.webp` —
   now pilot-vs-revision (the crowded 4eead82 desktop capture beside
   the decrowded one) — the exact artifact for the look decision.
8. `docs/work-contracts/bear-cafe-pickup-proof-decrowd.md` — this
   file.

Verification actually run: `npm run typecheck` (clean); `npm test`
(57 files / 762 tests); `npm run test:viewport` (6/6); `npm run build`
(clean); `git diff --check` (clean); headless Inkscape 1.4.4 render of
the revised export inspected (scallops/plate/shine/shelf confirmed in
pixels); live dev-server play-through to delivery on both viewports
with all three evidence captures refreshed.

Gap audit: **DONE**.
