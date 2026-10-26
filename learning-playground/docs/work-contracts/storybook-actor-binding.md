# Actor-bound scene proof v1

## Root Cause
The current page_prompt concatenates a name-to-picture alias clause and a scene expressed with names/pronouns. The same scene can swap actions and footwear despite correct references. Prior issue165 evidence exactly reproduced the failure and showed that direct picture-bound actor mentions corrected this sample. The alias owner predates this arc (6fd5537b; human friends added in3ba48b80). General reliability is unproven; this slice provides an opt-in proof form, not default adoption.

Validated inventory: preceding role-binding packet, frozen source, Meeting Pippa3 seed72, approved references in Kennedi/Pippa/Maya order, edit Q4_K_S + Qwen VL fp8 encoder + Qwen VAE,40steps/CFG4/1328/euler/simple/shift3.1/index_timestep_zero, no LoRA. Comfy0.25.0/Python3.13.11/Torch2.9.1+cu128 and unchanged runtime source/config/model hashes. Exact successful prompt retained in direct-actors/receipt.json. Baseline hash4cd66310913e854ad6398d2e756b9acd4115b67a5c767eadfa3a91ff9bfec0f4; successful diagnostic424d78a12755f134798ece4203368f78eeb33bb4f67c44ad749cfb635eb6665e. Server-reported runtime and at-rest pins do not attest continuous loaded bytes.

## Correct Fix Must Touch
1. storybook/tools/story-recipe.py: one immutable scene-binding-v1 definition and one builder. Explicit JSON parts are literal strings or picture/source/prefix objects. Their source view must concatenate exactly to the filled source scene. Each object binds a current name (optionally with an explicit prefix) or a declared child subject/object pronoun to a picture. Do not infer pronouns or replace raw names. Require all named cast members bound; reject unknown/mixed malformed data and literal unbound names.
2. New probe-book-scene CLI reads the parts and renders one selected existing seed, always at V1 settings, into a new external directory. Reuse existing manifest/graph/validation/runtime/proof-writer owners; share proof writing with compare-book-page rather than copying the render loop. Receipt is explicitly unapproved and cannot rebuild as a normal page lock.
3. storybook/tools/test-story-recipe.py: fail-first builder/real-CLI tests, good/bad boundary cases, historical owner parity, source preservation, graph differences limited to prompt/output, runtime/failure handling through the shared writer, and normal-lock refusal.
4. This contract: record proof/limits and cold diff.

## Must Not Change
Historical templates/render definitions/defaults, existing normal recipes/locks, story/profile text, images, model/runtime/config/dependencies, app UI and unowned checkouts/PRs. No automatic art approval. No generic natural-language parser. Blush/scale correction is deferred; assess it visibly.

## Assumptions / Blockers
One session, no subagents. Structured input is an author's explicit actor declaration; source equality protects the prose, not semantic truth of an ambiguous pronoun. Arbitrary adjective prefixes remain authored text and must match their source fragment exactly. Only subject/object pronouns supported (not inferred possessive/reflexive rewriting). One proof command does not claim full class closure.

## Verification Plan
Fail-first: new actor-binding case must fail because the builder/CLI is absent, then pass after implementation. Focused adjacent comparator/lock tests, selftest, compilation and diff checks. Hosted CI owns the unchanged broad suite. Live: exact prompt/graph parity with the validated72 intervention before changing inputs; run probe-book-scene72 and compare decoded pixels with prior diagnostic, then same scene61 and Whispering Moss2 seed61 (three-character movement scene). Preserve all outcomes, manually assess actions/clothes/count/props/scale/blush. All live renders keep validated settings, refs and runtime pins. New receipt kind/parts and external output prefix are declared differences; no other graph changes permitted. Cross-scene samples are qualification evidence, not a causal baseline for every seed.

## Operator Proof Interface
`python3 storybook/tools/story-recipe.py --storybook <isolated-edition> --server <loopback-server> probe-book-scene meeting-pippa kennedi 3 --seed 72 --actors actors.json --output <new-external-directory>`

The actor file is a JSON array. Strings preserve literal prose. Objects contain `picture` (one-based current cast order), `source` (the exact current cast name or a declared subject/object pronoun), and optional `prefix` (authored text ending in a space, such as `tiny `). A prefix/name object consumes that complete source phrase and produces `the <prefix><species> from picture <n>`. All source fragments concatenate byte-for-byte to the filled scene; none is discovered by searching the prose. The explicit declaration supplies a pronoun's antecedent. Canonical name case is required; this experimental interface does not promise automatic handling of arbitrary prose variants or possessive/reflexive forms.

Example for the qualified moss scene:
```json
[
  {
    "picture": 1,
    "source": "Kennedi"
  },
  " kneels at a mossy rock, gently touching moss pale and fine as silver silk, with ",
  {
    "picture": 2,
    "source": "tiny Pippa",
    "prefix": "tiny "
  },
  " sitting on the rock beside ",
  {
    "picture": 1,
    "source": "her"
  },
  " and ",
  {
    "picture": 3,
    "source": "Maya"
  },
  " standing nearby holding her small lantern"
]
```

The command uses V1's40steps/CFG4/noLoRA settings, writes `comparison.json`, `actor-v1.png` and a labeled preview, and never writes normal drafts or locks. `scene_binding.version=v1` versions the actor wording separately from the existing page-template/render versions. The comparison command and this probe share one proof writer. Failed renders retain incomplete receipts.

## Implementation Summary
The isolated `probe-book-scene` command, versioned fragment builder and shared proof writer are implemented. Existing templates/defaults/recipes remain identical. The new single-image preview exposed the contact-sheet width assumption; the canonical canvas calculation now fits both rows. No production prompt is adopted.

Live qualification is negative: the original72 diagnostic reproduced exactly at the pixel level; moss61 keeps the intended actions but blends the friend's clothes/hair with the hero; path61 puts the hero in front with the lantern although the friend should lead with it, and changes the friend's boots. This is evidence against treating direct picture mentions as a general fidelity fix. The experimental probe remains useful for reproducing/qualifying the defect, and issue165 remains open.

## Cold Diff Audit
Gaps within experimental probe scope: none. Production fidelity remains unresolved and is not an adoption claim.
- `storybook/tools/story-recipe.py:957`: immutable scene wording; `:960` validates/reconstructs structured source fragments and binds actors; `:1571`/`:1578` share preflight; `:1599` real probe entrypoint; `:1612` one proof writer; `:1918` CLI wiring. All implement the input-bound proof surface; graph/settings/reference ownership remains shared.
- `storybook/tools/story-recipe.py:1141`: width now fits both reference and candidate rows; the origin fix makes a single-proof-specific resizing workaround unnecessary. No downstream crop/pad patch was added.
- `storybook/tools/test-story-recipe.py:2381`: real CLI and boundary/preservation/normal-lock refusal probes; `:2470`: third-reference crop reproduction and geometry regression. Source/state invariants and new paths trace to the stated contract.
- This contract records the inventory, declared preview-only difference, input schema, evidence and negative visual outcome.

Three files allowed: tool, tests, this contract, no other repository changes. Budget around400LOC; sharing the existing writer keeps the proof path single-owned.

## Gap Audit
DONE: experimental proof implementation, boundary/CLI regressions, compatibility/port parity, and planned qualification runs. NOT DONE: the underlying general role/identity-fidelity fix, visual adoption, scale/blush correction or any new page approval. Qualification failed as an adoption gate; no production settings are changed.

## Verification Results
- `python3 -B <durable packet>/run-scoped-tests.py`:76 of76 focused checks passed (including shared comparator, malformed replies/runtime drift and the new probe/preview).
- Fail-first actor builder:0/1 before; initial27/27 after. Expanded guard/CLI checks included in76/76 above.
- Preview fail-first:2/3 before (single-image third reference cropped),3/3 after; larger grids unchanged.
- Historical definitions/defaults/model table unchanged;60 old/new book-recipe pairs equal.
- Selftest and compilation pass; whitespace diff check passes. Hosted CI owns the unchanged broad story/app suites; not duplicated locally.
- Actual CLI parity72:792.3720317580737s; decoded pixels equal prior diagnostic. Moss61:734.3904032669961s, identity/clothing FAIL. Path61:730.3231308789691s, action/boots FAIL. Timings include loading/queue/download and are not benchmarks.
- Final verifier: all3 recipes/graphs and downloaded images validate; normal-lock refusal verified. Original177 art files,277 runtime source files and3 model hashes unchanged. Owned loopback server stopped with exit0.
- First two page renders used source80eb6989bb678a7c429b7ceb7ff634a03c62964e4abc0717cff76f2af22464aa; the third used90c57928551b58d256bf13fc134cc15934db4db67b81bfa4bdaa895c0aac4a47. The only source difference is preview canvas width; four exact bound-recipe/sampler-graph pairs and whole-source byte comparison prove render-input parity. The first two cropped previews were archived and regenerated through the fixed owner; page PNG bytes unchanged.

## Contract Amendment: Complete Reference Strip
The new one-image proof exposed a latent contact_sheet width defect: canvas width follows candidate count alone, so three240px references are cropped on a480px single-image preview. Confirmed in the first live preview. The width owner is contact_sheet (introduced in6fd5537b), newly reached by this slice's single-image writer. Fix that owner to fit both reference and candidate rows; add a colored-third-reference fail-before/pass-after regression and unchanged two/four-candidate geometry checks. Existing larger grids and all page-render inputs stay unchanged.

The first two live page renders use the frozen pre-layout-repair source; the later command may use the repaired source. Preserve and label both source hashes. Prove all manifests/prompts/render graphs identical across that one-line layout change before reusing the GPU evidence. Rebuild only preview sheets from their retained page/reference bytes via the corrected owner, updating preview hashes and recording old/new receipts. No image rerender or hidden replacement. This is a declared preview-layout difference, not a model/prompt difference.
