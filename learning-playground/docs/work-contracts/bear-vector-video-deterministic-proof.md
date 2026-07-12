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
- Replace the Comfy runner with a dependency-free repository CLI that uses the
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
  `ComfyUI`, `Wan2.2`, model hash, prompt, or AI-generated review artifact.
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

## Cold Diff Audit

Pending implementation, repeated deterministic rendering, verification, and
line-cited reconstruction.

## Gap Audit

NOT DONE until the rejected workflow is absent, the vector proof hashes match
across two clean renders, verification passes, and the cold audit is complete.
