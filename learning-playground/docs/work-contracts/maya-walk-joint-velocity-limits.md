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

## Implementation summary

Not started. This commit adds only this contract and the pointer amendment in
`maya-walk-gait-source.md`.
