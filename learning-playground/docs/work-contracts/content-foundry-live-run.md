# Content Foundry Live Run Work Contract

## Before Code

### Root Cause

The merged Content Foundry core is verified against fixtures and synthetic media,
but not against the actual local ComfyUI node registry, installed model names,
HTTP behavior, or GPU output. A canonical graph can therefore pass repository
tests while failing to queue or decode locally. The pipeline also has no real
three-scene draft proving that local generated scenes, parent-supplied narration,
storyboard assembly, manifest provenance, media QA, and the manual review gate
work together without publishing content.

### Correct Fix Must Touch

- Inspect the configured loopback ComfyUI and run the existing opt-in live node
  and model compatibility test.
- Use only the canonical Content Foundry workflows and bounded service APIs to
  produce the minimum real scene material needed for one three-scene draft.
- Assemble that material with local parent-supplied narration, then run draft
  validation and media QA. Keep every generated input/output under ignored
  Foundry imports/drafts or other temporary local paths.
- If live evidence exposes a real compatibility defect, change only the
  relevant files under `tools/content-foundry/content_foundry/`, canonical
  workflow JSON, Content Foundry docs, and focused tests. Record the exact
  incompatibility before editing and add a regression test.
- Record reproducible commands, model/node observations, draft id, output QA,
  and the human-review disposition without committing generated binary media.

### Must Not Change

Do not change child runtime code, activities, catalogs, public assets, video
manifests, curriculum, evidence/mastery/transfer/progress logic, parent UI,
approval rules, package dependencies, or unrelated documentation. Do not add a
backend, auth, cloud sync, remote generation, generated voice, automatic
approval/publication, reward mechanics, or a new game. Do not mutate the
ComfyUI installation, download models, weaken resource/safety limits, or commit
generated media. A successful draft remains local and review-required.

## Cold Diff Audit

### Gaps

No contract gap remains. Live ComfyUI and the first real three-scene draft both
completed without exposing a repository compatibility defect, so no canonical
workflow or implementation file needed to change. Parent approval and app
integration remain intentionally pending and outside this slice.

### Live Execution Evidence

- Local ComfyUI 0.25.0 started unchanged on loopback `127.0.0.1:8188`, detected
  the RTX 3090 and RTX 4060 Ti, and loaded its browser UI without a blank page or
  error overlay.
- `CONTENT_FOUNDRY_LIVE=1 python3 -m unittest tools/content-foundry/tests/test_live_comfy.py -v`
  passed. Every class and
  model referenced by all four canonical graphs exists in the live node
  registry.
- Canonical `flux_illustrated_redux` generated a real 960x544 Scene 1 draft at
  fixed seed 101 with draft id
  `draft-d5e92316-a6a3-45be-a67f-32f0c3d47434`. Its dimension QA passed and
  its manifest retained `requires_parent_visual_review: true`.
- Two oven-scene generation attempts passed dimension QA but were excluded by
  manual visual inspection because the Redux reference preserved the mixing
  bowl instead of showing clear oven evidence. They remain unpublished local
  drafts; no approval was recorded.
- `python3 foundry.py assemble bear-bread-live-storyboard.json` assembled the
  accepted generated mixing scene, the existing approved Bear oven and finished
  bread artwork, and the three parent-recorded WAV clips. The resulting local
  draft is `draft-96a24f16-6323-45cf-a4fd-1f669f8d92ae`.
- Media QA passed at 11.125 seconds, VP9 960x544 at 24 fps, mono 48 kHz Opus,
  -18.18 LUFS, and -2.86 dBTP. Poster and eight-frame contact sheet outputs were
  created. Contact-sheet inspection showed the intended mixing, oven, and warm
  loaf progression without text or unsafe imagery.
- `python3 foundry.py validate-draft draft-96a24f16-6323-45cf-a4fd-1f669f8d92ae`
  returned `valid: true` with no
  hash mismatches. Status remains `draft`; parent review is the recorded
  disposition and no publication action was taken.

### Change-By-Change Reconstruction

This work contract is the only tracked change. Lines 3-39 define the live-only
root cause, allowed execution surface, and protected app/approval boundaries.
Lines 43-78 record the exact node/model and real-draft proof, name the locally
rejected attempts honestly, and preserve parent approval as the remaining gate.
All generated images, narration copies, storyboard input, draft manifests, and
final media remain under ignored `.content-foundry/`.

### Contract Traceability

The tracked documentation change traces directly to the required execution
record. No child runtime, app asset, catalog, video manifest, curriculum,
learning engine, parent UI, dependency, canonical workflow, Content Foundry
implementation, or ComfyUI installation file changed.

### Verification

- Browser verification: ComfyUI loaded meaningful controls with no blank page
  or framework error overlay.
- Live compatibility test: passed 1 test against the running node/model registry.
- Full media decode:
  `ffmpeg -v error -i .content-foundry/drafts/draft-96a24f16-6323-45cf-a4fd-1f669f8d92ae/learning-clip.webm -f null -`
  passed with no errors.
- `npm ci`: installed the locked fresh-worktree dependencies; audit found zero
  vulnerabilities. The first `npm test` attempt had stopped at `vitest: not
  found` before this install and was not counted as verification.
- `npm test`: passed 46 Content Foundry tests with one intentional default live
  skip plus 56 Vitest files and 748 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 124 modules.
- `git diff --check`: passed.

Gap audit: DONE.

## Review Follow-Up Contract

### Root Cause

Three execution commands are recorded in forms that are not reliably reusable:
two inline code spans cross Markdown line breaks, and the ffmpeg decode command
contains an ellipsis instead of its actual input path. The evidence is true, but
its presentation does not satisfy this contract's reproducibility requirement.

### Correct Fix Must Touch

- Keep each affected inline command on one source line so Markdown renders it
  as one copyable command.
- Replace the ffmpeg ellipsis with the exact local draft-relative clip path used
  during verification.
- Update the cold audit to trace these documentation-only corrections and rerun
  the work-contract and diff checks.

### Must Not Change

Do not change the recorded draft ids, observations, QA values, review
disposition, generated local files, Foundry code/workflows/tests, child app,
dependencies, or any original protected surface.

### Review Follow-Up Cold Audit

No gap remains. The live compatibility command, draft validation command, and
full ffmpeg decode command are now each complete within one inline code span;
the decode command names the exact ignored draft-relative file used in the run.
No execution claim, QA value, draft id, disposition, generated artifact, code,
workflow, test, dependency, or protected app surface changed.

### Review Follow-Up Amendment 1

#### Root Cause

The original before-code content is complete but its heading hierarchy does not
match `docs/templates/change-contract.md`: it omits the `## Before Code` wrapper
and promotes the three required contract sections to level two. That inconsistency
can defeat future structure-based tooling even though today's prose is correct.

#### Correct Fix Must Touch

- Add `## Before Code` before the original contract clauses.
- Change only `Root Cause`, `Correct Fix Must Touch`, and `Must Not Change` to
  level-three headings under that wrapper.
- Update the cold-audit line citations displaced by the new wrapper and verify
  the canonical structure directly.

#### Must Not Change

Do not change any contract prose, execution evidence, command, QA value, draft
id, disposition, generated artifact, code, workflow, test, dependency, or app
surface.

#### Cold Audit

No gap remains. Lines 3-39 now match the canonical `## Before Code` wrapper and
level-three clause hierarchy. Only those three headings and the two displaced
line citations changed; all contract prose, execution evidence, commands, QA
values, draft ids, dispositions, generated artifacts, code, workflows, tests,
dependencies, and protected app surfaces remain unchanged.
