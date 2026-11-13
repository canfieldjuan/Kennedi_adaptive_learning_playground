# Maya walk: the step solver honors the timing-coordinate domain

## Before Code

### Authority and scope

Juan directed "Draft the contract" on 2026-11-12, after the fourth fit stopped
at its first step. That authorizes this contract only. Implementation starts
after Juan explicitly accepts it. It does not authorize a fit, an animation
promotion, saved-scene writes, a merge or walk acceptance.

This contract changes how the fitter computes a step. It changes no gait rule,
no limit, no objective term and no coordinate chart.

### Root Cause

Timing coordinates have a domain, `abs(v) <= 20`, enforced only as a refusal in
`TimingChart.layout` (`fitting.py:235`). The step solver,
`bounded_least_squares` (`numerics.py:92`), knows only the symmetric trust bound
`abs(step) <= TRUST_LIMIT` (0.5, `numerics.py:15`). Nothing passes the domain to
the solver. A step that takes **one** coordinate past 20 makes `layout` raise, so
`Objective.score` returns no residuals (`fitting.py:386-389`), and `trial_step`
refuses the **whole** step as `out_of_domain` (`fitting.py:496-497`). Every other
coordinate's progress is discarded with it.

Raising damping cannot get past this. The damping term scales each coordinate
by its own Jacobian column norm (`numerics.py:92-99`). The column of a coordinate
near the wall is almost zero, so damping barely restrains it, and every attempt
pushes it the full −0.5 again.

Evidence, fourth fit (evidence alias `interval-fit-20261113T005902Z`). The fit
ran at merged main `98d79aa`, resuming from the third fit's result:

- It stopped with `linear_solve_failed` at zero-based iteration 6. The score went
  from 168334.03103640972 to 168334.0309735161. Whole-cycle validation FAIL, 1224
  violations, counts unchanged.
- Replaying iteration 0 at the seed, all 9 attempts converge and predict a
  reduction of up to 160632.39. All 9 are refused `out_of_domain`.
- For every attempt, the refusing check is `ValueError: Bounded phase
  coordinates required`. The only coordinate past the cap is `phase_toe[5]`,
  from −19.99946 to −20.49946.

Evidence alias `phase-domain-contract-2026-11-13`, probes at the same seed:

- `phase_toe[5]` keeps the toe key 9.486e-10 frames above its quarter-frame
  minimum spacing from the previous key (gap 0.25000000095 frames). Its
  Jacobian column norm is 6.55e-08, against a median of 107.36 for timing
  coordinates and 138.92 for value coordinates.
- Holding that one coordinate fixed (its wall is 0.00054 away), iteration 0
  admits the first attempt at damping 0.05. The score goes from 168334.03 to
  31171.69, with an actual-to-predicted ratio of 0.854.
- The in-repo frozen fixture `tests/frozen-jacobian-stop.json` (SHA256
  `6f73a2d14bd53885691cc70f8712219fc32d572a2d5b957c02412f60fd918aa7`)
  reproduces the refusal: all 9 attempts `out_of_domain`, with `phase_toe[5]` at
  −19.783354649571557. The third fit's `phase-cap-witness.json` recorded the
  same crossing.

Hashes (SHA256):

- interval-fit `fit.log` `c4d6afbe19bab677006faeb57de58ab95d7f6abefd09e536cc7848d77f63ae4a`
- interval-fit `first-step-replay.json` `0dbc376317744a589ea0c2d41471838cde1f24ee9e9da2d83967db5d06c772d2`
- interval-fit `domain-witness.json` `101690a6e5df780cd0aa04c86734cc98f05ffc8a487db1f4f5b8277567710a98`
- `domain-probe.json` `f58ac1ae74290b43a58d488605fda0aeeca2f1ead0e05b8491b3e4c8108b52bc`
- `fixture-probe.json` `ac831ff8303d292a4e196fd51b53b3819780532ea885be8e32d64d5ea9cadd1b`

### Rule 20 inventory

Base: origin/main `98d79aa`, which merges PR 179. Stdlib Python only. Current
owners:

- Trust bound and solver: `numerics.TRUST_LIMIT`, `numerics.bounded_least_squares`,
  the adapter `numerics.bounded_step`.
- Coordinate domains: `fitting.PoseChart` (value coordinates, open-interval
  charts, no cap) and `fitting.TimingChart` (the ±20 refusal in `layout`).
- The existing no-op projection hook `project` on both charts
  (`fitting.py:163`, `fitting.py:261`), called by `trial_step` (`fitting.py:489`).
- Step admission: `fitting.admit_step` (`fitting.py:512-530`) is the only
  production caller of the solver.

Tests touching these: `tests/test_fitting_numerics.py`, which also patches
`fitting.bounded_least_squares` with mocks and uses a stub space with `project`.

### Correct Fix Must Touch

- **The solver accepts per-coordinate step bounds.** `bounded_least_squares`
  gains keyword-only `lower` and `upper`: step bounds in coordinate units.
  - Both omitted means today's symmetric `±limit`, bit-for-bit.
  - Admission refuses: only one of the pair given; wrong length; nonfinite or
    bool entries; `lower_i > 0` or `upper_i < 0` (a zero step must stay
    feasible); any bound beyond `±limit`.
  - The active set uses the asymmetric bounds. A zero-width side (a coordinate
    exactly at its wall) is allowed and becomes active.
  - Convergence still requires the KKT certificate. The returned step must lie
    within `[lower, upper]` up to the existing bound tolerance. That tolerance,
    today the literal `1e-12*limit` at `numerics.py:143`, becomes one named
    constant, `BOUND_TOLERANCE`.
  - `bounded_step` passes the new keywords through.
- **The chart owns its domain and states it.**
  - A named `TIMING_COORDINATE_LIMIT = 20.` replaces the literal at
    `fitting.py:235`, with its reason in a comment. `layout` keeps refusing
    `abs(v) > TIMING_COORDINATE_LIMIT`, so seeds, resumes and any other caller
    still fail closed.
  - New `step_bounds(x)` on both charts returns `(lower, upper)`:
    - value coordinates `±TRUST_LIMIT`;
    - timing coordinates the trust bound clipped by the distance to the wall.

    For every coordinate and both bounds, `x_i + bound` must lie inside the
    domain in floating point. A bound that would round outside steps one ulp
    inward.
  - `TimingChart.project` clamps a timing coordinate that exceeds the limit by
    at most `BOUND_TOLERANCE*TRUST_LIMIT` to exactly the limit. This absorbs only
    the solver's own tolerance. A larger excess is returned unchanged, and
    `layout` refuses it as today. `PoseChart.project` stays the identity.
- **Step admission uses the chart's bounds.** `admit_step` calls
  `space.step_bounds(x)` once per iteration and passes the bounds to every
  solve. `trial_step`, the verdicts, damping and the ratio rules are unchanged.
- **Tests, README and this contract's proof sections.**
  - The stub space and solver mocks in `test_fitting_numerics.py` gain
    `step_bounds` and the new keywords.
  - The README's fitting paragraph states that the solver honors the timing
    domain.

### Rejected alternatives

- **Removing the cap.** `exp` overflows past about 709.78 and raises
  `OverflowError`, which `Objective.score` does not catch (it catches
  `ValueError` and `ZeroDivisionError`), so the fit would crash. Before that,
  two weights near `exp(709)` sum toward infinity and `PhaseLayout` refuses the
  resulting NaN layout, which is the same whole-step refusal at a different
  wall. Past 20 the key also cannot move measurably: at the seed, going from
  −19.99946 to −20 moves it 5.1e-13 frames.
- **Raising the cap.** It keeps the defect and only delays it.
- **Clipping the solved step into the domain.** A clipped step does not solve
  the bounded problem, so its prediction and ratio are wrong. The README
  records that the clipping path was already replaced at its owner.
- **Freezing a coordinate at the wall by dropping its column.** That is a
  heuristic outside the solver, and it never releases the coordinate when the
  gradient turns back inward. An active bound in the existing active set is the
  exact form, and it releases on its own.
- **Re-charting timing as box-bounded fractions.** That would make the minimum
  spacing reachable exactly, but it changes the coordinate system, the resume
  signature and every frozen fixture. The current chart already represents the
  boundary to under 1e-9 frames, so the cost has no demonstrated benefit.

### Must Not Change

- `TIMING_COORDINATE_LIMIT` stays 20 and `TRUST_LIMIT` stays 0.5. The quarter-frame
  minimum key spacing, anchors, both charts' encodings and the resume
  signature are unchanged. Third-fit and fourth-fit checkpoints stay resumable.
- The solver's default path is bit-identical when no bounds are passed.
- The objective, its weights, the validator and every gait rule and limit.
- `trial_step`'s verdicts, `next_damping`, damping constants, attempt budget,
  ratio thresholds and descent floor.
- The Jacobian owners and finite-difference probes.
- The value fixtures; no frozen-fixture file is edited.
- No fit run, no saved animation, no scene writes, and no edits to sealed
  evidence.
- No other branch, worktree or PR. No dependency.

### Restriction and mechanism

- **The ±20 timing domain.** Need: overflow (an uncaught `OverflowError` past
  about 709.78) and conditioning. At −20 the key is within 1e-9 frames of its
  minimum spacing, and its column norm is about 6e-10 of the median. **Kept**, as
  a domain the solver honors.
- **Refusing the whole step when one coordinate crosses.** No need: one
  coordinate's wall discards all 97 others' progress. **Corrected.**
- **Projection tolerance.** Need: solver rounding only. It is bounded by the
  same named tolerance the solver uses, so it cannot become a clipping path.
  **Kept.**
- **Trust bound 0.5.** The existing numerical trust region. **Kept.**
- **Quarter-frame minimum key spacing.** It is binding now: `phase_toe[5]` sits
  at it. Some positive minimum is needed, because a zero-width key interval is
  degenerate. The quarter-frame value came from the old quarter-frame
  observation grid. Under PR 179's 1/8-frame track, whether a quarter frame is
  still needed could not be determined. This contract does not change it,
  because changing it alters the chart and the resume signature. Verification 6
  records how many keys sit at the minimum after the fix. That is the trigger for a
  separate spacing decision.
- **Mechanism.** Domain bounds go into the existing active-set solver as
  constraints: invalid steps are unrepresentable rather than refused after the
  fact. That is the strongest mechanism the owner already supports. It adds no
  framework or dependency.

## Assumptions / blockers

- **Descent is expected; a passing walk is not.** In the held-coordinate probe,
  the score fell 81% in one step, but whole-cycle violations rose from 1224 to
  1440, for example `angular_velocity_jump` 1062 to 1188 and `point_stall` 27 to
  54. A score is not acceptance, and this slice predicts no passing walk.
- **Other coordinates will reach walls.** `phase_toe[2]` is at −19.20 at the
  seed. The fix is general and is not specific to `phase_toe[5]`.
- **Some mocked tests assert the solver call shape.** They are updated to the
  new keywords, and none is weakened.

## Verification plan

1. **Before-code receipts (done).** The fourth fit, the first-step replay, the
   domain witness, the domain probe and the fixture probe, hashed above.
2. **Fail first.** A regression at `frozen-jacobian-stop.json`: iteration 0
   admits a step, `phase_toe[5]` stays within `[-20, 20]` and the score
   decreases. On base `98d79aa` it fails, with all 9 attempts `out_of_domain`.
3. **Solver boundary probes, both sides.**
   - Known solutions with the lower bound active, the upper bound active, a
     zero-width side, and release from an asymmetric bound.
   - Explicit `±limit` bounds give a result bit-identical to the default.
   - Every existing solver test passes unchanged.
   - Refusals: only one bound given, wrong length, NaN, inf, bool, `lower > 0`,
     `upper < 0`, beyond `±limit`, and an empty list. The code uses
     `is None`, never `or`, so falsy input defeats no default.
4. **Chart boundary probes.**
   - `step_bounds` for an interior coordinate, a coordinate 0.2166 from the wall,
     one exactly at `−20`, one exactly at `+20`, and value coordinates.
   - Floating-point property: for many `x` near both walls, `x + bound` stays in
     the domain.
   - `project`: an excess at the tolerance clamps; an excess just above it is
     returned unchanged and refused by `layout`; both signs.
5. **Mutation.** One mutant per clause must be caught: default path, each
   admission check, the asymmetric hit test on each side, the zero-width side,
   the release step, the bound-tolerance convergence check, `step_bounds`
   clipping on each side, the ulp-inward step, the `project` tolerance on each
   side, and `admit_step` passing the bounds.
6. **Parity and baselines.**
   - Objective and validation primal results at the frozen points are
     unchanged.
   - The full pure walk suite passes.
   - At the frozen point, record how many timing coordinates are bound-active
     and how many keys sit at the quarter-frame minimum after the first step.
7. **Wrap-up checks.**
   - Cold-audit the diff.
   - Evidence goes outside the worktree, with directories mode 700 and files
     mode 600, pinned by SHA256 in the PR.
   - No fit runs until Juan separately authorizes one.

## Contract Amendments

None yet.
