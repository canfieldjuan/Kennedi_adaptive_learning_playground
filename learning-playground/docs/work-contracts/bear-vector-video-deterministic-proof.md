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

## Cold Diff Audit

### Gaps First

No gap remains in the final diff.

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

## Gap Audit

DONE for this review-only deterministic proof. The rejected workflow is absent,
the repeated hashes match, all declared verification passed, and no protected
surface changed. Owner visual approval remains the next gate before any runtime
integration or additional Bear Bakes Bread beat.
