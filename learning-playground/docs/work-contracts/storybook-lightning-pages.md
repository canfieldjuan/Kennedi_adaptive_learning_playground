# Storybook: Faster Pages with the Lightning LoRA

Branch `feat/storybook-lightning-pages`. Operator, 2026-10-14: "continue with
what we have and add the add ons to speed it up for now."

## Before Code

### Root Cause

- A page takes 566 s per picture with two cast sheets and about 770 s with
  three, measured on the 2026-10-13/14 overnight run. An 8-page story at four
  candidates per page is 5 to 7 GPU-hours. The nightly plan
  (`bedtime_broadcast` Season 2 contract) needs one story a day.
- Where the time goes, from the ComfyUI log: `PAGE_RENDERS["v1"]` is 40 steps
  at `cfg 4.0`, and a cfg above 1 runs the model twice per step. A step took
  about 10.0 s with two references and about 14.2 s with three, so the
  sampling alone is about 400 s of the 566. The rest is model loading and
  reading the references.
- `lightx2v/Qwen-Image-Edit-2511-Lightning` is a step-distilled LoRA for this
  exact edit model. Its README: the LoRA models "reduce the original inference
  steps to just 4 steps ... (≈10x faster than standard 40-step inference)". It
  is Apache-2.0. At `cfg 1` each step is one model pass.

### Decisions Made Here (change any)

- **A new page render version, `v2`.** It keeps v1's settings except
  `steps: 4`, `cfg: 1.0`, plus the 4-step LoRA at strength 1.0 on the edit
  model. Versions are never edited, so `v1` stays as it is, and every v1
  draft, recipe and lock keeps passing its checks.
- **`v2` becomes the default** (`PAGE_RENDER`) for `page` and `book-page`.
  The child sheets' cleanup pass keeps its own render version: the children
  are already locked, and their recipes must keep checking.
- **The 4-step file only.** The repo also has an 8-step LoRA, downloaded beside
  it, but the README documents only the 4-step files, so only that one is
  allowlisted. If v2's pictures disappoint, an 8-step `v3` is its own
  amendment.
- **`MODELS` gains the role `edit_lightning`**, with its file, source, licence
  and the Hub's SHA-256. A v2 page recipe names it; a v1 recipe never does.
- **The graph.** v2 inserts a `LoraLoaderModelOnly` node between the edit
  model's loader and `ModelSamplingAuraFlow`. Every other node is v1's.
- **Machine setup, not the repo.** ComfyUI's `extra_model_paths.yaml`
  `qwen_apache` block gains `loras: lightx2v/Qwen-Image-Edit-2511-Lightning`,
  after a backup copy. ComfyUI reads that file only at start, so v2 works once
  my 8189 ComfyUI restarts. That restart happens in an overnight window, which
  the operator allowed when the GPU is free overnight (2026-10-04).
- **The licence comes first.** v2 may not render until the storybook AI art
  terms (`storybook-art-terms.md`, PR #163) carry the LoRA's row and the
  operator approves it.

### Correct Fix Must Touch

- `storybook/tools/story-recipe.py`: `MODELS`, `PAGE_RENDERS`, `PAGE_RENDER`,
  the page roles (so a v2 manifest lists the LoRA), and `page_graph`.
- `storybook/tools/test-story-recipe.py`: the tests below.

### Must Not Change

- `PAGE_RENDERS["v1"]`, the sheet renders (`RENDERS`), the child and friend
  templates and their cleanup render, and every existing draft, recipe and
  lock.
- The story and page-plan checks.
- `bedtime_broadcast`.

## Behaviour

- `page` and `book-page` render at v2 unless told otherwise. A v2 recipe
  records the edit model, the encoder, the VAE and the LoRA, and its graph
  holds the LoRA node. Seeds stay 61, 72, 83 and 94.
- A recipe is checked against the manifest the tool rebuilds from its tables,
  as now. So a v2 recipe without the LoRA, a v1 recipe with it, or a LoRA file
  that is not allowlisted is refused.
- A v2 run on a page that already holds v1 drafts starts a fresh set and
  replaces them, because `render_set` resumes only the same recipe. The
  comparison run below therefore copies the v1 drafts aside first.

## Failure Cases

| Case | Result |
|---|---|
| ComfyUI not yet restarted with the `loras` path | ComfyUI rejects the prompt naming the LoRA; the tool stops at the first failure, as today, and records nothing |
| A v1 recipe that names the LoRA, or a v2 recipe missing it | refused by the recipe check |
| A LoRA file name not in `MODELS` | refused by the recipe check |
| Different bytes under the allowlisted name | not visible to the tool (the same limit as every model); the digest is checked at download and recorded in the terms |

## Settling Evidence (planned)

- No GPU:
  - a v2 page manifest names the edit model, encoder, VAE and LoRA;
  - the v2 graph has `LoraLoaderModelOnly` with the allowlisted file at
    strength 1.0, feeding `ModelSamplingAuraFlow`, and a `KSampler` with
    `steps 4` and `cfg 1.0`;
  - an existing v1 recipe rebuilds to the same manifest and graph as before;
  - a v1 recipe naming the LoRA is refused, and so is a v2 recipe without it;
  - `selftest` passes on every existing draft and lock;
  - a mutation run of the new checks.
- GPU, in an overnight window:
  - copy the v1 drafts of `whispering-moss/kennedi` pages 1, 3, 5, 7 and 8
    aside, then re-render those pages at v2 with the same seeds;
  - report seconds per picture against v1's 566 and 770, and put v1 and v2
    contact sheets side by side for the operator.

  The operator's look decides whether v2 stays the default. If it does not,
  the default goes back to v1 in an amendment, and nothing is locked from v2
  until then.

## Not Addressed

- The sheet model's own Lightning LoRA (`lightx2v/Qwen-Image-Lightning`):
  sheets already take about 95 s.
- Model loading between renders, which is the rest of a page's time.
- Composited layer art, which the operator decided against for now
  (2026-10-14).

## Contract Amendments

None yet.

## Verification

To be filled in at implementation.
