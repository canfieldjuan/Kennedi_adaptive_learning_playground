# Storybook: Template v2, Upright and No Moon

Branch `feat/storybook-templates-v2`. It follows the first real renders on
2026-10-04: three characters × four seeds on sheet template v1, after the
operator's GPU go. Operator, 2026-10-04: "upright no moon."

The operator accepted this contract in that message. It answered the
proposal set out below: drop "moonlit" from the style, sheets stand upright
on two hind legs, and sheets say no moon or scenery. This file records the
decision and is committed before any code.

## Before Code

### Root Cause

All 12 v1 candidates showed the canon characters, in one consistent style.
None should be locked, for two reasons the v1 prompts cause:

- **Nine of the 12 have a moon**, though the sheet asks for "plain soft cream
  background":
  - Pippa: seeds 61 and 94;
  - Bramble: 61, 83 and 94;
  - Barnaby: all four.

  The style string shared by every template says "gentle warm moonlit
  palette", and the model draws a moon for "moonlit". Page template v1 uses
  the same style, so pages 1–4, set in late afternoon, would likely get one
  too.
- **Bramble has six limbs in all four candidates**: four legs on the ground,
  and two arms coming out of his vest. The v1 sheet says only "standing in a
  relaxed three-quarter view", so the model mixes a real badger's four-legged
  stance with a clothed storybook animal's arms. Pippa and Barnaby happened
  to stand upright.

### Correct Fix Must Touch

- `storybook/tools/story-recipe.py`:
  - **`SHEET_TEMPLATES["v2"]`:**
    - the style without "moonlit";
    - the character standing upright on two hind legs;
    - a background with no moon and no scenery.
  - **`PAGE_TEMPLATES["v2"]`:** the same text and light set as v1, with the
    v2 style. A page's moonlight then comes only from its time of day, which
    is "quiet silver moonlight" at night.
  - **New renders use v2:** `TEMPLATE` and `PAGE_TEMPLATE` both become
    `"v2"`.
- `storybook/tools/test-story-recipe.py`:
  - new renders use v2;
  - no current template asks for "moonlit";
  - every sheet prompt stands the character upright and rules out a moon.
- This contract.

### Must Not Change

- **v1 stays as it is.** Templates are never edited, and a v1 recipe keeps
  rebuilding from v1. No v1 lock exists, but the rule holds anyway.
- Render settings v1, for both sheets and pages.
- The canon and the story snapshot.
- Everything else in the tool's behaviour.

## Behaviour

**Sheet template v2:**

> `<STYLE>`. A single `<build>` `<species>` standing upright on two hind legs
> in a relaxed three-quarter view, `<base_colors>`, wearing `<garment>`, with
> `<props>`, `<accent>`, plain soft cream background with no moon and no
> scenery, full body, centered, no text

**`<STYLE>` v2:** soft storybook watercolor illustration, gentle warm
palette, clean confident outlines, cozy picture-book style.

**Page template v2:** the v1 text, lights and closed time set, with
`<STYLE>` v2.

## Settling Evidence (planned)

- **Tests:**
  - the suite passes;
  - new sheet and page recipes record v2;
  - the sheet prompts read upright and "no moon";
  - no current style says "moonlit".
- **v1 locks still pass.** Locks made by `origin/main`'s tool, which is v1,
  pass this branch's `selftest`.
- **Real renders**, under the GPU go already given:
  - Pippa, Bramble and Barnaby re-rendered on v2, four seeds each;
  - the moon and six-limb counts reported against v1's (9 of 12 and 4 of 4);
  - the operator's pick for each.

## Not Addressed

- **Pippa's stone drawn as a boulder, and her bare mouse tail.** If they
  still show on v2, the fixes are a v3 or a prop-free sheet, which is the
  Known Risk in the slice 2 contract.
- **Barnaby's cropped seeds.** The sheet already asks for "full body". A
  pick can simply avoid them.
