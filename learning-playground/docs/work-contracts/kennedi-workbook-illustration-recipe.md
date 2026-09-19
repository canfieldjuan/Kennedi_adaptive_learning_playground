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
  bunny, turtle, bear and penguin candidates and locks. As amended below,
  also the color candidates, guides and locks of the bunny, bear, turtle,
  penguin and fox; the fox's line-art candidates and lock; and
  `design-source/legacy-locked-assets.json`.
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

Resolved by recipe v2, and not in the way expected here. The cause was the
guide blur, not the wording; see the correction amendment below.

## Contract Amendments

Both amendments were found while building. Each tightens a failure case and
does not change scope.

- **Guide fingerprint.** When ComfyUI saves a graph into a PNG, it stamps the
  image-loading node with `is_changed`, which is the SHA-256 of the guide it
  loaded. For the locked color bunny, that value equals the committed guide's
  hash.
  - `selftest` now requires the committed guide to match that fingerprint.
  - `reproduce` refuses to re-render when the guide differs, because a
    different guide would silently produce a different image.
  - `selftest` compares graphs with that ComfyUI-added key removed.
- **Line art outside the workbook.** `colorize` now refuses line art from
  outside `workbook/` before rendering. The manifest records paths relative
  to the workbook, and the old code only found out after rendering all four
  seeds.

- **Color template v2** (added after the bunny, bear and turtle locks):
  - The v1 wording ("clean bold outlines") gave soft, near-outline-less
    renders on 3 of 4 seeds for the bunny, the bear and the turtle. On the
    penguin all 4 seeds were soft; the operator judged the penguin
    "blurry".
  - The cause is the outline wording, which applies to every character, so
    the fix is a new template version, not re-rolling seeds.
  - Behaviour:
    - `COLOR_TEMPLATES` holds `v1` unchanged, plus `v2`. `v2` replaces
      "clean bold outlines" with the black-and-white recipe's proven phrase
      ("confident clean bold black outline of uniform thickness") and asks
      for crisp edges that are not faint or blurry.
    - `colorize --template {v1,v2}` defaults to `v2`, and the manifest
      records `template_version`.
  - Invariant: the existing color locks (bunny, bear, turtle) stay on
    `v1` and still rebuild from it, and `selftest` keeps checking the `v1`
    bunny.
  - Settling evidence: the penguin re-run on `v2`, judged by the operator
    on the contact sheet.
- **Correction to the v2 amendment above: the wording was not the cause.**
  - The penguin re-run with the stronger wording barely changed: each seed
    moved by 1.5-3.3/255 on average, and edge sharpness stayed at 2-4.
    Sharp locks score 13-19.
  - One factor at a time on penguin seed 83 found the real cause, the 1.5 px
    blur on the guide. Without the blur, sharpness rose from 2.4 to 134.7,
    with crisp edges and no artifacts. ControlNet strength 0.5, an end of
    0.5, or both, left it at 2.4-2.5.
  - v2 is therefore a *recipe* version, not a template version. It keeps v1's
    wording and ControlNet settings and stops blurring the guide.
    `colorize --recipe {v1,v2}` defaults to `v2`, and the manifest records
    `recipe_version` and the guide recipe. The wording change is dropped.
  - Invariant check: the v1 recipe regenerates the committed bunny, bear and
    turtle guides byte for byte, so those locks are untouched. Manifests
    written before versioning are v1, and their `guide_recipe` records the
    1.5 px blur.

- **`selftest` checks every locked recipe.** Added at the operator's request
  after the penguin lock. Until now each lock was checked by a one-off
  snippet, because `selftest` only knew three hard-coded assets.
  - `selftest` finds every `*.recipe.json` in the locked folders and checks
    each asset:
    - the PNG is present, and for line art so is the SVG;
    - the manifest's template equals the tool's current template for that
      kind, since templates must never be edited;
    - the template and fields rebuild the embedded prompt;
    - the embedded seed and steps match the recipe;
    - the embedded graph equals the graph the tool builds.
  - Color assets also get guide checks:
    - the committed guide matches the SHA-256 fingerprint in the PNG;
    - the recorded recipe version regenerates that guide byte for byte
      from the source line art. Unrecorded means `v1`.
  - The dog and the house stay as the template checks for assets made
    before the tool. Locked PNGs without a recipe are counted and reported,
    not checked.
  - Any problem prints a `FAIL` line with its reasons, and `selftest` exits 1.
  - Needs no ComfyUI and no GPU.
  - Settling evidence: all 8 recipe assets pass. Tampered copies each fail
    with the right reason: changed fields, an edited template, the wrong
    seed, a different guide, the wrong recipe version, a missing SVG, and a
    missing PNG.

- **The fox: a new character as the end-to-end test.** Added at the
  operator's request, after PR #138 opened, to see whether the tool can make
  a new character. The scope grows to include the fox's drafts and locks
  under `design-source/animals/`.
  - The fox was made with `candidates`, then `lock` on seed 94, then
    `colorize` with recipe v2, then `lock --color` on seed 94. The operator
    picked both seeds.
  - Settling evidence: `selftest` passes `fox-01-sitting` and
    `fox-01-sitting-color`.

- **PR #138 review round 1** (Codex on `deda041`, nine findings, all
  confirmed). They fall into three classes, and each class is closed across
  every command in one pass, not finding by finding.
  - **A. Locked assets are immutable and self-contained.**
    - Each lock owns its guide. `lock --color` copies the exact draft guide
      to `locked-poses/<stem>-guide.png` and records that path. Before this,
      locks pointed at `drafts/<name>-color-guide.png`, and the next
      `colorize` run rewrote it.
    - The five existing color locks are migrated to guide copies. The bytes
      are the same, so the fingerprints are unchanged.
    - `lock` builds every output in a temporary directory inside the locked
      folder, and moves them into place only after every step has
      succeeded. A failed vectorizer or manifest write under `--force`
      leaves the previous lock set untouched.
    - `reproduce` writes by default to the kind's `drafts/`, never beside the
      locked asset. It refuses an `--out` that is the same file as its
      source PNG or its guide, compared by resolved path or, for existing
      files, device and inode. This is the input-overwrite class from PR
      #136, which this tool had not been swept for.
  - **B. Checks fail closed.**
    - `reproduce` compares full RGB(A) values. Greyscale is used only for
      the print-ink line.
    - A guided node whose `is_changed` fingerprint is missing or malformed
      fails `check_guide`.
    - `check_locked` compares the embedded steps with the manifest's
      `steps`, and separately with the tool's `STEPS`.
    - `reproduce` of a PNG whose graph loads an image requires a sibling
      recipe that names its guide. Otherwise it exits before queueing, so it
      never renders with a stale guide left on the server.
  - **C. Packaging.** The docstring names NumPy as well as Pillow, and the
    script is executable like the other `workbook/tools` scripts.
  - Settling evidence:
    - each fix has a probe that fails before the fix and passes after;
    - `selftest` passes every recipe after the guide migration;
    - `reproduce` keeps its 0-difference result, re-checked in RGB.
    
    The existing color bunny and penguin re-renders were already re-checked
    in RGB on the CPU: 0 of 1,048,576 pixels differ, max channel
    difference 0.

- **PR #138 review round 2** (Codex on `34768a8`, three findings, all
  confirmed). Two are gaps in classes that round 1 was meant to close, so
  this time each class is closed at its single enforcement point.
  - **B, continued: every file in a locked folder is accounted for.**
    `selftest` fails any PNG in a locked folder that is not one of these:
    - a recipe-managed asset;
    - a guide referenced by a recipe in that folder;
    - an entry in `design-source/legacy-locked-assets.json`, the 39
      pre-tool PNGs.

    Before this, a managed asset whose recipe was deleted fell silently into
    the legacy count. A missing baseline file also fails.
  - **A, continued: one validator for "this PNG is the render its recipe
    describes".** `embedded_problems()` checks the template, the prompt,
    the seed and steps, the graph, and for color the guide fingerprint. It
    is used by `selftest` on locked assets and by `lock` on the candidate
    before anything is staged, so a stale or mismatched candidate can't be
    locked. It replaces round 1's guide-only check in `lock`.
  - **Scope and traceability.** Correct Fix Must Touch covers the color
    drafts, guides and locks of the bunny, bear, turtle, penguin and fox,
    and the fox's line art (its own amendment above). The audit's
    traceability names each group.
  - Settling evidence: probes for a deleted recipe, an orphan guide, a
    missing baseline, and a mismatched candidate at lock time; `selftest`
    passes on the real workbook.

- **PR #138 review round 3** (Codex on `d95df1e`, five findings, all
  confirmed). Three classes again, and each is closed at one enforcement
  point.
  - **A. Every name the tool builds a path from is validated.**
    `--locked-name /tmp/report` was accepted as a stem, so `locked / stem`
    escaped the workbook and `--force` overwrote an unrelated file. The same
    hole put a comma in `shark-01-swimming,.png`, because the lock stem
    takes the first word of the pose verbatim.
    - `safe_name()` accepts only lowercase letters, digits and hyphens.
    - It guards the character name, `--locked-name`, and the word taken from
      the pose, which is stripped of punctuation first.
  - **B. The locked state is complete and consistent.**
    - `locked_folders()` covers every locked root, including
      `boss-kennedi/locked-poses`, which `reproduce` previously treated as
      an ordinary folder and wrote into. Its 8 PNGs join the baseline.
    - `account_locked_pngs()` fails for a baseline entry whose file is gone,
      not just for files that are not on the baseline.
    - `lock --force` refuses to replace line art that a color recipe names
      as its source, because the color guide is rebuilt from that line art
      and would no longer match. The message names the dependent locks.
  - **C. Guided art locked before the tool can still be reproduced.**
    The puppy poses 02-04 are Redux renders whose reference image is
    `01-sitting.png`; their embedded fingerprints match that file. They had
    no recipe, so the fail-closed guide rule blocked `reproduce` on them.
    - `backfill --guide PATH` records a guide for such an asset, after
      checking it against the embedded fingerprint.
    - `upload()` handles a graph that names its image inside a subfolder,
      which these graphs do.
    - Any recipe with a guide has that guide fingerprint-checked, not only
      color locks.
  - Settling evidence: probes for each refusal, the three puppy poses
    backfilled and checked, and `selftest` passing with the wider baseline.

## Cold Diff Audit

### Gaps

- change without contract trace: none.
- contract requirement not delivered: none.
- protected surface touched: none. The implementation commit touches only
  `workbook/tools/illustration-recipe.py`,
  `workbook/docs/art/illustration-recipe-refinements.md`, the bunny color
  files under `workbook/design-source/animals/` and this contract.

### Change By Change Reconstruction

`illustration-recipe.py`:
- `:57-69`: `COLOR_TEMPLATE` (the cover's Mode A wording), the color recipe
  versions (`COLOR_RECIPES`: `v1` blurs the guide 1.5 px, `v2` doesn't;
  default `v2`), the guide threshold, the ControlNet strength and end, and
  the model name.
- `:71-73` `LEGACY_BASELINE`: the path of the pre-tool PNG list.
- `:75-83` `LEGACY_TEMPLATE_CHECKS`: template checks for the dog and the
  house, which were locked before recipes existed.
- `:95-105` `upload()`: a multipart upload to ComfyUI. It exits if ComfyUI
  stores the file under another name or in a subfolder.
- `:108-131` `without_cache_keys()`, `check_guide()`, `file_identity()` and
  `locked_folders()`:
  - `check_guide()` passes only when every guided node's `is_changed`
    equals the guide's SHA-256. A missing or malformed fingerprint fails.
  - `file_identity()` is the resolved path, or the device and inode for a
    file that exists.
- `:155-175` `color_graph()`: the soft-edge ControlNet graph. It is
  identical, node for node, to the graph embedded in the seed-72 PNG.
- `:178-182` `make_guide()`: the locked art's print lines as white on black,
  blurred only when the recipe says so.
- `:185-191` `contact_sheet()`: the existing sheet code, moved into a helper
  that `candidates` (`:216`) and `colorize` (`:259`) share. The layout is
  unchanged: 480 px tiles with a label strip.
- `:227-274` `cmd_colorize()`:
  - Exits unless the line art is inside the workbook, has a
    `.recipe.json`, is an animal, and the ControlNet is visible.
  - Builds the guide with the chosen recipe's blur (`:248`), uploads it,
    renders the four seeds, and writes the
    contact sheet (line art first) and the manifest.
- `:277-326` `cmd_lock()`:
  - Refuses a missing candidate. Refuses one that `embedded_problems()`
    says is not its recipe's render at that seed (`:297-305`), before
    staging anything.
  - Stages the whole lock set in a `.lock-*` temporary folder inside the
    locked folder, then moves it into place with `os.replace`, recipe last.
  - `--color`:
    - reads `<name>-color-recipe.json`;
    - names the lock `<line-art-stem>-color`;
    - the draft guide must pass the candidate's fingerprint, which is
      part of the same check;
    - copies that guide into the lock as `<stem>-guide.png`, and records
      that path.
  - It skips vectorizing for color (`:318`).
- `:329-368` `cmd_reproduce()`:
  - A graph that loads an image needs a sibling recipe naming its guide
    (`:336-338`).
  - The guide must exist and match its fingerprint.
  - The output defaults to the kind's `drafts/`. It is refused if it sits
    inside a locked folder, or is the same file as the source or the guide
    (`:345-353`).
  - Only then does it upload the guide, render, and compare full RGBA,
    with greyscale used only for the print-ink line.
- `:371-403` `embedded_graph()` and `embedded_problems()`: the one
  validator for "this PNG is the render its recipe describes at this seed".
  It checks the template, the prompt, the seed and steps (against the
  recipe, then against the tool), the graph, and for color the guide
  fingerprint. `lock` and `check_locked()` both use it.
- `:406-429` `check_locked()`: `embedded_problems()` on the locked asset,
  plus the SVG for line art. For color it also needs the guide to live in
  the lock folder (`:418-419`), and to rebuild byte for byte from the
  recorded recipe version (`:422-428`).
- `:432-447` `account_locked_pngs()`: every PNG in a locked folder must be
  recipe-managed, a guide some recipe names, or on the legacy baseline. It
  returns the unaccounted PNGs, the legacy count, and whether the baseline
  exists.
- `:450-474` `cmd_selftest()`:
  - runs the two legacy template checks;
  - runs `check_locked()` on every `*.recipe.json` in the locked folders;
  - fails a missing baseline and every unaccounted PNG, and counts the
    legacy ones;
  - exits 1 on any failure.
- `:488-499`: the `colorize` subcommand (with `--recipe`) and the
  `lock --color` flag.

Other files:
- `design-source/animals/drafts/bunny-color-*`: the four candidates, the
  guide, the contact sheet and the manifest, all written by the tool.
- `design-source/animals/locked-poses/bunny-01-sitting-color.{png,recipe.json}`:
  the lock of seed 72.
- `illustration-recipe-refinements.md`: marks colorize as built, and adds
  the v2 outline-wording item and the per-character colour note.

### Contract Traceability

- `illustration-recipe.py`: Correct Fix Must Touch (the new colorize
  pieces), plus the two amendments.
- `design-source/animals/` drafts and locks: Correct Fix Must Touch, as
  amended.
  - Line art: bunny, turtle, bear and penguin (original scope); fox (fox
    amendment).
  - Color drafts, guides and locks: bunny (original scope); bear, turtle,
    penguin and fox (round-2 scope amendment). Guide copies came in round 1.
- `design-source/legacy-locked-assets.json`: round 2, B continued. It lists
  the 39 pre-tool locked PNGs, generated from the locked folders minus
  recipe-managed assets and referenced guides.
- The refinements doc: Correct Fix Must Touch.
- This file: Correct Fix Must Touch (contract).

### Verification

Renders ran on ComfyUI 0.25.0 at `:8189`, with FLUX.1-dev Q8 and
Union-Pro 2.0.

- **Settling evidence 1:** `colorize` run through the tool reproduced the
  exploratory run of the same bunny. All four seeds had 0 differing pixels,
  and the guide was byte-identical.
- **Settling evidence 2:** `lock animal bunny --seed 72 --color`, then
  `selftest` printed `OK` for the dog, the house and the color bunny.
- **Settling evidence 3:** `reproduce` on the locked color bunny printed
  `pixels differing: 0.000% | max diff 0`.
- **Failure cases:** each exits 1 before rendering, with the ComfyUI queue
  empty and no output file written:
  - locking seed 50;
  - locking again over the existing color lock without `--force`;
  - `lock --color` for an object;
  - `colorize` on line art with no recipe (the dog);
  - `colorize` on an object;
  - `colorize` on line art outside the workbook;
  - `reproduce` with a different guide file;
  - `reproduce` with the guide missing.
- **Not run:** `candidates` and the line-art `lock` were not re-rendered. Their
  code changed only by the `contact_sheet()` extraction and the `lock`
  branching, and the line-art path through both is unchanged. `selftest`
  still passes for the dog and the house.
- **`selftest` over every recipe** (no ComfyUI or GPU needed):
  - Real assets: it passes all 8 locked recipes and the 2 legacy template
    checks, and reports the 39 locked PNGs that have no recipe.
  - Tampered copies run through `check_locked()`. Each fails with the right
    reason:
    - changed colors;
    - edited template text;
    - the wrong seed;
    - a different guide;
    - a v2 asset recorded as v1, and a v1 asset recorded as v2;
    - a missing SVG;
    - a missing PNG;
    - the tool's own template edited in code.
  - Untouched copies pass.
  - Run in-process with the color template edited in memory, all four color
    recipes fail, the line art still passes, and it exits 1.
- **PR #138 review round 1.**
  - 22 of 22 probes pass, run against a scratch copy of the workbook with
    mocked failures, so no GPU was used:
    - a failing vectorizer under `lock --force` leaves the old lock set
      byte-identical and no staging folder;
    - a successful `--force` replaces the set;
    - `lock --color` owns a byte-identical guide copy, survives the draft
      guide being rewritten, and refuses a mismatched draft guide;
    - missing and malformed fingerprints fail;
    - recipe steps 29 against embedded 28 fails;
    - a guide outside the lock folder fails;
    - `reproduce` refuses `--out` as the source, a symlink to it, or the
      guide, and refuses a guided PNG with no recipe;
    - an RGB change that keeps brightness (the greyscale of both blocks
      was 76) is caught;
    - identical renders report 0, and default output goes to `drafts/`.
  - Real workbook: before the guide migration, `selftest` failed exactly the
    five color locks with "outside the lock folder". After it, all recipes
    pass.
- **PR #138 review round 2.**
  - 30 of 30 probes pass: the 22 above plus 8 new ones.
    - `lock` refuses a candidate that is another seed's re-render
      (embedded 72 against recipe 61), and leaves the lock untouched.
    - It refuses a candidate whose manifest changed after it rendered, and
      a missing candidate.
    - With a baseline, everything is accounted for.
    - A managed PNG whose recipe is deleted becomes unaccounted.
    - A deleted color recipe leaves its PNG and guide unaccounted.
    - A missing baseline is reported.
  - Real workbook:
    - With no baseline file, `selftest` fails: the missing file plus the
      39 pre-tool PNGs.
    - With the generated baseline, it passes: every recipe OK, and 39
      legacy PNGs listed.
