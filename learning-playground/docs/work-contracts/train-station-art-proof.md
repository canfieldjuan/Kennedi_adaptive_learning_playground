# Number Train station production-art proof (art arc slice 5)

Per-game representative-scene proof composed from the shared component
library. Draft PR; merge blocked on owner look approval.

## Before Code

### Root Cause

Audit finding: the three answer cards render ON the in-code station
house and skyline — the 800×500 scene never reserved the card band or
the train band.

### Correct Fix Must Touch

- Shared library: five new components (station-house, signal-post,
  skyline-blocks, sun-simple, cloud-puff).
- `design-source/number-train/train-station-proof.svg` +
  `public/assets/images/train-station-proof.svg`: landscape shell
  (sky/hill/platform/track) + edge-placed instances; the title,
  question, train, and card zones stay empty.
- `src/modules/number-train/station-environment.ts`: img swap keeping
  the `station-env__svg` class (module test pin).
- `src/styles/child-ui.css`: img rule, layer opacity 0.65.
- Provenance, captures, this contract.

### Must Not Change

- Gameplay/counting/evidence; the backdrop must contain NO digits and
  no countable object clusters (skyline is abstract); the
  `.station-environment` class + mobile `--minor` CSS rule stay.

### Verification Plan

Full gate + headless render + live captures both viewports.

## Contract Amendments

(none)

## Cold Diff Audit

Gaps first: **none found.** Non-scope held: zero gameplay code; no
digits/countables in the backdrop; class names preserved.

1. library — +5 components (sheet 1240×980, 18 component layers).
2.–3. scene source + export: station-house (8,260) exits the portrait
   crop left; skyline (1092,300) low-contrast right, clear of the card
   band; signal (1290,430); sun/cloud in top corners clear of the
   topbar pills.
4. `station-environment.ts` — inline scene removed, img swap.
5. `child-ui.css` — `img.station-env__svg` rule.
6. provenance entry; 7.–9. captures (desktop/mobile/contact sheet,
   before = audit capture); 10. this contract.

Verification actually run: typecheck clean; 57 files / 762 tests;
build clean; git diff --check clean (commit gate); headless render
inspected; live captures both viewports — answer cards fully clear of
every prop.

Gap audit: **DONE**.
