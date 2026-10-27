# Storybook format stability and regressions

## Root Cause
Confirmed routing mismatch: normal page/book-page commands still select Lightning render v2 (4steps/CFG1/LoRA), while the operator chose V1 visual direction and the recent probes use V1 (40steps/CFG4/noLoRA). The default owner is PAGE_RENDER, introduced by870f0ace; current probe and regular-command graphs therefore differ before generation. V1 is restored as the normal baseline under the latest request to prevent format flips, keeping the selected v2 watercolor template.

Confirmed preservation defect to reproduce before repair: kept_candidates conflates a stale-content recipe with a different page format, returning an empty cache for both. render_set then replaces the normal page's candidates/recipe with the new format without explicit comparison selection. That origin was introduced with resumable sets; trace blame before editing. Same-cast reference reordering also changes model composition in the retained paired experiment; default generation must not silently replace an existing page set after that reorder. This is a declared last-line protection in addition to fixing the default, using manifest inputs rather than inferring semantics from output pixels.

The model's role/prop/scale inconsistency is not fully explained or fixed here. Source/graph validation proves provenance, not that pixels obey a scene. Prior scale assessments were visual concerns, not measured physical-size violations; perspective is unresolved. Known negative GPU outcomes stay retained and unapproved.

## Correct Fix Must Touch
- storybook/tools/story-recipe.py: restore PAGE_RENDER=v1, preserving historical render/template definitions. At kept_candidates, distinguish page format/reference-order changes from ordinary content/runtime invalidation before returning an empty cache. One owner for story-page and book-page; sheet behavior unchanged. For an existing page recipe, a missing/unreadable/malformed format or change to template_version/render_version/template/settings/models refuses rather than overwriting. The same named reference identities in a different order refuse; re-locking bytes in the same order is allowed. A source cast addition/removal is a content change, not an inferred same-cast permutation.
- storybook/tools/test-story-recipe.py: fail-first real CLI default and overwrite reproductions; historical V2 lock/LoRA support through fixtures, explicit comparisons isolated; normal graph's actual watercolor prompt, square PNG dimensions, V1 sampler/model chain, reference names/bytes/order and animal/human picture mapping. Negative server-output graph mutations must fail candidate admission and leave earlier artifacts intact. Probe good/bad, malformed/falsy/partial format data, same-cast permutation, and allowed content/runtime/ref-byte changes. Mutate the actual default and each guard decision to prove regression sensitivity.
- This contract: pre-code claims, exact evidence, declared default change and cold diff/gap audit. Around400 changed lines including tests/contract; no new runtime/CI dependencies.
- Historical storybook-lightning-pages contract: link this superseding default decision without rewriting its original acceptance/evidence.

## Must Not Change
All old render/template versions, approved reference/lock bytes, story/profile text, model/runtime/config/dependencies, child/friend sheet defaults/cleanup, app UI, unowned worktrees/PRs/shared main, and explicit comparison isolation. No generation experiment becomes normal art, no slot sorting, no new artwork approval. Existing V1/V2 locks must still rebuild. The other content-foundry flat-2D workflow has no story-recipe caller and is outside this slice.

## Assumptions / Blockers
Format means stable illustration recipe/style/canvas/reference association plus separate reporting of visual scene issues. No automated CPU test can establish neural role/scale correctness. Use real command dispatch and the existing fake ComfyUI only at the HTTP boundary; identify these as wiring regressions. Existing private negative GPU samples are retained visual regression inputs, not fake passing visual tests. One operator; no new multi-writer execution contract. No subagents.

## Verification Plan
1. Expected fail-first: fresh page and book-page select Lightning rather than the accepted V1, and same-page format/reference-order changes replace the normal set instead of refusing. Record exact CLI result/sampler and changed bytes on copies.
2. Fix the two input-selection/preservation owners only; rerun minimal regression and adjacent resume/comparison/legacy lock tests. Content-only changes and valid same-format resumes remain allowed.
3. Refuse changed prompt/style, reference image associations, sampler/model, dimensions and malformed format metadata; verify both successful matching input and unsuccessful changed input. Mutation kills must be behavioral assertions, not setup/import failures.
4. Selftest, Python compilation and git diff --check. Hosted CI owns duplicate broad suites. Reuse prior GPU evidence only as retained negative samples, never as proof new default fixes semantic pixels. No GPU rerender is needed to prove this code route/default; it reaches the same V1 graph already qualified mechanically.
5. Cold diff reconstruction, commit, ready PR, persist exact head and next check time, subscribe and stop for CI/connector.

## Implementation Summary
Normal page/book-page commands now select V1 with the existing v2 watercolor template. kept_candidates refuses existing page format changes, unknown format metadata and same-cast reference permutations before rendering or replacing a set. Same-format scene/runtime/reference-byte changes retain their existing redraw behavior. Explicit alternatives stay isolated; historical V2 locks still validate. The former test-only V1-default workaround is removed; the old V2 default is emulated only to construct its legacy compatibility fixture.

The default's introducing commit is870f0ace. Automatic cache replacement originated in35d4e117 and its complete-manifest mismatch reader was consolidated in d68109a3. Runtime provenance added in0d9689b2 does not cause this format mismatch and is unchanged.

## Cold Diff Audit
Gaps within deterministic format/preservation scope: none. General visual semantics remain unqualified.
- storybook/tools/story-recipe.py:151-152 selects V1 and owns the page-format member set. :1203-1248 distinguishes format/order changes before the empty-cache fresh-render path. It reads recipe inputs, not inferred image content; the existing graph/candidate validator stays the output admission owner.
- storybook/tools/test-story-recipe.py:1985-2062 preserves real legacy V2 lock/model checks while normal generation changes to V1. :2499-2606 exercises actual normal commands, style/canvas/model/reference wiring, malformed/falsy/partial records, same-cast permutation refusal and valid redraw/resume. :2609-2640 covers positive/negative owner boundaries, including re-locked bytes and authored cast membership changes.
- storybook-lightning-pages.md links this superseding default decision; its historical results and the immutable V2 renderer are retained.
- This contract states the root, permitted surfaces, known limits and exact verification. All changes trace to the operator's request for stable format and regressions. Approved art, reference bytes, old versions, runtime and app UI are untouched.

effect-trace: normal generation stays on V1 | PAGE_RENDER consumed by page_render_target and actual CLI sampler/model graph | both normal commands pass40steps/CFG4/noLoRA; reverting the default fails their behavioral regression.

effect-trace: format/order changes do not replace an existing page | kept_candidates before render_set staging/commit | real CLI refuses with zero queued renders and byte-identical draft sets; guard-removal mutations fail these regressions.

boundary-probe: matching format/resume, scene edits, re-locked reference bytes and authored cast additions/removals pass; changed style/template/render/settings/models/order plus missing, mixed, null, false, zero, empty and malformed records refuse. Both story-page and book-page exercise the same owner. This does not score visual meaning.

## Verification Results
- Isolated fail-first:16/110 checks passed, with normal commands actually sampling4steps/CFG1 and replacing changed page sets. The first draft test run also had two fixture-contamination resume failures; restoration was corrected before the isolated reproduction and production fix.
- Initial repaired focused test:110/110. Expanded final scoped/adjacent runner:253/253 checks pass across nine cases (normal format, guard boundaries, legacy Lightning locks, comparisons, resume, re-locked sheets, friend inputs, paired proof, actor probe).
- Nine production-owner mutations killed by behavioral assertions: default reverted to Lightning, each of five protected fields removed, order guard removed, overly broad reference protection, and all page protection disabled. Exceptions/setup errors do not count as kills.
- Sixty explicit old/new book recipes equal; historical templates/render/model/binding tables unchanged. Only the normal default intentionally changes fromV2 toV1.
- Selftest:3 character locks/1 friend lock,0 problems. Python compilation and git diff --check pass. Hosted CI broad suites pending, not duplicated locally. No new GPU render was used to claim visual fidelity.

## Gap Audit
DONE locally: reproduced and fixed deterministic normal-format selection and silent replacement, with regressions, mutation proof and compatibility checks. Publication/hosted CI/connector review remain pending. NOT DONE: a general visual-fidelity guarantee, learned-model causal closure or artwork approval. Those are separate from this bounded repair.
