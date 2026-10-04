# Storybook: "Pippa and the Whispering Moss" as the First Page Plan

Branch `feat/storybook-pages`. Slice 2 of the arc in
`storybook-illustration-recipe.md`. Operator, 2026-10-04: "write the slice 2
contract".

## Before Code

### Root Cause

- Slice 1 (PR #144) draws each character alone, on cream. A picture book is
  those same characters in scenes, page after page. Nothing here can make a
  page:
  - No story is in the storybook, so nothing says what a page shows.
  - The recipe tool renders only from text. It has no way to pass a locked
    character sheet to the model as a reference.
  - The model that takes references, Qwen-Image-Edit-2511, is not on the
    licence allowlist.
- The template story, "Pippa and the Whispering Moss", lives only in
  `bedtime_broadcast`'s SQLite database (`bedtime.db`, table `stories`,
  id 9, published 2026-09-14). Its text has seven paragraphs, so the book
  version has seven pages.
- Verified 2026-10-04, from tool output:
  - `Qwen/Qwen-Image-Edit-2511` and `unsloth/Qwen-Image-Edit-2511-GGUF` both
    declare `license: apache-2.0`. The GGUF declares the Qwen repo as its
    base model.
  - The Hub's SHA-256 for `qwen-image-edit-2511-Q4_K_S.gguf` is
    `df952ef0d2b46463bd95d9afbb78e045ec5412316f453a7ad5a3d7bcbb111b72`. The
    local copy on the Dev-Drive hashes to the same value. ComfyUI's
    `qwen_apache` model path already lists its folder.
  - The installed ComfyUI has `TextEncodeQwenImageEditPlus`, which takes up
    to three reference images, and an "Image Edit (Qwen 2511)" blueprint.

### Where This Sits in the Arc

1. Slice 1, merged: character sheets.
2. **This slice: the story snapshot, its page plan, and a page renderer**
   that draws each page from the plan, with the cast's locked sheets as
   references.
3. After this slice, in order:
   - your GPU go;
   - Pippa's, Bramble's and Barnaby's sheets, rendered and locked (slice 1's
     planned evidence);
   - the seven pages, rendered one at a time;
   - your consistency read.

   That read is the real test of the generative route. It is the evidence
   your art-track decision (generated art or hand-drawn vector rigs) is
   waiting on.

This slice is complete without the GPU. Its code is proven against the fake
ComfyUI, as slice 1's was.

### Correct Fix Must Touch

- `storybook/stories/pippa-and-the-whispering-moss.json` (new): the story
  snapshot and its page plan.
  - `source`:
    - repo `bedtime_broadcast`, file `bedtime.db`, table `stories`, id 9;
    - publish date 2026-09-14;
    - how it was read: SQLite opened read-only (`mode=ro`);
    - the SHA-256 of `content_text`:
      `25185b28a2b64fa8770602dbafa9cd46862e4e3fd2d186d0a3bd61b243cf5eee`.
  - The title, refrain, primary character and `content_text`, all verbatim.
  - `season`: "gentle autumn", from the story's resulting world state
    (`world_state` version 2), with that source recorded.
  - `pages`: the seven entries listed under "The Page Plan, v1" below.
- `storybook/tools/story-recipe.py`:
  - `MODELS` gains an `edit_unet` role: the Edit GGUF, its source, licence
    and Hub SHA-256. Page recipes use it, never character recipes.
  - `PAGE_TEMPLATES` v1 and `PAGE_RENDERS` v1, as specified below.
  - `page STORY N`:
    - renders four seeds of page N, with the cast's locked sheets as
      reference images;
    - writes the candidates, a contact sheet and a draft recipe.
  - `lock-page STORY N --seed S`: the same lock discipline as `lock`.
  - `selftest` also checks:
    - every story's plan;
    - every page lock, which must rebuild from its recipe, match its file
      digests, and own every file in its locked folder, with no file owned
      twice.
- `storybook/tools/test-story-recipe.py`: the cases listed under Settling
  Evidence, run against the fake ComfyUI.
- `storybook/design-source/pages/<story>/drafts/` and `.../locked/`: made on
  first use, as the character folders are (slice 1, amendment 3).
- `.github/workflows/storybook-quality.yml`: only its comment, which
  currently mentions only character locks. Its steps already run `selftest`
  and the tests on every `storybook/**` change.
- This contract.

### Must Not Change

- `bedtime_broadcast`: read once, read-only, for the snapshot. It is never
  written, imported or called, and nothing reads it at runtime.
- Slice 1's character path:
  - `SHEET_TEMPLATES` v1 and `RENDERS` v1;
  - `character` and `lock`;
  - the character recipe format. A character recipe still names exactly the
    three base-model files, and adding `edit_unet` must not change what any
    character recipe rebuilds to.
- `workbook/**`.
- `~/Desktop/book_integration_coordination.md`, and the 2026-09-19 art-track
  decision recorded there. This slice produces the evidence for that
  decision; it doesn't make it.

## Behaviour

### The Page Plan, v1

- One page per paragraph, in order. Each page has:
  - a **cast** of canon characters, at most three, because the Edit model
    takes at most three references. The first is picture 1.
  - a **place**;
  - a **time** of day, from the template's closed set;
  - a **scene**: what the picture shows.
- The scenes are drawn from the paragraph text and add nothing the story
  doesn't say, except where noted.
- This plan is part of what you accept with the contract. The scene wording
  is the book's art direction.

| Page | Cast | Place | Time | Scene |
|---|---|---|---|---|
| 1 | Pippa | a fallen log among the trees of Moon Berry Forest | late-afternoon | Pippa scurries along a fallen log, her paws empty, the leaves around her glowing honey and rust |
| 2 | Pippa | the edge of the Moonlit Glade, by a mossy rock near the Berry Brook | late-afternoon | Pippa kneels at a mossy rock in the silver grass, reaching one tiny finger toward a patch of pale, fine moss like spun moonlight, her paws otherwise empty |
| 3 | Pippa | a mossy rock near the Berry Brook | late-afternoon | Pippa giggles with her nose tucked into the pale, velvety moss, eyes closed, her paws empty |
| 4 | Pippa, Bramble | beside a willow near the Berry Brook | late-afternoon | Bramble steps out from behind a willow and holds out a small smooth stone wrapped in a soft fern leaf to Pippa |
| 5 | Pippa, Bramble | the mossy rock near the Berry Brook | dusk | Pippa and Bramble sit side by side, watching fireflies rise like tiny stars, the fern-wrapped stone tucked under Pippa's cap |
| 6 | Pippa, Barnaby | Barnaby's Porch | evening | Barnaby sits on his porch swing with a mug of tea, waving a slow hello, and a sleepy-eyed Pippa waves back from the path below |
| 7 | Pippa | a soft bed of moss under the trees | night | Pippa sleeps curled up on soft moss, dreaming, the moss around her glowing like stars |

Two authored choices, which the story leaves open:
- **Page 7's setting.** The story doesn't say where Pippa sleeps. The plan
  puts her on a bed of moss and shows the dream as moss glowing around her.
- **"Her paws empty" on pages 1–3.** Her sheet shows her canon prop, the
  fern-wrapped stone, which she is only given on page 4. See Known Risk.

### Page Template, v1

> `<STYLE>`. `<cast>`, each drawn exactly as in their picture. `<scene>`.
> The setting is `<place>`, in `<season>`, `<light>`. A full-page storybook
> illustration with no text.

- `<STYLE>` is the same string as the character sheets' v1 style. The book
  has one style.
- `<cast>` names each member with their canon species and picture number:
  "Pippa is the dormouse in picture 1 and Bramble is the badger in
  picture 2". ComfyUI's encoder puts "Picture 1:", "Picture 2:" before the
  reference images, so the prompt's numbers point at the right sheets.
- `<light>` comes from the time of day. The set is closed, and covers times
  the later stories need too, so they won't force a new template version:

  | Time | Light |
  |---|---|
  | morning | soft early-morning light |
  | day | gentle bright daylight |
  | late-afternoon | warm golden late-afternoon light through the trees |
  | dusk | deep amber dusk light |
  | evening | soft blue evening light |
  | night | quiet silver moonlight |

- Templates and their versions are never edited. A change is a new version.

### Render Settings, v1

ComfyUI's "Image Edit (Qwen 2511)" blueprint, with two deliberate
differences:

| Setting | Value |
|---|---|
| Model | the Edit GGUF via `UnetLoaderGGUF`, with slice 1's text encoder and VAE |
| Sampling | `ModelSamplingAuraFlow`, shift 3.1, then `CFGNorm`, strength 1 |
| Conditioning | `TextEncodeQwenImageEditPlus`: the prompt for positive and an empty prompt for negative, each given the VAE and the cast's sheets as image1 to image3 |
| Reference method | `FluxKontextMultiReferenceLatentMethod`, `index_timestep_zero`, on both. The blueprint's own note says files repackaged by others may need it, and this GGUF is one. |
| Sampler | 40 steps, CFG 4, euler/simple, denoise 1 (the blueprint's KSampler values) |
| Seeds | 61, 72, 83 and 94, as for the sheets |

The differences:
- **The page size is the recipe's, not the reference's.**
  - The blueprint sizes its output from image1 (through
    `FluxKontextImageScale` and `VAEEncode`).
  - Here an empty latent of the page size is used: 1328×1328, Qwen-Image's
    native square and the sheets' size.
  - At denoise 1 the encoded image contributes only its size, so nothing
    else changes.
  - The encoder rescales references itself: 384² for the vision model and
    1 MP for the reference latents.
- **The model is the GGUF, not `qwen_image_edit_2511_bf16`**, as slice 1
  did for the base model.

Tuning after the first real pages is a v2, not an edit.

### Recipes, References and Locks

- **One constructor builds a page recipe; checks rebuild it** (slice 1's
  pattern). The recipe records:
  - the story, the page number, and the page entry it drew;
  - the story text's SHA-256;
  - the template and render versions, and the prompt;
  - the models;
  - the references: each cast member's name and the SHA-256 of their locked
    sheet, in picture order.

  As a result:
  - **Re-locking a character fails every page lock drawn from the old
    sheet**, until those pages are re-locked on purpose.
  - Editing a page entry, or the story text, fails the locks it described.
- **References reach ComfyUI by content.** `page` uploads each locked sheet
  through ComfyUI's `/upload/image`, under a name derived from its SHA-256,
  with overwrite on. The graph loads that name, so the recipe alone
  determines the graph.
- **`page` renders only from sound sheets.** Each cast member must have a
  locked sheet that passes slice 1's lock checks.
- **`page` checks ComfyUI before rendering.** It needs:
  - the three model files visible;
  - every node type the page graph uses.
- **`lock-page`** follows `lock`:
  - it validates a staged copy;
  - it refuses a candidate whose bytes changed since `page` rendered it;
  - it records file digests and a rendered seed;
  - it replaces only its own lock;
  - it does all of this under the one lock on the storybook root.
- **The contact sheet shows the references.** The cast's locked sheets sit
  in a strip above the four candidates, so the pick is also a consistency
  read.
- **File names:**
  - drafts in `design-source/pages/<story>/drafts/`:
    `page-NN-candidate-<seed>.png`, `page-NN-contact-sheet.png` and
    `page-NN-recipe.json`;
  - locks in `.../locked/`: `page-NN.png` and `page-NN.recipe.json`. A lock
    is its page: `selftest` fails a recipe whose page number isn't its file
    name's.

### The Story Plan Check

`selftest` runs this on every story, and `page` runs it before rendering.
The plan must have:
- a story text that hashes to the recorded SHA-256;
- exactly one page per paragraph (paragraphs are separated by blank lines);
- casts of one to three distinct canon characters;
- every time from the template's set;
- a non-empty place and scene on every page.

### Threat Model and Concurrency

The same as slice 1: one operator, on one machine, and one lock on the
storybook root for every write. Page commands take the same lock as
character commands.

### Failure Cases

Each exits before anything is written:
- an unknown story;
- a page number outside the plan;
- a plan that fails its check;
- a cast member with no locked sheet, or a sheet that fails its lock checks;
- a model off the allowlist, or not visible to ComfyUI;
- a node type the graph needs that ComfyUI lacks;
- a seed that wasn't rendered;
- an existing page lock without `--force`;
- ComfyUI unreachable;
- an upload that ComfyUI stored under a different name.

### Known Risk, Read at the First Real Renders

- **Pippa's sheet shows the stone she only gets on page 4.** A reference's
  details carry into the picture, and "her paws empty" is only a nudge. If
  pages 1–3 still show the stone, that is a v2 problem with three possible
  fixes, and the choice belongs to whoever sees the renders:
  - the prompt;
  - a prop-free sheet variant;
  - accepting the stone as part of how she looks.
- **The time each page takes to render has not been measured.** The work
  is:
  - three sheets × four seeds at 20 steps;
  - then seven pages × four seeds at 40 steps.

  `page` renders one page per run, so GPU use stays in your hands. The first
  page's time is reported before any other page runs.

## Settling Evidence (planned)

- **Tests against the fake ComfyUI:**
  - `page`, then `lock-page`, then `selftest`, end to end, from a test
    character lock.
  - The uploads ComfyUI receives are byte-identical to the locked sheets.
  - The graph wires them as image1 to image3 in cast order, and loads the
    Edit model.
  - Each failure case.
  - Re-locking a character fails the page lock drawn from the old sheet.
  - An edited story text fails `selftest`, and an edited page entry fails
    its page lock.
  - The plan check refuses:
    - one paragraph more than there are pages;
    - a non-canon cast member;
    - a cast of four;
    - a time outside the set.
  - A character recipe rebuilds exactly as before `edit_unet` was added.
  - Slice 1's cases still pass.
- **`selftest` on the real storybook** passes with the snapshot and no
  locks.
- **After your GPU go**, in order:
  - the three sheets, locked;
  - page 1's four candidates and its render time;
  - pages 2–7, one at a time;
  - your consistency read: the same three characters on every page,
    nothing appearing before the story gives it (page 4's stone), and no
    text in the pictures;
  - your pick for each page.

## Not Addressed

- **Book layout:**
  - where the text sits on the page, the trim size, and a page size other
    than 1328²;
  - the PDF;
  - whether the narration cues in the text (`[pause]`, `[gentle pat]`,
    `[yawn]`) are printed. The snapshot keeps them verbatim; print is a
    layout decision.
- Page plans for the other 14 stories, whether written by hand or by a
  model.
- Rendering a whole story in one command.
- Upscaling for print.
- **Binding renders to model bytes** (#145), which now covers four files.
  The Edit model's Hub digest is recorded, and the local copy matched it.
- #146.
- Wiring to `bedtime_broadcast`.

## Contract Amendments

Accepted 2026-10-04 ("accept"). Found while building:

- **Story names are lowercase words joined by hyphens.** `page` and
  `lock-page` take a story name that becomes a file path, so anything else
  (`../canon/moon-berry-forest`, for one) is refused as "not a story".
  `selftest` fails a story file with any other name.
- **A page entry is exactly `cast`, `place`, `time` and `scene`.** An entry
  with a missing or extra key fails the plan check, so the plan can't grow
  fields that the template silently ignores.
- **A page folder with no passing story fails `selftest`.** Page locks under
  `design-source/pages/<name>/locked/` must belong to a story in `stories/`
  that passes its check. Otherwise they can't be rebuilt, and `selftest`
  says so instead of skipping them.
- **The character lock code is now shared with pages, without changing its
  behaviour.** Three helpers are shared:
  - committing a lock;
  - checking a locked folder (regular files, digests, one owner each);
  - comparing a rebuilt recipe.

  Every slice 1 message and rule is unchanged. The evidence for that is
  under Verification.
- **An upload must come back with the name it was sent under**, with no
  subfolder. Without overwrite, ComfyUI renames a file whose name is
  already taken. The tool always sends overwrite, and still checks the name
  it gets back.
