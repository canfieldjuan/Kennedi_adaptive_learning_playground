# Storybook whole-book reference readiness

## Before Code

### Root Cause
selftest checks the consistency of existing locks, not whether a selected book has all references. book-page validates one page and stops at the first missing sheet. Operators cannot see all dependencies before spending generation time. Reference validation belongs to the existing sheet-lock validators; a second independent readiness validator would drift.

### Correct Fix Must Touch
- storybook/tools/story-recipe.py: add `book-ready STORY CHILD`, a read-only JSON report listing every unique required child/friend/character reference, its affected page numbers, and all missing/invalid lock problems. Exit 0 only when every reference passes, otherwise 1. Report scope is reference-sheets-only; runtime and illustration quality are not checked. Use the existing story/profile/cast validation and a shared sheet-validation owner consumed by both book-ready and book-page, with validated bytes read under art_lock for generation.
- Existing lock JSON and image metadata readers must convert malformed JSON, non-object recipes and unreadable images to validation problems at their origin rather than crashing the aggregate report.
- storybook/tools/test-story-recipe.py: exercise the actual CLI against empty, partial, complete, stale/tampered and malformed locks; assert page mapping, no file writes, zero model calls, and agreement with book-page. Unknown story/child must fail before model calls.

### Must Not Change
Successful selftest semantics, prompts, model pins, render defaults, reference approval/lock commands, generated art, comparison PR, ComfyUI processes, machine settings, runtime provenance or GPU generation. Readiness is a point-in-time report; book-page revalidates at generation. Reporting does not approve art or create locks.

### Assumptions and Publication
Originally built independently from origin/main. PR 166 is now merged as deaa81d; this slice is reconciled onto that base and becomes the sole owned active PR on publication. Runtime provenance remains a separate queued change. Connector review and exact-head CI remain required; this contract does not claim current remote approval.

### Verification Plan
Declared fail-first: new missing-reference case should fail because book-ready is an unknown CLI command. Then run all new readiness cases and existing book-page reference/refusal and folder-record callers. Source selftest and git diff --check; CI owns a duplicate broad suite after publication. Exercise book-ready against the existing real art directory read-only and preserve the report outside worktrees.

## Contract Amendments

Integration after PR 166: comparison selectors and version-specific output folders are now on origin/main (deaa81d). Preserve page_render_target and render_version when replacing the page's copied reference checks with book_sheets. Retain case_render_comparisons and both readiness cases in the runner. Re-run those actual CLI paths together after conflict resolution. This does not change readiness scope or sampling defaults.

## Cold Diff Audit
### Gaps
Implementation and integration verification complete. Publication and remote connector review/CI remain pending. No GPU or visual-quality claim.

### Change By Change Reconstruction
- storybook/tools/story-recipe.py:1406 shares story/profile validation with book-ready without requiring a page number.
- storybook/tools/story-recipe.py:1427 owns reference validation and the validated byte read. book-page and book-ready both call it under art_lock, replacing the copied page-only checks. Missing sheets and missing recipes are both diagnosed.
- storybook/tools/story-recipe.py:1452 maps each required reference to every affected page, emits reference-sheets-only JSON with runtime_checked=false, and exits nonzero when blocked. CLI registration in main() reaches this owner.
- storybook/tools/story-recipe.py:362 and the lock_folder_problems JSON reader convert unreadable PNG and malformed/non-object lock JSON into validation problems at the original readers. git blame identifies both unguarded readers in 3c7f367c; no downstream exception suppression was added.
- storybook/tools/test-story-recipe.py adds CLI missing/partial/complete/tampered reference cases and registers them in the existing test runner. Existing book/refusal/folder/character/two-stage callers were exercised.

### Contract Traceability
All source changes implement the selected-book reference report or keep its existing validators usable on the tested damaged inputs. Templates, default sampling, provenance, art approvals and GPU settings are untouched. Rendering revalidates current sheets; no stale readiness token is trusted. Cooperation with concurrent art publication uses the existing art_lock for checks and byte reads; the report is a point-in-time snapshot, not authorization for a later render.

### Verification
- Fail-first missing-reference CLI case: invalid command book-ready (exit 1).
- Readiness + book refusals/friend-reference/folder-record callers: READINESS_AND_CALLERS 45 / 45.
- Shared image/lock-reader character and two-stage child callers: SHARED_READER_CALLERS 35 / 35.
- Direct old-reader probes: JSONDecodeError and UnidentifiedImageError; fixed readers return cannot-read-lock-recipe and unreadable-image problems for the same inputs. These inputs remain in the CLI regression case.
- New source selftest: 0 problems. git diff --check clean.
- Real art check: meeting-pippa blocked on Maya page 3; whispering-moss on Maya pages 2/4 and Theo page 6; humming-bridge on Sora pages 1/2/4/5/6 and Ravi pages 2/3/5/6/7. SHA-256 snapshots of 176 source/art files were unchanged.
- Model calls: none against real ComfyUI. FakeComfy owns all generation in tests. The new report succeeds with a deliberately unreachable server when references are complete.
- Post-PR-166 integration: readiness missing/partial/complete/invalid cases, case_render_comparisons, book refusals and friend-lock callers pass READINESS_COMPARISON_INTEGRATION 72 / 72. Raw integration-tests.log is preserved outside the worktree.
- Post-integration source selftest: 0 problems; git diff --check clean. Real Whispering Moss report still blocks on Maya pages 2/4 and Theo page 6; snapshots of 176 source/art files remain unchanged.
- Broad duplicate suite deferred to CI after publication.

### Usage
python3 storybook/tools/story-recipe.py book-ready whispering-moss kennedi

Exit 0 means all required reference sheets validate now. Exit 1 means blocked. Each JSON entry lists kind, name, pages and problems; it does not approve a sheet, check model availability or certify illustration quality.

