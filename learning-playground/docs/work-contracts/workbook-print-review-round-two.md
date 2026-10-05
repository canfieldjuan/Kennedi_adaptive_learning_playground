# Change Contract: PR 147 per-page inventories and portable print tools

## Before Code

### Root Cause
At 72b111d052e35a388dcd8befd1a28038fc3077c9, per-page HTML, PDF and screenshot
producers overwrite current pages in existing directories without replacing
their inventories (`counting.mjs:83,105,113`). The previous raster-only fix
left these sibling origins unchanged. Shorter recipes therefore retain old
individual pages while current-page-only verification passes.

The recipe wrapper queries a fixed Linux Chrome executable for the render
environment (`workbook.mjs:43`). Numbers/counting also call fixed Linux Poppler
paths; alphabet and raster code independently duplicate a Linux-first fallback.
This contradicts the canonical README's installed-Chrome/PATH prerequisite.
`git log -L` traces the origins to this session's earlier additions:
b00dbb4b3c0e5e048439a50e80190d73c75437a2 and
29baa0abcc12f3d811520e8565695a942cda9940. Fix those producers, not a later filter.

### Correct Fix Must Touch
- `workbook/scripts/print-artifacts.mjs`: one reusable, recoverable staged
  inventory publisher, reused by rasters and per-page generators. Validate
  expected filenames before publishing; preserve prior directories/annotations.
- Alphabet/numbers/counting HTML, individual-PDF/sidecar and screenshot
  producers: write fresh stage inventories, then publish after successful
  generation. Shared producer code removes duplicated replacement mechanics.
- Shared print tooling in that same helper: one Playwright Chrome launch owner
  and PATH-based Poppler invocation. Recipe environment captures the launched
  browser's version, not a separately guessed executable.
- `workbook/scripts/workbook.mjs`: consume shared browser version; keep recipe
  validation and fixed script/argument dispatch intact.
- Existing `workbook/tests/print-artifacts.test.mjs`: expand actual 12-to-3
  reuse to all per-page inventories and annotation preservation; test real
  recipe pipelines while rejecting fixed Linux executable paths in isolated
  processes; retain prior negative guards and add failed inventory publication.
- Canonical `workbook/README.md`: document all replaced inventories and one
  portable tool contract; other operational prose links there rather than
  repeating a separate prerequisite. No dependency change or extra test runner.
- This contract, private session state and durable evidence outside worktrees.
- Bring the owned branch current with `main` by a normal merge if conflict-free;
  publish corrections, then respond/resolve verified findings. Conditional merge
  only after all fresh current-head gates. No admin/force/auto-merge bypass.

### Must Not Change
Artwork, tracing/layout, educational content, recipe public schema, fonts,
dependencies/lockfile, original books, app, ComfyUI/GPU state, other worktrees
and PRs. Incoming main changes remain unchanged. No next slice. Never remove
user output directories or previous backups. Do not weaken existing verification.

### Assumptions / blockers
Owner now requests "lets merge if possible"; developer directs origin-level
fixes for the two new threads. Both must be reproduced before implementation.
Current PR is BEHIND and has two unresolved threads. Local Chrome and Poppler
are available; native macOS/Nix execution is not available and must not be
claimed from a Linux boundary simulation. New-head CI/review remains required.

### Verification plan
Declare fail-first: expanded shorter-rebuild test must fail on extra per-page
files; portable-tool test must fail on blocked absolute Linux Chrome/Poppler.
Only those exact expected failures permit the fixes. Then run the focused print
tests (actual alphabet/numbers/mixed/custom pipelines), saved-recipe replay,
source syntax, whitespace and contract checks. Check recoverable annotations,
invalid inventory and unchanged print pixels; inspect final PDF contact sheets
and individual rasters. CI owns the broad suite. Re-poll ownership/head/bot
threads before publication; do not poll fresh CI until the required timer.

## Implementation summary
Confirmed both findings independently at the published head before fixes.
One staged publisher now owns all recipe per-page inventories, including
rasters. It validates the complete stage before publication and preserves old
directories/annotations in recoverable sibling backups. Chrome and Poppler
lookup are shared; environment metadata comes from the launched browser.
No content, artwork, layout, dependencies or public recipe schema changed.

## Cold diff audit

### Gaps
- Confirmed: the raster-only round-one correction did not fix its sibling
  producers; HTML/PDF/screenshot inventories were still incremental writes.
  Fixed those origins, not verification or a post-export cleanup filter.
- Confirmed: fixed executable locations contradicted README Install. Shared
  Playwright channel/PATH invocation now implements that documented contract.
- Could-not-determine: native macOS/Nix execution, unavailable locally.
  The actual portable-tool pipelines below are Linux boundary simulations.
- No remaining local implementation gap found. Fresh published-head CI/review
  is not established by local tests. Merge readiness remains NOT DONE.

### Change By Change Reconstruction
- `print-artifacts.mjs:10,14,44,73`: one browser owner, allowlisted PATH
  Poppler calls and stage publisher; raster generation consumes the same
  publisher. Exact names, regular files, output identity and rollback are
  checked before replacement. Former raster-only replacement code removed.
- `alphabet.mjs:57,66,87`, `numbers.mjs:46,54,75`,
  `counting.mjs:77,86,108`: stage HTML, individual PDF/hash sidecars and
  screenshots, then publish exact expected names. Shared browser/tool helpers
  replace each copied launch/absolute-path implementation. Existing source,
  PDF-byte, live-crop and layout verification remains intact.
- `workbook.mjs:6,44`: captures the launched browser version; fixed
  executable/script argument mapping and validation are unchanged.
- `print-artifacts.test.mjs:61,95,141`: actual 12-to-3 reuse checks all
  inventories and preserved annotations; actual alphabet/numbers/counting
  recipe runs reject fixed Linux tool invocation and verify captured version.
  Previous PDF/crop negative tests retained; incomplete/invalid staged
  inventories leave the live directory byte-identical.
- README Install is the single operational prerequisite owner; later recipe
  prose links there. Inventory, backup, multi-stage failure and simultaneous
  output-directory behavior are documented. This contract records both
  defects and evidence; private state/ledger are not committed.

### Contract Traceability
The diff matches Correct Fix Must Touch and preserves Must Not Change.
Replacement controls the inventory at its producer, rather than hiding stale
pages later. Tool lookup controls real child-process invocation, rather than
only changing documentation or environment metadata.

boundary-probe: valid actual inventories publish; empty/mixed/duplicate and
path-traversal names, missing expected files, invalid raster counts and symlink
outputs reject without changing live bytes (`print-artifacts.test.mjs:141`).
Actual shorter output has only current files and recoverable old annotations.

effect-trace: remove old individual pages on shorter rebuild | fresh stage and
exact expected-name publication at each producer | 12-to-3 real recipe run
fails before with stale HTML pages and passes after for HTML/PDF/PNG inventories.

effect-trace: remove fixed Linux executable assumptions | shared PATH Poppler
and Playwright Chrome channel plus browser.version() | actual recipe pipelines
fail before on blocked /usr/bin/google-chrome and pass after with the same
absolute-path rejection enforced.

Same-directory concurrent builds are not promised; README requires distinct
outputs. Individual inventory publication is recoverable, not a whole-book
transaction. No stronger concurrency/security/native-platform claim is made.

### Verification
All evidence is durable outside worktrees; aliases and SHA256 below identify
it without private filenames in review replies.

For each defect: reproduce -> isolate -> explain -> fix -> prove -> regression.
- Stale individual pages: expanded real 12-to-3 run failed with pages 4-12
  retained. Isolated incremental producer writes at published counting line
  83 (and its PDF/screenshot siblings). These were introduced by my earlier
  workbook addition; round one fixed rasters only. Shared staged publication
  now fixes every corresponding producer. Exact inventories/annotations pass
  after; the expanded actual pipeline test is committed.
- Fixed tool paths: actual recipe run failed at published wrapper line 43
  when absolute Linux executables were blocked. Earlier recipe metadata used
  a guessed CLI path independently of the actual browser; related producers
  duplicated Poppler lookup. Shared channel/PATH lookup removes those copies.
  All three actual recipe families now pass the same negative boundary with
  environment version equal to the launched browser. Regression is committed.
- Declared before-probe: tests 2/pass 0/fail 2, exact expected failure classes.
  Alias `fail-before.tap`, SHA256
  `16c78bc83470afba09784d9a521f12d65bb9962a7fea15187e51fad90799f962`.
- Final focused print suite: tests 6/pass 6/fail 0. Alias `pass-after.tap`,
  SHA256 `d3b5a301b1933a97d278ab19a2cf64ef7cf0a02a672b299146cda84a51e4aeb0`.
- Adjacent recipe tests: tests 10/pass 10/fail 0. Final actual alphabet 13,
  numbers 12 and custom counting 3 raster pages are byte-identical to prior
  inspected outputs. Alias `raster-comparison.txt`, SHA256
  `4baf153c006a596ca1b6c588ec13af3619a75a7c034fcee40b0430397193afb1`.
- Saved-recipe replay PASS; 9 HTML/recipe/environment/raster files match.
  Alias `replay-comparison.txt`, SHA256
  `92ca6721e7f7535ec08e4c9d38cd6ccf16412a03c26cf7686c7b61be3424f5e8`.
- Final alphabet/numbers/counting PDF contact sheets and counting page raster
  inspected: no new clipping, clutter or print/layout change. Six changed
  JS/test files pass syntax checks; contract checker and whitespace pass.
- CI owns duplicated broad suites. Publication and incoming-main evidence
  will be recorded in private state/durable receipts; this is not a merge proof.

## Gap audit
DONE for the bounded local origin fixes and verification above.
NOT DONE for merge: fresh exact-head CI/review, clean current-main readiness
and guarded merge receipt remain required. No next slice authorized.
