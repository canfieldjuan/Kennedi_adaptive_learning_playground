# V1 step-count comparison

## Before Code

### Root Cause
The operator preferred V1 over the Lightning comparison. That comparison changed
LoRA, steps and CFG simultaneously, so it cannot establish whether a smaller
step count alone retains V1's preferred look. The paired command currently fixes
its alternative to V2. This slice tests one setting, without choosing the art.

### Validated Inventory
The merged paired-proof receipt records one personal-book page, seed 72,
1328-square output, V1 at 40 steps/CFG 4 with the edit model, encoder and VAE;
V2 adds Lightning at 4 steps/CFG 1. Prompt/reference/profile/template matched.
Both existing recipes and graph builders remain immutable. The prior durable
paired-proof packet holds source/graph/model hashes and measured outputs. The
operator selected V1 as the visual baseline. Those timings are sequential
end-to-end observations, not warmed benchmarks or whole-book qualification.

### Correct Fix Must Touch
- `storybook/tools/story-recipe.py`: add immutable experimental page version V3,
  exactly V1 except steps=20, and an optional `--against-render-version` on
  `compare-book-page` selecting V2 or V3. Omission retains the V1/V2 pair.
  Route through existing PAGE_RENDERS/page_roles/builders, not a copied graph.
- `storybook/tools/test-story-recipe.py`: CLI regression proves V1/V3 differ only
  in step count, both omit LoRA, both samplers consume the recorded settings,
  all other recipe inputs match, explicit-version page/book-page isolation
  still applies, missing LoRA does not block V3, and invalid comparator versions
  fail before uploads/output. Keep the existing default-pair regression.
- Actual entrypoint proof: fresh paired CLI on the same page/seed, isolated
  output; validate source/model/runtime preservation, inspect full images and
  labeled contact sheet, retain hashes and observed timings outside Git.

### Must Not Change
V1/V2 recipes, defaults (including PAGE_RENDER), prompts, graph construction,
reference validators, normal generation/resume/locking, stories, profiles,
approved art, runtime flags/config/models and dependencies. V3 is an experiment,
not a preferred or approved successor. No automatic art approval or promotion.

### Assumptions / Blockers
The same local GPU/runtime/model files are available. A loopback-only owned
server may be started with the previous launch flags and stopped afterward.
Unavailable hardware or a hash mismatch blocks live qualification. No model,
precision, capacity or prompt changes are part of this experiment.

### Verification Plan
Declare a fail-first probe for the new option against pre-slice code. Run the
new CLI case, existing paired case and direct versioned-generation/Lightning
callers, plus compile/whitespace checks and source/art selftests. CI owns the
full broad CPU suite. Capture exact recipes, runtime, image and model hashes,
source/art byte preservation and observed elapsed times from the actual CLI.

## Contract Amendment
The first adjacent run reproduced two stale-fixture failures: the existing
`case_render_comparisons` called V3 invalid for both page entrypoints. Adding
V3 intentionally changes that admission set. Replace that fixture's V3 example
with `unknown-render-version`; explicit V3 acceptance remains covered by the new
case. No production behavior beyond the stated new version is changed.

## Implementation Summary
V3 is registered as V1 with 20 steps. An optional comparison selector chooses
V2 or V3; its omission retains V2. The existing render/model/graph owners handle
the selected version without copied graphs or changed defaults. New real-CLI
fixtures cover the step-only pair and both existing explicit-version routes.


## Cold Diff Audit
### Gaps
No implementation/local qualification gap. Hosted CI/connector and operator
visual decision on the experimental sample remain pending.

### Change By Change Reconstruction
- `storybook/tools/story-recipe.py:148`: immutable V3 derives all V1 settings,
  changing only steps. Existing models/templates/defaults compare exactly.
- `storybook/tools/story-recipe.py:1525`: pair runner selects the parsed version
  through the existing manifest builder. All validation/output handling stays.
- `storybook/tools/story-recipe.py:1842`: argparse bounds the alternative to
  V2/V3 with V2 default; invalid selections fail before any upload or write.
- `storybook/tools/test-story-recipe.py:2086`: replaces the stale V3 negative
  example introduced in 5324a8c7; one fixture drives both page commands.
- `storybook/tools/test-story-recipe.py:2328`: new CLI case proves step-only
  settings, fixed CFG/model/input parity, no-LoRA dependency, output isolation
  and unsupported-version refusal; registered in the normal hosted suite.
- This pre-code contract names the experiment, protected surface and evidence.

### Contract Traceability
Every change supports the single step-count experiment above.
### Verification
- Pre-slice command with `--against-render-version v3`: expected exit 2,
  unrecognized argument. New `case_v1_step_comparison` against that source fails
  at its first comparison check. Current source: 12 / 12 checks pass.
- Adjacent paired/explicit-version/Lightning run: 66 / 68 initially; both
  failures traced to one stale V3 negative fixture. The affected explicit-version
  case now passes 32 / 32; paired/Lightning cases passed unchanged in that run.
- Live entrypoint: `python3 -u -B storybook/tools/story-recipe.py --server
  http://127.0.0.1:8189 --storybook <approved-reference-storybook>
  compare-book-page whispering-moss kennedi 1 --seed 72
  --against-render-version v3 --output <new-external-directory>` completed.
  V1: 578.272320449003 seconds; V3: 280.1226416770369 seconds.
- Fresh V1 is byte-identical to the operator-preferred earlier V1. The pair's
  canonical graphs differ only at KSampler.steps, 40 -> 20. Prompt, model files,
  CFG, references, profiles, template and other settings match exactly.
- Returned PNGs pass shared graph/size/seed checks; all output hashes verify.
  All four configured model hashes match before/after; model config, runtime
  source snapshot (277 files) and original art/source (177 files) unchanged.
  Configured-byte verification is not continuous loaded-weight attestation.
- Full V3 and labeled pair inspected: soft coloring/composition retained in this
  sample, with differences in stride, fine texture and foliage. No winner chosen.
  The owned server stopped after its queue emptied. Timings include cold/warm
  differences and are end-to-end observations.
- Durable receipts/raw outputs/verification script remain outside Git; artifact
  aliases and SHA-256s are listed in the PR body.
- Both Python files compile; `git diff --check` passes. Source and real-reference
  `selftest`: 0 problems each. Full broad CPU suite belongs to required CI.
- AST/source inventory: only pair selection and argparse functions change;
  existing graph/generation/lock owners are unchanged. V1/V2 settings, models,
  templates and defaults compare exactly with the merged source.
- Boundary-probe: V2 default and explicit V3 accepted; V1 (duplicate baseline),
  empty and unknown alternatives rejected before rendering or output creation.
  Existing paired tests retain output containment, partial-image/runtime guards.
- Effect-trace: parsed alternative -> book_page_manifest -> PAGE_RENDERS ->
  page_graph -> KSampler receives 40/20 steps at CFG4 without LoRA, observed by
  the real CLI FakeComfy boundary.


## Gap Audit
DONE: bounded implementation and local CPU/GPU qualification complete.
Hosted CI/connector are pending before merge; the sample remains unapproved.
No whole-book quality or warmed-performance claim is made.
