# Maya walk: differentiate before geometry rounding

## Before Code

### Authority and scope

Issue #176. Juan directed: "Let's start resolving it next" after the frozen
diagnosis and the recommendation to differentiate through chart/curves/geometry.
This authorizes this numerical repair and its isolated/frozen qualification.
It does not authorize another fit, animation promotion, merge or acceptance.
The original contract-only acceptance stop was completed earlier; this is a
separate repair to the already accepted bounded fitting method.

### Root Cause

The whole-objective finite-difference owner assumes every permitted latent chart
direction has a resolvable response within its fixed probe range. Our chart and
nested velocity residuals, introduced in 29e1618e647f8fb460c3ac20103747b72167a2cd,
make that assumption false. Exponential chart compression preserves a genuinely
nonzero direction while floating-point geometry rounding obscures its response.
Temporal and residual differences amplify that rounding. Wider probes postponed
the limit rather than closing the class. The sampler correctly refuses the
unreliable measurement; suppressing that refusal would be a defect.

At the frozen stop, coordinate 31 is unresolved. At probe .2048 the ordinary
comparison error is .060106708431025814; geometry-only higher precision, rounded
back to floats before the original residual arithmetic, gives
.014093174693870036 under the unchanged .05 limit. Curve-only and residual-only
precision fail. Weaker neighboring directions reproduce the class. A numeric
two-link fixture reproduces the largest offending scalar independently.

### Rule 20 inventory

Base and current main: b4d6cbe79cdba82a39aa32931809bf370dfd4816, the merged
qualified PR 175 tree. Runtime: stdlib Python fitting/model; no external model.
Sealed evidence alias weak-direction-diagnosis, SHA256
e9be7e43df0f13af094c24342764f246efa0101b3929b10d0ad0e3444c9b3579.
Its frozen input SHA256 is
1e5d55c195782e2faba5eb3ea8bbe08f61616d63921c5c6d8ce1fb415edb67c1.
The private diagnostic used installed mpmath 1.3.0 solely as an oracle; it is
not a production dependency. Final controls, neighboring points, exact residual
attribution, numeric fixture and integrity receipts are retained together.

Retain the existing frozen inner-solver, derivative-stop and iteration-60
fixtures and qualifications. Keep the existing coordinate meanings, domain,
PCHIP formula, target clock and objective expressions. Inventory every normal
primal key/phase/slope, geometry sample and residual before implementation, then
prove exact primal parity before qualifying derivative behavior.

### Correct Fix Must Touch

- Add one stdlib forward-mode scalar owner, `differential.py`, with immutable
  finite value/gradient state, dimension checks and closed failure reasons.
  A new small numeric type is justified under Rule 22: primitive floats cannot
  carry sensitivities, and differencing already rounded outputs loses them.
  No AD framework, dependencies, source rewriting or parallel geometry copy.
  Unsupported conversion to ordinary float must fail explicitly, preventing
  accidental derivative erasure through an unadapted math call.
- Route only differentiable arithmetic through that owner in `fitting.py`
  (chart exponentials, objective norms and extrema), `curves.py` (internal
  evaluation scalar validation and PCHIP boundary handling), `poses.py`
  (rotate arithmetic only), and `kinematics.py` (geometry arithmetic only).
  Ordinary numbers must execute the same primitive operations as before.
  The source, curve, geometry and residual formulas remain their single owners.
- Add one analytic-Jacobian adapter in `numerics.py`. It evaluates the shared
  residual function with seeded sensitivities, checks dimensions/finiteness and
  exact primal parity, and returns the existing closed Jacobian result. Add an
  explicit analytic derivative status, with typed refusal reasons for genuinely
  nonsmooth, nonfinite, mismatched or unsupported evaluation. A zero analytic
  derivative is a computed derivative, not the finite-difference `flat` verdict.
  Preserve the existing finite-difference owner and its refusal rules for
  independent qualification; do not fallback silently when analytic evaluation
  fails. Existing `require_resolved` must still prevent every refused solve.
- Route `fit` through the analytic owner and retain per-direction receipts.
  Retain the scaled QR solver, full-step admission, gain ratios and termination
  semantics. Synthetic integration fixtures must use the same explicit
  differentiable residual interface; no test-only production fallback.
- Add focused scalar/Jacobian tests and a values-only frozen-stop fixture.
  Update existing numerical integration mocks only where the derivative API
  changes. Update the README and this contract's implementation/proof sections.

### Nonsmooth and failure rules

Track ambiguous derivative directions through numeric abs/min/max and zero
norms. A branch tie with unequal sensitivities is not silently differentiated as
one branch. A constant zero multiplication may remove an irrelevant ambiguous
expression. Extrema selection that changes control flow must refuse ambiguous
ties. Handle fixed holds, genuine constants, true stationary derivatives and
PCHIP/extremum/seam boundaries explicitly; do not confuse them with tiny nonzero
directions. Malformed inputs raise at construction/admission. A failed analytic
measurement never becomes a zero column or a finite-difference fallback.

### Must Not Change

No numerical optimization of new variables or derivatives; forward-mode values
are measurement sensitivities only. No objective terms/weights, chart domain or
coordinate meanings, phase anchors, holds/events, PCHIP tangents, key spacing/cap,
source poses, rig/proportions, art/atlas, camera choices, cadence/stride,
reference bands, validator limits, Blender writing, scene or production changes.
No spec or validator edits. No inner-solver/certificate or step-admission changes;
trust limit .5, comparison limit .05, probe ladder, damping constants and budgets
stay fixed. No mpmath/dependency addition. No fitting run or saved animation.
No merge authority. No other branch/worktree or PR mutation.

## Assumptions / blockers

Ordinary source evaluation must remain bit-identical. Any unavoidable primal
change requires diagnosis and a recorded amendment before proceeding. Analytic
sensitivities do not establish constrained gait feasibility or acceptance.
Nonsmooth refusal is legitimate and must be reported, not patched around.

## Verification plan

1. Fail first: a known analytic weak-response nested-difference regression and
   the exact frozen foot-height stop must fail on the existing derivative path.
   Store the failure receipts before implementation.
2. Test arithmetic/transcendental chain rules, mixed constants, both signs,
   zero/falsy/malformed dimensions and values, weak nonzero versus true zero,
   missing conversion support, bounds and nonsmooth ties. Probe both acceptance
   and refusal, and prove the caller never solves on a refusal.
3. Prove exact normal-primal parity against the before-code packet across the
   authored source, initial value/timing charts, old frozen points, new stop and
   neighboring points: keys, phases, slopes, sampled geometry and residuals.
4. Compare analytic derivatives to known solutions and the independent precision
   oracle where available. For ordinary resolvable directions compare paired
   finite differences; retain explicit refusal where floating-point probes fail.
   Cover moving phases, PCHIP branches, the seam, holds and extrema.
5. Require resolved analytic directions at the exact frozen stop and its family.
   Reuse frozen solver/outer-step qualification with the new Jacobian: one
   linearization per frozen point, bounded admission attempts, independent KKT,
   trust bounds and actual/predicted descent. This is qualification, not a fit:
   no iterative source search or promoted motion.
6. Run focused tests, adjacent curve/geometry tests, then the pure walk suite
   locally because numerical qualification is this slice's required evidence.
   Mutation probes must catch dropped chain terms, erased weak sensitivities,
   false smoothness and bypassed refusal. CI owns repeated broad checks.
7. Cold-audit the diff; pin protected source/evidence; record every limitation.
   Evidence stays outside the worktree, mode 700/600. No new fit before a
   separately authorized continuation after qualification.

## Contract Amendments

None at the initial contract commit.

## Implementation summary

Implemented and qualified. `differential.py` owns immutable forward-mode
arithmetic and explicit uncertainty; `numerics.py` admits only finite,
primal-matching Jacobians. The fitter consumes that owner. Numeric dispatch in
the existing chart/curve/rotation/geometry owners preserves their formulas.
No second motion model, primitive-float conversion fallback or optimizer was
introduced. Ordinary evaluation remains bit-identical across the frozen packet.

## Cold Diff Audit

### Gaps

No standing numerical-repair gap. Remote CI/review and any future fit remain
separate gates. The walk remains unqualified and unaccepted.

### Change By Change Reconstruction

- `differential.py:38`: finite immutable value/gradient state; implicit float
  conversion refuses. Arithmetic/transcendental helpers retain sensitivities and
  preserve the original primitive value operations. Uncertainty is explicit.
- `differential.py:231`: shared compensated sum preserves Python's native float
  sum behavior; naive repeated scalar addition would alter the source values.
- `numerics.py:230`: closed, finite derivative receipts and matching columns;
  `numerics.py:287` checks analytic primal parity and refusal reasons.
- `fitting.py:134,237,291,550`: shared arithmetic in the unchanged chart and
  objective, then one analytic measurement call. Step admission is unchanged.
- `curves.py:12,97`, `poses.py:54`, `kinematics.py:38-66`: scalar dispatch and
  PCHIP boundary uncertainty only; source values/formulas remain unchanged.
- `tests/test_differential.py`: arithmetic, boundaries, conversion/refusal,
  weak-response integration, moving-key/seam and real frozen-point regressions.
  `tests/frozen-jacobian-stop.json` holds numeric coordinates only. Existing
  synthetic tests follow the new derivative interface, preserving their purpose.
- README and this contract describe the measured behavior and remaining gates.

### Contract Traceability

All touched files map to Correct Fix Must Touch. The small numeric type is the
stated Rule 22 mechanism; it adds no dependency/framework. Protected files match
their original hashes. AST comparison proves the inner solver, finite-difference
owner, step-admission/damping owners and authored pose definitions unchanged.

### Verification

The initial contract commit ran no code tests. Final qualification:

- Contract committed alone as 892d64fae391e2972b36296aac53817d348a395e.
- Implementation ae02aa424f28c1224ca9118e9b21a378b78b49d7; additional timing
  regression 64f059f9b32b509ed11dec116dc89be4503c3988.
- Full pure suite: 116 tests PASS on 64f059f9b32b509ed11dec116dc89be4503c3988.
- Nine primal cases: exact canonical equality of keys/phases/slopes, all model
  samples and residual vectors against the before-code packet.
- Six frozen points: all 98 analytic directions resolve, all norms nonzero;
  reused admission/KKT harness confirms full bounded steps and actual descent.
  Independent scaled KKT errors are below 3e-12.
- Floating-point comparisons exposed disputed weak columns. The archived
  pre-repair formulas evaluated by the independent precision oracle agree with
  the analytic columns at multiple sizes under the unchanged .05 limit.
  This failed intermediate comparison is retained, not relabeled as passing.
- Sixteen single-clause mutants killed, including erased phase sensitivities,
  lost chain terms, false smoothness, primal-check bypass and old fitter routing.
  Every retained mutant copy matches final source/tests except its named clause.

Evidence alias `jacobian-repair-2026-11-09`: fail-before.log, primal-parity.json,
pure-tests.log/json, requalification.json, jacobian-comparison.json,
precision-oracle.json, oracle-case-parity.json, mutation-report.json and
integrity.json. Artifacts stay outside Git and are hash-pinned in the review.

### Observed limits

The newest stop needs 13 attempts across two rounds at one fixed linearization
before a full step is admitted, with actual decrease 1.6582805528742028e-07.
This passes the existing numerical gate but does not predict a passing fit.
Branch refusal remains intentional; there is no fallback or new tolerance.

The first implementation exposed a primal mismatch from Python's compensated
float sum versus iterative Dual addition; the shared sum owner and regression
close that class. A finite-component/infinite-norm regression also exposed an
untyped error, now a typed nonfinite refusal. Failed harness/test attempts and
their explanations remain in qualification-errors.json.

### Gap audit

DONE for this numerical implementation and local qualification. Remote review
is pending. NOT DONE for the walk: no new real gait fit, source promotion or
saved scene was produced. No merge or playback acceptance is inferred.
