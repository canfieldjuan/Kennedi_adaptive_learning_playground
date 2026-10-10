# Coloring artifact ownership consolidation

## Root Cause

Owner accepted the third-round plan in PR 158 issuecomment-6086201958 on
2026-10-10. The introducing coloring change c4c73965 left output lifecycle
outside the verification guarantee. Its raster readers guessed filenames;
9a6f77a copied that assumption into staged contact generation. The 09456ff
preparation owner hashed, reopened and rechecked a mutable input, retaining
that assumption in 9a6f77a. These were my earlier changes, not art defects.
Source evidence: coloring.mjs:32,111-130,197-205 and
prepare-coloring-character.mjs:20,31,48 on published 9a6f77a.
Runtime reproduction is required before implementation.

## Correct Fix Must Touch

- Coloring dispatcher: invalidate old PASS before stage/verification attempts,
  including saved-recipe mismatch. Serialize cooperating runs for one output
  directory so a concurrent verifier cannot republish PASS during mutation.
- Generic workbook dispatcher: delegate an entire coloring run to its owner
  before the generic saved-recipe check. Keep rendering environment metadata
  inside that serialized run. Other template dispatch behavior stays unchanged.
- Coloring raster readers: consume the validated producer inventory for staged
  contact, publication, receipt and pixel verification. Verification must derive
  and validate actual regular-file inventory, not trust receipt paths. Reuse the
  existing numeric inventory validation in print-artifacts.mjs if needed.
- Preparation owner: read once, hash the captured bytes, trace a private PNG
  snapshot. Remove the final live re-read assumption. Preserve trace settings,
  crop, candidate-only publication, approved SVG and receipt byte parity.
- Existing coloring/preparation test entries: old PASS plus failed/mismatched
  stages and failed verify; concurrency; real Poppler 9/10/24-page boundaries;
  both animals' input A/B/A mutation with unchanged-source export parity.
- README and this contract: lifecycle, lock recovery limits, inventory and
  snapshot semantics; six-step evidence, cold audit and remaining gates.

## Must Not Change

No new scenes, approved art or saved PDF/contact/frozen recipe changes, models,
GPU, curriculum/layout, dependencies/package files, source-lock weakening,
unrelated templates, merge or cleanup. Common source fingerprints necessarily
change when their existing dispatcher/helper changes; saved recipes are not
rewritten to disguise that. No generic publishing framework.

## Assumptions / Verification Plan

Cooperating CLI runs can be serialized; arbitrary external file editors do not
obey this lock. Verification describes a completed run, not perpetual immunity
to edits after exit. An interrupted process may leave its output lock; recovery
requires confirming no active owner, not automatic lock stealing.
Malformed flags/new invalid recipes must still create no output. An accepted
coloring attempt against existing output invalidates its previous PASS before
recipe compatibility checks. A successful build/export remains NOT_VERIFIED
until complete verification. Existing contact hash and interruption checks stay.

Declare fail-first probes, retain original-head source and raw results outside
worktrees under codex-evidence/kennedi-workbook/
coloring-artifact-ownership-fix-2026-10-10 (private permissions). After repair,
run focused and adjacent coloring/recipe tests, syntax/whitespace checks, real
scene-pair all pipeline and inspect PDF rasters. Remote CI owns broad duplicates.
One consolidated commit/push, then reply/resolve proven findings, request fresh
exact-head review, subscribe and stop. Unicorn Meadow waits for merge.

## Implementation Summary

The coloring CLI owns the entire accepted run, including saved-recipe checks,
all stages and rendering metadata. It acquires a private exclusive output lock,
writes NOT_VERIFIED before fallible work and writes PASS only after full verify.
Normal success and error release the lock; contenders cannot alter its receipt.
The workbook dispatcher delegates coloring as one invocation, removing the
generic compatibility precheck and inter-stage writes from this path.

Actual raster names flow from replacePdfRasters into every proof reader. One
readPdfRasterInventory validator owns numeric order, exact count and regular-file
checks, reused at generation and verification. Receipt names are not trusted.
Preparation hashes one PNG byte buffer and traces its private snapshot, without
a later live-path hash check. Candidate-only adoption and export bytes stay.

## Six-Step Defect Record

1. Reproduce: on published 9a6f77a, declared isolated run was 4 fail / 0 pass.
   Failed/mismatched stages and a successful replacement build all retained
   PASS. A real ten-page PDF failed opening guessed page-1.png. Both animal
   A/B/A injections succeeded but produced the other animal's SVG while their
   receipt recorded the original input hash. Separate overlap probe: 1 fail /
   0 pass; a build succeeded while verification was in flight.
2. Isolate: original coloring :197-205 wrote only successful PASS, with no
   attempt owner; generic workbook :35 checked mismatch before the coloring
   child could act. Coloring :111/:32 independently rebuilt filenames even
   though the producer returned its validated inventory. Preparation :20/:31/
   :48 read the live input at different times.
3. Explain: my c4c73965 lifecycle/name assumptions survived 9a6f77a staging;
   my 09456ff hash/reopen/recheck assumed an unchanged final path meant unchanged
   conversion bytes. No directory lock could fix the latter for an editor.
4. Fix: serialize cooperating coloring runs and invalidate at the dispatcher
   owner, before compatibility/stages. Delegate once instead of adding another
   outer error cleanup. Share actual numeric inventory across every reader,
   removing both name guesses. Hash and trace the same captured input bytes,
   removing the ineffective final path re-read. Preserve candidate-only export.
5. Prove: isolated replay 5 pass / 0 fail, including overlap; adjacent coloring/
   recipe command 55 pass / 0 fail. Real 9, 10 and 24-page all pipelines passed;
   ten/max packs use page-01.png through page-10.png/page-24.png. Shared-helper
   caller probes 3 pass / 0 fail. Real scene-pair all pipeline passed 2 Letter
   pages. Inspected both scene PDF rasters and final max-pack raster; no clipping
   or blank final page. Contact PNG SHA256 equals the approved oracle exactly.
   Syntax/whitespace checks passed. One audit read guessed a workflow filename
   and failed; it was reported, corrected from actual inventory, not bypassed.
6. Prevent: committed real CLI old-PASS, each stage failure, recipe mismatch,
   contact alteration, 9/10/24 page boundary and overlap probes; both animals'
   atomic input swap/restoration and approved candidate byte comparison. Existing
   negative/contact interruption/lock/crop/recipe tests remain enabled. New
   inventory tests accept valid numeric mixed padding and reject missing, extra,
   duplicate, invalid-index and symlink entries, plus falsy/non-integer counts.

## Cold Diff Audit

### Change-by-change / contract trace

- workbook/scripts/coloring.mjs:21-43,68-78,224-229: one output lifetime owner,
  exclusive lock, early NOT_VERIFIED, environment metadata moved into build;
  :133-151 and :166-171,210: producer-returned inventory replaces guessed names
  in contact, receipt, publication and actual PDF pixel verification. Verified
  by stale-status/failure/mismatch/overlap and real boundary print probes.
- workbook/scripts/workbook.mjs:25-33: route a complete coloring run to its
  owner before saved-recipe checks, leaving validate and other templates on
  their existing path. Environment metadata stays present, now lock-covered.
  Covered by launcher mismatch and coloring all replay, plus portable existing
  alphabet/numbers/counting pipelines and counting inventory shrinkage.
- workbook/scripts/print-artifacts.mjs:71-90: factor existing numeric inventory
  validation into the producer's shared regular-file reader; return numeric
  order explicitly. Existing stageInventory publication/rollback is unchanged.
  Covered by real 9/10/24 output and positive/negative/symlink inventory probes,
  and shared-helper bad-count/publication tests.
- workbook/tools/prepare-coloring-character.mjs:20-21,28-33,48-52: capture/hash
  once, write private PNG, trace it, remove final mutable-input comparison.
  Both wrappers and CPU settings unchanged. Existing crop/metadata/receipt/
  publication failures, artist edits, repeated unique candidate and approved
  byte parity tests pass; both new A/B/A tests compare the exact approved pair.
- workbook/tests/coloring-ownership.test.mjs:9-117: isolated real CLI probes,
  failed status, boundaries, overlap and inventory guards, durable-fixture
  option. workbook/tests/coloring-pages.test.mjs:14 imports it into existing
  npm/CI entries without dependency/package edits.
- workbook/tests/coloring-preparation.test.mjs:49-58,102-114: atomically replace
  and restore only isolated inputs during real convert; assert injection ran,
  canonical/live files remain identical and candidate pair matches oracle.
- workbook/README.md:39-52,127-130: operational ownership, lock limitations,
  real inventory and snapshot provenance, no auto-adoption claim.
- This contract and coloring-review-proof-safety.md opening historical note:
  accepted root plan, scoped implementation/evidence, prior results superseded
  for readiness but retained as historical evidence. No code tests rerun solely
  for documentation changes.

### Effect / boundary evidence

effect-trace: stale PASS cannot survive accepted run | one serialized dispatcher
invalidates before recipe compatibility or mutation, verify alone writes PASS |
same failed/mismatched/replacement probes return NOT_VERIFIED; contender rejects
without changing owner status; normal verification subsequently writes PASS.
effect-trace: ten/max page packs printable | actual producer inventory controls
every raster path | real 9/10/24 complete all/verify, including grayscale pixels.
effect-trace: truthful input provenance | hash and convert consume captured PNG
bytes | both atomic A/B/A swaps retain approved export/receipt bytes.
boundary-probe: valid/repeated output accepts; concurrent owner rejects; new
invalid recipes still create no output; recipe mismatch and failed stages do not
retain PASS; padded/unpadded valid inventory accepts; extra/missing/duplicate/
linked/falsy/non-integer inputs reject. Recipe cap 24 unchanged; overflow 25
still rejected by existing origin tests. Receipt paths do not control file reads.

### Durable evidence

Alias coloring-artifact-ownership-fix-2026-10-10 under operator
codex-evidence/kennedi-workbook, outside worktrees, directories 700/files 600.
Original source: before-source.tar. Logs: before.log, before-overlap.log,
after-isolated.log, after-final.log, adjacent-print.log, proof.log.
Print proof: proof/pdf/kennedi-coloring.pdf and proof/contact-sheet.png.
Fixtures retain actual min/width/max inventories and input fault results.
SHA256 evidence receipt:
- before-source.tar: f9d31f1cffc0e783af76115e03da57de7c758b6c4215469986156f3ed54cda32
- before.log: 51326197ae2c529605299aa57918a2e940d6a59f9a7a189c6b1736aefe487e71
- before-overlap.log: c86d67e03501ba8cf31642ccb12ce6613e0f633b2160725bf57f2f17f8c604fd
- after-isolated.log: 66bbacb034054eb59809fde2712cdbd2e04af7ea1182dee467d8d61a7340458b
- after-final.log: 291c76d882dacc1a40595ba7c29194c5a69eec7c9a673e66573d6b879cce630f
- adjacent-print.log: 9eeb6126d78a86016f8e3fec453d545a68e119b13158d56e6264169a91044d17
- proof.log: 5638bb524d507e2bd94df0a14728f5458711fbf61ca0ced8023e587218d07313
- proof/contact-sheet.png: 54b240299ca8e43ca7f24c66526c7d192e83d78e571fc510363bf1f2c1b27d6c
- proof/pdf/kennedi-coloring.pdf: ac0e09c66829b4ab66d9556b3713ff7509ad9f9f7a1b276da188a5a3fa4e17ae

## Gap Audit

NOT DONE

Local implementation, six-step reproductions, regression prevention, actual
PDF inspection and cold diff audit are complete. Remote readiness remains
pending until new-head CI and independent review are observed. Publication/reconciliation
receipt is persisted separately after the single push. No merge or new art here.
No physical printer trial, broad duplicated CI run, automatic crash-lock stealing
or immunity to arbitrary external editor writes is claimed. Common source locks
change with their existing dispatcher/helper content; saved approved files stay.
