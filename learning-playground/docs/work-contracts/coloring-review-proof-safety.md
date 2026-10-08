# Coloring review proof safety consolidation

## Root Cause

- Preparation conflict protection introduced in 09456ffa8af4feb61e3fe358ad589ea7864c27a6
  compares live content before a separate directory swap. Uncooperative editor
  writes can land between the comparison and swap. Directory inode equality is
  not content equality. An advisory lock cannot protect Inkscape writes.
- Coloring rasterization introduced in c4c73965079d788b592738495f68635112a601c0
  publishes rasters and their receipt before the contact screenshot finishes.
  Verification validates only raster hashes, so stale contact art can pass.

## Correct Fix Must Touch

- Shared preparation owner: publish a unique review candidate, never replace
  the live character directory. Preserve proven trace/crop/receipt bytes.
  Remove snapshot/copy/conflict machinery made redundant by no-overwrite output.
  This intentionally changes preparation output location, not rendering inputs.
- Coloring rasterization: stage actual PDF rasters, contact HTML and screenshot;
  complete rendering before publication. Publish a receipt last that binds PDF,
  raster, contact HTML and PNG hashes. Verification recomputes expected contact
  HTML from current rasters, checks its hash and PNG hash, and rejects missing,
  altered or stale proof files. No blind trusting of receipt filenames/paths.
- Tests via existing npm entry: deterministic late-edit probe for both animals;
  real CLI print replay, stale/missing/mixed contact files and interrupted browser
  screenshot probes. README explains candidate-only preparation and proof checks.

## Must Not Change

No approved art, saved PDFs/contact sheets, recipes, source-lock policy, models,
GPU, curriculum, page layouts, dependencies, package.json, shared print publisher
or unrelated template pipelines. No new coloring scene, merge, worktree cleanup.

## Assumptions / Verification Plan

No filesystem compare-and-rename can atomically exclude arbitrary editor writes.
Unique candidate output is the safe boundary; adopting reviewed art is a separate
explicit artist action, not automatic promotion. Existing renderers keep using
tracked live assets. Contact publication is not a multi-file crash transaction;
receipt-last hash checks fail closed on interrupted publication. Browser failures
before publication must preserve the previous complete proof.
Run declared fail-first late-edit and stale-contact tests, then targeted prep and
coloring/recipe tests and syntax/whitespace checks. Inspect actual PDF proof pixels
from a durable output directory. Remote CI owns duplicated broad suites.

## Implementation summary

The preparation owner no longer snapshots/copies/swaps the live character
inventory. It reserves a unique candidate directory and returns its location,
with SVG and provenance bytes unchanged. Both existing wrappers still reject
arguments and use identical CPU trace/crop settings. Renderer inputs stay live.
Coloring stages rasters/contact HTML/PNG together, completes Chrome work before
live writes, and publishes the receipt last. Verification binds all hashes to
the current PDF and compares contact HTML against current rasters and captions.
Only the generated raster receipt gains contact hashes; old proof outputs need
rasterization again, and source fingerprints remain strict after script changes.

## Cold Diff Audit

### Change by change / contract trace

- `workbook/tools/prepare-coloring-character.mjs:21-25,49-55`: isolated candidate
  owner replaces live publication and removes redundant snapshot/copy guards.
  Covered by real bunny/turtle crop/metadata/receipt/publish failure probes,
  early and late artist writes, repeated unique targets and export byte parity.
- `workbook/scripts/coloring.mjs:95-104`: one contact producer and receipt owner;
  `:110-136`: stage all browser work before publication, receipt last;
  `:147-151`: hash validation plus independently derived contact HTML. Covered
  by missing/altered files, old/new recipe mix, launch/partial screenshot and
  partial final rename probes; repaired outputs verify successfully.
- `workbook/tests/coloring-preparation.test.mjs:68-83,92-133`: deterministic
  publication-window edit and candidate parity tests. No reviewed input writes.
- `workbook/tests/coloring-pages.test.mjs:108-175`: real CLI contact freshness
  and interruption regressions. Existing raster negative remains unchanged.
- `workbook/README.md`, coloring output/preparation sections: exact operational
  change, candidate adoption gate and receipt migration; no atomic-lock claim.
- Previous preparation contract: retained historical evidence, explicitly
  superseded publication claim. This contract records both introducing commits.

### Six-step defect record

1. Reproduce: on 09456ff, two late-edit probes succeeded but reverted notes
   from "Late artist edit." to "Preserve artist annotations."; stale PNG
   verification returned success. Correct isolated run: 3 fail / 0 pass.
2. Isolate: preparation `:55` comparison precedes publisher chmod/rename;
   injection during publisher chmod at `print-artifacts.mjs:55` lands after
   comparison. Contact defect originates at coloring `:98-110` publication
   order and incomplete `:121-123` receipt validation in the introducing code.
3. Explain: directory identity cannot describe in-place content edits; contact
   screenshot freshness was absent from the verified artifact dependency graph.
   The conflict check was my prior fix in 09456ff; the coloring path was my
   introducing c4c73965 change. Initial late-edit injection fired during copy
   too early and was corrected before implementation. Initial browser injection
   patched the wrapper, not its renderer child; corrected to target the child.
4. Fix: eliminate live preparation replacement rather than adding another
   racy content check. Complete contact rendering before proof publication and
   bind both contact files at their receipt owner, not an approval workaround.
5. Prove: original isolated probes pass; final adjacent command 47 pass / 0
   fail. Real scene-pair all pipeline PASS, 2 US Letter pages. Rebuilt contact
   PNG byte-identical to tracked owner-approved PNG (cmp exit 0), visually
   inspected actual PDF-raster contact. Syntax/whitespace checks exit 0.
6. Prevent: tests included through existing npm entry, both animals and all
   contact components exercised, failed generation preserves previous proof,
   interrupted publication rejects mixed proof, recovery passes.

### Effect / boundary evidence

effect-trace: preserve artist edits | preparation never targets live directory
| both late and early injected writes survive, candidate exports match oracle.
effect-trace: reject stale contact | receipt binds PDF/rasters/HTML/PNG and HTML
is recomputed from current rasters | stale/missing/mixed tests reject, valid
replay and recovery accept. boundary-probe: valid/repeated candidates accept;
unknown/path/prototype/falsy IDs reject; valid proof accepts; each absent or
altered contact file/receipt rejects; partial screenshot and partial publication
fail closed. No new privileged-input path or arbitrary artifact path accepted.

### Durable evidence aliases / SHA256

Root alias: coloring-review-proof-safety-2026-10-07 in the operator's
codex-evidence/kennedi-workbook directory, outside worktrees.
- before-isolated.log: bf9e9c7b1edc2435a5b2dad670361894dc02e37256c5a22ac5ea3fdc83daea37
- after-final.log: f169fb916976d520dc2b56eba2ea616ab9490559f7bf2faf74f6165206f2bd23
- proof.log: 88aec48663b3a9e80fa680594d6f5302b47812d3c568d479f97146e04d01713f
- proof/contact-sheet.png: 54b240299ca8e43ca7f24c66526c7d192e83d78e571fc510363bf1f2c1b27d6c

No broad local CI duplicate, physical printer trial or unrelated template change.

## Gap Audit

DONE for local class repair, regression evidence and cold audit. Remote fresh-head
CI/review reconciliation remains pending after push; no merge or new scene here.
