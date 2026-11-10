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

NOT DONE. Contract only; implementation follows in separate commits.

## Cold Diff Audit

### Gaps

Repair, isolated/frozen qualification and regression proof remain outstanding.

### Change By Change Reconstruction

This file records the frozen cause, exact preservation surface, closed analytic
measurement mechanism, Rule 20 inventory and verification gates before code.

### Contract Traceability

Contract-only change; no source, tests, dependencies or animation changed.

### Verification

Source and diagnosis inspected at the pinned base. Code tests not rerun for
this contract-only commit. The diagnostic packet remains the fail-first evidence.
