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
