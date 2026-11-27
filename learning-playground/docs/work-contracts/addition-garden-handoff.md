# Addition garden visible handoff — revision 1

## Before Code
### Root Cause
The current first playable transfers every basket apple to the table synchronously in `garden-model.ts:deliver`, then `GardenScene.ts:interact` immediately opens counting. Bear is a static image. The operator inspected that flow and explicitly approved planning and implementing one-at-a-time giving, receiving and placing before counting. This extends owned PR 188 and its first-playable contract, not a parallel dependent PR.

### Correct Fix Must Touch
- Model: explicit sharing phase and per-apple hand location. Arrival validates quantity but transfers nothing. Begin one apple, complete the same apple after landing, or cancel it back to the basket. Fruit locations remain the sole inventory owner; counting starts only after all requested apples land.
- Scene: a Give an apple action and Space/E equivalent; articulated original explorer/Bear hands; a single visible apple travels hand-to-hand then to a stable table slot. Bear thanks her, then asks the total after the last placement. Reuse the frame scheduler, frame cap and native dialog; no timer/promise race or second inventory.
- Art/layout: inline the existing Bear source to articulate his arm; add an explorer giving-arm group and invisible hand landmarks. Move Bear near the receiving side of the table, draw apples on its surface, frame both characters in portrait while exchanging. Preserve accepted identities and all other art.
- Tests: model conservation and transition boundaries; real-browser one-at-a-time taps/Space/E, visual stages, placement before modal, duplicate input, movement/blur/visibility cancellation, route teardown, replay, reduced motion and portrait framing. Update existing delivery helpers to perform the newly required child gestures; retain keyboard-focus regression.
- Provenance and this contract record accepted visual base and new draft motion proof.

### Must Not Change
Other games, home categories, dependencies, assessment/events, saved progress, voice packs, deployment and merge authority. Incorrect quantities remain recoverable before sharing. The child may walk away or leave; only overlapping handoffs are refused so one gesture cannot create simultaneous transfers. One transferred apple is counted only once, after it lands. No timeout or punishment. Reduced motion retains visible ordered poses without a moving trajectory.

## State and ordering plan
Collecting -> arrival with requested quantity -> sharing, no fruit moved. Give -> one basket apple in hand -> visible offer/receive/place -> that apple on table. Final placement -> counting -> existing answer/cloth/replay. Begin refuses wrong phase, out-of-reach or an already active apple; completion refuses wrong phase or wrong apple. Cancellation returns only in-hand fruit; previously placed fruit persists. No-progress sharing can be resumed after walking away. All new input routes use the same model transitions.

Reachable orderings to exercise: arrival then give; duplicate tap/held key during a pass; movement or ground click before/after pickup and before/after landing; blur/hidden tab during a pass; canceled callback after route exit; move away and return after partial delivery; final placement then duplicate completion; answer before final landing; replay after completion; mouse-focused button then arrow takeover; modal-owned keys. Rendered buttons are synchronized from model inventory; disabled Give lasts only for an active pass. No scene-entry autofocus workaround.

## Verification plan
Targeted model and browser checks, typecheck/work-contract/build; browser screenshots or video at actual offer/receive/place on desktop and portrait; reduced-motion flow. Neutralizing mutations for every new/changed admission/state/cleanup clause in isolated copies, bounded per-mutant/total time and whole-process-tree memory. Existing baseline proof is the reference for unchanged movement and keyboard controls. Broad duplicate suites remain CI-owned. Durable evidence outside worktrees.

## Contract Amendments
The portrait walk-away test reproduced the explorer outside the viewport at x -82.34371948242188. The shared-camera condition was incorrectly tied to the whole sharing phase. Use the active flight only, and restore framing on interruption; the retained regression covers the same walk-away and resumption. This is a correction in the new camera owner, not a downstream clipping patch.

## Implementation summary
The approved flow is implemented: arrival retains the basket, each Give/Space/E moves one apple through offer/receive/place, and final placement opens counting. The single model inventory owns basket/hand/table; the existing RAF owns motion and cancellation. Walking away, blur/hidden, replay and route teardown return an unfinished apple without undoing landed fruit. Normal and reduced-motion browser flows pass.

The overlap refusal costs only another simultaneous pass: the inventory has one in-hand owner and the child sees that one exchange. Permitting another gesture concurrently would lose that correspondence; queuing extra gestures would give unrequested later passes. Near-Bear admission makes this a physical exchange; the action automatically walks her there. Final-placement admission preserves the lesson's visible count; opening earlier would count fruit still in transit. No broader access or time restriction was added.

## Cold Diff Audit
No out-of-contract changes found. Reconstruction against the previous reviewed head:
- `src/modules/addition-garden/garden-model.ts:5,45,57,66,73`: closed location/phase unions; arrival, begin, finish and cancel own inventory. Traces to Root Cause and Model.
- `src/modules/addition-garden/GardenScene.ts:69,123,151,165,199,217,232,282,429,440,450`: inline articulated Bear, stable slots, Give action, hand landmarks, single-frame exchange, camera during flight, shared interruption, keyboard and teardown. Traces to Scene and camera amendment. Original depth formula remains at line 131; no special foreground override.
- `src/modules/addition-garden/garden.css:17`: Bear/table/transfer geometry and arm pivots; disabled action appearance. Traces to Art/layout.
- `design-source/addition-garden/explorer.svg:5` and `bear.svg:1`: editable giving arm/receiving landmark in original art. Traces to Art/layout.
- `tests/modules/addition-garden.test.ts:135`: conservation, ownership, phase, reach, empty basket, duplicate/stale finish and resume. Existing delivery checks now complete explicit handoffs. Traces to Tests.
- `tests/browser/addition-garden.spec.ts:1,336,362,400,424`: delivery helper, real stages/slot counts, interruption, portrait camera/depth and controlled frame ordering in both motion preferences. Existing Math keyboard/replay proof retained. Traces to Tests.
- `docs/art/asset-provenance.md:599`: accepted base style and draft motion provenance. Traces to Provenance.
- This contract records the approved slice and its evidence. Other games, dependencies and deployment configuration untouched.

Verification: 65 targeted/adjacent tests passed; 20 garden browser cases passed before final depth correction and stronger frame assertions. Final handoff subset: 5 passed, including the depth correction and both motion preferences. Typecheck, build and work-contract checks passed after source edits. Build retains existing chunk-size warning. Actual recorded playthrough completed three separately requested passes with no page errors. Neutralizing mutations: 28 killed, 3 equivalent; additional resume-routing deletion killed. Controls passed. Original failed/inconclusive attempts are preserved, not counted as kills.

Origin defects discovered within this uncommitted revision: camera locked to the entire sharing phase and an unnecessary foreground override persisted after walking away. Both failed retained portrait assertions, were removed at paintCamera/paintPosition, and pass in the final subset. No introducing published commit exists for either. A test assumed media emulation and compared exact floating-point matrices; explicit media selection and a numerical arm-angle tolerance correct those test assumptions without changing gameplay.

## Gap audit
Local implementation and verification complete. Independent review of this revision, merge and production installation are NOT DONE. The earlier keyboard repair review completed without findings; it does not approve this new motion revision. Base art is accepted; motion preview remains available for operator feedback.
