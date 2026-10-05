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

## Contract Amendments

- **Page 2's place drops "Moonlit" (operator accepted with this contract,
  2026-10-04: "accept").** The place is now "the edge of a glade of silver
  grass, by a mossy rock near the Berry Brook".
- **A render that ComfyUI answers but doesn't produce is handled like a lost
  server** (found while building). These are a rejected graph, an error
  status, or a timeout.
  - `render()` raised `SystemExit` for them, which skipped the kept-seeds
    message.
  - It now raises `RenderFailed`, and the set writer reports it the same
    way: which seed was lost and which were kept.

- **PR #151 review, round 1 (Codex, three P2 findings, all fixed).**
  - **Resume needs a known ComfyUI version.**
    - A server that reports no `comfyui_version` used to match an earlier set
      that had none. A re-run could then mix two ComfyUI builds in one set.
    - Now a set with no recorded version, or a server reporting none, is
      never resumed: all four seeds render fresh.
  - **A reply that isn't JSON is a lost server, caught where the tool talks
    to ComfyUI.**
    - `api()` and `upload()` turn a reply that doesn't decode into
      `BadReply`, which is part of `LOST_COMFY`.
    - So a body truncated mid-set gets the same plain message and kept
      seeds as a dropped connection.
    - Decoding the tool's own files (story, canon, recipes) is untouched,
      so a broken local file is never reported as a server failure.
  - **A render must be a PNG of the recipe's size before it is recorded.**
    - An HTTP 200 error page or an empty body from `/view` used to be
      recorded by digest. Every re-run would then keep it and fail on the
      contact sheet.
    - Now `render()` decodes the bytes as an image and `render_set()`
      checks the size. Anything else is `RenderFailed`: nothing is
      recorded for that seed, and a re-run renders it.

## Cold Diff Audit

### Gaps

- **Change without contract trace:** none. `git diff origin/main...HEAD`
  holds:
  - the tool and its tests;
  - three page-plan strings;
  - this contract.
- **Contract requirement not delivered:** none.
- **Protected surface touched:** none.
  - `lock`, `lock-page` and `commit_lock()` are unchanged.
  - `selftest`, the recipe format, the templates and render settings are
    unchanged.
  - The three character locks still pass `selftest`.
  - The story text and its SHA-256 are unchanged. Only the `place` and
    `scene` strings of pages 1 and 2 differ.

### Change By Change Reconstruction

- **`storybook/tools/story-recipe.py`:**
  - `:118` `LOST_COMFY`: `URLError`, `ConnectionError`, `TimeoutError` and
    `http.client.HTTPException`, not `OSError` at large.
  - `:422` `RenderFailed`. `:426` `render()` raises it where it used to
    exit.
  - `:495` `kept_candidates()`: an earlier set is kept only for the same
    recipe (every key but the render-time ones) and the same ComfyUI
    version, and only if every recorded candidate is a regular file with
    its recorded SHA-256.
  - `:516` `render_set()`:
    - the kept seeds are read under the art lock;
    - each new seed and the recipe land together under the lock;
    - a fresh set's first seed removes the old contact sheet;
    - a lost render exits naming the kept seeds;
    - the contact sheet is written once all four are in.
  - `:565` `cmd_character()` and `:575` `cmd_page()` call it. `staging()`
    is gone, since both callers moved to it.
  - `:800` `main()` catches `LOST_COMFY`, with the message "unreachable or
    dropped the connection … nothing was written".
  - The docstring describes resuming.
- **`storybook/tools/test-story-recipe.py`:**
  - `FakeComfy` gains `die_after`, which drops the connection while a
    render is polled, and `version`.
  - Three cases (`:585`, `:617`, `:665`) and the `renders()` helper.
- **`storybook/stories/pippa-and-the-whispering-moss.json`:** page 1's
  place, and page 2's place and scene.

## Verification

- `test-story-recipe.py`: 77 of 77 checks, on Python 3.13 with Pillow 11.3
  and on Python 3.12 with Pillow 10.2. That's the 67 from before plus 10
  new:
  - Losing ComfyUI after two seeds exits non-zero with no traceback, naming
    seeds 61 and 72.
  - Exactly those two, and a recipe recording them, are in `drafts/`.
  - The re-run renders 2 and writes the contact sheet.
  - A kept seed locks, and `selftest` passes.
  - A complete set re-runs with 0 renders.
  - A run that dies before its first seed leaves the earlier set
    byte-identical.
  - A new ComfyUI version renders 4.
  - A plan change starts fresh and removes the old contact sheet.
  - A stale candidate is refused by `lock-page`.
  - A character set resumes with 3 renders.
  - A kept candidate edited since rendering is not kept, and 4 render.
- **The tests catch the bugs they're meant to.** Each of five broken copies
  of the fix fails the suite:

  | Broken copy | Result |
  |---|---|
  | `render_set` catches only `RenderFailed` | 3 checks fail |
  | the version check is dropped | 1 fails |
  | the recipe comparison is dropped | the suite stops early: `lock-page` refuses page 1's kept seed after Pippa is re-locked |
  | the old contact sheet is kept | 1 fails |
  | the digest check on kept candidates is dropped | 1 fails |

  The first attempt at the recipe mutant also removed the version check, so
  it proved nothing. Rerun separately, the version check was caught, but
  the recipe mutant broke nothing. The plan-change test had also switched
  ComfyUI version, which hid the recipe comparison. That test now changes
  only the plan.
- **The suite found one real bug before commit.** The recipe's `candidates`
  aliased `kept`. That would have:
  - left the old contact sheet in place for a fresh set;
  - printed "nothing to render" after a fully fresh render.

  It's fixed: the recipe takes a copy.
- `selftest` on this branch: "3 character locks, 1 stories and 0 page locks
  checked against canon/moon-berry-forest.json; 0 problems".
- **No GPU run.** The overnight run is the real-world test.

### Round 1 evidence (PR #151, three Codex P2 findings)

- `test-story-recipe.py`: 84 of 84 checks, on Python 3.13 and on 3.12. That's
  the 77 from before plus 7 in `case_bad_replies_are_not_kept`:
  - With no ComfyUI version, all four seeds render fresh (nothing is
    resumed).
  - A `/history` reply of `{` exits plainly ("isn't JSON") and keeps the
    seed that finished.
  - Five broken `/view` replies are never recorded, and a re-run renders
    that seed:
    - an HTTP 200 error page;
    - an empty body;
    - a 64×64 PNG;
    - a right-size PNG cut off mid-file;
    - a right-size JPEG.
- **Each check catches the bug it's meant to.** Each of six broken copies of
  the fixes fails the suite:

  | Broken copy | Checks failing |
  |---|---|
  | no version guard | 1 |
  | no `BadReply` wrapping | 1 |
  | no size check | 1 |
  | no `load()` | 1 (the cut-off PNG) |
  | no PNG-format check | 1 (the JPEG) |
  | no image validation at all | 4 |

  The first break that removed only `load()` and the format check passed:
  the cut-off PNG and JPEG cases didn't exist yet. They were added because
  of that.
- `selftest` on this branch: 3 character locks, 0 problems.
- **The candidate rule has one owner.** "What can be recorded" had been split
  between `render()` (decodes as a PNG) and `render_set()` (the size). It now
  lives entirely in `candidate_problem()`, which `render_set()` calls once
  before recording a seed; `render()` only fetches the bytes.
  - Still 84 of 84 on both stacks.
  - Removing `load()`, the format check or the size check from
    `candidate_problem()` fails one check each; skipping the call fails 5.

- **PR #151 review, round 2 (Codex, one P2): a set is one ComfyUI build at
  every seed, not just at the start.**
  - `render_set()` read the version once, then recorded every seed under
    it. If ComfyUI restarted or upgraded between seeds without a request
    noticing the gap, later seeds came from the new build under the old
    label.
  - Now the version is read again after each seed renders, before it is
    recorded. If it differs from the set's, the seed is not recorded: the
    run exits with the kept-seeds message, and the next run starts a fresh
    set, because the version no longer matches.
  - One owner: `server_version()` is the only reader of the version.
    `render_set()` holds the rule "every recorded seed came from the set's
    version", and `kept_candidates()` applies the same equality when
    resuming.
  - Round 2 evidence:
    - 85 of 85 checks on both stacks, including one new check: a ComfyUI
      that reports a new build after seed 61 has seed 72 refused ("changed
      from 'fake' to 'fake-new'"), keeps only seed 61 under the old version,
      and exits plainly.
    - Removing the recheck fails that check.

- **Closing the class: a recorded seed passes `lock`'s render checks
  (consolidation after round 2).**
  - Rounds 1 and 2 found the same class twice: something recorded at render
    time that `lock` would later reject, which every re-run then keeps and
    nobody can lock (bad bytes, then a changed build).
  - The source is that recording and locking checked different things. So
    `candidate_problem()` now runs `lock`'s own render checks,
    `rebuild_problems()`: the embedded graph is there, it was rendered at
    this seed, it is the recipe's graph, and it is the recipe's size. It
    still requires the bytes to decode fully as a PNG, which `lock`'s
    lazy open doesn't.
  - That covers what wasn't raised yet: ComfyUI handing back another job's
    image (another seed's, or another recipe's) is now refused at
    recording, not at `lock`.
  - **Consolidation evidence:**
    - 86 of 86 checks on both stacks. The one new case: seed 61's image
      served again for seed 72 is refused at recording, and a re-run renders
      seed 72.
    - The PNG-format check was removed: any non-PNG lacks the embedded
      graph, so `lock`'s checks refuse it, and breaking the format check
      failed nothing.
    - The cut-off case now cuts a real render, with its embedded graph
      intact, so only the full decode can catch it.
    - Each remaining check catches something on its own:
      - removing the full decode fails the cut-off render;
      - removing `lock`'s checks fails the wrong-size and other-job cases;
      - removing the version recheck fails the upgraded-build case.
