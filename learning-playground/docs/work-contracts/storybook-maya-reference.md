# Owner-selected Maya reference and friend-page proof

## Before Work

### Root Cause
Meeting Pippa's friend-containing page cannot render because Maya has a profile
and drafts but no locked reference. The first missing data is
`storybook/design-source/friends/locked/maya.png` and its lock recipe;
`storybook/tools/story-recipe.py` book_sheets reports that absence before upload.
No downstream fallback should invent a reference or skip Maya.

### Required Surface
Validate the historical draft set through current shared owners, present the
candidates, then install the operator-selected Maya image through lock-friend.
Commit only the selected PNG, its original text-render PNG, lock recipe and
this contract. Prove the staged private edition becomes reference-ready, then
render one V1 page3 proof with the approved child/canon/friend reference bytes.

### Protected Surface
Profiles, prompts, model/render settings, graph builders, application code,
other locks, original art checkout and production defaults remain unchanged.
Page art stays draft. Historical Maya runtime provenance must not be invented.
The private child's references and new page output stay outside Git.

### Assumptions / Blockers
The operator selects the exact reference before any lock. The operator chose
61 ("61 works for ,e"). This is approval of Maya's reference; subsequent page
art is a separate visual decision. Historical Maya metadata records ComfyUI
0.25.0 and writer1 without a runtime snapshot or loaded-weight attestation.

### Verification Plan
Use current record_problems, allowlist_problems, candidate_problem and
person_embedded_problems on all four candidate/text pairs. Compare stored
hashes and copied bytes; inspect the labeled candidates. Run the actual
lock-friend CLI at seed61 in an isolated durable edition, verify its bytes equal
the operator's selection, and copy those three lock files to this branch.
Run source/staged selftest and staged book-ready. Preserve a before/after
readiness record showing Maya was the only missing reference.

The page integration runner calls current book_inputs/book_sheets/
book_page_manifest/page_graph/render/candidate_problem owners without changing
any implementation. Render one V1 page3 at page seed72 in an external proof
folder; record recipe, observed runtime, returned graph/size/seed, reference
hashes, output hashes and elapsed time. It is not a normal four-seed candidate
set or a page lock. Verify local model/config/runtime-source pins before/after,
original-art preservation, and inspect the page. Hosted CI owns the broad CPU
suite; no new code or mirror tests are needed for existing-tool execution.

## Implementation Summary

The operator-selected seed61 was installed through the actual lock-friend CLI.
The owned branch holds the exact selected candidate, its text-render input and
the CLI-produced recipe. The staged edition is reference-ready and its locks
validate. A live V1 page3 proof completed and passes mechanical validation, but visual
qualification FAILS: hero/friend actions are swapped, shoes drift and a second
lantern appears. This is tracked under the existing three-character fidelity
issue #165; causal conditioning/prompt origin is not yet isolated. The approved
reference is valid independently; page art remains unapproved/unlocked.

## Intentional

- Reuse existing validated historical drafts; the missing approval/lock did not
  mean candidates were missing. Do not re-render the approved image.
- Retain historical runtime limits rather than stamp a new runtime on old art.
- Source code and existing generation/default/locking behavior are unchanged.
- Use one explicit proof image via the shared owners; do not label it a complete
  normal candidate set or approve a page automatically.
- Public Git assets contain only Maya, an invented friend from the existing
  roster. Real child references and draft page art remain in private evidence.

## Deferred

Remaining book pages, page-art selection/locking and final book assembly follow
operator review of the first friend-containing page. No new speed experiment,
prompt tuning, default change or expanded character design is part of this PR.

## Cold Diff Reconstruction

### Gaps
Maya lock and reference-readiness criteria pass. The generated V1 page fails
visual fidelity, so a faithful friend-page/book is NOT DONE. Keep that failure
in issue #165 and do not treat this asset PR as a page-quality fix. No unresolved
artifact/recipe validation gap remains in the selected reference.

### Changes And Contract Trace
- `storybook/design-source/friends/locked/maya.png`: exact approved seed61
  candidate, closes the missing reference at its origin.
- `storybook/design-source/friends/locked/maya-render.png`: corresponding original
  text-render input required by the existing two-stage sheet validator.
- `storybook/design-source/friends/locked/maya.recipe.json`: actual lock owner
  records chosen_seed=61, hashes and current-rebuildable historical recipe.
- This contract: accepted selection, evidence boundaries and qualification.
- No application-code or other-art change; no earlier workaround to remove.

## Verification Results

- Four Maya candidates and four text renders pass full decode and current
  embedded graph/seed/size checks. Current profile/recipe/allowlist rebuilds.
- All recorded candidate/input digests match. All ten draft-set files copied
  byte-identically to durable evidence. The contact sheet matches the validated
  candidate assembly; full images/labeled alternatives were presented.
- Operator chose seed61. Actual CLI lock-friend succeeded. Locked PNG SHA equals
  the selected candidate SHA and the original text-input SHA matches as well.
- Source and staged selftests: 0 problems. Original edition reference readiness
  is false with only Maya missing; staged readiness is true with no problems.
  Readiness is reference-only; runtime_checked remains false in that report.
- Real V1 page3 proof: 778.3316795929568 seconds end-to-end; actual 40 steps,
  CFG4, page seed72 and all three approved reference inputs recorded. Output
  decodes and passes embedded graph/size/seed and runtime-boundary checks.
- Reference crosswalk proves original approved hero/canon and exact Maya61 bytes
  reached the graph in picture order. Current source/graph/settings unchanged.
- Post-run: all three page-model hashes match; model config and 277 runtime
  source files unchanged; 177 original art/source files unchanged. Owned server
  stopped after its queue emptied. This is at-rest model verification, not
  continuous loaded-weight attestation.
- Full image/reference sheet inspected. Visual FAIL: Maya kneels/touches moss
  while hero stands holding a lantern, reversing the requested actors. Shoes
  drift; extra lantern and cheek blush appear. No page-art approval or lock.
- Retained negative qualification evidence added to existing issue #165 at
  https://github.com/canfieldjuan/Kennedi_adaptive_learning_playground/issues/165#issuecomment-6426858253.
  Shared causal root with Lightning duplication is unknown; no speculative
  prompt/model fix or seed-shopping attempted. Diagnose from the frozen case.
- Durable packet retains source, integration runner, recipes, runtime/model
  pins, output PNG, review sheet, selection and validation receipts outside the
  worktree. Public PR cites aliases/SHA-256 only; private child images stay local.

## Gap Audit

Approved Maya reference and staged reference readiness: DONE locally.
Faithful page/book: NOT DONE; reproduced visual role/clothing failure retained
in issue #165. The reference asset can be reviewed independently; hosted
CI/connector remain pending and page art is not approved.
