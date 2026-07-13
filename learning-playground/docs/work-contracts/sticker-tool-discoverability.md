# Change Contract: Sticker tool discoverability

## Root Cause

Owner-reported (2026-07-12, from real play): the sticker part of the Art
studio "is not super intuitive, took a while to figure out." Verified live
and in code:

1. `buildToolTray` activates the sticker tool without arming a sticker
   (`sticker` stays `null` in `art-canvas.ts`), so canvas taps silently
   no-op until a sticker chip is discovered and tapped. The brush tool has
   no such gap — free-decorate auto-arms the first color at init. The
   quantity mode pre-arms its sticker; the free modes never did.
2. The sticker chips render below the color swatches, smaller than the
   swatches, only after tapping an unlabeled star tool — and the swatches
   stay visible in sticker mode, so the dominant tappable row belongs to
   the wrong tool.
3. Entering sticker mode gives no hint (bucket mode says "Tap a color to
   fill."), and the armed sticker has only a thin ring for feedback.

## Correct Fix Must Touch

- `src/modules/bear-art-studio/BearArtStudioActivity.ts` (`buildToolTray`):
  auto-arm the first sticker on entering sticker mode; one visible
  choice-row at a time (sticker mode hides the swatches grid, brush/bucket
  restore it); hint parity ("Tap your picture to add stickers!").
- `src/styles/child-ui.css`: `.bear-art-studio__swatches[hidden]` display
  pin (grid display defeats [hidden] — known trap, 4th strike);
  sticker chips at swatch scale (96px/62 desktop, 76px/50 compact);
  selected chip scales up.
- `tests/modules/bear-art-studio.test.ts`: regression test — sticker tool
  tap then canvas tap places a sticker with no chip tap (the exact flow
  that used to no-op); row-swap both directions; re-picking still works.
- `tests/contract/mobile-child-ui.test.ts`: pin the swatches [hidden] rule.

## Must Not Change

- `art-canvas.ts` placement mechanics, brush/bucket behavior, event
  evidence shapes (sticker_ids/placed_sticker_count/canvas_action_count).
- Quantity/pattern/fix/story modes' pre-armed flows (already correct).
- Activity JSON, schemas, catalog.

## Verification

- `npx vitest run tests/modules/bear-art-studio.test.ts` + full `npm test`
- `npm run typecheck`
- Live play at 1280x800 + 390x844: sticker tool tap -> canvas tap places a
  sticker immediately; captures for the record.

## Contract Amendments

(none yet)
