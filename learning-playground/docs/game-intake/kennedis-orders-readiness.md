# Kennedi's Orders Intake Readiness

Status: `implemented_in_current_main`

Date: 2026-07-07

Current app baseline: v0.3.0 on `main`

Source branch: `game-designer/kennedis-orders`

Source worktree: `/home/juan-canfield/Desktop/Kennedi_adaptive_learning_playground_game_designer`

Source commit: `fde2d6f` (`Complete reduced-motion guard for Bear Cafe selected controls (PR #1 review)`)

Source merge base: `7fa5e6e` (`v0.2.2`)

## Contract

Root cause: `Kennedi's Orders` exists on a separate old-base branch. Current main has newer v0.2.10 contracts for transfer truth, rich activity brief implementation, parent-approved launch, persisted mastery snapshots, and review schedules. A direct merge would bring old app wiring plus out-of-scope `Nature Camera Safari` work into the current lane.

Correct fix for this slice: record exactly what the branch-built game does, identify what is compatible, identify what blocks direct wiring, and define the later adapter work needed to bring only `Kennedi's Orders` into current main.

Explicit non-scope for this slice: no runtime wiring, no home-screen exposure, no activity registration, no activity schema changes, no transfer/mastery changes, no parent panel changes, no storage changes, no backend, no auth, no cloud sync, no AI tutor chat, no new reward system, no open web content, and no `Nature Camera Safari` import.

## What The Source Game Actually Does

`src/modules/kennedis-orders/kennedis-orders.types.ts` defines module-local Bear Cafe content for six modes:

- `free_make`
- `single_attribute`
- `quantity`
- `two_part`
- `first_sound_sort`
- `fix_order`

`src/modules/kennedis-orders/KennedisOrdersActivity.ts` renders a pretend Bear Cafe loop:

- phone/caller intro
- order ticket
- tray building
- food, color, and decoration choices
- check/fix feedback
- delivery stage
- completion stage
- next-order chaining
- shift restart at the finale

The runtime emits existing-shape `ActivityAttemptEvent` objects with:

- `prompt_text`
- `selected_choice_id`
- `correct_choice_id`
- `selected_answer`
- `correct_answer`
- `attempt_number`
- `response_time_ms`
- `difficulty_level`
- `choice_count`
- `distractor_strength`
- `input_type`
- `hint_shown`
- transfer metadata in `metadata`
- Bear Cafe evidence metadata in `metadata`

The branch registers six Kennedi's Orders activities:

- `kennedis-orders-banana-001`
- `kennedis-orders-two-cookies-001`
- `kennedis-orders-pink-berries-001`
- `kennedis-orders-b-foods-001`
- `kennedis-orders-fix-berries-001`
- `kennedis-orders-free-make-001`

The five-round shift is:

1. Baby Polar Bear: banana order
2. Daddy Bear: two cookies order
3. Mama Bear: three pink berries order
4. Baby Polar Bear: B-food order
5. Daddy Bear: fix the berry order

The finale is `Bake Time`, which can restart a new shift instead of chaining forever.

## Compatibility Findings

Compatible:

- Activities use the existing `LearningActivity` shape.
- Activities declare transfer metadata.
- Activities set `safety.requires_parent_approval` to `true`.
- Activities set `safety.external_links_allowed` to `false`.
- Runtime uses the existing event logger shape rather than adding a new event type.
- Runtime includes parent-readable evidence summaries in activity content and event metadata.
- Runtime includes safe incorrect handling and does not treat incorrect checks as completion.
- Runtime includes reduced-motion CSS guards.
- The relevant skills exist in current main: `vocabulary`, `counting`, `color_fill`, and `initial_sound`.

Current-main blockers:

- The source branch is based at `v0.2.2`, not current main.
- The branch payload includes `Nature Camera Safari`, which is out of scope for this intake.
- Branch `src/app/main.ts` wires both Kennedi's Orders and Nature Camera Safari.
- Branch `src/modules/home/HomeScreen.ts` replaces the Videos tile with Cafe, which is a product decision outside intake.
- Current main's `rich transfer metadata matches detectable activity content` test only recognizes existing phonics reverse-mapping and math dot-card prompt-mode shapes. `kennedis-orders-b-foods-001` uses `category_sort`, and `kennedis-orders-fix-berries-001` uses `different_prompt_mode`; both need game-specific truth guards before approval.
- Current roadmap still says no new game types in the active v0.2.10 lane. Wiring Kennedi's Orders should be an explicit v0.3 adapter slice, not a hidden continuation of the transfer-variant lane.

## Required Adapter Work

The later implementation slice should extract only:

- `src/modules/kennedis-orders/kennedis-orders.types.ts`
- `src/modules/kennedis-orders/KennedisOrdersActivity.ts`
- the six `kennedis-orders-*.json` activities
- scoped Bear Cafe CSS
- Kennedi's Orders focused tests
- one app-route dispatch for `content.game === "kennedis-orders"`

The later implementation slice must not extract:

- `src/modules/nature-camera-safari/`
- `nature-camera-*.json`
- Nature Camera tests
- Nature Camera app routing
- branch-wide home-screen decisions unless explicitly included in the new contract

The later implementation slice must add current-main tests proving:

- the six activities validate against the current schema
- every Kennedi's Orders activity keeps parent approval and no external links
- Kennedi's Orders events pass the current event logger
- the five-round chain has no loops or missing activities
- `category_sort` content is truth-checked for `kennedis-orders-b-foods-001`
- `different_prompt_mode` content is truth-checked for `kennedis-orders-fix-berries-001`
- rich Kennedi's Orders activities reference originating briefs or have a documented waiver
- no child-facing content contains external links
- parent approval remains required before any transfer launch or brief application

## Recommended Next Slice

Implement `v0.3.0: Kennedi's Orders Adapter`.

Strategy:

1. Finish and commit the current v0.2.10 transfer-truth work first.
2. Extract Kennedi's Orders into current main manually, not by merging the old-base branch.
3. Keep Cafe hidden from the home screen until the adapter tests pass.
4. Add game-specific rich-transfer truth guards.
5. Decide child entry in a separate, explicit contract: replace Videos, add a parent-approved launch path, or keep it parent-only during first integration.

## Decision

Kennedi's Orders was implemented through adapter work, not direct branch merging.

The adapter extracted only the Bear Cafe runtime, six activities, scoped CSS, current-main route dispatch, and current-main tests. `Nature Camera Safari` and branch home-screen changes remain out of scope.
