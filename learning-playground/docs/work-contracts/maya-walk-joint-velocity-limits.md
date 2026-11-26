# Maya walk: velocity-continuity limits measured from real children

## Before Code

### Authority and scope

On 2026-11-26 Juan read the limit check and answered "Amend the contract" to
"Amend the gait contract to per-joint limits from the children's data?". That
authorizes this contract only. Implementation starts after Juan explicitly
accepts it. It does not authorize a fit, an animation promotion, saved-scene
writes, a merge or walk acceptance.

This contract amends one row of the accepted gait-source contract
(`maya-walk-gait-source.md`, Verification Plan, "Velocity continuity"). That
row set the limit as an "initial" value and called it "an animation limit, not
a physiological standard". The gait-source contract permits validator
calibration "only with positive/negative fixture proof and a recorded contract
amendment, never to pass a new candidate" (`maya-walk-gait-source.md`, before
the rule table). This is that amendment.

- **What changes.** The single limit of 2 degrees/frame per quarter frame
  becomes one limit per measured joint, taken from real children.
- **What doesn't change.** The measurement itself, every other rule, every
  reference band, the step solver, the chart and the motion floor.

Base: `origin/main` `85276efb90aca7fa1c9e96c5d524db6346996720` (PR 184 merged).
Branch `claude/maya-walk-joint-limits`, worktree
`~/Desktop/Kennedi_worktrees/maya-walk-joint-limits/`.

Evidence aliases (beneath `G` = `~/Desktop/codex-evidence/kennedi-storybook/maya-walk-gait-source-2026-11-07/`):

| Alias | Directory | What it holds |
|---|---|---|
| LC | `limit-check-20261126T191136Z` | dataset file, measurement scripts, per-leg results, report |
| WV | `scale-floor-test-20261124T235342Z` | `why-validation-fails.md`, score split by rule family |
| RF | `reach-fit-20261124T230813Z` | the fit after PR 184 and its validation report |
| DF | `domain-fit-20261118T044912Z` | the fourth fit and its validation report |
| IM | `interval-measurement-2026-11-12/reproduction` | baseline validation reports under the current rules |

Pinned files:

- `LC/download/cgm2-td-children.xlsx`: SHA256 `f9905a48c32fa4c84f61c8a12269170a5d762b35ce25d20378d9e15c3d5e8149`, 14,539,451 bytes.
- `LC/measure.py`: `618f180e31c4e5af18102f7280fca442998c2d57bfe76b50dad086ed522d1a2b`.
- `LC/measure.json`: `99aa7f21cdd0a8dac56a8f181eb9c74713981a856eb5f0012e2c6fafd2ddc183`.
- `LC/compare.json`: `4a8551ae916ddf261df1e398982b3e2d2d59a0cede59517b46b5876ca273bfa8`.
- `LC/report.md`: `a60fb9e81b4f4c98b92fa2f8ba69940a80f3ed00f179fcd64a2fa42acd2fa33a`.
- `WV/why-validation-fails.md`: `d84e4ab479f72cb8256831340b7674c820444efd7f03a9b8185239f001f03150`.

### Root Cause

**1. The limit is stricter than real children's walking.**

The validator fails a joint whenever its measured acceleration,
`.25*|θ(t+δ)-2θ(t)+θ(t-δ)|/δ²` on the 1/8-frame grid, exceeds
`GaitSpec.velocity_change_per_quarter = 2.` (`spec.py:76`; rule at
`validate.py:340-347`). That is about 4600 degrees/s² at 24 fps.

The dataset is Kerr, Pascoe, Thomason, Rutz and Passmore (2025), "Gait dataset
– Typically developing children processed with CGM2", Murdoch Children's
Research Institute, doi:10.25374/MCRI.28216448.v2, CC BY 4.0. It holds 32
children aged 6-18, both legs, with sagittal hip, knee, ankle and foot angles
at 1% of the gait cycle.

`LC/measure.py` places each leg's curve on the target cycle (24 frames at
24 fps, `TARGET.expected_cadence` 120) and applies the validator's exact rule.
The curve between samples comes from a periodic Fourier reconstruction with
10 harmonics. With the Plug-in Gait variant, 64 legs:

| Joint | Legs over 2.0 | Largest value over all 64 legs |
|---|---|---|
| hip | 0 | 1.464747588210571 |
| knee | 52 | 3.5305865452809826 |
| ankle | 53 | 4.343150958120987 |
| foot pitch | 64 | 5.053233555034353 |

- **Robustness.** 6, 8 and 15 harmonics, the raw 1% second difference, and all
  7 processing variants in the file give the same picture (`LC/report.md`).
- **Where.** The knee goes over at terminal swing and around toe-off. The ankle
  and foot go over at push-off. These are the known high-acceleration phases of
  walking, not artefacts of cycle closure (`LC/compare.json`).

**2. One number cannot describe four joints.** Real hips stay under 1.47, while
real feet reach 5.06. A single 2.0 rejects most real knees, ankles and feet,
and admits hip motion jerkier than any measured child.

**3. Every fit has failed mostly on this rule.**

- The reach fit fails 139 of its 162 checks per cycle on it (`RF`, `WV`).
- The fourth fit, the best score so far, still had 116 per cycle, 88 of them
  between 2.0 and 2.5 (`DF`, `WV`).

**4. The objective keeps its own copy of the number.** `Objective.residuals`
hard-codes `jump-1.98` (`fitting.py:497`): the limit minus a .02 margin,
written as a literal rather than read from the spec.

### Rule 20 inventory

Every reader of the limit at the base commit:

| Reader | Use |
|---|---|
| `spec.py:76` | the owner: `velocity_change_per_quarter: float = 2.` |
| `spec.py:85-101` | `__post_init__`: finite and positive checks over all numeric fields |
| `validate.py:46-58` | `measurement_resolution`: detection bounds `8·L·δ²`, `12·L·δ` |
| `validate.py:325` | stores `measurement_resolution` in each cycle report |
| `validate.py:340-347` | the `angular_velocity_jump` rule and its reported limit |
| `fitting.py:497` | the objective's hinge at `1.98` |
| `spec.py:304` | `SamplePacket.from_dict` rebuilds `GaitSpec(**data["spec"])` from saved packets |
| `sample_scene.py:116` | compares a saved candidate scene's `gait_spec` to `TARGET` |
| `__main__.py:30-39` | `analyze` admits a packet only if its whole spec equals `TARGET` (candidate) or `BASELINE` (baselines), then validates with the packet's spec |
| `tests/test_interval_motion.py:71-94` | detection bounds asserted for the single limit (`.25`, `3.`) |
| `tests/test_interval_motion.py:115-140` | hidden-spike, boundary and seam tests at 2.0 (boundary on `foot_pitch`) |
| `tests/test_interval_motion.py:185-190` | the reported `measurement_resolution` |
| `tests/test_interval_motion.py:220-232`, `251-257` | objective block and hinge tests that use `1.98` |
| `tests/test_validation.py:220-227` | seam velocity jump on the hip (a 5-degree spike) |

### Correct Fix Must Touch

**1. One closed per-joint owner.** In `spec.py`, a frozen `JointLimits`
dataclass has exactly the four fields `hip`, `knee`, `ankle` and `foot_pitch`,
matching `JOINTS` (`spec.py:131`).

- **Admission.** Each field is a finite positive float. A bool or any other
  type is refused.
- **Lookup.** `of(joint)` returns a joint's limit and raises for any name
  outside `JOINTS`.
- **Owner field.** `GaitSpec.velocity_change_per_quarter` becomes a
  `JointLimits` whose default is `CHILD_JOINT_LIMITS`. `__post_init__`
  validates it by type instead of the scalar loop.

**2. Values with recorded provenance.**

- **The constants.** In `reference.py`, `CHILD_JOINT_ACCELERATION_MAXIMA`
  records the four maxima above at full precision. A `SOURCES` entry gives the
  dataset DOI, the file's SHA256, the variant (PiG_KAD), the leg count (64),
  the reconstruction (10 harmonics), the target cycle (24 frames at 24 fps) and
  the rounding rule.
- **The limits.** `CHILD_JOINT_LIMITS` is derived in code, never typed by hand:
  each maximum rounded up to the next hundredth, giving hip 1.47, knee 3.54,
  ankle 4.35 and foot pitch 5.06. Rounding up means every measured leg passes.
- **No copied dataset.** The per-leg table and the dataset stay in private
  evidence (`LC`), cited by alias and SHA256. The repo keeps the four cited
  maxima, consistent with `reference.py`'s "no copied dataset" rule.

**3. The validator reads each joint's limit.** `validate.py:340-347` compares
each joint's value with `spec.velocity_change_per_quarter.of(joint)`. It
reports that joint's limit in the violation, and the unit stays
`degrees/frame/quarter-frame`.

**4. Detection bounds per joint.** `measurement_resolution` reports
`angle_step_detected_above_degrees` and
`velocity_change_detected_above_degrees_per_frame` as a mapping per joint, with
the same formulas (`8·L·δ²`, `12·L·δ`) applied to that joint's limit.

**5. One owner for the objective's threshold.**

- `fitting.py:497` uses `TARGET.velocity_change_per_quarter.of(joint) -
  OBJECTIVE_LIMIT_MARGIN`.
- `OBJECTIVE_LIMIT_MARGIN = .02` is the existing margin, named once. The scale
  `/.15`, the weight `sqrt(δ/.25)` and `velocity_weight` are unchanged.

**6. Saved packets and scenes: one reader and one policy gate.** A packet
records the spec it was sampled with. Its velocity limits only ever feed
validation; sampling never reads them (`sample_scene.py` uses the spec for the
clock and events). Two owners in `spec.py`:

- **`GaitSpec.from_dict` reads saved JSON.** It is used at `spec.py:304` and
  `sample_scene.py:116`.
  - **Legacy form.** A single number becomes `JointLimits` with that number
    for all four joints.
  - **New form.** A mapping must hold exactly the four joints.
  - **Anything else is refused:** a missing or extra joint, a non-finite
    value, zero, a negative, a bool or a string.
- **`admitted_policy(recorded, owner)` is the one policy gate.** It is used by
  both `analyze` branches (`__main__.py:30-39`) and by the candidate check
  at `sample_scene.py:116`.
  - **Sampling stays exact.** Every field except the velocity limits must
    equal the owner's, as today.
  - **Only two limit forms are admitted.** The recorded limits must be either
    the owner's limits or the legacy uniform 2.0 (`LEGACY_UNIFORM_LIMIT`,
    named once). Any other limit set is refused, because it comes from a
    policy nobody reviewed.
  - **Return value.** The gate returns the owner's spec, and `analyze`
    validates with that spec. It never uses the packet's recorded limits.
  - **Reporting.** The report records which limit form the packet carried
    (`"packet_limits": "current"` or `"legacy-uniform-2.0"`).
- **Result.** An old packet or scene is analyzed under today's validator, with
  the same identity checks as before. Its historical verdict stays in its
  sealed report; it is not recomputed.

**7. Tests.**

- **Update to the new limits.** These tests stay assertions about the same
  behaviour, now at each joint's own limit:
  - `test_interval_motion.py` boundary and detection-bound tests;
  - the `1.98` objective tests;
  - `test_validation.py:220-227`.
- **Add the tests** the Verification plan lists.

**8. Contract trail.** A dated amendment entry in `maya-walk-gait-source.md`
points to this contract and marks the "Velocity continuity" row's 2-degree
value superseded. The row's other requirements stay in force: all joints,
whole cycle, seams, reporting in degrees/s and degrees/s².

### Rejected alternatives

- **Raise the single limit (for example to 5.06).** That fits the foot, but it
  lets the hip move more than three times jerkier than any measured child. It
  replaces one wrong number with another.
- **A percentile instead of the maximum.** A 95th percentile would fail some
  real children by construction. The acceptance reference is "move like a
  child", so every measured leg passes.
- **Raw 1% second differences.** Double differencing amplifies measurement
  noise (hip raw maximum 2.64 against 1.31-1.53 on the 6- to 15-harmonic
  reconstructions).
  The 10-harmonic reconstruction keeps everything a 1 s stride holds up to
  10 Hz, above the usual 6 Hz capture filter, and agrees with 6, 8 and 15
  harmonics to within the reported spread.
- **Refusing legacy packets.** That would make every saved sample packet
  unanalyzable. Their samples do not depend on the limit, and their single
  number has an exact per-joint meaning.
- **Validating legacy packets under their recorded limits.** That would need a
  second admitted owner policy for the same scene, and an analysis verdict
  would then depend on when the packet was sampled. Historical verdicts
  already live in their sealed reports.

### Must Not Change

- **The measurement.** `interval_motion`, the fine spacing, angle wrapping,
  `progression_applies` and the forward-velocity rule.
- **Every other validator rule and number.** That includes extrema windows and
  bands, prominence, stall, release, contact, holds, toe clearance, global gait
  and the knee near-straight windows.
- **The objective apart from the threshold source.** Its terms, scales,
  weights, margin value and ordering stay the same.
- **Everything else in the fit.** The step solver (`numerics.py`), reach rows,
  chart, motion floor, timing domain, anchors, holds, key cap and tangent rule.
  This contract does not include the solver repair measured in `WV`
  (scale floor and reach hold); that needs its own contract.
- **Scenes, rig, art, cameras and the walk.** No saved scene, animation,
  checkpoint or fit is written or run.
- **Repo contents.** No dataset or per-leg table in the repo, and no new
  dependency.

### Concurrency model

None. `JointLimits`, the validator and the objective are pure, single-threaded
functions of their inputs, with no shared mutable state.

### Restriction and mechanism

restriction:
- **Hip limit tightened from 2.0 to 1.47.** Needed because every measured
  child's hip stays under 1.47 at the target cadence, and Juan's acceptance
  reference is "move like a child". **Kept.** A looser hip would admit motion
  no child makes. This makes the fit's job harder at the hip: estimated with
  the unrounded maximum, the fourth fit would keep 6 hip failures per cycle.
- **Knee, ankle and foot limits loosened** to the largest measured child
  value. These remove an unneeded restriction: the old value failed 52-64 of
  64 real legs. **Corrected.**
- **Malformed limit data refused.** Needed because a limit that silently
  defaults would make validation meaningless. The legacy scalar is migrated
  exactly, not refused. **Kept, scoped.**
- **Packet limits admitted only as current or legacy uniform 2.0.** Needed
  because any other limit set comes from a policy nobody reviewed. These are
  the only two forms that have ever existed, and admitting them costs nothing
  because validation uses the owner's limits. **Kept.**

mechanism:
- **Per-joint limits:** a closed frozen dataclass with four named fields (an
  invalid joint set cannot be represented), validated at construction. That is
  the strongest mechanism at this owner. **Justified.**
- **Provenance:** the limits are computed in code from the cited maxima
  constants, so the numbers have one source. **Justified.**
- **Objective threshold:** read from the spec owner instead of a literal.
  **Justified.**

## Assumptions / blockers

- **Cadence.** The dataset has no stride times. The limits assume a child's
  joint-curve shape at the animation's 120 steps/min matches the shape at the
  child's own pace. A child who walks slower would have somewhat larger values
  at our pace, so the limits err on the strict side.
- **Smoothing.** The file does not say whether its curves are averages over
  strides. If they are, single strides can only be sharper, which also errs on
  the strict side.
- **Foot pitch.** The dataset's sagittal FootProgress angle is the closest
  available match to our foot-world pitch (`kinematics.py:69`), not a proven
  identity.
- **Baselines are absolute.** The limits are absolute accelerations per
  frame². They apply unchanged to the 32-frame baseline scenes, as the single
  2.0 did.
- **Blocker.** Juan's acceptance of this contract.

## Verification plan

1. **Fail first on the base.** Before any code change, each of these must
   behave as stated on `85276ef`. The new tests fail on the base for the
   stated reason, then pass after.
   - A knee V-kink measuring 3.0 fails on the base and must pass after.
   - A hip V-kink measuring 1.6 passes on the base and must fail after.
2. **Both sides of every limit.** For each joint, each leg, and the first and
   last cycles:
   - exactly the limit passes;
   - `limit*(1+1e-9)` fails and reports that joint and its limit.
3. **Cross-joint.** A value of 3.0 passes on knee, ankle and foot pitch but
   fails on hip. The same spike moved to another joint follows that joint's
   limit.
4. **Admission.** `JointLimits` and `GaitSpec.from_dict` refuse a missing
   joint, an extra joint, NaN, inf, 0, a negative, `True` and a string. A
   legacy scalar 2.0 rebuilds as four 2.0 limits, and a packet with the new
   mapping round-trips exactly.
4a. **End-to-end legacy analysis.** These go through `analyze` itself, not
   only deserialization. They use written packet files: a baseline packet
   whose identity matches the sealed digest, and a candidate packet.
   - **Admitted.** A packet recording the legacy scalar 2.0, and one recording
     the current limits, are both admitted. Both are validated with the
     owner's limits: a knee value of 3.0 passes in both, and a hip value of
     1.6 fails in both. The report records `packet_limits`.
   - **Refused, with nothing validated.**
     - recorded limits of uniform 2.5;
     - recorded limits of the current set with one joint changed;
     - a legacy-limit packet whose clock or event differs from the owner;
     - a candidate saved scene whose `gait_spec` differs from `TARGET` in
       anything other than an admitted limit form.
   - **Mutants that must fail a test.** Each of these, applied alone: removing
     the identity comparison, admitting any limit set, and validating with the
     packet's recorded limits.
5. **One owner.**
   - Changing `TARGET`'s knee limit in a test changes both the validator's
     knee verdict and the objective's knee hinge.
   - A mutant that restores the literal `1.98`, or that reads one joint's
     limit for another, fails a test.
6. **Objective block.** The crafted-motion test still finds the fine families
   once, in order, with per-joint thresholds. The hinge test sums
   `max(0, jump-(L_joint-.02))`. The objective and the validator still measure
   identically (`interval_motion` output unchanged).
7. **Detection bounds.** `measurement_resolution` reports `8·L·δ²` and
   `12·L·δ` for each joint, and the worst-offset boundary tests hold at each
   joint's own bound.
8. **Baselines still fail on their complaints.** Re-sample and re-validate the
   three pinned baselines with the pinned Blender build (`__main__.py`
   `reproduce`).
   - Each must still be REPRODUCED on its required rule.
   - Each must still report `angular_velocity_jump` at the knee and hip in
     every complete cycle; this keeps "knee yank", "flailing" and "snappy"
     demonstrated.
   - Estimated from the saved reports with the unrounded maxima: native and
     painted keep 168 velocity failures each (knee 78, hip 72, ankle 18) and
     release keeps 150. The actual counts are recorded, not assumed.
9. **Frozen checks.** The heel-strike pop (`FrozenFitTests`) still fails above
   40 and 45. Frozen objective scores that include the velocity family are
   recomputed and recorded with their before and after values. No frozen
   fixture is edited to pass.
10. **Recount, reported only, not a gate.** Re-validate the fourth fit and the
    reach fit from their checkpoints under the new limits and record the
    counts. Estimated near-cycle-1 velocity failures: fourth fit 8 (hip 6,
    knee 2), reach fit 28.
11. **Suite, mutation and audit.**
    - The full pure walk suite passes.
    - One mutant per new clause, including the first; every survivor is
      explained: each joint lookup, each admission clause, legacy migration,
      each policy-gate clause, rounding direction, the objective margin, and
      each detection bound.
    - A cold diff audit with file:line citations.
12. **Evidence** goes under `G` (directories 700, files 600), cited by alias
    and SHA256.

The walk is not expected to pass after this change. The reach fit would
still fail on its remaining velocity failures, its knee kink (19.86) and the
curve-shape rules. A new fit needs Juan's separate authorization, and the
solver repair needs its own contract.

## Contract Amendments

### 2026-11-26 (after acceptance): frozen points the per-joint objective moves

Juan accepted this contract on 2026-11-26 ("I accept") at `5f84496`. Wiring
the objective to per-joint thresholds changed the objective's value and its
first step at several frozen points. The contract named pinned scores
(Verification plan item 9) but not these behavioural assertions, so they are
recorded here before the code that changes them. No frozen fixture file
changes.

- **Pinned scores, before → after.** Each test keeps its value under the
  single 2.0 limit in a comment.
  - fourth-fit stop: 1065.0984973977909 → 540.7090271604817
  - frozen outer step: 167627.33977017563 → 150777.21595978676
  - carried reach stop: 26734.496978721134 → 20522.667167307874
  - Not pinned, recorded only. Frozen jacobian stop:
    168334.03107023708 → 151409.24912460503.
- **Timing wall (`test_timing_domain.py`).** At `frozen-jacobian-stop.json` the
  first attempt is now refused by the search reach guard (`fitting.py:465`),
  not the timing domain the test is about. The test called `admit_step`
  without the reach rows `fit()` passes since PR 184, so it now passes them.
  Its assertions are unchanged.
- **Collapsed damping at frozen iteration 60 (`test_fitting_numerics.py`).**
  - **What changed.** At 1e-7 the near-Gauss-Newton steps now leave the
    leg's reach 4 times before one is admitted at `1e-7·5⁴`. The reach rows
    don't prevent this, because they are first-order.
  - **Updated test.** It asserts that sequence explicitly, keeps
    one-evaluation-per-attempt and the full-solved-step identity, and uses
    the step bounds `admit_step` applies.
  - **Dropped.** The "ratio ≥ .75 keeps damping at 1e-7" claim no longer
    describes this point. `test_next_damping_follows_every_row_of_the_policy_table`
    and `test_well_predicted_step_lowers_damping_and_poor_one_raises_it`
    still cover it synthetically.
- **Reach parity at the outer step (`test_reach_limit.py`).**
  - **What changed.** The box-only step now misses a reach row there.
  - **Updated test.** Each point declares whether a row binds, and the test
    asserts that declaration. The fourth-fit point still proves parity. The
    outer-step point asserts the constrained branch: every attempt is
    constrained, and the admitted step keeps every margin above 0.
- **Weak-column cross-check (`test_differential.py`, column 31,
  `foot_z[9]`).** This bound is loosened, and the change is flagged.
  - **What changed.** The central difference agreed with the analytic column
    to .0036 before and .0105 after, against its own reported error of .045
    before and .047 after.
  - **Why the old bound goes.** The fixed 1% bound was never derived from the
    estimator.
  - **New assertion.** The gap must be below the estimator's own reported
    error, which must itself be below .05. Status CENTRAL and analytic norm
    < 1e-7 stay.
- **Saved-scene check.** The candidate check at `sample_scene.py:116` becomes
  a pure function, `admit_saved_candidate(saved_gait_spec)`, that Blender's
  `main` calls. This lets a unit test reach the gate on saved scene JSON.
- **Estimates corrected.** The estimates in Verification plan items 8 and 10
  undercounted the hip. They re-filtered old reports, which only listed values
  above 2.0, so hip values between 1.47 and 2.0 were missing. The actual
  counts are recorded in the implementation summary; they are not gates.

## Implementation summary

- **Commits.** Implementation `b456f44`, on top of the amendment `0896850`.
- **Evidence alias.** `JL` = `G/joint-limits-20261126T200145Z` (directories
  700, files 600).
- **Limits.** Hip 1.47, knee 3.54, ankle 4.35 and foot pitch 5.06. They are
  derived in code from the cited maxima and reported per joint.
- **One threshold source.** The validator, the detection bounds and the
  objective all read the spec's `JointLimits`.
- **One gate.** Saved packets and scenes pass `admitted_policy`, and
  validation always uses the owner's limits.
- **No fit, scene write, animation or walk acceptance.**

Actual counts under the new limits (Verification plan items 8 and 10):

| Scene | Velocity failures before | After | By joint after | All violations after |
|---|---|---|---|---|
| native baseline (6 cycles) | 360 | 216 | hip 120, knee 78, ankle 18 | 482 |
| painted baseline | 360 | 216 | hip 120, knee 78, ankle 18 | 488 |
| release baseline | 480 | 174 | hip 84, knee 66, ankle 24 | 380 |
| fourth fit, near cycle 1 | 116 | 22 | hip 20, knee 2 | 378 overall (was 1224) |
| reach fit, near cycle 1 | 139 | 45 | hip 31, knee 10, ankle 4 | 612 overall (was 1458) |

The walk still fails validation.

## Cold Diff Audit

### Gaps

1. **One mutant survives.** Removing the call to `admit_saved_candidate` from
   Blender's `main` (`sample_scene.py:125`) survives, and no unit test can
   reach it. It would be caught only by sampling a saved candidate scene in
   Blender, and none exists. The function itself is tested
   (`SavedSceneTests`), and its gate-skipping mutant is caught.
2. **The weak-column bound is looser** (amendment). The finite-difference
   cross-check is now judged against the estimator's own reported error (.047)
   instead of a fixed 1%.
3. **Reach rows are first-order at collapsed damping.** At the frozen outer
   step, at 1e-7 (`DAMPING_FLOOR`), four near-Gauss-Newton steps leave the
   leg's reach before one is admitted, even with reach rows (`JL/outer-step-probe-after.log`).
   PR 184 introduced this, not this change. It belongs to the solver contract
   (scale floor and reach hold), which is still to be written.
4. **The contract's estimates were low.** It estimated 168, 168, 150, 8 and
   28 velocity failures; the actual counts are 216, 216, 174, 22 and 45. The
   estimates came from old reports that only listed values above 2.0.
5. **One AnalyzeTests case already passed on the base.** The candidate case
   passes on `85276ef`, where there is only one limit form, so it is not a
   fail-first test. The legacy, current and refusal cases are.
6. **Size.** About 960 lines before this audit (code, tests and contract),
   slightly over 1,000 with it.

### Change By Change Reconstruction

- **`reference.py:50-66`.**
  - `SOURCES["joint_acceleration"]` cites the dataset, its DOI, its licence
    and the file's SHA256.
  - `CHILD_JOINT_ACCELERATION_MAXIMA` holds the four maxima at full
    precision, with the method in a comment.
- **`spec.py:7`.** Imports the maxima; `reference.py` imports nothing from
  `spec`, so there is no import cycle.
- **`spec.py:63-102`.**
  - `JOINTS` moves above its first user.
  - `LEGACY_UNIFORM_LIMIT = 2.` is named once.
  - `JointLimits` admits only finite positive floats (lines 76-80).
  - `of` refuses names outside `JOINTS`.
  - `uniform` builds four equal limits.
  - `from_dict` requires a dict with exactly the four joints.
  - An import-time check ties the field names to `JOINTS`.
  - `CHILD_JOINT_LIMITS` rounds each maximum up to a hundredth (line 102).
- **`spec.py:120, 132-147`.** The `GaitSpec` field is `JointLimits` with the
  child default. The numeric checks skip it and a type check admits only
  `JointLimits`, so a scalar is refused at construction.
- **`spec.py:175-186`.** `GaitSpec.from_dict` reads a float as
  `JointLimits.uniform` and a mapping through `JointLimits.from_dict`.
  Anything else fails in `JointLimits.from_dict`.
- **`spec.py:191-210`.** `admitted_policy` checks types and classifies the
  recorded limits as `current` or `legacy-uniform-2.0`, refusing anything
  else. It compares every other field exactly, by replacing the limits with
  the owner's, and returns `(owner, form)`.
- **`spec.py:385`.** `SamplePacket.from_dict` uses `GaitSpec.from_dict`.
- **`validate.py:8, 54-57`.** Detection bounds are mappings per joint, over
  `sorted(JOINTS)`.
- **`validate.py:341-347`.** Each joint's own limit gates its values and is
  the limit reported in the violation.
- **`fitting.py:433, 502`.** `OBJECTIVE_LIMIT_MARGIN = .02`, and each joint's
  hinge starts at `TARGET`'s limit for that joint less the margin. The scale
  `/.15`, the weight and `velocity_weight` are unchanged.
- **`__main__.py:30-53`.**
  - Both branches keep their identity checks: scene kind for both, plus the
    digest for baselines.
  - The gate replaces whole-spec equality, with the original error messages
    chained.
  - Validation uses the gate's owner spec, and `packet_limits` is reported.
- **`sample_scene.py:74-80, 125`.** `admit_saved_candidate` runs the saved
  JSON through `GaitSpec.from_dict` and the gate against `TARGET`, mapping any
  error to the original message. `main` calls it for candidates.
- **Tests.**
  - New `tests/test_joint_limits.py` (300 lines).
  - `test_interval_motion.py`: per-joint bounds, boundary and hinge.
  - `test_reach_limit.py`, `test_fitting_numerics.py`, `test_timing_domain.py`
    and `test_differential.py`: the frozen points, as the amendment records.

### Contract Traceability

| Contract item | Where |
|---|---|
| 1 Closed owner | `spec.py:63-102`, `120-147` |
| 2 Provenance | `reference.py:50-66`, `spec.py:102` |
| 3 Validator per joint | `validate.py:341-347` |
| 4 Detection bounds | `validate.py:54-57` |
| 5 Objective owner | `fitting.py:433, 502` |
| 6 Reader and gate | `spec.py:175-210, 385`, `__main__.py:30-53`, `sample_scene.py:74-80, 125` |
| 7 Tests | the test files above |
| 8 Contract trail | `maya-walk-gait-source.md` amendment entry (commit `0c55ca9`) |
| Amendment | this file's Contract Amendments section (commit `0896850`) |

### Verification

1. **Fail first on `85276ef`** (`JL/fail-first.log`, SHA256
   `ae6b600a3584cd25c38f01cde3728cad94fd79fdbb0b6968eaa17625a4e726c0`):
   18 tests, 6 failures and 14 errors.
   - A knee value of 3.0 is refused, and a hip value of 1.6 is admitted.
   - A 3.0 value is refused on the knee, ankle and foot.
   - The API tests error on missing names.
2. **New tests after the change.** All pass: 19 tests, including
   `SavedSceneTests`.
3. **Full pure walk suite.** Command: `python3 -B -m unittest discover -s
   storybook/animation/maya_walk/tests -p 'test_*.py'`. It ran 235 tests, OK
   (`JL/suite-final.log`,
   `48d9c70fd3d6719fe9c4a8b3e0242327162cf13e409a2204879c95966ef8cc3d`).
4. **Mutation** (`JL/mutants-2.json`,
   `7cb605dea9316fd90c91c911d6fc1f8593d9f80aa0dfad42e49f5c9cfdd2afb6`). 30 of
   31 mutants were caught, and the control passed. The survivor is Gap 1.
5. **Baselines.** `reproduce` with Blender 5.2.2 re-sampled the three sealed
   scenes. All are REPRODUCED on their required rules, with knee and hip
   velocity failures in all 6 complete cycles of each
   (`JL/reproduction/reproduction.json`,
   `14ca650ae1ae1b77b9e27d4bb87984f68cf72f94b3f225bcceda66e270d6e7ac`).
6. **Legacy packets end to end.** The 2026-11-12 baseline packets record the
   single 2.0. `analyze` admits each as `legacy-uniform-2.0`, and its
   violations equal the fresh re-sample's exactly
   (`JL/legacy-packets/{native,painted,release}.json`, SHA256
   `0dd265d8b49c80aba1c84e37961e6eb6d8e02027b76643e08d9b2bf9c24f0355`,
   `12fc0b134d377919877e0cd4ce888473a02c4af295f82e0f0d58fcf8330e1a9d`,
   `a6b14aebe0c3b3568b467b3e0b938e63ed2d7a61b2219f7e61e87d071822321f`).
7. **Frozen points.** Before and after values are in the amendment
   (`JL/frozen-probe-base.log`
   `93edc429e6bbc3fa3ff50b6d819868d14913f6d06e7256f6e65f7ba852d6741c`,
   `JL/frozen-probe-after.log`
   `6d12c2e90659e2a4ac490fb765028424436f9e3813a5077a5eaa2f1330d29295`,
   `JL/outer-step-probe-after.log`
   `930866d1b65f90e3c425f23c61d5fb8e68f64a443930e58d3d998e0077440924`). The
   heel-strike pop still fails above 40 and 45.
8. **Recount** (`JL/recount.json`,
   `4e7426fbff498b1cb33cf5b5405591c7d19bc20d76371770f6dbf4f8573c9cc3`):
   the table above.
9. **Contract check.** `node scripts/check-work-contract.mjs` passes, and
   `git diff --check` is clean.

### Gap audit

- **DONE.**
  - Per-joint limits with recorded provenance.
  - One threshold source for the validator, the detection bounds and the
    objective.
  - The saved-packet and saved-scene gate, with legacy packets analyzable end
    to end.
  - Baselines still fail on their complaints.
  - Fail-first, suite, mutation and recount evidence.
- **NOT DONE.**
  - The walk does not pass: the fourth fit still has 378 violations, and the
    reach fit 612.
  - The solver repair (scale floor and reach hold) needs its own contract.
  - The Blender-only call-site mutant (Gap 1) survives until a candidate
    scene exists.
  - No fit has been run under the new limits.
