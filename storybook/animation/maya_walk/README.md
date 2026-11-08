# Maya walk source

Contract: `learning-playground/docs/work-contracts/maya-walk-gait-source.md`,
accepted by Juan at commit `b266c7f5679ac4172b63ba13362b60a02795a76f`.

Current phase: **baseline reproduction and unchanged port**. The historical
replay writes all actions losslessly. Lossless parity must precede the sparse source rewrite; neither
passing measurements nor this reproduction constitutes playback acceptance.

From the repository root:

```sh
python3 -B -m unittest discover -s storybook/animation/maya_walk/tests -p 'test_*.py'
python3 -B -m storybook.animation.maya_walk reproduce --evidence-root "$EVIDENCE_ROOT" --output-dir "$NEW_DURABLE_OUTPUT"
python3 -B -m storybook.animation.maya_walk port-parity --evidence-root "$EVIDENCE_ROOT" --output-dir "$NEW_PARITY_OUTPUT"
```

The output directory must be new. The runner reads only the three hash-pinned
scenes; each opens in a fresh factory Blender process with autoexec disabled.
Blender build `d13f752e3b9c` is the recorded qualification runtime. CPU sampling
only, no rendering, scene saving, GPU use or imported evidence-folder code.
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
separate replay entry point; there is no general dense-key override. The final
sparse source model and production rebuild entry point are still gated work.

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
  cycle seams; holds require measured position stability. Source sparse-key
  admission and a retimed upper-body rebuild are later gated work.
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
