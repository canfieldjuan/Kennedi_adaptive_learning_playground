# ComfyUI Bear Video Inkscape A/B Proof

This is a bounded follow-up to the one-beat ComfyUI proof in PR #101. The
operator approved it on 2026-07-11 after reviewing the first generated result
and asking to use the newer Inkscape Bear Cafe drawings instead of the legacy
video illustration. It remains an unshipped visual comparison.

## Before Code

### Root Cause

The first proof established that the local Wan2.2/ComfyUI pipeline works, but
its source frame is a legacy, sparse Bear mixing illustration. That frame does
not use the newer Bear Cafe environment's richer palette, line system,
environmental construction, or editable scene language. The resulting motion
can be technically sound while still inheriting the older art ceiling.

The problem is the upstream animation plate, not the model, seed handling,
sampler, video runtime, narration, curriculum, or child interaction. Replacing
the background alone is also insufficient: the pickup-window proof has no
cooking character, bowl, or animation-ready pose, so a direct file swap would
not depict the mixing beat.

### Correct Fix Must Touch

- `design-source/video/bear-bakes-bread/`: add one original Inkscape-native
  1280x704 kitchen plate that adapts the approved project-owned Bear Cafe visual
  language and separates background, character, arms, spoon, bowl, and
  foreground into editable named layers. Export one flattened local Wan input.
- Add a second proof manifest plus matching UI/API graphs that use the new input
  while preserving the exact model files, model hashes, positive/negative
  prompts, four seeds, dimensions, frame count, FPS, sampler, CFG, scheduler,
  denoise, and shift from the legacy-source proof.
- Reuse the existing validated local runner. Change it only if verification
  exposes a defect that prevents two committed proof manifests from being
  validated independently; do not generalize it speculatively.
- Focused tests must validate both committed manifests/graphs and prove that the
  Inkscape comparison remains proof-only, external-output-only, fixed-setting,
  and production-write-disabled.
- `docs/captures/video/`: add a four-seed Inkscape contact sheet, selected
  review-only WebM, and a clear legacy-source versus Inkscape-source A/B sheet.
  Rejected full-size candidates remain outside the repository.
- `docs/art/asset-provenance.md`: record the new original plate, project-owned
  visual source, Inkscape version, identical generation settings, AI terms,
  selection rationale, and pending owner look approval.
- This contract must record generation evidence, full verification, and a
  line-cited cold diff audit before the follow-up commit is pushed.

### Explicit Non-Scope

- Do not replace or edit `public/assets/videos/bear-bakes-bread.webm`, any poster,
  the family-safe video manifest, Video Vault runtime/types/validator/evidence,
  response activity, activity catalog, routing, or child/parent UI.
- Do not change correct answers, narration, response choices, event timing,
  evidence, mastery, transfer, curriculum, difficulty, recommendations,
  progress, storage, export/reset, parent approval, or completion semantics.
- Do not change the three Wan model files or hashes, prompt text, seed set,
  sampling settings, duration, resolution, frame rate, or core-node-only rule.
- Do not add another checkpoint, LoRA, custom node, cloud node, generated voice,
  voice clone, stock art, third-party visual input, protected character,
  branded studio style, living-artist style, remote runtime asset, dependency,
  package change, schema, activity, route, reward, timer, autoplay, or loop.
- Do not overwrite the legacy-source proof bundle or captures. A/B evidence must
  retain both sides independently.
- Do not touch another game, open PR, branch, worktree, persisted state, or the
  unrelated shared-checkout workflow draft.
- Do not merge PR #101 or begin the full three-beat production replacement in
  this slice. The PR remains ready for review, never draft.

### Assumptions and Blockers

- The project-owned Bear Cafe pickup-window source is approved as visual
  direction and may be adapted without importing third-party elements.
- Inkscape 1.4.4 remains installed. The source must import and render there; a
  syntactically valid SVG alone is not sufficient evidence.
- The already-verified local ComfyUI 0.25.0 installation, RTX 3090, Wan2.2 TI2V
  5B model set, FFmpeg 6.1.1, and isolated video-lab paths remain available.
- More detail can increase temporal shimmer. The plate must use large shapes,
  restrained tile/prop density, clear moving-part separation, and no text. If
  the identical-setting results are less stable than the legacy source, report
  that honestly instead of selecting a weaker candidate.
- Owner visual approval remains the final look gate. CI cannot approve art
  direction or authorize production replacement.

## A/B Standard

The comparison changes exactly one causal factor: the source plate.

- Legacy input: `inputs/mix-dough-1280x704.png`.
- Inkscape input: `inputs/mix-dough-inkscape-1280x704.png`.
- Canvas: 1280x704; 77 frames; 24 FPS.
- Seeds: `11235813`, `27182818`, `31415926`, `16180339`.
- Sampling: 20 steps, CFG 5, `uni_pc`, `simple`, denoise 1, shift 8.
- Prompts: byte-for-byte identical to the first manifest.
- Models/hashes: byte-for-byte identical to the first manifest.
- Candidate format: external MP4/H.264. Selected review format: external then
  repository review-only VP9 WebM with no audio or inherited prompt metadata.

The Inkscape plate passes source review only if it is clearly Bear Cafe, depicts
mixing without unsafe heat action, gives the bear and bowl strong first-viewport
scale, preserves clear silhouettes, avoids text, and has no tiny decorative
detail near the spoon/arms. Generated candidates pass only if they decode, keep
identity and anatomy stable, avoid text/logo/black/flash/cut, and show calm,
legible mixing motion. Selection must consider both visual richness and temporal
stability; richer still frames do not excuse worse motion.

## Verification Plan

- Validate this contract before source edits or generation.
- Build the source as an Inkscape SVG with named editable layers, import it into
  Inkscape 1.4.4, export exactly 1280x704, inspect it at desktop and mobile-like
  crops, and verify no external references, embedded fonts, text, or raster art.
- Validate both manifests and API graphs through focused tests and runner
  dry-runs; prove exact settings match programmatically.
- Start ComfyUI with the previously contracted safe launch, verify live stats
  and core nodes, then render the four fixed Inkscape seeds sequentially.
- FFprobe and fully decode every candidate. Run black, freeze, and scene-cut
  checks; visually inspect a four-seed sheet before selecting anything.
- Assemble only the selected candidate, then create a legacy-versus-Inkscape A/B
  sheet using corresponding representative frames.
- Run focused tests, `npm test`, `npm run typecheck`, `npm run build`,
  `npm run test:viewport`, `npm run lint --if-present`, work-contract check,
  media/SVG/JSON validation, and `git diff --check`.
- Reconstruct the final diff against current `origin/main`, cite every change,
  prove every contract item is present, and prove no protected surface moved.

## Cold Diff Audit

### Gaps First

- No implementation-to-contract gap remains. Source review initially found that
  the bowl hid the paw-to-spoon connection, and the first generated seed then
  lost the spoon. The final source adds an explicit foreground grip while
  retaining separately editable arm, spoon, bowl, and grip layers
  (`design-source/video/bear-bakes-bread/mix-dough-inkscape-source.svg:80-104`).
- The first safe launch attempt found an unrelated local ComfyUI process on port
  8188. It was left untouched. The comparison used isolated loopback port 8190
  and a dedicated SQLite file, now recorded with the exact runner override and
  launch flags (`design-source/video/bear-bakes-bread/environment-inkscape.json:1-32`).
- Owner look approval remains pending by design, not as an implementation gap.
  The proof has no production path and remains `draft` in the provenance ledger
  (`docs/art/asset-provenance.md:132-161`).

### Change-by-Change Reconstruction

1. The new 1280x704 Inkscape source is an original Bear Cafe kitchen plate made
   from local vector shapes. Its thirteen named layers separate the shell, quiet
   tiles, awning, window/shelf, counter, Bear, hat, two arms, spoon, bowl/dough,
   grip, and foreground (`mix-dough-inkscape-source.svg:1-111`). The flattened
   PNG is the only new Wan input. This reaches the root cause: source-frame art
   quality and editability.
2. The comparison manifest is proof-only and production-write-disabled, points
   at the new input and separate external namespace, preserves all four seeds and
   sampling values, and selects inspected seed `16180339` only for review
   (`render-manifest-inkscape.json:1-73`). Matching UI/API graphs retain the same
   twelve core nodes (`workflow-inkscape.json:1-195`,
   `workflow-api-inkscape.json:1-112`). The editable UI graph imported into
   ComfyUI 0.25.0 with the new image preview and connected graph.
3. The separate environment record preserves the exact tool/model hashes and
   records the actual loopback port, isolated directories, custom-node disable,
   database file, and runner environment (`environment-inkscape.json:1-48`). No
   model, prompt, seed, sampler, runner, dependency, or package file changed.
4. The focused test reads both committed manifests and graphs, proves the new
   shot equals the legacy shot except for `input_image`, verifies proof/output
   boundaries and selected seed, validates the environment override, and checks
   the required editable layers with no text or raster element
   (`tests/scripts/video-production.test.ts:95-138`).
5. Review captures add the four-seed sheet, same-seed source A/B sheet, selected
   WebM, and desktop/mobile source previews under `docs/captures/video/`.
   Rejected full candidates remain outside the repository.
6. The provenance entry records original/project-owned inputs, tool/model terms,
   editable source, every review artifact, rejected-seed reasons, exact A/B
   constraint, no runtime dependency, and pending approval
   (`docs/art/asset-provenance.md:132-161`). This contract records the pre-code
   standard, observed defects, verification, and final reconstruction.

### Verification Results

- `xmllint` passed. The SVG contains thirteen named Inkscape layers and no
  `<text>`, `<image>`, external media reference, or embedded font. Inkscape 1.4.4
  exported a 1280x704 RGBA PNG; committed previews verify 1280x704 and 390x215.
- The comparison test proves models, hashes, prompt strings, seeds, geometry,
  frame count, FPS, and sampling are identical to the legacy manifest. Runner
  dry-run planned exactly the four contracted seeds.
- Live ComfyUI 0.25.0 ran at `127.0.0.1:8190` on the RTX 3090 with custom nodes
  disabled and isolated input/output/temp/user/database paths. Live stats, core
  node inventory, loader names, graph topology, and model SHA-256 checks passed.
- Four final-source jobs completed. Every external candidate decoded as H.264,
  1280x704, 24 FPS, 77 frames, and about 3.208 seconds. Black, freeze, and
  scene-cut checks found no issue.
- Visual review rejected `31415926` for face/hat deformation, `11235813` for
  spoon stretching, and `27182818` for minimal motion. Seed `16180339` retained
  stable identity, grip, scene geometry, and calm visible spoon motion.
- The selected review artifact fully decodes as VP9, 1280x704, 24 FPS, 3.209
  seconds, video-only, with no inherited prompt metadata. The same-seed A/B
  sheet compares legacy and Inkscape source results at seed `16180339`.
- `npx vitest run tests/scripts/video-production.test.ts`: 12/12 passed.
- `npm test`: work-contract check passed; 46 Python tests passed with one
  expected skip; 776/776 Vitest tests passed across 58 files.
- `npm run typecheck`: passed. `npm run build`: passed, 125 modules transformed.
- `npm run test:viewport`: 6/6 Playwright tests passed.
- `npm run lint --if-present`: exited 0; this package declares no lint script.
- JSON parsing, full media decode, `git diff --check`, source-path checks, and
  work-contract validation passed.

### Protected-Surface Check

The follow-up diff contains only the new source/export, second manifest and
graphs, exact environment record, review captures, provenance entry, focused
test, and this contract. No `public/`, `src/`, package, activity, skill,
curriculum, narration, runtime, event, storage, routing, child UI, parent UI, or
approval file changed. Every file traces to a required A/B proof surface, and
every required proof surface appears in the diff.

## Gap Audit

DONE for the bounded Inkscape A/B proof. Owner look approval, merge, and any
three-beat production replacement remain separate, explicitly unapproved work.
