# Storybook: AI Art Terms and Model Licence Record

Branch `feat/storybook-art-terms`. Operator, 2026-10-14: "lets write the
licence records or get them if needed." Context: the nightly bedtime story
will carry storybook pictures of Kennedi and her friends, and the same
stories will become the books we sell, so the pictures need a licence record
that covers commercial use.

This is the amendment that
`learning-playground/docs/contracts/art-production-assets.contract.md`
("AI-Assisted Artwork") requires before generative output is used. It covers
the storybook only. What the owner has approved, and what still waits for
approval, is recorded under "Owner Approval" at the end.

## Before Code

### Root Cause

- The art contract says: before any AI assistance is used, add an
  owner-approved amendment documenting the tool, current commercial terms,
  output licence or ownership grant, disclosed training provenance,
  indemnification, protected-character or artist-imitation risk, source
  prompt, editability, and the owner's explicit approval.
- The storybook has rendered with generative models since 2026-10-04. What
  exists is a licence **allowlist**: `storybook-illustration-recipe.md` and
  `storybook-page-plan.md` name each model file, its source repo and
  `apache-2.0`, and `storybook/tools/story-recipe.py` `MODELS` holds the same
  table with the Hub's SHA-256 for each file. Nothing records the other
  items the art contract lists, and there is no owner approval on record.
  This amendment should have come before the first render; it is written now
  and nothing new is locked until it is approved.
- `docs/art/asset-provenance.md` has no entry for any storybook asset.

### Correct Fix Must Touch

- This file: the record and the approval it asks for.
- After approval, and in a separate commit: `docs/art/asset-provenance.md`
  entries for the locked storybook families, citing this file.

### Must Not Change

- `storybook/tools/story-recipe.py`, its `MODELS` table, any recipe, render
  or lock. This record describes them; it does not edit them.
- The workbook's FLUX.1-dev art. It is non-commercial and stays outside this
  record; nothing here clears it.
- `bedtime_broadcast`.

## The Record

### 1. Tool

- ComfyUI 0.25.0 (`~/Desktop/ComfyUI-master/comfyui_version.py`), GPL-3.0.
  The GPL covers the software, not the pictures it renders.
- Custom node `ComfyUI-GGUF`, Apache-2.0 (its `LICENSE`), which loads the
  GGUF model files.
- Driven only by `storybook/tools/story-recipe.py`, on the operator's own
  RTX 3090. No hosted service, account, subscription or usage terms are
  involved.

### 2. Models

Every file a storybook recipe can name. All six repos (the four files and the
two upstream models they are quantised from) declare `license: apache-2.0` in
their Hugging Face card metadata, carry the `license:apache-2.0` tag, and are
not gated.

| Role | File | Bytes | From | Upstream |
|---|---|---|---|---|
| Sheets (`unet`) | `qwen-image-Q8_0.gguf` | 21,761,817,120 | `city96/Qwen-Image-gguf` | `Qwen/Qwen-Image` |
| Pages, child cleanup (`edit_unet`) | `qwen-image-edit-2511-Q4_K_S.gguf` | 12,410,747,488 | `unsloth/Qwen-Image-Edit-2511-GGUF` | `Qwen/Qwen-Image-Edit-2511` |
| Text encoder (`clip`) | `qwen_2.5_vl_7b_fp8_scaled.safetensors` | 9,384,670,680 | `Comfy-Org/Qwen-Image_ComfyUI` | `Qwen/Qwen2.5-VL-7B-Instruct` |
| VAE (`vae`) | `qwen_image_vae.safetensors` | 253,806,246 | `Comfy-Org/Qwen-Image_ComfyUI` | `Qwen/Qwen-Image` |

SHA-256, the same in three places: the Hub's published digest, the local file
on the Dev-Drive, and `MODELS` in the tool.

- `qwen-image-Q8_0.gguf`:
  `43142b32778dc0568c27395abc6f8291ac53f1de0b98eed919712cf161f248de`
- `qwen-image-edit-2511-Q4_K_S.gguf`:
  `df952ef0d2b46463bd95d9afbb78e045ec5412316f453a7ad5a3d7bcbb111b72`
- `qwen_2.5_vl_7b_fp8_scaled.safetensors`:
  `cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4`
- `qwen_image_vae.safetensors`:
  `a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f`

Licence text: only `Qwen/Qwen-Image` ships a `LICENSE` file at its root, and
it is the standard Apache License, Version 2.0, January 2004. The other five
repos state the licence in card metadata only.

### 3. Commercial Terms

Apache-2.0 grants a perpetual, worldwide, no-charge, royalty-free licence to
use, reproduce and modify the models, including commercially. There is no
fee, account, usage cap or field-of-use restriction, and nothing needs to be
bought. Its redistribution conditions apply only if we hand out the model
files, which we do not.

### 4. Output Licence and Ownership

Apache-2.0 licenses the models. It puts no terms on the pictures they
produce and grants no ownership in them either. The project uses the
pictures as its own, but, as the art contract says, AI output is not assumed
to be exclusive or copyrightable: a copied picture may not be protectable.
What makes a book ours is the story text, the characters and their names,
and the layout.

### 5. Disclosed Training Provenance

From the Qwen-Image Technical Report (arXiv 2508.02324), linked from the
`Qwen/Qwen-Image` card:

- "billions of image-text pairs";
- four domains: Nature (about 55%), Design (about 27%, "artistic styles,
  text rendering, and complex layouts"), People (about 13%), and Synthetic
  Data for text rendering;
- the synthetic data "does not include images generated by other AI models".

The report does not list the sources or licences of the training images.

The edit model (`Qwen/Qwen-Image-Edit-2511`) has no data disclosure of its
own, and its card says it "integrates selected popular LoRAs directly into
the base model". These are community-made fine-tunes. The card shows what two
of them do (lighting enhancement, new viewpoints), but it does not name the
LoRAs, their authors or their licences. Qwen publishes the merged checkpoint
under Apache-2.0, but where the merged LoRAs came from cannot be assessed.

The text encoder (`Qwen/Qwen2.5-VL-7B-Instruct`) comes from the Qwen2.5-VL
Technical Report (arXiv 2502.13923). Its pre-training corpus grew "from 1.2
trillion tokens to 4.1 trillion tokens", made of interleaved image-text,
grounding, document-parsing, OCR, video and agent data. The report does not
list the sources or licences either. The encoder reads the prompt, and on
pages the reference sheets; it does not draw the picture.

### 6. Indemnification

None. Apache-2.0 disclaims all warranties (section 7) and limits liability
(section 8). Section 9 lets a redistributor offer an indemnity for a fee, and
none of the six repos offers one. The project carries this risk.

### 7. Protected-Character and Artist-Imitation Risk

- No prompt names an artist, studio, brand or existing character. A search of
  `story-recipe.py`, `canon/`, `children/` and `friends/` for "in the style
  of", studio names and "artist" finds nothing. The style line is generic:
  "soft storybook watercolor illustration ... cozy picture-book style".
- The cast is original: Pippa, Bramble and Barnaby (the `bedtime_broadcast`
  canon), and the invented friends Maya, Theo, Sora and Ravi.
- Remaining risk: a model trained on billions of images can echo existing
  work, and the edit model also carries community LoRAs nobody here has
  assessed (section 5). No prompt invokes them. The check is the operator's
  look approval at every lock.

### 8. A Real Child's Likeness

Kennedi is the operator's own child, and the operator approves the use of
her name and likeness in the stories (2026-10-14: "we have her name and
likeness already in our locked kennedi files"). This repository is public.
Her locked sheet is not committed and stays out of the repository unless the
operator decides otherwise. A customer's child's name, answers or pictures
never enter the repository.

### 9. Source Prompt

Every candidate's `*-recipe.json` records the full prompt, seed, model files
and graph, and every rendered PNG embeds its graph. The nine locked
storybook PNGs (Pippa, Bramble and Barnaby on `main` and in the render
worktree; Kennedi's two files and Leo's in the render worktree) embed only
the four files above.

### 10. Editability

The output is a raster PNG, not the editable vector the art contract
prefers. The editable source is the recipe: it records the prompt, seed,
settings and graph needed to render the picture again. An edit is a new
recipe version and a new pick, never a retouched PNG. Approving this
amendment accepts that deviation for storybook art.

Re-rendering is not verified. `lock` checks the chosen candidate's size,
seed and embedded graph and copies it; it does not render it again. The tool
also cannot see which bytes ComfyUI loads under an allowlisted file name. A
re-render matches only on the same model bytes (the SHA-256 digests in
section 2, checked 2026-10-14) and the same ComfyUI build (0.25.0, recorded
in the lock record). Proving it takes a GPU re-render compared pixel for pixel,
which has not been run.

## What Approval Covers

- The four files above, for storybook art, for any use including commercial:
  the nightly story's pictures and the books we sell, once "Owner Approval"
  records the approval.
- Nothing else. Any new model, LoRA or encoder (for example a step-distilled
  "Lightning" LoRA to cut render time) needs its own row here, checked the
  same way and approved, before a recipe can name it.

## Not Addressed

- Legal advice. This record states what the licences and the report say. A
  lawyer's read before printed books are sold is the operator's call.
- The workbook's FLUX.1-dev art (non-commercial; unchanged).
- Ledger entries, which follow approval in their own commit.

## Contract Amendments

### Amendment 1: Review Findings (2026-10-14)

Codex review of the first commit found four gaps; the record is corrected
above:

- The opening line called the record owner-approved while approval was
  pending. It now points to "Owner Approval".
- Section 5 left out the edit model's merged community LoRAs. They are now
  recorded, and so is the fact that their origin cannot be assessed.
- Section 5 left out the text encoder's training provenance. It is now
  recorded from the Qwen2.5-VL Technical Report.
- Section 10 said `lock` checks that a recipe re-renders the same picture.
  It does not. Section 10 now says re-rendering is unverified and what it
  depends on.

The operator approved the record before these disclosures, so approval of the
amended record is asked for again (see "Owner Approval").

## Verification

Run 2026-10-14, read-only:

- `hf models card <repo> --metadata` for the six repos: each shows
  `"license": "apache-2.0"`; `hf models info` shows the `license:apache-2.0`
  tag and `gated: False` for all six.
- Hub `paths-info` for the four files: sizes and SHA-256 as in the table.
- `sha256sum` of the four Dev-Drive files: identical digests.
- `Qwen/Qwen-Image` repo tree: the only `LICENSE` file among the six repos;
  its header and sections 7 and 9 match Apache-2.0.
- PNG text chunks of the nine locked storybook PNGs: model files named are
  only the four above.
- `comfyui_version.py`: `0.25.0`; `custom_nodes/ComfyUI-GGUF/LICENSE`:
  Apache-2.0; ComfyUI `LICENSE`: GPL-3.0.

## Owner Approval

This section is the one place that says whether the record is approved.

- First version approved: operator, 2026-10-14, in the conversation: "I
  approve #163".
- Amendment 1 then added disclosures that the first version lacked: the edit
  model's merged community LoRAs, the text encoder's training provenance, and
  the correction that re-rendering is unverified.
- **Pending:** the operator re-confirms the amended record as a whole. Until
  that is recorded here, no model in section 2 is cleared.
