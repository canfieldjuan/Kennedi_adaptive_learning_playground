# Change Contract

Kennedi's Orders — Game Depth Pass (polish + progression + replayability).
Baseline: branch `game-designer/kennedis-orders`, commit `1a6b913`.

## Before Code

### Root Cause

What is actually wrong: Kennedi's Orders is a Level-1/2 maturity build — it
renders, emits events, completes, and passes contracts, but it is a one-shot
demo, not the game the design spec describes. Four specific gaps cause the
"not rich enough to keep her engaged or generate useful progression
evidence" symptom:

1. **The shift does not ramp.** The chain is free-make → pink-cupcake →
   three-berries → b-foods → fix-berries. There is no single-item warm-up,
   no two-item quantity step, and the design's Level 4 Two-Part Order
   (color + quantity) does not exist in the runtime at all —
   `KennedisOrdersMode` (kennedis-orders.types.ts:1-6) has no `two_part`
   member and `updateFoodSelection` (KennedisOrdersActivity.ts:578-594)
   has no branch that allows quantity taps combined with a color choice.
2. **The scene is text-and-buttons.** No phone ring animation, no caller
   portrait treatment, no kitchen counter or plate visual, no distinct
   "order ready" beat (a correct check jumps straight to the delivery
   stage), and the tray is a chip list, not a plate
   (KennedisOrdersActivity.ts:320-376).
3. **The child is framed as an answer-chooser.** The stages never name her
   role (order taker / chef / checker / delivery boss); the design doc §2
   core role-play framing exists only in prompt text.
4. **Evidence is flat across replays.** `createKennedisOrdersEvent`
   metadata (KennedisOrdersActivity.ts:853-863) carries mode/issue/tray
   fields but no round position (`round_index`/`round_total`), no caller,
   no replay count, and no corrected-after-miss signal, so the parent lane
   cannot see progression within a shift or improvement across shifts.
   Two hardcoded feedback bugs also degrade evidence-facing speech:
   `getFixFeedback` says "Daddy Bear" for every quantity miss regardless
   of caller (KennedisOrdersActivity.ts:668) and speaks the raw
   `color_id` instead of the color label (KennedisOrdersActivity.ts:670).

Where it originates: the first build stopped at design doc §15 "Minimal
First Build Scope" and was never taken through §5 (screen detail),
§6 Level 4 (two-part), or the §9 evidence depth.

### Correct Fix Must Touch

- `src/modules/kennedis-orders/kennedis-orders.types.ts`
  - add `'two_part'` to `KennedisOrdersMode`
  - add optional content fields: `next_label` (button text for chained
    round), `shift_restart_activity_id` (replay affordance on the finale)
- `src/modules/kennedis-orders/KennedisOrdersActivity.ts`
  - `updateFoodSelection`: `two_part` behaves like `quantity` (tap adds,
    up to 5); everything else unchanged
  - phone stage: ringing animation hooks (CSS classes), caller portrait
    element, speak the caller line once on first render of the phone stage
  - stage role badges: order taker (phone), chef (make/fix), delivery
    boss (delivery), rendered as icon + label
  - tray rendered as a plate: selected food icons on a plate, color tint
    ring when a color is chosen, tap an icon to remove one (same handler)
  - kitchen food grid framed as a counter (CSS class only)
  - "Order ready" bell banner at the top of the delivery stage
  - completion stage: `next_label` used for the next button when present;
    when `shift_restart_activity_id` is set (finale), show a
    "New shift" button next to Done
  - `getFixFeedback`: use `content.character.name` and the color *label*;
    add two_part-aware lines
  - evidence metadata enrichment on all emitted events: `caller_id`,
    `replay_count`, `corrected` (true when a correct check or delivery
    follows at least one incorrect attempt), plus `round_index` and
    `round_total` when the content declares them; required-order facts
    (`required_quantity`, `required_color_id`) when present
  - event names, `AttemptOutcome` usage, and event *shape* unchanged
- `src/styles/child-ui.css` — scoped `.bear-cafe-*` additions only:
  phone ring animation, portrait, counter, plate, ready banner, role
  badge, delivery slide-in, completion bounce; all animations calm and
  wrapped in `@media (prefers-reduced-motion: reduce)` guards
- `src/content/activities/` — restructure the shift to the requested
  five rounds plus a creative finale:
  - NEW `kennedis-orders-banana-001` — Round 1, Baby Polar Bear orders
    1 item (banana), mode `single_attribute` (food only, no colors),
    level 1
  - NEW `kennedis-orders-two-cookies-001` — Round 2, Daddy Bear wants
    2 cookies (design §6 Level 3 example), mode `quantity`, level 2
  - NEW `kennedis-orders-pink-berries-001` — Round 3, Mama Bear wants
    3 pink berries (design §6 Level 4 example), mode `two_part`, level 4
  - EDIT `kennedis-orders-b-foods-001` — Round 4 caller becomes Baby
    Polar Bear (per requested round list); content otherwise intact
  - EDIT `kennedis-orders-fix-berries-001` — Round 5; caller becomes
    Daddy Bear so all three bears call during the shift; next chains to
    bake time
  - EDIT `kennedis-orders-free-make-001` — becomes the post-shift
    "Bake time" finale: no round index/dots, chained from Round 5,
    `shift_restart_activity_id` points at Round 1, no `next_activity_id`
  - DELETE `kennedis-orders-pink-cupcake-001` and
    `kennedis-orders-three-berries-001` — superseded: color matching now
    lives in Round 3 (color + quantity) and quantity in Rounds 2/3.
    Recoverable from baseline commit `1a6b913`.
  - All transfer `context_type` values chosen from the skills'
    existing `planned_transfer_contexts` in the curriculum graph
    (vocabulary/counting/color_fill: `same_format_new_examples` or
    `different_prompt_mode`; no graph change).
- `src/content/activity-catalog.ts` — register new/remove superseded
  variants (title lookup derives automatically)
- `src/modules/home/HomeScreen.ts` — Cafe tile routes to Round 1
- Tests:
  - `tests/modules/kennedis-orders.test.ts` — update chain/id/mode
    expectations; add two_part evaluation cases (correct all parts,
    wrong color, under/over quantity, wrong food); add metadata
    enrichment assertions (round fields, caller_id, corrected)
  - `tests/contract/game-maturity.test.ts` — update the kennedis-orders
    chain expectation only; safari expectations untouched
- Verification: `npm run typecheck`, `npm test`, `npm run build`,
  browser smoke of one full-shift success path and one incorrect→fix
  retry path.

### Must Not Change

- `nature-camera-safari` module, its activity JSONs, and its chain
- `src/contracts/activity.schema.json` and `src/contracts/content-pack.schema.json`
- `src/content/curriculum/curriculum.v1.json` (skill graph, planned
  transfer contexts)
- `src/types/events.ts` (`AttemptOutcome` union, event fields),
  `src/core/event-log.ts`, `src/core/progress.ts`, `src/core/storage.ts`,
  mastery/transfer/recommendation engines, parent panel code
- `src/app/main.ts` (existing `content.game` dispatch already routes
  correctly), router, session, parent gate
- tap-choice / coloring-book / video-vault / puzzle modules;
  parent difficulty application semantics
- package.json dependencies, build config, tsconfig, vitest config
- No new event outcome values; no new top-level event fields — evidence
  depth ships via `metadata` only
- No rewards, streaks, timers, scores, or automatic round advance; every
  transition stays behind a child tap
- Memory Order mode: intentionally deferred ("eventually support" scope);
  Two-Part is implemented now because Round 3 requires it
- The main checkout at `Kennedi_adaptive_learning_playground` (branch
  `main`, v0.2.8): untouched; rebasing this branch onto main is out of
  scope for this pass

### Assumptions

- "Round 2: Daddy Bear orders 2 items" = quantity two of one food
  ("Daddy Bear wants 2 cookies", the design doc's own Level 3 example).
- Work lands on `game-designer/kennedis-orders` in the game-designer
  worktree, where the game exists; no push, no merge to main.
- The replay-prompt event keeps its existing `hint_used` outcome
  encoding (changing outcome semantics would touch protected progress
  derivation); `order_prompt_replayed` metadata already distinguishes it.

## Contract Amendments

### Amendment 1: evaluateTray extra-food hole

New evidence found during implementation: `evaluateTray` treats a tray as
correct when the required food and quantity match even if *other* foods
are also on the tray (`required.food_id` path never checks for extra
selections). The baseline rounds masked this because quantity rounds
offered exactly one food. Rounds 2 and 3 offer distractor foods, so a
tray of "2 cookies + 1 banana" would wrongly pass Round 2.

Why the new touch is required: the check is the evidence commit point;
a guard that passes wrong-but-superset trays produces false `correct`
evidence for counting skills.

Additional allowed surface: `evaluateTray` in
`KennedisOrdersActivity.ts` — when `required.food_id` is set, any other
selected food fails the check with issue `food`. A regression test
covers the superset tray. Everything else in the protected surface is
unchanged.

### Amendment 2: dead tray-chip CSS

The plate rendering replaces the tray chip list, orphaning
`.bear-cafe-tray__items` / `.bear-cafe-tray__chip` rules. Removing those
two dead rules is part of the tray→plate change, not unrelated cleanup.

### Amendment 3: reduced-motion guard completeness (PR #1 review)

Review of PR #1 found the `prefers-reduced-motion` block guarded seven
bear-cafe elements but omitted the selected food/swatch/decoration
controls, which run `cafePop` (child-ui.css). That animation predates
the depth pass (baseline `1a6b913`), but this pass added the guard and
the "all cafe animations" claim, so completing the guard is in scope.
Added the three `[data-selected="true"]` selectors to the existing
reduced-motion block. No other bear-cafe animation is unguarded
(audited: cafeRing, cafePop x4, cafeBellSwing x2, cafeSlideIn, popIn).

### Out of scope (deferred): Nature Camera Safari P2

Codex flagged `NatureCameraSafariActivity.ts` completing a round when a
distractor is deselected (emitting a `correct` event for the
distractor) — the same defect class as the Kennedi extra-food fix
(Amendment 1). Safari is named in Must Not Change and is not on the
child home grid; the finding is deferred to the Safari depth pass and
tracked as a GitHub issue, not fixed in this Kennedi PR.

## Cold Diff Audit

Diff audited cold against baseline commit `1a6b913`.

### Gaps

- Change without contract trace: none found. Three implementation
  variations worth naming rather than hiding:
  - `bear-cafe-delivery__basket` label changed "Order ready" → "To the
    window" — required so the new "Order ready!" banner isn't duplicated;
    traces to the order-ready-moment item.
  - `kennedis-orders-free-make-001.json` `version` 1→2 and `title`
    "Bear Cafe" → "Bake Time" — part of converting the variant into the
    finale; the contract named the conversion, not the version bump.
  - The phone stage speaks "`{name} is calling. You're the order taker.`"
    rather than the callLine verbatim; the callLine remains on screen.
    Traces to the role-play item.
- Contract requirement not delivered: none. Memory Order stays deferred
  by contract.
- Protected surface touched: none — `git diff 1a6b913 --stat` over
  `src/modules/nature-camera-safari`, `src/content/activities/nature-camera-*`,
  `src/contracts`, `src/types`, `src/core`, `src/app`, `docs/contracts`,
  `docs/game-design` is empty.
- One mid-build correction: the first version of
  `kennedis-orders-two-cookies-001.json` used `different_prompt_mode`,
  which silently widened counting's transfer coverage and broke
  `tests/contract/parent-interpretation.test.ts` (missing contexts became
  `['delayed_review']`). Fixed to `same_format_new_examples`, restoring
  counting coverage to exactly the baseline set — a spoken cafe order is
  not a different prompt mode.

### Change By Change Reconstruction

- `src/modules/kennedis-orders/kennedis-orders.types.ts:5` adds
  `'two_part'` to the mode union; `:67-68` adds `next_label` and
  `shift_restart_activity_id` content fields.
- `src/modules/kennedis-orders/KennedisOrdersActivity.ts`
  - `:56-57` replay/phone-intro state; `:71-75` repeat button now counts
    replays and emits with the count; `:84` role badge on every stage
    (null on complete, `:274-300`); `:87-92` speaks the caller/role
    intro once; `:298-303` phone card gains ringing icon class, caller
    portrait, "Tap to answer"; `:372-410` tray renders as a plate — food
    icons (one button per item, tap removes one), color ring via
    `--bear-cafe-plate-ring`, decoration badge; `:536-543` delivery
    stage opens with the "Order ready!" bell banner; `:579,586-595`
    complete stage uses `next_label` and offers "New shift" when
    `shift_restart_activity_id` is set; `:657` two_part taps add like
    quantity; `:701-710` evaluateTray fails specific orders that carry
    extra foods (Amendment 1); `:745-751` fix feedback names the actual
    caller and speaks the color label, not the id; `:828-846` replay
    event carries evidence metadata + replay_count; `:914,943-952`
    events gain `corrected` and `replay_count`; `:960-980`
    `createEvidenceMetadata` adds `game_mode`, `caller_id`, and
    conditional `round_index`/`round_total`/`required_quantity`/
    `required_color_id`.
- `src/styles/child-ui.css` — `.bear-cafe-plate`/`__food`/`__decoration`
  replace the dead `__items`/`__chip` rules (Amendment 2); kitchen gets
  counter framing; role badge, portrait, answer hint, ready banner,
  bell-swing and slide-in keyframes; `prefers-reduced-motion` guard for
  all bear-cafe animations.
- Content: NEW `kennedis-orders-banana-001.json` (R1, Baby Polar Bear,
  single item, level 1), NEW `kennedis-orders-two-cookies-001.json`
  (R2, Daddy Bear, quantity 2, level 2), NEW
  `kennedis-orders-pink-berries-001.json` (R3, Mama Bear, two_part
  3 pink berries, level 4); `kennedis-orders-b-foods-001.json` caller →
  Baby Polar Bear (R4); `kennedis-orders-fix-berries-001.json` caller →
  Daddy Bear, chains to bake time with `next_label` (R5);
  `kennedis-orders-free-make-001.json` becomes the un-numbered Bake Time
  finale with `shift_restart_activity_id`; DELETED
  `kennedis-orders-pink-cupcake-001.json` and
  `kennedis-orders-three-berries-001.json` (superseded; recoverable from
  `1a6b913`).
- `src/content/activity-catalog.ts:4-9,25-30` — imports/registration in
  shift order. `src/modules/home/HomeScreen.ts:35` — Cafe tile routes to
  Round 1.
- Tests: `tests/modules/kennedis-orders.test.ts` — updated ids/modes/
  chain; new caller-order test; two_part evaluation matrix (correct,
  under, over, wrong color, wrong food); extra-food regression;
  metadata-enrichment assertions (round, caller, corrected, replay);
  first-attempt-not-corrected; bake-time finale shape.
  `tests/contract/game-maturity.test.ts:33-40` — kennedis-orders chain
  expectation only; safari expectations untouched.

### Contract Traceability

- Runtime/types/CSS changes → "Correct Fix Must Touch" module items and
  Amendments 1–2.
- Content adds/edits/deletes, catalog, HomeScreen → content
  restructuring items.
- Test changes → test items.
- No file outside the declared surface changed.

### Verification

- `npm run typecheck` — passed.
- `npm test` — 27 files, 122 tests passed (baseline: 116; net +6 with
  superseded expectations rewritten).
- `npm run build` — passed.
- Vite dev server served `/`, the changed modules, and the stylesheet
  with HTTP 200 and no transform errors.
- Interactive browser smoke (full-shift success path + safe-retry path):
  NOT RUN — the Chrome extension was not connected in this session.
  Remaining risk: visual regressions (layout, animation feel) and the
  speech sequencing on stage transitions are unverified in a real
  browser. Substitute: the evaluateTray/eventing behavior is covered by
  unit tests; module transforms verified via dev server. Run the browser
  pass before merging this branch.
