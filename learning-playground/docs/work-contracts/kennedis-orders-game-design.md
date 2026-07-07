# Change Contract

## Before Code

### Root Cause
Game 1 does not yet have a concrete design source of truth in the repo. The core app can provide learning contracts, event logging, approval boundaries, and adaptive infrastructure, but the first game still needs a scoped game-design handoff that defines the child fantasy, pretend-play loop, progression, evidence mapping, feedback rules, and minimal build scope for `Kennedi's Orders`.

The underlying issue is not missing code. It is missing product/game specification for the first activity format, which would force the implementation session to infer interaction states, content boundaries, and evidence semantics from scattered prompt notes.

### Correct Fix Must Touch
- Add a work-contract log for the Game Designer lane under `docs/work-contracts/`.
- Add one Game 1 design specification under `docs/game-design/`.
- The design spec must use the requested `Kennedi's Orders` outline and cover only Game 1.
- The design spec must define:
  - child fantasy and why it fits the child
  - core pretend-play order loop
  - screen-by-screen UX
  - levels 1 through 7
  - skill mapping
  - transfer metadata plan
  - evidence and event mapping using the existing event logger fields
  - feedback rules
  - parent dashboard evidence examples
  - content pack examples
  - accessibility and touch rules
  - safety audit
  - minimal first build scope
  - implementation handoff notes
  - future expansion ideas limited to this game

### Must Not Change
- Do not change Vite, TypeScript, package, or build configuration files.
- Do not change runtime app modules.
- Do not change schemas, event logger implementation, mastery engine, transfer coverage, recommendation engine, parent approval flow, storage, evidence review, safety rules, or parent dashboard code.
- Do not design or implement any other roadmap games.
- Do not add backend, accounts, cloud sync, AI tutor chat, public sharing, payment/store behavior, real phone/audio calling, scoring economy, streaks, leaderboards, loot rewards, or open-ended generative child-mode content.

## Contract Amendments
### Build Amendment
The user asked to start the build after the design spec was completed.

Root cause for build work:
- The repo now has a Game 1 design source of truth, but the app has no runtime path for `Kennedi's Orders`.
- Existing infrastructure can already register activities, route by `interaction_model`, speak prompts, store local events, and update progress. The missing piece is a scoped game module plus local activity variants that conform to existing contracts.

Correct fix must touch:
- `src/modules/kennedis-orders/` for the Game 1 runtime and module-local types.
- `src/content/activities/` for the minimum local activity variants from the design spec.
- `src/content/activity-catalog.ts` to register those variants.
- `src/content/activity-title-lookup.ts` if parent-facing titles are maintained by static lookup.
- `src/app/main.ts` to route `tap_then_place` Kennedi's Orders activities to the new module.
- `src/modules/home/HomeScreen.ts` only if needed to expose the game while preserving no more than four child-facing primary choices.
- `src/styles/child-ui.css` for scoped Bear Cafe child UI styles.
- Focused tests only if current contract coverage needs an assertion for the new module/catalog route.

Must not change:
- Do not expand core schemas, domain unions, event outcome unions, transfer context unions, parent approval semantics, storage, mastery, recommendation, or event logger behavior.
- Do not implement other games or broader curriculum changes.
- Do not add network, backend, AI, account, payment, leaderboard, streak, loot, or open-web behavior.
- Do not change the existing video vault implementation, even if the home tile is repurposed for the first game.

## Cold Diff Audit

### Gaps
- change without contract trace: none
- contract requirement not delivered: none
- protected surface touched: none

### Change By Change Reconstruction
- `docs/work-contracts/kennedis-orders-game-design.md` records the required before-code contract, scope boundaries, and final cold-diff audit for the Game Designer lane.
- `docs/game-design/kennedis-orders.md` adds the complete Game 1 design handoff for `Kennedi's Orders`.
- `src/modules/kennedis-orders/kennedis-orders.types.ts` defines module-local Bear Cafe content types.
- `src/modules/kennedis-orders/KennedisOrdersActivity.ts` adds the `tap_then_place` Bear Cafe runtime: phone answer, order prompt, tap-to-place tray, check/fix, delivery, completion, and existing `ActivityAttemptEvent` logging.
- `src/content/activities/kennedis-orders-*.json` adds the four minimum local activity variants: free make, pink cupcake, 3 berries, and B-food first sound.
- `src/content/activity-catalog.ts` registers the four activity variants.
- `src/app/main.ts` dispatches Kennedi's Orders `tap_then_place` activities to the new runtime and destroys it on route changes.
- `src/modules/home/HomeScreen.ts` exposes Cafe as one of the existing four child-facing home choices.
- `src/styles/child-ui.css` adds scoped Bear Cafe styles, large tap targets, responsive two-column kitchen layout, and focused delivery/completion stages.

### Contract Traceability
- `docs/work-contracts/kennedis-orders-game-design.md` satisfies the repo change-workflow requirement to state root cause, correct fix surface, protected surface, and cold-diff audit.
- `docs/game-design/kennedis-orders.md` satisfies the required Game 1 design deliverable.
- `src/modules/kennedis-orders/` satisfies the build amendment runtime requirement.
- `src/content/activities/kennedis-orders-*.json` and `src/content/activity-catalog.ts` satisfy the build amendment local variant and registration requirements.
- `src/app/main.ts`, `src/modules/home/HomeScreen.ts`, and `src/styles/child-ui.css` satisfy the build amendment routing, exposure, and child UI requirements.
- No core schemas, event logger, mastery engine, storage, parent approval semantics, or other game modules were changed.

### Verification
- `git status --short --branch` in the main checkout confirmed the original checkout was clean after moving the docs into the Game Designer worktree.
- `git status --short --branch` in the Game Designer worktree confirmed only the scoped docs are untracked.
- `find .../docs/game-design .../docs/work-contracts -maxdepth 1 -type f` confirmed the spec and work contract exist in the Game Designer worktree.
- Cold audit read performed against `docs/game-design/kennedis-orders.md` and this work-contract log.
- `npm ci` installed dependencies in the separate worktree.
- `npm run typecheck` passed.
- `npm test` passed: 24 test files, 94 tests.
- `npm run build` passed.
- Vite dev server verified at `http://127.0.0.1:5175/`.
- Agent-browser verification passed for home load, no Vite error overlay, Cafe tile render, free-make order completion, event logging, next-order handoff, and pink cupcake object/color match.
