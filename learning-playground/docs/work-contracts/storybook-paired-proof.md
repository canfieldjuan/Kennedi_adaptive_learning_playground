# Matched personal-book page proof

## Before Code

### Root Cause
The versioned comparison commands require four seeds per version and do not
produce one paired receipt with timings. We have CPU wiring evidence but no
controlled visual comparison of the slow recipe and Lightning recipe. Same
prompt, seed and references alone do not establish visual parity.

### Correct Fix Must Touch
- `storybook/tools/story-recipe.py`: add `compare-book-page STORY CHILD PAGE
  --seed SEED --output NEW_DIRECTORY`. Use existing book input/reference
  validators, manifest/graph builders, upload, runtime and candidate validators.
- Generate exactly one v1 and one v2 page with the selected allowed seed, same
  template/prompt/references and observed runtime. Write a labeled contact sheet
  and JSON receipt containing recipes, seed, output hashes, observed runtime,
  and end-to-end per-version elapsed seconds. Timings include queue/model loading
  and are observations, not warmed benchmark claims.
- Require a new output directory outside the storybook. Never resume/overwrite
  a proof. A receipt stays incomplete until both validated outputs and contact
  sheet exist; runtime drift or bad output must never produce a complete pair.
- `storybook/tools/test-story-recipe.py`: real CLI against FakeComfy for paired
  settings/seed/input parity, protected-tree preservation, output isolation,
  malformed output, missing references/models and runtime drift.
- Durable machine receipt outside Git: configured model bytes versus allowlist,
  effective model paths and GGUF node revision; clearly distinguish this from
  continuous loaded-weight attestation. Run the actual CLI on Whispering Moss,
  page 1, Kennedi, seed 72; inspect the labeled draft and retain raw outputs.

### Must Not Change
Normal generation/resume/lock behavior, defaults, templates, graph builders,
canonical model list, real locks/drafts, stories/profiles, runtime configuration,
dependencies, book layouts and approved art remain unchanged. No winner is
selected or art approved. No claims about whole-book quality from one page.

### Assumptions / Blockers
A loopback-only ComfyUI process may be launched using the existing environment
and model configuration; stop only that owned process after the proof. Model
files exist but their hashes must be verified before generation. Missing GPU
capability or model mismatch blocks live proof, not CPU implementation.

### Verification Plan
Declare fail-first CLI probe for the missing command. Run the new case plus
comparison/readiness/runtime adjacent cases; compile and whitespace checks.
CI owns the full broad CPU suite. Run real source/art selftests, snapshot the
reference/source tree, compare after rendering, inspect full PNGs/contact sheet.

## Implementation Summary
`cmd_compare_book_page` uses the existing validated reference bytes and recipe
builders to render one v1/v2 pair into an exclusively created external directory.
It validates each returned image and observed runtime before recording it, then
writes a labeled contact sheet and marks the receipt complete. No resume or
art selection is offered. Only the CLI dispatch and this new command are added.


## Cold Diff Audit
### Gaps
No implementation or local qualification gap. Hosted CI/connector review and
operator art approval are pending; the proof deliberately does not approve art.

### Change By Change Reconstruction
- `storybook/tools/story-recipe.py:1523`: new pair runner consumes existing input,
  reference, graph, image and runtime owners; output is external and exclusive.
- `storybook/tools/story-recipe.py:1834`: argparse registers required seed/output
  and routes to that runner. Existing defaults and commands are unchanged.
- `storybook/tools/test-story-recipe.py:2244`: real CLI proves sampler settings,
  matching inputs, output hashes/timings, preservation and refusal boundaries;
  standard test registration makes this part of the hosted storybook gate.
- This contract records the problem, protected surface and qualification limits.

### Contract Traceability
All changes must trace to the bounded comparison above.
### Verification
- Pre-slice CLI: `compare-book-page` returns exit 2, invalid choice; new paired
  regression against pre-slice source fails at missing entrypoint as intended.
- Import `test-story-recipe.py` and run `case_paired_proof`,
  `case_render_comparisons`, `case_book_ready_missing`,
  `case_book_ready_valid_and_invalid`, `case_runtime_record_and_resume`,
  `case_runtime_drift_and_validation` against separate temporary storybooks:
  93 / 93 checks passed. After a test-only extension for all allowed seeds and
  symlink containment, the final `case_paired_proof` passes 25 / 25. All other
  existing test cases and the exercised implementation are AST-identical.
- Source and real-reference `story-recipe.py selftest`: 0 problems each.
- `compile` both changed Python files and `git diff --check`: passed.
- AST cold comparison: all existing implementation functions unchanged except
  CLI registration in `main`; only `cmd_compare_book_page` added.
- Live CLI: `python3 -u -B storybook/tools/story-recipe.py --server
  http://127.0.0.1:8189 --storybook <approved-reference-storybook>
  compare-book-page whispering-moss kennedi 1 --seed 72 --output
  <new-external-directory>`: completed; v1 580.2438466079766 seconds,
  v2 40.032569297007285 seconds. Both PNGs pass existing graph/size/seed checks.
- Exactly the declared recipe fields differ: render_version, settings, models
  and graph. Prompt, references, profiles, page and template match.
- Four model hashes match before/after; effective configured loader paths match.
  Runtime code snapshot (277 files), model config and original art tree (177
  files) unchanged. Owned loopback server stopped after its queue emptied.
- Both full PNGs and labeled contact sheet inspected. Fast image is brighter
  with stronger outlines and changed facial proportions/shading. No winner
  selected. LoRA, steps and CFG change together; this does not isolate their
  individual visual effects. Sequential timings include cold/warm differences.
- Configured-byte verification is not continuous loaded-weight attestation.
  The ComfyUI archive lacks Git metadata; reported version and installed-source
  snapshot are retained, alongside the clean GGUF node revision.
- Durable evidence aliases and SHA-256s are recorded in the PR body; generated
  art and private machine paths are outside Git.
- Full CPU suite delegated to required hosted CI, not duplicated locally.
- Boundary-probe: fresh external path and allowed seeds accepted; existing,
  internal and symlink-internal paths, 0/empty/False/outside seeds refused;
  partial invalid images, missing sheets/models/version and runtime drift never
  produce a complete proof. Resolver result is the path used for all writes.
- Effect-trace: real CLI -> existing book manifest/graph -> render -> returned
  image/runtime validation -> paired receipt and contact sheet.


## Gap Audit
DONE: bounded implementation, CPU verification and real paired GPU proof complete.
The PR is not merge-qualified until hosted CI and exact-head connector review.
Neither one sample nor a green PR approves art or establishes whole-book parity.
