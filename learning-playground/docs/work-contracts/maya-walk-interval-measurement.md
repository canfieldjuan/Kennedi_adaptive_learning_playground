# Maya walk: measure joint motion between samples

## Before Code

### Authority and scope

Juan directed "Draft the contract" on 2026-11-12, after the sampling
blind-spot diagnosis. That authorizes this contract only. Implementation starts
after Juan explicitly accepts it. It does not authorize a fit, an animation
promotion, saved-scene writes, a merge or walk acceptance.

This contract amends two measurement rows of the accepted gait-source contract
(`maya-walk-gait-source.md`, table "Stall / reversal" and "Velocity
continuity"). It changes *where* motion is measured, not the limits:

- Velocity continuity: "adjacent angular-velocity change 2 degrees/frame per
  quarter-frame step" becomes the same 2 degrees/frame per quarter frame
  (an acceleration of 8 degrees/frame²), measured across every interval of a
  uniform fine track instead of only between quarter-frame observations.
- Reversal: hip/knee (and swing ankle/toe after toe-off) must progress in +X
  with the same .0005 units/frame backward tolerance, measured on the same fine
  track.

### Root Cause

Both the whole-cycle validator and the fitter's objective measure joint and point
motion only at their observation times. The observation times are quarter frames
plus exact events (`sample_scene.py:49-62`). Angular velocity is a pointwise
±1/128-frame central difference at each observation
(`kinematics.py` `samples()`, `sample_scene.py:177-183`). The jump rule compares
two such values (`validate.py` `angular_velocity_jump` loop). The direction rule
uses the secant between adjacent observations (`point_backward`). The objective
repeats both measurements: `fitting.py:326` for angular change and
`fitting.py:336-339` for the secant direction. Neither can see motion that starts
and finishes between two observations.

The minimum key spacing is one quarter frame (`fitting.py` `TimingChart`,
spacing `.25/24` in phase). That equals the observation spacing, so the
optimizer can compress a key gap to exactly one observation interval. Near full
leg extension, two-link IK amplifies small foot motion into large knee motion.
The fit exploits both.

Evidence, from the third fit's recorded values. Input `fit.json` SHA256
`1e5d55c195782e2faba5eb3ea8bbe08f61616d63921c5c6d8ce1fb415edb67c1`, the same
frozen input as the Jacobian repair. Primal evaluation is bit-identical on
current main.

- The rebuilt score equals the recorded 425.90824737935696. The angular-change
  term is 70.9% of it.
- The `foot_z` timing keys sit at the minimum spacing, frames 23.5–23.75.
- Whole-frame near knee, frames 18–25: 59.11, 52.02, 38.87, 25.44, 16.1,
  10.35, 5.08, 9.99. That is a one-frame pop at heel strike.
- Interval 23.75–24, sampled jump versus dense maximum (32 substeps per quarter
  frame): knee 2.049 vs 159.025, ankle 0.822 vs 97.630, hip 0.834 vs 71.062.
  The validator recorded 2.049 for the same interval, so the probe reproduces it.
- Across the cycle, 36 distinct quarter-frame intervals (78 joint pairs) hide
  over-limit acceleration at 2.0× to 118.8× the sampled value.
- Direction: the knee's minimum forward velocity is +0.00406 units/frame at the
  validator's observations and −0.01659 at 1/128 frame. The limit is −0.0005,
  so the observations hide a reversal.
- No ground penetration hides between samples on this fit: the lowest heel, ball
  and toe height is 0.0 both ways.

Evidence alias `sampling-blind-spot-2026-11-10` (SHA256):

- score-breakdown.txt `5692e5e82c013e039583dab53a6157f4ff67f4d42751261a186ee598fb63aed3`
- hidden-acceleration.txt `1b0211ac5d6ce45772780591351204884ecb2a94b3fa5ba6fad001637966b66d`
- seam-dense.txt `6fa94424d5f1684c0e55d7342388b9f3c10c017f8ae2ccb24004c4bda889530d`
- pointwise-direction.txt `d02e335f5b9c37ebac553589378d9970c5f9498efd40a5e37c4e24ca765eca1c`
- inputs.txt `81ee7916e7b1ec92c549071e689f4f3d4fe4aa651dfe83052e7cd860eb482951`

Numerical repairs (PR 175 step admission, PR 177 analytic Jacobian) improve
minimization of this objective. They cannot remove the incentive to hide motion,
so they cannot make the walk pass on their own.

### Rule 20 inventory

Base: origin/main 88b871b, which merges PR 177 at 51927a6. Stdlib Python
model/validator; pinned Blender build `d13f752e3b9c` only for read-only
saved-scene sampling. Current measurement owners:

- `sample_scene.times` (observation schedule).
- `sample_scene.main` (Blender rows, format `maya-walk-samples-v2`).
- `spec.SampleSet` admission (format and derivative half-width 1/128).
- `kinematics.NativeGeometry.samples/assess`.
- `validate.validate_cycle`.
- `fitting.Objective.residuals`.

Tests touching the two rules or the sample format:
`tests/test_validation.py`, `tests/test_admission.py`.

### Correct Fix Must Touch

- **One interval-motion owner** in `validate.py`: a named function taking a
  typed fine track and the spec. It returns, per side, cycle and interval:
  - the quarter-frame-scaled angular change for every joint,
    `.25*|ω(i+1)-ω(i)|/δ`, where `ω(i) = angle_delta(θ(i+1), θ(i))/δ`;
  - the secant forward velocity of hip, knee, ankle and toe, with the existing
    applicability rule (hip and knee always; ankle and toe from `spec.toe_off`).

  Both the validator and the objective call this function. The objective's
  hard-coded `14.4` (`fitting.py:338`) is replaced by the spec-derived rule.
- **One fine-track schedule owner** in `sample_scene.py`. It produces a uniform
  grid of spacing δ = 1/64 frame over the scene domain (validator) or over the
  closed cycle plus one δ on each side of the seam (objective). With δ = 1/64,
  the quarter-frame minimum key gap holds 16 intervals.
- **Fail-closed resolution check** inside the same owner. It recomputes each
  maximum on the 2δ subsample. If the two maxima differ by more than 10% of that
  rule's limit, it emits `interval_measurement_unresolved` for that
  joint or point. An unresolved measurement fails acceptance. It is never treated
  as a pass, and δ is never coarsened to make it pass.
- **Typed track admission** in `spec.py`: sample format `maya-walk-samples-v3`
  carries the track. Admission refuses:
  - a missing track, wrong spacing, gaps, a non-uniform grid or a short domain;
  - nonfinite values;
  - missing joints or points, or extra keys.

  `v2` files are refused, not silently upgraded.
- **Validator** `validate_cycle`: `angular_velocity_jump` and the interval part
  of `point_backward` read only the interval-motion owner. Failure records keep
  their names and units, and add `interval: [t0, t1]` and the resolution values.
  `joint_maximum_velocity_change` reports the fine-track maximum. Every other
  rule keeps its current observations.
- **Saved-scene sampler** `sample_scene.main`. It emits the fine track (angles
  plus the four progression points, both sides) from the same evaluated pose,
  in the same fresh factory process, and refuses to write output on any
  sampling error. The input-scene hash checks stay unchanged.
- **Native model** `NativeGeometry`: builds the same track from `at()`, and
  `assess()` passes it to the validator.
- **Objective** `fitting.Objective.residuals`: the residuals at
  `fitting.py:326` and `fitting.py:336-339` are replaced by one residual per
  fine interval, computed from the shared owner on the near side. The threshold
  (1.98) and scale (/.15) stay the same, and so does the backward expression.
  Each residual is multiplied by `sqrt(δ/.25)`, so a violation sustained over one
  quarter frame weighs the same as today. Only hidden violations gain weight.
  `velocity_weight` keeps its meaning. Forward-mode sensitivities flow through
  the existing `differential.py` arithmetic. Nonsmooth ties keep the existing
  typed refusals, with no new tolerance.
- **Tests, README and this contract's proof sections.** Fixtures that pin the
  old objective's residual vector are re-pinned. The before and after receipts
  are retained, with the reason recorded. Curve and geometry primal parity stays
  exact.

### Rejected alternatives

- Forbidding key gaps at or below the observation spacing does not close the
  class. IK amplification creates sharp joint motion inside a wide key gap.
- Denser observations for every rule is also rejected. `contact_reacceleration`
  and the stall counter compare unnormalized adjacent steps, so a denser grid
  would silently weaken them.
- Analytic second derivatives cannot be read from the saved Blender scene, which
  remains the final measurement authority.

### Must Not Change

- Spec limits: 2.0 velocity change, .0005 backward tolerance, and every other
  field.
- The observation schedule and its event samples, and every other validator
  rule and its observations: extrema, knee bands, stall grid, holds, release,
  contact, reach and ground.
- Charts, coordinates, anchors, key spacing and cap, PCHIP, holds and events,
  source poses, rig, art, camera, cadence and stride, and reference bands.
- Objective terms other than the two replaced families, and their weights.
- Step admission, the inner solver, the differential owners, damping, budgets
  and probe ladders.
- No fit run, no saved animation, no scene writes, and no edits to sealed
  evidence.
- No other branch, worktree or PR.
- No dependency.

### Restriction and mechanism

- **Restriction: `interval_measurement_unresolved` fails acceptance.** Need: a
  feature narrower than 2δ could otherwise pass unmeasured. Kept.
- **Restriction: v2 sample files are refused.** Need: a v2 file lacks the track,
  and accepting it would restore the blind spot. Kept. The baselines are
  resampled instead (Verification 3).
- **Mechanism.** One named measurement function and one typed, admission-checked
  track, shared by the validator and the objective. This replaces two parallel
  pointwise measurements, and it is the strongest mechanism the owners support.
  It adds no new framework.

## Assumptions / blockers

- **Blender evaluation noise must be well under the limit at δ.** A float32
  second difference at 1/64 frame is expected to sit far below the 2.0 limit,
  but that is unmeasured. It is measured before implementation (Verification 1). If the
  resolution check trips on a sealed baseline purely from noise, implementation
  stops and this contract is amended.
- **Gait feasibility under correct measurement is unknown.** Passing this slice
  does not predict a passing walk.
- **Fitter cost will grow, and is measured, not assumed.** Fine-track residuals
  multiply evaluation work, by roughly 1536 intervals × 4 joints per family over
  the cycle. One analytic residual-and-Jacobian evaluation is timed and reported.
  Impracticality is raised at fit authorization, never fixed by coarsening δ.
- **Pointwise-value rules can also miss values between samples.** These are
  extrema, knee bands, ground, hold slip and reach. Ground showed no hidden
  violation on this fit; the rest are unmeasured. They are recorded as a
  follow-up issue after acceptance, not widened into this slice.

## Verification plan

1. **Before code: noise floor and old-rule receipts.**
   - In the pinned Blender, sample the sealed baselines and the candidate scene
     on the fine track, read-only in a fresh factory process.
   - Record the δ versus 2δ resolution disagreement on hold and stance segments.
   - On the frozen third-fit values, record that the current validator and
     objective miss the 23.75–24 knee pop and the knee reversal. Store the
     receipts.
2. **Fail first.** Add regressions that pass on the old path and must fail on
   the new one:
   - a synthetic track with a spike strictly between quarter-frame observations;
   - the frozen third-fit source;
   - a seam-crossing spike.
3. **Boundary probes.**
   - Jump exactly at 2.0 passes; just above fails.
   - Backward exactly −.0005 passes; just below fails.
   - One joint over the limit while the others are under.
   - Both sides, and first and last cycle intervals.
   - Resolution agreement just inside and just outside 10%.
   - Admission refusal for empty, single-sample, wrong-δ, gapped, nonfinite,
     missing-key, extra-key and v2 inputs.
   - Zero/falsy δ and domain.
4. **Shared-owner parity.**
   - The validator and objective produce identical interval values for the same
     model track.
   - The Blender track matches the native model on the candidate scene within
     the recorded noise floor.
   - Curve, geometry and observation-row primal parity stays exact against the
     before-code packet.
5. **Baselines.**
   - Resampled known-bad baselines still fail for their documented reasons.
   - Newly exposed failures are reported, not hidden.
   - The objective-dependent frozen fixtures are re-pinned with before and after
     receipts.
6. **Mutation.** One mutant per clause must be caught: dropped joint, dropped
   side, δ/2δ swap, resolution bypass, applicability boundary, sqrt weighting,
   seam extension, admission checks, and objective routing back to the old
   residuals.
7. **Wrap-up checks.**
   - Run the focused tests, then the full pure walk suite locally.
   - Time one analytic evaluation.
   - Cold-audit the diff.
   - Evidence goes outside the worktree, with directories mode 700 and files
     mode 600, pinned by SHA256 in the PR.
   - No fit runs until separately authorized.

## Contract Amendments

None at the initial contract commit.

## Implementation summary

Not started. Awaiting contract acceptance.

## Cold Diff Audit

Not started.
