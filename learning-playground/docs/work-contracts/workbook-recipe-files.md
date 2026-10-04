# Change Contract: workbook recipe files

## Before Code

### Root Cause
The counting CLI accepts seed/mode/output only; alphabet and numbers accept
output only. Content is generated in JavaScript, so an accepted workbook
cannot yet be supplied as a standalone data recipe. The owner requested
recipe-file support first, explicitly deferring model-runtime selection.
This is an additive authoring feature, not a broken print layout.

### Correct Fix Must Touch
- Add a versioned JSON recipe/schema and validator/resolver for the existing
  alphabet, numbers and counting templates. No executable recipe content or
  arbitrary artwork paths; animal names resolve through the tracked catalog.
- Counting recipes may select seed/mode or explicit animal/count groups,
  optionally supplying three distinct correct-once choices. Missing choices
  are generated deterministically; resolved output records exact choices.
- Share the existing counting selection/pagination logic with a custom-group
  factory. Keep default seeded output unchanged and retain guided mode.
- Add a thin recipe CLI dispatching fixed existing generators without shell
  interpolation; include validate/catalog commands. Existing commands stay
  supported. No rebuild of the alphabet/numbers curricula or page renderers.
- Accept --recipe directly in the counting CLI, reject conflicting seed/mode
  flags, export a replayable recipe, preserve existing full-pack verification
  and verify custom groups against their exact recipe content.
- Save resolved recipes with template version, exact groups, artwork hashes
  and renderer-source fingerprint. Refuse locked replay if content, selected
  art or renderer inputs have changed. Record current render environment;
  PDF metadata need not be byte-identical, while page content must match.
- Add examples for all three templates, schema/recipe tests and CLI boundary
  probes; update README, package scripts and only the new output ignore entry.
- Export and rasterize custom counting proof, replay it, compare rendered
  content/rasters, and exercise alphabet/numbers/default counting recipes.
  Finish a cold diff audit and local commit, retaining durable evidence.

### Must Not Change
Source illustrations, glyphs, tracing/handwriting components, page layouts,
styles/fonts, original books/proof outputs, dependencies/lockfile, app,
other worktrees/branches and untracked files. No model runtime/client, GPU
loading, art generation, backend/database, remote writes/PR/merge or subagents.

### Assumptions / blockers
Use the existing owned codex/mixed-counting-workbook checkout at
393f5dd4e3de5ee73efdb1bba1814995b98d4176. Recipes are JSON data only, with a
bounded count of groups (1-60) and counts/choices 1-20. Partial final pages are
allowed. No repeated species within a counting page. The fixed alphabet and
numbers templates reproduce the existing complete books; flexible alphabet
subsets/curriculum changes and coloring recipes remain outside this slice.
No physical printer is available. Local commit only; no remote authority.

### Verification plan
Targeted existing alphabet/counting tests plus recipe tests. Reject missing,
extra, mixed, falsy, sparse, out-of-range, unknown-template/animal, unsafe-path,
malformed/oversized recipe and stale lock data. Probe valid range/cap edges;
prove sanitized resolved data feeds rendering. Lock fingerprints cover source,
fonts/styles and selected assets; schema and validator share one definition.
Capture pre-change metadata/HTML hashes to pin existing default behavior.
Full print pipelines: custom counting, locked replay, seeded/default counting,
alphabet and numbers via recipe dispatch; inspect actual PDF rasters/contact
sheets. Byte-compare custom replay rasters. Existing safe margins, physical
dimensions, numeral/animal sizes, exact quantities/choices, PDF freshness,
overflow/browser-error and density checks remain in force.
No fail-first defect probe: requested additive feature. Broad app suites and
remote CI not run because application code is protected and unchanged.

Durable evidence:
/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/

## Contract Amendments
None.

## Implementation summary
Added JSON author recipes, a checked-in shared schema, strict validation and
a fixed-template dispatcher. Alphabet and numbers reuse their existing full
books. Counting can use the original seed/mode mix or explicit groups and
choices, including a partial final page. Builds save exact resolved recipes
with content/source/art locks; replay rejects mismatches. Existing commands,
renderers, layouts, glyphs and art remain unchanged. No model/runtime added.

## Cold Diff Audit

### Gaps
No implementation gap found. Physical paper/toner testing and remote CI are
not performed. Node/Chrome versions are recorded, not automatically installed
or pinned; exact page-image comparison requires the same render environment.
This is a schema-keyword subset interpreter for our checked-in schema, not a
general-purpose JSON Schema library. Cross-field counting semantics are
validated in the content factory. Other book types and model connections are
explicitly deferred. An empty README patch was rejected and corrected without
changing code; no implementation/test failure remains.

### Change By Change Reconstruction
- `workbook/recipes/workbook.schema.json:5,41`: versioned data-only shapes for
  fixed alphabet/numbers and seed/custom counting; numeric/group/file-content
  constraints and source/content/art lock structure. Contract: shared schema.
  Covered by schema, boundary, malformed/extra/falsy and lock tests.
- `workbook/src/recipes.mjs:20,55,76,84,103,115`: interprets only the schema
  features used here; bounded regular-file JSON reads with closed descriptors;
  fixed catalog/template resolution; fingerprints render inputs/fonts/styles;
  freezes exact counting content and art hashes; verifies supplied locks.
  Contract: safe recipes and reproducible input. Covered by validation,
  resolver/replay, source/content/art-lock and bounded-file tests.
- `workbook/scripts/workbook.mjs:12,24,33`: read-only catalog/validation plus
  fixed script dispatch through an argument array, not a shell. Later stages
  compare the saved snapshot before touching output. Builds save the resolved
  recipe and Node/Chrome environment record. Contract: thin existing-pipeline
  integration. Covered by CLI negative/stale-build tests and all example
  pipelines, including an actual locked replay.
- `workbook/src/content/counting-practice.mjs:74,108`: canonical custom-group
  validation at the selection origin, then shared choice generation/pagination.
  Rejects unknown animals/paths, invalid counts/choices, duplicate page species;
  honors explicit choices and partial final pages. Default selection untouched.
  Contract: custom counting without layout rewrite. Covered by recipe tests,
  existing counting tests, pre-change render hashes and PDF geometry/content.
- `workbook/scripts/counting.mjs:18,66,186`: --recipe intake, conflicting flag
  rejection, locked snapshot/hash export and freshness checking. Default full
  mix retains original quantity coverage, group/page count and position checks.
  Explicit groups instead check their exact requested order/count/animals;
  partial final rows are allowed. All physical/content/size/browser/density
  invariants remain. Contract: real recipe content and unchanged print pipeline.
  Covered by default/custom/replay pipelines, CLI tests and raster comparison.
- `workbook/recipes/counting-mixed.json:2`: example of the existing complete
  seed/mode mix. Contract: usable seeded recipe. Full 12-page pipeline passes;
  all 12 PDF rasters match the approved original pack byte-for-byte.
- `workbook/recipes/counting-custom.json:2`: explicit six-group example
  with counts 3,5,1,12,20,8. Contract: editable content. Three-page pipeline
  and frozen replay pass; all actual raster pages inspected and identical.
- `workbook/recipes/alphabet-a-z.json:2`: existing A-Z/a-z template recipe.
  Contract: same reusable interface. Full 13-page/52-row pipeline passes;
  pre-change metadata/HTML hash unchanged; contact sheet and raster inspected.
- `workbook/recipes/numbers-1-20.json:2`: existing 1-20 template recipe.
  Contract: same reusable interface. Full 12-page pipeline passes; pre-change
  metadata/HTML hash unchanged; contact sheet and final counting raster viewed.
- `workbook/tests/recipes.test.mjs:17,24,39,56,72,84,97,119,134,168`: pins
  default pre-change render hashes and tests examples, replay, order/choices,
  valid edges, invalid input, locks, size limits, CLI failures/no output and
  stale-build refusal before later stages. Contract: regression/boundary proof.
  Combined targeted runner: 28 tests, 28 pass, 0 fail; raw TAP saved durably.
- `workbook/package.json:35`: workbook:* entry points and combined targeted
  test command only. Contract: copy-pasteable invocation. Commands exercised;
  no dependency/lockfile change.
- `workbook/.gitignore:6`: ignores only new dist-recipes output.
  Contract: source/output separation. Status and protected-surface diff checked.
- `workbook/README.md:320`: schema/examples, exact build/replay/stage commands,
  catalog, validation, locks, fresh output directories, limits and deferred
  runtime/subsets/book types. Contract: easy reuse. Documented commands used.
- `learning-playground/docs/work-contracts/workbook-recipe-files.md`:
  before-code contract plus this reconstruction. Contract: scope/audit record.
  Repository change-workflow checker passes.

### Contract Traceability
Every change serves the declared recipe intake, resolution, dispatch, proof or
documentation surface. Protected art, layouts/components/styles/fonts,
alphabet/numbers content/scripts, dependency lock and app have no diff.
The metadata/HTML hashes captured before code remain pinned and passing.

boundary-probe: good count/choice edges 1 and 20, seed 0/max, group sizes 1,
2,3,59,60 and a valid file at 65536 bytes pass; malformed/falsy/mixed/extra,
unknown/path-like identifiers, duplicate/absent correct answers, cap overflow,
sparse groups/choices, malformed/oversized files and mismatched locks fail.
Valid recipes for the wrong existing output are rejected before later stages;
snapshots are unchanged and no PDF/screenshots are created. Model data cannot
select an executable, script, HTML fragment or source path. The validated
canonical groups, not raw paths/content, feed the existing renderer.

effect-trace: saved recipe regenerates the same workbook | canonical catalog
resolution, seeded choice generation, frozen exact content and live source/art
fingerprints feed existing generators | full custom/replay pipelines pass;
HTML, recipe, environment and all three actual PDF rasters are byte-identical.
Default counted content is independently pinned and all 12 PDF rasters remain
identical to the owner-approved pack.

### Verification
From `workbook/`:

```bash
npm run workbook:test
npm run workbook:all -- --recipe recipes/counting-custom.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/custom
npm run workbook:all -- --recipe /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/custom/recipe.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/replay
npm run workbook:all -- --recipe recipes/alphabet-a-z.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/alphabet
npm run workbook:all -- --recipe recipes/numbers-1-20.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/numbers
npm run workbook:all -- --recipe recipes/counting-mixed.json --out /home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/recipe-files-2026-10-04/mixed
```

All five full pipelines PASS. The final targeted suite has 28 tests/pass 28/
fail 0. Actual Letter PDF dimensions, individual outputs, content/glyphs,
safe margins, no overflow/browser errors and counting density probes pass.
Byte comparisons: custom versus locked replay HTML/recipe/environment and
three PDF rasters identical; all 12 new default counting PDF rasters identical
to the approved previous pack. Custom raster pages 1-3 inspected individually;
alphabet/numbers/mixed contact sheets and representative alphabet/number PDF
rasters inspected. No visual regression or required layout change found.
Node syntax checks for recipes/workbook/counting and git whitespace check
pass. Change-workflow contract checker passes. Raw test report `tests.tap` and
each pipeline's machine verification are in the durable evidence directory.
Physical printer, broad app suites and remote CI not run, as declared.

## Gap audit
DONE for requested local recipe support. Local commit/hash is recorded in the
durable verification notes; no remote action or model runtime is authorized.
