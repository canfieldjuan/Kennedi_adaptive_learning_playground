# Change Contract — Kennedi's Dress-Up Studio (creative-play game)

## Before Code

### Root Cause
The playground has no open-ended dress-up / doll game. The child keeps voting
with her attention for choosing, arranging, decorating, and preserving a result
she made herself (the ownership principle). Nothing in the current catalog
serves pure fashion/expression play with a doll character and a saved keepsake.

This is an additive product gap, not a defect in existing behavior. A new
primary creative-play game is the correct fix; retro-fitting an existing game
(Bear Art Studio's single "dress the bear" surface) would overload that game and
still not deliver a doll character, wardrobe layers, scenes, or saved cards.

### Correct Fix Must Touch
A new creative-play game modeled on **Story Stage** (a route-level game outside
the activity/evidence system) plus a non-evaluative completion record modeled on
**Number Train's `TrainTripCompletion`** (ownership-completion preservation):

New game module (`src/modules/dress-up-studio/`):
- `dress-up-studio.types.ts` — parsed content / look / catalog types.
- `wardrobe-catalog.ts` — data: doll tones, hair, wardrobe items by category,
  scenes, frames, card stickers (ids + labels + palette). No behavior.
- `doll-art.ts` — original inline-SVG doll "Luna" (layered: body/tone, hair
  back/front, face, glasses). Category A original artwork.
- `wardrobe-art.ts` — original inline-SVG clothing layers, scenes, frames,
  stickers, keyed by id; fail-safe on unknown id (renders nothing for that
  layer).
- `fashion-cards.ts` — `FashionCardCompletion` (the completion object) plus a
  malformed-safe `toFashionCardCompletion` converter and a bounded cap.
- `DressUpStudioActivity.ts` — the runtime (`render`/`destroy`). Free dress-up,
  tap-to-apply/remove wardrobe layers, single scene pick, finish -> pose beat ->
  fashion card payoff -> child-controlled finish; a bounded revisit shelf of
  earlier saved cards. Emits **no** attempt events.

Persistence (mirrors the story/cafe/train history seams):
- `src/core/storage.ts` — `getFashionCardHistory` / `appendFashionCardHistory`
  (dedupe by `completion_id`, bounded, malformed-safe) / `clearFashionCardHistory`;
  include the section in `exportProgressData`.
- `src/types/runtime.ts` — add the three methods to `StorageServiceInterface`.
- `src/core/export-data.ts` — add the `fashion_card_history` export section.
- `tests/contract/export-data.test.ts` — add `fashion_card_history` to the
  asserted `data_sections_included` set (this is the intended new section).

Wiring:
- `src/app/router.ts` — add the `#dress-up` route (parallel to `#story-stage`).
- `src/app/main.ts` — destroy + render the game on the new route, wired to the
  fashion-card history sink (list + append via storage).
- `src/modules/parent-panel/ParentPanel.ts` — a "Dress-Up Studio" Parent-Started
  Games launch card and a `clearFashionCardHistory()` call in Clear Progress Data.

Presentation and tests:
- `src/styles/child-ui.css` — a scoped `.dress-up-studio` section (per-game
  convention; no global changes).
- `tests/modules/dress-up-studio.test.ts` — render/destroy, apply/remove layers,
  scene pick, finish builds the exact-choice completion object, the payoff and a
  revisit render from that same object, no attempt-event sink, malformed-safe.
- `tests/core/fashion-cards.test.ts` — `toFashionCardCompletion` roundtrip,
  malformed drop, cap.

Docs:
- `docs/art/asset-provenance.md` — a provenance entry for the Luna doll +
  wardrobe + scene art family (Category A, original inline SVG, look-approval
  pending).
- `CURRENT_STATUS_AND_ROADMAP.md` / `MVP_BASELINE.md` — one line each recording
  the new game.

### Must Not Change
- The child home screen and its four-choice structure/tests (child-ui contract).
  The game is parent-launched; a child-home entry is a separate follow-up slice.
- The evidence system: no `ActivityAttemptEvent` is emitted for dress-up, so
  mastery, transfer, difficulty, recommendations, and progress are untouched.
  Fashion cards are a separate non-evaluative record, never scored.
- Every other game runtime, the curriculum graph, the activity schema, and the
  approved-activity catalog (dress-up is not a `LearningActivity`).
- Safety, reward, parent-approval, and export/clear guarantees (they are
  extended to cover the new record, never weakened).

## Contract Amendments
(none yet)

## Cold Diff Audit

### Gaps
- change without contract trace: none. Every touched file appears in "Correct
  Fix Must Touch". The diff is entirely additive (+2073, no deletions).
- contract requirement not delivered: none functional. Two items are bounded
  and intentional, not gaps:
  - Owner look-approval of the art is PENDING by design (ledger status
    `draft`); a representative desktop proof was rendered for review. The game
    is parent-launched only and off the child home grid until approved.
  - A child-home "Art picker" entry is explicitly Deferred (the child-ui
    four-choice cap is a protected surface; adding a fifth home icon is not
    allowed, and a picker is its own slice).
- protected surface touched: none. The child home screen, its four-choice
  tests, the activity schema, the curriculum graph, the approved-activity
  catalog, and the evidence/mastery/transfer system are all unchanged. The game
  emits no `ActivityAttemptEvent`.
- known cosmetic follow-up (non-blocking): the `frame-rainbow` card frame
  renders as a single-hue border with flower corners rather than a multi-color
  arc; a truer rainbow frame is a small art follow-up.

### Change By Change Reconstruction
- `src/modules/dress-up-studio/dress-up-studio.types.ts` (new): parsed look +
  catalog types. No behavior.
- `.../wardrobe-catalog.ts` (new): catalog DATA (doll, tones, hair, wardrobe by
  slot, scenes, frames, stickers) + id lookups + `defaultLook()`.
- `.../fashion-cards.ts` (new): `FashionCardCompletion` + malformed-safe
  `toFashionCardCompletion` + `FASHION_CARD_HISTORY_LIMIT` (12).
- `.../wardrobe-art.ts` (new): original inline-SVG clothing/scene/frame/sticker
  renderers + shared star/heart/flower motifs.
- `.../doll-art.ts` (new): the layered doll (body/hair/face/glasses), fail-safe
  composition, `renderStudioDoll` / `renderStudioStageSvg` /
  `renderFashionCardSvg` / `lookFromCard`.
- `.../DressUpStudioActivity.ts` (new): the render/destroy runtime — free
  dress-up, tap-to-apply/remove, dress<->top/bottom exclusivity, scene/frame/
  sticker, Finish -> completion object -> payoff reveal -> child-controlled
  finish, bounded revisit shelf. No event sink.
- `src/app/router.ts`: adds the `#dress-up` route.
- `src/app/main.ts`: destroys + renders the game on `dress-up`, wired to the
  fashion-card history sink (list/append via storage).
- `src/modules/parent-panel/ParentPanel.ts`: a "Dress-Up Studio" launch card +
  `clearFashionCardHistory()` in Clear Progress Data.
- `src/core/storage.ts`: `get/append/clearFashionCardHistory` (dedupe, cap,
  malformed-safe) + export inclusion.
- `src/types/runtime.ts`: the three methods added to
  `StorageServiceInterface`.
- `src/core/export-data.ts`: the `fashion_card_history` export section.
- `src/styles/child-ui.css`: a scoped `.dress-up-studio` section (no global
  changes), mobile + reduced-motion safe.
- `tests/core/fashion-cards.test.ts`, `tests/modules/dress-up-studio.test.ts`
  (new): validator + runtime behavior.
- `tests/contract/export-data.test.ts`, `tests/contract/parent-game-launch.test.ts`:
  the new export section + the storage-mock's three new methods.
- Docs: `asset-provenance.md` (Luna family entry, `draft`),
  `MVP_BASELINE.md` + `CURRENT_STATUS_AND_ROADMAP.md` (one entry each).

### Contract Traceability
- ownership-completion: completion object = `FashionCardCompletion`; one render
  function drives both payoff and revisit (exact-choice continuity); result
  stays until a child action; bounded, export/clear-covered revisit shelf;
  expressive choices never scored (no event sink). -> Correct Fix Must Touch.
- safety / reward: no external links, no scoring/streaks/currency; parent-
  launched. -> Must Not Change (extended, not weakened).
- game-environment / art-production-assets: original inline SVG, ink standard,
  `aria-hidden` decorative art, provenance ledger entry, look-approval gate
  recorded. -> Correct Fix Must Touch.
- change-workflow: this contract + cold audit. -> process.

### Verification
- `npm run typecheck` -> clean.
- `npx vitest run` -> 66 files, 914 tests pass (includes the new
  `fashion-cards` + `dress-up-studio` suites and the updated export /
  parent-game-launch contract tests).
- `npm run build` (tsc && vite build) -> success.
- `npm run check:work-contract` -> passed.
- Visual proof: rendered the real art (all tones, hairstyles, sample outfits,
  four scenes, finished fashion cards) headless via the pre-installed Chromium
  and reviewed it; shared with the owner for look approval.
- Not run: the Playwright mobile-viewport spec was not extended to the new
  `#dress-up` route (that spec targets existing routes). The CSS is responsive
  and reduced-motion-safe by construction, and payoff/revisit exact continuity
  is proven structurally because both render from the same completion object; a
  mobile browser pass on this route is a bounded follow-up.
