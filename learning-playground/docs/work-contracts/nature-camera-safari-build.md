# Change Contract

## Before Code

### Root Cause
Game 2 does not exist in the app. The project has the core activity schema, event logger, local storage, progress, transfer metadata, safety checks, and Game 1 runtime patterns, but there is no contract-compliant Nature Camera Safari module or local activity content for scene-based pretend camera play.

The actual problem is not missing curriculum infrastructure. It is the absence of a scoped game runtime and approved local activity variants that let the child take pretend nature photos while emitting evidence through the existing `ActivityAttemptEvent` path.

### Correct Fix Must Touch
- Add a narrow `src/modules/nature-camera-safari/` runtime, module-local types, and pure logic helpers for event/evaluation tests.
- Add local activity JSON files for:
  - bird photo
  - squirrel photo
  - count two birds
  - B sound safari
  - photo album review
- Register those activities in `src/content/activity-catalog.ts`.
- Route Nature Camera Safari `tap_then_place` activities in `src/app/main.ts`.
- Add local SVG placeholder assets under `public/assets/images/` for camera/nature objects if they do not already exist.
- Add scoped child UI styles in `src/styles/child-ui.css`.
- Add focused tests proving schema/transfer/safety compatibility and game event/evaluation behavior.

### Must Not Change
- Do not change Game 1 unless verification reveals a real defect.
- Do not expand activity schema, event outcome unions, input type unions, skill graph, mastery logic, transfer strength logic, recommendation logic, storage, parent approval semantics, package versions, dependencies, or build configuration.
- Do not add real camera permissions, backend services, auth, cloud sync, open web content, AI tutor chat, public sharing, ads, streaks, leaderboards, randomized rewards, or future roadmap games.
- Do not change home navigation unless needed by verification; the app can launch registered activities directly by `#activity/:id`.

### Assumptions/Blockers
- Same/different, memory, sequence, and spatial skills are not active in the current curriculum graph, so first build maps to `vocabulary`, `counting`, and `initial_sound` only.
- The existing schema has no activity approval status field; parent boundary is represented by `safety.requires_parent_approval: true` and `external_links_allowed: false`, matching current activities.
- The existing event shape has no `camera` input type, so pretend camera captures use `input_type: "tap"`.
- Node test environment has no browser DOM, so event and interaction correctness should be covered by pure helpers plus browser verification.

### Verification Plan
- Run `npm test`.
- Run `npm run typecheck`.
- Run `npm run build`.
- Verify the dev server in a browser with agent-browser.
- Browser-check at least one correct capture, one incorrect capture/fix path, one count activity completion, and no error overlay.

## Contract Amendments
None.

## Cold Diff Audit

### Gaps
- change without contract trace: none for Game 2
- contract requirement not delivered: none
- protected surface touched: none

### Change By Change Reconstruction
- `src/modules/nature-camera-safari/nature-camera-safari.types.ts` defines module-local content, scene object, task, and evaluation types.
- `src/modules/nature-camera-safari/nature-camera-safari.logic.ts` validates Safari content, evaluates target/count/first-sound/album selections, checks tap-area size, and creates existing-shape `ActivityAttemptEvent` evidence.
- `src/modules/nature-camera-safari/NatureCameraSafariActivity.ts` renders the playable pretend camera loop: intro, scene targets, photo cards, visible camera/check action, save-to-nature-book stage, completion, gentle feedback, hints, and event emission via the provided `onEvent` callback.
- `src/content/activities/nature-camera-*.json` adds the five minimum local variants: bird photo, squirrel photo, count two birds, B sound safari, and album review.
- `src/content/activity-catalog.ts` registers those five local variants.
- `src/app/main.ts` routes `nature-camera-safari` `tap_then_place` activities to the new module and destroys the module on route changes.
- `public/assets/images/{bird,squirrel,tree,flower,cloud,butterfly,camera,photo-card}.svg` adds local placeholder art.
- `src/styles/child-ui.css` adds scoped Nature Camera Safari layout, outdoor scene, large target hit areas, photo cards, visible camera action, and responsive adjustments.
- `tests/modules/nature-camera-safari.test.ts` adds focused tests for registration, schema validation, transfer metadata, curriculum graph compatibility, safety, no real camera APIs, event logging, incorrect non-completion, counting, first-sound selection, and large tap areas.

### Contract Traceability
- Runtime/type/logic files satisfy the required new game module surface.
- Activity JSON files and catalog registration satisfy the required local activity content surface.
- `src/app/main.ts` satisfies the route integration surface.
- SVG assets and `src/styles/child-ui.css` satisfy the local-assets and child UI surface.
- Tests satisfy the verification/test surface.
- No schema, skill graph, mastery, transfer strength, storage, parent approval, dependency, backend, auth, cloud, open web, reward, leaderboard, or future-game surface was changed for Game 2.

### Verification
- `npm run typecheck` passed.
- `npm test` passed: 25 test files, 102 tests.
- `npm run build` passed.
- Browser verification used the Game Builder worktree Vite server at `http://127.0.0.1:5175/` in named agent-browser session `safari`.
- Browser verified no Vite error overlay, Safari intro load, incorrect squirrel tap on bird prompt logging `incorrect` without completion, correct bird capture and `photo_saved_to_album` completion, count-two-birds flow, and count completion.
