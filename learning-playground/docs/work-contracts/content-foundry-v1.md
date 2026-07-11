# Content Foundry v1

Tracking issue: #79

## Before Code

### Root Cause

The local ComfyUI stack can generate images, edits, and Wan clips, but it is not
yet a trustworthy learning-content pipeline. Saved JSON and MCP graphs are
independent copies; tool resources and file roots are insufficiently bounded;
the default image path is photoreal; generated text is unreliable; Wan output
dimensions are doubled and motion geometry drifts; and no narration assembly
workflow exists. These gaps can produce silent configuration drift, oversized
GPU jobs, inconsistent child art, or media that looks plausible while changing
instructional objects.

### Correct Fix Must Touch

- Add a versioned Content Foundry tool area with canonical templates loaded by
  the MCP server.
- Add loopback, path, resource, timeout, graph-reference, and output guards.
- Add reference-guided illustrated generation, explicit-mask edits, optional
  structure guidance, and calibrated bounded Wan micro-motion.
- Add local human-narration assembly, media QA, draft manifests, contact sheets,
  and manual approval records that cannot publish.
- Add contracts, unit/media tests, CI enrollment, and local MCP guidance.

### Must Not Change

- No child runtime, route, home screen, activity JSON/schema/catalog, curriculum,
  evidence, mastery, transfer, recommendation, progress, storage, export,
  parent gate, or approval-rule change.
- No generated output may enter child assets or manifests in this slice.
- No generated voice, remote model call, backend, auth, cloud sync, new game,
  reward, streak, ranking, child-facing AI, app dependency bump, or broad
  refactor.
- Do not alter `/home/juan-canfield/Desktop/ComfyUI-master`, the separate
  narration worktree, PR #77, or unrelated untracked work.

## Contract Amendments

1. Per the long-running slice contract, this PR establishes the canonical core,
   bounded generation tools, draft boundary, narration assembly, and tests. One
   real three-scene content run and app integration remain later issue #79
   slices after this foundation is reviewed and merged.
2. PR #81 review confirmed that manifest writers and parent decisions share a
   file but not a lock/reload protocol, approval trusts stored hashes without
   re-reading files, stereo `adelay` does not affect every channel, and the
   fixed four-second contact-sheet interval cannot review a 3.375-second Wan
   clip. The correct follow-up must change only `drafts.py`, `media.py`, their
   tests, and this contract.
3. The first `quality-gate` run confirmed the GitHub runner has no `ffmpeg`.
   Because media QA is a required CI test rather than an optional local check,
   `.github/workflows/learning-playground-quality.yml` is added to the allowed
   surface solely to install the media binary before `npm test`.

## Review Follow-Up Contract

### Root Cause

Draft mutation is currently atomic per file replacement but not serialized per
manifest: in-flight code keeps and rewrites an old object after a parent
decision. Approval validates metadata rather than current files. Separately,
the narration filter treats a per-channel delay as a scalar, and contact-sheet
sampling assumes clips exceed four seconds. CI also invokes the required media
test without installing its runtime binary.

### Correct Fix Must Touch

- Serialize output, QA, and decision writes through one manifest lock; reload
  current state under that lock and refuse post-decision generation writes.
- Before approval, resolve every output inside the draft and recompute its size
  and SHA-256 against the manifest.
- Apply each storyboard delay to all input channels before the final mono mix.
- Derive eight evenly spaced contact-sheet samples from the probed clip duration.
- Add regression tests for rejection during an in-flight write, modified output
  before approval, stereo cue timing, and short-clip contact-sheet sampling.
- Install `ffmpeg` in the existing quality job before the enrolled media test.

### Must Not Change

All original protected child/app surfaces remain protected. Do not relax media
QA, parent approval, loopback/path/resource guards, or the required ffmpeg test.
Do not resolve review threads, merge, or touch another PR from this worker.

### Review Follow-Up Cold Audit

No gap remains in the follow-up diff.

- `drafts.py:63`, `drafts.py:77`, and `drafts.py:80` now share one manifest
  lock. `_update_draft` at line 123 reloads disk state before mutation, syncs the
  caller's stale object, and refuses writes after a decision. This directly
  prevents the reviewed rejection-erasure sequence.
- `drafts.py:232` resolves, bounds, sizes, and re-hashes every output while the
  manifest lock is held before approval. Modified or missing files leave the
  draft undecided.
- `media.py:217` applies each cue delay to all source channels. The mix resets
  sample timestamps at line 222 before finite padding/trimming, avoiding the
  short-cue latency discovered while testing. Final measured two-pass
  normalization remains unchanged.
- `media.py:82` probes source duration and requests eight evenly spaced frames,
  so the 3.375-second Wan contract no longer yields one review frame.
- `test_drafts_client.py:93`, `test_drafts_client.py:107`,
  `test_media.py:43`, and `test_media.py:101` reproduce all four reviewed
  failure paths. The stereo test decodes the final WebM and proves silence before
  the cue and audible narration after it.
- `.github/workflows/learning-playground-quality.yml:43` installs `ffmpeg`
  before `npm test`, reaching the confirmed CI failure without skipping or
  weakening media QA.

Every change traces to amendments 2 or 3. No original protected child/app
surface moved in the follow-up diff, and no review thread was resolved by this
worker.

Verification before rebase: `npm test` passed 33 Foundry tests with one
intentional live-Comfy skip plus all 599 existing tests; `npm run typecheck`,
`npm run build`, and `git diff --check` passed. The workflow provisioning change
requires the next `quality-gate` run for hosted confirmation.

Verification after rebasing onto current `origin/main`: 33 Foundry tests passed
with the same intentional live-Comfy skip; 53 Vitest files and 669 app tests
passed; typecheck, build, and diff checks passed. The PR head still requires a
fresh hosted `quality-gate` observation after push.

## Second Review Follow-Up Contract

### Root Cause

The current edit path accepts arbitrary decoded pixel dimensions even though
the Foundry contract exposes two fixed image budgets. Narration overlap is
mixed into integer PCM before final normalization, so clipping can become
permanent before QA. The Wan latent request is bounded but no graph node
guarantees final saved dimensions. Canny guidance strength affects output but
is omitted from draft provenance. Finally, client timeout stops polling without
cancelling the accepted Comfy job.

The second Wan review is confirmed about the missing output-size guarantee, but
its proposed 960x544 latent request does not account for the prior local 2x
decode observation and would double the bounded latent budget. The correct fix
is an explicit exact-size `ImageScale` after decode.

### Correct Fix Must Touch

- Reject edit source/mask dimensions outside the existing 960x544 and 1024x1024
  presets before either file is uploaded or a graph is queued.
- Mix overlapping narration into floating-point PCM before measured two-pass
  normalization, preserving headroom rather than clipping integer samples.
- Add an explicit 960x544 image-scale node between Wan decode and video creation
  while keeping the calibrated 480x272 latent budget.
- Record `control_strength` in every edit manifest when structure guidance is
  active.
- On timeout, call the local Comfy server's targeted idempotent job-cancel API;
  report cancellation failure rather than silently abandoning active GPU work.
- Add direct regression tests for all five boundaries and update canonical graph
  assertions.

### Must Not Change

Keep the original child/app protected surface, fixed presets, final media QA,
ambient-motion policy, parent approval boundary, and all prior review fixes.
Do not add a global interrupt, broaden dimensions, skip tests, resolve threads,
or merge from this fix worker.

### Second Review Follow-Up Cold Audit

No contract gap remains in the second follow-up diff.

- `comfy_client.py:66` targets only the accepted prompt through Comfy's local
  idempotent cancel endpoint. A job that finishes during cancellation gets one
  final history read; cancellation failures are explicit rather than silently
  leaving GPU work active.
- `media.py:227` writes the unnormalized overlap mix as floating-point PCM, so
  summed samples retain headroom until the existing measured two-pass loudness
  filter limits them.
- `service.py:91` rejects decoded edit dimensions outside `PRESETS` before
  upload. `service.py:113` records the effective Canny guidance strength (or
  null when inactive) in draft provenance.
- `wan-safe-motion.v1.json:14` explicitly scales decoded frames to 960x544
  before `CreateVideo`; the 480x272 latent request remains bounded and the saved
  output now has an explicit path to the QA dimensions.
- `test_drafts_client.py:175`, `test_media.py:55`,
  `test_service_contract.py:90`, `test_service_contract.py:105`, and
  `test_config_workflows.py:124` directly cover targeted cancellation, float
  overlap mixing, pre-upload dimension rejection, strength provenance, and the
  Wan latent/output dimension split.

Every change traces to the second review contract. No child runtime, public
asset, activity, curriculum, parent UI, package, or dependency file changed.
All earlier manifest, timing, contact-sheet, safety, and approval behavior is
retained.

## Third Review Follow-Up Contract

### Root Cause

Four resource and integrity boundaries remain incomplete. Timeout cleanup is
tied to a local extension route instead of ComfyUI's standard queue and
interrupt surfaces. A short video scene is capped but not extended to its
declared timeline, so narration can outlive the visual track. Upload provenance
is hashed from a second filesystem read after upload, allowing a concurrent
replacement to make the manifest describe bytes ComfyUI never received.
Finally, generation and motion source images are byte-capped but not decoded and
dimension-capped before upload, allowing compressed oversized images to consume
unbounded backend resources.

### Correct Fix Must Touch

- Replace timeout cleanup with standard queue inspection, pending deletion, a
  post-delete race check, and prompt-targeted interruption for a running job.
  Re-read history after cleanup so a job that completed during the race is
  collected rather than falsely reported cancelled.
- Extend short video sources by cloning their last frame to the requested scene
  duration while retaining the existing output duration cap.
- Read each uploaded source exactly once, hash and size those exact bytes, and
  use the resulting immutable record in every generation, edit, mask, and
  motion manifest.
- Decode and reject generation and motion source images outside the fixed
  approved preset dimensions before any upload.
- Add focused tests for queue/delete/interrupt races, short-video extension,
  byte-identical upload provenance, and pre-upload image dimension rejection.

### Must Not Change

Do not change the child runtime, activities, curriculum, parent UI, mastery or
transfer rules, public assets, fixed image presets, final media QA, ambient
motion policy, manual approval boundary, package dependencies, or ComfyUI
installation. Do not issue an unqualified global interrupt, broaden accepted
dimensions, publish generated work, resolve review threads, or merge from this
fix worker.

### Third Review Follow-Up Cold Audit

#### Gaps

No untraced change, missing contract requirement, or protected-surface change
was found. The review claim that the configured ComfyUI lacks
`/api/jobs/{id}/cancel` was contradicted by its local `server.py`; the
portability concern still traces to this contract and is resolved with standard
queue surfaces rather than retaining the extension route.

#### Change-By-Change Reconstruction

- `comfy_client.py:37` reads upload bytes once, enforces the byte cap on that
  exact buffer, derives its manifest record at lines 41-45, and sends the same
  buffer at lines 55-57. Timeout handling at lines 79-90 performs cleanup and a
  final history read. Lines 92-112 delete only the accepted pending prompt,
  re-read the queue for a pending-to-running race, and send the accepted prompt
  id with a running interruption.
- `media.py:194` builds each declared scene duration. Video sources receive a
  last-frame `tpad` at lines 200-203 and every segment retains an output `-t`
  cap, so short visuals no longer end before narration.
- `service.py:56`, `service.py:98`, and `service.py:127` route generation, both
  edit sources, and motion through upload records produced from the transmitted
  bytes. The returned records are the manifest provenance at lines 65,
  113-114, and 136. Lines 195-203 decode and preset-cap generation and motion
  inputs before upload; the prior edit dimension guard remains at lines 84-93.
- `test_drafts_client.py:176` proves the exact upload buffer remains capped;
  lines 186-216 exercise pending deletion, the pending-to-running race,
  prompt-targeted interruption, and final history lookup.
- `test_media.py:121` assembles a real 0.4-second video into a two-second scene
  and requires at least 47 decoded output frames.
- `test_service_contract.py:122` proves both generation and motion reject
  decoded oversized images before upload. Lines 137-158 mutate the source after
  upload and prove manifest provenance still names, sizes, and hashes the exact
  original bytes.

Every implementation and test change traces to Correct Fix Must Touch. The
diff contains no child runtime, activity, curriculum, parent UI, mastery,
transfer, public asset, workflow preset, dependency, approval, or ComfyUI
installation change. The standard interrupt request remains prompt-scoped; no
unqualified global interrupt was added.

Verification after a clean rebase onto `origin/main`: `npm test` passed 41
Content Foundry tests with one intentional live-Comfy skip plus 55 Vitest files
and 719 app tests.
`npm run typecheck`, `npm run build`, and `git diff --check` passed.

Gap audit: DONE.

## Fourth Review Follow-Up Contract

### Root Cause

The narrated storyboard path still hashes mutable import files and later gives
their original paths to ffmpeg, so a concurrent replacement can make the
manifest describe different bytes from the rendered clip. That same path
byte-caps scenes but does not preflight decoded dimensions or video frame rate,
leaving compressed oversized media able to exhaust local decode resources.
Timeout cleanup now sends a prompt id to `/interrupt`, but the configured
ComfyUI checks that id and raises a global interrupt in separate steps, so a
finished prompt can race with the next running job. Finally, UUID upload names
prevent repeated use of identical source bytes from reusing ComfyUI storage.

### Correct Fix Must Touch

- Snapshot every resolved scene and narration source from one bounded byte read
  into a private temporary directory. Hash those exact bytes and pass only the
  snapshots to probes, audio checks, and ffmpeg.
- Preflight every scene snapshot before assembly. Require a decodable video
  stream, positive dimensions no larger than 1920x1080 and 2,073,600 pixels,
  and, for video sources, a finite frame rate no greater than 60 fps.
- Record those storyboard snapshot and scene preflight limits in the durable
  Content Foundry contract.
- Use the configured ComfyUI's atomic, idempotent
  `/api/jobs/{prompt_id}/cancel` endpoint. Never fall back to a global
  interrupt; cancellation failure must remain explicit, and final history must
  still win a completion race.
- Replace random upload filenames with full content-hash filenames and send
  `overwrite=true`, so identical retries target the same immutable name rather
  than allocating another input file.
- Add direct tests for mutable storyboard inputs, both sides of scene geometry
  and frame-rate bounds, atomic cancellation, completion races, and upload
  name reuse.

### Must Not Change

Do not change the child runtime, activities, curriculum, parent UI, mastery or
transfer rules, public assets, output dimensions/codecs/loudness, storyboard
duration/count limits, image presets, workflow graphs, approval boundary,
package dependencies, or ComfyUI installation. Do not add a global interrupt,
accept arbitrary external media, publish generated work, resolve review
threads, or merge from this fix worker.

### Fourth Review Follow-Up Cold Audit

#### Gaps

No untraced change, missing contract requirement, or protected-surface change
was found. The earlier portability claim against the atomic job-id route is
contradicted for the configured local ComfyUI by `server.py:910-953`; retaining
the non-atomic standard interrupt would leave the newly confirmed cross-job
race in place.

#### Change-By-Change Reconstruction

- `media.py:20-25` declares finite source-byte, geometry, pixel, frame-rate,
  and still-image boundaries. `media.py:40-67` snapshots every scene and
  narration input, probes and measures only those snapshots, and builds
  manifest records from the snapshot pass. Lines 78-90 keep the snapshots alive
  through ffmpeg and final QA.
- `media.py:92-118` rejects missing streams, non-positive or over-limit
  dimensions, and video over 60 fps. It accepts the inclusive limits and falls
  back from an unavailable average rate to a valid real rate. The one-pass
  bounded copier at lines 338-352 hashes exactly what it writes for later
  consumption.
- `comfy_client.py:37-66` derives the upload name and manifest record from one
  bounded byte buffer. Lines 47 and 54-61 use a full content hash plus
  `overwrite=true`, so identical retries reuse one Comfy input name. Lines
  83-99 call only the configured atomic prompt-id cancellation route and still
  perform a final history read before reporting cancellation.
- `content-foundry.contract.md:29-33` makes snapshot provenance, decoded scene
  limits, and content-addressed upload reuse durable product boundaries.
- `test_media.py:76-126` mutates both original files after snapshots are made
  and proves assembly plus manifest hashing still use the reviewed bytes. Lines
  128-157 test oversized and over-rate rejection, inclusive 1920x1080/60 fps
  acceptance, and the valid frame-rate fallback.
- `test_drafts_client.py:186-201` proves stable content-addressed upload names.
  Lines 203-246 prove timeout cleanup never calls `/interrupt`, targets only the
  accepted prompt, and lets completed history win the cancellation race.

Every implementation, durable-contract, and test change traces to Correct Fix
Must Touch. The diff contains no child runtime, activity, curriculum, parent
UI, mastery, transfer, public asset, workflow graph, image preset, dependency,
approval, or ComfyUI installation change.

Verification after a clean rebase onto `origin/main`: `npm test` passed 46
Content Foundry tests with one intentional live-Comfy skip plus 56 Vitest files
and 748 app tests.
`npm run typecheck`, `npm run build`, and `git diff --check` passed.

Gap audit: DONE.

Verification: `npm test` passed 37 Foundry tests with one intentional live-Comfy
skip plus 53 Vitest files and 669 app tests. `npm run typecheck`,
`npm run build`, and `git diff --check` passed. Live node/model compatibility
still requires running local ComfyUI and remains the explicitly deferred next
slice.

## Cold Diff Audit

### Gaps

No untraced change, missing contract requirement, or protected-surface change
was found in the cold reconstruction.

Live ComfyUI compatibility could not be re-run because the local server at
`127.0.0.1:8188` was stopped after the environment reset. This is not hidden:
the opt-in node/model check is present at
`tools/content-foundry/tests/test_live_comfy.py:17`, and the first real GPU
content run remains explicitly deferred by amendment 1. CI and local media QA
do not depend on ComfyUI.

### Change-By-Change Reconstruction

- `docs/contracts/content-foundry.contract.md:5` defines a local, draft-only
  production boundary; lines 20-28 cap network, file, image, motion, and job
  resources; lines 32-38 preserve manual review; and lines 51-56 define human
  narration output requirements.
- `tools/content-foundry/workflows/*.json` adds four immutable API graphs:
  Redux-guided Flux at `flux-illustrated-redux.v1.json:2`, explicit-mask Flux
  Fill at `flux-inpaint.v1.json:5`, optional Union ControlNet structure guidance
  at `flux-inpaint-canny.v1.json:14`, and fixed 81-frame Wan motion at
  `wan-safe-motion.v1.json:9`.
- `tools/content-foundry/content_foundry/workflows.py:51` maps only declared
  fields into copied canonical graphs, validates references at line 147, and
  constrains motion to approved ambient clauses at lines 119-124.
- `tools/content-foundry/content_foundry/config.py:19` centralizes finite limits,
  validates loopback construction at line 27, and confines resolved inputs to
  imports/references at lines 57-74.
- `tools/content-foundry/content_foundry/comfy_client.py:17` queues bounded local
  jobs, validates and exclusively writes finite outputs, and refuses redirects
  at lines 165-167 so loopback cannot become an open-web request.
- `tools/content-foundry/content_foundry/drafts.py:18` atomically stores draft
  manifests and relative output hashes. The locked manual decision at line 81
  allows exactly one decision and refuses approval without outputs and passing
  QA; manifest integrity is reconstructed at line 150.
- `tools/content-foundry/content_foundry/media.py:21` assembles local scene and
  human-narration inputs. It enforces VP9/Opus, 960x544, 48kHz mono, duration,
  LUFS, and peak at line 89, uses measured two-pass normalization at lines
  152-174, and caps storyboard shape/duration at line 252.
- `tools/content-foundry/content_foundry/service.py:24` composes illustrated
  generation, explicit-mask editing, safe motion, narration assembly, QA, and
  hash validation without copying to child assets. The public operations begin
  at lines 44, 67, 106, and 141.
- `tools/content-foundry/mcp_server.py:16` exposes only status, generation,
  assembly, and validation tools. Manual parent decisions exist only in the
  separate CLI at `tools/content-foundry/foundry.py:21`; neither surface
  publishes content.
- `tools/content-foundry/schemas/draft.schema.json:1`,
  `examples/storyboard.example.json:1`, `references/README.md:1`, and
  `README.md:1` document the manifest, human narration input, reviewed reference
  root, runtime, and non-publication workflow.
- `tools/content-foundry/tests/test_config_workflows.py:17`,
  `test_drafts_client.py:29`, `test_media.py:19`,
  `test_service_contract.py:43`, and `test_live_comfy.py:17` probe both sides of
  guards, malformed backend data, redirects, path escapes, concurrent decisions,
  failed-draft approval, real ffmpeg output, and the MCP approval boundary.
- `package.json:12` enrolls the dependency-free Python suite in the existing
  `npm test` gate. `.gitignore:28` keeps generated drafts and Python caches out
  of version control. No dependency or package-lock change was made.

### Contract Traceability

Every tool, template, schema, example, and test above traces to Correct Fix Must
Touch. The two contract documents trace to the required before-code and durable
product boundaries. `package.json` is the required CI enrollment, while
`.gitignore` prevents local drafts from becoming accidental app assets.

The diff contains no `src/`, `public/`, activity, curriculum, evidence, mastery,
transfer, recommendation, progress, storage, export, or parent-panel change.
It does not modify ComfyUI, the separate narration worktree, PR #77, or any
generated asset. The Must Not Change surface remains untouched.

### Verification

- `npm test`: 29 Content Foundry tests passed with one deliberate live-Comfy
  skip; 52 Vitest files and 599 existing tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite built 117 modules.
- `python3 foundry.py status`: correctly failed closed because loopback ComfyUI
  was not running; no GPU job was queued.
- `git diff --check`: passed.

### Gap Audit

DONE. The deferred real GPU content run and app integration are later issue #79
slices, not omitted work from this amended foundation slice.
