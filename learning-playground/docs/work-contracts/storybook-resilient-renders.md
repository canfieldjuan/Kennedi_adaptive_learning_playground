# Storybook: Renders That Survive a Lost ComfyUI, and a Moon-Free Page Plan

Branch `feat/storybook-resilient-renders`. It prepares the first overnight run,
which renders pages 1–7 at four seeds each, about 3¼ hours, unattended.
Operator, 2026-10-04: "yes", to writing the #150 contract and making the
page plan's two wording changes now.

## Before Code

### Root Cause

**Issue #150.** On 2026-10-04, page 1 rendered seeds 61, 72 and 83 (410s,
418s and 410s). Then the ComfyUI serving it stopped mid-way through seed 94.
Two problems in `storybook/tools/story-recipe.py`:

1. **A dropped connection crashes with a traceback.**
   - `main()` catches only `urllib.error.URLError`, the case of a server that
     can't be reached at all.
   - A server that dies mid-poll raises `ConnectionResetError`, an `OSError`
     that is not a `URLError`, so it escaped as a raw traceback.
2. **One failed seed throws away the finished ones.**
   - `character` and `page` render all four seeds into a temporary staging
     folder, and move it into `drafts/` only when every seed has finished.
   - The exception unwound through `staging()`, which deleted the three
     finished candidates, about 21 minutes of GPU.
   - ComfyUI's output folder still had them. They can't be locked, because
     the draft recipe recording their SHA-256 was never written.
   - Overnight, nobody is watching to re-run, so a late failure costs most
     of a page.

**The page plan names the moon.**
- On page 1, two of the three seeds drew a moon in late-afternoon light,
  most likely from the place text, "Moon Berry Forest".
- Page 2's place and scene say "moon" too.
- The template v2 work showed that naming the moon draws one, even as part
  of another word.

### Correct Fix Must Touch

- `storybook/tools/story-recipe.py`:
  - **Lose the server cleanly.** `main()` also catches a dropped or reset
    connection, a timeout, or a broken HTTP reply from ComfyUI:
    `ConnectionError`, `TimeoutError` and `http.client.HTTPException`.
    - The tool exits non-zero with one plain message saying which seeds were
      kept.
    - It does not catch `OSError` broadly. A local disk error must not be
      reported as a lost ComfyUI.
  - **Write sets seed by seed.** `character` and `page` share one set
    writer.
    - After each seed renders, its candidate and the draft recipe land in
      `drafts/` together, under the art lock. The recipe's `candidates`
      lists every seed rendered so far.
    - When the run started a fresh set, the new recipe replaces the old one
      only when the first new seed lands. A run that fails before rendering
      anything leaves the previous set as it was.
    - The contact sheet is written once all four seeds are in.
  - **Resume a set.** When a draft recipe already exists for this character
    or page, its seeds are kept and not re-rendered if all three hold:
    - it rebuilds to the same recipe, every key except the render-time ones
      (the comparison `lock` already makes);
    - it was rendered by the same ComfyUI version;
    - each recorded candidate's file is still on disk with its recorded
      SHA-256.

    Otherwise all four seeds render fresh. Re-running after a failure
    therefore renders only the missing seeds.
- `storybook/tools/test-story-recipe.py`: the cases under Settling Evidence,
  against a fake ComfyUI that can die after a given number of renders.
- `storybook/stories/pippa-and-the-whispering-moss.json`: the page plan's
  wording (below). The story text and its SHA-256 are unchanged.
- This contract.

### Must Not Change

- **What `lock` and `lock-page` accept.** A lock is still a candidate whose
  bytes match the SHA-256 its draft recipe recorded when it was rendered.
  - A stale file from an older set is never in the current recipe's
    `candidates`, so it still can't be locked.
  - Locking from an incomplete set is allowed: the candidate is still a
    genuine, recorded render. Choosing from fewer than four seeds is the
    operator's call.
- The recipe format, the templates, render settings, models, and `selftest`.
  The three character locks keep passing.
- One operator on one machine, with one art lock (the stated threat model).

## Behaviour

| Situation | Before | After |
|---|---|---|
| ComfyUI unreachable at the start | clean message, nothing written | same |
| ComfyUI lost mid-set | traceback; finished seeds deleted | clean message naming the kept seeds; they stay in `drafts/` with their digests |
| Re-run, same recipe and ComfyUI version | all four re-render | only missing seeds render; "kept seed N" for each one kept |
| Re-run, template, plan or ComfyUI version changed | all four re-render | all four re-render; the new recipe replaces the old when its first seed lands |
| Run fails before its first seed | old set intact | old set intact |
| All four seeds already rendered for this recipe | all four re-render | nothing renders; the tool says so and rewrites the contact sheet |

### The Page Plan's Wording

Story text, `content_sha256` and casts are unchanged. Only these
`place`/`scene` strings change:

| Page | Field | Before | After | Approval |
|---|---|---|---|---|
| 1 | place | a fallen log among the trees of Moon Berry Forest | a fallen log among the autumn trees | operator, "yes" |
| 2 | scene | …a patch of pale, fine moss like spun moonlight… | …a patch of moss pale and fine as silver silk… | operator, "yes" |
| 2 | place | the edge of the Moonlit Glade, by a mossy rock near the Berry Brook | the edge of a glade of silver grass, by a mossy rock near the Berry Brook | **needs your accept, with this contract** |

The third change was found while writing this contract: page 2's place says
"Moonlit". It is the story's own place name, so changing it is your call.

The night light, "quiet silver moonlight", stays as it is. Page 7 is set at
night, and a moon belongs there.

## Settling Evidence (planned)

- **Tests against a fake ComfyUI that stops after a given number of
  renders:**
  - a set that loses ComfyUI after two seeds exits non-zero, with no
    traceback and a message naming seeds 61 and 72;
  - those two candidates and a recipe recording exactly them are in
    `drafts/`;
  - a re-run renders only seeds 83 and 94, then writes the contact sheet;
  - a seed kept from the first run locks, and `selftest` passes;
  - a re-run after a plan change renders all four fresh, and a stale
    candidate from the old set is refused by `lock-page`;
  - a re-run when ComfyUI reports another version renders all four fresh;
  - a run that fails before its first seed leaves the previous complete set
    untouched;
  - a re-run with all four seeds already in renders nothing;
  - the same for `character`, through the shared set writer.
- The whole existing suite still passes, on both Python stacks.
- `selftest` on the real storybook passes: the three locks and the changed
  plan.
- No GPU run is part of this slice. The overnight run is the real-world
  test.

## Not Addressed

- **Forcing a re-render of a recipe that already has all four seeds.**
  Identical recipe, seeds and ComfyUI version give the same picture. If it's
  ever needed, it's a flag later.
- **Adopting ComfyUI's own output files into a draft set.** The tool only
  trusts bytes it recorded at render time.
- **Running all seven pages in one command.** The overnight runner loops
  over `page` calls.
