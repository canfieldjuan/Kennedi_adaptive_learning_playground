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

Documentation reconciliation: README.md still described the retired coordinate
minimizer. Update that reader to the actual shared numerical owner and the
source-fit status; this changes no source or validation behavior.

## Continuation outcome and stop

The second bounded fit was intentionally stopped after read-only evidence
isolated another numerical-method limit: the outer fit halves damping after
any improvement and discards the accepted step fraction/model agreement.
This policy originated in our 68acce29bccb9c03cbc1ebb715608370a90720c2
change and was retained by the later numerical repair (0557581, replayed e81ef6e).
Its last persisted checkpoint remains whole-cycle FAIL. The linear solver is
converging; that is not whole-search convergence. A frozen-point comparison
shows substantially better full-step descent with more damping, under exactly
the same source, objective and constraints.

Do not perform a third fit in this round. Preserve both attempts and the
outer-step diagnosis. The next required work is a consolidated qualification
of the outer step-admission/damping policy before another fit. This is a
fitting-method limitation; rig/reference infeasibility and an art limit are
not established. Source promotion, a new saved scene, walk acceptance and merge
of this continuation remain blocked by the failed whole-cycle gate.

## Amendment 2026-11-09: step admission and zero-response derivatives

Status: **ACCEPTED by the operator on 2026-11-09.** This commit carries the
contract alone; the implementation follows in separate commits. It was written
from the code and the frozen numerical inputs, not from a proposed patch.

This amendment supersedes one sentence above: "The fitter's existing initial
damping and line search remain as implemented." The initial damping stays. The
line search does not.

### Root Cause

Two defects in our own numerical layer. Neither is evidence about the rig, the
reference or the gait rules.

**A. Step length has two owners, and the second one hides the first one's
failure.** `fit` chooses a damping value, and `trial_step`
(`fitting.py:387-395`) then halves the solved step up to 14 times until the
score drops. It returns only coordinates, score and residuals. `fit` cannot
tell a full step that matched the linear model from a 1/512 step that barely
moved, so `fitting.py:444` halves damping after either. A step that had to be
cut down is the signal that damping is too low; the current policy answers it
by lowering damping again. Damping collapses to its floor and the bounded
iteration budget is spent on negligible steps.

Read-only measurement at the frozen iteration-60 point (score
428.6851806171568, same coordinates, Jacobian, objective and constraints):

- Current policy at damping 1e-7: accepts 1/512 of the step, decrease
  0.0006382115252563381, actual/predicted 0.0117. It would then halve damping.
- Full solved step only, raising damping five-fold on each rejection from
  1e-7: the first three are outside the source domain, the next four increase
  the score, and the eighth (damping 0.0078125) is admitted with decrease
  0.7958631943956789 and actual/predicted 0.502.

**B. A zero response is certified as a derivative.** In
`numerics.finite_difference` (`numerics.py:294-299`), when both probe
differences are exactly zero the relative disagreement is set to 0 and the
direction is admitted at the first probe size. That skips the wider-probe
repair and contradicts the function's own statement that no failed derivative
is substituted with a zero. Reproduced on the public frozen fixture with
coordinate 64 (`phase_foot_x`, index 2) set to -19: the direction is admitted
as central with norm 0.0, while probes from 0.0032 upward show a nonzero
response that never reaches the 0.05 agreement tolerance. None of the four
frozen points used so far has a zero-norm direction, so this defect has not
affected any recorded fit.

### Required behavior

**A. One owner for step length, with a receipt for every evaluated step.**

1. The only step ever scored is the full converged solve, as actually
   evaluated (after projection). The halving search in `trial_step` is
   removed. A step that is too long is shortened by raising damping and
   solving again on the same linearization.
2. Every scored step produces a closed, typed receipt holding: the damping
   used, the actual reduction (score before minus score after), the predicted
   reduction of the undamped linear model for the evaluated displacement
   (score before minus `||r + J d||^2`), and their ratio. The solver's own
   `predicted_reduction` includes the damping term and is recorded but is not
   the denominator.
3. A step is admitted only if the score is finite, the actual reduction
   exceeds the existing 1e-10 floor, and the predicted reduction is finite and
   positive. Anything else is a rejection with a recorded reason.
4. The next damping is a pure function of the receipt, and it is the only
   place damping changes after initialization:

   | Evaluated full step | Step | Next damping |
   | --- | --- | --- |
   | rejected (out of domain, no decrease, non-positive prediction) | discarded | times 5, solve again |
   | admitted, ratio below 0.25 | kept | times 5 |
   | admitted, ratio from 0.25 up to but not including 0.75 | kept | unchanged |
   | admitted, ratio 0.75 or above | kept | halved, floor 1e-7 |

   0.25 and 0.75 are the conventional gain-ratio bands for this method. They
   are named numerical constants, never gait thresholds. The factors, floor,
   initial 0.05 and nine attempts per iteration are the existing values.
5. Each checkpoint records every attempt of the iteration (damping, solve
   status, verdict, actual, predicted, ratio), with nulls where a score was
   out of domain. Checkpoints stay strict JSON.

**B. Zero response is absence of signal, not agreement.**

1. A probe size at which both differences are exactly zero does not admit the
   direction. The ladder continues to the same 0.5 trust limit.
2. A later probe that gives a nonzero response within the unchanged 0.05
   tolerance admits the direction as today.
3. A nonzero response somewhere that never agrees is `unresolved`, as today.
4. Only a direction with exactly zero response at every permitted probe size
   is admitted with a zero column, under a new explicit `flat` status in the
   closed derivative-status set, so the record distinguishes it.

### Invariants

- Damping is never lowered except by an admitted full step with ratio 0.75 or
  above. No other code path assigns damping after initialization.
- An unconverged solve is never scored. An unresolved derivative means no
  solve and no step.
- Parameters change only by an admitted step. A rejected attempt leaves
  coordinates, score and residuals exactly as they were.
- Numerical descent never changes gait status. PASS comes only from the
  unchanged whole-cycle validator.
- Starting damping is 0.05 on every start, including resume. Checkpoints
  written under the old policy carry a collapsed damping that must not be
  trusted.
- The termination set stays closed. If the repair needs a new member, this
  contract is amended first.

### Failure cases

- All nine attempts of an iteration rejected: no step, the existing stuck
  count advances, and three in a row end the run as `no_descent`.
- No converged solve in an iteration: `linear_solve_failed`, as today.
- Any unresolved direction: `derivatives_unresolved`, as today. Known
  consequence of B: a saturated coordinate like the reproduced one now stops
  the fit instead of being treated as constant. That is the intended refusal.
  If a real fit stops there, it is diagnosed at its owner, not worked around.
- Non-finite score, reduction or ratio: rejection, never an admitted receipt
  and never a non-finite value in a checkpoint.

### Concurrency model

Unchanged and single-owner: one process, one thread, sequential objective
evaluations. The only shared state is the checkpoint, validation and source
files of one output path, written by that one fit. No background workers, and
no two fits on one output path.

### Correct Fix Must Touch

- `storybook/animation/maya_walk/fitting.py`: `trial_step`, the attempt loop
  and damping update in `fit`, and the checkpoint record.
- `storybook/animation/maya_walk/numerics.py`: zero-response handling and the
  docstring in `finite_difference`, and the derivative-status set.
- `storybook/animation/maya_walk/tests/test_fitting_numerics.py`, plus one new
  public numerical-coordinate fixture for the iteration-60 point (values
  only, no private paths), following `frozen-derivative-stop.json`.
- `storybook/animation/maya_walk/README.md` (the paragraph describing the
  outer-policy stop) and this contract.

### Must Not Change

Everything in "Must Not Change" above, and in addition: the objective and its
weights, both charts and the source domain, the inner solver and its
certificate, the 0.5 trust limit, the 0.05 agreement tolerance, the probe
ladder sizes, initial damping, the damping factors and floor, the attempt and
stuck limits, `poses.py`, the validator, and every sealed evidence file. No
new dependency. No fit is run and no motion is promoted under this amendment.

### Settling evidence

All of it before any new fit:

1. A small synthetic nonlinear regression, no gait code, where the first
   solved step overshoots. It fails on the current code (damping is lowered
   after a poorly predicted step) and passes after.
2. Both sides of every row of the policy table, including exactly 0.25 and
   exactly 0.75, each rejection reason, and a zero or non-finite prediction.
3. One mutant per clause of the damping function and of the admission test;
   each must be killed.
4. The iteration-60 fixture, started at the collapsed damping 1e-7: the
   admitted step is a full solved step with ratio at least 0.25 and damping
   ends above 1e-7. Fails before, passes after.
5. For B: the coordinate-64 case is admitted as central/zero before and is
   `unresolved` after. A truly flat synthetic direction is `flat`. A direction
   that is zero at small probes and consistent at larger ones resolves to its
   true slope.
6. The existing refusals still hold: unconverged solve never scored,
   unresolved derivative never solved, strict JSON on every stop.
7. Requalification of the original frozen point, the first resumed stop and
   iteration 60: all 98 directions resolved with no zero-norm direction,
   independent KKT and bounds checks, and an admitted full step. A new harness
   with its own source pins; sealed scripts are not edited.
8. The full `maya_walk` suite on the pushed head.

### Stop

After these gates: one grouped push, record head and review state, stop. The
two open review threads are answered with the fail-before and pass-after
evidence and left for the reviewer to resolve. A third bounded fit is a
separate step and needs the operator's go-ahead, since two were stopped.
The walk remains NOT DONE.
