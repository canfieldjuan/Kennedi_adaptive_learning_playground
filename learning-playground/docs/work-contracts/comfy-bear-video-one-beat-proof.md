# ComfyUI Bear Video One-Beat Proof

This is the first, unshipped slice of the approved Bear video-production arc.
It proves a reproducible local authoring workflow on one mixing-dough beat and
stops for owner visual approval. It does not replace the current Video Vault
media or make generated output child-visible.

## Before Code

### Root Cause

The app already has a safe local Video Vault, one parent-approved three-beat
Bear Bakes Bread clip, parent-recorded narration, a manual response handoff,
and exposure-only event semantics. What it lacks is a reproducible upstream
production workflow for richer video: there is no committed ComfyUI graph,
model/environment record, prompt and seed record, bounded candidate runner,
editable source-frame bundle, or owner-review artifact.

The problem is not playback, narration, scoring, or missing video breadth.
Generating an ad hoc replacement would hide provenance and make character,
license, safety, and repeatability review impossible.

### Correct Fix Must Touch

- `design-source/video/bear-bakes-bread/`: add the editable project-owned
  mixing source, derived Wan input, ComfyUI UI/API workflows, fixed prompts,
  environment record, and versioned render manifest.
- `scripts/video-production/`: add a dependency-free local runner that validates
  the manifest, exact model hashes, loopback server, ComfyUI version, RTX 3090,
  core-node-only startup, workflow bindings, bounded seeds, and local output
  paths before sequential submission. It must support `render`, `assemble`, and
  `--dry-run`, while refusing to write production assets.
- Focused script tests: prove both sides of every runner boundary, including
  valid proof planning and rejection of remote URLs, wrong hashes/version/GPU,
  enabled custom nodes, wrong node classes, too many seeds, unsafe paths, API
  errors, and timeouts.
- `docs/art/asset-provenance.md`: add the AI-assisted proof family with source,
  tool/model terms, hashes, prompts/seeds, known rights limits, and owner look
  approval explicitly pending.
- `docs/captures/video/`: add a bounded four-seed contact sheet and the selected
  review proof only after all candidates are inspected. Rejected full-size
  candidates remain outside the repository.
- This contract: record generation evidence, verification, and a line-cited
  cold diff audit before publication.

### Must Not Change

- Do not replace or edit `public/assets/videos/bear-bakes-bread.webm`, its poster,
  the family-safe video manifest, Video Vault runtime/types/validator/evidence,
  the response activity, activity catalog, routing, or child/parent UI.
- Do not change correct answers, response choices, narration, event timing,
  evidence, mastery, transfer, curriculum, difficulty, recommendations,
  progress, storage, export/reset, parent approval, or completion semantics.
- Do not add a new video, activity, skill, schema, route, dependency, package
  version, child entry, autoplay, loop, reward, streak, timer, or cloud service.
- Do not download or use a LoRA, another checkpoint, custom node, partner node,
  cloud node, generated voice, voice clone, remote runtime asset, protected
  character, branded studio style, living artist style, or third-party source
  image.
- ComfyUI and model weights remain external authoring dependencies. The Vite app
  must not import, launch, call, or require them.
- The runner must not start ComfyUI, install software, mutate model files,
  publish media, copy into `public`, update the child manifest, or delete output.
- Do not touch another game, another open PR/branch/worktree/state, broad art
  rollout, or the unrelated shared-checkout workflow draft.

## Owner-Approved AI Assistance Amendment

The operator was informed before generation that Wan2.2's official materials
license the model under Apache-2.0 and claim no rights over outputs, but do not
provide source-by-source training-data rights provenance or indemnification;
generated output is not assumed exclusive or independently copyrightable. The
operator then explicitly selected: proof then replacement, project vector
style, preserve current human audio, no extra LoRAs/checkpoints, and UI plus a
local runner, and ordered implementation on 2026-07-11.

- Tool: local ComfyUI 0.25.0, GPL-3.0 authoring application, not redistributed.
- Python/PyTorch/CUDA: 3.13.11 / 2.9.1+cu128 / CUDA 12.8.
- Device: NVIDIA RTX 3090, 24 GB, selected explicitly by PCI order.
- Model: `wan2.2_ti2v_5B_fp16.safetensors`, SHA-256
  `456f901338bd9eadbded3828b819109a9b68e8a525ca5cf8d0049a69fcfeca1e`.
- VAE: `wan2.2_vae.safetensors`, SHA-256
  `e40321bd36b9709991dae2530eb4ac303dd168276980d3e9bc4b6e2b75fed156`.
- Text encoder: `umt5_xxl_fp8_e4m3fn_scaled.safetensors`, SHA-256
  `c3355d30191f1f066b26d93fba017ae9809dce6c627dda5f6a66eaa651204f68`.
- Source: existing project-owned Bear mixing illustration, adapted in Inkscape;
  no third-party visual input.
- Prompt restrictions: generic project descriptors only; no artist, studio,
  franchise, brand, or protected-character names.
- Review state: private proof authorized; production use, child visibility,
  merge, and full three-beat replacement remain unapproved.

## Proof Standard

Launch the existing installation on localhost, expose only the RTX 3090, and
disable all custom nodes:

```bash
CUDA_DEVICE_ORDER=PCI_BUS_ID CUDA_VISIBLE_DEVICES=1 \
./venv/bin/python main.py \
  --listen 127.0.0.1 \
  --port 8188 \
  --disable-all-custom-nodes \
  --input-directory ~/.local/share/kennedi-video-lab/input \
  --output-directory ~/.local/share/kennedi-video-lab/output \
  --temp-directory ~/.local/share/kennedi-video-lab/temp \
  --user-directory ~/.local/share/kennedi-video-lab/user
```

The UI graph uses only core nodes: diffusion/CLIP/VAE loaders, positive and
negative text encoders, project-owned image input, Wan image-to-video latent,
sampler, VAE decode, 24 FPS video creation, and video save. The API graph uses
the same nodes and fixed binding ids verified by the runner.

### Native SaveVideo Amendment

Live `/object_info` inspection before generation showed that ComfyUI 0.25.0's
core `SaveVideo` exposes MP4/H.264 output, not WebM. Keep the core-node-only
boundary: render each external candidate as MP4/H.264, require that exact
extension/codec from history, and use the already-contracted FFmpeg `assemble`
command to transcode only the owner-selected review candidate to VP9 WebM. This
changes no source, prompt, model, runtime, production path, or approval gate.

- Canvas: 1280x704.
- Length: 77 frames at 24 FPS.
- Candidate seeds: `11235813`, `27182818`, `31415926`, `16180339`.
- Sampling baseline: 20 steps, CFG 5, `uni_pc`, `simple`, shift 8.
- Style prompt: `Original flat vector children's story illustration. Same bear
  character, face, clothing, palette, shapes, and environment as the input
  frame. Warm flat colors, dark purple ink outlines, modest paper texture, calm
  deliberate movement, locked camera, no scene change.`
- Beat prompt: `Bear slowly stirs the dough in the bowl.`
- Negative prompt excludes photorealism, 3D rendering, changed identity or
  clothing, extra anatomy, duplicates, new text/logos/watermarks, camera motion,
  cuts, flashing, fast motion, clutter, darkness, and frightening expressions.

The proof passes only if all candidates decode and the selected candidate has
stable bear identity, no text/logo, no unsafe heat action, no protected-style
resemblance, no black/blank frames, no flash/cut, calm motion, and readable
project color/line language. Owner approval, not CI, selects or rejects the look.

## Runner Contract

CLI:

```text
node scripts/video-production/video-production.mjs render --manifest <path> [--shot <id>] [--seed <integer>|all] [--dry-run]
node scripts/video-production/video-production.mjs assemble --manifest <path> [--dry-run]
```

- `COMFYUI_HOME` identifies the external installation; `COMFYUI_URL` defaults
  to `http://127.0.0.1:8188` and must resolve to a loopback host.
- `/system_stats` must report ComfyUI 0.25.0, the RTX 3090 as primary device,
  and `--disable-all-custom-nodes` in argv.
- The runner hashes the three expected local model files before submission.
- It validates every bound node id and `class_type` before changing input,
  prompt, seed, dimensions, frame count, or save prefix.
- It submits one candidate at a time to `/prompt`, polls
  `/history/{prompt_id}`, times out after 45 minutes, and stops on first failure.
- The manifest permits at most four seeds, one proof shot, local relative source
  files, 1280x704, 77 frames, and 24 FPS in this slice.
- Outputs stay under `~/.local/share/kennedi-video-lab/`; paths escaping that
  root or entering the repository are rejected.
- `render` accepts only the core node's MP4 output and copies each candidate to
  the external candidate directory with an `.mp4` extension.
- `assemble` may produce an external VP9 WebM review file through installed FFmpeg, but
  this proof manifest cannot target the shipped WebM or extract/mux narration.

## Verification Plan

- Validate work contract and runner tests before contacting ComfyUI.
- Render the source independently through Inkscape and inspect its 1280x704
  derived input.
- Start ComfyUI with the exact safe command and verify `/system_stats` and
  `/object_info` before submission.
- Dry-run all four seeds, render sequentially, probe every MP4 output with FFprobe,
  decode every frame, and run black/flash/scene-change checks.
- Build and visually inspect a four-seed contact sheet; choose no candidate when
  any identity, safety, ownership, or motion concern remains.
- Run focused tests, full `npm test`, typecheck, build, viewport tests, lint if
  present, work-contract check, `git diff --check`, media/SVG checks, and a cold
  diff against current main.
- Browser runtime QA is not required because shipped app/runtime/media are
  protected and unchanged; prove that absence in the final diff.

## Cold Diff Audit

### Gaps First

- No implementation-to-contract gap remains. A cold read initially found that
  model hashes were checked without proving the workflow loader names and graph
  topology reached those files. The runner now rejects a mismatched loader or a
  rewired sampler before submission
  (`scripts/video-production/video-production.mjs:283-320`), with both rejection
  paths exercised in `tests/scripts/video-production.test.ts:106-129`.
- Owner look approval remains pending by design, not as an implementation gap.
  The proof is recorded as `draft`, has no production path, and is not
  child-visible (`docs/art/asset-provenance.md:101-130`).

### Change-by-Change Reconstruction

1. The editable source bundle adds one project-owned mixing SVG and its 1280x704
   Inkscape input, fixed prompts, exact local tool/model/hash record, and a
   proof-only manifest with four seeds and selected review seed `31415926`
   (`design-source/video/bear-bakes-bread/mix-dough-source.svg:1-32`,
   `design-source/video/bear-bakes-bread/environment.json:1-40`,
   `design-source/video/bear-bakes-bread/prompts.md:1-19`,
   `design-source/video/bear-bakes-bread/render-manifest.json:1-73`). This traces
   to the required editable, reproducible source and environment record.
2. The bundle includes matching editable UI and executable API graphs made only
   from the twelve contracted core nodes
   (`design-source/video/bear-bakes-bread/workflow.json:1-195`,
   `design-source/video/bear-bakes-bread/workflow-api.json:1-112`). The API graph
   generated all four candidates; the UI graph imported into ComfyUI 0.25.0 as a
   connected 12-node graph.
3. The local runner validates the proof manifest and approval bounds
   (`scripts/video-production/video-production.mjs:103-218`), loopback server,
   exact isolated startup, GPU, core nodes, model files, and graph topology
   (`scripts/video-production/video-production.mjs:220-369`). It then submits
   fixed seeds sequentially, polls with bounded timeouts, accepts one safe MP4
   output per job, and records external results
   (`scripts/video-production/video-production.mjs:371-531`). Assembly is limited
   to the selected external candidate and strips inherited metadata and audio
   while producing VP9 WebM (`scripts/video-production/video-production.mjs:533-552`).
4. Focused tests cover both sides of URL, manifest, model, graph, API status,
   timeout, output-path, format, and assembly guards, including the committed
   manifest/workflow (`tests/scripts/video-production.test.ts:29-232`). This
   traces to every runner boundary named before code.
5. The four-seed contact sheet and selected seed WebM are review artifacts only
   under `docs/captures/video/`; rejected full candidates remain in the external
   video lab. The ledger records sources, tools, rights limits, model terms,
   hashes, selection rationale, no-audio status, and pending owner approval
   (`docs/art/asset-provenance.md:101-130`).
6. This file records the pre-code contract, approved AI-use amendment, native
   MP4 amendment, proof standard, verification, and this reconstruction. It does
   not declare production approval.

### Verification Results

- Live ComfyUI 0.25.0 ran on the RTX 3090 at `127.0.0.1:8188` with all custom
  nodes disabled and all four isolated authoring directories. `/system_stats`
  and `/object_info` passed runner validation.
- Model SHA-256 verification passed for the exact Wan2.2 TI2V 5B, VAE, and UMT5
  files recorded in `environment.json:26-38`.
- Dry-run planned exactly four fixed seeds. Four sequential live jobs completed;
  every external MP4 decoded as H.264, 1280x704, 24 FPS, 77 frames, about 3.208
  seconds. Black and scene-cut checks found none. Long final freezes were found
  in seeds `11235813` and `27182818`, so neither was selected.
- Seed `31415926` passed visual frame inspection with stable bear identity and
  calm spoon motion. Its review WebM decodes as VP9, 1280x704, 24 FPS, 3.209
  seconds, no audio, and no inherited prompt metadata.
- `npx vitest run tests/scripts/video-production.test.ts`: 11/11 passed.
- `npm test`: work-contract check passed; 46 Python tests passed with one
  expected skip; 775/775 Vitest tests passed across 58 files.
- `npm run typecheck`: passed. `npm run build`: passed, 125 modules transformed.
- `npm run test:viewport`: 6/6 Playwright tests passed.
- `npm run lint --if-present`: exited 0; this package declares no lint script.
- `xmllint`, JSON parsing, full candidate/review decode, `git diff --check`, and
  production-path absence checks passed.

### Protected-Surface Check

The final diff against current `origin/main` contains only the thirteen files
listed above: the source bundle, runner, focused test, proof captures, provenance
entry, and this contract. No `public/`, `src/`, package, activity, skill,
curriculum, narration, runtime, event, storage, routing, child UI, parent UI, or
approval file changed. Everything added traces to a required proof surface, and
every required proof surface appears in the diff.

## Gap Audit

DONE for the bounded private proof. Owner look approval and any production
replacement remain separate, explicitly unapproved future slices.
