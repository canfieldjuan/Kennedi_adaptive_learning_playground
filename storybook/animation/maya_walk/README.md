# Maya walk source

**NOT DONE: no reference candidate passes saved-scene validation.** Juan resumed
the coordination assessment and approved bounded sparse-pose fitting. CI and Codex
review cleared prerequisite commit `c17d60a`; that review does not cover this
new source. No playback acceptance or merge authority exists.

The active source now owns sparse poses for every existing animated scalar,
including the upper body, on one `GaitSpec` clock. `curves.py` enforces explicit
derived or spec-matched pinned tangents, declared scalar holds/turnarounds and
the twelve-key limit. The one Blender writer rebuilds all actions from the
pinned first-painted input. Legacy dense replay remains separately typed for
the already-proven parity gate.

```sh
python3 -B -m storybook.animation.maya_walk rebuild \
  --input-blend /path/to/pinned/maya-painted-control-rig.blend \
  --output-dir /new/durable/evidence/directory --blender /path/to/blender
```

A rebuild first assesses the entire source and refuses a failed source before
replacing actions or saving a scene. A passing source is saved and reopened in a
fresh pinned Blender process. It writes source inventory, authored keys, static preservation,
raw measurements, every gait violation and joint plots. A failing candidate
returns nonzero; the output is diagnostic evidence, never an approved walk.

The two source attempts are retained under evidence alias G / animation-source.
Both preserve static rig/art. The second also passes the unchanged historical
upper-attachment and boot-opening visibility checks. Full new-gait preservation
is still incomplete. Its measured cadence and step ratio match the accepted
target; release progresses and the toe dip is retained. However, it has extra
joint extrema, backward knee motion, contact re-acceleration and excessive
angular acceleration. Its midstance control target exceeds the fixed leg reach.
That is a source coordination error, not proof that the rig or art is incapable.
The later method amendment permits coordinated source fitting; these failed
scenes themselves do not authorize threshold relaxation.

Remaining: a passing coordinated source fit; passing saved-scene and full preservation gates; scene mutation
proofs; the complete operator review package; and Juan's playback acceptance.
The package must not be presented as a completed animation fix.

## Prerequisite reproduction and parity

Contract: `learning-playground/docs/work-contracts/maya-walk-gait-source.md`,
accepted by Juan at commit `b266c7f5679ac4172b63ba13362b60a02795a76f`.

Completed prerequisites: **baseline reproduction and unchanged port**. The
historical replay writes all actions losslessly, and parity was proven before
reference authoring. These proofs do not constitute playback acceptance.

From the repository root:

```sh
python3 -B -m unittest discover -s storybook/animation/maya_walk/tests -p 'test_*.py'
python3 -B -m storybook.animation.maya_walk reproduce --evidence-root "$EVIDENCE_ROOT" --output-dir "$NEW_DURABLE_OUTPUT"
python3 -B -m storybook.animation.maya_walk port-parity --evidence-root "$EVIDENCE_ROOT" --output-dir "$NEW_PARITY_OUTPUT"
```

The output directory must be new. The runner reads only the three hash-pinned
scenes; each opens in a fresh factory Blender process with autoexec disabled.
Blender build `d13f752e3b9c` is the recorded qualification runtime. `reproduce`
only samples inputs; it does not render or save scenes, use the GPU, or import
evidence-folder code.
Its output includes raw samples, command logs, source hashes, every violation,
global gait measurements and standalone PNG diagnostics.

`port-parity` independently samples the pinned current candidate, rebuilds every
action from the pinned first-painted scene and the checked-in legacy fixture,
then opens the result in a fresh process. It compares all quarter frames through
frame 129 against the supplied lower-rig matrix oracle and the independent
snapshot: every upper pose bone, object-world matrix and evaluated painted
vertex. Static rig, mesh, weights, UVs, materials and packed images must also
match, and the exported action data must be identical. The maximum permitted
matrix/point coordinate error is `1e-6`; the measured maxima are reported.
Binary snapshots and scenes stay in the external output directory.

`tests/legacy-actions.json` is a hash-pinned, deduplicated **lossless historical
source fixture**, not new authored motion. It intentionally preserves the dense
keys and old interpolation so parity is meaningful. `LegacyFixture` has a
separate replay entry point; there is no general dense-key override. The sparse
source and rebuild entry point are separate and their candidate is unqualified.

`REPRODUCED` means the native and first-painted scenes fail release continuity
on both legs in every complete cycle, and the current release candidate fails
the knee-extension rule while still passing the release-stall rule. It does
not mean that any scene passes the complete gait specification.

`validate` analyzes a saved packet without Blender and exits unsuccessfully for
a gait failure. `reproduce` exits successfully only when all the expected
baseline failures are demonstrated. Missing data, an import error or a wrong
scene hash cannot count as reproducing a motion defect.

## Measurement ownership

- `spec.py`: closed, finite measurement records; explicit events and point
  holds; source-owned tolerances. Baselines retain their original clock.
- `sample_scene.py`: evaluated bones, native rest landmarks, and the actual
  registered opaque heel material; signed ankle angle is foot pitch **minus**
  distal shin angle. It never compensates motion or saves a scene.
- `validate.py`: one `validate_cycle` for the complete timeline. Stall runs span
  cycle seams; holds require measured position stability. The same rules gate
  source geometry before the all-action rebuild.
- `reference.py`: cited source links and declared engineering bands. Pelvis
  height is a COG proxy. Anatomical ankle dorsiflexion is not ball-roll rotation.
- `review.py`: standard-library PNG plots. Shaded bands are schematic
  interpolation between reference-based target extrema; only the specified
  extrema windows are admission rules, not every point of the shaded envelope.

Frames 1–128 define validation coverage. Only full contact-to-contact cycles
inside that interval count. Sampling also includes frame 129 for the future
parity oracle, exact events and immediate post-release points; point velocities
use centered 1/128-frame differences. Quarter-frame displacement drives stall
runs. Contact/cadence/step measurements come from evaluated heel position and
speed, separately from spec event labels. Both observed and expected values
appear in reports.

Every exact-event and one-sided observation participates in spatial, direction,
joint extrema and angular-velocity checks. Only the duration-based stall rule
counts fixed quarter-frame intervals; declared holds are checked at every
observation, including their endpoints. Each complete cycle requires an observed
heel contact at both its start and end, within one quarter frame of the declared
event. The report lists every expected/observed contact match. A few early
contacts cannot establish coverage of later cycles.

The six native points (hip, knee, ankle, heel, ball, toe) receive whole-cycle
checks. The painted heel is an additional release probe; its registered pixel
is near the support region, not the exact anatomical hinge. Native planted
points may drift at most `1e-5` scene units within a declared hold. This is
distinct from painted surface/binding tolerances in the later preservation gate.

The pure test fixture has independent analytic signals and deliberately small
speed epsilon; it tests the rule engine's positive and negative sides, not the
physical validity of a Blender rig. Actual scene measurements use the accepted
limits unchanged. Baseline geometry, old receipts, and rejected intermediate
measurements stay in durable evidence. No binary or private artwork is in git.

## Coordination assessment (operator resumed)

`kinematics.NativeGeometry` evaluates the fixed reverse-foot hierarchy and
nonstretching two-link IK without writing controls. Its samples go through the
same `validate_cycle`. The writer refuses a source failure before replacing any
action. A passing source assessment is only a prerequisite; independently
reopened Blender geometry and painted preservation remain mandatory.

Sample format v2 requires the measured IK target vector. V1 evidence is retained
unchanged but must be resampled for the new reach rule; the reader never invents
missing target data. `ik_target_unreachable` covers both maximum extension and
minimum folded reach, over every observation in every complete cycle, including
exact events. Limits use the pinned rig proportions and a numeric tolerance.

The two diagnostic candidate scenes have not been changed. Juan accepted the
bounded method amendments for offline fitting of sparse pose values and interior
key times between fixed anchors; no tangents or polynomial coefficients may be
fitted. Existing reference bands, cadence/step
targets, point holds, PCHIP rule, key cap, rig and art are unchanged.

`fitting.py` is an offline authoring diagnostic, never a rebuild or playback
dependency. Ordered value coordinates preserve the declared curve topology.
Timing coordinates preserve fixed event, hold-boundary and extremum keys and
enforce at least one quarter frame between neighbors, including the cycle seam.
Both legs retain the same profile on the common clock. A typed phase layout
rejects missing profiles, moved anchors, crossed intervals and crowded keys.
Resume receipts pin the coordinate layout; a value-only checkpoint requires an
explicit transition into timing mode. Source layouts may use up to the existing
twelve-key cap. Search guidance and numerical scores
are not acceptance. Only the unchanged shared validator can admit a source;
its result and every failed fit remain evidence. A successful fit still needs
static source transcription and independent saved-scene qualification.

The bounded timing assessment also remains **FAIL**. Interior-time continuation,
feasibility-focused continuation and the corrected bounded-step search did not
produce a source that meets all rules. The active authored curves still equal
the second saved candidate. Search failure is not a proof of rig/reference
incompatibility; no further scene or playback acceptance follows from it.

`numerics.py` now owns scaled QR/active-set least squares. It replaces both the
unconstrained-step/clipping path and the capped coordinate-minimization path.
A typed result records convergence, rank failure or budget exhaustion, and the
fitter cannot apply an uncertified step. Numerical termination is recorded
separately from whole-cycle gait status.

Paired finite-difference probes expand geometrically within the same named
numerical trust bound as the solve. They preserve the source domain and reject
unresolved directions; the agreement tolerance and all gait constraints remain
unchanged. Known-solution, badly scaled, duplicate-direction, frozen-stop and
caller-refusal regressions cover this method. The original frozen checkpoint and
the first resumed stop point both pass numerical qualification. These proofs
establish numerical behavior, not a qualified walk.

PR 174 merged the validator/parity prerequisite. The continuation contract is
`learning-playground/docs/work-contracts/maya-walk-source-fit.md`; bounded source
fits and their full validation reports remain private evidence. Active authored
motion is still the failed second saved candidate until a complete source PASS
permits promotion and independent Blender qualification.

The resumed fit still fails the gait gate. Its inner solves converged, but the
outer policy lowered damping after any improvement, including a step it had to
cut to 1/512 of its length. Damping collapsed to its floor and the second run
was intentionally stopped for that diagnosis.

The outer step is now repaired. Step length has one owner: only the full solved
step is scored, once. A step that leaves the source domain or does not lower
the score is refused, damping rises five-fold and the same linearization is
solved again, within the existing nine attempts. Every attempt leaves a typed
receipt in the checkpoint. Damping is lowered only by an admitted step whose
actual reduction is at least 0.75 of what the undamped linear model predicted;
below 0.25 it rises. These bands are numerical, never gait thresholds.

A finite-difference direction with an exactly zero response is no longer
accepted at the first probe size. It is `flat` only when every probe size was
evaluated and none responded, and `unresolved` when a response appears but
never agrees. An unresolved direction still stops the fit.

The original frozen checkpoint, the first resumed stop point and iteration 60
of the second run pass numerical requalification under the repaired policy.
No fit has been run with it. A third fit needs operator approval, and
animation promotion remains blocked by the failed whole-cycle gate.
