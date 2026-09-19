# Kennedi Workbook: Reproducible Illustration Recipe

Branch `feat/illustration-recipe`. The recipe tool (`63c82f5`) and the
turtle, bear and penguin (`b7de2d2`) were committed before this contract
existed; the Before Code sections record the scope they were built to. The
color step (`colorize`) is new work and is built to this contract. The
operator accepted its scope ("lock seed 72, add colorize so the other
characters use the same method") before the contract was written.

## Before Code

### Root Cause

Workbook art was made with one-off FLUX prompts, and nothing recorded how a
locked asset was made. New characters drifted from the established style, and
a locked asset could not be rebuilt or extended. Color versions for Mode A
(cover, certificates, promo) had no method at all. A fresh text prompt draws
a different animal, so a color character would not match its black-and-white
page version.

### Correct Fix Must Touch

- `workbook/tools/illustration-recipe.py`:
  - Existing: prompt templates, the fixed seeds, `candidates`, `lock`,
    `reproduce` and `selftest`.
  - New:
    - `colorize` renders Mode A color candidates, using the locked line art
      as a soft-edge ControlNet guide.
    - `lock --color` locks a color pick.
    - `reproduce` uploads a color asset's guide image before re-rendering.
    - `selftest` covers the color template.
- `workbook/design-source/animals/drafts/` and `.../locked-poses/`: the
  bunny, turtle, bear and penguin candidates and locks, and the bunny color
  candidates, guide and lock.
- `workbook/docs/art/illustration-recipe-refinements.md`: the running list of
  deferred improvements.
- This contract.

### Must Not Change

- `workbook/tools/comfy-generate.py`, `comfy-generate-redux.py` and
  `vectorize-line-art.sh`. The recipe loads and calls them; it does not edit
  them.
- Existing locked assets (dog, house, apple, Boss Kennedi). They are read
  only, by `selftest` and `reproduce`.
- `workbook/src/**`, `workbook/dist/**`, the page files and
  `docs/design-system.md`. No page uses the new characters yet.

## Behaviour (colorize)

- `colorize LOCKED.png --colors "<fur and feature colors>"`:
  - Reads subject and pose from `LOCKED.recipe.json`.
  - Builds the guide in `drafts/`: pixels darker than 180 grey (the print
    vectorizer's threshold) become white lines on black, blurred by 1.5 px.
  - Renders the four standard seeds with the `animal-color` template, at
    ControlNet strength 0.7 ending at 0.8, over 28 steps.
  - Writes the candidates, a contact sheet (the locked line art first) and
    `<name>-color-recipe.json`.
- `lock animal <name> --seed N --color`:
  - Copies the chosen candidate to `locked-poses/<line-art-stem>-color.png`.
  - Writes `<line-art-stem>-color.recipe.json`, recording the guide path.
  - Does not vectorize, because Mode A art is used as a raster.
- `reproduce`: when the embedded graph loads an image, it uploads the guide
  named in the sibling `.recipe.json` under the name the graph expects, and
  then re-renders.
- Invariants:
  - The template text is the recipe. The `animal-color` template must
    rebuild the locked color bunny's prompt character for character.
  - The graph the tool builds must equal the one embedded in that PNG,
    apart from the output filename prefix.
- Failure cases, each exiting with a message before any render:
  - no `.recipe.json` next to the locked line art;
  - the ControlNet model not visible to ComfyUI;
  - locking a seed that wasn't rendered;
  - an existing locked color asset without `--force`;
  - `reproduce` of a guided asset whose guide file is missing.
- Concurrency: one operator, and ComfyUI runs its queue in order. The tool
  queues its seeds and polls each one, so no two invocations are expected to
  run at once.

## Settling Evidence (planned)

- `selftest` passes for the dog, the house and the locked color bunny.
- `colorize` on the bunny, run through the tool, reproduces the seed-72 pick
  (made by the exploratory script) with 0 differing pixels.
- `reproduce` on the locked color bunny reports 0 differing pixels.

## Known Limitation

The v1 color template gave faint, outline-less results on 3 of 4 bunny seeds
(61, 83 and 94). Stronger outline wording would be a template v2. Changing v1
would stop the locked color bunny rebuilding from its template, so v2 is left
to the refinements list.

## Contract Amendments

## Cold Diff Audit
