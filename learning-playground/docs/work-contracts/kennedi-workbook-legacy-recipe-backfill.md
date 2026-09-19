# Kennedi Workbook: Recipes for the Pre-Tool Locked Art

Branch `feat/alphabet-characters`. Follows the illustration recipe contract
(`kennedi-workbook-illustration-recipe.md`), which introduced recipes,
`selftest` and `colorize`.

## Before Code

### Root Cause

39 locked PNGs were made before the recipe tool existed. They carry their
ComfyUI graph inside the PNG, so `reproduce` can rebuild them, but they have
no `.recipe.json`. That has two consequences:

- `selftest` can only count them, not check them. They sit on a baseline
  list instead.
- `colorize` refuses them, because it reads the subject and pose from the
  recipe. So the alphabet animals already in the book (C, D, E, G, J, L, O,
  Q, W, Z) cannot get Mode A color versions.

The operator asked for recipes to be added to this art rather than the art
being remade, so the book keeps the characters it already has.

### What the art actually is

Their prompts were written before the templates existed. Six of the ten
(dog, elephant, giraffe, jellyfish, lion, owl, whale) match the current
animal template exactly. Four do not:

- `cat-01-sleeping`: "closed peaceful eyes" in place of "big round
  expressive eyes";
- `zebra-01-standing` and `bird-01-perched`: "expressive eye", singular;
- `queen-01-standing`: an added clause, "wearing a simple crown and a
  flowing robe".

A template that covered all of them would no longer be the recipe for
anything, so these assets record their prompt verbatim instead.

### Correct Fix Must Touch

- `workbook/tools/illustration-recipe.py`:
  - a `backfill` command that writes a recipe for a locked PNG from the
    graph embedded in it, plus the subject and pose the operator gives it;
  - `check_locked` accepts a recipe with no template: it then checks the
    recorded prompt against the embedded one, and everything else as usual;
  - `colorize` accepts these assets, since it needs only the subject and
    pose.
- `workbook/design-source/animals/locked-poses/*.recipe.json`: the new
  recipes.
- `workbook/design-source/legacy-locked-assets.json`: shrinks as assets
  become recipe-managed.
- This contract.

### Must Not Change

- The locked PNGs and SVGs themselves. This slice adds recipes beside the
  art; it does not re-render it.
- The templates and color recipes.
- `workbook/src/**` and `dist/**`. The pages keep using the same files.

## Behaviour

- `backfill LOCKED.png --subject S --pose P`:
  - refuses a PNG that already has a recipe, or one with no embedded graph;
  - reads the prompt, seed and steps from the graph;
  - writes `<stem>.recipe.json` with: `kind` (`animal` or `object`), the
    name, `template: null`, `fields` (subject and pose), the verbatim
    `prompt`, the seed as both `seeds` and `chosen_seed`, `steps`, `size`,
    the graph, and `source: "rendered before the recipe tool"`;
  - when the prompt does match the current template for its kind, it records
    the template and the full fields instead, so the asset is fully
    template-derived.
- `check_locked` with `template: null`: checks the PNG exists, the recorded
  prompt equals the embedded one, the seed and steps match, the graph is the
  one the tool builds for that prompt, and the SVG exists. It cannot check
  the template, and does not pretend to.
- Invariant: a backfilled asset must be byte-identical to what it was. The
  slice only writes `.recipe.json` files.

## Settling Evidence (planned)

- `selftest` passes with the 10 new recipes, and the legacy baseline shrinks
  by 10 to 29.
- Every backfilled PNG and SVG is byte-identical before and after
  (`git status` shows only added recipes).
- A probe: `backfill` refuses an asset that already has a recipe, and one
  with no embedded graph.
- A probe: a recipe whose recorded prompt is edited fails `selftest`.

## Cold Diff Audit

### Gaps

- change without contract trace: none.
- contract requirement not delivered: none. The objects and the remaining
  animals (bird, the three extra puppy poses) are not backfilled yet; the
  contract's scope is the ten alphabet animals the operator asked for, and
  `backfill` works on any of the rest when wanted.
- protected surface touched: none. No PNG or SVG changed; `git status`
  shows only added `.recipe.json` files and the shrunken baseline.

### Change By Change Reconstruction

- `illustration-recipe.py:279-316` `cmd_backfill()`:
  - refuses a PNG outside the locked folders, one that already has a
    recipe, and one with no embedded graph;
  - reads the prompt, seed, steps and size from the embedded graph;
  - with `--shading` and `--accent`, records the template and full fields,
    and refuses fields the template can't rebuild the prompt from;
  - otherwise records `template: null` with the subject and pose;
  - checks the manifest against the PNG before writing it;
  - removes the asset from the legacy baseline, which therefore only
    shrinks.
- `illustration-recipe.py:421-451` `embedded_problems()`: the recorded
  prompt must equal the embedded one for every recipe. The template checks
  run only when a template is recorded (`:429`).
- `illustration-recipe.py:453-460` `check_locked()` and `:462-...`
  `check_locked_manifest()`: the checks split out so `backfill` can validate
  a manifest it hasn't written yet. The guide-ownership check only applies
  when a lock folder is known.
- `illustration-recipe.py:539-545`: the `backfill` subcommand.
- `design-source/animals/locked-poses/*.recipe.json`: ten new recipes. Eight
  are template-derived (dog, elephant, giraffe, jellyfish, lion, owl, queen,
  whale); the cat and zebra record their prompt as written.
- `design-source/legacy-locked-assets.json`: 39 entries down to 29.

### Contract Traceability

- `illustration-recipe.py`: Correct Fix Must Touch (backfill, template-less
  recipes).
- The ten recipes and the baseline: Correct Fix Must Touch.
- This file: Correct Fix Must Touch.

### Verification

- `selftest` passes: every recipe OK, including the ten new ones, and 29
  legacy PNGs remain.
- No art changed: `git status` lists only added recipes and the baseline.
- 10 of 10 probes pass against a scratch copy of the workbook:
  - `backfill` refuses art that already has a recipe, a PNG with no
    embedded graph, a path outside the locked folders, and fields the
    template can't rebuild the prompt from;
  - a template-derived backfill records the template, removes the baseline
    entry, and checks out;
  - an edited recorded prompt fails with "its recorded prompt is not the
    one embedded in the PNG";
  - the cat records no template and still checks out.
- Not run: no re-render. `reproduce` on a backfilled asset needs the GPU and
  was not part of this slice.
