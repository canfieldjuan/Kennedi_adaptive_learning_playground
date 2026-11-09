# Change Contract: Maya walk motion source

## Before Code

### Authority and acceptance boundary

Draft for Juan's acceptance, dated 2026-11-07 (America/Chicago).
The operator's takeover handoff authorizes this inventory and a separate local
contract commit. **Stop after that commit. Do not build the validator, evaluate
or regenerate scenes, change motion, push, open a PR, or merge under this step.**
Contract acceptance releases the reproduction phase; playback acceptance is a
separate operator decision and is required before any merge of the walk.

Repository base: `ca47b36ff55cdd7a3363b65efab31c2f08385371`, fetched `origin/main`.
Owned branch: `codex/maya-walk-gait-source`.
Owned worktree: `~/Desktop/Kennedi_worktrees/maya-walk-gait-source/`.
Shared checkout, existing branches/PRs and original evidence remain unowned.
Work stays in the root session; no subagents or watchers.

Follow `../contracts/change-workflow.contract.md` and
`../contracts/long-running-slices.contract.md`. Persist the lane at
`~/.local/state/kennedi-long-runs/maya-walk-gait-source-2026-11-07.md`.
No PR or merge authorization exists at this contract boundary. Future PR work
must obey the persisted ownership, subscription, stop and exact-head review
gates; an event or a green check cannot grant acceptance.

### Evidence aliases and status

`E` means `~/Desktop/codex-evidence/kennedi-storybook/`.

| Alias | Directory beneath E |
|---|---|
| N | `maya-control-rig-proof-2026-11-07` |
| P | `maya-painted-control-rig-2026-11-07` |
| C | `maya-continuous-release-2026-11-07` |
| W | `maya-weight-transfer-2026-11-07` |
| S | `maya-continuous-stride-2026-11-07` |
| K | `maya-knee-rig-assessment-20261107T231231Z` |
| G | `maya-walk-gait-source-2026-11-07` |

`G/input-inventory.json` pins 54 source/input/receipt files; SHA256
`b85e22eb20d5d890e76409d9cfe641652f8ff0f2a97d03eb5efeca578793c920`.
The inventory was collected during this takeover. Historical result files were
read, **not rerun**. Their PASS/FAIL values are prior evidence, not newly proven
behavior. Before implementation, recheck all input hashes; input drift requires
reconciliation and a new inventory, never silently selecting a newer scene.

### Root Cause

**Confirmed in source:** coordinated gait has no single specification enforcing
its whole-cycle behavior. Motion is split between hand-authored endpoint curves,
offline knee-derived hip/lift curves, a local release patch and a sampled upper
body. Native IK faithfully derives knee motion from those inputs; changing the
solver alone does not coordinate them (`K/assessment.md:15-24`).

| Finding | First owner and evidence | Consequence |
|---|---|---|
| Implicit stops | `N/poses.py:18-25`, `44-46`: omitted slope becomes zero; foot X, ball and toe have zero slopes at phase 19.2 | Simultaneous zero derivatives propagate through the reverse-foot chain; a key alone says nothing about intended hold or turnaround |
| Invented bent stance | `N/author_poses.py:11-15`, `36-49`: knee targets generate hip/lift values; stance targets range from 12 to 20 degrees | Knee floor and timing are consequences of upstream authored inputs, not a downstream knee-filter problem |
| Narrow measurement coverage | `N/knee_check.py:10-27` checks a contact window; `C/verify_release.py:21-32` checks release only | These checks cannot establish a whole-cycle signature or catch all later complaints |
| Motion lost during port | `W/gait.py:187-193` carries release velocity into swing; `N/poses.py:44-46` does not carry it into the native controls | The native port changed a previously measured invariant without a parity gate |
| Dense, partial repair | `C/release_curves.py:24-30`, `40-61`; `C/apply_release.py:5-22` | NumPy polynomial solving creates eighth-frame samples; four channels per leg are replaced in an existing scene |
| Independent upper clock | `P/build_painted.py:7-9`, `24-55` | Upper poses are sampled from W and replayed with fixed 64-sample indexing, independently of lower-body timing |
| Duplicate writer | `N/build_control_rig.py:67-75`; `C/apply_release.py:15-22` | Bezier-handle policy has more than one owner |

The historical baseline release report is FAIL for stopped/reversing ankle and
painted heel; the candidate release report is PASS. Its rig report still records
minimum knee flexion `11.663874145228073` degrees and maximum
`50.630027322249546` degrees (`C/rig-verification.json`). The retained late toe dip
is explicitly outside the release patch (`C/README.md:14`); its size and timing
have not been qualified against a reference here.

**Corrections to handoff claims:**

- “No motion reference anywhere” is too broad: `N/reference.md:1-4` cites an
  animation tutorial and Blender guidance. No cited normative event/extrema
  signature drives `N/poses.py` or `N/author_poses.py`.
- Zero slope is a stop in that scalar channel, not necessarily in a derived
  point. Here simultaneous input stops explain the release failure. A ball-roll
  maximum alone does not prove an ankle stall: other pivots and translation
  also control the ankle.
- The current fetched main tip is dated 2026-10-26; `git ls-tree` has no
  `storybook/animation` source. “No commits since 11-01” is not the precise
  repository history. The supplied motion source currently lives in evidence.
- The supplied matrix oracle covers the lower rig only. Upper-body parity must
  be measured independently; this file cannot establish it.

**Could not determine yet:** all defects in the saved candidate, whether a new
gait will satisfy playback judgment, or whether the fixed rig/art imposes a
limit. Step 2 must reproduce and isolate those facts before motion edits.

### Rule 20 inventory: existing work is the port specification

| Asset alias | SHA256 |
|---|---|
| N / native scene | `867a09694644afcabc97b08c60d1133b3b4539f3885fe978c32533dbf6cf4830` |
| P / first painted scene, rebuild input | `fc92ced549200fe84e42a8fbfcab95cf44e82d44ff64896f3ad62fd5d2235eee` |
| C / current candidate scene | `b244c634349a59110de602b740253cf30d56dc09466d0817a7eee2fb61b7fbf9` |
| C / native matrix oracle | `2cb590c9aa8684017ca3be2be361636de02cb08ebadde69a15b5722cb091ebb7` |
| C / release keys | `acaf42ba176cd8a36656607a95a6c7ed588ace4380834c039a6cb8c6065b8c36` |
| W / upper-body source scene | `fae7143e8654d8df41f0e5488c86718faa4e149187cb7a7fe7d37d5c257292c0` |
| W / original atlas | `fed9306a311b64161d269dcaa1a8ddaaa9dc3cc16b8415c255de24caf3e21f81` |
| C / known failing release report | `ed072c5c0571e6394312ca3f02b9d79eb5565f85fc59f8a10ceca2c1782ad543` |
| C / passing release report | `9f57424a9d2f3d7b3850fb04db6149076980aa09ae8e6e1540355305418a0b1b` |

Runtime: recorded logs and current `blender --version` both identify Blender
`5.2.2 LTS`, build `d13f752e3b9c`. CPU rendering only. Pin this runtime for parity;
save the exact invocation and runtime receipt. No motion model, chat template,
thinking block or model prompt is involved: the motion is authored mathematics.
Existing atlas generation is not rerun; its bytes are the input specification.

| Owner / harness | Inputs and settings | Recorded result / limitation |
|---|---|---|
| N / poses, authored keys, native build | 24 fps; 32-frame stride; .9 units/stride; far phase +16; thigh .39, shin .36, ankle .2; +X forward, Z up; toe-off 19.2; hip rest .94 | Native controls, reverse-foot pivots and live non-stretch IK; tutorial-informed rather than normative curves |
| N / author_poses | SciPy PCHIP used offline, with explicit endpoint and geometry-derived slope overrides | Not one uniform periodic tangent policy |
| C / release_curves and release-keys | NumPy boundary segments; ball 56 keys, toe 44, foot X 44, foot Z 33 per stored cycle | Local release continuity passes; later swing retained |
| C / apply_release | Loads P, replaces four channels per leg; samples lower pose matrices at t=i/4, scene frame=1+t | 513 samples through frame 129 inclusive; nine bones, 16 matrix entries each, armature-space `PoseBone.matrix` |
| P / build_painted | Samples W at frames 41–72.5; 64 half-frame poses; offset index +32; writes 257 linear poses through frame 129 | Upper rig has a separate fixed clock; visible near artwork maps to native far leg |
| C / preservation gates | verify_binding, verify_boot_visibility, verify_upper, verify_scope; UV samples and binding metadata from P | Historical PASS; old scope and binding parity assertions also restrict motion, so cannot run unchanged against a deliberately different gait |
| S / gait and regression harness | 24-frame stride, .675 travel, .55 stance; measured release velocity passed into cubic swing | Earlier continuity proof, not a substitute for current native-scene parity |

Current source-derived global values: step .45 units; step/rest-hip ratio
`.4787234042553192`; cadence 90 steps/min; speed .675 units/s. These are parameter
calculations, not a fresh saved-scene measurement. The final validator reports
actual contact distances, measured hip height and timing separately.

### Reference signature and chosen Maya targets

Use a small cited facts table, not a copied dataset. Keep provenance and design
bands distinct. Sources inspected for this contract:

- [OUHSC stance phases](https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/stance.htm).
- [OUHSC knee phases](https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/kngait.htm)
  and [Winter-derived knee graph](https://ouhsc.edu/bserdac/dthompso/web/pk/kneegraf.htm).
- [OUHSC ankle sequence](https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/ankgait.htm).
- [OUHSC body-height summary](https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/gait.htm).
- [Perry, Normal Gait, joint motion](https://www.oandplibrary.org/alp/chap13-01.asp).
- [OUHSC stride analysis](https://ouhsc.edu/bserdac/dthompso/web/gait/knmatics/stride.htm).
- [Schulz, 2011, minimum toe clearance](https://pubmed.ncbi.nlm.nih.gov/21354576/).

Percentages below use the same foot's initial contact as zero. Windows are
proposed engineering bands for this animation; they are not population
confidence intervals. Exact values must live in the gait spec and report.

| Signal | Cited observation | Maya target / initial phase windows |
|---|---|---|
| Events | OUHSC separates 0–10% loading, 10–50% single support, 50–60% preswing | IC 0, foot flat about 8, heel off 30–40, opposite IC 50, toe off 60, next IC 100 |
| Knee | Perry describes two flexion/extension phases, 0–5 degrees at IC, loading about 15–18, return toward neutral and swing about 60. OUHSC's Winter graph instead shows loading about 22, midstance minimum about 10, swing about 65 | Two maxima: 10–18%, 68–76%; two minima: seam 95–5%, stance 35–45%. Choose the straighter Perry pattern: 0–5 degrees in near-straight windows, loading 15–22 and swing 60–65 before declared amplitude scaling |
| Ankle | OUHSC shows plantarflexion, dorsiflexion, plantarflexion, dorsiflexion; Perry describes approximately 10-degree loading plantarflexion, 10-degree dorsiflexion and 20-degree push-off plantarflexion | Two maxima/two minima, allowing a neutral plateau counted once. Loading minimum 5–12%, stance maximum 35–50%, push-off minimum 58–66%, swing recovery maximum/plateau 80–100% |
| Hip | Perry describes one extension/flexion arc, from about 30 degrees flexion to 10 degrees extension and back | One maximum/one minimum: extension 48–58%, flexion 82–95%, allowing a terminal plateau |
| Pelvis height | OUHSC describes two COG peaks/troughs: high in single support, low in double support | Use pelvis Z as an explicitly named proxy, not a measured COG. Peaks 25–35% and 75–85%; lows 0–10% and 50–60%; nonzero amplitude |
| Swing toe | Schulz reports a local clearance minimum near halfway through swing; unobstructed mean 11.1 mm with variation | Preserve rise/dip/rise; locate the interior minimum in 75–85% of stride and report clearance normalized by hip height. Do not require every real walker to exhibit it or equate a boot tip with the paper's digitized shoe region |

The OUHSC ankle diagram is not a precise numerical timing source. It does not
prove a universal plantarflexion peak strictly after toe-off. Moreover, ankle
dorsiflexion is foot relative to shin, not the ball control's scalar rotation.
For Maya, retain the requested authored policy that ball-roll turnaround occurs
after toe-off; validate the resulting anatomical ankle and point trajectories
as well. This is an animation constraint, not a newly discovered reference fact.

The OUHSC adult stride table reports mean cadence 117 steps/min and female mean
step length .66 m, without a hip-height-normalized cohort value. Maya's existing
90 steps/min is slower than that mean. Her .45-unit step is shorter than .66 m
under the scene's meter-equivalent convention, but cartoon proportions do not
justify calling this a child norm.

Proposed first reference-based candidate after parity: keep 24 fps, use a
24-frame cycle (120 steps/min), and step length `0.70 * reference_hip_height`,
with reference hip height .94 (step .658, stride 1.316). The ratio .70 is a
declared stylisation choice, not a published normative ratio. The far leg uses
half of the spec cycle, hence 12 frames for this candidate. Acceptance of this
contract accepts these initial targets for review, not the resulting playback.
Each joint amplitude, including arms, has one named factor initially 1.0;
changes must preserve extrema count/order/timing and the knee extension windows.
No hidden phase warps, knee offset or floor clamp can implement stylisation.

### Correct Fix Must Touch

One source package: `storybook/animation/maya_walk/`. The following are owner
boundaries, not permission for parallel implementations of the same invariant:

| Surface | Responsibility |
|---|---|
| `reference.py` and `README.md` | Cited signature, provenance, units, usage, interpretation limits and review instructions |
| `spec.py` | Closed immutable gait/events/holds/extrema/stylisation models; sole clock and channel inventory |
| `poses.py` | Sparse coordinated poses for every animated transform: pelvis X/Z; each foot X/Z; heel/ball/toe; body, head, both upper arms/forearms and lantern articulation; explicit constants for inactive channels |
| `curves.py` | One periodic shape-preserving cubic tangent implementation and evaluation; no NumPy/SciPy |
| `blender_writer.py` | One native action writer, reading typed source; all action/channel ownership and handle conversion |
| `sample_scene.py` | Fresh-process saved-scene sampling adapter; native and painted point definitions, no motion corrections |
| `validate.py` | One named `validate_cycle` for all cross-channel/time-series rules; same implementation for fixtures and saved-scene samples |
| `preservation.py` | Port existing binding, boot-visibility, upper and scope invariants into a separate gate with spec-driven timing |
| `review.py` and `__main__.py` | One rebuild entry point, CPU review exports, standard-library PNG plotting and receipts |
| `tests/` and lossless legacy fixture source | Pure-Python unit/mutation tests, baseline replay specification, Blender parity and preservation runners |
| `.github/workflows/storybook-quality.yml` | Run the standard-library tests in the existing Storybook job without changing its existing checks or installing scientific packages |

No new dependencies or framework. Pure Python uses the standard library only;
Blender-specific code uses its existing API. Reference-band PNGs can be written
with standard-library raster drawing, `struct` and `zlib`; plotting must not
introduce a scientific dependency. CI currently installs only `python3-pil`
(`.github/workflows/storybook-quality.yml:35-47`).

#### Closed source model and one tangent rule

- A key has either `Derived` tangent policy or `Pinned` with an explicit slope
  and closed enum reason `HOLD` or `TURNAROUND`; there is no implicit numeric
  slope default. The spec-bound curve constructor rejects a pin with no matching
  declared channel interval/extremum, wrong phase, nonfinite value or mismatched
  slope. The Blender writer accepts only validated source objects.
- Use periodic monotone cubic Hermite tangents with one exact PCHIP rule:
  for adjacent widths `h_prev, h_next` and secants `d_prev, d_next`, use zero
  when either secant is zero or their signs differ; otherwise use
  `(w1+w2)/(w1/d_prev+w2/d_next)`, where `w1=2*h_next+h_prev` and
  `w2=h_next+2*h_prev`. Apply this to circular neighbors, including translated
  cycle neighbors for forward channels; never wrap world X as a periodic
  position. Flat segments must match declared channel holds; sign changes
  must match declared channel extrema. Point holds are separate declarations.
  The handoff calls this Fritsch–Carlson; the weighted-harmonic PCHIP rule is
  attributed to Fritsch–Butland in the
  [SciPy algorithm documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.PchipInterpolator.html).
  This states the precise intended algorithm without a SciPy dependency or
  nonperiodic endpoint rules. Test its monotonicity and C1 seam behavior.
- `HOLD` pins match constant intervals; `TURNAROUND` pins match declared extrema
  and have zero derivative. Validate derivatives against monotonicity bounds.
  A true scalar extremum can have zero velocity while the derived point moves.
- At most 12 unique phase keys per scalar channel per full stride. Two pelvis
  waves count within that same stride; do not evade the cap through half-cycles.
  A repeated seam endpoint is counted once. Constant channels are explicit.
  A thirteenth unique key fails before any scene write.
- No online solver beyond the existing native IK, no polynomial boundary solve,
  playback handler, mesh bake, post-bake filter, per-frame clamp or correction.
  Remove obsolete local authoring special cases from the new active package
  after parity; preserve original evidence files untouched.
- Types/closed constructors own structural constraints. `validate_cycle` owns
  cross-channel semantics. JSON receipts are parsed structurally. Do not add
  regex validation or a second independent policy path.

#### Rebuild interface

The planned single command from a clean checkout is:

```text
python3 -B -m storybook.animation.maya_walk rebuild --input-blend <painted-input> --output-dir <durable-output> --blender <pinned-executable>
```

The explicit external input must match P's scene hash. The command pins/checks
the packed atlas, starts Blender with factory startup and auto-execution
disabled, inventories every action and clears/recreates all owned action data
from source. No original action may survive accidentally through NLA, unused
channel bags, drivers or imported upper keys. Static rig/mesh/material/camera
setup is retained; camera follower motion derives from the same clock without
changing the view. Unknown animated owners fail closed.

Save a new scene, then reopen it in a fresh Blender process to sample and check
it. Never use the previous output scene as the next input. No `sys.path` reaches
into evidence; external files are pinned data/assets, never imported code.
Emit command, source revision, input/spec/runtime hashes, output hashes, sampling
coverage and all reports. Exit unsuccessfully for any validation failure.

### Verification Plan

#### Whole-cycle measurement contract

Use phase `(scene_frame - 1 + side_offset) / cycle_frames`, modulo one. Forward
is world +X and up is world Z. Hip/knee/ankle come from evaluated pose bones;
heel/ball/toe are fixed material/anatomical points transformed by the actual
rig, not inferred from names or controller origins. Painted and native mappings
must be recorded (P swaps visible near/far art). World velocity must include
root travel; subtract it only for repeat comparison, never for stall checks.

Baseline adapters use each pinned scene's original clock/events, independently
of the proposed new cadence. N/P/C use 32-frame cycles and far offset 16;
do not reinterpret their phase 19.2 using the candidate's 24-frame cycle.
Reference comparisons are phase-normalized; global cadence/stride differences
are reported separately and cannot stand in for the required mechanical failure.
Before motion edits, the spec must enumerate point holds and channel holds
with exact start/end events, plus contact approach intervals and numeric
tolerances. Baseline declarations come from the original reverse-foot geometry;
new gait declarations come from the accepted events. A whole-foot plant and a
toe-only pivot must not share an overbroad ankle hold.

Measure signed sagittal hip flexion relative to pelvis, knee flexion from thigh
and shin, anatomical ankle dorsiflexion relative to shin with a neutral offset,
and foot-world pitch separately. Do not compare ball-roll controls to an ankle
reference. Record pelvis Z and the full point positions and velocities.

Sample quarter frames over every complete contact-to-contact cycle inside
frames 1–128 for both legs. Enumerate covered/excluded cycles and seam samples;
missing points, empty cycles or nonfinite samples fail rather than vacuously
passing. Add exact event and one-sided samples through the same sampler because
toe-off 19.2 is not on the quarter-frame grid. Use the historical 1/128-frame
derivative spacing for the baseline release comparison, not a new local-only
validator. Separately cover frame 129 for the parity oracle's full domain.

`validate_cycle` accumulates every violation with scene hash, leg, cycle, frame,
phase, channel/point, rule, value, unit and threshold. No first-failure-only
report. Initial engineering limits below must be fixed before motion changes;
calibration may repair the validator only with positive/negative fixture proof
and a recorded contract amendment, never to pass a new candidate.

| Rule | Required check |
|---|---|
| Extrema | Circular, prominence-aware count and order against the table; 1-degree angular and .001 meter-equivalent height prominence. Handle plateaus and the seam once. Require minimum meaningful amplitude so a constant signal cannot pass. Near-straight knee windows are separate amplitude requirements |
| Stall / reversal | Initial speed epsilon .005 scene units/frame; fail two consecutive quarter-frame intervals outside a declared point hold. Hip and knee must progress in +X; swinging ankle/toe must progress from release to contact, with numerical backward tolerance .0005 units/frame. Test hold coverage of the whole interval, not just its start |
| Velocity continuity | Measure all joints over the complete cycle and seams; initial maximum adjacent angular-velocity change 2 degrees/frame per quarter-frame step. Report also degrees/s and degrees/s². This is an animation limit, not a physiological standard; C1 scalar interpolation alone does not prove derived IK smoothness |
| Release | Rolling ankle and painted heel must exceed the historical .005 speed threshold at toe-off and have no backward kick. For a truly planted point, zero velocity at the exact hold endpoint is required by C1 continuity: require immediate positive post-release displacement and no subsequent stall run. Do not demand an impossible instantaneous velocity jump from a stationary toe |
| Contact | In the spec-declared final approach to each hold, speed must decrease monotonically to the planted value, within explicit numerical tolerance. No contact teleport, unreported slip, floor penetration or late re-acceleration |
| Toe clearance | Report the retained mid-swing dip, its phase, prominence and clearance; require the chosen rise/dip/rise signature and positive clearance. No blanket single-hump rule |
| Global gait | Measure IC distances, each step/stride, rest and cycle-mean hip heights, cadence from contacts and fps/fps_base, and speed. Compare to spec (initial ratio tolerance .01, cadence tolerance .1 steps/min); report actual and expected every time |
| Shared clock | Report arm/forearm timing against leg events and prove that changing cycle duration retimes every animated channel, including upper body and followers. No independent modulo-64 path |

Generate PNGs for both legs' hip, knee and ankle against the cited/design bands,
plus pelvis height and toe clearance. Display phase windows, all significant
extrema and failures. Bands are animation acceptance bands, not copied
population distributions. Plots supplement saved-scene proof and human video
review; the assistant does not claim to judge live playback from stills.

#### Ordered gates (Rule 19 and Rule 20)

1. **Contract only:** inspect code and receipts, write this contract, cold-audit,
   commit alone, report discrepancies, then stop for Juan's acceptance.
2. **Reproduce before motion:** implement the common validator and baseline
   sampling, then run on N, P and C. N/P must reproduce the release failure;
   C must report its full signature, knee floor and toe dip even though its
   historical local release gate passes. A known-bad baseline passing is a
   validator defect. Retain raw measurements and fail receipts; do not edit
   curves to manufacture a failure. Reproduce all later complaints first.
3. **Port unchanged:** freeze all current action data as a lossless source
   fixture; rebuild every action from P and that fixture. Compare the reopened
   scene against C's supplied 513 lower-rig matrices, maximum absolute matrix
   entry error <= 1e-6, reporting the worst frame/bone/entry. Also sample C
   independently for upper rig, object-world transforms, channel inventory and
   painted attachment parity. Original oracle shape/domain/coordinates must be
   validated; no oracle is generated from the candidate being tested. If parity
   fails, investigate the porting difference before motion design.
4. **Fix source:** only after both failing rules and parity, author every channel
   from the accepted reference/spec using sparse poses and the single tangent
   policy. Each change maps to a reproduced rule. Rebuild the whole action set
   from pinned P, never patch an existing candidate or filter evaluated bones.
5. **Prove:** one validator fails on all three known-bad baselines for the actual
   expected rules, passes the new reopened scene, and preservation passes.
   Generic failure, hash mismatch or missing data is not reproduction of gait.
6. **Prevent regression:** run the mutations below and their valid controls in
   pure Python and exercise representative scene mutations locally. Keep the
   validated harness and failing baseline fixtures as regression evidence.
7. **Operator review:** deliver normal-speed painted walk, half-speed boot
   close-up, synchronized comparison with P, and a clearly labeled reference
   stick figure using Maya's proportions/cadence, plus plots and complete report.
   The reference figure is a schematic derived from the cited signature, not
   measured child motion. Full video decode and export provenance are checked.

#### Mutation and boundary proof

Each mutation must be rejected for its intended reason; import errors, absent
samples or a different failed assertion do not count. Test valid neighbors too.

- Insert an undeclared zero tangent at toe-off: fail source construction;
  separately inject the bad native curve into a test scene and detect the
  resulting point stall. A legitimate zero tangent on a held toe must pass.
- Move ball-roll peak back to toe-off: fail the declared turnaround rule and
  report actual derived effects; do not pretend every such peak alone stalls.
- Reinsert the earlier swing knee re-extension: fail prominence/count/order.
  Use S's recorded defect and minimal public geometry, not private artwork.
- Flatten pelvis height: fail missing extrema/amplitude even with no reversals.
- Add a pinned slope not declared by the spec: fail construction with the
  specific reason, never let malformed source reach Blender.
- Cover both legs, circular seams, plateaus, missing/mixed channel sets,
  nonfinite values, zero/negative duration, falsy values, valid hold vs swing
  pause, near-limit prominence, and 12/13-key admission. Timing change must
  prove that arms and legs share the new clock. Missing/empty reports fail.

Pure tests: planned `python3 -B -m unittest discover -s
storybook/animation/maya_walk/tests -p 'test_*.py'`. CI invokes the same suite
from its `storybook` working directory. Blender runners are separate and local;
they must not be silently skipped by pure-Python discovery. Narrow tests and
applicable syntax checks run locally; existing broad Storybook CI remains the
owner of its repeated suite. This contract-only commit does not rerun code tests.

### Listed port differences and necessary interpretations

These are proposed explicitly for acceptance, not hidden implementation choices.
No unlisted behavior/representation difference is permitted.

| Difference | Reason and gate |
|---|---|
| Evidence scripts become a repository package | Fix scattered ownership; preserve source values/handles during parity, remove external code imports |
| Lossless legacy replay temporarily retains dense keys and old slopes | Sparse PCHIP cannot be assumed exactly equivalent to dense boundary curves and linear upper transforms. The parity fixture/replay is a separately typed, explicitly legacy test path, never accepted as sparse authored output. Reuse one low-level Blender serialization owner; the production writer accepts only the <=12-key validated model. No general `allow_dense` escape hatch |
| Final motion changes only after parity | Replace arbitrary curves with the declared signature, chosen global targets and per-joint amplitude factors; retain old evidence and lossless fixture as proof, retire boundary solving from the active build |
| Full-cycle and event-aware sampling replaces local-only verdicts | Quarter-frame-only sampling could miss exact release; add event samples through the same validator, keep all cycles |
| True hold departure is assessed immediately after release | A C1 planted point has zero derivative at the exact boundary. Require rolling-point continuity plus immediate toe motion, not a discontinuity disguised as a fix |
| Preservation gate becomes spec-driven | `C/verify_scope.py:5-7,31-36` allows only release changes; `C/verify_binding.py:10,23-27,34-35,51` compares old motion and hard-codes timing. Preserve those exact tests for legacy parity. For new gait, retain mesh/UV/weight/atlas/topology/attachment/visibility invariants and use explicit owned action set and spec events. Do not weaken geometry thresholds or regenerate the old oracle to pass |
| Runtime isolation uses fresh factory processes | Old logs register BlenderMCP; use no startup add-ons or auto-run scripts. Measure any resulting parity difference; do not infer isolation from a process list |
| Reference and stylisation are separated | Near-straight knee and ball-roll-after-release are chosen constraints; reference sources disagree in exact amplitudes/timing. Never manufacture certainty from one diagram |
| Tangent algorithm is specified by formula | Use the periodic weighted-harmonic PCHIP rule above; distinguish its Fritsch–Butland attribution from the handoff's Fritsch–Carlson name. No dependency or alternative tangent policy is introduced |

### Must Not Change

- No new art, regenerated atlas, mesh topology, UVs, materials, skin weights,
  skeletal proportions, hierarchy, native IK mechanism or fixed view.
- No production Storybook pages, personal stories, story recipes, locks,
  character canon, workbook or learning-playground behavior. This contract is
  the only initial tracked change; the later CI addition is narrowly scoped.
- No GPU, image model, video model, model install, private child video upload,
  new dependencies, physical simulation, turns, new camera choices or start/stop.
- No edits/removal of earlier evidence packets or unrelated worktrees. A
  reference/rig/art limit that would require this surface stops motion work
  for an explicit scope amendment; it does not authorize a hidden workaround.
- No approval or merge claim from passing checks. Juan must accept the walk.

### Assumptions / blockers and complaint protocol

Current blocker after this commit: operator acceptance of this exact contract.
No new motion implementation is authorized before it. Optional child video is
not a prerequisite; if later supplied, keep it in private durable evidence.

Every complaint first becomes a validator/reference rule, is demonstrated on
the current scene, and only then permits a source motion edit. After the same
complaint survives two rounds, stop curve changes and report whether reference,
rig or art is the demonstrated limit, or say which remains unknown. No third
curve tweak. Maintain the complaint-to-rule mapping:

| Complaint | Required rule |
|---|---|
| Step then bounce; knee yank | Knee extrema/order and angular continuity |
| Walking down steps; same thing less | Pelvis extrema/order and amplitude |
| Small steps; flailing | Global ratio/cadence and velocity continuity |
| Both knees always bent | Knee near-straight windows |
| Front of feet; heels; snappy | Anatomical ankle signature, contact and continuity |
| Heel-to-toe pause; toe tap; rear-foot lift pause | Whole-cycle stall, release, swing progression and toe clearance |

Evidence goes under G, directories 700/files 600, never solely in a worktree.
Every gate records command, exact source/input/runtime hashes and raw outputs;
PR citations use aliases plus SHA256. Append verified milestones to the ignored
worktree session ledger and persist the durable resume state.

## Contract Amendments

### 2026-11-08: review correction to observation and contact coverage

PR review reproduced two false passes introduced by the initial validator at
`61c925db1e61e41c1273c8576e1a059ab8964b36`: supplied exact-event observations were
required but omitted from geometric checks, and a few early contacts satisfied
the global gate even when later full cycles had no ground contact. The same
sample-selection defect also omitted off-grid direction, extrema and angular
velocity defects.

Correct these at `validate_cycle`: all supplied observations in each complete
cycle participate in spatial, hold, direction, extrema and angular-velocity
checks. Only the stall-duration counter keeps fixed quarter-frame intervals.
Each full cycle requires observed heel contact at both boundaries, matched to
its own declared timing within at most one quarter frame. Store this positive,
bounded matching tolerance in the existing closed `GaitSpec`, and report each
expected/observed match; remove the weaker fixed minimum contact count.

These changes implement the accepted whole-cycle/contact requirements; they do
not change motion, physical thresholds, reference targets or protected surfaces.
Fail-first public fixtures must demonstrate both false passes and sibling
off-grid defects, then pass after repair. Valid timing/geometry boundary controls
must pass, missing final contacts must fail independently for each leg, and all
three pinned baseline scenes must still reproduce their intended failures.
Parity and preservation evidence remain applicable only after a no-relevant-diff
check of their writer, fixture, inputs and harness. Any future scope expansion or
motion-target change still requires its own recorded acceptance.

## Implementation Summary

This step adds only this contract. No animation package, CI edit, validator,
motion change, scene regeneration, rendering or PR exists from this takeover.
The external input inventory and state/ledger support resumption. Historical
motion results remain unaccepted evidence.

## Cold Diff Audit

### Gaps

**NOT DONE for the walk.** Contract acceptance, saved-scene reproduction,
lossless parity, source implementation, mutation tests, preservation rerun,
review exports, exact-head review and operator playback acceptance remain.

No protected source or asset is authorized to change in this contract-only
commit. Completion of the contract draft does not close a motion defect.

### Change By Change Reconstruction

`learning-playground/docs/work-contracts/maya-walk-gait-source.md` records the
code-grounded root owners, pinned Rule 20 inventory, cited reference/design
distinction, complete required source surface, ordered proofs, explicit
differences, protected surface and acceptance stop.

### Contract Traceability

The sole tracked file implements handoff step 1 and the repository's required
change-contract template. Planned implementation files above are future scope,
not claims that those files or checks already exist.

### Verification

Performed: fetched/pinned base and isolated worktree; read the source and
historical receipts; verified input bytes/hashes; inspected normative sources
and reference figures; checked the available Blender version. Final contract
diff/whitespace/scope and input-stability receipts are stored under G after
drafting. No animation tests are claimed in this step.

## Animation implementation checkpoint: two-strike stop

Juan explicitly released step 4 after checking PR 174 CI and reviews, and
reaffirmed that merge must wait for his acceptance of the walk. On `c17d60a`,
quality-gate and storybook-quality-gate passed, and Codex's exact-head review
completed without findings. Both previously corrected threads were resolved.

Sparse source construction, one-clock upper/lower articulation and the all-action
rebuild now exist. The two saved candidates both fail the unchanged whole-cycle
rules. Candidate 2's source target exceeds the fixed two-link reach during
midstance; analytical geometry agrees with the native IK response. Source pose
coordination is a confirmed cause. No general rig/reference incompatibility is
proven; art is not implicated by the passing static, upper and boot visibility
checks. Full new-gait preservation remains pending.

Per the accepted two-strike rule, stop motion edits here. Do not issue a third
curve tweak, weaken the reference bands or acceleration limits, change the rig,
or claim a completed fix. Preserve both attempts, the exact source/measurements,
plots, geometry diagnosis and diagnostic playback under G / animation-source.
The next needed work is a coordinated-pose feasibility assessment, with the
constraints held fixed; further motion authoring remains stopped. No walk
acceptance or merge authority is inferred.

## Coordination repair after operator resume

Juan resumed the source-coordination repair after the two-strike checkpoint.
Keep the rig, art, reference bands, sparse-key cap and tangent rule fixed.
Before further motion edits, add a read-only native-geometry assessment of the
entire interpolated source. It must use the existing `validate_cycle`, and its
positions/angles must agree with independently sampled saved Blender geometry.
It is an authoring diagnostic, never a playback handler or pose correction.

The saved-scene sampler currently omits the IK target position, so the validator
cannot explicitly distinguish an unreachable target from a near-straight knee.
Add the required finite target vector to a versioned sample record and report
`ik_target_unreachable` at the existing validator owner. Reproduce the original
candidate's overreach without changing any curves; test valid reach and values
just beyond both boundaries. Preserve old v1 packets; new runs use v2 instead of
silently inventing a target for old measurements.

Any numerical fit of sparse key values remains outside execution until the
contract's no-offline-polynomial-solving restriction is explicitly reconciled.
No numerical fitting, threshold change or third scene is authorized merely by
adding this assessment. Source-motion design may continue only from explicit
whole-cycle feasibility evidence, with any needed method amendment recorded.

### Accepted method amendment: bounded sparse-pose fitting

Juan explicitly accepted: "Approve sparse-pose fitting with all constraints
fixed". Permit an offline standard-library search over finite sparse pose values
only. Keep key count at twelve or fewer; keep the single PCHIP tangent rule and
all reference, timing/stride, hold, continuity, rig and art constraints fixed.
Do not fit polynomial coefficients, Bezier handles or derivatives. Emit static
editable poses; the normal rebuild must never run a search or correct poses.
The same whole-cycle validator gates the assessed source and reopened scene.
Failed searches remain evidence, not qualified motion. Playback acceptance and
all merge restrictions remain unchanged.

### Accepted method amendment: bounded interior-key timing

Juan explicitly accepted: "Approve bounded interior-key timing fit". Extend the
accepted offline fit to intermediate key phases between fixed anchors, together
with their pose values. Keep cycle/fps/stride, contact events, all declared holds
and extrema anchors, reference bands, validator limits, rig, art, PCHIP tangents
and the twelve-key cap unchanged. Keep at least one quarter frame between
neighboring keys and preserve order. Held boundaries and extrema anchors are not
variables. The legs retain their shared profile and half-cycle offset; every
channel retains the same clock. No fitted handles or polynomial coefficients,
dense output, new dependency, playback correction or rig change is permitted.
Source admission, reopened-scene qualification, preservation, mutations and
Juan's playback acceptance remain mandatory. No merge authority is granted.


### Authorized numerical repair: scaling and convergence

Juan directed: "fix the fitter’s scaling and convergence handling. Prove it
passes the isolated and frozen numerical checks before another fit. Keep the
gait constraints fixed and don’t merge."

**Root Cause.** The numerical owner in `fitting.py` forms unscaled normal
equations from severely unequal and nearly duplicate Jacobian columns, and
`bounded_step` returns its final iterate after a fixed sweep cap without an
optimality certificate. Our commit `21f7585` introduced that silent cap exit;
the earlier value chart in `68acce29` introduced saturating coordinates.
The isolated positive-definite two-variable problem returns approximately
0.000128 instead of 0.25; the frozen real subproblem also exhausts its cap.

**Correct Fix Must Touch.** Replace the numerical step owner with scaled,
QR-based bounded least squares, explicitly preserving the original coordinate
trust bounds under scaling. Use a closed convergence status and measured KKT
optimality; iteration/rank/numerical failures cannot be consumed as solved steps.
Route the fitter through that owner and record numerical termination separately
from gait validation. Qualify finite-difference directions at the frozen source,
using reproducible central differences and reporting unresolvable directions.
The allowed surface is `fitting.py`, a stdlib numerical helper, focused numerical
tests (and existing callers), and this contract. Retire the silent sweep solver
and the unscaled normal-equation path. An adapter for the original quadratic
regression may factor its already-formed matrix into the same solver; the fitter
must pass its Jacobian directly.

**Must Not Change.** Pose-chart coordinate meaning and frozen seed bytes;
`poses.py`, curve tangents, gait spec, objective weights/terms, all validation
rules, reference bands, rig, art, cameras, holds, fixed phase anchors, minimum
key spacing and key cap. No dependencies, dense motion, saved-scene changes,
source promotion, remote mutation or merge. Numerical qualification does not
prove whole-gait feasibility or playback acceptance.

**Assumptions / Blockers.** Existing value/timing approvals cover this numerical
repair. A nonconverged subproblem is a method failure, never evidence that the
fixed gait is impossible. No new fit is permitted before both checks pass.

**Verification Plan.** First run the isolated known-solution regression against
the existing solver and retain its expected failure. Cover both bound signs,
interior solutions, badly scaled and nearly duplicate directions, rank deficiency,
zero directions, malformed/falsy inputs and forced budget exhaustion. Freeze the
real checkpoint Jacobian/residuals before repair; test convergence, independent
KKT residuals, box feasibility, predicted descent and actual objective descent at
that unchanged source. Compare central-difference sizes at the same checkpoint.
Force nonconvergence at the fitter caller and prove it cannot apply a trial.
Run adjacent geometry tests and the pure suite (local numerical behavior is the
required proof here), inspect the cold diff, and pin the protected source before
and after. Evidence stays under G with private permissions.

**Implementation / Cold Diff / Gap Audit.** DONE for the numerical repair;
NOT DONE for the walk. `numerics.py` owns scaled QR/active-set steps, exact
transformation of trust bounds, closed optimality status, and paired-size
differences. `fitting.py` consumes only certified steps and records numerical
termination separately from gait status. The former sweep and unscaled normal
system are removed. The existing quadratic regression now uses an adapter to
the same solver; no alternate production solver remains.

`test_fitting_numerics.py` preserves the isolated failure, scaling/bounds,
duplicate/zero directions, constructed KKT solutions, invalid inputs, forced
budget exhaustion, and caller refusal of unfinished solves and unresolved
derivatives. `test_geometry.py` only follows the explicit-result API. All other
existing package source hashes and the chart/objective AST match the pre-repair
checkpoint. The full pure suite passes (74 tests); whitespace and syntax checks
pass. The existing CI discovery includes these tests without workflow changes.

Local evidence alias `numerical-repair-2026-11-09` contains the failing-before
receipt, frozen inputs, reproducible qualification script and passing report.
The exact original frozen quadratic and the direct-Jacobian production path
both converge, satisfy independent KKT/bounds checks, and yield actual descent
at the unchanged source. Every frozen derivative resolves under paired probes;
forced exhaustion remains explicitly unusable. These are numerical tests, not
a passing walk. No new iterative fit, source promotion, Blender scene, remote
mutation or merge was performed. Remaining whole-walk obligations are unchanged.
