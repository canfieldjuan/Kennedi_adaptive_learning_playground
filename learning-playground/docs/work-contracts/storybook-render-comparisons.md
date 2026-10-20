# Storybook render comparisons

## Before Code

### Root Cause
The page and book-page CLI always uses PAGE_RENDER and writes to a single draft folder. The accepted Lightning comparison requires identical inputs at both render versions, but currently needs source edits and manual backup to avoid replacing drafts. The shared main checkout is stale; origin/main already contains Lightning. No renderer consolidation or default change is needed.

### Correct Fix Must Touch
- storybook/tools/story-recipe.py: add closed --render-version choices to page and book-page. Explicit selection writes only to comparisons/<version> beside drafts; omission preserves current drafts and default. Use the existing manifest and graph builders. Comparison outputs are review candidates, not lock inputs. Print their location without suggesting a lock command.
- storybook/tools/test-story-recipe.py: exercise both actual CLI paths against FakeComfy, retain normal drafts byte-for-byte, compare prompt/reference/seed identity and graph settings, reject invalid versions before contacting the server, and verify each version resumes independently.

### Must Not Change
Templates, model pins, defaults, child cleanup, cast selection, lock commands, existing recipes/art, application UI, server processes and machine configuration. No GPU jobs or implicit character approvals. Runtime fingerprinting and whole-book readiness are subsequent slices, not silently added here.

### Verification
Fail-first: new comparison case must fail because --render-version is unrecognized. Then run that same case and adjacent Lightning cases. CI owns the duplicated full suite. Inspect final diff and preserve evidence outside the worktree.

## Contract Amendments
None.

## Cold Diff Audit
### Gaps
No untraced code changes. Remote review/CI and GPU visual qualification remain pending; this slice does not claim visual parity.

### Change By Change Reconstruction
- storybook/tools/story-recipe.py:583 routes an explicit version to comparisons/<version>; omission keeps the current draft folder and default. Both page and book-page consume that target and version. The parser closes the accepted version set; comparison reporting omits lock instructions.
- storybook/tools/test-story-recipe.py:2049 exercises both real CLI paths with FakeComfy, checks the actual sampler settings, independent resume, matching inputs, preserved draft/other-version bytes and invalid versions including empty and traversal-like values.
- This contract records the required surface and excludes runtime/GPU/product changes.

### Contract Traceability
All edits implement the explicit-version/isolation root cause. Existing manifests/graphs are reused, not redesigned. No generated art, pins, default settings, cleanup or locking logic changed.

### Verification
- Fail-first case_render_comparisons: exit 1, unrecognized arguments: --render-version v1.
- Initial comparison + adjacent case_lightning_pages: TARGETED_CHECKS 37 / 37.
- Strengthened case_render_comparisons + case_page_lock_selftest + case_book_page_lock_selftest: COMPARISON_AND_CALLER_CHECKS 50 / 50.
- python3 -B storybook/tools/story-recipe.py selftest: 0 problems on the clean source checkout.
- git diff --check: clean.
- Full suite left to storybook-quality-gate CI; no duplicated broad local run.
- GPU comparison not run; no model or server started.

### Usage
python3 storybook/tools/story-recipe.py book-page whispering-moss kennedi 1 --render-version v1
python3 storybook/tools/story-recipe.py book-page whispering-moss kennedi 1 --render-version v2

Outputs are under design-source/books/whispering-moss/kennedi/comparisons/v1 and v2. Repeating the same version resumes its set. Normal generation without the flag still writes drafts. All regular reference-sheet checks remain required; this command grants no art approval.

