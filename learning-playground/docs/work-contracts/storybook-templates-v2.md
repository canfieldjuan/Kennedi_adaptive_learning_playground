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

## Contract Amendments

- **"no moon" moves to a negative prompt (operator, 2026-10-04: "move moon
  to the negative prompt").** The first v2 renders were Pippa and Bramble,
  four seeds each.
  - The moon got worse: all 8 have a moon or a moon-like disc, against 5 of
    those 8 on v1. Naming the moon in the positive prompt, even as "no
    moon", puts it in the picture.
  - The upright fix worked: Bramble stands on two legs with two arms in all
    4, against six limbs in all 4 on v1.
  - Barnaby's v2 render was cancelled before anything was written.

  So v2 is revised **before merge**:
  - The sheet text drops "with no moon and no scenery".
  - A template may now carry a `negative` prompt, and sheet v2's is "moon,
    crescent moon, full moon, night sky, scenery".
  - Both graph builders read the template's negative prompt, or an empty
    one when the template has none.
  - v1 has none, so v1 recipes rebuild exactly as before. Page v2 has none
    either, because a night page's moonlight is wanted.

  Revising v2 in place doesn't break the "never edited" rule's purpose:
  - v2 was never pushed or merged, and nothing was locked from it;
  - the 8 draft candidates it rendered now fail `lock` (their recipe no
    longer rebuilds), and they are re-rendered.

- **No moon words at all, and no negative prompt (operator, 2026-10-04:
  "lets remove the terms moon and moon lit from the prompts and retry").**
  - With the negative prompt, all 12 candidates came out moon-free and
    upright. But every colour swung warm and orange:
    - Barnaby is bright orange instead of "warm brown";
    - three of Bramble's four vests are plain orange;
    - Pippa is ginger rather than sandy.
  - The likely cause is "night sky" in the negative prompt, which steers
    away from cool colours and overshoots.
  - So v2 is revised again, still before merge:
    - the sheet template has no `negative` prompt;
    - the graph builders go back to an empty negative;
    - neither "moon" nor "moonlit" appears in any sheet prompt.
  - This tests what the evidence points to: v1's moons came from "moonlit",
    and v2's first attempt brought them back by naming the moon.
  - Barnaby renders first, as the worst case for both the moon and the
    orange. Pippa and Bramble follow only if he comes back brown and
    moon-free.
  - **Pages:** page v2's style has no "moonlit" either. Two page phrases
    still say "moonlight":
    - page 2's "spun moonlight", from the accepted plan;
    - the night light, "quiet silver moonlight".

    They are left for the first page renders to judge. A change to either
    is a plan or template change.

- **The operator's picks are locked in this PR (operator, 2026-10-04: "lock
  them").** The picks are Pippa seed 72, Bramble seed 83 and Barnaby
  seed 61, from the final v2.
  - Their locks go in this PR, so CI checks them from the first merge.
  - Their draft sets go in too: the four candidates, the contact sheet and
    the recipe for each, as the workbook commits its drafts. A lock records
    its draft as `source`, and the draft recipe records each candidate's
    SHA-256.

## Cold Diff Audit

### Gaps

- **Change without contract trace:** none. `git diff origin/main...HEAD`
  holds:
  - sheet v2 and page v2;
  - the two version switches;
  - three test checks;
  - the three locks and their draft sets (amendment 3);
  - this contract.
- **Contract requirement not delivered:** none.
- **Protected surface touched:** none.
  - v1 is byte-identical. The sheet v1 and page v1 templates, all three v1
    sheet recipes and a v1 page recipe were each rebuilt with this branch's
    tool and with `origin/main`'s, and came out identical.
  - The graph builders end unchanged from `origin/main`. The negative-prompt
    support added in amendment 1 was removed in amendment 2.
  - Render settings, the canon and the story are untouched.

### Change By Change Reconstruction

- `storybook/tools/story-recipe.py`:
  - `:76` `SHEET_TEMPLATES` holds v1 (re-indented, same strings) and, at
    `:83`, v2. v2 has the style without "moonlit", the upright text, and no
    moon words.
  - `:93` `TEMPLATE` is `"v2"`.
  - `:105` `PAGE_TEMPLATES["v2"]` is page v1 with the v2 style.
  - `:110` `PAGE_TEMPLATE` is `"v2"`.
- `storybook/tools/test-story-recipe.py`, three checks:
  - `:189`: a new sheet is v2, upright, and never names the moon;
  - `:196`: all three characters' sheet prompts are upright and never name
    the moon;
  - `:407`: a new page is v2, with no "moonlit".
- `storybook/design-source/characters/locked/`: `pippa`, `bramble` and
  `barnaby`, each a `.png` and a `.recipe.json` (template v2, render v1,
  ComfyUI 0.25.0).
- `storybook/design-source/characters/drafts/`: each character's four
  candidates, contact sheet and recipe.

## Verification

- `test-story-recipe.py`: 67 of 67 checks on the final code, on
  Python 3.13 with Pillow 11.3. The 3.12 stack passed 67 of 67 on the first
  v2 code.
- **v1 locks still pass.** `origin/main`'s tool (v1) locked Pippa, Bramble
  and page 4 against the fake ComfyUI, and this branch's `selftest` found
  0 problems.
- `selftest` on this branch, with the three real locks: "3 character
  locks, 1 stories and 0 page locks checked against
  canon/moon-berry-forest.json; 0 problems".
- **Real renders on the 3090** (Qwen-Image Q8 GGUF, 20 steps, 1328²), four
  seeds per character, about 95 seconds per image:

  | Template | Moons | Bramble with six limbs | Colours |
  |---|---|---|---|
  | v1 | 9 of 12 | 4 of 4 | canon |
  | v2, "no moon" in the text (Pippa and Bramble only) | 8 of 8 | 0 of 4 | canon |
  | v2, moon in the negative prompt | 0 of 12 | 0 of 4 | orange cast |
  | **v2, final: no moon words** | **0 of 12** | **0 of 4** | **canon** |

  - Final per-character times: Barnaby 441s, Pippa 396s and Bramble 451s,
    for four seeds each.
- **The operator's picks:** Pippa 72, Bramble 83 and Barnaby 61, locked.
- **Left for the page renders:**
  - Pippa's tail is bare and pink, not furry;
  - Bramble's tail has raccoon-style rings.
