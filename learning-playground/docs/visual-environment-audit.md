# Visual Environment Audit (v1)

Stage 1 of the visual enrichment arc (issue #55). Grounded in a live capture
pass of every child-facing screen (dev server, desktop viewport; mobile
constraints cited from the mobile child UI contract and `child-ui.css`
breakpoints) plus a cold read of every renderer. Companion law:
`docs/contracts/game-environment.contract.md`.

**The system-wide finding:** the app illustrates *objects* (Pip, word cards,
Bear Cafe bear/foods/decorations, the Number Train engine and passengers) but
composes no *environments*. Two background worlds exist — the warm cream cafe
backdrop (home only) and the dark navy app background (`--child-bg: #1a1a2e`,
every other screen) — and every activity floats its cards on one of them.
Bear Cafe additionally overrides to a pale gray gradient. Nothing except the
home screen has a background/middle-ground/foreground composition.

---

## Home

- **Primary visual:** four large choice cards (Words / Cafe / Math / Art).
- **Background:** the illustrated cafe backdrop (`cafe-scene.ts`, 50%
  opacity, pinned bottom) — window, plant, hanging sign, pendant light,
  counter with cups. The only real scene in the app.
- **Middle ground:** none — cards sit directly on the backdrop.
- **Foreground:** none.
- **Weak areas / clutter:** the four cards are **dark navy**
  (`--child-bg-card`) with **emoji icons** (📖 ☎️ 🔢 🎨) — they visually
  belong to the old dark system and clash with the warm backdrop behind
  them. The "Let's play!" greeting (warm gradient text) nearly vanishes over
  the cream wall.
- **Missing context:** none structurally; the mismatch is card treatment.
- **Mobile:** the compact home grid contract already governs card sizing.
- **Reusable assets:** the entire cafe backdrop; Pip; the train engine.
- **Proposed concept:** *harmonize, don't rebuild* — warm card treatment
  (cream/ink like the illustrated system) and replace the four emoji icons
  with small local illustrated equivalents (book, cafe phone, train engine,
  paint palette — engine art already exists). Owned by the cohesion pass
  (arc step 7), not a separate home pass.
- **Protected behavior:** four-item structure, routes, speech-on-tap, tap
  target sizes.

---

## Words (one environment system across all three modes)

Shared today: dark navy void, `activity-*` card grid, Pip in a plain gray
circle, feedback line, chained Next buttons. The warm characters read well on
dark, but there is zero place. Proposed shared concept: **Pip's Word
Workshop** — one game-owned scene system (`phonics-match/` module) used by
all three modes so the room is recognizably the same.

Scene map (all modes):

- Background: soft workshop wall (warm, low-saturation), a window with plain
  soft scenery, a low bookshelf silhouette; wall pin-board area.
- Middle ground: a picture-card display rail/board where the choice cards
  visually "hang"; Pip beside it as the workshop guide (existing art
  unchanged).
- Foreground: a shallow desk/rug edge at the bottom; a letter-block or two
  as inert props, placed away from choices.
- Contrast: wall/props duller than the cards; the card grid and Pip remain
  the brightest elements.

### Words — initial-sound matcher

- **Primary visual:** three picture cards; Pip above with mouth shape.
- **Current background/middle/foreground:** navy void / none / none.
- **Weak areas:** large empty flanks beside Pip; title+prompt text field
  dominates the top third.
- **Missing context:** the cards float — no display board.
- **Reusable:** Pip (mouth states), 10 illustrated word cards.
- **Concept:** cards presented on the display board; Pip presents from the
  side; no size change to cards.
- **Protected:** choice grid semantics, hint highlight, chain Next button,
  events, `activity-choice` tap sizes.

### Words — blending (sound-out strip)

- **Primary visual:** sound chips (`.phonics-soundout`) + rhyming picture
  cards.
- **Weak areas:** the chips float between Pip and cards with no rail.
- **Concept:** the chips sit on a small word-building rail/sound path that
  visually leads toward the cards; Pip positioned at the rail's start.
- **Protected:** chip contents, choice behavior, walk-through hint speech.

### Words — word builder (letter tiles)

- **Primary visual:** picture, letter slots, letter tiles, tray.
- **Weak areas:** slots/tiles float; the picture hangs alone.
- **Concept:** slots on a workshop table board; tiles styled as physical
  letter blocks in a shallow tray; the completed picture reacts in place
  (existing `is-alive` pop kept).
- **Protected:** tile/slot tap behavior, per-slot hints, event semantics.
- **Guardrails:** no decorative letters anywhere in the scene (could be
  mistaken for choices); no readable background words.

---

## Bear Cafe (six stages, one continuous cafe)

Today the game with the richest object art has the emptiest stages: a pale
gray gradient (`.bear-cafe` override), isolated white/pink cards, and the
**only remaining emoji in a polished flow** (☎ ringing icon, 🔔 bell, 🧺
basket — the Deliver button's *label* is the 🧺 emoji via
`BEAR_CAFE_CHILD_CONTROL_LABELS.deliver`). The home screen got the cafe; the
cafe didn't.

Proposed: one reusable game-owned **cafe environment layer**
(`kennedis-orders/cafe-environment.ts`): wall + window + shelf with cups/jars
+ pendant light + menu shapes (no readable text) + plant + counter surface +
floor/counter foreground edge. Stages reframe the same scene (which props are
emphasized), never switch worlds. Parts may echo the home backdrop's shapes
for continuity but are a separate, game-owned composition — no giant shared
component.

### Phone stage

- **Current:** pink-bordered card, blue phone-circle button (☎ glyph),
  caller portrait. No cafe.
- **Concept:** the call happens inside the cafe — wall phone station on the
  cafe wall, order pad shape nearby, shelves behind, counter foreground. The
  phone button remains the dominant, unmistakable interaction.
- **Protected:** answer-tap behavior, ringing cue, aria-label.

### Make / fix stage

- **Current:** order ticket rail (pink), check button, dashed tray, kitchen
  panel with illustrated food/color/decoration choices — all floating; large
  dead space on wide screens.
- **Concept:** an illustrated preparation counter: counter surface under the
  tray, backsplash + ingredient cubbies/shelf behind the kitchen panel, the
  ticket clipped to a ticket rail, inert utensils/containers spaced away
  from controls. A visible split between incoming-order side and prep side.
- **Protected:** every control's meaning, order/count semantics, tray
  integrity, check evaluation, per-skill events; decorative kitchenware must
  not look like buttons.

### Plating stage

- **Current:** brief plate beat on the void.
- **Concept:** the plate plates up on the same prep counter (kitchen
  softened behind), service bell nearby, one-time steam/sparkle. Continuous
  with the make stage.
- **Protected:** cosmetic-only beat; `tray_checked` emission point.

### Delivery stage (highest need)

- **Current:** 🔔 bell chip, 🧺-labeled Deliver button, tiny 🧺 chip, and
  the waiting customer **floating in a blue-bordered square** on the
  gradient. No place, no order visible in context.
- **Concept — Bear Cafe pickup window:** cafe wall fills the background; a
  large service window/open counter on one side with the waiting bear
  across it; the finished order sits clearly on a serving tray/basket
  (illustrated, replacing 🧺); the illustrated pickup bell (replacing 🔔)
  near the handoff point; signage/shelf/plant trim; counter edge foreground.
  The Deliver control stays large and obvious (illustrated tray/basket art
  + existing accessible label); tapping it opens the window / moves the
  tray toward the customer. The child should read: *I made this inside the
  cafe. It's ready. The customer is waiting. I'm giving it to them.*
- **Protected:** deliver-tap behavior and its commit point, completion
  evidence timing, customer identity/expression states.

### Handoff stage

- **Current:** tray travels a bare track to the bear, then a text line.
- **Concept:** the same pickup-window scene stays visible; the tray moves
  across the counter/through the window; the customer reaches/receives; one
  bounded environmental response (window opening or bell settling).
- **Protected:** travel/receive timing, event emission independent of
  animation completion, reduced-motion path.

### Completion stage

- **Current:** happy bear in the same floating blue square + "Order
  delivered." + arrow button.
- **Concept:** the customer happy at the window holding/near the delivered
  order; a small closed-ticket marker; the existing deterministic
  celebration integrated into the scene, not enlarged.
- **Protected:** celebration determinism, next/restart controls, completion
  event single-emission.

---

## Art

- **Current:** dark navy void; four color-swatch cards; big white circle
  button; optional request card. A lab, not a studio.
- **Weak areas:** no sense of making; the white shape reads clinical.
- **Missing context:** easel/canvas framing, supplies, studio wall.
- **Reusable:** the color system; the request-card variant (scene-prompt CSS
  from #50 exists for tap-choice, not needed here).
- **Concept — small creative studio:** the active shape lives on an easel or
  paper/canvas sheet (middle ground); swatches arranged as paint cups/supply
  tray (visually distinct, no decorative colored objects near the palette);
  soft studio wall with pinned child-artwork *shapes* (abstract, no readable
  content) behind; floor mat foreground. State-responsive richness: empty
  canvas start → subtle paint shine after fill → one-time finishing flourish
  → completed work displayed briefly in the studio.
- **Protected:** coloring interaction and completion logic, swatch
  selection semantics and contrast, request-mode behavior.

---

## Legacy Math (`math-count-*`, tap-choice)

- **Current:** generic tap-choice template on navy: prompt images (stars),
  numeral cards.
- **Decision per arc spec:** *no art system* — Number Train replaced it on
  the home tile; these remain reachable for parent transfer evidence only.
  Apply nothing beyond what the cohesion pass gives all tap-choice screens
  for free. Explicitly out of scope for a dedicated pass.
- **Protected:** everything (transfer evidence producers).

## Number Train

- **Current:** illustrated engine + cars with passenger seats (good bones)
  floating on navy; journey = six plain gray dots; numeral choices as dark
  cards; the number path (missing-station) is signs on a thin line.
- **Missing context:** station, platform, track, sky — the *world* the arc
  spec reserved.
- **Concept — friendly train station:** sky band with clouds/hills/town
  silhouettes (background); platform + station canopy with icon-only sign
  (middle ground); a track across the lower scene that the train sits on;
  the journey dots become small station markers along a route line;
  completion shows arrival at the destination platform. Round types stay in
  one world: counting at the platform, loading beside the station, missing
  numbers along the track.
- **Guardrails:** the environment must not obscure seat counting — cars and
  occupied seats keep stronger contrast than all scenery; **no loose
  countable objects** (birds, apples, windows in groups) anywhere in the
  scenery that could contaminate counting tasks.
- **Protected:** plan generation, seat semantics, load controls, hint
  behavior, journey/arrival/replay events, entry-band difficulty.

## Direct-route Shapes (`shapes-find-*`, tap-choice)

- **Current:** generic tap-choice on navy; reachable only by direct route
  and as a transfer producer; not on the home grid.
- **Audit decision:** intentionally supported (transfer lane), so it earns
  only a **small** environment if cheap after the tap-choice-shared pieces
  exist — a light "shape garden" tint and framed prompt area at most, in the
  cohesion pass. No dedicated PR, no home-screen addition, no broadened
  role.

## Video Vault / Puzzle

- **Video Vault:** an intentionally empty local shell (no videos authored);
  skip until it has content.
- **Puzzle:** a type stub with no registered activity — nothing to audit.

---

## Delivery order (one PR per game)

1. This audit + `game-environment.contract.md` (docs only)
2. Bear Cafe environment + delivery-scene pass
3. Words workshop pass
4. Art studio pass
5. Number Train station pass
6. Cross-game cohesion audit (home card harmonization, shapes tint,
   emoji sweep verification, style consistency check)

Each game PR carries its own work contract, scene plan traceability, tests
(ownership / aria-hidden / pointer-events / unchanged behavior /
reduced-motion / no external URLs), and the capture set the environment
contract requires.
