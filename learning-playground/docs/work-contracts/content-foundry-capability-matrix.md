# Content Foundry Capability Matrix Work Contract

## Before Code

### Root Cause

The Content Foundry has contract and fixture coverage plus one bounded live Redux
and assembly proof, but it has not demonstrated the usable output boundaries of
all four canonical ComfyUI workflows. In particular, the repository has no
live, comparable evidence for Redux preset and reference-strength behavior,
masked edits with and without Canny structure preservation, or two safe Wan
shots assembled into one narrated 5-10 second draft. Passing graph validation
cannot establish visual usability, mask containment, temporal continuity, or
whether the existing pipeline records enough provenance to reproduce those
results.

### Correct Fix Must Touch

- Exercise the canonical Foundry service and checked-in workflow templates
  against the configured loopback ComfyUI only after confirming its shared job
  queue is idle.
- Use approved local source art, explicit masks, fixed prompts, and fixed seeds
  to run this bounded image matrix:
  - Redux `video_scene` at a low reference strength;
  - Redux `video_scene` at the production reference strength and final quality;
  - Redux `square_asset` at a recorded reference strength;
  - plain masked inpaint; and
  - Canny-preserving masked inpaint using the same source, mask, prompt, seed,
    and quality as the plain comparison.
- Evaluate each image for dimensions, decode, manifest provenance, child-safe
  content, visual prompt fit, source identity/structure, and obvious text,
  anatomy, or geometry defects. For edits, inspect both the masked region and
  preservation outside the mask.
- Produce exactly two canonical Wan safe-motion drafts from accepted local
  stills. Each job must remain the existing 81-frame, 24 fps, 960x544 bounded
  shot and use only approved ambient micro-motion clauses.
- Inspect each motion draft and contact sheet for decode, duration, geometry,
  continuity, object-count stability, face drift, flicker, and unsafe or
  evidence-bearing motion. Reject unusable shots instead of silently treating
  machine QA as human approval.
- Assemble accepted motion into one 5-10 second VP9/Opus draft using local
  parent-supplied human narration. Verify duration, dimensions, codecs,
  loudness, true peak, hashes, manifest provenance, and the parent visual-review
  requirement.
- Keep generated inputs and outputs under ignored `.content-foundry` roots.
  Record exact commands, prompts, seeds, strengths, draft ids, machine QA,
  human review dispositions, and blockers in this work contract without
  committing generated binary media.
- If live evidence proves a pipeline defect, amend this contract before
  changing only the responsible Content Foundry implementation, canonical
  workflow, documentation, and focused tests. Do not change code merely to
  improve a model output.

### Must Not Change

Do not change child runtime code, public assets, activity or video catalogs,
curriculum, evidence/mastery/transfer/progress logic, parent UI, approval rules,
package dependencies, or unrelated documentation. Do not touch another open
PR, branch, worktree, or its local artifacts. Do not mutate the ComfyUI source,
models, nodes, configuration, or environment; download models; run concurrent
jobs into a non-idle shared queue; generate voice; publish or approve generated
content; or add backend, auth, cloud sync, open-web input, child-facing AI,
rewards, streaks, rankings, or a new game.

## Run Matrix

| Capability | Required comparison | Required disposition |
| --- | --- | --- |
| Redux video | low vs production reference strength | accept/reject with identity and prompt-fit notes |
| Redux square | 1024x1024 preset | accept/reject with crop and composition notes |
| Plain inpaint | explicit mask | accept/reject with masked and outside-mask notes |
| Canny inpaint | same inputs as plain, Canny enabled | accept/reject and compare structure preservation |
| Wan shot 1 | one approved ambient prompt | accept/reject from clip and contact sheet |
| Wan shot 2 | one approved ambient prompt | accept/reject from clip and contact sheet |
| Narrated assembly | accepted shots totaling 5-10 seconds | machine-QA pass and human-review-required draft |

An output may pass machine QA and still be rejected visually. A failed or
rejected matrix cell must be reported honestly; it must not be replaced with an
unbounded retry loop.

## Contract Amendments

### Wan 2.2 Conditioning Compatibility

The first canonical Wan run passed container QA but produced an unrelated
realistic adult instead of the supplied bear illustration. ComfyUI history
proved that the client uploaded the correct content-addressed source, queued the
expected prompt id, and downloaded that prompt's output. The actual defect is
the checked-in graph: `wan-safe-motion.v1.json` uses generic
`WanImageToVideo`, whose installed implementation creates a 16-channel Wan 2.1
conditioning latent, with the installed `wan2.2_ti2v_5B_fp16.safetensors`
model. The matching installed `Wan22ImageToVideoLatent` implementation creates
the model's 48-channel latent and noise mask, and the local known-working Wan
2.2 graph already uses it.

The allowed fix surface expands only to:

- add `tools/content-foundry/workflows/wan-safe-motion.v2.json` using
  `Wan22ImageToVideoLatent` at the existing 960x544, 81-frame, 24 fps output
  contract;
- point the `wan_safe_motion` registry definition to template/version 2;
- update focused workflow tests to reject the incompatible generic node and
  assert the Wan 2.2 latent, sampler, decode, and video links;
- update the Content Foundry contract's stale Wan version wording; and
- rerun unit and live compatibility checks before the two contracted Wan jobs.

The failed v1 draft remains rejected evidence. It does not count toward the two
post-fix Wan capability cells. All prior protected surfaces remain protected.

## Execution Evidence

### Local Inputs

- Redux video and Wan mixing source:
  `7f0220d641396ce8ee145af522da39bf4ed0763bbca88ea43df068c9890015a5`.
- Redux square source:
  `81ee67910133e432fec55dfee39759d47fda91133a5d4ec6298e3977c072ef34`.
- Inpaint and Wan bread source:
  `3690b295566565322e5133a011d1716d43b79e4d87d7f7adf04b4614fadd11ca`.
- Explicit red-channel inpaint mask:
  `d1cf3e0b18b3ad2b71bf9d2eba3f2fce64c1d2159da11f414313e5d82959538e`.
- Parent narration `bear-mixes-dough.wav`:
  `5f10fcb9181ce70d32eb12974c9ff44aa18c1da8541177790d3664d2fc2143ae`.
- Parent narration `bear-made-warm-bread.wav`:
  `9a08a945f1f8a7efb05f04b132280f1dc2e1a415ef0ea9ad6af0bf2a77726331`.

All inputs were copied or derived locally under ignored
`.content-foundry/imports/capability-matrix/`. The ComfyUI queue was empty before
each submitted generation job.

### Fixed Prompts

- Redux video: `Papa Bear wearing a teal apron mixes bread dough in a wide cream bowl on a sunny bakery counter, one bear, one bowl, one wooden spoon, full kitchen scene`.
- Redux square: `Papa Bear wearing a teal apron mixes bread dough in a wide cream bowl on a sunny bakery counter, centered square composition, one bear, one bowl, one wooden spoon`.
- Both inpaint jobs: `Replace only the masked bread and plate with a woven basket holding three warm round bread rolls on the counter; preserve the bear, arms, kitchen, windows, colors, and every unmasked region`.
- Wan diagnostic and v2 shot 1: `subtle breathing, one blink, gentle steam, locked camera`.
- Wan v2 shot 2: `small smile, gentle steam, slow light shift, locked camera`.

The service appended the checked-in illustrated safety suffix and Wan negative
prompt exactly as recorded in each draft manifest.

### Capability Results

| Cell | Fixed inputs | Draft | Machine QA | Human disposition |
| --- | --- | --- | --- | --- |
| Redux video, low | seed `2026071101`, final, strength `0.35` | `draft-8a786de6-9239-4d80-912b-39254ca579c1` | 960x544 pass | Accept: coherent bear, bowl, spoon, and bakery; painterly detail and no text |
| Redux video, production | same seed/prompt/quality, strength `0.8` | `draft-771f5f11-0be9-4ab9-9475-ff2b75d0133b` | 960x544 pass | Accept: flatter and closer to the reference composition; no text or anatomy defect |
| Redux square | seed `2026071102`, final, strength `0.8` | `draft-a71b6de5-0d1c-48c2-9248-c398ba4bb908` | 1024x1024 pass | Reject: safe but soft, excessive empty margin, and weak action framing from the padded reference |
| Plain inpaint | seed `2026071103`, final, explicit mask | `draft-7ec22614-4b1b-4fa2-ab95-e525d43e6971` | 960x544 pass | Reject: basket is clear, but label-like lines appear on the apron inside the mask |
| Canny inpaint | same source/mask/prompt/seed/quality, control `0.6` | `draft-9ecf3b38-f970-41f2-a315-374a9bdc895c` | 960x544 pass | Reject: retains more geometry but still adds label-like apron artifacts |
| Wan v1 diagnostic | seed `2026071104`, mixing source | `draft-b80b66d3-af52-4d07-bc5d-89737c81a8ea` | 3.375s/24fps/960x544 pass | Reject: unrelated realistic adult using a camera; proved the graph/model mismatch |
| Wan v2 shot 1 | same source/prompt/seed as diagnostic | `draft-04d84be2-81a7-4927-8b68-a5d901e7ecb7` | 3.375s/24fps/960x544 pass | Accept: source composition and object count stay stable; gentle steam only |
| Wan v2 shot 2 | seed `2026071105`, bread source | `draft-58aaf34d-882a-43f1-b316-825b6b95b143` | 3.375s/24fps/960x544 pass | Reject: bread morphs and an extra arm/object appears during apparent manipulation |
| Narrated assembly | accepted v2 shot 1 plus approved static bread still | `draft-ac031be7-db68-45ce-a4e0-3ce40882035d` | media contract pass | Accept as a local capability draft; still requires parent visual review |

The inpaint comparison changed only the declared masked region materially, but
was not pixel-identical outside the mask. Mean normalized outside-mask
difference was `0.00540062` for plain inpaint and `0.0057355` for Canny,
compared with full-image means `0.0223262` and `0.0223962`. Canny therefore did
not provide a meaningful outside-mask preservation advantage in this sample.

### Narrated Draft

The accepted local assembly is:

```text
.content-foundry/drafts/draft-ac031be7-db68-45ce-a4e0-3ce40882035d/learning-clip.webm
```

It is 6.908 seconds, VP9 at 960x544 and 24 fps, mono 48 kHz Opus,
`-18.27 LUFS`, and `-2.91 dBTP`. The learning clip, poster, and contact sheet
hashes are recorded in its manifest. Contact-sheet review shows the accepted
steam motion followed by the stable finished-bread still. The rejected Wan
shot is not included.

All nine generated records validate with no hash mismatch. Every record remains
`status: draft`, `approval: null`, and
`requires_parent_visual_review: true`. No output was published, copied into
`public/assets`, or added to a catalog or video manifest.

## Cold Diff Audit

### Gaps

- change without contract trace: none
- contract requirement not delivered: none; rejected matrix cells are recorded
  outcomes, and the narrated draft uses only the accepted motion plus approved
  static source rather than smuggling in the rejected second shot
- protected surface touched: none

No standing contract gap remains.

### Change By Change Reconstruction

- `docs/work-contracts/content-foundry-capability-matrix.md:1` defines the
  bounded live matrix, records the discovered Wan incompatibility before code,
  and reports every machine and human disposition without binary media.
- `docs/contracts/content-foundry.contract.md:26` identifies the active bounded
  motion workflow as v2 while preserving every resource and approval rule.
- `tools/content-foundry/content_foundry/workflows.py:68` makes the registry
  load and record `wan-safe-motion.v2.json` as workflow version 2.
- `tools/content-foundry/workflows/wan-safe-motion.v2.json:49` replaces the
  incompatible generic conditioning node with the Wan 2.2 48-channel latent
  node at 960x544; lines 60-86 connect direct text conditioning, the v2 latent,
  decode, and the unchanged 24 fps video output.
- `tools/content-foundry/tests/test_config_workflows.py:70` checks each
  workflow's declared metadata version; line 118 proves the safe-motion graph
  cannot regress to `WanImageToVideo` and retains its fixed dimensions, frames,
  direct sampler links, and fps.

### Contract Traceability

- The work contract traces to the original Root Cause and execution-record
  requirements.
- The Content Foundry contract, registry, v2 template, and focused test trace
  only to the recorded Wan 2.2 Conditioning Compatibility amendment.
- No child runtime, public asset, activity/video catalog, curriculum, learning
  engine, parent UI, dependency declaration, approval rule, unrelated document,
  other branch/worktree, or ComfyUI installation file changed.

### Verification

- `CONTENT_FOUNDRY_LIVE=1 CONTENT_FOUNDRY_PROJECT_ROOT="$PWD" COMFYUI_URL=http://127.0.0.1:8188 /home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python -m unittest discover -s tools/content-foundry/tests -p 'test_live_comfy.py' -v`: passed before the matrix and after the v2 graph change.
- `/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python -m unittest discover -s tools/content-foundry/tests -p 'test_config_workflows.py' -v`: 10 passed.
- `/home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python -m unittest discover -s tools/content-foundry/tests -v`: 46 passed with one intentional default live skip.
- The exact validation loop below returned `valid: true`, no hash mismatch, and
  parent review required for all nine drafts:

```bash
for id in \
  draft-8a786de6-9239-4d80-912b-39254ca579c1 \
  draft-771f5f11-0be9-4ab9-9475-ff2b75d0133b \
  draft-a71b6de5-0d1c-48c2-9248-c398ba4bb908 \
  draft-7ec22614-4b1b-4fa2-ab95-e525d43e6971 \
  draft-9ecf3b38-f970-41f2-a315-374a9bdc895c \
  draft-b80b66d3-af52-4d07-bc5d-89737c81a8ea \
  draft-04d84be2-81a7-4927-8b68-a5d901e7ecb7 \
  draft-58aaf34d-882a-43f1-b316-825b6b95b143 \
  draft-ac031be7-db68-45ce-a4e0-3ce40882035d
do
  /home/juan-canfield/Desktop/ComfyUI-master/venv/bin/python tools/content-foundry/foundry.py validate-draft "$id"
done
```
- `ffmpeg -v error -i .content-foundry/drafts/draft-ac031be7-db68-45ce-a4e0-3ce40882035d/learning-clip.webm -f null -`: passed with no decode errors.
- `npm ci`: installed 56 locked packages; audit found zero vulnerabilities.
- `npm test`: passed 46 Content Foundry tests with one intentional default live
  skip, 57 Vitest files, and 764 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 125 modules.
- No lint script exists in `package.json`, so lint was not available.
- `git diff --check`: passed before this final evidence update.

Gap audit: DONE.
