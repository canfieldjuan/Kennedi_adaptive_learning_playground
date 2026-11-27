# Addition garden — first playable (revision 1)

## Finish line
The operator can open a local browser preview, move the explorer through a dimensional garden with mouse/touch or arrow keys, pick apples, carry them to Bear, combine them with his two apples, answer the total, and admire the picnic until choosing to play again or leave. This is a staged first playable, not a production deployment or a new mastery/transfer claim.

## Before Code

### Root Cause
This is a new game, not a defect repair. Current Math opens Number Train; there is no freely navigable addition scene. `src/app/router.ts`, `src/app/main.ts`, and `src/modules/home/HomeScreen.ts` own routing. The existing speech wrapper already falls back to device narration for unpacked lines. The approved garden image is an art-direction reference, not executable geometry or an asset pack.

### Correct Fix Must Touch
- Add a typed garden state owner for spatial movement, obstacle-aware paths, individual apple ownership, delivery, answer checking, and replay. Counts derive from apple locations, never a separate mutable score. Bear begins with two and asks for three. All tree apples are pickable; extras can be returned. No timer, lives, basket cap, or punishment.
- Add original editable SVG art under `design-source/addition-garden/`, consumed directly by Vite as local optimized assets. Reconstruct the reference's curly-haired explorer, teal overalls, yellow shirt, warm bear, apple tree, pond and picnic as editable original vector forms. No generated raster enters runtime and no new framework/dependency is needed: DOM/SVG supports the depth layers, spatial input, and animated character required by this first scene.
- Add a scoped scene renderer/style with tap-to-walk, click-to-approach/interact, keyboard movement and interaction, nearby action controls, spoken and visible feedback, object-based counting, replay and cleanup. Keep actions independent of narration completion. Respect reduced motion; stop movement on focus loss and cancel frame/listener ownership on teardown.
- Add a Math chooser preserving Number Train and offering Addition Garden. Keep the four home categories. Add typed math/garden routes and lifecycle wiring.
- Add unit and real-browser tests and an asset provenance entry. Capture desktop/mobile proof and record a cold diff audit.

### Must Not Change
No changes to existing game logic, activity catalog/schema, assessment/event/mastery/transfer pipeline, stored settings or progress, voice manifests, parent gate, dependencies, deployment configuration, unrelated storybook/workbook work, or other branches. Garden is a non-assessment first playable. Durable ownership history/recorded voice packs and certified activity intake remain a later integration slice if ordered; this local proof requires neither and must not claim either.

## Assumptions / accepted direction
Operator approved the shown garden and explorer concept and explicitly requested building walking, picking and delivery. Use one compact world with fixed two-plus-three learning objective, unlimited retries, a child-chosen picnic cloth color, and a completed scene retained until explicit replay/home. Source is current `origin/main` in an isolated owned worktree. No production deployment or merge authority inferred.

## Design plan
Palette: leaf #446b32, meadow #95b85c, pond #5ba7a3, sand #e6c78e, apple #d9503f, ink #473421. Existing rounded system type supports the small amount of text. Scene occupies the screen; compact home/repeat strip, Bear's short request, a basket display, and contextual actions. Scene rather than cards carries identity. Ground plane, occlusion, soft shadows, gradients, articulated walk and carried fruit express depth. Portrait follows the explorer horizontally rather than shrinking every object. Review against brief: no dashboard cards or worksheet controls in the world; counts remain visible objects.

## Verification plan
- Unit: apple conservation, fewer/exact/more deliveries, duplicates, returns, invalid ordering, incorrect/correct answers, replay, boundaries, collision/path traversal, keyboard diagonal movement.
- Distinct orderings: move then retarget; pick request then move away; repeated click before arrival; replay during travel; leave during travel/narration; hidden tab then resume; answer before delivery; repeat deliver/answer after completion. Test model orderings in Vitest and lifecycle/input orderings in browser.
- Browser: actual Math navigation, mouse/touch trip with carrying and delivery, keyboard travel/interact, wrong quantity recovery, correct equation, finished scene, replay/home teardown, mobile viewport, reduced motion and no console errors.
- Targeted/adjacent tests, typecheck, production build and work-contract check. CI owns duplicated broad suites.
- Neutralizing mutation checks for each new state/spatial/lifecycle guard, using targeted controls, whole-tree memory caps and per-mutant/total budgets; record killed/equivalent/inconclusive honestly before review.

## Contract Amendments
- Camera verification reproduced vertical cropping on a wide, short viewport. Keep the whole world height in view; center horizontally when it fits and follow horizontally in portrait. This is an origin fix in `paintCamera`, not a second clipping/filter layer.
- Keyboard verification exposed the plain overlay's missing focus boundary. Use the browser's native modal dialog rather than a custom focus trap; Escape and close return to the scene. The regression distinguishes browser chrome (BODY placeholder) from background game controls.
- Movement-frame catch-up is capped at 50 ms. This excludes automatic catch-up after a blocked/suspended frame so the explorer cannot teleport or complete an unintended interaction. Blur/visibility cleanup alone cannot handle a busy foreground main thread. A controlled stall test exercises this limit. This is not a play-session timeout.
- The path-cycle mutation initially exhausted its own 1 GiB cgroup; that attempt is inconclusive, never a kill. A dedicated two-step path test now uses a real worker and a 250 ms computation budget after startup, terminating it before cyclic search can exhaust memory. This smaller test retains the same whole-process-tree memory cap and produces an assertion failure on the neutralized visited-node clause.

## Implementation summary
Implemented the local first playable: tap/click or keyboard travel, obstacle-aware paths, carried apples, recoverable wrong quantities, Bear delivery, object counting, answer feedback, cloth choice and replay. Math now offers Apple garden and the existing Number Train. Original editable vectors provide the layered garden and articulated explorer; this is a simpler vector interpretation of the approved concept, pending operator visual acceptance.

Verification observed in this session:
- Targeted Vitest command: `npx vitest run tests/modules/addition-garden.test.ts tests/modules/home-cohesion.test.ts tests/contract/child-home-cafe-entry.test.ts tests/contract/parent-game-launch.test.ts tests/contract/voice-pack.test.ts` — 5 files, 62 tests passed.
- `npx playwright test tests/browser/addition-garden.spec.ts` — 13 passed (47.5s), including desktop/mobile screenshots, wrong quantities, keyboard, retargeting, frame stall, teardown, reduced motion and native dialog focus/Escape.
- After the final cosmetic change to reuse the existing Number Train illustration, the Math navigation browser test passed again (3.1s); no guard code changed, so prior mutation and full browser evidence remains applicable.
- `npm run typecheck`, `npm run check:work-contract`, and final `npm run build` passed. Vite reported the existing large-bundle warning; no dependency changes.
- Manual Chrome flow completed picking, delivery, answering and replay. Local preview remains available at `http://127.0.0.1:4186/#garden` while the development server runs.
- Neutralizing mutation controls passed: 37 mutants, 33 killed and 4 equivalent. Model budget: 1 GiB whole process tree, swap disabled, 12 seconds each / 180 total. Browser budget: 2 GiB whole process tree, swap disabled, 35 seconds each / 300 total. Initial path-search OOM was inconclusive; its smaller worker reproduction subsequently killed the mutant by an assertion failure without raising the cap.

The hidden-tab handler shares `stopMoving` with the tested blur ordering; direct browser tab suspension is not separately certified. Speech uses the existing fallback and is not a recorded voice-pack claim.

## Cold Diff Audit
All paths below are relative to `learning-playground/`. Each touched file maps to the required change surface above.

| File and line | Actual change and contract trace | Verification |
| --- | --- | --- |
| `src/app/router.ts:11` | Closed math/garden route variants, parse and navigate | Typecheck; Math browser navigation |
| `src/app/main.ts:8` | Scene entry points and route teardown | Browser route exit and canceled-frame checks |
| `src/modules/home/HomeScreen.ts:41` | Math opens game chooser | Home cohesion and Math navigation |
| `src/modules/addition-garden/garden-model.ts:21` | Single fruit/state owner, exact delivery, answer and movement geometry | Unit boundary/orderings; model mutation controls |
| `src/modules/addition-garden/GardenScene.ts:34` | Scene, camera, approach/interaction, native dialog, input and teardown | Browser flow, camera, focus, stall and UI mutation checks |
| `src/modules/addition-garden/garden.css:1` | Scoped depth/layout, gait, responsive framing and reduced motion | Desktop/mobile screenshots and reduced-motion browser test |
| `design-source/addition-garden/apple.svg:1` | Original apple reused for carried/countable objects | Browser fruit counts; visual contact sheet |
| `design-source/addition-garden/bear.svg:1` | Original Bear | Browser delivery; visual contact sheet |
| `design-source/addition-garden/explorer.svg:1` | Original articulated explorer | Keyboard/walk browser proof; visual contact sheet |
| `design-source/addition-garden/garden.svg:1` | Original layered garden backdrop | Desktop/mobile framing proof |
| `design-source/addition-garden/table.svg:1` | Original picnic with changeable cloth | Cloth-choice and completed-scene proof |
| `design-source/addition-garden/tree.svg:1` | Original tree and visible fruit target | Direct-apple approach and picking proof |
| `tests/modules/addition-garden.test.ts:1` | Fruit conservation, invalid sequences, geometry and bounded cycle regression | Passing control; neutralizing model mutants |
| `tests/browser/addition-garden.spec.ts:18` | Real scene and lifecycle regressions | Passing browser control; neutralizing UI mutants |
| `docs/art/asset-provenance.md:599` | Art lineage and draft visual status | Sources and rendered contact sheet inspected |
| `docs/work-contracts/addition-garden-first-playable.md:1` | Scope, evidence, limitations and audit | Work-contract check; cold diff |

`effect-trace: walking/picking/delivery | typed fruit owner plus scene approach/interact and frame scheduler | real browser trip, direct apple interaction and keyboard tests pass.`

`boundary-probe: fewer/exact/more apples, reach inside/outside, duplicate/out-of-order actions, collision edges and frame/input lifecycle | passing controls and neutralized refusing clauses recorded below.`

Origin repairs in this uncommitted implementation: camera height-fitting at `GardenScene.ts:109` fixes the reproduced wide-screen crop; native dialog at `GardenScene.ts:242` fixes background focus access. Both failed before and passed after, with browser regression tests retained. No earlier published introducing commit exists, and no downstream compensation or superseded special case remains. A route-exit assertion was corrected to await actual navigation before checking cleanup; no application repair was needed for that test race.

## Mutation
| Guard | Operator | Outcome | Killing test or equivalent reason |
| --- | --- | --- | --- |
| pick-phase | neutralize | killed | out of order answers and post-delivery interactions cannot change the picnic |
| pick-reach | neutralize | killed | no remote picking, return or delivery; reach boundary is inclusive |
| pick-ownership | neutralize | killed | one apple cannot be picked twice, and each can be returned and repicked |
| return-phase | neutralize | equivalent: after delivery basket is empty; return-empty refuses it | redundant refusal |
| return-reach | neutralize | killed | no remote picking, return or delivery; reach boundary is inclusive |
| return-empty | neutralize | killed | no remote picking, return or delivery; reach boundary is inclusive |
| deliver-phase | neutralize | killed | out of order answers and post-delivery interactions cannot change the picnic |
| deliver-reach | neutralize | killed | no remote picking, return or delivery; reach boundary is inclusive |
| deliver-fewer | neutralize | killed | rejects delivery of 0 without losing any fruit; return/pick repairs it |
| deliver-more | neutralize | killed | rejects delivery of 4 without losing any fruit; return/pick repairs it |
| answer-phase | neutralize | killed | out of order answers and post-delivery interactions cannot change the picnic |
| answer-total | neutralize | killed | exact delivery combines actual fruit and requires the correct total |
| reach-limit | neutralize | killed | no remote picking, return or delivery; reach boundary is inclusive |
| world-left | neutralize | killed | feet cannot enter obstacle or boundary at 79,500 |
| world-right | neutralize | killed | feet cannot enter obstacle or boundary at 1121,500 |
| world-top | neutralize | killed | feet cannot enter obstacle or boundary at 500,319 |
| world-bottom | neutralize | killed | feet cannot enter obstacle or boundary at 500,741 |
| trunk-solid | neutralize | killed | feet cannot enter obstacle or boundary at 255,395 |
| table-solid | neutralize | killed | feet cannot enter obstacle or boundary at 800,400 |
| pond-solid | neutralize | killed | feet cannot enter obstacle or boundary at 1010,710 |
| path-admission | neutralize | killed | path is collision free to {"x":1000,"y":520}, including obstacle clicks |
| path-neighbor-exists | neutralize | killed | path is collision free to {"x":360,"y":460}, including obstacle clicks |
| path-visited | neutralize | killed | path search refuses cycles and completes a two-step route within its worker budget |
| walk-idle | neutralize | equivalent: NaN proposals fail walkable; origin stays unchanged | redundant refusal |
| walk-horizontal | neutralize | killed | keyboard cannot tunnel through table or pond on a long frame |
| walk-vertical | neutralize | killed | keyboard cannot tunnel through table or pond on a long frame |
| schedule-single-frame | neutralize | killed | scheduler orders |
| schedule-disposed | neutralize | equivalent: abort removes event callers; canceled frames cannot schedule; frame owner test includes stale callbacks | scheduler orders |
| tick-disposed | neutralize | equivalent: stopMoving clears keys, route and intent before canceled callbacks; no residual work | scheduler orders |
| cancel-frame | neutralize | killed | scheduler orders |
| abort-listeners | neutralize | killed | scheduler orders |
| counting-input | neutralize | killed | counting holds |
| frame-stall-cap | neutralize | killed | scheduler orders |
| modal-isolation | neutralize | killed | counting keeps keyboard focus |
| held-space | neutralize | killed | scheduler orders |
| orchard-bubble | neutralize | killed | orchard apple |
| movement-key-admission | neutralize | killed | scheduler orders |

## Gap audit
DONE — the requested local first-playable finish line is implemented and exercised.

Staged locally: complete. Merged to main: NOT DONE. Installed/deployed and verified in Kennedi's desktop web app: NOT DONE. No production change or merge authorization inferred. Remote CI and independent review are pending publication. Final vector artwork acceptance remains with the operator. Assessment integration, saved garden progress, recorded narration and additional lessons are outside this slice.

## Quality gate amendment — Math chooser regression coverage

The initial garden commit `121eb56e9f63a290ae424899ddc7b956eb595a41` intentionally changed the Math tile in `src/modules/home/HomeScreen.ts:41` to open the chooser. It left the Number Train unit test expecting the previous direct route at `tests/modules/number-train.test.ts:58`. The required GitHub quality gate and a local run on `8a468f56e6c26cb2f945a8eb700d189f5cf00368` both reproduce expected `#activity/number-train`, received `#math`.

The repair updates the obsolete unit expectation at that test. The existing browser regression in `tests/browser/addition-garden.spec.ts:77` already exercises Home → Math chooser → Number Train and opens the garden from the same chooser. Retain both checks. No runtime navigation, artwork, gameplay, or CI condition changes. No guards change, so this test and documentation repair does not introduce a mutation sweep.

Verification and cold diff audit follow below.

The cold diff changes only the Math tile test name and expected destination in `tests/modules/number-train.test.ts:51` and `:58`, plus this amendment. The exact local reproduction failed before the correction. Afterward `npm test` passed all 930 tests across 65 files. The existing Playwright case “Math offers garden and preserves Number Train” passed, exercising both game links. GitHub quality gate and independent review of the corrected revision remain pending.
