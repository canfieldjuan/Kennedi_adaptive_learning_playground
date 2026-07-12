# Words workshop production-art proof (art arc slice 4)

Per-game representative-scene proof under
`art-production-assets.contract.md`, composed from the shared component
library. Draft PR; merge blocked on owner look approval.

## Before Code

### Root Cause

The audit confirmed Words' collisions: the title and prompt render ON
the in-code pin-board poster, and Pip's chip overlaps its corner — the
800×500 in-code scene has no reserved zones for the fixed text/UI
columns.

### Correct Fix Must Touch

- Shared library (`design-source/art-direction/`): three new reusable
  components — `bookshelf-low` (plain spines), `pin-board` (abstract
  shapes), `pencil-pot`.
- `design-source/words/words-workshop-proof.svg` +
  `public/assets/images/words-workshop-proof.svg`: the workshop scene
  as shell + library instances (window/plants reused from the library)
  with reserved zones for title/prompt, Pip, and the card band.
- `src/modules/phonics-match/workshop-environment.ts`: builder renders
  the export via a decoration-only `<img class="workshop-env__svg">`
  (class kept — the module test pins it); the inline SVG string goes.
- `src/styles/child-ui.css`: img sizing + layer opacity 0.6 (the old
  scene baked 0.5-alpha ink; the new system softens full-ink art at
  the layer, consistent with the home proof).
- Provenance + captures + this contract.

### Must Not Change

- Gameplay/letters/evidence in all three Words modes; Pip; the card
  runtimes. The `.workshop-environment` class and the mobile
  `--minor{display:none}` CSS rule stay (defensive for any in-DOM
  props; the img scene handles mobile reduction via crop).
- HARD GUARDRAIL: no letters/words/tiles readable in the backdrop.

### Verification Plan

Full gate + headless render + live captures both viewports.

## Contract Amendments

- **Two composition corrections from the live capture pass** (the
  reason the pass exists): the window sill kissed the card band's
  corner → window shifted 38px left; the pin-board cropped mid-board
  at the portrait edge → relocated above the bookshelf so both
  portrait crops exit cleanly.

## Cold Diff Audit

Gaps first: **none found.** Amendments above. Non-scope held: zero
gameplay code, class names preserved, guardrail preserved (no text
anywhere in the scene).

1. `design-source/art-direction/cafe-component-library.svg` — +3
   components (bookshelf-low, pin-board, pencil-pot); sheet grew to
   1240×840.
2. `design-source/words/words-workshop-proof.svg` (new) — shell +
   instances: window (28,120), sill plant, pin-board (1096,42),
   bookshelf (1030,180), floor plant, pencil pot; title/Pip/card zones
   empty.
3. `public/assets/images/words-workshop-proof.svg` (new) — the
   self-contained export.
4. `src/modules/phonics-match/workshop-environment.ts` — inline scene
   removed; img swap keeping `workshop-env__svg`.
5. `src/styles/child-ui.css` — `img.workshop-env__svg` rule.
6. `docs/art/asset-provenance.md` — Words family appended; library
   entry covers the new components.
7.–9. captures: desktop, mobile, contact sheet
   (before = today's audit capture).
10. this contract.

Verification actually run: typecheck clean; full vitest 57 files /
762 tests; build clean; `git diff --check` clean (commit gate);
headless Inkscape render inspected; live captures at 1366×900 +
390×844 with all zones verified clear after the two corrections.

Gap audit: **DONE**.
