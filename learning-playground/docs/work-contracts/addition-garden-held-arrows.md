# Preserve held directions during garden movement — revision 1

## Root Cause
PR 188's handoff commit aa897ac736ec447741abcbee5c857e9af02283c2 added an unconditional call from accepted arrow input to `GardenScene.ts:217`. The helper calls `stopMoving` before checking for an in-flight apple. `stopMoving` clears the held-key set, so adding another arrow loses the first held direction. The review thread reproduces Right then Up.

## Correct Fix Must Touch
Separate canceling the in-flight apple from stopping all scene activity in `GardenScene.ts`. Arrow input cancels the handoff if present and takes over the existing frame without clearing held directions. Pointer routing, blur, hidden-tab handling, replay and teardown explicitly stop activity and cancel the handoff through one shared path. Keep the existing scheduler, keyboard focus, route cleanup and model ownership. Extend the existing controlled-frame browser test to exercise two held directions, single-key release and blur with a held key. The existing handoff tests cover cancellation by arrow, pointer, blur, visibility and exit.

## Must Not Change
Garden visuals, requested fruit, arrival, counted apples, modal key ownership, other games and deployment. No new movement restrictions. Existing cancellation prevents a pass from completing after the player leaves it, and restores the unfinished apple.

## Verification
Fail first on the reviewed commit with the browser scheduler test. Repeat the same sequence after the repair and run the adjacent input and handoff tests, typecheck and work-contract check. Neutralize the moved handoff-presence branch and the two cleanup calls in the shared full-stop path in isolated copies using bounded runs. Record outcomes, exact revision and remaining review gates.

## Implementation summary
Reproduced on aa897ac736ec447741abcbee5c857e9af02283c2 with `npx playwright test tests/browser/addition-garden.spec.ts -g 'scheduler orders'`. Holding Right, then adding Up, left x unchanged at 524.6580000400543. The source diff and blame identify the introducing handoff call. The corrected sequence advances on both axes, releasing Up keeps Right active, and blur clears the held key and the pending frame.

Arrow takeover now calls `cancelActiveHandoff` directly. The active apple is restored using the same model transition and the pending frame switches to movement. Full stops still cancel the frame and discard held input before restoring any apple. The old mixed-purpose helper is gone.

## Cold diff audit
- `src/modules/addition-garden/GardenScene.ts:217` owns handoff cancellation, while the shared full stop at line 225 composes it with `stopMoving`. Approach, replay, blur, hidden tab and teardown call the full stop at lines 259, 397, 443, 444 and 453. The keyboard path at line 423 cancels the handoff and preserves the existing held-key set.
- `tests/browser/addition-garden.spec.ts:202` exercises the reviewed key sequence, checks both axes, releases one key and verifies continuation, then checks blur and a stale frame while another key is held. Existing real-browser cases still cover the handoff interruptions and keyboard focus.
- This contract records the review repair. All changes trace to the root cause and required surface. No other features or lifecycle rules changed.

Ten targeted browser tests passed, including both motion preferences. Typecheck and the work-contract check passed. Mutation controls passed and three neutralizations were killed: skipping the full movement stop (held-key blur leaves a frame), skipping full-stop handoff cancellation (interrupted apple stays visible), and skipping arrow handoff cancellation (the apple completes rather than returning to the basket). Removing the idle-flight branch is equivalent for gameplay: there is no in-hand fruit to return (`garden-model.ts:74`), repaint leaves position and inventory unchanged, and arrow handling already focuses the viewport. Whole process tree 2 GiB, swap 0, 35 seconds per run / 160-second total budget. An initial test filter selected no tests; it was corrected before the recorded fail-first run.

## Gap audit
Repair and regression proof complete locally. Independent review and CI of the repair, thread closure, merge and production installation are separate. Next feature slice remains unstarted.
