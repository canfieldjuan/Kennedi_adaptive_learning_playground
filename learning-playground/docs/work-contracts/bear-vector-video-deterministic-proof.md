# Bear Mixing Deterministic Vector Video Proof

The operator rejected the Wan-generated mixing videos on 2026-07-12 and
explicitly accepted the recommendation to replace image-to-video generation
with deterministic animation of the project-owned Inkscape layers. This
contract replaces the rejected direction inside PR #101; it is not an additive
ComfyUI follow-up.

## Before Code

### Root Cause

The newer Inkscape plate improved still-frame art, but Wan2.2 TI2V 5B could not
preserve the exact character and object interaction over time. Across fixed
seeds, the generated videos disconnected or removed the spoon, distorted the
face and hat, stretched props, or reduced the requested movement to near-static
frames. Better source art cannot solve a temporal model that reinterprets clean
vector geometry on every frame.

The problem is the animation method, not the Bear Cafe drawing, playback,
narration, curriculum, evidence, or child interaction. The live PR also has
twelve P2 findings against the rejected ComfyUI runner's safety/provenance
boundary. Repairing that runner would harden a workflow whose output already
failed the owner look gate, so it would not reach the root cause.

### Correct Fix Must Touch

- Remove every ComfyUI/Wan-specific file introduced by PR #101: model/runtime
  records, prompts, render manifests, UI/API graphs, generated candidate review
  videos/contact sheets, Comfy runner, focused Comfy tests, and superseded Comfy
  work contracts. Rejected generated concepts must not survive in the final PR
  diff as production assets or dead tooling.
- Preserve the approved visual work by converting the layered Bear Cafe kitchen
  plate into one editable animation SVG. Motion must live in named project-owned
  vector layers for the mixing arm, spoon, visible grip, dough, and any bounded
  facial reaction; no generated frame may redraw those shapes.
- Add a small local vector-render manifest that pins source path/hash, 1280x704,
  77 frames, 24 FPS, timeline duration, external review output, no audio, and
  `production_writes_allowed: false`.
- Replace the Comfy runner with a no-new-dependency repository CLI that uses the
  already-installed Playwright/Chromium stack to pause the SVG timeline at each
  exact frame, writes PNG frames only to an external isolated lab, and invokes
  installed FFmpeg with bounded single-threaded VP9 settings. It must support
  `render --manifest <path>` and `--dry-run`, reject network content and unsafe
  paths/symlinks, verify the source hash, and never write into `public`.
- Add focused tests for manifest boundaries, source hash, path and symlink
  rejection, exact frame-time planning, no external content, and FFmpeg command
  construction. The committed manifest and editable SVG must be tested.
- Render the proof twice from clean frame directories and require identical
  source, frame-set, and WebM SHA-256 values. A deterministic claim without a
  repeated matching render is incomplete.
- Add only the accepted deterministic review WebM, a contact sheet, and
  desktop/mobile source previews under `docs/captures/video/`.
- Replace the two AI-proof ledger entries with one deterministic vector-proof
  provenance entry that records original/project-owned sources, Inkscape,
  Chromium, FFmpeg, no AI assistance, output hashes, and owner approval pending.
- Record exact verification and a line-cited cold diff audit here before push.

### Explicit Non-Scope

- Do not replace or edit the shipped `public/assets/videos/bear-bakes-bread.webm`,
  poster, family-safe video manifest, Video Vault runtime/types/validator/
  evidence, response activity, activity catalog, routing, or child/parent UI.
- Do not change correct answers, narration, response choices, event timing,
  evidence, mastery, transfer, curriculum, difficulty, recommendations,
  progress, storage, export/reset, parent approval, or completion semantics.
- Do not retain, repair, or expand the ComfyUI runner; do not add a checkpoint,
  LoRA, model, custom/cloud node, prompt workflow, generated image/video/audio,
  voice clone, stock art, external media, network service, or authoring account.
- Do not add a dependency, package change, schema, activity, route, reward,
  timer, autoplay, loop, or broad animation framework.
- Do not commit temporary PNG frame sequences, rejected concepts, duplicate
  exports, browser profiles, databases, or external-lab run records.
- Do not integrate the proof into child mode, merge PR #101, or begin the other
  two Bear Bakes Bread beats. Owner visual approval remains a separate gate.
- Do not touch another game, PR, branch, worktree, persisted state, or unrelated
  shared-checkout file. PR #101 remains ready for review, never draft.

### Assumptions and Blockers

- The layered Inkscape Bear Cafe kitchen plate is approved as the visual source
  to animate; the generated Wan motion is not approved.
- Inkscape 1.4.4, the repository's existing Playwright/Chromium installation,
  and FFmpeg 6.1.1 are available locally. No dependency installation is allowed.
- Chromium supports SVG timeline control through `pauseAnimations()` and
  `setCurrentTime()`. If exact seeking is unavailable, stop rather than capture
  real-time nondeterministic playback.
- The external vector lab must be outside the repository and free of symlinked
  path components. A pre-existing unsafe path is a blocker, not permission to
  delete or follow it.
- This proof may show only subtle controlled movement. Preschool readability,
  stable identity, and clean object contact outrank animation amplitude.

## Owner Look Correction: Spoon Contact and Stir Path

### Root Cause

Owner review on 2026-07-12 found that the Bear appears to move the spoon up and
down outside the bowl instead of stirring inside it. The source draws the spoon
bowl above the Bear's hand and rotates the entire arm/spoon/grip assembly by up
to five degrees around the shoulder. That geometry and pivot produce a broad
vertical arc; deterministic rendering faithfully reproduces the wrong authored
motion.

The same review wake exposed three current-head P2 runner findings. The runner
derives its protected root from the manifest tree rather than this checkout,
hashes one SVG read but navigates Chromium back to the mutable file path, and
counts only some SMIL tags instead of whitelisting every animation element and
target. Those are proof-integrity defects in the active replacement runner and
must be closed in this correction.

### Correct Fix Must Touch

- Redraw the spoon so its handle passes through the visible grip and its working
  end remains visibly inside the dough, behind the bowl's foreground rim.
- Replace the broad shoulder rotation with a small synchronized, predominantly
  horizontal arm/spoon/grip stir. Limit vertical travel to two pixels, keep the
  arm start covered by the body overlap, and keep the spoon tip inside the bowl
  for every sampled frame. Keep the dough response subtle and synchronized.
- Update the source hash, regenerate the review WebM, contact sheet, and source
  previews, and replace all recorded deterministic hashes.
- Anchor the protected project root to the checked-in runner location, require
  the manifest/source to remain inside that checkout, render the already-read
  validated SVG bytes, and whitelist the complete SMIL element/target set.
- Add focused regressions for checkout escape, mutable source avoidance, and
  extra SMIL elements; rerun the full proof and repository verification.
- Reconstruct and line-cite the revised diff before the next push.

### Must Not Change

All prior Explicit Non-Scope boundaries remain unchanged. In particular, do not
change runtime video assets, child routes, narration, events, curriculum,
evidence, approval, dependencies, other games, or the other two Bear Bakes Bread
beats. Do not broaden the visual revision beyond spoon geometry, grip/contact,
and the bounded mixing motion required by the owner feedback.

### Verification Plan

- Sample every rendered frame and confirm the spoon working end stays inside the
  bowl/dough region while the hand/grip remains connected to the arm and shaft.
- Inspect a new contact sheet and final WebM at desktop and source-scale mobile
  sizes; owner approval remains the final motion-quality gate.
- Render twice from clean directories and compare source, frame-set, and WebM
  hashes byte for byte.
- Run the focused runner tests, full test suite, typecheck, build, viewport,
  contract, media decode, XML/JSON, protected-path, and diff checks.

## Review Correction: Exact Bytes, Viewport, and Full Spoon Bounds

### Root Cause

The review of head `8a202197923824121d881b082fad362e6f72179d`
identified three proof-integrity gaps. The runner reads the source once into the
string rendered by Chromium and again through `sha256File`, so a concurrent
rewrite can make the recorded hash describe different bytes. Browser validation
checks the `viewBox` but not the SVG root's intrinsic/rendered viewport. The
mixing guard checks only the spoon working-end center, allowing an enlarged or
shifted ellipse to cross the bowl boundary while its midpoint remains accepted.

Verification of the first implementation produced one cold-render frame/output
hash mismatch before two later renders stabilized. SMIL begins running at page
load, so allowing browser validation to occur before the first explicit pause
leaves a cold-start timing window. The timeline must be paused and reset to zero
immediately after navigation, before validation or frame sampling.

### Correct Fix Must Touch

- Read the SVG once as bytes, derive validation text and SHA-256 from that same
  buffer, and build Chromium's data URL from those exact bytes.
- Validate root intrinsic width/height and rendered bounding width/height in the
  browser in addition to the viewBox and timeline contract.
- Give the bowl back an explicit geometry target and require the full spoon
  working-end bounds to remain inside the bowl while its center remains in the
  dough region on every frame.
- Pause the SVG timeline and seek to zero immediately after navigation, before
  browser validation, then retain exact per-frame seeks.
- Add focused regressions for exact-byte hashing/data navigation, root viewport
  pinning, and a spoon ellipse whose center passes but full bounds escape.
- Rerun deterministic rendering, media validation, repository gates, and the
  cold diff audit before another push.

### Must Not Change

All original and owner-look non-scope remains protected. Do not alter the
approved corrected stir path, scene composition, runtime assets, child behavior,
dependencies, curriculum, evidence, parent boundaries, or another game/beat.

### Verification Plan

- Prove the loaded source hash equals the exact byte buffer embedded in the data
  URL without a second source-file read.
- Probe both a passing and failing side of root viewport and full spoon-bound
  validation.
- Repeat all owner-look correction rendering, hash, media, test, build, viewport,
  protected-path, and audit checks.

## Merge-Readiness Correction: Checkout, IDs, and Render Lock

### Root Cause

The review of head `d6204cbea36050ec01c73306f00d5640e0405d0e`
identified three remaining P2 boundaries. The protected root is the
`learning-playground` package, so a lab at its parent Git checkout incorrectly
passes as external. Required geometry IDs are checked for presence but not
uniqueness, allowing browser geometry to measure a hidden duplicate instead of
the visible proof element. Concurrent render commands share and clean the same
frame/output paths without serialization, so one run can hash frames that a
second run replaces before the first encode completes.

### Correct Fix Must Touch

- Derive both package and parent Git-checkout roots from the checked-in runner;
  require manifests/sources inside the package and every lab/frame/output/lock
  path outside the entire checkout.
- Require every declared proof target ID exactly once in source text and again
  in the parsed browser document before geometry measurement.
- Acquire an atomic per-proof external-lab lock before cleaning frames and hold
  it through frame hashing, FFmpeg encoding, output hashing, and run-record
  writing. Reject a second concurrent render without touching shared output and
  release only the acquired lock in `finally`.
- Add focused tests for a lab at the checkout root, duplicate target IDs, and
  two lock acquisitions for the same proof; rerun rendering and all gates.
- Reconstruct and line-cite the final diff before push.

### Must Not Change

All prior non-scope remains protected. Do not change art, stir motion, proof
geometry, review media, runtime assets, child behavior, dependencies, curriculum,
evidence, parent boundaries, or another game/beat. Do not resolve or merge review
threads as part of the code correction.

### Verification Plan

- Probe a lab at the package root, Git checkout root, and an external directory;
  only the external path may pass.
- Probe exactly-one and duplicate required IDs in source validation.
- Acquire one proof lock, prove a second acquisition fails, release it, and
  prove a later acquisition succeeds.
- Repeat focused/full tests, three deterministic renders, media checks,
  protected-path checks, and the cold diff audit.

## Deterministic Proof Standard

- Source: one editable Inkscape SVG composed only of local vector shapes.
- Canvas: 1280x704.
- Timeline: 77 frames at 24 FPS; frame `n` seeks to `n / 24` seconds.
- Motion: one bounded stir path with arm, grip, and spoon synchronized; subtle
  dough response; optional brief blink. No camera movement or scene cut.
- Rasterization: local Chromium screenshots at device scale 1 after the SVG
  timeline is paused and explicitly sought.
- Encoding: installed FFmpeg, VP9, 24 FPS, 77 frames, `yuv420p`, no audio,
  stripped source metadata, and single-threaded deterministic settings. Generic
  deterministic muxer encoder/duration fields may remain.
- Output: external lab first; one selected review copy under
  `docs/captures/video/`; never `public`.
- Determinism: two clean full renders must produce identical combined frame and
  WebM SHA-256 values.

The proof passes only if the Bear, hat, face, counter, bowl, hand/grip, spoon,
and background remain exact; the spoon stays visibly held; the movement is calm
and legible; no frame is blank; and the WebM fully decodes at the pinned
properties. Owner approval, not CI, determines whether the motion feels good.

## Verification Plan

- Validate this contract before deletion or implementation.
- Remove all rejected Comfy files and confirm the final diff contains no
  ComfyUI/Wan implementation, model hash, prompt workflow, or AI-generated
  review artifact outside this historical rejection record.
- Validate the animation SVG through `xmllint`, Inkscape 1.4.4 export, browser
  import, layer/animation checks, and no text/image/external-reference scan.
- Run focused tests and CLI dry-run before rendering.
- Render twice from independently cleaned external frame directories. Compare
  source, combined-frame, and WebM SHA-256 values byte for byte.
- FFprobe and fully decode the WebM; inspect a multi-frame contact sheet and run
  black, freeze, and scene-cut checks.
- Run `npm test`, `npm run typecheck`, `npm run build`,
  `npm run test:viewport`, `npm run lint --if-present`, work-contract check,
  `git diff --check`, media/SVG/JSON checks, and protected-path scans.
- Reconstruct the final PR diff against current `origin/main`, cite every
  change, prove every contract item is present, and lead with any gap.

## Superseded First-Pass Audit

### Gaps First

This audit describes the first deterministic proof and is superseded by the
2026-07-12 owner look correction above. The current proof has a confirmed visual
gap: its authored spoon geometry and shoulder pivot do not depict stirring
inside the bowl. Three proof-integrity findings also remain open until the
correction is implemented and verified.

The cold read did find three runner gaps before completion. A symlinked manifest
could reach parsing before the symlink boundary, an inline SVG event attribute
could execute despite element filtering, and an encoder failure could leave a
partial WebM at the expected output path. The final runner now rejects the
manifest symlink before reading it, rejects event-handler attributes, and
removes failed encoder output while waiting for timeout termination with a
bounded grace period
(`scripts/video-production/vector-video.mjs:110`,
`scripts/video-production/vector-video.mjs:176`,
`scripts/video-production/vector-video.mjs:274`,
`scripts/video-production/vector-video.mjs:416`). Focused regressions cover the
new input and failure paths (`tests/scripts/vector-video.test.ts:64`,
`tests/scripts/vector-video.test.ts:105`,
`tests/scripts/vector-video.test.ts:152`).

`origin/main` advanced during the audit. After integrating that head, the final
`git diff --name-status origin/main...HEAD` contains only the ten files
reconstructed below. The protected-path scan returns no `public/`, `src/`,
package, Content Foundry, runtime, activity, curriculum, evidence, or approval
file.

### Change-by-Change Reconstruction

- `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg` is one
  1280x704, 77-frame editable Inkscape source with fourteen named vector layers
  and no linked media (`mix-dough-vector-animation.svg:2`,
  `mix-dough-vector-animation.svg:5`). It draws the stable Bear Cafe scene and
  Bear identity (`mix-dough-vector-animation.svg:53`), adds one bounded blink
  (`mix-dough-vector-animation.svg:76`), and synchronizes the arm, spoon, dough,
  and visible grip through authored SVG transforms
  (`mix-dough-vector-animation.svg:89`,
  `mix-dough-vector-animation.svg:99`,
  `mix-dough-vector-animation.svg:109`,
  `mix-dough-vector-animation.svg:122`). This directly replaces model-redrawn
  motion with exact project-owned geometry.
- `design-source/video/bear-bakes-bread/vector-render-manifest.json` marks the
  job proof-only and forbids production writes while pinning the source hash,
  canvas, frame count, FPS, and external paths (`vector-render-manifest.json:2`,
  `vector-render-manifest.json:7`, `vector-render-manifest.json:8`,
  `vector-render-manifest.json:13`). It also pins local no-network Chromium and
  deterministic audio-free VP9 settings (`vector-render-manifest.json:15`,
  `vector-render-manifest.json:20`).
- `scripts/video-production/vector-video.mjs` adds only the bounded `render`
  and `--dry-run` CLI (`vector-video.mjs:29`). It validates the manifest and SVG
  execution/content boundary (`vector-video.mjs:54`, `vector-video.mjs:110`),
  verifies paths, symlinks, and the source hash before rendering
  (`vector-video.mjs:176`), seeks exactly `n / 24` in local Chromium with network
  requests blocked (`vector-video.mjs:217`, `vector-video.mjs:248`), hashes the
  clean frame set, encodes fixed VP9, and writes a run record only after success
  (`vector-video.mjs:274`, `vector-video.mjs:286`). Output cleanup, external-lab
  containment, and bounded child-process handling are enforced at
  `vector-video.mjs:327`, `vector-video.mjs:390`,
  `vector-video.mjs:401`, and `vector-video.mjs:416`.
- `tests/scripts/vector-video.test.ts` adds nine focused tests. They cover the
  CLI and proof-only manifest (`vector-video.test.ts:29`), committed editable
  source and external-content rejection (`vector-video.test.ts:53`,
  `vector-video.test.ts:64`), exact frame planning and FFmpeg construction
  (`vector-video.test.ts:80`, `vector-video.test.ts:91`), path/symlink and source
  hash boundaries (`vector-video.test.ts:105`, `vector-video.test.ts:124`), and
  removal of stale or partial success evidence after a failed rerender
  (`vector-video.test.ts:152`).
- `docs/art/asset-provenance.md` records the proof as draft and review-only,
  identifies editable sources and exact tools, and declares no third-party or
  AI asset content (`docs/art/asset-provenance.md:101`,
  `docs/art/asset-provenance.md:106`, `docs/art/asset-provenance.md:110`,
  `docs/art/asset-provenance.md:114`, `docs/art/asset-provenance.md:124`). It
  links the review deliverables, preserves owner approval as pending, and
  records all three repeated-render hashes
  (`docs/art/asset-provenance.md:126`, `docs/art/asset-provenance.md:129`,
  `docs/art/asset-provenance.md:130`).
- The four binary review files under `docs/captures/video/` are the selected
  WebM, contact sheet, and desktop/mobile source previews named by the ledger at
  `docs/art/asset-provenance.md:106` and
  `docs/art/asset-provenance.md:126`. They have no line-addressable content and
  are review artifacts only; none is under `public`.
- This contract records the root cause, allowed and protected surfaces,
  deterministic proof standard, verification, and the present cold audit
  (`docs/work-contracts/bear-vector-video-deterministic-proof.md:11`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:26`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:59`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:94`).

Every changed file traces to the Correct Fix Must Touch list. No changed file
traces only to convenience, and no Explicit Non-Scope path or behavior moved.
The rejected ComfyUI runner, workflows, prompts, model records, generated
candidates, focused tests, and superseded contracts are absent from the final
diff rather than retained as dead tooling.

### Verification

- `npx vitest run tests/scripts/vector-video.test.ts`: 9/9 passed.
- `npm test`: work-contract check passed; Content Foundry 46 passed with one
  expected skip; Vitest 58 files and 773 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run test:viewport`: 6/6 Playwright checks passed.
- `npm run lint --if-present`: exited 0; the repository has no lint script.
- `node scripts/check-work-contract.mjs` and `git diff --check`: passed.
- `xmllint --noout` and JSON parsing passed. Inkscape 1.4.4 exported the
  1280x704 initial frame; it warned that it does not preview SMIL elements, so
  Chromium remains the contractually pinned timeline renderer.
- Two clean final renders matched: source SHA-256
  `3fdf8aac7903e0c25478eb6c91eec6e53b618b791133fda20dc5c1a511f12984`,
  combined frame-set SHA-256
  `fa802b6e28d788aa2e708d87b5ea85ae6424c16de88d6b8466cad7eebaeec115`,
  and WebM SHA-256
  `ddfb83043806636d0cf16a775c90d8e21de11e6d96a2715c7a6f963741d9bdf1`.
- The committed WebM is byte-identical to the final external render. FFprobe
  reports VP9, 1280x704, `yuv420p`, 24 FPS, 3.209 seconds, 99,605 bytes, and no
  audio; a full FFmpeg decode passed. Black-frame and scene-cut checks emitted
  no detections. A strict 0.5-second freeze check identifies the deliberately
  quiet pre/post-stir holds; a 1.0-second threshold emits no freeze detection.
  The contact sheet was visually inspected for stable Bear identity, spoon
  contact, nonblank frames, and calm bounded movement. Owner look approval is
  still pending and is not implied by these technical checks.

## Superseded Gap Audit

NOT DONE. The rejected generated workflow remains absent and the protected
surface remains unchanged, but owner review rejected the spoon contact/stir
motion and the current-head runner findings require correction. Do not push the
next head until the revised proof, focused regressions, repeated hashes, full
verification, and a new cold diff audit are complete.

## Revised Cold Diff Audit

### Gaps First

This audit is superseded by the exact-bytes, viewport, and full-spoon-bounds
review correction above. Those three confirmed implementation gaps remain until
the next verified head. Owner visual approval also remains pending.

- **Confirmed and corrected:** the first deterministic proof placed the spoon's
  working end above the hand and used a broad shoulder rotation, producing the
  owner-reported up/down motion outside the bowl. The revised source puts the
  shaft through the grip, places the working end inside the dough behind the
  foreground rim, and synchronizes arm, spoon, and grip with 14 pixels of
  horizontal travel and no more than two pixels vertically
  (`design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:89`,
  `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:99`,
  `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:110`,
  `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:120`,
  `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:129`).
- **Confirmed and corrected:** the runner formerly trusted the manifest tree as
  the protected root. It now derives the root from its own checked-in location
  and requires both manifest and source to remain inside it
  (`scripts/video-production/vector-video.mjs:20`,
  `scripts/video-production/vector-video.mjs:186`).
- **Confirmed and corrected:** Chromium formerly reopened the mutable SVG path
  after hashing. It now navigates a data URL built from the already-read,
  validated bytes and blocks every other request
  (`scripts/video-production/vector-video.mjs:260`).
- **Confirmed and corrected:** source validation formerly counted only a subset
  of SMIL. Text and browser validation now require exactly the declared four
  transforms and blink, their exact targets, and no extra animation tag
  (`scripts/video-production/vector-video.mjs:112`,
  `scripts/video-production/vector-video.mjs:140`,
  `scripts/video-production/vector-video.mjs:362`).
- **Confirmed and corrected:** every captured frame now checks the spoon working
  end against the dough bounds and checks hand/grip/shaft contact before the PNG
  is written (`scripts/video-production/vector-video.mjs:277`,
  `scripts/video-production/vector-video.mjs:419`). Both clean 77-frame renders
  completed this guard without an escape.
- **Could not determine:** whether the corrected motion meets the owner's look
  standard. The refreshed contact sheet and WebM require owner inspection.

The final `git diff --name-status origin/main` contains exactly ten declared
proof files. A protected-path scan returns no `public/`, `src/`, package,
Content Foundry, runtime, activity, curriculum, evidence, or approval file.

### Change-by-Change Reconstruction

- The editable SVG preserves the 1280x704, 77-frame, fourteen-layer Bear Cafe
  scene (`mix-dough-vector-animation.svg:2`,
  `mix-dough-vector-animation.svg:5`). It keeps Bear identity and the blink
  unchanged (`mix-dough-vector-animation.svg:53`,
  `mix-dough-vector-animation.svg:76`) while changing only the mixing arm,
  dough, spoon, grip, and foreground layering needed for the corrected action
  (`mix-dough-vector-animation.svg:89`,
  `mix-dough-vector-animation.svg:99`,
  `mix-dough-vector-animation.svg:110`,
  `mix-dough-vector-animation.svg:120`,
  `mix-dough-vector-animation.svg:129`).
- The manifest remains proof-only with production writes forbidden and pins the
  corrected source hash, geometry, external paths, local no-network browser,
  and deterministic audio-free VP9 settings
  (`vector-render-manifest.json:2`, `vector-render-manifest.json:7`,
  `vector-render-manifest.json:8`, `vector-render-manifest.json:13`,
  `vector-render-manifest.json:15`, `vector-render-manifest.json:20`).
- The repository CLI keeps its bounded `render`/`--dry-run` interface and fixed
  manifest/encoding validation (`vector-video.mjs:31`, `vector-video.mjs:56`).
  It now anchors the checkout, hashes and renders the same source bytes,
  whitelists all motion, enforces per-frame physical geometry, cleans failed
  output, and retains bounded FFmpeg handling (`vector-video.mjs:112`,
  `vector-video.mjs:186`, `vector-video.mjs:260`, `vector-video.mjs:277`,
  `vector-video.mjs:290`, `vector-video.mjs:296`, `vector-video.mjs:419`,
  `vector-video.mjs:484`, `vector-video.mjs:499`).
- The nine focused tests still cover CLI/manifest limits, committed source,
  external content, frame timing, FFmpeg arguments, paths/symlinks, source hash,
  stale evidence, and failed output. The correction adds explicit extra-SMIL,
  outside-checkout manifest, and immutable source-byte assertions
  (`tests/scripts/vector-video.test.ts:54`,
  `tests/scripts/vector-video.test.ts:68`,
  `tests/scripts/vector-video.test.ts:80`,
  `tests/scripts/vector-video.test.ts:113`,
  `tests/scripts/vector-video.test.ts:132`,
  `tests/scripts/vector-video.test.ts:149`,
  `tests/scripts/vector-video.test.ts:217`).
- The provenance ledger remains draft/review-only, documents original project
  ownership and no AI or third-party asset content, records the owner-feedback
  correction and exact repeated-render hashes, and keeps owner approval pending
  (`docs/art/asset-provenance.md:101`,
  `docs/art/asset-provenance.md:106`,
  `docs/art/asset-provenance.md:110`,
  `docs/art/asset-provenance.md:124`,
  `docs/art/asset-provenance.md:129`,
  `docs/art/asset-provenance.md:130`).
- The four binary files named at `docs/art/asset-provenance.md:106` and
  `docs/art/asset-provenance.md:126` replace only the review WebM, contact sheet,
  and desktop/mobile source previews. They are not under `public` and have no
  line-addressable content.
- This contract records the original root cause and boundaries plus the owner
  feedback correction before implementation
  (`docs/work-contracts/bear-vector-video-deterministic-proof.md:11`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:26`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:59`,
  `docs/work-contracts/bear-vector-video-deterministic-proof.md:94`).

Every changed file traces to the original or owner-correction Correct Fix Must
Touch list. Nothing in Must Not Change moved. The twelve outdated ComfyUI review
threads target a deleted file; the three current runner findings trace directly
to the corrected checkout, immutable-byte, and SMIL boundaries above.

### Verification

- `npx vitest run tests/scripts/vector-video.test.ts`: 9/9 passed.
- `npm test`: work-contract check passed; Content Foundry 46 passed with one
  expected skip; Vitest 58 files and 773 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run test:viewport`: 6/6 Playwright checks passed.
- `npm run lint --if-present`: exited 0; no lint script exists.
- `node scripts/check-work-contract.mjs`, `git diff --check`, XML validation,
  JSON parsing, external-reference scan, rejected-workflow scan, and temporary
  output scan passed.
- Inkscape 1.4.4 exported a 1280x704 initial frame. Its expected warning that it
  does not preview SMIL leaves Chromium as the pinned timeline renderer.
- Two clean corrected renders matched exactly: source SHA-256
  `8926e9082ca11ad3fd240c1d583a7d4d0e93c4c3f37888a7989982b63fda1a4f`,
  frame-set SHA-256
  `5635b8874f137c35eae7ea3edcd0c986a5ff0e2f609c39cf4144300eaaf1a7d6`,
  and WebM SHA-256
  `67e0e28b72cfbe6fd0922b6330724d44191b3a501d507ac05eebcd5c330b904b`.
- The committed WebM is byte-identical to the final external render. FFprobe
  reports VP9, 1280x704, `yuv420p`, 24 FPS, 3.209 seconds, 85,546 bytes, and no
  audio; full decode passed. Black-frame and scene-cut checks emitted no
  detections. The generic freeze detector reports the mostly-static full scene
  from frame zero even though sampled frames and the per-frame geometry guard
  confirm bounded local movement; it is not a useful pass/fail signal for this
  composition. The refreshed contact sheet was inspected for stable identity,
  visible hand/grip/shaft contact, spoon immersion, and horizontal motion.

## Superseded Review Gap Audit

NOT DONE. The owner-feedback geometry remains corrected, but the exact-byte,
root-viewport, and full-spoon-bounds findings on head `8a20219` must be fixed,
tested, rerendered, and cold-audited before another push. Owner visual approval
remains pending before merge, runtime integration, or additional Bear Bakes
Bread beats.

## Final Review Closure Audit

### Gaps First

No implementation gap remains after the current-head review correction. Owner
visual approval remains pending and is not an automated result.

One verification gap appeared during implementation: the first render after the
review fixes produced different frame/output hashes than the next two despite an
identical source hash. The SVG had been allowed to run between navigation and
the first loop pause. The final runner now pauses and seeks to zero immediately
after navigation, before browser validation (`scripts/video-production/vector-video.mjs:268`).
Three consecutive clean renders after that fix match exactly. The mismatch is
therefore recorded and corrected rather than omitted from the deterministic
claim.

The three review findings are each confirmed and corrected:

- One `readFile` now produces the byte buffer used for validation text, SHA-256,
  and the Chromium data URL (`scripts/video-production/vector-video.mjs:205`,
  `scripts/video-production/vector-video.mjs:263`,
  `scripts/video-production/vector-video.mjs:344`). There is no second source
  read or source-path hash race.
- Browser validation now checks viewBox, intrinsic root width/height, and actual
  rendered root width/height before capture
  (`scripts/video-production/vector-video.mjs:396`,
  `scripts/video-production/vector-video.mjs:417`). Root-tag validation also
  limits pinned source attributes to the actual opening SVG element
  (`scripts/video-production/vector-video.mjs:113`).
- The SVG gives the bowl back an explicit geometry target
  (`design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg:100`).
  Every frame now requires the spoon center inside the dough and the full spoon
  working-end bounds inside the bowl while retaining hand/grip/shaft checks
  (`scripts/video-production/vector-video.mjs:455`,
  `scripts/video-production/vector-video.mjs:466`,
  `scripts/video-production/vector-video.mjs:478`).

### Change-by-Change Reconstruction

- `mix-dough-vector-animation.svg` adds only `bowl-back` to the existing bowl
  ellipse so the full-bound guard has an explicit project-owned target
  (`mix-dough-vector-animation.svg:99`). The corrected art and stir transforms
  remain unchanged (`mix-dough-vector-animation.svg:89`,
  `mix-dough-vector-animation.svg:110`).
- `vector-render-manifest.json` changes only the source SHA-256 to match those
  exact revised SVG bytes (`vector-render-manifest.json:7`); proof-only,
  no-production-write, geometry, browser, and encoding constraints remain pinned
  (`vector-render-manifest.json:4`, `vector-render-manifest.json:8`,
  `vector-render-manifest.json:15`, `vector-render-manifest.json:20`).
- `vector-video.mjs` changes the proof integrity path only: one source buffer,
  exact-byte hashing/navigation, immediate timeline freeze, full root viewport
  validation, and full spoon bounds (`vector-video.mjs:205`,
  `vector-video.mjs:263`, `vector-video.mjs:268`, `vector-video.mjs:396`,
  `vector-video.mjs:455`). Existing output isolation, failure cleanup, and
  bounded FFmpeg handling remain at `vector-video.mjs:521` and
  `vector-video.mjs:536`.
- `vector-video.test.ts` expands the focused suite from nine to ten tests. It
  verifies the committed bowl target, rejects a root width copied outside the
  opening tag, checks the exact loaded byte hash and data URL, supplies intrinsic
  and rendered viewport values, and probes a spoon whose center passes while its
  edge escapes (`tests/scripts/vector-video.test.ts:67`,
  `tests/scripts/vector-video.test.ts:89`,
  `tests/scripts/vector-video.test.ts:152`,
  `tests/scripts/vector-video.test.ts:177`,
  `tests/scripts/vector-video.test.ts:217`,
  `tests/scripts/vector-video.test.ts:224`).
- `asset-provenance.md` updates the source hash and documents the single-buffer,
  immediate-freeze, intrinsic viewport, and full spoon-bound proof behavior
  while preserving draft status and owner approval pending
  (`docs/art/asset-provenance.md:105`,
  `docs/art/asset-provenance.md:129`,
  `docs/art/asset-provenance.md:130`).
- This work contract records the review root cause, allowed correction surface,
  protected behavior, the observed mismatch, and this final cold audit before
  push (`docs/work-contracts/bear-vector-video-deterministic-proof.md:148`).

The total PR diff against current `origin/main` remains the same ten declared
proof files. The review correction itself modifies only the six files above.
No `public/`, `src/`, package, Content Foundry, runtime, activity, curriculum,
evidence, approval, or unrelated game file moved.

### Verification

- `npx vitest run tests/scripts/vector-video.test.ts`: 10/10 passed.
- `npm test`: work-contract check passed; Content Foundry 46 passed with one
  expected skip; Vitest 58 files and 774 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run test:viewport`: 6/6 Playwright checks passed.
- `npm run lint --if-present`: exited 0; no lint script exists.
- `node scripts/check-work-contract.mjs`, `git diff --check`, XML validation,
  JSON parsing, external-reference scan, media decode, black-frame, scene-cut,
  protected-path, rejected-workflow, and temporary-output checks passed.
- Three consecutive clean post-freeze renders matched: source SHA-256
  `af4947db573ba04e7f6a32dfa370d8068751e04675930ee3dc3fc5efaea390df`,
  frame-set SHA-256
  `5635b8874f137c35eae7ea3edcd0c986a5ff0e2f609c39cf4144300eaaf1a7d6`,
  and WebM SHA-256
  `67e0e28b72cfbe6fd0922b6330724d44191b3a501d507ac05eebcd5c330b904b`.
- The committed review WebM is byte-identical to the final external render and
  remains VP9, 1280x704, `yuv420p`, 24 FPS, 3.209 seconds, 85,546 bytes, with no
  audio. The explicit bowl target changes source/provenance bytes but no rendered
  pixels, so the already-corrected review WebM/contact sheet remain current.

## Superseded Final Gap Audit

NOT DONE. Exact source bytes, actual root viewport, full spoon bounds, and
cold-start rendering remain corrected, but checkout-root isolation, proof-target
ID uniqueness, and concurrent render serialization must be implemented, tested,
rerendered, and cold-audited before another push. Owner visual approval and
review-thread resolution remain separate gates before merge or runtime
integration.

## Merge-Readiness Cold Audit

### Gaps First

No implementation gap remains in the three assigned P2 corrections. Owner look
approval and GitHub thread resolution remain separate merge gates.

- **Confirmed and corrected:** the prior protected root ended at the package
  directory. The runner now derives both package and parent checkout roots from
  its checked-in location, requires `.git` at the checkout root, confines
  manifest/source reads to the package, and rejects lab/frame/output paths in
  the entire checkout (`scripts/video-production/vector-video.mjs:20`,
  `scripts/video-production/vector-video.mjs:193`,
  `scripts/video-production/vector-video.mjs:206`,
  `scripts/video-production/vector-video.mjs:218`).
- **Confirmed and corrected:** proof IDs were presence-only. The source now
  requires each declared target exactly once and the parsed browser DOM repeats
  the exact-count check before geometry is read
  (`scripts/video-production/vector-video.mjs:23`,
  `scripts/video-production/vector-video.mjs:141`,
  `scripts/video-production/vector-video.mjs:449`,
  `scripts/video-production/vector-video.mjs:473`).
- **Confirmed and corrected:** concurrent renders shared frame and output paths.
  An atomic per-proof lock is acquired before shared cleanup and held through
  frame hashing, encoding, output hashing, and run-record publication; `finally`
  releases only the acquired lock (`scripts/video-production/vector-video.mjs:257`,
  `scripts/video-production/vector-video.mjs:307`,
  `scripts/video-production/vector-video.mjs:319`,
  `scripts/video-production/vector-video.mjs:339`,
  `scripts/video-production/vector-video.mjs:344`). A real simultaneous CLI
  contender was rejected while the owner completed with the expected hashes.

### Change-by-Change Reconstruction

- `scripts/video-production/vector-video.mjs` changes only proof isolation and
  concurrency boundaries: full-checkout protection, exact-once target IDs, and
  the atomic external lock. Existing SVG bytes, art geometry, timeline, frame
  planning, encoding settings, and review output contract remain unchanged
  (`vector-video.mjs:20`, `vector-video.mjs:23`, `vector-video.mjs:193`,
  `vector-video.mjs:241`, `vector-video.mjs:344`, `vector-video.mjs:426`).
- `tests/scripts/vector-video.test.ts` expands the focused suite from ten to
  eleven tests. It adds a duplicate target rejection, rejects both package and
  parent-checkout lab roots, and proves first-lock pass, concurrent-lock fail,
  release, and later-lock pass (`tests/scripts/vector-video.test.ts:90`,
  `tests/scripts/vector-video.test.ts:125`,
  `tests/scripts/vector-video.test.ts:165`). The browser mock now supplies exact
  target counts (`tests/scripts/vector-video.test.ts:194`).
- `docs/art/asset-provenance.md` records exact-once IDs, full-checkout isolation,
  lock ownership, and concurrent-contender rejection without changing draft or
  owner-approval status (`docs/art/asset-provenance.md:129`,
  `docs/art/asset-provenance.md:130`).
- This contract records the root cause and allowed/protected surface before code
  and adds this line-cited audit (`docs/work-contracts/bear-vector-video-deterministic-proof.md:197`).

The correction modifies only those four declared files. The total PR still
contains the same ten proof files against current `origin/main`. No art source,
manifest, review media, `public/`, `src/`, package, Content Foundry, runtime,
activity, curriculum, evidence, approval, or unrelated game file changed in
this correction.

### Verification

- `npx vitest run tests/scripts/vector-video.test.ts`: 11/11 passed.
- `npm test`: work-contract check passed; Content Foundry 46 passed with one
  expected skip; Vitest 58 files and 775 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- `npm run test:viewport`: 6/6 Playwright checks passed.
- `npm run lint --if-present`: exited 0; no lint script exists.
- `node scripts/check-work-contract.mjs`, `git diff --check`, protected-path,
  temporary-output/lock, exact media-copy, and full media-decode checks passed.
- Three clean lock-enabled renders matched: source SHA-256
  `af4947db573ba04e7f6a32dfa370d8068751e04675930ee3dc3fc5efaea390df`,
  frame-set SHA-256
  `5635b8874f137c35eae7ea3edcd0c986a5ff0e2f609c39cf4144300eaaf1a7d6`,
  and WebM SHA-256
  `67e0e28b72cfbe6fd0922b6330724d44191b3a501d507ac05eebcd5c330b904b`.
- A real concurrent-process probe acquired the first CLI lock, rejected the
  second CLI without touching shared output, completed the owner render at the
  expected hashes, and left no lock behind.

## Final Gap Audit

DONE for checkout-root isolation, proof-target ID uniqueness, and concurrent
render serialization. Every correction traces to the contract, all required
tests and real render probes pass, and nothing in Must Not Change moved. Owner
visual approval and zero unresolved GitHub threads are still required before
merge; this code completion does not authorize either action.
