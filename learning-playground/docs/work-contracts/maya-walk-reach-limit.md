# Maya walk: the step solver honors the leg's reach limit

## Before Code

### Authority and scope

On 2026-11-22 Juan read the diagnosis of the carried fit's stall and answered
"Write the contract" to "Write the contract for making the solver honor the
reach limit?" That authorizes this contract only. Implementation starts after
Juan explicitly accepts it. It does not authorize a fit, an animation
promotion, saved-scene writes, a merge or walk acceptance.

This contract changes how the fitter's step solve treats the search reach
guard, removes a residual that can never be nonzero, and simplifies the carry
that PR 182 added. It changes no validator rule, acceptance limit, scored
objective term, anchor, hold, extremum, chart, key phase rule or the motion
floor.

### Root Cause

**1. The reach limit is a refusal the step solver cannot see.**

- **The guard.** For every scheduled sample on the near side,
  `Objective.residuals` measures the hip-to-target distance and raises
  `ValueError('Search proposals must remain strictly reachable')` when it
  exceeds `THIGH_LENGTH+SHIN_LENGTH-1e-5` (`fitting.py:447-449`).
  `Objective.score` turns that into no residuals (`fitting.py:523-526`), and
  `trial_step` refuses the whole step `out_of_domain` (`fitting.py:633-634`).
- **The solver knows only a box.** `bounded_least_squares` takes per-coordinate
  lower and upper bounds (`numerics.py:110-210`). The charts give it their
  domains through `step_bounds`, but nothing describes reach, which depends on
  many coordinates at once.
- **Damping is the only response.** A refusal raises damping fivefold
  (`fitting.py:595-604`). Shorter steps eventually stay inside, so the fit
  crawls along the wall instead of moving along it.
- **This is the third wall of this class.** PR 181 fixed the timing cap and
  PR 182 the flat segment and pose domain, each by making the solver honor a
  limit it was only being refused by.

**2. The reach hinge can never be nonzero.**
`fitting.py:450` appends `max(0, reach-(THIGH_LENGTH+SHIN_LENGTH-1e-5))/.0001`.
Line 448 has already raised for any reach above that same threshold, so the
hinge is 0 at every point that scores. It gives the solver no gradient. Its
only effect is at a reach exactly on the threshold, where the forward-mode
`maximum` sees an exact tie and reports every direction `nonsmooth`.

**3. The carry starts the fit on the wall.**
`carry_start` lowers the hips by the smallest drop that scores, then steps the
drop up from one ulp until the derivatives resolve (`fitting.py:689-738`). The
step-off exists only because of the dead hinge's tie. The start it returns
has a leg at full reach.

**Evidence: the carried fit.** Evidence alias `carry-fit-20261122T184557Z`.
The fit ran at merged main `3d58321` with the fourth fit's flags and the
`--carry` start.

- It stopped `derivatives_unresolved` at zero-based iteration 26, score
  26734.496978721134, validation FAIL with 1593 violations (fourth fit 1224).
- **Stop.** `stop-witness.json` replays the final point with duals: one
  residual, index 1188, is uncertain in 59 coordinates at value exactly 0.0.
  `tie-line.json` names `fitting.py:450` with both arguments 0.0.
- **Stall.** `replay/stall-replay.py` reproduces the run exactly. All 55
  refused trials raised `Search proposals must remain strictly reachable @
  fitting.py:449`, and no other refusal occurred. Iterations 0 to 25 each
  admitted a step, after zero to three reach refusals. Damping rose from 0.05 to
  1.11e10, and from iteration 10 the score changed only in the second decimal.
- **Where the score lives.** `replay/stall-anatomy.json`: at the carried start,
  joint-speed jumps (`fitting.py:487`) are 0.729 of the score; frame 22.5 sits
  2.2e-16 from the guard. `replay/jump-sites.json`: 22970.8 of the start's
  34771.3 comes from frame 22, knee 16719.1, ankle 3714.5, hip 2534.1.
- **Why there.** Under the motion floor the swing foot lowers earlier; at
  frame 22.25 it is 0.00489 lower than in the fourth fit while the hip is
  0.00088 lower (`carried-fit.html`). The carry's smallest drop leaves the
  knee bent 0.83° and 0.59° at frames 22.25 and 22.5, against 7.96° and 7.27°
  in the fourth fit (`replay/drop-sweep.json`). Near full extension the knee
  angle swings fast, so the joint speeds jump.
- **Room exists inside the wall.** `replay/drop-sweep.json`: lowering the hips
  0.0001 more than the carry did takes the start from 34771.3 to 14190.2, and
  0.001 more to 5506.7. The solver would find that direction if every step
  were not refused for crossing the wall.

Hashes (SHA256):

- carried fit `fit.json` `2483cf37f58df96ff823d5425ace0e30f40f0202a982c479fac605abfcb733b7`
- `stop-witness.json` `173030d057c1b7dae9e7a37a04a67b35767896680bdd4689b2f74ba2a22874e6`
- `tie-line.json` `fe0246f48ab812d7582182190bd07a7db49102fcd4ea72aac8c07dcb16265e3f`
- `replay/stall-log.json` `0ead696acbd17a97034f109159c6bbe076d7bceb38a2878c71f604d3118964cf`
- `replay/stall-anatomy.json` `ce1292482eb9c9908f39e970f91067bb523a7fc5388306c79264aa847e48287d`
- `replay/jump-sites.json` `f1c9608b46b026e4c35f8f4de0126ae4ef8caccc262e34606e155b49fbfb3b87`
- `replay/drop-sweep.json` `3844a38d71a1026feed46f30aa5f9e7ac25484f826abaa621f8c1adf70a077bd`
- `replay/diagnosis.md` `27db5b27e08e7bc2b1f5ffcea972396b4309e5c1c778a32912f825b4e5d5e7bf`
- `carried-fit.html` `4b54abc1a3f972010a727a056601dc09b30c6c6322b675f5de894748c51b2bd3`

### Rule 20 inventory

Base: origin/main `3d58321`, which merges PR 182. Stdlib Python only. Current
owners:

- Reach guard and hinge: `Objective.residuals` (`fitting.py:447-450`). No other
  fitter code reads the search reach threshold. The validator's own reach rule
  (`validate.py:244`) and the IK clamp (`kinematics.py:54`) are separate and
  unchanged.
- Step solve: `bounded_least_squares` (`numerics.py:110-210`), called once per
  attempt by `admit_step` (`fitting.py:649-668`).
- Step admission: `trial_step` (`fitting.py:617-646`), the verdicts
  (`fitting.py:550-556`) and `next_damping` (`fitting.py:595-604`).
- Derivatives: `analytic_jacobian` (`numerics.py:313`), forward mode only.
- Carry: `carry_start` (`fitting.py:689-738`).

Tests touching these: `test_fitting_numerics.py`, `test_motion_floor.py`
(`_HipReach` and the carry tests), `test_motion_floor_regression.py`,
`test_interval_motion.py` and `test_differential.py`.

### Correct Fix Must Touch

- **One owner for reach margins.** A new `Objective.reach_margins(x)` returns,
  for every scheduled near-side sample, `REACH_LIMIT - reach`, where the named
  `REACH_LIMIT = THIGH_LENGTH+SHIN_LENGTH-1e-5` replaces the two literals. It
  works on plain floats and on duals. `residuals` reads its margins from the
  same computation and keeps refusing any negative margin, so every caller
  still fails closed. The guard's threshold does not move.
- **The dead hinge is removed.** `fitting.py:450` goes. Each scoring point's
  score is unchanged, because the hinge was 0 at all of them. The residual
  vector is shorter by one entry per scheduled sample. The exact tie it
  produced can no longer occur.
- **The step solve honors linearized reach.**
  - Each iteration differentiates `reach_margins` at the current point with
    `analytic_jacobian`, the same forward-mode owner the residuals use. An
    unresolved margin derivative ends the fit `derivatives_unresolved`, as an
    unresolved residual derivative does today.
  - Every attempt requires its step `d` to satisfy, for every sample `k`,
    `m_k + G_k·d >= REACH_BACKOFF`, where `m_k` is the margin and `G_k` the
    gradient of the margin. As a solver row that is
    `-G_k·d <= m_k - REACH_BACKOFF`. In words, the linearized margin after the
    step is at least `REACH_BACKOFF`. A test pins the sign: at `m_k = 0` the
    row admits a step that grows the margin and refuses one that shrinks it.
  - `REACH_BACKOFF = 1e-6` is a named numerical constant, one tenth of the
    existing guard gap below full extension. It leaves room for the margin's
    curvature, which the linear rows cannot see. A margin already below it
    (the carried start) must grow by the deficit, which moves the leg away
    from the wall.
- **One bounded solver for box and reach rows.**
  - `numerics.py` gains a least-squares solve with general linear inequality
    rows, in stdlib: Lawson and Hanson's LSI reduction to least distance
    programming, solved by their nonnegative least squares. The box bounds go
    in as rows too, so one solve honors both.
  - The attempt first runs today's `bounded_least_squares`. If its converged
    step already satisfies every reach row, that step is the answer: it is
    also the optimum of the constrained problem. Only otherwise does the
    constrained solve run. Steps that never touch the reach rows are therefore
    bit-identical to today's.
  - The constrained solve returns the same `StepResult`, with a certificate
    that checks feasibility of every row within `BOUND_TOLERANCE*TRUST_LIMIT`,
    stationarity, nonnegative multipliers and complementarity, independently
    of the reduction it solved.
  - **Amended after implementation began.** The LDP meets each row only to
    absolute rounding in scaled coordinates, and a near-zero Jacobian column
    turns that into a large miss in real units. At the carried fit's stop,
    `('toe', 1)` has column norm 8e-15, and a 2e-12 scaled miss became 284.
    So, as `bounded_least_squares` does, a coordinate whose bound is active
    or passed is placed exactly on it before the certificate runs. A
    coordinate on a bound may keep a reduced gradient pointing out of the box.
    Complementarity is checked in real units: a row with a positive
    multiplier must hold with equality within the same slack. A product of
    multiplier and gap would grow with the multiplier and fail on rounding.
  - **Amended.** The fit record gains, per attempt, whether the constrained
    solve ran, and the margin derivatives' receipts, so a stop on an
    unresolved margin derivative says why.
  - When no step satisfies the rows inside the box, it returns a new closed
    status `infeasible`. `admit_step` records that as the existing `unsolved`
    verdict. Infeasibility does not depend on damping, so a fit that meets it
    ends `linear_solve_failed`, with the status in its receipts.
- **Admission is unchanged.** `trial_step` still scores the full step once and
  refuses it `out_of_domain` if the real reach guard raises. Linear rows
  cannot see curvature, so a refusal stays possible. Each one now means the
  step was too long for the linearization, and the existing damping rule
  shortens it.
- **The carry keeps the smallest drop and loses the step-off.** With no hinge
  there is no tie at the wall, so `carry_start` returns the bisection's
  smallest scoring drop. It still requires resolved derivatives and refuses
  without them. The step-off loop and its docstring paragraph go. The first
  step then opens the backoff at the wall samples.
- **Tests, a fixture, README and this contract's proof sections.**
  - A new frozen fixture holds the carried fit's final coordinates (values,
    parameter inventory and source signature only, no paths). No existing
    fixture is edited.
  - `_HipReach` models the real guard (refusal past the limit, no hinge).
  - The README's fitting paragraph states that the solver honors reach.

### Rejected alternatives

- **Making unreachable poses unrepresentable in the chart.** Reach couples the
  hip curve with both feet's IK targets at every sample. A chart that decodes
  only reachable walks would have to solve that coupling inside the decoder.
  No such owner exists; building one is a new framework.
- **Activating the hinge inside the wall (a penalty band).** Soft: a step can
  still cross the wall, and it changes the score earlier fits were measured by.
- **Shortening a refused step to the wall.** The step lands on the wall, and
  `trial_step` deliberately has no shortened retry. It would also hide the
  linearization error the damping rule exists to correct.
- **A bigger carry drop.** It treats only the start. The fit is pushed back to
  the wall by the same frame-22 jumps, and the solver is still blind to it.
- **Always using the constrained solve.** Correct too, but it changes every
  step's rounding and removes the parity proof that nothing else changed.
- **Constraining only samples near the wall.** A selection threshold is a
  second number with no need. Rows that are slack cost little and change
  nothing.

### Must Not Change

- The validator, every gait rule, reference band, acceptance limit and the
  shared admission.
- The scored objective terms and weights. Removing the hinge changes no score.
- The search reach threshold `THIGH_LENGTH+SHIN_LENGTH-1e-5` and its refusal.
- Both charts, the motion floor, the pose and timing domains, anchors, holds,
  turning points, `PHASES`, `ACTIVE`, spacing, the key cap and PCHIP.
- `bounded_least_squares` itself, `TRUST_LIMIT`, `BOUND_TOLERANCE`, the
  verdicts, `next_damping`, the damping constants and the attempt budget.
- The carry's checks, its bisection and its recorded fields.
- Existing frozen fixtures, sealed evidence and the backup branch.
- No fit run, no saved animation, no scene writes. No dependency.

### Concurrency model

None. The fitter is one process and one thread. The new solve is pure and
called synchronously inside an attempt. No shared state, files or caches are
added.

### Restriction and mechanism

- **Linearized reach rows with `REACH_BACKOFF = 1e-6`.**
  - Excludes steps whose linearized margin ends below 1e-6 anywhere. It does
    not refuse a point inside that band, and the guard is unchanged.
  - Need: with no backoff, a step that keeps a leg exactly on the wall
    linearly still crosses it through curvature. Every shortened retry
    crosses again, so the fit could refuse forever. Any positive backoff ends
    that, because curvature shrinks with the square of the step.
  - Lighter does not meet the need: zero backoff is the forever-refusal case.
    A larger value would keep the leg further from full reach than numerics
    need. One tenth of the existing 1e-5 guard gap is far below anything the
    validator or the eye can see.
  - **Kept**, pending Juan's acceptance.
- **The new `infeasible` status ends the fit.** Need: no step inside the trust
  box can restore the backoff, and raising damping cannot change that. Fails
  closed and records why. **Kept.**
- **Whole-step refusal when one sample crosses through curvature.** Need: the
  guard keeps every scored point strictly reachable, which the IK and the
  validator rely on. **Kept**, now rare instead of the normal path.
- **The carry's ulp step-off.** No need once the hinge is gone. **Removed.**
- **Mechanism.** The reach limit becomes a structured constraint of the step
  solve: linearized rows in a least-squares solve with linear inequalities.
  That is the strongest tier this owner supports, since reach cannot be made
  unrepresentable in the chart (above). The guard stays as the admission
  check. No new dependency or framework.

## Assumptions / blockers

- **The fit is not predicted to pass.** This removes the wall that stalled the
  carried fit. Whether the frame-22 jumps then fall, and how far, needs a fit,
  which Juan authorizes separately.
- **Other walls may follow.** The quarter-frame spacing and the envelope spans
  (issue 183) remain.
- **Curvature refusals remain possible.** The diagnosis shows the margin is
  smooth (a distance well away from zero), so they should be occasional, but
  this contract does not promise none.
- **The fixture adds the carried fit's coordinates** (98 numbers) to the repo.
  Numbers only, no path, name or private data.
- **Amended.** At very high damping the constrained solve cannot certify its
  step to the existing tolerance. At the carried fit's stop it certifies up to
  damping 1e8 and returns `numerical_failure` from 1e9. The fit treats that as
  `unsolved`, as it does any uncertified solve; it fails closed.

## Verification plan

1. **Before-code receipts (done).** The carried fit and diagnosis evidence,
   hashed above.
2. **Fail first, at the new frozen fixture (the carried fit's stop).**
   - On base `3d58321`, `analytic_jacobian` at that point is unresolved
     (`nonsmooth`, from the hinge tie).
   - After: the residual and margin derivatives resolve, and `admit_step`
     admits a step whose every sample keeps a positive margin.
3. **Parity.**
   - At the fourth fit's frozen point and the frozen outer-step point
     (`frozen-outer-step.json`), where no reach row binds, every attempt's
     step is bit-identical to base. **Amended:** the authored start cannot be
     used. The reach guard refuses it under both charts on base `3d58321`
     too, so it has no step to compare.
   - Removing the hinge changes no score at the frozen points and in the
     suite's objective tests.
4. **Constrained solve, both sides.**
   - Known small problems with hand-checked answers: an active row, a slack
     row, a row and a box bound both active, duplicate rows, and an
     infeasible set.
   - Certificate probes: a step just outside a row's tolerance and just
     inside it; a negative multiplier; broken complementarity.
   - The constrained optimum equals the box-only optimum when every row is
     slack.
5. **Reach rows.**
   - `reach_margins` matches the guard's distance at every sample, on floats
     and on duals.
   - A start with margin below the backoff forces a step that grows it.
   - An `infeasible` solve becomes `unsolved` and ends the fit
     `linear_solve_failed`.
6. **Carry.** The returned drop is the bisection's smallest scoring drop,
   derivatives resolve there, and every existing carry refusal still refuses.
7. **Mutation.** One mutant per clause must be caught, with every survivor
   explained: the backoff at 0; each row sign; the box rows dropped from the
   constrained solve; the box-only shortcut accepted without checking rows;
   each certificate clause; the infeasible mapping; the guard threshold; the
   margin owner bypassed; the carry's derivative check.
8. **Suite and evidence.**
   - The full pure walk suite passes. Cold-audit the diff.
   - A read-only replay of the carried fit's first iterations under the new
     solve counts reach refusals against the 55 above. Evidence only; it is
     not a fit and writes no checkpoint.
   - Evidence goes outside the worktree, with directories mode 700 and files
     mode 600, pinned by SHA256 in the PR.
   - No fit runs until Juan separately authorizes one.

## Implementation summary

Juan accepted the contract on 2026-11-24. It was amended in `0c05d0f`, before
any code was committed, and implemented in `9efd961`.

- **`reach_margin` owns the search reach measurement.** `REACH_LIMIT` names the
  unchanged threshold. The guard refuses a negative margin, the same set the
  old `reach > threshold` refused. `Objective.reach_margins` returns the
  margin at every scheduled near sample.
- **The dead hinge residual is gone.** It was 0 at every scoring point, so no
  score changed.
- **Each iteration linearizes the margins** with `analytic_jacobian` and builds
  the rows `G_k·d >= REACH_BACKOFF - m_k`. An unresolved margin derivative ends
  the fit `derivatives_unresolved`, with its receipts recorded.
- **`constrained_least_squares`** solves the box and the rows together (LSI,
  LDP, NNLS). It runs only when the box-only step misses a row. It certifies a
  converged step (KKT) or an infeasible set (Farkas); anything else is
  `numerical_failure`.
- **An infeasible solve is `unsolved`.** It ends the attempts, and the fit then
  ends `linear_solve_failed`.
- **The carry returns the bisection's smallest drop** and refuses it if its
  derivatives do not resolve. The step-off is gone.
- **No change** to the validator, gait rules, scored terms, guard threshold,
  charts, `bounded_least_squares`, verdicts, damping or the attempt budget.

## Cold Diff Audit

Diff `3d58321..9efd961`, read cold. Evidence alias
`reach-limit-20261124T205906Z`.

### Gaps

- **No fit was run, and no passing walk is predicted.** A read-only replay of
  the carried fit's first 26 iterations shows the solver no longer stalls on
  the wall (below). Whether a fit reaches PASS needs a fit Juan authorizes.
- **The "55 refused trials" in Root Cause counted the carry's probes.** The
  carried fit's 55 reach refusals were 28 carry bisection probes and 27 step
  attempts. Iterations 0 to 25 each admitted a step after zero to three
  refused attempts, as stated.
- **Curvature still refuses some steps.** At the carried start, the first
  constrained step was refused `out_of_domain`; the next attempt was admitted.
- **Very high damping fails closed** (Assumptions): `numerical_failure` from
  1e9 at the carried stop.
- **The replay crawls along the backoff.** From iteration 11 the score falls
  about 25 to 37 per iteration at a fixed damping of 0.122. That is the
  objective's own landscape near the wall, not a refusal.
- **Two equivalent mutants survive**, explained under Verification.
- **`bounded_least_squares` keeps its own input checks.** The new solve
  repeats them, because this contract froze `bounded_least_squares`.
- **PR size.** Code and tests are about 860 added lines. The fixture adds 497
  lines of numbers, and the contract with this audit about 380.

### Change By Change Reconstruction

- **`fitting.py:419-428`.** `REACH_LIMIT`, `REACH_BACKOFF = 1e-6` and
  `reach_margin(points, target)`.
- **`fitting.py:459-461`.** The guard calls `reach_margin` and refuses below 0.
  The hinge `out.append` is removed.
- **`fitting.py:533-536`.** `Objective.reach_margins(x)`.
- **`fitting.py:664-679`.** `reach_linearization` (margins and their
  `analytic_jacobian`) and `reach_rows`.
- **`fitting.py:682-711`.** `admit_step` takes `rows`. It runs
  `bounded_least_squares` first and calls `constrained_least_squares` only
  when that step is not converged or misses a row (`rows_hold`). Each solve
  record says whether the constrained solve ran. An infeasible solve ends the
  attempts.
- **`fitting.py:738-778`.** The `carry_start` docstring is updated. It returns
  `start(high)` after the derivative check; the step-off loop is gone.
- **`fitting.py:817-848`.** `fit` linearizes the reach rows after the residual
  derivatives resolve and passes them on. It records `constrained` per
  attempt and `reach_differences`, and the method label is
  `scaled-qr-active-set-v1+reach-lsi-v1`. A comment explains why
  all-unsolved already covers infeasibility.
- **`numerics.py:6-7`.** The Lawson and Hanson reference.
- **`numerics.py:28-29, 55-56`.** `SolveStatus.INFEASIBLE`, and an infeasible
  result carries no step.
- **`numerics.py:219-255`.** `_rows` (validation), `row_shortfall` (distance
  along the unit normal) and `rows_hold` (within `BOUND_TOLERANCE*limit`), the
  one feasibility test.
- **`numerics.py:258-317`.** `_transposed_solve` and `_nnls`.
- **`numerics.py:320-364`.** `_certificate` (bound-aware stationarity, signs,
  complementarity in real units) and `_farkas`.
- **`numerics.py:367-487`.** `constrained_least_squares`.
  - Validation and scaling are as in `bounded_least_squares`.
  - Zero rows: infeasible if the bound is positive, dropped otherwise.
  - Box and unit-normalized rows in scaled coordinates. QR of the damped
    system, the LDP transform, then NNLS.
  - Multipliers, the step, then exact bound placement.
  - The certificate, then the Farkas check, else `numerical_failure`.
- **Tests.**
  - `test_reach_limit.py` (new).
  - `_HipReach` now models the real guard, and three carry tests were added
    (`test_motion_floor.py`).
  - The regression test passes the reach rows.
  - The synthetic objectives return no margins.
  - Fixture `frozen-reach-stop.json`.
- **README.** One paragraph on the reach rows.

### Contract Traceability

- **One owner for margins:** `reach_margin`, used by the guard and by
  `reach_margins`. Tests: `test_margins_match_the_guard_distance_on_floats_and_duals`
  and `test_the_guard_refuses_through_the_margin_owner`.
- **The dead hinge is removed:**
  `test_the_hinge_rows_were_zero_so_removing_them_leaves_the_solve_bit_identical`;
  scores at the frozen points equal base.
- **The step solve honors linearized reach:**
  - `test_derivatives_resolve_and_a_step_keeping_every_leg_reachable_is_admitted`;
  - `test_a_start_below_the_backoff_forces_a_step_that_grows_its_wall_margins`;
  - the sign test.
- **One bounded solver for box and rows:** `ConstrainedSolveTests` and
  `CertificateTests`.
- **Box-only shortcut and parity:**
  `test_no_attempt_runs_the_constrained_solve_and_steps_match_the_box_only_path`,
  and `parity-*.json` against base.
- **Infeasible ends the fit:** `test_an_infeasible_solve_is_unsolved_and_ends_the_fit`.
- **Admission is unchanged:** `trial_step` is untouched, and the curvature
  refusal is seen at the carried start.
- **Carry:**
  - `test_the_smallest_reaching_drop_is_found_from_both_sides`;
  - `test_the_returned_start_is_the_smallest_drop_the_search_scored`;
  - `test_the_carry_refuses_a_start_whose_derivatives_do_not_resolve`.
- **Must Not Change:** the diff touches no validator, chart, objective term,
  damping, verdict or `bounded_least_squares` line.

### Verification

- **Fail first** (`fail-first-base.json`, `fail-first-after.json`).
  - On base, 59 of 98 directions are unresolved (nonsmooth) at the frozen
    stop, and no step is allowed.
  - After, all 98 are analytic. The first attempt is admitted, and the score
    goes from 26734.496978721134 to 23555.39173664729. The smallest margin
    after the step is 5.6e-7.
- **Parity** (`parity-base.json`, `parity-after.json`). At the fourth fit's
  stop and the frozen outer step, at damping 0.05 and 1e-7, base and after
  match in every attempt's step, receipt, solve record, update and next
  damping.
- **Replay** (`replay.json`, read-only, 26 iterations from the carried start),
  against the carried fit:
  - step attempts refused by reach: 1, against 27;
  - damping: between 0.0078 and 0.244, against a rise to 1.11e10;
  - score: 34771.3 to 19039.7, against 26734.5.
- **Mutation.**
  - **First run:** 20 of 27 caught. Tests were then added for:
    - the sign and complementarity clauses inside the solve;
    - the lower bound;
    - the guard's zero boundary;
    - the carry's smallest drop.
    A redundant `fit` clause was removed.
  - **Second run:** 24 of 26 caught. Both survivors are equivalent:
    - Box feasibility ignored: exact placement makes that check unable to
      fail.
    - A one-ulp carry step-off: it gives the identical 98 coordinates at the
      real carried start.
  - **Third run:** a 1e-9 step-off is caught.
- **Suite:** `python3 -B -m unittest discover -s storybook/animation/maya_walk/tests -p 'test_*.py'`
  ran 216 tests, OK.

### Gap audit

- **DONE:**
  - every Correct Fix Must Touch item;
  - verification items 1 to 8;
  - the amendments.
- **NOT DONE:**
  - A fit. It needs Juan's separate authorization.
  - Issue 183, the envelope spans. Left open, out of scope.
