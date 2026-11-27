# Maya walk: damping bounds every coordinate's step

## Before Code

### Authority and scope

On 2026-11-26 Juan answered "Write the contract" to "Write the contract for
the solver's scale floor and reach hold?". That authorizes this contract only.
Implementation starts after Juan explicitly accepts it. It does not authorize
a fit, an animation promotion, saved-scene writes, a merge or walk acceptance.

- **What changes.** The bounded and constrained step solves weight their
  damping by a column scale that never falls below 1.
- **Scope narrower than asked.** The question named the reach hold too. Its
  re-measurement on today's main rejects it (see Rejected alternatives), so
  this contract carries the scale floor only. The reach backoff problem is
  tracked in issue 186, which this contract leaves open.
- **What stays the same.** The objective, every validator rule and limit, the
  reach rows and backoff, the chart, the carry and the motion floor.

Base: `origin/main` `e5ebb3148ef8ddf75295a710c8454ab435c9cb6e` (PR 185 merged).
Branch `claude/maya-walk-solver-scaling`, worktree
`~/Desktop/Kennedi_worktrees/maya-walk-solver-scaling/`.

Evidence aliases (beneath `G` = `~/Desktop/codex-evidence/kennedi-storybook/maya-walk-gait-source-2026-11-07/`):

| Alias | Directory | What it holds |
|---|---|---|
| SS | `solver-scaling-20261126T211242Z` | replays and stall-point ladder on `e5ebb31` |
| SF | `scale-floor-test-20261124T235342Z` | the first measurement on `85276ef` (old objective) |
| RF | `reach-fit-20261124T230813Z` | the fit whose stop first showed the defect |
| SI | `scale-floor-impl-20261127T165821Z` | implementation evidence (amendment 1 onward) |

Pinned files (SHA256):

- `SS/scale_floor.py`: `63ad42bf041d4f3836365eb1f5ca312a9591386606b3807064ad08cf03e868c9`.
  It is the candidate, installed in process. It differs from `numerics._scaled_system`
  at this base by one line.
- `SS/replay-current.json`: `7d675fe08ff4c9a759c7db197bc1a8ee53634dc2a9ab053c33ca423a3da60126`
- `SS/replay-floor.json`: `e53b5d7052e4fecceacf0f62d635a639c03f09abc3d7de26b6f0ff314d3d704d`
- `SS/replay-hold.json`: `d4eaf685a491bdd5001b920622984dfbb7818c7eb9c782b873a8b3b680976bcd`
- `SS/replay-floor+hold.json`: `65a798416b698bc37b5ce7c96ed420278dd1e787788d8bac7899ac4283777c2a`
- `SS/stall-point.json`: `2337f1480d99f903da0c027ca3e7e8eaf7e16c30de33431da95aaf17acb03753`
  (the current solver's stall at iteration 44)
- `SS/stall-ladder.json`: `95980364dc6c98e17d4644fc95c132008eae72654730cbf759da66fa524a52c5`
- `SS/suite-with-floor.log`: `9b945008d637fa03b72517c68fd06de96e25697c7e3d4fa9157473176e2bf60b`
- `RF/step-scale.json`: `a92570be39f8798057fc6803264901f754922966cef948f9572f2f06cab11a32`
- `SI/measure_stall.log`: `913b854d378c090695e30deb9b51f53355fd3d9011251174383f4d358289d151`
  (both solves at the stall point, base and candidate; amendment 1)

### Root Cause

**1. Damping does not limit near-flat coordinates.** Both step solves minimize
`||J d - r||² + damping·||D d||²` (`numerics.py:166`).

- **Where D comes from.** `_scaled_system` sets `D_j` to the Jacobian column
  norm `||J_j||`. Only an exactly zero column gets 1
  (`numerics.py:149`: `scales = [s if s else 1. for s in norms]`).
- **The effect.** A coordinate whose column is nearly zero therefore costs
  `damping·||J_j||²·d_j²` to move. At `||J_j||` = 1e-13 that is about
  1e-26·damping·d_j², so no representable damping holds it still. The solve
  moves it to its trust box (0.5).
- **The discontinuity.** A column of exactly 0 is damped with weight 1, but a
  column of 1e-13 with weight 1e-26.

**2. The linear model cannot see the harm.** Those coordinates are flat to
first order at the current point but not across 0.5. The model predicts no
change from their moves while the real score rises.

- **At the reach fit's stop** (`RF/step-scale.json`), at damping 1e6:
  - The solves move `hip_x[1]` (column norm 6.9e-12), `foot_z[7..9]`
    (1.8e-13), `phase_toe[2]` (5.6e-11) and `phase_heel[1]` (5.9e-7) by the
    full 0.5.
  - Every attempt raises the score, at every damping.
  - Damping climbs into the constrained solve's fail-closed range, every
    attempt becomes unsolved, and the fit ends `linear_solve_failed`.
- **On today's main** (`SS/replay-current.json`), the current solver's
  whole-fit replay from the carried start stalls the same way at iteration 44:
  score 13821.75, damping 1.78e17.
- **At that stall** (`SS/stall-ladder.json`), from damping 0.153 to 1e6, the
  current solver's first attempt moves a coordinate the full 0.5 at every
  damping.

### Rule 20 inventory

| Reader | Use |
|---|---|
| `numerics.py:132-161` | `_scaled_system`: the owner of the scales, the normalized columns, the damped system and the scaled bounds |
| `numerics.py:149` | the scale rule |
| `numerics.py:164-199` | `bounded_least_squares`: docstring (lines 166-175) states the rule; the step converts back with `v/s` (line 191); `StepResult.scales` (line 199) |
| `numerics.py:390-486` | `constrained_least_squares`: scaled rows `v/s` (line 423), the step `v/s` (line 473), `StepResult.scales` (lines 416, 483), `_certificate` on the normalized columns (line 343) |
| `numerics.py:40-46` | `StepResult.scales` field |
| `numerics.py:489-515` | `bounded_step` adapter, which calls the solve at damping 0 |
| `fitting.py:688-717` | `admit_step`: the only production caller of both solves |

No existing test pins the scale rule. With the candidate installed in process
the full pure suite passes unchanged: 235 tests OK (`SS/suite-with-floor.log`).

### Correct Fix Must Touch

**1. The scale rule.** `numerics.py:149` becomes
`scales = [max(s, SCALE_FLOOR) for s in norms]`, with `SCALE_FLOOR = 1.`
named once in `numerics.py`.

- **Effect on damping.** Every coordinate's damping weight is then at least
  `damping·d_j²`, so a larger damping shortens every coordinate's step.
- **What doesn't change.** Columns with norm ≥ 1 keep their scale exactly. A
  zero column keeps scale 1, as today. The floor continues the zero-column
  rule instead of contradicting it.

**2. One owner.** Both solves get the rule through `_scaled_system`. No caller
and no other module computes a scale.

**3. Docstring.** `bounded_least_squares` (`numerics.py:170`) states the new
rule: "D contains the Jacobian column norms floored at SCALE_FLOOR".

**4. Tests,** as the Verification plan lists.

### Rejected alternatives

- **Reach hold** (reach row bound `min(REACH_BACKOFF - m, 0)`). It unsticks
  the forced-recovery stall point (`SF/stop-variants.json`). But on `e5ebb31`
  it fails whole-fit replays, alone or with the floor: a reach margin reaches
  exactly 0 and the fit then stalls `linear_solve_failed`, at iterations 47
  and 42 (`SS/replay-hold.json`, `SS/replay-floor+hold.json`). The mechanism
  is not diagnosed. Issue 186 tracks it.
- **Floor only on the damping term,** keeping unit-normalized columns. That
  would put `sqrt(damping)·1/||J_j||` on the damped diagonal, up to about
  1e13 here. The QR rank threshold scales with the largest column norm
  (`numerics.py:76`), so ordinary columns would be refused as rank deficient.
- **Moré's monotone scaling** (`D_j` = the largest norm seen so far). It does
  not help a coordinate that is flat from the first iteration, which is the
  case measured here.
- **A floor relative to the largest column norm.** That adds a tuning ratio
  with no physical meaning. A floor of 1 is the scale the zero-column rule
  already uses, in the chart's own coordinate unit.

### Must Not Change

- **The objective and validation.** The objective and its terms, every
  validator rule, the per-joint limits, reference bands, anchors and holds.
- **Reach and the fit around the solve.** The reach rows, `REACH_BACKOFF`,
  `carry_start`, damping constants and policy (`next_damping`),
  `STEP_ATTEMPTS`, `TRUST_LIMIT`, the chart and its step bounds, and the
  motion floor.
- **The solves' mathematics.** The QR active-set and LSI algorithms, the
  certificates and their tolerances, and the convergence statuses.
- **Scenes, rig, art and the walk.** No fit is run, and no checkpoint,
  animation or scene is written.
- **Dependencies.** None are added.

### Concurrency model

None. `_scaled_system` and both solves are pure, single-threaded functions of
their inputs.

### Restriction and mechanism

restriction:
- **None added.** The floor changes the step metric, not which steps or
  walks are admissible. Every box, row and certificate check is unchanged.

mechanism:
- **The rule's owner.** One named constant in the one owner that builds the
  scaled system, used by both solves. It is the strongest mechanism at this
  owner. **Justified.**

## Assumptions / blockers

- **Coordinate unit.** Chart coordinates are bounded (pose ±35, timing ±20,
  trust 0.5), so 1 is a natural unit for "this coordinate's step costs at
  least damping·d²".
- **Damping 0.** At damping 0 (the `bounded_step` adapter) the minimizer does
  not depend on D. Only the normalization of a column below 1 changes, and
  the existing scaling tests pass.
- **Blocker.** Juan's acceptance of this contract.

## Verification plan

1. **Fail first on the base.** These tests fail on `e5ebb31` for the stated
   reason and pass after.
   - **Synthetic.** A two-coordinate system with one column of norm 1e-13 and
     a nonzero right-hand side. At damping 1, 1e3 and 1e6 the base moves that
     coordinate to its box bound. After the change its step is at most
     `|rhs·J_j|/damping` (the normal-equations bound with `D_j = 1`) and falls
     as damping rises.
   - **Frozen** (amended, see Amendments). `SS/stall-point.json` frozen as a
     test fixture, with values only, at damping 1e2, 1e4 and 1e6.
     - **Base.** Both solves' largest move is 0.5 at every rung.
     - **Box-only solve after.** Its largest move falls at every rung and is
       below 1e-4 at 1e6.
     - **Solve with the reach rows after** (the step `admit_step` scores
       here). Its largest move is below 1e-2 at every rung.
     - This test is about step size; it does not claim admission (see Gaps
       to expect).
2. **Parity.** For any system whose column norms are all ≥ 1 or exactly 0,
   both solves return bit-identical results before and after. The "before"
   is a golden file of exact (hex) results captured on `e5ebb31` from seeded
   random systems plus the existing scaled fixtures. The test rebuilds the
   same systems and compares exactly.
3. **Constrained solve.** The constrained solve with near-zero columns still
   certifies: stationarity, multiplier signs, complementarity, box
   feasibility and rows. Its step equals the bounded solve's when no row
   binds.
4. **Damping 0.** On a system with columns below 1, the minimizer agrees with
   the closed form, and the `bounded_step` regressions pass.
5. **Whole-fit replay, read-only.** From the carried start with the fit's
   flags, using the replay harness in `SS`, against the real code after the
   change.
   - **Gate.** It must not end `linear_solve_failed` within 160 iterations.
   - **Expected from the in-process candidate:** 160 iterations, no refused
     iteration, final score 13531.03, 774 violations.
   - Its numbers are recorded, not assumed.
6. **Suite, mutation and audit.**
   - The full pure walk suite passes.
   - Mutants, each of which must fail a test:
     - floor 0 (today's rule);
     - `min` instead of `max`;
     - a floor applied to only one solve;
     - the floor applied after normalization.
   - A cold diff audit with file:line citations.
7. **Evidence** goes under `G` (directories 700, files 600), cited by alias
   and SHA256.

### Gaps to expect

- **The walk does not pass.** The floor-only replay ends at 774 violations,
  still FAIL.
- **Forced recovery remains.** At the current solver's stall point the floor
  shrinks the step, but a forced margin recovery still raises the score about
  14.2 at every damping (`SS/stall-ladder.json`). The floor-only replay does
  not reach that point, but another start could. Issue 186 tracks this.
- **No fit** is run under this contract. A new fit needs Juan's separate
  authorization.

## Amendments

### 1. Frozen-test wording (2026-11-27, before any code)

Measured on `e5ebb31` with the candidate installed in process
(`SI/measure_stall.log`), at damping 1e2 / 1e4 / 1e6:

| Solve | Base largest move | Candidate largest move |
|---|---|---|
| box only | 0.5 / 0.5 / 0.5 | 4.73e-2 / 7.03e-4 / 7.06e-6 |
| with reach rows | 0.5 / 0.5 / 0.5 | 1.83e-3 / 3.38e-4 / 3.40e-4 |

- **What was wrong.** The accepted wording, "shrinks with damping and stays
  below 1e-2 at 1e2", holds for neither solve.
  - The box-only step shrinks at every rung, but it is 4.73e-2 at 1e2.
  - The step with rows is below 1e-2, but it levels off at about 3.4e-4:
    a reach row inside the backoff forces that move whatever the damping.
    That is issue 186's forced recovery, which this contract leaves open.
- **The amendment.** The frozen test checks each solve for what the floor
  actually guarantees. The box-only step falls with damping. The production
  step stays below 1e-2. The base fails both.
- **Parity "before".** The amendment also names how parity's "before" is
  obtained: a golden file captured on the base, not a reimplementation of
  the old rule inside the test.

No behavior, scope or restriction changes.

### 2. Certified tolerance, one comment, fixture format (2026-11-27)

Order, stated plainly: the tolerance change landed in the code commit
`b2b9808` before this amendment was written. The comment and fixture-format
edits come after it.

- **Synthetic bound.** The bound `|rhs·J_j|/damping` is exact arithmetic. The
  solve certifies its gradient only to its reported tolerance, so the test
  checks `(|rhs·J_j| + tolerance)/damping`. At damping 1e6 the committed code
  returned 2.2e-19 against an exact bound of 1e-19; that is rounding, not a
  defect. The base still fails it by moving 0.5.
- **Comment at `numerics.py:469-473`** (constrained solve's bound clamp). It
  says "a near-zero column turns that into a large miss in real units". With
  every scale at least SCALE_FLOOR, a miss in scaled coordinates is no larger
  in real units. The comment is corrected; the clamp is unchanged.
- **Golden fixture format.** The parity golden file is rewritten with one
  record per line. Its parsed contents must be identical to the file captured
  on the base. This keeps the PR near its size limit.

No behavior, scope or restriction changes.

## Implementation summary

Juan accepted this contract on 2026-11-27 ("I accept the contract").

| Commit | What |
|---|---|
| `fb6af3d` | this contract |
| `d08d299` | amendment 1 (frozen-test wording), before any code |
| `b2b9808` | the scale floor and its tests |
| `a9e8d97`, `30dad14` | amendment 2 and its ordering note |
| `2847bf0` | the clamp comment and the parity golden's line layout |
| this commit | this summary and the cold diff audit |

Evidence under `SI` (directories 700, files 600):

| File | SHA256 |
|---|---|
| `fail-first.log` | `61400d4e84f96a8a22888256c8835a7887726e300139343fbe9cb701b12508a4` |
| `make_parity_golden.py` | `6a67ef908a73e6932459a48c155201e6ce7ed80299a7b88166e2c0aad9b32185` |
| `scale-floor-parity.captured.json` | `7d9a53beb9f8343e20c8bfd4aabfe20dcc9471ca12525f413226013f21d0f603` |
| `suite-final.log` | `917f402547334532b46f0902c92393f72b9af0a47d27b5a2914d7f83d5371897` |
| `mutants.py` | `e595a85621cc35b3afb1096ebbcf32bcf4893b81e5c036dd200bd375555226f7` |
| `mutants.json` | `1513920f2263ef113752bb23296533c7ab2dabefeb7e46020fea071b8b7c5ff6` |
| `replay-real.py` | `c99dd1ae5b045e7677003b75d5601d7e5891b16f6ace52b109c1c46691ce551f` |
| `variants.py` (installs nothing) | `12d49857500772d350a4835fece4bb72bdbc5f6408dc8a6a8f746c11bdb722ca` |
| `replay-real.commit` | `99b3a646a5515b42dbb181b040624e09b2ae87dcfd1c7bff6f20851f9c27fa69` |
| `replay-real.json` | `396055cc73fcaa407a0e361a198d00435ce1704f92f4466bd429ef299aa05f79` |

## Cold diff audit (`e5ebb31..2847bf0`)

### Gaps first

1. **The walk still fails validation.** The replay ends at 774 violations,
   576 of them `angular_velocity_jump`. This contract only lets the solver
   keep descending. It does not make the walk pass.
2. **Forced recovery remains** (issue 186, left open). At the frozen stall
   point, the step with reach rows levels off at about 3.4e-4 for damping
   1e4 and 1e6 (`SI/measure_stall.log`), because a row inside the backoff
   forces it.
3. **Order.** The test tolerance change landed in `b2b9808` before amendment
   2 recorded it. Amendment 2 says so.
4. **Replay commit.** The replay ran at `b2b9808`. The later code commit
   `2847bf0` changes one comment and the golden file's line layout only
   (parsed contents identical). The full suite was rerun at `2847bf0`.
5. **No fit was run.** Nothing was written to a checkpoint, animation or
   scene.

### Change by change

- **`numerics.py:21-25`.** The new constant `SCALE_FLOOR = 1.` with its
  reason.
- **`numerics.py:154`.** `scales = [max(s, SCALE_FLOOR) for s in norms]`
  replaces `s if s else 1.`. This is the only line that changes behavior.
  - Both solves take `system.scales` from `_scaled_system`
    (`numerics.py:183`, `numerics.py:416`); no other code computes a scale.
- **`numerics.py:175-176`.** `bounded_least_squares` docstring states the
  floor.
- **`numerics.py:469-473`.** The clamp comment is corrected. The code is
  unchanged.
- **`tests/test_scale_floor.py`.**
  - Synthetic 1e-13 column, both solves (75).
  - Frozen stall point (92).
  - Scale rule (121) and golden parity (129).
  - Constrained: free rows, binding row, infeasible (149, 159, 171).
  - Damping 0 (178, 191).
- **`tests/frozen-stall-point.json`.** Byte-identical to `SS/stall-point.json`
  (SHA256 `2337f148…`).
- **`tests/scale-floor-parity.json`.** 52 records captured on `e5ebb31` by
  `SI/make_parity_golden.py`, which refuses to run unless `numerics.py`
  matches the base.

### Contract traceability

| Contract item | Where | Result |
|---|---|---|
| Correct Fix 1, the scale rule | `numerics.py:25`, `:154` | done |
| Correct Fix 2, one owner | `_scaled_system` only | done |
| Correct Fix 3, docstring | `numerics.py:175` | done |
| Verify 1, synthetic | test line 75 | fails on base (moves 0.5), passes after |
| Verify 1, frozen | test line 92 | fails on base (0.5 at every rung), passes after |
| Verify 2, parity | test line 129 | 52 records bit-identical; 11 of 24 constrained records have a binding row |
| Verify 3, constrained | test lines 149-176 | passes; the base certifies the infeasible case as `numerical_failure` |
| Verify 4, damping 0 | test lines 178-198 | passes on base and after |
| Verify 5, replay | `SI/replay-real.json` | 160 iterations, `iteration_limit`, 0 iterations all-unsolved, score 13531.0290551439, 774 violations; trajectory identical to `SS/replay-floor.json` |
| Verify 6, suite | `SI/suite-final.log` | 244 tests OK |
| Verify 6, mutants | `SI/mutants.json` | 7 of 7 killed (see below) |
| Must Not Change | `git diff e5ebb31..2847bf0 --stat` | only `numerics.py`, three new test files and this contract |

Each mutant was applied to `HEAD`, and the new test file then failed:

- floor 0 (the base rule);
- `min` instead of `max`;
- the floor in the bounded solve only;
- the floor in the constrained solve only;
- `SCALE_FLOOR = 2`;
- `SCALE_FLOOR = 1e-3`;
- the floor applied after normalization.

No survivors.

restriction: none added (see Restriction and mechanism); kept.
mechanism: one named constant at the single owner `_scaled_system` |
strongest available | justified.

### Commands run

- `python3 -B -m unittest storybook.animation.maya_walk.tests.test_scale_floor -v`
  on the base `numerics.py` gave 14 failures (`SI/fail-first.log`).
- `python3 -B -m unittest discover -s storybook/animation/maya_walk/tests -p 'test_*.py'`
  ran 244 tests OK at `2847bf0` (`SI/suite-final.log`).
- `python3 -B SI/mutants.py <repo> SI/mutants.json <scratch>` reported all
  killed.
- `python3 -B SI/replay-real.py real <carry> SI/replay-real.json 160`.
  - It ran under a memory-capped `systemd-run` scope.
  - The carry is the fourth fit's checkpoint, SHA256 `49f41e7b…`.
