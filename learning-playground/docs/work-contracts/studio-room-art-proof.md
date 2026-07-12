# Art studio room production-art proof (art arc slice 6)

Per-game representative-scene proof composed from the shared component
library, in the studio's ALL-NEUTRAL palette. Draft PR; merge blocked
on owner look approval.

## Before Code

### Root Cause

Audit findings: the easel canvas covers the left wall frame and the
supply shelf collides with the window in the in-code 800×500 studio
scene — no reserved zones for the canvas/tools/palette column.
(The audit also logged "horizontal overflow"; measured live it is a
70px VERTICAL overflow of the game layout itself — a pre-existing
defect outside this art slice, recorded for a separate fix.)

### Correct Fix Must Touch

- Shared library: `wall-frame-dot`, `wall-frame-hill`, `art-shelf`.
- `design-source/art-studio/studio-room-proof.svg` +
  `public/assets/images/studio-room-proof.svg`: studio shell + edge
  instances (frames + shelf left, window right, floor props corners),
  center column reserved; the whole scene remapped to the coloring
  contract's NEUTRAL palette at authoring time (the library keeps
  canonical colors; the studio export must not compete with the color
  curriculum).
- `src/modules/coloring-book/studio-environment.ts`: img swap keeping
  `studio-env__svg` (pins in coloring + bear-art-studio tests).
- `src/styles/child-ui.css`: img rule, opacity 0.6.
- `tests/modules/coloring.test.ts`: the all-neutral guardrail sweep
  retargets from layer innerHTML to THE SHIPPED ASSET FILE (stronger:
  it now checks what actually ships), with `none` allowed (paints
  nothing); repo `node:fs` import convention used.
- Provenance, captures, this contract.

### Must Not Change

- Coloring/studio gameplay and evidence; the all-neutral rule itself
  (this slice conforms to it, never weakens it); class names.

### Verification Plan

Full gate + headless render + live captures both viewports.

## Contract Amendments

- **Neutral-palette remap added mid-slice**: the first composition
  used canonical library colors and correctly FAILED the coloring
  guardrail test — the studio surface requires all-neutral art. The
  scene generator now applies the documented neutral map; the test
  moved to the shipped file and caught a final stray (`#cfe3f4`).
- **Audit correction**: "horizontal overflow" was actually 70px
  vertical overflow (measured via scrollWidth/scrollHeight live);
  out of scope here, recorded as a separate small layout defect.

## Cold Diff Audit

Gaps first: **none found.** Two amendments above. Non-scope held: zero
gameplay code; the guardrail was strengthened, not weakened.

1. library — +3 components (21 component layers, sheet 1240×1120).
2.–3. scene source + export — all paints from the neutral set
   (verified programmatically: zero paints outside the allowed list);
   frames/shelf left, window right, floor props corners, center
   reserved.
4. `studio-environment.ts` — inline scene removed, img swap.
5. `child-ui.css` — `img.studio-env__svg` rule.
6. `tests/modules/coloring.test.ts` — file-based sweep + `none` +
   ts-expect-error node import per repo convention.
7. provenance entry; 8.–10. captures; 11. this contract.

Verification actually run: typecheck clean; 57 files / 762 tests
(including the strengthened sweep); build clean; git diff --check
clean (commit gate); headless render inspected; live captures both
viewports — canvas/tools/palette clear, palette colors are the only
saturated pigment on screen.

Gap audit: **DONE**.
