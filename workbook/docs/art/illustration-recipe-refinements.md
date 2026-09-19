# Illustration recipe: refinements to add later

Running list for `tools/illustration-recipe.py`. Nothing here blocks building
characters today; each item says what it would fix.

## Print quality
- **Print row on every contact sheet.** Picks should be judged from the
  vectorized version, not the raw PNG. Today that's a manual step. `candidates`
  should vectorize each seed and add a second "print" row.
- **Flag black blobs automatically.** Grey inner ears, pads and ground shadows
  threshold into solid black shapes (bunny seeds 61 and 94, the puppy's ground
  shadow). Measure large filled regions after thresholding and label risky seeds.
- **Dark-bodied animals print as solid black.** Penguin seeds 61, 83 and 94
  have black backs and heads that threshold into large solid fills, which
  leaves nothing to color. Needs a decision per book: allow it, or add an
  "outline-only, white body" variant of the animal template (seed 72's white
  chick shows FLUX can do it).
- **Ground shadows recur.** Seen again on turtle seeds 72/83 and bear seeds
  61/72/83 (plus black paw pads). A "no ground shadow" template version would
  remove most of the black-blob risk.
- **"no color" isn't always obeyed.** Penguin seed 61 came back with an orange
  beak and feet. Thresholding hides it in print, but the raw PNGs shouldn't be
  used anywhere color matters without checking.
- **Line-weight check.** Seed 83 of the bunny printed thinner than the puppy.
  Measure stroke width on the vectorized result and compare it against the
  locked puppy, so a set stays visually even.

## Recipe and templates
- **Version the templates.** The prompt text *is* the recipe, so any wording
  change (e.g. adding "no ground shadow") must be a new template version, never
  an edit, or old assets stop being reproducible from the template.
- **The apple's older object wording.** `objects/locked/apple.png` predates the
  Book 2 object template. `reproduce` still covers it (it reads the PNG's own
  graph); add it as a named legacy template if new objects should match it.
- **Record model fingerprints.** The manifest records model file names and the
  ComfyUI version (0.25.0), not file hashes. Bit-exact reproduction was verified
  on this machine; recording sizes/hashes would make a mismatch detectable
  elsewhere. A ComfyUI upgrade may also change output.
- **Backfill recipes for the older locked art.** `selftest` checks every asset
  that has a `.recipe.json`. 39 locked PNGs were made before the tool, so they
  are only counted: the puppy poses, the dog, the letter animals and the
  objects. Each of them still has its graph embedded, so `reproduce` works
  on them. Writing a recipe for each (prompt, seed, graph) would bring them
  under `selftest` too.
- **More poses of one character.** `lock` names assets `<name>-01-<pose>`. A
  second pose needs `-02-`, and should come from FLUX Redux on the locked image
  (same-subject only), not a new text prompt.

## Color versions (Mode A)
- **`colorize` is built** (`illustration-recipe.py colorize`, then
  `lock --color`). The bunny was first: seed 72 is locked as
  `bunny-01-sitting-color.png`.
- **Blurry color renders: fixed in recipe v2.** Recipe v1 blurred the guide
  1.5 px, and the ControlNet copied that softness. Most seeds came out soft
  with no outline: 3 of 4 for the bunny, bear and turtle, and 4 of 4 for the
  penguin.
  - Stronger outline wording did nothing. It changed each seed by only
    1.5-3.3/255 on average.
  - Removing only the blur took penguin seed 83's edge sharpness from 2.4
    to 134.7.
  - With v2, the default, all 4 penguin seeds were crisp.

  The bunny, bear and turtle stay on v1 so they keep rebuilding exactly.
  Re-colouring them on v2 would give crisper versions, but only by
  replacing the locked assets.
- **Fur colour is a per-character choice.** The bunny is white with pink
  details, which is light next to the warm cover. Pick each character's
  colours on purpose, so a set of color characters reads as one palette.

## Plumbing
- **`comfy-generate.py` defaults.** It hardcodes port 8188 and defaults to 24
  steps, while the recipe uses 28. Calling it directly silently makes
  non-matching art. Align the default or route everything through the recipe.
- **Provenance in one place.** Each locked asset now carries a
  `.recipe.json`; `docs/art/asset-provenance.md` is written by hand. Generate
  the doc's asset table from the recipe files.
- **Reproduce as a periodic check.** `reproduce` needs the GPU, so it can't run
  in CI. Run it on a sample of locked assets before a print run.
- **ComfyUI launch.** `~/Desktop/ComfyUI-master/preflight_render.sh` still
  checks GPU index 1 from when the machine had two cards; the 3090 is index 0.
