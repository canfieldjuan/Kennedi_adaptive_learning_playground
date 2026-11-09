# Maya walk: qualified source-fit continuation

## Root Cause

The existing source fails the accepted whole-cycle gait rules. Earlier bounded
searches were not feasibility proofs: the numerical step owner silently exhausted
its iteration cap, and weak chart directions were poorly measured and scaled.
The repaired numerical owner now passes the isolated known-solution regression,
the exact frozen quadratic, independently checked KKT/bounds/descent tests and
paired derivative checks. A passing complete walk is still unproved.

## Rule 20 Inventory and Authorization

PR 174 merged only the reviewed validator and lossless-parity prerequisite at
54eb79d6c0116be411008c9ab34770e371e00c8a. The operator explicitly asked to merge
and pick up the next slice. The active continuation replays the unpublished
commits onto that base; its entire tracked tree was proved identical to qualified
checkpoint 05575812f6e0bfe72667113561b7f38231b07c52 before any change.
Source/runtime/model: stdlib Python offline PoseChart/TimingChart, NativeGeometry
and the single validate_cycle; no external model. Numerical method: scaled QR
active set with explicit status and paired finite differences. Prior proof:
G / numerical-repair-2026-11-09/frozen-qualification.json and pure-tests.log
(74 tests PASS). Input: G / timing-fit-2026-11-08/fit-03.json, SHA256
2e979409456439a25beca1261f7b1b9752bbcca907aee450d8b05e46dc6a6425.
Starting source FAIL is retained, never relabeled as passing.

Approved differences from that inventory: Git ancestry now includes merged
PR 174; source is identical. Resume the frozen parameter vector with the repaired
solver, 160 outer iterations maximum, 900 seconds maximum, timing enabled,
velocity weight 1 and guide weight 0. The fitter's existing initial damping
and line search remain as implemented. These are search settings, not gait limits.
No additional parameter type or curve representation is introduced.

## Correct Fix Must Touch

Run the qualified numerical owner against the frozen source once and retain
source/validation/numerical termination receipts. Every search trial remains
subject to the unchanged source domain and whole-cycle validator. Before any
further behavioral change, the corresponding rule must already fail on source
or saved-scene evidence. A numerical failure is diagnosed at its owner before
another fit; a limited failed search never proves rig/reference infeasibility.
Only full source PASS permits static editable source transcription and a fresh
all-action Blender rebuild. Reopened-scene validation, preservation, mutations,
plots/review movies and Juan's playback acceptance remain required afterward.

## Must Not Change

Rig/proportions/art/atlas/cameras, reference bands and timing windows, cycle/fps/
stride, declared holds/events/extrema anchors, minimum key spacing, sparse key
inventory/cap, PCHIP rule, objective terms/weights or validator limits. No new
dependencies, runtime corrections, dense keys, source promotion before PASS,
production pages, other PRs/worktrees or merge of this slice without acceptance.
Existing baseline, parity and numerical evidence is reused by exact source parity.

## Assumptions / Blockers

The prior explicit value and interior-time fitting approvals remain active;
there is no repeated approval question. Complete constrained feasibility remains
unknown. Numerical convergence and objective descent are not walk acceptance.

## Verification

Pin qualified source and frozen input before execution; record the exact command,
budgets, exit/termination status, full source validation and protected-source hash
comparison afterward. Preserve failed trials; no subjective curve tweak follows
a passing numerical score. Do not repeat unaffected broad suites for this
contract/run-only continuation. New code defects require fail-first regression.

## Implementation / Cold Diff / Gap Audit

NOT DONE for the walk. This continuation initially adds only this contract and
starts the bounded source assessment. Run outcome and the next concrete gate
will be recorded before this slice is handed off or published.
