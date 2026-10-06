# Storybook: The Child as the Hero (Boy or Girl), Proved With Two Children

Branch `feat/storybook-child-hero`. Operator, 2026-10-05, on writing this
contract: "yes go for it".

## Before Code

### Root Cause

- The operator set the product shape on 2026-10-05:
  - "the daily ebook i was thinking should be delivered by email free, and
    the customized versions tailored to each kid would be sold. The books
    wed sel would be hard copies that they can hold and cherish"
  - "story written around the kid. so theyd be the main character."
  - "child should be drawn, we need to account for boy an girl and nothing
    inbetween"
- The storybook tool can't draw a child:
  - It draws only the canon cast. `character` and the page plan check refuse
    every name that isn't in `canon/moon-berry-forest.json`, which holds
    three animals.
  - It has no record of a child: no name, no boy or girl, no look.
  - A story's text is fixed. Nothing fills in a child's name, or "he" or
    "she".
- The open question is whether a generated child stays the same child from
  page to page. A printed book can't have a page where the hero looks like
  someone else.
  - The 2026-09-19 art-track decision (`~/Desktop/book_integration_coordination.md`,
    update 2026-09-19c) chose hand-authored vector rigs for the book you'd
    sell. It rested on two blockers:
    - licensing, because FLUX.1-dev is non-commercial;
    - new poses, because a raster model couldn't guarantee a character stays
      on-model.
  - The storybook stack is Qwen-Image and Qwen-Image-Edit-2511, both
    Apache-2.0, so the licensing blocker doesn't apply to it.
  - The pose blocker is unmeasured for a child. The one data point so far is
    a single scratch render: Kennedi's line art posed by Qwen-Image-Edit,
    seed 61. Her pose and outfit held, and her face drifted.
- That same decision deferred child-as-hero personalization. The operator's
  2026-10-05 decisions bring it back.

### Where This Sits in the Arc

1. Merged: character sheets (#144), page plans and pages (#148), template v2
   and the three locks (#149), and resumable renders (#151).
2. **This slice: a child hero, boy or girl, built from form-style answers.**
   It includes:
   - a personal story whose text fills in the child's name and pronouns;
   - a proof with two children: Kennedi, and an invented boy.
3. Afterwards, in an order the proof's result decides:
   - **If the children hold up:**
     - the order form, with its closed option lists;
     - handling real orders' data;
     - the personal-story writer;
     - upscaling and print layout;
     - a printed test copy.
   - **If they don't:** the evidence goes to the art-track decision, which
     stays yours. The options include:
     - a template v2;
     - more seeds;
     - the vector rigs;
     - the September note's other idea: a cut-out child placed onto reusable
       backgrounds.

### Correct Fix Must Touch

- `storybook/children/<id>.json` (new): one profile per child. The file name
  is the child's id. This slice adds two:
  - `kennedi.json`;
  - `leo.json`.
- `storybook/personal-stories/meeting-pippa.json` (new): the proof's personal
  story and its page plan.
- `storybook/tools/story-recipe.py`:
  - `CHILD_TEMPLATES` v1, as specified below.
  - **`child ID` and `lock-child ID --seed S [--force]`:** the child's
    character sheet. These follow `character` and `lock`: four seeds, set by
    set, resumable, and locked from a staged copy under the one lock.
  - **`book-page STORY CHILD N` and `lock-book-page STORY CHILD N --seed S
    [--force]`:** page N of a personal story, drawn for one child. The cast's
    sheets are the references: the child's from the children's locks, the
    animals' from the character locks.
  - **`selftest` also checks:**
    - every child profile;
    - every personal story;
    - every child lock;
    - every book page lock.
- `storybook/tools/test-story-recipe.py`: the cases listed under Settling
  Evidence.
- New folders, each made on first use:
  - `storybook/design-source/children/drafts/` and `.../locked/`;
  - `storybook/design-source/books/<story>/<child>/drafts/` and
    `.../locked/`.
- `.github/workflows/storybook-quality.yml`: the comment only, if it names
  what `selftest` covers.
- This contract.

### Must Not Change

- **The canon,** and the canon cast's path:
  - `character` and `lock`;
  - `page` and `lock-page`;
  - their templates, render settings and recipe formats.
  - Every existing lock (three sheets) rebuilds exactly as it does now.
  - A child is never a canon character, and a canon command never accepts a
    child.
- **The bedtime stories:** `storybook/stories/` and its plan check.
- **`bedtime_broadcast`:** not read, written, imported or called.
- **`workbook/**`:** read once, for Kennedi's look, and never written.
- **The 2026-09-19 art-track decision.** This slice produces evidence for
  re-deciding the sold book's art. It doesn't make that decision.

## Behaviour

### A Child Profile

A profile is the answers a parent will give on the form. Today the answers
are phrases; the form slice turns them into closed choices.

| Key | Rule |
|---|---|
| `name` | 1–24 characters: letters, joined by single spaces, hyphens or apostrophes ("Mary-Jane", "D'Andre"). It is used in the text and the prompt. |
| `child` | exactly `"boy"` or `"girl"`. Nothing else is accepted: no other value, case or spacing. |
| `age` | a whole number from 2 to 8. These are picture-book ages, and you can change them. A boolean, a string or 4.0 is refused. |
| `appearance` | exactly `skin`, `hair`, `eyes`, `outfit` (each a non-empty single-line phrase of at most 200 characters) and `glasses` (`true` or `false`) |
| `source` | where the answers came from (non-empty) |

- **No other keys.** The file name is the id: lowercase words joined by
  hyphens.
- **What a profile controls, and what it doesn't.** It sets only how the
  child is drawn, and the child's name and pronouns in the text. It never
  changes the plot.
  - This carries forward the September schema's rule: "Appearance affects
    character look ONLY -- never plot/personality/dialect. Never inferred
    from name."
- **Pronouns come from `child`:**

| Slot | boy | girl |
|---|---|---|
| `{subject}` | he | she |
| `{object}` | him | her |
| `{possessive}` | his | her |
| `{reflexive}` | himself | herself |

  Each slot also has a capitalised form: `{Subject}`, `{Object}`,
  `{Possessive}`, `{Reflexive}`.

### The Two Proof Children (part of what you accept)

**Kennedi** (`kennedi.json`):

| Key | Value |
|---|---|
| name, child, age | Kennedi, girl, 4 |
| skin | light golden-brown skin with soft, darker golden-brown shading and a faint rosy-tan blush on the cheeks |
| hair | dark brown hair parted in the middle and pulled back smoothly from her forehead into two long, smooth, wavy pigtails at the sides of her head, each tied with a small round red hair tie |
| eyes | big round dark eyes with long curled eyelashes |
| outfit | a cream collared polo shirt with a plain round badge showing a simple red star, an orange knee-length pleated skirt, short white socks and red sneakers |
| glasses | false |

Where these values come from:
- **The skin** is the workbook's `<SKIN>` wording, word for word. It is the
  tone you approved on 2026-10-04: `#D9A774`, in
  `workbook/design-source/boss-kennedi/palette.json`.
- **The hairstyle** is the workbook's `<HEAD>`, from the 2026-09-24 face and
  hair lock. One change: `<HEAD>` says "with no bangs", and here it reads
  "pulled back smoothly from her forehead". The renders taught us that
  naming something absent draws it.
- **The colours** are taken from the approved cover
  (`workbook/design-source/scenes/cover-concept-c-golden.png`): dark brown
  hair, red hair ties, a cream polo, an orange skirt and red sneakers.
- **Confirmed by the operator, 2026-10-05:** "i dont want bangs, she has pig
  tails most of the time."
  - The cover draws her with bangs and high pigtails. This profile follows
    the newer face and hair lock instead.
  - She has pigtails on every page, so the book keeps one look.

**Leo** (`leo.json`): invented for this proof. He is not a real child.

| Key | Value |
|---|---|
| name, child, age | Leo, boy, 5 |
| skin | deep brown skin with warm undertones |
| hair | short black curly hair |
| eyes | dark brown eyes |
| outfit | a mustard-yellow knit sweater, navy blue shorts, white socks and green sneakers |
| glasses | true |

Leo is chosen to cover what Kennedi doesn't:
- a boy;
- a deeper skin tone, since image models are known to lighten skin;
- glasses, which models often drop from one page to the next.

You can change any of his values.

### Children's Data

- **Real orders' children never go into this repo.** That means no profile,
  sheet or page of a real customer's child.
- This slice adds only Kennedi, who is already this repo's own character
  with an approved look, and an invented boy.
- Storing real orders is a later slice. It needs its own privacy design
  before any real order is taken.

### Child Sheet Template, v1

> `<STYLE>`. A single young `<child>`, about `<age>` years old, standing in a
> relaxed three-quarter view. `<Subject>` has `<skin>`, `<eyes>`, and
> `<hair>`. `<Subject>` is wearing `<outfit>``<glasses>`. Plain soft cream
> background, full body, centered, no text

(Amended while building; see amendment 1.)

- `<STYLE>` is the v2 sheet style, so the book has one style.
- `<child>` is "boy" or "girl", and `<Subject>` is "He" or "She".
- `<glasses>` is ", and round glasses" when `glasses` is true. Otherwise it
  is empty.
- Render settings: `RENDERS` v1, the same as the animals' sheets, with the
  same seeds (61, 72, 83 and 94).
- Templates and their versions are never edited. A change is a new version.

### A Personal Story

- A personal story is a bedtime-story file with slots for the child, and its
  page plan. Its `source` names who wrote it and records the SHA-256 of its
  slotted text.
- **The text, the title and each page's place and scene** may use only:
  - `{name}`;
  - the pronoun slots above.

  A slot can't carry a conversion or a format spec. Any other `{...}` fails
  the check, and so does a stray brace.
- **A page's cast** holds at most three members, all different. Each is
  either `{child}` or a canon character. `{child}` must be in at least one
  page's cast, since the child is the hero.
- **The rest of the plan follows the story plan check:**
  - one page per paragraph;
  - each page's keys are exactly cast, place, time and scene;
  - every time is from the template's set;
  - every place and scene is non-empty.
- **Filling** happens only after the story and the profile pass their
  checks. `{name}` becomes the child's name, and each pronoun slot becomes
  the pronoun for that child.
- **A child can't share a name with a canon character in the story.**
  Otherwise the prompt would say "Pippa is the girl in picture 1 and Pippa
  is the dormouse in picture 2".

### The Proof Story: "{name} Meets Pippa" (part of what you accept)

`meeting-pippa.json`, season "gentle autumn". The text is four paragraphs:

> One golden autumn afternoon, {name} followed a winding path into Moon Berry
> Forest. The leaves glowed honey and rust. Under a big fern, something tiny
> rustled, so {subject} crouched down low to look.
>
> Out peeked Pippa the dormouse, wearing her red acorn cap. "Hello!" she
> squeaked, and hopped onto {name}'s open hand. {Subject} held very still and
> smiled to {reflexive}. {Possessive} new friend weighed no more than a leaf.
>
> Bramble the badger came along with his little lantern. "The softest moss
> grows by the Berry Brook," he said. So they walked there together, and
> {name} touched moss as pale and fine as silver silk. Pippa giggled beside
> {object}.
>
> When the stars came out, {name} curled up on a bed of soft moss, with Pippa
> tucked in close. The lanterns dim, and the forest grows hushed. And
> {subject} drifted gently off to sleep.

| Page | Cast | Place | Time | Scene |
|---|---|---|---|---|
| 1 | {child} | a winding path among the autumn trees | late-afternoon | {name} crouches down low on the path to peek under a big fern, curious, the leaves around {object} glowing honey and rust |
| 2 | {child}, Pippa | beside a big fern among the autumn trees | late-afternoon | {name} kneels and holds out one open hand, and tiny Pippa stands on {possessive} palm, waving hello |
| 3 | {child}, Pippa, Bramble | a mossy rock near the Berry Brook | dusk | {name} kneels at a mossy rock, gently touching moss pale and fine as silver silk, with tiny Pippa sitting on the rock beside {object} and Bramble standing nearby holding his small lantern |
| 4 | {child}, Pippa | a soft bed of moss under the trees | night | {name} sleeps curled up on soft moss, with tiny Pippa asleep tucked in close beside {object} |

The four pages test four different things:
1. **The child alone:** identity.
2. **The child with Pippa on her hand:** scale and touch.
3. **All three references at once.**
4. **Asleep at night:** a lying pose in different light.

The page fields never name the moon.

### Book Pages: Recipes, References and Locks

- **The page template is `PAGE_TEMPLATES` v2, as it is.** In `<cast>`, the
  child is "the boy" or "the girl": "Kennedi is the girl in picture 1 and
  Pippa is the dormouse in picture 2". The page render settings are
  `PAGE_RENDERS` v1.
- **One constructor builds a book page's recipe, and every check rebuilds
  it.** The recipe records:
  - the story's name, the child's id and the page number;
  - the story's slotted-text SHA-256 and its page entry, both unfilled;
  - the child's whole profile;
  - the filled prompt;
  - the template and render versions, and the models;
  - the references, in picture order: each one's kind (child or character),
    its id, and the SHA-256 of its locked sheet.
- **So a page lock fails until it is re-locked on purpose** when any of these
  changes:
  - the child's profile;
  - the child's lock;
  - the story's text or page entry;
  - a canon character's lock.
- **References reach ComfyUI by content,** as in slice 2.
- **`book-page` renders only from sound sheets.** The child and every canon
  member need a locked sheet that passes its lock checks. Each sheet is read
  once, under the lock.
- **The contact sheet shows the references,** with the child's sheet first.
- **The lock and resume rules are the same as for the animals' pages:**
  - a staged copy is validated;
  - a candidate whose bytes changed since its render is refused;
  - the file digests are recorded;
  - a lock replaces only its own files;
  - a set resumes seed by seed;
  - a lost ComfyUI exits cleanly.
- **File names:**
  - each child's drafts and lock under `design-source/children/` are named
    as the animals' sheets are: `<id>-candidate-<seed>.png`,
    `<id>-contact-sheet.png`, `<id>-recipe.json`, `<id>.png` and
    `<id>.recipe.json`;
  - each book page under `design-source/books/<story>/<child>/` is named as
    the animals' pages are: `page-NN...`.
  - A lock is its own page and child. `selftest` fails a recipe whose story,
    child or page number doesn't match its folder and file name.

### Threat Model and Concurrency

The same as slices 1 and 2:
- one operator, on one machine;
- one lock on the storybook root for every write.

The new commands take that same lock.

### Failure Cases

Each case exits before anything is written:
- an unknown child or personal story;
- a profile that fails its check (any rule in the profile table);
- a personal story that fails its check: an unknown slot, a stray brace, a
  page count different from the paragraph count, a bad cast, or no
  `{child}` in any cast;
- a child whose name is also a canon character's name in the story;
- a child, or a canon cast member, with no locked sheet, or with a sheet
  that fails its lock checks;
- a page number outside the plan;
- a seed that wasn't rendered;
- an existing lock without `--force`;
- slice 2's ComfyUI cases: a model or node it can't see, an upload stored
  under another name, ComfyUI unreachable.

### Known Risks, Read at the Real Renders

- **Scale.** Pippa is a tiny dormouse, and Kennedi is a four-year-old. The
  scenes say "tiny", and page 2 puts Pippa on a palm. A Pippa the size of a
  cat is a finding.
- **The face.** In the single pose-test render, Kennedi's face drifted. This
  proof measures it on four pages, at four seeds each.
- **Skin.** The models may lighten Leo's deep brown, or Kennedi's golden
  brown.
- **Glasses** may come and go from page to page.
- **The form doesn't record a face.** Kennedi's sheet is drawn from her form
  answers, so it won't match her workbook drawings exactly. The proof judges
  whether each child matches their own sheet on every page, not whether she
  looks like the workbook.

## Settling Evidence (planned)

- **Tests against the fake ComfyUI:**
  - `child`, then `lock-child`, then `selftest`, end to end, for a girl and a
    boy. The prompts say "young girl" and "young boy". `glasses: true` adds
    ", and round glasses".
  - **The profile check, on both sides of each rule:**
    - **Accepts:**
      - age 2 and age 8;
      - "Mary-Jane" and "D'Andre";
      - a 24-character name;
      - a 200-character phrase.
    - **Refuses:**
      - `child` set to "Boy", "girl " (with a trailing space), "other", "",
        `1`, or missing;
      - age 1, 9, "4", `true` and 4.0;
      - a 25-character name, an empty name, a name with digits, and two
        spaces in a row;
      - a 201-character phrase, a phrase with a newline, and an empty
        phrase;
      - `glasses` set to "yes";
      - an extra key, and a missing key.
  - **The personal story check refuses:**
    - `{they}`, `{}`, `{name:>5}`, `{name!r}`, a stray `{`;
    - `{kid}` in a cast, a cast of four, and no `{child}` in any cast;
    - a child named "Pippa" in a book with Pippa.
  - **Filling:**
    - for a girl: she, her, her, herself;
    - for a boy: he, him, his, himself;
    - the capitalised slots;
    - the proof story's text filled for both children.
  - **`book-page`, then `lock-book-page`, then `selftest`, end to end:**
    - the uploads ComfyUI receives are byte-identical to the child's and the
      animals' locked sheets;
    - the child's sheet is image1.
  - **A book page lock fails `selftest` after each of:**
    - an edited profile;
    - a re-locked child;
    - edited story text;
    - an edited page entry;
    - a re-locked Pippa.
  - **No crossing over:**
    - a canon command refuses a child, and a book command refuses a canon
      name as a child;
    - existing character and page locks rebuild exactly as before;
    - every earlier case still passes.
  - **Mutation testing on the new checks,** as on #151: each check broken on
    purpose must fail a test.
- **`selftest` on the real storybook** passes, with the two profiles, the
  proof story and the existing locks.
- **After your overnight go:**
  - **Night 1:**
    - Pippa's seven pages, already planned (about 3.2 hours);
    - then both children's sheets, two × four seeds (about 13 minutes).
  - **Morning:** your picks for Pippa's pages and for both sheets.
  - **Night 2:** both books, two × four pages × four seeds (about 3.6
    hours).
  - **The consistency read, the proof's real result.** For each child, page
    and seed, check:
    - the child is the same as their sheet: skin tone, hair colour and
      style, eyes, outfit and badge, glasses (Leo), and how old they look;
    - the right size next to Pippa;
    - no extra or missing fingers or limbs;
    - no text in the picture.
  - **The proposed pass bar:** every page of both books has at least one
    seed where all of these hold. A page with none means the generated track
    isn't ready for print as it is. That result goes to the art-track
    decision, which stays yours.

## Not Addressed

- **The order form and its closed option lists:** which skin tones, hair,
  eyes and outfits a parent can choose, and how each one is worded in the
  prompt. These are customer-facing choices, and they are yours.
- **Real orders:** taking them, storing a child's data, and deleting it
  afterwards.
- **Writing personal stories,** by hand or by a model, beyond this proof
  story.
- **Print:**
  - upscaling: the 1328-pixel pages need about twice that for an 8.5-inch
    page at 300 dpi;
  - layout, trim size and the PDF;
  - a printed test copy, which costs money and needs your go.
- **The free daily ebook:** the reader, the email, and wiring to
  `bedtime_broadcast`.
- **Rendering a whole book in one command,** and a combined consistency sheet
  for a book.
- #145, #146 and #152.

## Contract Amendments

1. **The child sheet template is written as sentences** (found while
   building, before any render). The accepted wording listed the look as
   "with `<skin>`, `<hair>` and `<eyes>`". With Kennedi's profile, which has
   the longest hair phrase, that printed:

   > …each tied with a small round red hair tie and big round dark eyes with
   > long curled eyelashes, wearing…

   This reads as a hair tie with eyes. v1 now gives the look its own
   sentences:

   > She has [skin], [eyes], and [hair]. She is wearing [outfit].

   The long hair phrase ends its sentence, and "He" or "She" comes from
   the same pronoun table as the text. No lock exists yet, so v1 is still
   unpublished, and nothing is versioned.

## Verification

From tool output on 2026-10-05, at `ad6e69a`.

- **`test-story-recipe.py`:** 187 of 187 checks pass on Python 3.13 with
  Pillow 11.3, and on 3.12 with Pillow 10.2.
  - Every Settling Evidence case listed above is covered, plus one more:
    Leo's sheet saved as Kennedi's lock fails `selftest`.
  - Every earlier case still passes.
- **Mutation testing: all 30 deliberately broken copies of the new checks
  fail the suite.** The first round found one gap: nothing caught a child's
  lock saved under another child's name. The child-lock identity test was
  added for it.
- **`selftest` on the real storybook:**
  - 3 character locks, 1 story and 0 page locks;
  - 2 children, 0 child locks, 1 personal story and 0 book page locks;
  - 0 problems.
- **The real prompts were printed from the tool before commit.** That is how
  amendment 1 was found. For example, Leo's sheet reads:

  > A single young boy, about 5 years old, standing in a relaxed
  > three-quarter view. He has deep brown skin with warm undertones, dark
  > brown eyes, and short black curly hair. He is wearing a mustard-yellow
  > knit sweater, navy blue shorts, white socks and green sneakers, and round
  > glasses.

  Page 3 for Kennedi reads:

  > Kennedi is the girl in picture 1, Pippa is the dormouse in picture 2 and
  > Bramble is the badger in picture 3, each drawn exactly as in their
  > picture. Kennedi kneels at a mossy rock, … with tiny Pippa sitting on the
  > rock beside her…

- **Still open:** the overnight renders and your consistency read, the
  proof's actual result.
