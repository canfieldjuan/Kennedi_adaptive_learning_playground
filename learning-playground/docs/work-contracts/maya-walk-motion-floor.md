# Maya walk: every moving key keeps moving (motion floor)

## Before Code

### Authority and scope

Juan's gait direction, 2026-11-18: "How do children move? That's what I want
the hips to do." A child's hips bob twice per stride. They are highest over the
straight standing leg and lowest when both feet are down, and they never stop
dead.

On 2026-11-21 Juan saw the fourth fit's hip picture and answered "Write the
contract" to "Write the contract to keep Maya's hips moving through the
bottom?" That authorizes this contract only. Implementation starts after Juan
explicitly accepts it. It does not authorize a fit, an animation promotion,
saved-scene writes, a merge or walk acceptance.

This contract changes how the pose chart turns coordinates into key values,
and it makes the step solver honor the pose chart's existing ±35 domain. It
changes no validator rule, acceptance limit, objective term, anchor, hold,
extremum, key phase rule or the timing chart.

### Root Cause

**1. The pose chart can represent a parked key, and the fitter drives into it.**

- **How the chart builds a branch.** Each monotone branch of a pose curve runs
  from one fixed turning point, hold edge or seam to the next. `PoseChart`
  (`fitting.py:99-161`) places the branch's interior keys by shares of the
  branch. Each share is `exp(v)` over a sum (`ramp`, `fitting.py:140-143`), or a
  logistic for a two-segment branch.
- **Nothing keeps a share away from zero.** As one coordinate runs toward −∞,
  its segment shrinks toward flat. The curve rule refuses any unheld segment
  with slope below 1e-12 (`curves.py:127-131`). `Objective.score` then returns
  no residuals (`fitting.py:418-421`). `trial_step` refuses the whole step as
  `out_of_domain` (`fitting.py:528-529`).
- **Damping cannot help.** Raising damping does not restrain the running
  coordinate, so every attempt makes the same move. This is the same class as
  the timing wall PR 181 fixed.
- **Gait meaning.** A near-flat segment is a parked key: the body part stops
  dead between two keys while the rest of the walk moves. Juan's direction rules
  that out.

**2. The pose domain is a refusal the solver does not know.**
`PoseChart.build` refuses any coordinate with `abs(v) > 35` (`fitting.py:135`),
but `PoseChart.step_bounds` returns only the trust box (`fitting.py:163-166`).
This is the defect PR 181 fixed for timing. It is not binding now (largest
pose `|v|` is 25.115 at the fourth fit), but the fix in part 1 lets
coordinates run freely, so they will reach it.

**Evidence: the fourth fit.** Evidence alias `domain-fit-20261118T044912Z`. The
fit ran at merged main `3802836`.

- It stopped `linear_solve_failed` at zero-based iteration 19, score
  1065.0984973977909, validation FAIL.
- Replaying the final point (`final-point-replay.json`), all 9 attempts are
  refused and none is admitted.
- For every attempt, `domain-witness.json` names `ValueError: Flat segment
  lacks a declared channel hold` (`curves.py:131`). The largest move each time
  is `hip_z[3]` (at −25.115230403571697) taking the full −0.5 trust step.
  `foot_z[7]`, `foot_z[8]` and `foot_z[9]` follow.

Evidence alias `pose-domain-contract-20261121T175608Z`, read-only probes at
the fourth fit's final point:

- **Shares at the fit point.** `branch-shares-domain-fit.json` measures 12
  branches and 59 segments.
  - **Hips stop dead.** The hip-height segment from frame 11.99 to 13.2 (key
    "0.49" after timing moved it, to the fixed lowest point) holds 2.2e-12 of
    its branch.
  - **The swing foot hovers.** Three consecutive near-foot height segments,
    frames 18.82 to 20.76, hold 2.29e-8, 1.72e-6 and 1.18e-7 of the lowering
    branch.
- **Comparison with smooth motion.** `floor-check-domain-fit.json` compares each
  segment with a smooth (cosine) motion between the same branch ends, at the
  same key times. "Ratio" = the fitted share ÷ the smooth share.

  | Segment | Frames | Ratio |
  |---|---|---|
  | Hip height, into the lowest point | 11.99 → 13.2 | 2.28e-11 |
  | Near foot height, lowering | 18.82 → 19.37 | 2.38e-7 |
  | Toe roll, rising | 12.72 → 12.97 | 0.00613 |
  | Hip forward travel | 1.94 → 2.69 | 0.0866 |
  | Hip height, first rise after the lowest point (the visible sag) | 1.2 → 2.99 | 0.211 |

  Nine segments are under 0.5.
- **The authored starting walk.** `floor-check-initial.json`: 9 of 59 segments
  are under 0.5. None is under 0.09 (lowest: heel, frames 22.56 → 23.52, ratio
  0.0912).
- **The picture.** `hip-and-foot-fix.html` (data `hip-and-foot-fix.json`) draws
  the fitted hip height and near-foot height. It also draws those curves with
  every branch blended halfway to smooth, and fully smooth, all through the
  real `Curve` and PCHIP code.

Hashes (SHA256):

- fourth fit `fit.json` `49f41e7b066a3aa004f21e85c0238f59318558537419b97a1d3a049cf70819e0`
- `final-point-replay.json` `b3ce2940a26adfcba47a66daf8c4c85fc72f40808dd651490416a612c780f079`
- `domain-witness.json` `bc504b540e094bd318967a534b8df8cea55cb2b57ff9a01af995b4a766196ccf`
- `flat-witness.json` `36f4a153f6ff04e7cf70425b1f61acb8418556612dc379b473d3d018e5c44fed`
- `branch-shares-domain-fit.json` `3401571f51a686d1a374eedacef78685b772682489fcbd682b9ef4331f905908`
- `floor-check-domain-fit.json` `e995b61efa7d304e8b8a01bd1c452c8ecc01c3e04f3c73249420fde08e1a8dcd`
- `floor-check-initial.json` `b4bfd9a7968b814e385a2179103d25383ea9d812f48f4479646b82d8614a56db`
- `hip-and-foot-fix.html` `d13a5cf79c6615074d13c144370a5407974dacacee4ec81e65a3dce6638c86a0`
- `hip-and-foot-fix.json` `b0e3e101ad2e3ad48ec10ce05b78fc43825492b01855b8c9da476e28a643e57e`

### Rule 20 inventory

Base: origin/main `3802836`, which merges PR 181. Stdlib Python only. Current
owners:

- Branch encoding and decoding: `PoseChart.__init__` (encode, `fitting.py:106-132`)
  and `PoseChart.build` (decode, `fitting.py:134-161`). Only `PoseChart` reads
  or writes branch shares.
- Key times: `TimingChart.layout` (`fitting.py:243-256`). `TimingChart.build`
  (`fitting.py:258-271`) decodes values first, then overwrites key phases.
- Pose domain: the `abs(x) > 35` refusal in `PoseChart.build` (`fitting.py:135`),
  `PoseChart.step_bounds` and `PoseChart.project` (`fitting.py:163-168`).
- Starting sources and receipts: `fit()` (`fitting.py:566-640`), with
  `source_signature` at `fitting.py:575-576`.
- Forward-mode math: `differential.cos` (`differential.py:188`) already exists.

Tests touching these: `test_fitting_numerics.py`, `test_timing_domain.py`,
`test_measurement.py`, `test_validation.py` and the frozen fixtures they read.

### Correct Fix Must Touch

- **A motion floor, by construction.**
  - One named constant, `MOTION_FLOOR = 0.5`, with its reason in a comment.
  - For every monotone branch the pose chart encodes, each interior key's
    cumulative share becomes `MOTION_FLOOR*S(p) + (1-MOTION_FLOOR)*C`:
    - `C` is today's cumulative share, from the same coordinates.
    - `S(p) = (1-cos(pi*u))/2` is a smooth ease between the branch's two end
      times. `u` is the key's time along the branch, measured from the same end
      the encoding measures from.
  - There are 12 branches:
    - hip forward travel;
    - hip height rise and fall;
    - near/far foot forward swing;
    - foot height lift and lowering;
    - heel to its lowest point and back (across the seam, using unwrapped times);
    - ball roll rise and fall;
    - toe roll rise and fall.
  - Branch ends do not change. That covers anchors, holds, turning points and
    the envelope values (stance plant, hip lowest and highest, foot peak, heel
    lowest, ball and toe peaks).
  - **Consequence.** Every segment moves at least half as much as smooth
    motion would over the same frames. Because timing keeps keys at least a
    quarter frame apart, no interior share can make a segment flat. A parked
    key cannot be represented, so it never needs to be refused.
- **The value chart sees the real key times.** `PoseChart.build(values,
  phases=None)` takes the timing layout. `TimingChart.build` passes
  `dict(layout.profiles)`. Without timing, `PHASES` is used. Derivatives flow
  through `differential.cos` in both coordinate groups.
- **The solver honors the pose domain.**
  - A named `POSE_COORDINATE_LIMIT = 35.` replaces the literal at
    `fitting.py:135`. `build` keeps refusing outside it, so every other caller
    still fails closed.
  - `PoseChart.step_bounds` clips the trust box to the domain, with the same
    exact form and precondition as `TimingChart.step_bounds`
    (`TRUST_LIMIT <= POSE_COORDINATE_LIMIT/2`).
  - `PoseChart.project` applies the same `BOUND_TOLERANCE*TRUST_LIMIT` clamp to
    the wall, and returns a larger excess unchanged.
  - `TimingChart.project` delegates its value part to `value_chart.project`.
- **Receipts and starting sources.**
  - `source_signature` gains `MOTION_FLOOR` and `POSE_COORDINATE_LIMIT`. Old
    checkpoints therefore refuse a plain `--resume`, because the same
    coordinates now draw a different walk.
  - A new explicit `--carry <fit.json>` starts from an old checkpoint's
    coordinates as they are.
    - It requires an identical parameter inventory and the same timing mode.
    - It counts as the one starting source, so it cannot be combined with
      `--resume`, `--seed` or `--value-seed`.
    - It records the input SHA256 and the prior `source_signature`.
  - Encoding (`PoseChart.__init__`, seeds, the authored start) is unchanged.
    Every coordinate vector is valid, so no seed is refused for being below the
    floor. The decoded start is the authored shape blended halfway to smooth.
- **Tests, a fixture, README and this contract's proof sections.**
  - A new frozen fixture holds the fourth fit's final coordinates (values only,
    no paths). No existing fixture is edited.
  - The README's fitting paragraph states the motion floor and the pose domain.

### Rejected alternatives

- **Declaring a hold on the hip bottom.** Juan's direction is that the hips
  never stop dead. It would also only move the wall: the foot hovers next.
- **A box bound on the share coordinates only (PR 181 style).** A box keeps
  the shares above the 1e-12 flat threshold, but the hip would still sit at
  about 1e-9 of its bob for over a frame, which is parked to any eye. The
  current points are already deep in that region (`hip_z[3]` −17.6 at the third
  fit, `foot_z[9]` −21.4), so a box tight enough to prevent the flat would
  refuse both checkpoints.
- **Raising the curve rule's flat threshold.** That is a validator rule.
  The fitter would still refuse the whole step at the new threshold.
- **A penalty term in the objective.** Soft: a step can still land in the
  wall, and the term changes the score Juan's earlier fits were measured by.
- **Fully smooth branches (floor 1).** Every share coordinate's Jacobian column
  becomes zero. The fitter loses the shaping it needs for the knee, foot and toe
  rules.
- **A band of free deviations around smooth.** Deviations can reverse a
  near-flat segment and create an undeclared extra turning point. The curve
  rule refuses that too, so it is the same wall.
- **Different floors per body part.** No demonstrated need. One constant, one
  meaning.

### Must Not Change

- The validator, every gait rule, reference band, acceptance limit and the
  shared admission.
- The objective's terms and weights.
- Anchors, holds, turning points, `PHASES`, `ACTIVE`, the quarter-frame minimum
  spacing, the key cap and PCHIP.
- `TRUST_LIMIT`, `TIMING_COORDINATE_LIMIT`, the timing chart's encoding, the
  solver, the verdicts, damping and the attempt budget.
- Coordinate encoding and parameter inventory. Seeds and value seeds keep
  working.
- The existing frozen fixtures, sealed evidence and the backup branch.
- No fit run, no saved animation, no scene writes. No dependency.

### Restriction and mechanism

- **Motion floor 0.5: every segment moves at least half as much as smooth
  motion.**
  - It excludes parked, hovering and sagging keys.
  - Need: Juan's direction, and the flat wall that stopped the fourth fit.
  - A lighter floor does not meet the need. The visible hip sag (frames 1.2 →
    2.99 and 13.2 → 14.99) has ratio 0.211. A floor of 0.25 would only
    guarantee a share of about 0.051 there, against 0.043 today, so the sag
    could stay. A floor of 0.5 guarantees about 0.10.
  - Upper limit: steady forward travel moves at 2/π (about 0.64) of smooth
    motion's mid-branch speed. A floor above 2/π would forbid the hips from
    travelling forward at an even pace. 0.5 is under it.
  - **Cost, stated plainly.** The decoded start, and any carried checkpoint, is
    not the same walk. Nine authored segments and nine fourth-fit segments are
    rounded toward smooth. The picture shows the hip and swing-foot change.
  - **Kept, pending Juan's acceptance of this contract.**
- **The ±35 pose domain.** Need: overflow and conditioning. It is the same
  reason as the timing domain and was already enforced by refusal. **Kept**, now
  as a solver bound.
- **Whole-step refusal when one pose coordinate crosses.** No need.
  **Corrected.**
- **Carry requires an identical inventory and timing mode.** Need: values are
  read by position. It fails closed and excludes nothing valid. **Kept.**
- **No floor on envelope spans.** Out of scope, not a restriction: the bob's
  depth and the foot, ball and toe peaks could in principle shrink to flat
  through their own coordinates. None is near: the largest envelope `|v|` at
  the fourth fit is 3.1044. A span floor would need a gait number (the smallest
  allowed bob) that only Juan can set. It is deferred to its own issue.
- **Mechanism.** Parked keys become unrepresentable: the chart's decoding
  cannot produce them. That is the strongest tier the owner supports. The
  domain cap uses the solver's existing active-set bounds. No new dependency or
  framework.

## Assumptions / blockers

- **Carrying changes the walk, and the score.** The carried point draws the
  blended walk, so its score and violation counts differ from 1065.098 and
  1224. They may be higher.
- **A passing walk is not predicted.** This slice removes a wall and enforces
  Juan's direction. Acceptance is still the unchanged validator.
- **Other walls may follow.** The quarter-frame spacing is already binding for
  three keys, and the envelope route above stays open.
- **The fixture adds the fourth fit's coordinates** (98 numbers) to the repo.
  They are numbers only: no path, name or private data.

## Verification plan

1. **Before-code receipts (done).** The fourth fit's evidence and the
   share/floor probes, hashed above.
2. **Fail first.** A regression at the new frozen fixture: iteration 0 admits a
   step, and no segment is flat. On base `3802836` the same point refuses all 9
   attempts with the flat-segment error.
3. **Floor property, both sides.**
   - For many random coordinate vectors inside ±35 (values) and ±20 (timing),
     `build` never raises the flat-segment or extra-turning-point error, and
     every segment's share is at least `MOTION_FLOOR` × its smooth share, to
     rounding.
   - With the floor set to 0, decoding is bit-identical to base at both frozen
     points. This is the parity check that only the floor changed.
   - A share coordinate at −35 still leaves its segment at the floor.
4. **Pose domain probes.** These mirror PR 181's probes: `step_bounds` for an
   interior coordinate, near each wall and on each wall; the exact-landing
   property; and `project` at the tolerance and just above it, for both signs.
   `TimingChart.project` delegates its value part.
5. **Carry.** It refuses a mismatched inventory, a mismatched timing mode and
   two starting sources. It records the prior signature and input hash. A plain
   `--resume` of an old checkpoint is refused.
6. **Mutation.** One mutant per clause must be caught, with every survivor
   explained:
   - the floor constant at 0;
   - each branch's floor removed;
   - `S` measured from the wrong end;
   - untimed phases used in timing mode;
   - each pose bound side, and each project side;
   - the value-part delegation;
   - each carry check;
   - each signature field.
7. **Picture and suite.**
   - Re-draw the hip and swing-foot picture from the real chart at the carried
     point, and send it to Juan.
   - The full pure walk suite passes.
   - Cold-audit the diff.
   - Evidence goes outside the worktree, with directories mode 700 and files
     mode 600, pinned by SHA256 in the PR.
   - No fit runs until Juan separately authorizes one.

## Contract Amendments

Juan accepted this contract on 2026-11-21 ("Accept the contract"). These three
amendments came up during implementation. None changes the floor, the pose
domain, a gait rule, an acceptance limit or the objective.

Evidence alias `pose-domain-contract-20261121T175608Z`, hashes (SHA256):

- `before/regression-fails.log` `923b697a00a3094195c45eae1d229404751ba9072b8bb63d9ae37f9a575b7633`
- `parity/parity.py` `15ae3e90922c3dd28f61b7748b9462660c004d5297112fc75c361fea786f4e25`
- `parity/base.json` = `parity/branch-floor0.json` `eef1013f02c4f955b0b6d68aa8c6b30af841fbc54d45593f4815b185bcbfb6d5`
- `parity/branch-floor-half.json` `e8332892b60dadb1e6ef26d68e30faab49f22381dfd8493061c8f8646a6a5464`
- `reach-probe.py` `f24d91108bd17b92edc35479c7e3469b4cfeeea4ae495933dd83b326b086a05c`
- `reach-probe-flat-stop.json` `0fdaebd674a51984d4f01112e4867e6edd6c7617792d3cad14aed3c59aa7e23d`
- `project-probe.py` `de5a69a9a756f43e0d8b305543b26d42becac5217265b41f5ae95db21ca5dfb3`
- `project-probe-flat-stop.json` `a30aba563353f5cdebd48a34159fed9def6fb2e1f4fc28b18c96431d8a5ba1f4`
- `crouch-probe-flat-stop.json` `b24d29d682c02aed8538068a407233a87a793d00b80d568266ae3108f312f882`

### Amendment 1: starting points change only where they park

**Finding.** The contract carried an old checkpoint's coordinates as they
are, and kept today's encoding. Under the new decoding, that blends every
branch halfway to smooth, including segments that already move well.

At the fourth fit's stop, the blended walk breaks the reach guard
(`Objective.residuals`, "Search proposals must remain strictly reachable").
It cannot start a fit. `reach-probe-flat-stop.json` measures the worst leg
over-reach:

| Floor | Worst over-reach | Frame | Schedule frames over |
|---|---|---|---|
| 0.1 | 0.0024560198674570266 | 9.25 | 10 |
| 0.5 | 0.0193708291078748 | 9.5 | 26 |

The main cause is the hip's forward travel. It is nearly steady, and the
blend reshapes it toward ease-in-out, which pushes the hip ahead of the
planted foot in late stance.

**Amended clause.** Decoding is unchanged:
`MOTION_FLOOR*S(p) + (1-MOTION_FLOOR)*Q`, with any coordinates valid. Encoding
key values into coordinates (`PoseChart.encode`, used by the constructor for
the authored start and seeds, and by `--carry`) becomes the nearest
representable walk:

- A segment already at or above the floor keeps its shape.
- A segment below the floor is raised to exactly the floor.
- The above-floor segments of that branch give up their excess
  proportionally.

In coordinates:

- Each gap's excess over the floor is `q_i = g_i - MOTION_FLOOR*f_i*span`.
- Negative excess is set to `e^-30` × the branch's largest excess. This keeps
  every coordinate well inside ±35.
- Each coordinate is `log(q_i/q_last)`, today's formula on the excess.

With the floor at 0, `q_i = g_i` exactly, so encoding is bit-identical to base.
`--carry` decodes the old checkpoint with the floor-0 decoding it was made
with, takes the key values at its timed key times, encodes them, and keeps the
timing coordinates as they are.

**Finding behind Amendment 2.** With only the parked segments raised
(`project-probe-flat-stop.json`, floor 0.5, 13 segments raised), the leg
still over-reaches by up to 0.001994397708082074, around heel strike (18
schedule frames over, from frame 0 through 24).

The fit had parked the hips at their lowest exactly as the front foot lands,
because the leg needs the hips that low to reach the foot. Hips that keep
moving are still just above their lowest point at that instant.

### Amendment 2: a carried start drops the hips just enough to reach

**Amended clause.** After encoding, `--carry` lowers the whole hip-height
curve by the smallest drop for which the objective scores the start. That
drop is found by bisection on `[0, bob height]`:

- Lowering the hips only shortens the hip-to-foot distance, so feasibility is
  monotone in the drop.
- It refuses if even a whole-bob drop does not score.
- It records the drop in the receipt.

At the fourth fit's stop, the drop needed is 0.00213245783661149
(`crouch-probe-flat-stop.json`). That is 7.4% of the bob and 0.23% of the
hips' lowest height.

This sets only the starting point. The hip envelope coordinates stay free, so
the fit can raise the hips again wherever the leg allows.

Restriction-need: it excludes nothing, and only a start that cannot be scored
triggers it. **Kept.**

### Amendment 3: the floor is a chart parameter, and historical fixtures keep their decoding

`PoseChart(seed=None, floor=MOTION_FLOOR)` admits a float in `[0, 1)` and
refuses anything else.

`fit()` always uses `MOTION_FLOOR`, and the source signature pins it. The
parameter exists so that a chart can reproduce a historical decoding. The
parity check needs it, and so does every existing test that pins solver or
derivative mechanics at a frozen point.

Those points were recorded under floor 0. Under floor 0.5 all of them are out
of the reach domain (`parity/branch-floor-half.json`: every score is `inf`).
Those tests build `PoseChart(floor=0.)`, and no assertion changes. The cold
audit lists each one.

**Amended verification 3.** The parity check is `parity/base.json` =
`parity/branch-floor0.json`, already shown above.

**Amended verification 6.** Mutants are added for:

- the encoding floor term;
- the negative-excess clip;
- the carry drop bisection on each side;
- the drop refusal.

### Amendment 4: the timing-only geometry check keeps floor 0, and the new coupling has its own test

`test_geometry.py` checks that moving key times never changes key values. The
accepted contract changes that on purpose: the floor's smooth reference is
measured at the timed key times, so values now follow timing. With floor 0 the
old property still holds exactly, so that test builds `PoseChart(floor=0.)`,
and no assertion changes.

`test_motion_floor.TimedKeysTests` covers the new behavior. Building through
the timing chart equals building the value chart with the timed key times.
Building the value chart with the untimed key times differs.

Restriction-need: no restriction is added. **Kept.**

### Amendment 5: one owner for the branches, and a carried start the fitter can differentiate

Both came from the cold read and the repository's seam check after the first
push.

- **One table owns the branches.** The 12 branch ends, measuring directions
  and key orders had been written twice, once in `encode` and once in
  `build`. A module table, `BRANCHES`, and one function, `progress`, now own
  them, and both sides read them.
  - Whether a key lies past the seam is read from its authored phase. Timing
    keeps every key between the same anchors, so the timed phase would decide
    the same way. (A first draft of this amendment said a timed comparison
    would break the derivative. Mutation showed it does not; the failure seen
    then was the reach-hinge tie below.)
  - A test checks that every branch end is a fixed anchor, that every key lies
    between its ends, and that the keys run in measuring order.
- **The carried start steps off the reach hinge.**
  - The smallest scoring drop leaves a leg exactly on the reach guard's
    boundary. There, the reach residual's hinge ties exactly, and the forward
    derivative refuses it as nonsmooth. The fitter then could not take its
    first step. The first implementation avoided this only by rounding luck.
  - After bisection, the drop now steps up from the boundary by doubling
    increments, starting at one ulp, until the first derivatives resolve. It
    refuses if that never happens within one bob.
  - At the fourth fit's stop this took 10 derivative checks and moved the
    drop by a few ulps.

No restriction is added. **Kept.**

### Amendment 6: encoding stays in the domain, the carry search stays representable, and value seeds keep their chart

Three findings from the automated review of `19e0caf`, each checked against
the code:

- **Encoded shares stay inside the domain by construction.**
  - `encode` replaced only a non-positive excess. A positive excess far below
    the branch's largest (a segment just above the floor, after cancellation)
    still gave `log(v/q_last)` past ±35. So did a tiny last excess. `build` then
    refused the start.
  - **Amended clause.** Every excess is raised to at least `e^-30` × the
    branch's largest. That keeps every share coordinate within ±30, inside the
    ±35 domain. At floor 0 this changes nothing that base could represent.
    Parity is rechecked.
- **The carry search stays inside the hip envelope.**
  - The bisection tried a whole-bob drop first. When the hips' lowest point
    sits closer to the .83 envelope than one bob, that drop cannot be encoded
    and the carry raised, even when a smaller drop scores.
  - **Amended clause.** The upper end of the search is the smaller of one bob
    and the largest drop that keeps the encoded lowest-hip coordinate one unit
    inside the ±35 domain. The "no drop" refusal then speaks only for drops that
    can be represented.
- **Value seeds keep the chart they were made with.**
  - `--value-seed` copied coordinates after checking only the parameter
    inventory. A value checkpoint made before the floor would be decoded
    differently, as a different walk.
  - **Amended clause.** A value seed must carry the current value-only source
    signature. A pre-floor value checkpoint is refused, with the supported path
    named in the error: carry it first (`--carry`, without `--timing`), then
    use that checkpoint as the value seed.
  - Restriction-need: it fails closed on a walk the seed would silently change,
    and the named migration path excludes nothing. **Kept.**

Each clause gets a test on both sides and a mutant.

## Implementation summary

Implemented to the contract as amended (Amendments 1 to 6). The code commits
are:

- `c0da886`: the floor, encoding, domain and carry;
- `0554bad`: carry only pre-floor checkpoints;
- `8e1d296`: the branch table, the differentiable carry and the review fixes;
- `67be16c`: one owner for the hip envelope, and encode checks its own domain;
- `7d58251`: one domain predicate;
- `b8ab87f`: a redundant check dropped and the seam note corrected.

What changed:

- **`PoseChart` decodes with a motion floor.** Each interior key of the 12
  moving branches sits at `MOTION_FLOOR*ease(u) + (1-MOTION_FLOOR)*Q`. The ease
  uses the key's timed phase, and `Q` is the old free share. A parked key
  cannot be represented.
- **One table, `BRANCHES`, owns each branch's ends, measuring direction and
  key order.** `progress` reads it, and so do both `encode` and `build`.
- **`PoseChart.encode` changes only segments below the floor.** It keeps every
  share coordinate within ±30, and refuses any output outside the pose domain.
- **One predicate, `in_pose_domain`, owns the ±35 domain.** `build`, `encode`
  and `step_bounds` use it. The solver honors the domain as step bounds, and
  `TimingChart` passes its layout and delegates the value part of `project`.
- **`HIP_HEIGHT_ENVELOPE` owns the rig's hip-height envelope.**
- **`--carry` re-encodes a pre-floor checkpoint.**
  - It lowers the hips by the smallest drop that scores, searching only
    representable drops.
  - It steps off the reach hinge until the derivatives resolve.
  - It refuses newer checkpoints.
  - It records the drop and the prior signature.
- **Value seeds must carry the current value-only signature.**
- **No change** to the validator, the objective, gait limits, anchors,
  spacing, the solver, verdicts or damping.

## Cold Diff Audit

Diff `origin/main` (`3802836`) `..b8ab87f`, read cold.

### Gaps

- **No fit was run, and no passing walk is predicted.**
  - The fourth fit's stop now admits a step (the regression test).
  - The walk it restarts from scores 34771.291268078225, against
    1065.0984973977909 at the stop (`carried-start-final.json`). Holding every
    key to the floor fights the other rules at first.
  - Whether a fit recovers that, or reaches PASS, is unproven.
- **The first attempt at the carried start is refused by the reach guard.** The
  start sits just off the reach edge (the smallest drop, plus the few ulps
  needed to resolve the derivatives). Raised damping then admits a step.
- **The carry bisection treats "scores" as "reaches".** At the fourth fit's
  stop the only refusal is the reach guard. If another rule refused a carried
  start, the search would find a boundary that reach does not explain.
- **Envelope spans can still go flat.** Issue 183 records this. The property
  test keeps envelope coordinates within ±8: at ±35 a branch height collapses
  to flat (205 of 300 random vectors refused, none with envelopes within ±8).
- **One equivalent mutant survives:** the seam decided from the timed phase.
  Timing keeps every key between its anchors, so both choices decide the same
  way.
- **The authored start was already outside the reach domain on base**
  (`parity/base.json`: `initial` and `value-initial` score `inf`), and it still
  is.
- **Fail-first evidence predates the carry path.** `before/regression-fails.log`
  ran the first version of the regression on base `03725f3`. The committed
  regression calls `carry_start`, which base does not have.
  - The base behavior it guards is all 9 attempts refused `out_of_domain`.
  - The fail-first for each review finding was shown instead by a test that
    fails on the old code: the float-step encoding scan, the
    near-envelope carry and the value-seed signatures. The mutants
    "encode clip only non-positive excess", "carry bracket whole bob" and
    "value seed chart check" are all caught.
- **Two problems the cold read and review caught after the first push.**
  - The first push's carry depended on rounding luck to avoid the reach-hinge
    tie.
  - The first push restated the branch rules and the hip envelope in more than
    one place.

  Both are fixed (Amendments 5 and 6).
- **PR size.** Code and tests are 860 added lines. The contract, with its six
  amendments and this audit, takes the PR past about 1,000 lines. The fixture
  is 105 lines.

### Change By Change Reconstruction

- **`fitting.py:50`.** `HIP_HEIGHT_ENVELOPE = (.83, 1.)`. `PoseSpace.build`,
  `encode`, `build` and `carry_start` read it.
- **`fitting.py:106-149`.** The constants and helpers:
  - `POSE_COORDINATE_LIMIT = 35.` and `in_pose_domain(v)` (`abs(v)<=limit`;
    NaN and infinities fail the comparison);
  - `MOTION_FLOOR = .5` with its reason, and `ease(u)`;
  - `BRANCHES`, the 12 branches;
  - `progress`, which reads the seam crossing from the authored phase.
- **`fitting.py:164-172`.** The constructor admits `floor` (a float in
  `[0, 1)`) and encodes at `PHASES`.
- **`fitting.py:174-214`.** `encode` computes, per branch:
  - each gap's excess over `floor*smooth*span`;
  - every excess raised to at least `e^-30` × the largest;
  - log ratios to the last gap.

  It refuses any output outside the domain. Floor 0 gives the old formula.
- **`fitting.py:216-259`.** `build(values, phases=None)` does the following:
  - refuses inputs outside the domain and an incomplete phase profile;
  - in `ramp` and `share`, blends `floor*u` with `(1-floor)` of the old share
    (`zip(strict=True)`);
  - takes each branch's progress from `progress`.
- **`fitting.py:261-273`.** `step_bounds` and `project` mirror `TimingChart`,
  using the pose domain.
- **`fitting.py:365, 397`.** `TimingChart.build` passes its layout, and
  `TimingChart.project` delegates the value part.
- **`fitting.py:671-684`.** `_signature`, `source_signature` (which adds the
  floor and the limit) and `floor_zero_signature` (the base formula).
- **`fitting.py:686-738`.** `carry_start`:
  - checks the inventory, the timing mode and the pre-floor signature;
  - decodes with floor 0 at the old layout, then re-encodes;
  - bounds the search by one bob and by the hip envelope one unit inside the
    domain (`fitting.py:722`);
  - bisects (`CARRY_BISECTIONS = 60`), then steps the drop up from the
    boundary by doubling increments from one ulp until the derivatives
    resolve;
  - refuses when no representable drop works.
- **`fitting.py:741-796`.** `fit`:
  - counts the carry as the one starting source;
  - requires the current value-only signature on a value seed
    (`fitting.py:765`);
  - records `carried_from_signature` and `carry_hip_drop` (`fitting.py:796`).

  The CLI gains `--carry` (`fitting.py:833`).
- **`README.md:202-212`.** States the floor, the pose domain and carry.
- **Tests:**
  - **`tests/test_motion_floor.py` (new):**
    - `FloorConstantTests`: the constants, admission, and the branch-table
      anchors and order.
    - `FloorPropertyTests`: 300 random vectors, the wall case, and floor 0
      parking.
    - `EncodingTests`: the round trip, projection, the float-step domain scan,
      encode's domain refusal, and the floor-0 formula.
    - `TimedKeysTests`, `PoseDomainTests` and `CarryTests` (the refusals, both
      bisection sides, the hinge step-off, the near-envelope carry, value-seed
      signatures and the receipts).

    Its `branches()` restates the branches independently of the code.
  - **`tests/test_motion_floor_regression.py` (new).** The fourth fit's stop
    admits a step after carry.
  - **`tests/frozen-flat-stop.json` (new).**
- **Historical tests pinned to `PoseChart(floor=0.)`, with no assertion
  changed (Amendments 3 and 4):**
  - `test_differential.FrozenTests`;
  - `test_fitting_numerics` derivative stop, outer step and saturated
    coordinate;
  - `test_interval_motion.FrozenFitTests`;
  - `test_timing_domain.FrozenTimingWallTests`;
  - the `test_geometry` timing-only check.

### Contract Traceability

- **Motion floor by construction:** `fitting.py:117-149, 216-259`.
  - Tests: `FloorPropertyTests`.
  - Mutants: floor constant, linear ease, both blend terms, each of the 12
    branches, the table's wrong end, wrong key order and wrong end phase,
    seam unwrap removed.
- **Real key times:** `fitting.py:365`.
  - Test: `TimedKeysTests`.
  - Mutants: untimed phases, phase admission.
- **Pose domain:** `fitting.py:106-111, 261-273, 397`.
  - Test: `PoseDomainTests`.
  - Mutants: predicate limit, predicate admits NaN, each domain check removed,
    each bound side, each project tolerance, delegation.
- **Encoding (Amendments 1 and 6):** `fitting.py:174-214`.
  - Tests: `EncodingTests`.
  - Mutants: floor term, clip removed, clip only on non-positive excess,
    domain check removed.
- **Carry (Amendments 2, 5 and 6):** `fitting.py:686-738`.
  - Tests: `CarryTests` and the regression.
  - Mutants: inventory, timing, pre-floor signature and its formula; feasible
    start lowered; drop refusal; whole-bob bracket; each bisection side; the
    step-off skipped or started above the boundary.
- **Value seeds (Amendment 6):** `fitting.py:765`.
  - Mutants: check removed, checked against the timed chart.
- **Hip envelope owner:** `fitting.py:50`.
  - Mutant: envelope bottom moved.
- **Receipts:** `fitting.py:671-684, 796`.
  - Mutants: each signature field, carried signature, drop recorded.
- **Floor parameter:** `fitting.py:164-167`.
  - Mutants: admission type and range.
- **README:** `README.md:202-212`.

### Verification

Run from the worktree with stdlib Python. Evidence alias
`pose-domain-contract-20261121T175608Z`.

- **Fail first, on base `03725f3`.** `before/regression-fails.log`
  (`923b697a00a3094195c45eae1d229404751ba9072b8bb63d9ae37f9a575b7633`): all 9
  attempts `out_of_domain`.
- **Parity.** At floor 0 the output equals base: `parity/base.json` =
  `parity/branch-floor0-final.json`
  (`eef1013f02c4f955b0b6d68aa8c6b30af841fbc54d45593f4815b185bcbfb6d5`). It
  covers all four frozen points and both starts, rechecked after every code
  commit.
- **Full suite at `b8ab87f`.**
  `python3 -B -m unittest discover -s storybook/animation/maya_walk/tests -p 'test_*.py'`
  ran 184 tests, OK: `after/suite-final.log`
  (`bcb7377d2c65a84cef62ec8f19250a8ece71d4dc75b7d85216a5184b354feb79`).
- **Mutation.** Each harness copies `storybook/` per mutant and runs the full
  suite, with a timeout of ten times the control time, at least 120 s.
  - **Runs 1 to 3**, on `c0da886` and `0554bad`, are kept with their hashes
    in the history above: 42 mutants, 41 caught, then the survivor closed by a
    test.
  - **Run v2** was stopped when the review fixes changed the code. Its
    partial log is kept: `mutation/run-v2.log`
    (`ff40928bcac8ac02172c4f33ea9f970672ad05a994fc5cbc9bd3b0970c2efd58`).
  - **Run v4 on `7d58251`**, harness `mutation/mutate-v4.py`
    (`c0adcf1544c09635b4b2b4b64c2fdf40d72cb3b2bc26147a040d838e01dacdaa`): 56
    mutants, 54 caught, 0 by timeout. Files: `mutation/mutation-report-v4.json`
    (`a9f8993d4375f3a5c7d08f519a33789b7695e6dfaceff066dd8441043f282d2b`) and
    `mutation/run-v4.log`
    (`62cbe5bc201851621ce43929950cafd849f5710bf6b900622ed3eea1edb0b1ab`).
  - **The two v4 survivors:**
    - The redundant finiteness check was removed in `b8ab87f`.
    - The seam choice is equivalent and stays, explained.
  - **Run v5 on the final tree**, harness `mutation/mutate-v5.py`
    (`fda1cb021e6b7de953e63c98f5338c02e879d08f8722e677917ee402f8ad0df2`):
    every domain mutant, plus the seam one. Domain mutants: predicate limit,
    predicate admits NaN, and the build, encode and bound checks each removed.
    All caught; the seam mutant survives, as explained. Files:
    `mutation/mutation-report-v5.json`
    (`034f4b7c3abcb151934e4e766055c00b8a1328e6c18c138ffe541a7dc9657816`) and
    `mutation/run-v5.log`
    (`2e468864121dc31a1c69d56753cc7ed318db7eb8d25fb85c54970a0440818278`).
- **Picture of the real carried start, from the final code.**
  `carried-picture.py` drew `carried-start-final.html`
  (`f90fc9aef64d00a3783cfdcb113fb10cc3c2610bd76a8a4a677266b9ccb737e7`), with
  data in `carried-start-final.json`
  (`433be02174bc9e2eac3af6a06ae72765f97e71bc235133976e6d4c544c0e322a`). The
  hip drop is 0.0021324578366134776.
- **Fixture.** `frozen-flat-stop.json`
  (`85864d17d2173a5d7a108e79c029c652f772f0e8c84ecf5655d477d8e802865d`).

### Gap audit

- DONE: motion floor, branch table, timed keys, pose domain, encoding, carry,
  value seeds, receipts, README.
- DONE: fail-first, parity, boundary probes on both sides, mutation (one
  equivalent survivor, explained), the full suite, the picture, the three
  review findings.
- NOT DONE, out of scope:
  - a fit run;
  - the envelope-span floor (issue 183);
  - a passing walk.

  Each needs Juan's separate decision.

`mechanism:` parked keys unrepresentable by the chart's decoding; one table
owns the branches, one predicate the domain, one constant the hip envelope;
the pose domain is active-set bounds in the existing solver; carry and value
seeds are admitted by named signature functions | strongest tier this owner
supports | justified.

`restriction:`
- Motion floor 0.5 | Juan's direction and the flat wall | kept (accepted
  2026-11-21).
- ±35 pose domain | overflow and conditioning | kept, as a solver bound and in
  encode.
- Whole-step refusal | no need | corrected.
- Carry requires the inventory, timing mode and pre-floor signature | values
  are read by position, and are decoded with floor 0 | kept.
- Value seed requires the current value-only signature | a pre-floor seed
  draws a different walk; the error names the migration path | kept.
- Floor admission `[0, 1)` | floor 1 zeroes every share column, and a
  negative floor breaks the guarantee | kept.
- Envelope-span floor | needs Juan's gait number | deferred (issue 183).
