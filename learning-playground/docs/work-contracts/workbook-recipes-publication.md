# Change Contract: publish the illustrated workbook recipe system

## Before Code

### Root Cause
The completed workbook commits were built on the shared alphabet-art checkout,
not current main. Publishing that ancestry would include unrelated draft art,
legacy-recipe backfill tooling and earlier review history. Current main also
lacks thirteen unchanged SVGs required by the workbook catalogs. A code-only
transplant would therefore have missing artwork. The owner approved a clean PR
with our workbook changes and required illustrations, excluding unrelated art
tool changes; no merge or model-runtime connection is authorized.

### Correct Fix Must Touch
- Start an isolated codex/workbook-recipes-pr checkout at fetched main
  b7b7b098e1dafe7c621d5ac79411f015e12f952e. Retain every original checkout.
- Replay only the five owned alphabet, numbers, mixed-counting, choices and
  recipe commits, preserving main's unrelated fixes, palette and art tooling.
- Import only missing animal SVG dependencies, together with their unchanged
  source PNGs containing generation graphs. Do not import old recipe sidecars,
  color variants, draft candidates or unrelated assets.
- Extend main's existing legacy art accounting for these pre-existing imported
  PNG/SVG pairs with exact SHA256s and the existing embedded-graph reproduction
  route. Preserve every existing owner entry. This is not new art generation
  or a new production-approval claim.
- Record source revisions, asset hashes, provenance, reconstruction commands,
  draft approval status and this main-based integration in existing workbook
  documentation. Add minimal integration regression coverage for the imported
  assets/accounting and main-safe change surface.
- Add the focused workbook tests to the existing workbook CI workflow after
  CPU illustration dependencies are installed. Keep every existing gate and
  original-book freshness check unchanged; no broad CI/pipeline replacement.
- Install the unchanged locked workbook dependencies, run focused tests and
  existing CPU-only locked-art selftest. Export and inspect the new main-based
  alphabet/numbers/counting/custom/replay PDFs. Compare rasters with the prior
  verified outputs; keep proof outside worktrees.
- Run whitespace/syntax and repository contract checks, reconstruct the final
  diff against main, commit, push one owned branch and open/attach one PR.
  Persist the exact head and subscription result; stop after opening the PR.

### Must Not Change
Application code, dependency/lockfile versions, existing art bytes/records,
illustration-recipe.py, all other art tools, Kennedi's approved skin/face/hair,
original book layouts or tracked dist/ outputs, unowned PRs/branches/worktrees,
untracked owner files. No backend/database, new pages/curricula, model runtime,
GPU loading, new image generation, force push, subagents or merge.

### Assumptions / blockers
The original workbook lane is 0fefa71296893f42d9e4efd806965d96b37e7204;
its five commits begin after eb2b34dd2bc7095e51095e0d0ccfa362637e0dea.
Imported art was generated previously and is reused byte-for-byte, not promoted
to a freshly tool-managed lock. Source PNGs retain prompts/graphs; legacy
accounting checks their hashes and reproduction route without loading models.
Physical printer testing remains unavailable. GitHub CI/review are not local
verification; no merge readiness claim is made when opening the PR.

### Verification plan
Run workbook:test and the locked-art selftest, including a negative hash/asset
accounting probe in a temporary copy rather than editing canonical artwork.
Verify all required catalog assets exist and all imported pairs are identical
to the original tracked source. Run complete recipe pipelines for alphabet,
numbers, seeded counting, custom groups and saved replay; inspect PDF rasters
and compare page images with prior verified output. Check stale-recipe guards
and CLI boundaries via existing tests. Protected-surface diff must be empty.
Let existing required CI own broad app/unit/viewport/art-tool suites rather
than duplicating them locally. No new defect claim: this is publication and
dependency integration, with focused regression proof.

Durable evidence:
/home/juan-canfield/Desktop/codex-evidence/kennedi-workbook/workbook-recipes-pr-2026-10-04/

## Implementation summary
Replayed the five owned workbook commits onto main. Added thirteen missing
animal SVG/source-PNG pairs unchanged, exact legacy hash ownership, provenance
and three import regression tests. Added the combined focused test command to
the existing workbook CI workflow after its CPU dependencies are installed.
No application, existing art, illustration tools, dependencies, original books
or tracked generated outputs changed. No models were loaded. All new local
proofs are durable and the original worktrees remain intact.

## Contract amendment: complete catalog dependency closure
The first main-based test run reproduced 31 tests / 24 pass / 7 fail. Six
failures traced to missing sloth-01-hanging.svg: my import selector considered
only the alphabet catalog, while numbers-practice.mjs:15 also uses sloth and
counting inherits that catalog. Fix the import closure at its source by using
the union of alphabet and number catalogs; import the existing sloth PNG/SVG
pair unchanged and account for it. Do not filter sloth out of the curriculum.
The new test's embedded Python also misquoted JSON in a JavaScript template
literal (publication-assets.test.mjs:98). Pass JSON as a process argument and
decode sys.argv instead, removing the redundant embedded list and avoiding
nested string escaping. Preserve all guards and the existing unit tests.
The catalog-existence and changed/missing-SVG regressions are the fail-before
proof; rerun those plus the original full workbook tests after the origin fix.

## Cold diff audit

### Main refresh before publication
The final fetch found main advanced to
db2844975d2f77a43360dc5346e1d25ea8c66f25 after the unrelated storybook PR
merged. Its five added storybook/workflow/contract files have no workbook
input changes. Carry this main update into the owned branch without editing
those files. The final publication base is this refreshed main. Verify saved
recipe fingerprints still resolve after integration; no broad suite or PDF
rerun is needed for unchanged render inputs. Preserve the already captured
local proofs and record the integration commit in the private session state.

The following reconstruction is against origin/main, not the old art branch.
Each item connects to replaying the owned workbook work, dependency closure,
reproducibility, verification or its required documentation. Function/section
anchors are used where appropriate; asset entries refer to entire unchanged
source files. Earlier slice contracts retain their detailed local audits.

| File / anchor | Actual change and contract trace | Verification |
| --- | --- | --- |
| `.github/workflows/workbook-quality.yml:67` | Add focused workbook tests; retain all existing gates | Command passes locally; workflow diff is additive |
| `learning-playground/docs/work-contracts/alphabet-row-workbook.md`, Cold Diff Audit | Replay alphabet before-code scope and outcome | Contract checker |
| `learning-playground/docs/work-contracts/numbers-row-workbook.md`, Verification | Replay numbers scope and outcome | Contract checker |
| `learning-playground/docs/work-contracts/mixed-count-and-trace.md`, Cold Diff Audit | Replay mixed counting scope and outcome | Contract checker |
| `learning-playground/docs/work-contracts/counting-three-traceable-choices.md`, Cold Diff Audit | Replay choice scope and outcome | Contract checker |
| `learning-playground/docs/work-contracts/workbook-recipe-files.md`, Cold Diff Audit | Replay recipe scope and outcome | Contract checker |
| `learning-playground/docs/work-contracts/workbook-recipes-publication.md`, Before Code | Main-based integration contract, amendment and audit | Contract checker; final diff |
| `workbook/.gitignore:2` | Ignore only new book output directories | Status; proofs outside checkout |
| `workbook/README.md`, Illustrated alphabet / Numbers / Mixed counting / Rebuild from a recipe | Commands, content locations, limits, replay and CPU-only test dependencies | All documented recipe pipelines exercised |
| `workbook/design-source/legacy-locked-assets.json:2` | Add thirteen unchanged legacy PNG/SVG pairs; no managed-lock or approval invention | Existing selftest; fixed hash oracles; old owners unchanged |
| `workbook/docs/art/asset-provenance.md:7` | Original tool/graph/source revision, import status and art-record route | Embedded PNG graph inspection; byte comparison |
| `workbook/docs/design-system.md`, Separate-row alphabet practice format | Describe new row format without changing existing character guidance | Glyph/layout/PDF checks |
| `workbook/package.json`, scripts | Add workbook commands/tests only, no dependency changes | All five recipe pipelines; focused suite |
| `workbook/recipes/alphabet-a-z.json:2` | Data-only full alphabet example | Full alphabet export and replay tests |
| `workbook/recipes/numbers-1-20.json:2` | Data-only full numbers example | Full numbers export and replay tests |
| `workbook/recipes/counting-mixed.json:2` | Existing seeded mix example | Full mixed export |
| `workbook/recipes/counting-custom.json:2` | Explicit six-group example | Custom export and actual saved replay |
| `workbook/recipes/workbook.schema.json:5` | Bounded data shapes and content/art/source locks | Good/bad/partial/falsy/cap/lock tests |
| `workbook/scripts/alphabet.mjs`, build/pdf/rasterize/verify | Add separate alphabet exports and physical/content/freshness checks | Complete pipeline; all PDF rasters identical to prior proof |
| `workbook/scripts/numbers.mjs`, build/pdf/rasterize/verify | Add separate number exports and checks | Complete pipeline; all PDF rasters identical to prior proof |
| `workbook/scripts/counting.mjs`, build/verify | Seed/mode/recipe intake, PDF pipeline, exact pictures/choices and density checks | Mixed/custom/replay; stale recipe and density probes |
| `workbook/scripts/workbook.mjs:12,24,33` | Catalog/validate; fixed argument-array dispatch; reject stale output before export | CLI failure tests; all pipelines |
| `workbook/src/components/alphabet-practice.mjs`, manuscriptRow/alphabetPracticePage | One case per row, model/five trace/try; two pairs per sheet | Source tests; physical glyph measurements |
| `workbook/src/components/manuscript-glyphs.mjs`, GLYPHS/glyphPaths | Original manuscript centerlines and lowercase/descender guides | All letters measured; aligned bodies; invalid inputs rejected |
| `workbook/src/components/number-glyphs.mjs`, numberGlyph | Validated 1-20 centerline digits | Source boundaries and rendered numeral checks |
| `workbook/src/components/count-and-trace.mjs`, traceAnswer/countAndTrace | Same count controls repetition and tracing; equal optional choices | Exact content/path/style tests; actual PDF inspection |
| `workbook/src/content/alphabet-practice.mjs`, alphabet/pages | Catalog cues A-Z; two pairs per page | Catalog closure, coverage/order and asset hashes |
| `workbook/src/content/numbers-practice.mjs:15`, numbers/pages | 1-20 catalog, tracing/count/color and two breaks | Catalog closure; exact numbers/dots/pictures in real PDFs |
| `workbook/src/content/counting-practice.mjs`, createCountingBook/createCountingBookFromGroups/countingPages | Seeded mix; catalog-only custom groups; balanced or explicit choices | Determinism, ranges, sparse/mixed/duplicate rejection, replay |
| `workbook/src/recipes.mjs`, check/readRecipe/sourceFingerprint/freezeRecipe/resolveRecipe | Bounded regular JSON, schema subset, fixed templates, canonical content/art/source locks | Valid/invalid boundaries; altered locks; saved replay |
| `workbook/src/styles/alphabet-practice.css`, .ap-* | Scoped large alphabet rows | Safe margins/no overflow/.75in guides |
| `workbook/src/styles/numbers-practice.css`, .np-* | Scoped number sheets and counting breaks | Real Letter geometry/glyph bounds |
| `workbook/src/styles/counting-practice.css`, .ct-* | Guided or two-group choice layout with smaller equal guides | .75in animals/.46875in choice guides; stress layout |
| `workbook/tests/alphabet-practice.test.mjs`, tests | Coverage, centerline repetition, cues, malformed input and escaping | Included in passing focused suite |
| `workbook/tests/counting-practice.test.mjs`, tests | Mixed order/seed/quantities/choices/appearance and origin regressions | Included in passing focused suite |
| `workbook/tests/recipes.test.mjs`, tests | Default render hashes, replay, schema/caps/locks, CLI/stale output guards | Included in passing focused suite |
| `workbook/tests/publication-assets.test.mjs:68,77,94` | Catalog closure, original fixed hashes/one owner and valid/changed/missing art-record probes | Three added tests pass; thirteen temporary-copy guard probes |

Every asset below is a separately audited PNG and SVG under
`workbook/design-source/animals/locked-poses/`. Each whole-file import supplies
a missing catalog dependency, preserves the embedded PNG graph/editable SVG,
and is covered by original-revision byte comparison, independent fixed SHA256
oracles, legacy ownership/negative probes and actual workbook PDF rendering:

- `alligator-01-walking.png`, `alligator-01-walking.svg`
- `hippo-01-standing.png`, `hippo-01-standing.svg`
- `iguana-01-standing.png`, `iguana-01-standing.svg`
- `kangaroo-01-standing.png`, `kangaroo-01-standing.svg`
- `monkey-01-sitting.png`, `monkey-01-sitting.svg`
- `narwhal-01-swimming.png`, `narwhal-01-swimming.svg`
- `raccoon-01-sitting.png`, `raccoon-01-sitting.svg`
- `shark-01-swimming.png`, `shark-01-swimming.svg`
- `sloth-01-hanging.png`, `sloth-01-hanging.svg`
- `unicorn-01-standing.png`, `unicorn-01-standing.svg`
- `vulture-01-perched.png`, `vulture-01-perched.svg`
- `xrayfish-01-swimming.png`, `xrayfish-01-swimming.svg`
- `yak-01-standing.png`, `yak-01-standing.svg`

### Integration failures: reproduce, isolate, explain, fix, prove, prevent
1. Reproduce: initial main-based focused runner reported 31 tests, 24 pass,
   7 fail: six missing-sloth paths and the new embedded-Python quoting error.
2. Isolate: numbers-practice.mjs:15 consumes sloth; counting inherits it.
   The original import selector inspected only alphabet. The new test also
   embedded a JSON string inside a Python/JavaScript string at its origin.
3. Explain: both defects were introduced by this publication integration,
   not the earlier workbook pages or main's art guard. Missing catalog closure
   omitted the asset; nested quoting changed the intended Python expression.
4. Fix: use the union of workbook catalogs and import/account unchanged sloth;
   pass the key list as a process argument and json.loads(sys.argv[1]), removing
   the redundant inline JSON literal. No downstream species filter or bypass.
5. Prove: original focused runner now reports 31 tests/pass 31/fail 0. All
   five full recipe exports and existing locked-art selftest pass.
6. Prevent: committed catalog-existence test plus original fixed-hash/owner
   test and valid/altered/missing-art negative test exercise both causes.

boundary-probe: schema/choice/seed/count/group/file-size good edges pass;
invalid, extra, mixed, sparse, falsy, unknown/path-like and out-of-range data
fail before output. Canonical catalog data feeds the renderer; recipe data
cannot choose executables, script paths or SVG/HTML. A valid but different
recipe cannot export an existing output. Every imported valid art pair passes
the unchanged guard; changed and missing SVGs fail in temporary copies.

effect-trace: clean-main publication preserves printed workbooks | replayed
content/layout plus unchanged original SVG bytes and main document renderer |
every alphabet/numbers/mixed/custom actual PDF page raster is byte-identical
to the previously inspected proof. Custom versus saved replay HTML, recipe,
environment and every PDF page raster are byte-identical. All old legacy
owners and protected main app/art/tools/dependency/output surfaces are intact.

### Verified local evidence
`npm ci` used the unchanged lock and reported zero vulnerabilities.
`npm run workbook:test`: 31 tests, 31 pass, 0 fail.
`python3 -B tools/illustration-recipe.py selftest`: managed recipe checks pass;
60 legacy assets have valid byte hashes/rebuild routes (not render proof).
`node scripts/check-work-contract.mjs` and `git diff --check` pass.
Five `workbook:all` pipelines passed on this main-based checkout:
alphabet (13 Letter pages/52 rows), numbers (12 pages), mixed (12 pages/24
groups, positions 8/8/8), custom and frozen replay (3 pages/6 groups each,
positions 2/2/2). All physical pages are 612 x 792 points, with no browser
errors/overflow, safe margins and exact content/tracing. PDF contact sheets
and representative alphabet/numbers pages were viewed; all three custom
rasters were individually inspected. Every page was also compared with its
prior inspected output. No print/layout regression required a source change.
Raw TAP, art-selftest and pipeline logs, machine verification, PDFs, rasters
and contact sheets are in the durable directory above. Physical printer and
remote CI are not exercised locally; broad app/art suites remain owned by CI.

## Gap audit
DONE for local main-based integration, dependency closure and proof. Scoped
commit/push/open/attachment/subscription is the remaining publication action,
recorded outside the repository immediately after execution. CI and independent
PR review are pending, not a claim of merge readiness. No merge is authorized.
