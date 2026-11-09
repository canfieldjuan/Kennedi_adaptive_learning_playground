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


## Numerical repair discovered by the resumed fit

Reproduce: the first resumed run exits normally but reports
`derivatives_unresolved` after its first accepted update; whole-cycle validation
still FAIL. Re-evaluation reproduces the same foot_z chart direction. The
largest existing probe gives disagreement 0.06361924204273248; a wider probe
inside the existing 0.5 trust bound gives 0.030957800318478265, under the unchanged
0.05 derivative-agreement threshold. This is not a gait threshold change.

Isolate/explain: the fixed probe list in `numerics.finite_difference`, introduced
by our qualified repair at 0557581 (replayed as e81ef6e), stops at 0.1 even when
the trust region permits a wider measurement. Weak latent directions remain
above the model's cancellation noise at that arbitrary cutoff. The guard is
correct to refuse them; the sampler must exhaust its permitted measurement
range before concluding it is unresolved.

Correct fix must touch only the numerical step-bound owner and probe generation,
a public frozen numerical-coordinate fixture and its regression, and this
contract/evidence. Give solve bounds and derivative probes one named numerical
trust-limit owner, and expand probe sizes geometrically up to that bound. Keep
the agreement tolerance unchanged and retain explicit refusal when no probe
resolves. Do not edit the frozen source, gait rules, objective, controls or rig.
Prove the exact stop fixture fails before repair and resolves after; cover a
true unresolved signal and valid bounded endpoints; requalify both the original
frozen numerical problem and this new frozen point before another fit. No
unlimited probe/search or implicit approval of failed motion is introduced.


Probe-range repair proof: the saved-stop regression failed with the expected
UnreliableJacobian before repair and passes afterward. All 27 numerical/geometry
tests pass. Both frozen sources resolve all 98 directions under the unchanged
agreement tolerance, converge with independent KKT/bounds checks, and admit
actual objective descent. Forced inner-budget exhaustion remains explicit.
Only numerics.py, the regression test and numerical fixture changed; all gait
source/validator/reference/objective files remain unchanged.

After these gates, resume the saved stop point once with the same bounded run
settings. Preserve both attempts. The replacement probe ladder is bounded by
the same named 0.5 trust limit as the solve; it does not widen that limit.
