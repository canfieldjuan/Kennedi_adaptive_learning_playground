# Change Contract: PR 147 print-artifact review reconciliation

## Before Code

### Root Cause
At head 0748dcbdf39a61db68d167006b4e141255826713, the alphabet/numbers PDF
exporters record only the source HTML hash. Their verifiers authenticate the
HTML but not the actual PDF bytes (alphabet.mjs:93,149; numbers.mjs:79,130).
Their crop freshness check also reuses the saved manifest crop instead of
executing the crop-producing code (alphabet.mjs:143; numbers.mjs:128).
Counting's raster producer writes into an earlier output directory without
replacing its inventory (counting.mjs:124-128). Shorter recipes therefore
retain stale rasters. These omissions originated in my workbook additions.
All three review findings are plausible from code; reproduce before fixing.

### Correct Fix Must Touch
- Alphabet/numbers export and verify: record and compare PDF byte hashes for
  combined and individual pages, alongside existing source/physical checks.
- Alphabet/numbers crop origin: one shared live-bound measurement function
  used by build and verify; compare saved crops against newly measured crops.
- Counting raster origin: generate into a fresh private staging directory,
  validate its exact inventory, publish it in place of the old inventory.
  Preserve the previous directory as a recoverable sibling, not a recursive
  deletion. Apply this shared raster route to the sibling book generators.
- A small print-artifact helper, included in saved recipe source fingerprints.
- Black-box tests exercising actual generators: byte-modified combined and
  individual PDFs; 12-page to 3-page reuse; crop-source changes in an isolated
  source copy. Include the focused regression file in workbook:test.
- README: hash/freshness behavior, recoverable previous raster directories and
  the existing Chrome/Poppler requirement for print regression tests.
- This contract, private state and durable raw evidence; publish fixes and
  reply/resolve only confirmed findings on the owned PR after successful push.

### Must Not Change
Artwork bytes/provenance/approval, tracing geometry, content/curriculum,
page sizes/layouts, original books/app/storybook, dependencies/lockfile,
unowned worktrees/PRs, model runtime/GPU state. No merge or next slice.
Do not weaken assertions or bypass stale/invalid recipe checks.

### Assumptions / blockers
The authenticated token lacks notifications scope; do not retry subscription
or change credentials. The owner explicitly authorized thread reconciliation,
fixes and continuation, not merge. Physical printing is unavailable.

### Verification plan
Declare fail-first before running four black-box regressions against this
head: alphabet/numbers modified PDFs wrongly accepted, shorter counting
rebuild rejected by stale raster inventory, and crop changes wrongly accepted.
Unexpected failures stop work. Fix at each producing component; rerun the
same regression file and adjacent workbook suite. Inspect actual new PDF
rasters/contact sheets and compare printed pages with previous good proofs.
Run source syntax, whitespace and change-contract checks. CI owns broad suites.
Collect all review-thread/comment pages and re-read exact head before verdict,
push, replies and resolutions. Stop after publication; do not poll fresh CI.

## Implementation summary
All three findings are confirmed and fixed at their producing components. The
four declared fail-first tests failed in the expected classes on the published
head. The final adjacent suite passes 36 tests, including five print regressions.
Actual PDF raster pixels remain unchanged; saved recipe replay also passes.

### Finding verification and prevention

**PDF bytes (confirmed).** Reproduce: a legal trailing PDF comment, preserving
page count and dimensions, passed alphabet and numbers verification. Isolate:
the exporters saved only HTML hashes; the verifiers compared only those hashes.
Explain: this authenticates the input snapshot, not the emitted artifact. Fix:
save and verify both source and PDF byte digests for combined and individual
files (`print-artifacts.mjs:9,13`; `alphabet.mjs:81,139,155`;
`numbers.mjs:69,120,137`). Prove: both changed-PDF cases now reject with
`Altered PDF`, and the restored good artifacts pass. Prevent regression:
`tests/print-artifacts.test.mjs:45` tests both books and both PDF types.

**Stale rasters (confirmed).** Reproduce: a 12-page mixed recipe followed by a
3-page custom recipe in the same output failed with 15 images rather than 3.
Isolate: Poppler wrote into the existing folder; old zero-padded filenames and
new unpadded filenames coexist. Explain: the raster producer never replaced
its inventory. Fix: render and validate in a private fresh directory, then
publish the complete inventory; retain the previous folder and annotations
(`print-artifacts.mjs:35`; `counting.mjs:126`, and sibling callers). Prove:
the same two complete pipelines now pass, with 3 live and 12 preserved rasters.
Prevent regression: `tests/print-artifacts.test.mjs:61` also checks preserved
annotations; the boundary test at line 98 proves rejected counts/symlinks leave
the live inventory untouched. No deletion or downstream stale-page filter.

**Stale crops (confirmed).** Reproduce: editing only the real crop-padding
formula left direct verification green. Isolate: verification reused saved
manifest viewBoxes while build measured live SVG bounds. Explain: it never
executed the crop producer whose freshness it claimed to check. Fix: one
shared live measurement used by both build and verify; compare measured crops
with saved crops (`print-artifacts.mjs:20`; `alphabet.mjs:58,129`;
`numbers.mjs:48,116`). Prove: changing only that function now rejects both
books with `Stale illustration crops`; restoring it passes. Prevent regression:
`tests/print-artifacts.test.mjs:79`. The old copied crop calculations and saved
crop-as-current shortcut are removed, not supplemented with a compensating
downstream filter. Recipe fingerprints include the helper (`recipes.mjs:85`).

These omissions originated in my earlier workbook additions. No review claim
was dismissed. The stale-raster failure's exact observed count corrects the
comment's implied inventory without contradicting its mechanism.

## Cold diff audit

### Gaps
No missing local implementation or protected-surface change found. Remote
publication and thread resolution remain pending at this record's commit.
Fresh-head CI/review must not be inferred from the prior head's green checks.

### Change By Change Reconstruction
Paths below are relative to `workbook/` except this contract.

| File and controlling lines | Actual change | Contract trace |
| --- | --- | --- |
| `scripts/print-artifacts.mjs:9,13,20,35` | Shared source/PDF hashing, live crop producer and recoverable raster-inventory publication; valid inventory checked before replacing live output. | Three root causes / correct fix |
| `scripts/alphabet.mjs:58,81,108,129,139,155` | Calls shared build/verify/export/raster functions; checks combined and individual PDF bytes and freshly measured crops. | PDF/crop causes, raster sibling |
| `scripts/numbers.mjs:48,69,93,116,120,137` | Same corrected producers/consumers for the sibling numbers book; unused imports removed. | PDF/crop causes, raster sibling |
| `scripts/counting.mjs:126` | Uses fresh raster publication in the existing grayscale mode; existing physical/byte/content checks untouched. | Stale raster cause |
| `src/recipes.mjs:85` | Hashes the shared helper in recipe source fingerprints. | Correct fix / replay freshness |
| `tests/print-artifacts.test.mjs:22,45,61,79,98` | Isolated actual pipelines, combined/individual mutation probes, shorter reuse, crop-code mutation and fail-closed raster probes. | Regression prevention |
| `package.json:43` | Adds that test file to the existing CI-exercised command; no dependency changes. | Required test integration |
| `README.md:328` | Documents runtime prerequisites, new digest sidecars, live crops, lock freshness and retained raster backups. | Required operational docs |
| `learning-playground/docs/work-contracts/workbook-print-review-round-one.md` | Before-code scope, reproduction/fix/proof records and this cold audit. | Required change record |

### Contract Traceability
All touched files trace to the declared corrective surface. Artwork, layouts,
tracing, curriculum, dependencies, lockfile, original books, app, model runtime,
unowned outputs and PRs remain untouched. No approval/merge claim is made.

### Verification
- Declared fail-first: `node --test workbook/tests/print-artifacts.test.mjs`
  against an isolated copy of published head: 4 tests, 0 pass, 4 expected fail.
- Post-fix focused file: 5 tests, 5 pass, 0 fail.
- Final adjacent suite: `npm run workbook:test` from `workbook/`: 36 tests,
  36 pass, 0 fail. It executes actual alphabet/numbers/mixed/custom print stages.
- Final saved-recipe replay: `npm run workbook:all -- --recipe <saved-recipe>
  --out <fresh-output>`: PASS, 3 Letter pages, all layout/content/art checks.
- Alphabet's 13, numbers' 12 and custom counting's 3 actual PDF page rasters
  match the earlier inspected good outputs byte-for-byte. The preserved
  mixed inventory's 12 rasters also match its earlier good output. Replay HTML,
  recipe, render-environment and all actual page rasters match the custom proof.
- Visually inspected final actual PDF contact sheets for all three books,
  plus individual alphabet/counting actual PDF rasters. No new clipping or
  print-clarity change. Physical printer not available; this is raster proof.
- `git diff --check` passes; source syntax and repository contract checks are
  recorded in the session ledger before publication. Broad CI is not duplicated.
- boundary-probe: altered combined/individual PDFs reject and restored PDFs
  pass; stale crop producer rejects and restored producer passes; raster counts
  `0`, `-1`, `""`, `false`, fractional and unsafe integer reject; wrong positive
  count and symlink reject without changing existing valid inventory.
- effect-trace: authenticate exported PDF | actual emitted-byte digest at
  `print-artifacts.mjs:13` | legal-comment mutations now fail for both books.
- effect-trace: replace stale rasters | staged inventory publication at
  `print-artifacts.mjs:43,50` | 12-to-3 complete reuse passes; old images retained.
- effect-trace: detect crop changes | shared live crop producer at
  `print-artifacts.mjs:20` | producer-only mutation now fails both direct verifiers.

Durable evidence is outside worktrees. PR replies use aliases and SHA256, not
private paths. `fail-before` SHA256:
`a31930a02479027052bcd6c504c6111746f3080a548c60cb98983b929b956bbf`.
Final `workbook-suite` SHA256:
`1222dc9d9f2b648228018cdd36875ff925902a4340540d1a20bc97e9528ae731`.
`saved-replay` SHA256:
`2fb727018e202f97611e8e3edb288323360b83ef23da80972f3748bd1b413822`.

## Gap audit
Local correction and evidence DONE. Remote publish/replies/resolutions are the
remaining authorized actions. No merge, no new model runtime or workbook slice.
Notification subscription remains blocked by token scope; do not retry or change
credentials. New-head CI/review is deferred to the next allowed confirmation,
at least 15 minutes after publication. Raster backups deliberately accumulate
until the owner decides they are no longer needed. Simultaneous writers to one
output directory are not supported; use distinct output directories.
