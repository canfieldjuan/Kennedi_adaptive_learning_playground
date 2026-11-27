# Addition garden keyboard focus — revision 1

## Before Code

### Root Cause
`GardenScene.ts` accepts movement keys on window without giving the focusable viewport keyboard ownership. Its Space/E interaction correctly requires viewport focus; chooser entry, mouse action buttons and replay can leave focus elsewhere. Existing keyboard tests explicitly focused the viewport and hid the missing transition. Introducing commit: `121eb56e9f63a290ae424899ddc7b956eb595a41` (this session's initial implementation; git blame on the movement/interaction handler).

Finish-line step: entering from Math, walking with arrows and picking/delivering with Space or E must work without an extra ground click or manual focus. This repairs the original first-playable contract revision 1, not a new game slice.

### Correct Fix Must Touch
Focus the viewport in the one accepted-movement branch, after the modal and movement-key admission checks. Add browser regressions from the actual Math link through picking and Bear delivery for both interaction keys, and after replay. Remove artificial focus from the existing keyboard gameplay test. Cover action-button focus before and after arrow takeover and dialog focus exclusion.

### Must Not Change
No changes to movement geometry, fruit logic, art, other games, narration, schemas, dependencies, deployment or assessment. Retain Space/E's viewport-target check: a focused button's key activation must not also pick an apple. Retain modal exclusion so arrow keys cannot move the scene behind counting. Moving focus on accepted arrow input supplies ownership without weakening either guarantee; no extra focus step is imposed on the child.

Assumptions/blockers: one current unresolved P2 in PR 188; local and PR head match. No access blocker. Existing operator authority covers repair, publication and review reconciliation; merge/deployment remain separate.

Verification plan: fail-first browser cases from Math must reach the tree by arrows then fail to collect an apple with Space/E on the original commit. The fix must pass those same cases and deliver to Bear. Test sibling ordering after replay, nonmovement keys on a focused action, arrow takeover of an action button, and arrow keys while the native counting dialog owns focus. Run the garden browser file, typecheck and work-contract check. Neutralize the new focus transfer plus the existing modal/movement admission and viewport interaction checks in isolated copies; passing controls, per-mutant and total deadlines, whole-process-tree memory cap. CI owns duplicated broad suites.

## Implementation summary
The only runtime edit transfers focus with `viewport.focus({ preventScroll: true })` when the existing movement-key branch accepts input. Space and E share the existing interaction path, so picking and delivery both gain the correct ownership. The modal, key-admission and interaction-target checks remain intact; no secondary repair or scene-entry autofocus is added.

Reproduce: on introducing commit `121eb56e9f63a290ae424899ddc7b956eb595a41`, `npx playwright test tests/browser/addition-garden.spec.ts -g "keyboard from Math"` failed both Space and E cases at the first expected apple. The arrow movement assertions passed first. Isolate/explain: the window key handler accepts arrows without focusing the viewport, while the following interaction branch requires that target. Fix: transfer focus at that movement owner. Prove/prevent: the same cases now pass through picking, delivery, counting and replay; the existing keyboard test no longer installs focus artificially. The focused-control test checks unrelated keys, button Space/E, arrow takeover and dialog exclusion.

Initial targeted result: 4 passed (19.9s). Typecheck and work-contract check passed. Full garden browser file: 16 passed (1.1m). No new broad suite or production build was run for this single DOM focus call; required CI owns those checks.

## Mutation
Control passed for both Math-entry cases and focused-control boundaries. Four neutralizing mutants were killed by assertions (not compilation, runner failure or timeout):
- `focus-transfer`: remove the new focus call; `keyboard from Math ... Space` fails to collect the first apple.
- `counting-input`: remove the modal refusal; `keyboard ownership ...` observes movement behind the dialog.
- `movement-key-admission`: replace movement membership with unconditional acceptance; `keyboard ownership ...` loses focused-button ownership on a nonmovement key.
- `interaction-focus`: remove the viewport-target requirement; `keyboard ownership ...` observes fruit picked while a button has focus.
Isolated source copy and independent Vite server; whole process tree capped at 2 GiB, swap 0, 35 seconds per mutant, 180 seconds total (outer termination budget 190 seconds). No dependency or mutation framework added.

## Cold Diff Audit
### Gaps
No scope or local verification gaps. Remote CI and independent review of the repair head remain pending publication.

### Change By Change Reconstruction
- `src/modules/addition-garden/GardenScene.ts:327`: one DOM focus call in the admitted arrow-key branch. This repairs missing keyboard ownership at its source without changing action admission or geometry.
- `tests/browser/addition-garden.spec.ts:104`: removes manual viewport focus from the existing gameplay test and uses a real arrow gesture after the mouse action. This removes the test setup that masked the defect.
- `tests/browser/addition-garden.spec.ts:252`: keyboard travel helper always releases held keys, including on assertion failure.
- `tests/browser/addition-garden.spec.ts:262`: tests both Space and E from actual Math entry through picking, Bear delivery and replay, without viewport focus setup.
- `tests/browser/addition-garden.spec.ts:287`: checks focus stays on action buttons for unrelated/activation keys, moves into the viewport on arrows, and stays within counting while arrows cannot move the player.
- `docs/work-contracts/addition-garden-keyboard-focus.md:1`: repair scope, origin, reproduction, verification and audit.

### Contract Traceability
The renderer and gameplay regression changes satisfy Correct Fix Must Touch and repair Root Cause. The sibling focus cases prove the retained Must Not Change boundaries. No unrelated production file changes, downstream workaround or redundant exception was added. Earlier artificial focus setup was removed from the gameplay test; scheduler setup focus remains intentional for that isolated timing test.

### Verification
Fail-before: Math-entry Space/E cases both fail on initial production code at the first apple assertion. Pass-after: targeted four cases pass; complete garden file reports 16 passed (1.1m). `npm run typecheck`, `npm run check:work-contract` and `git diff --check` pass. Mutation control passes and all four neutralizing mutants fail their intended assertions.

`effect-trace: arrows then Space/E picks and delivers | focus transfer in the accepted movement branch, consumed by the existing viewport-target interaction branch | the same Math-entry cases fail before and pass after, including replay.`

`boundary-probe: valid game movement/interaction versus nonmovement button keys and modal-owned arrow input | all pass on control; neutralizing each relevant refusal produces an assertion failure.`

## Gap audit
DONE — local P2 repair and regression proof complete. Staged locally: complete. Merged to main: NOT DONE. Installed/deployed and verified: NOT DONE. The repair must be pushed before resolving its thread; fresh remote CI and independent exact-head review remain required before any merge.
