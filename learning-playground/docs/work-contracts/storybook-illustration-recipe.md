# Storybook: an Illustration Recipe for the Bedtime Book

Branch `feat/storybook-recipe`. Operator, 2026-10-04: "bedtime book, start
the recipe. we're going to skip wiring anything to the bedtime story for
now. We can use the stories as our first template."

## Before Code

### Root Cause

- The bedtime book has no art pipeline that can make it.
  - Its world is Moon Berry Forest, with Pippa, Bramble and Barnaby.
  - Their visual canon is locked, and 15 stories are published, in
    `bedtime_broadcast`.
- Every illustration tool here renders with FLUX.1-dev, which is
  non-commercial, and the book is meant to be sold.
- The workbook recipe renders one subject on white. It has no character
  reference, no scene, and no story. A picture book is mostly the same
  characters in new scenes and poses, the "hard technical blocker" of
  2026-09-19.
- Verified 2026-10-04: a fully apache-2.0 stack exists, and is on the
  Dev-Drive or downloading to it:
  - Qwen-Image, the base model;
  - Qwen-Image-Edit-2511, which edits from up to three reference images and
    whose card claims "improved character consistency";
  - the Qwen2.5-VL text encoder;
  - the Qwen-Image VAE.

### The Arc: Two Slices, Serial

1. **This slice: character sheets.**
   - Snapshot the canon.
   - A Qwen-Image recipe renders each character alone on a plain background,
     from its canon fields.
   - The operator picks a seed, and the lock becomes the character's
     reference image, recorded and checked.
2. **Next slice: a story as the first template.**
   - A page plan for "Pippa and the Whispering Moss" (2026-09-14): one page
     per paragraph, with its characters, place and time of day.
   - Each page renders with Qwen-Image-Edit, using the locked character
     sheets as references.
   - That slice's contract is written when this one merges.

### Correct Fix Must Touch (this slice)

- `storybook/canon/moon-berry-forest.json` (new): a snapshot of
  `WORLD_BIBLE` from `bedtime_broadcast` at `10636b5`, with that source
  recorded:
  - the world's name, description, pacing and avoid list;
  - each character's description and appearance.

  Nothing reads `bedtime_broadcast` at runtime.
- `storybook/tools/story-recipe.py` (new):
  - `character NAME`: renders four seeds of the character-sheet template,
    plus a contact sheet and a draft recipe.
  - `lock NAME --seed N`: locks the pick, with a recipe recording each
    file's SHA-256.
  - `selftest` checks that:
    - every lock rebuilds from its recipe;
    - its files match their digests;
    - every file in the locked folder has exactly one owner;
    - every model a recipe names is on the licence allowlist.
- `storybook/tools/test-story-recipe.py` (new): runs the real command line
  against a copy of the storybook, with a fake ComfyUI, the way the
  workbook's tests do.
- `storybook/design-source/characters/drafts/` and `.../locked/`: the
  folders. Locks come later, from real renders.
- `.github/workflows/storybook-quality.yml` (new): runs `selftest` and the
  tests on storybook PRs.
- This contract.

### Must Not Change

- `bedtime_broadcast`: read once for the snapshot; never written, imported
  or called.
- `workbook/**`, including `illustration-recipe.py`. Sharing its core with
  this tool is a possible later refactor, not this slice.
- `~/Desktop/book_integration_coordination.md`, and the 2026-09-19 art-track
  decision recorded there (hand-authored vector rigs). This prototypes the
  generative alternative. Whether it replaces that decision is the
  operator's call, once real renders exist.

## Behaviour (this slice)

- **Models are allowlisted by licence.** The tool knows each model file it
  may render with, its source repo and its licence. A recipe records them,
  and the tool refuses any other model, so a lock is sell-safe by
  construction.

  | File | Source | License |
  |---|---|---|
  | `qwen-image-Q8_0.gguf` | `city96/Qwen-Image-gguf` | apache-2.0 |
  | `qwen_2.5_vl_7b_fp8_scaled.safetensors` | `Comfy-Org/Qwen-Image_ComfyUI` (from `Qwen/Qwen2.5-VL-7B-Instruct`) | apache-2.0 |
  | `qwen_image_vae.safetensors` | `Comfy-Org/Qwen-Image_ComfyUI` | apache-2.0 |

- **Character-sheet template, v1:** one style string for the whole book,
  plus the canon fields:

  > `<STYLE>`. A single `<build>` `<species>` standing in a relaxed
  > three-quarter view, `<base_colors>`, wearing `<garment>`, with
  > `<props>`, `<accent>`, plain soft cream background, full body, centered,
  > no text.

  - The garment and props clauses are left out when empty.
  - `<STYLE>` = soft storybook watercolor illustration, gentle warm
    moonlit palette, clean confident outlines, cozy picture-book style.
  - Templates and their versions are never edited; a change is a new
    version.
- **Render settings, v1:** ComfyUI's own Qwen-Image defaults (its "Text to
  Image (Qwen-Image)" blueprint), with fixed seeds 61, 72, 83 and 94 as in
  the workbook:
  - 1328x1328;
  - AuraFlow shift 3.1;
  - euler/simple;
  - CFG 4, 20 steps.

  Tuning after the first real renders is a v2, not an edit.
- **The recipe is built by one constructor, and checked by rebuilding it**,
  as in the workbook since PR #138. The canon fields a recipe used are
  recorded, so a later change to the snapshot fails the locks it described
  until they are re-locked on purpose.
- **Lock:**
  - copies the candidate into staging and validates the staged copy;
  - records file digests;
  - replaces only its own lock;
  - commits under one lock on the art folder.
- **The threat model, stated up front:** one operator, on one machine. The
  tool takes one lock on its art folder, and symlinks or nested folders in
  a locked folder fail `selftest`. Hardening against concurrent or
  adversarial use beyond that is out of scope; that is the lesson of
  PR #138's eight rounds.
- **Failure cases**, each exiting before anything is written:
  - an unknown character;
  - a model that is not on the allowlist;
  - a seed that wasn't rendered;
  - an existing lock without `--force`;
  - ComfyUI unreachable.

## Settling Evidence (planned)

- Tests against the fake ComfyUI:
  - `character`, then `lock`, then `selftest`, end to end;
  - each failure case;
  - a recipe naming a model off the allowlist fails `selftest`;
  - a changed canon field fails the lock it described.
- After the operator allows GPU work: four real Pippa candidates, and the
  operator's pick. The first consistency read is in slice 2.

## Not Addressed

- **Print resolution:** 1328 px is about 166 DPI at 8 inches. Upscaling
  waits for a trim size.
- **Wiring** to `bedtime_broadcast` and the drop folder.
- **The art-track decision itself.**

## Contract Amendments

- **"with `<props>`", not "holding `<props>`"** (before code). The canon's
  signature props aren't all held: Bramble's are a small lantern and round
  glasses, and Barnaby's are a porch swing and a mug of tea.
- **The snapshot is parsed, not imported.** `WORLD_BIBLE` is read from
  `git show 10636b5:engine/models.py` with Python's `ast`. The bedtime code
  never runs, as Must Not Change requires.

- **The character folders are made on first use** (found while building).
  Git can't hold an empty folder, and a placeholder file in `locked/` would
  itself fail the "every file has an owner" rule. The tool creates both
  folders when it first writes, and `selftest` passes when `locked/` doesn't
  exist yet.
- **Garments read "wearing a `<garment>`"** (found while building). The
  canon's garments have no article ("patchwork vest").

## Cold Diff Audit

### Gaps

- Change without contract trace: none. `git diff origin/main...HEAD` holds
  only the canon snapshot, the two tools, the workflow and this contract.
- Contract requirement not delivered: none.
  - The empty character folders are covered by the "first use" amendment.
  - The real renders are planned evidence for after the operator's GPU go,
    not part of this diff.
- Protected surface touched: none.
  - Nothing under `workbook/` changes.
  - `bedtime_broadcast` was only read: `git show` plus `ast`. Its own
    status shows two untracked files this session didn't create: the story
    session's `docs/contracts/character-vector-rig.spec.md`, and its
    `broadcast.log`.

### Change By Change Reconstruction

- `storybook/canon/moon-berry-forest.json` (new): `WORLD_BIBLE` at
  `10636b5`, with a `source` block naming the repo, commit, path and
  method.
- `storybook/tools/story-recipe.py` (new):
  - `:42` `MODELS`: the three allowlisted files, with source and licence;
    `:48` `LOADERS`: the ComfyUI loader node and field for each.
  - `:51` `SHEET_TEMPLATES` v1 (style and text), `:58` `RENDERS` v1
    (ComfyUI's Qwen-Image defaults), `:61` `ADDED_KEYS`.
  - `:72` `character()`: canon characters only, any case.
  - `:80` `sheet_prompt()`: the optional garment and props clauses.
  - `:90` `recipe_graph()`: the Qwen-Image graph, built from the recipe
    alone. The nodes and field names match ComfyUI's source.
  - `:112` `draft_manifest()`: the one constructor.
  - `:130` `embedded_problems()`:
    - the allowlist;
    - a rebuild from the inputs, compared key by key;
    - size, seed, and the embedded graph.
  - `:163` `art_lock()` and `:174` `staging()`: draft sets land whole,
    under the lock.
  - `:185` `api()` and `:194` `render()`: the ComfyUI client.
  - `:223` `cmd_character()`: the allowlisted files must be visible to
    ComfyUI before any render.
  - `:246` `cmd_lock()`: everything under the lock, validating the staged
    copy.
  - `:282` `locked_problems()` and `:318` `cmd_selftest()`.
  - `:329` `main()`: `--storybook`; ComfyUI unreachable exits cleanly.
- `storybook/tools/test-story-recipe.py` (new):
  - `:40` `FakeComfy`;
  - six cases at `:133-218` (17 checks).
- `.github/workflows/storybook-quality.yml` (new): Pillow, `selftest`, the
  tests.

### Contract Traceability

- Canon snapshot, both tools, workflow: Correct Fix Must Touch.
- Parsing rather than importing: Amendment 2.
- "with `<props>`": Amendment 1.
- Wording of the garment clause: Amendment 4.
- The folders made on first use: Amendment 3.

### Verification

- `test-story-recipe.py`: 17 of 17 checks, on Python 3.13 with Pillow 11.3
  and on Python 3.12 with Pillow 10.2:
  - the end to end run;
  - the refusals:
    - an unknown character;
    - ComfyUI unreachable;
    - a model ComfyUI can't see;
    - an unrendered seed;
    - a lock without `--force`;
  - a candidate that isn't its recipe's render;
  - a non-commercial model, which fails `selftest`;
  - a canon change, which fails the lock drawn from it;
  - a re-saved PNG;
  - a stray file, a symlink and a folder in `locked/`.
- The three generated prompts were read and match the canon: Bramble's
  lantern and glasses, Pippa's acorn cap and stone, and no garment clause
  for Barnaby.
- `selftest` on the real storybook passes, with no locks yet.
- Not run: a real render. It needs the operator's GPU go, and the Qwen
  models to finish downloading and be listed in ComfyUI's
  `extra_model_paths.yaml`.
