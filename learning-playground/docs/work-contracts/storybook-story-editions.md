# Storybook: Story Editions, Casting the Friends in the Stories

Branch `feat/storybook-editions`. Operator, 2026-10-13: "We need to
restructure the stories to start adding the new characters to them. Add a
scene if we need too. we need to keep in mind this a apart of a larger
system before we start making changes. these stories will feed a comfy
pipeline that will create the scenes to eventually creating the
personalized books we will sell."

## Before Code

### Root Cause

- Four friends exist (Maya, Theo, Sora, Ravi) and are merged, but only Maya
  appears in any story: page 3 of `personal-stories/meeting-pippa.json`, a
  four-page proof of 149 words. Theo, Sora and Ravi are in no story.
- The one real story, "Pippa and the Whispering Moss", cannot take new
  characters. `storybook/stories/pippa-and-the-whispering-moss.json` is a
  snapshot of a `bedtime_broadcast` story, and the tool refuses it if its
  text no longer hashes to the recorded `content_sha256`. It is also shared
  by every family. So a personalised book needs its own story file.
- A story is not prose for a reader. It is the **input of a production
  line**. For each page the tool builds one image-edit prompt from the
  page's `cast`, `place`, `time` and `scene`, and passes the cast's locked
  sheets as references. Whatever the story says reaches a picture. Today
  the check for a personal story (`story_problems`) reads the shape, the
  cast size, that cast names exist, the slots, and the mixing rule. It does
  not read what the scene says against the cast. Four defects therefore
  pass the check and fail at the render, each costing about half an hour of
  GPU time to find:
  1. A scene names a character who is not in the cast. The model draws
     them with no reference sheet, so they look different on every page.
  2. A cast member is not in the scene. They are still drawn, because the
     prompt lists the whole cast.
  3. A place or scene says "moon". The first real renders showed the model
     draws a moon whenever the word is there, and a page's moonlight is
     meant to come only from its `night` time.
  4. Cues such as `[pause]`, which the nightly stories carry for the
     narrator, would print in a book.
- **Cost is set by the page count.** Measured earlier on the one 3090: a
  page takes about 410 seconds a seed and about 28 minutes at four seeds.
  Each child's book is drawn separately, so the cost is pages times 28
  minutes times children. Nothing bounds the page count today.

### Where This Sits in the Arc

1. Merged: character sheets, page plans, template v2, resumable renders,
   the child hero, friends, and the two-stage child sheets (Amendment 5).
2. Locked: Pippa, Bramble, Barnaby, and the children Kennedi (v2, seed 72)
   and Leo (v1). Not yet drawn: the four friends.
3. **This slice: the rules a story must pass to be a safe input for the
   pipeline, and the first edition that casts the new characters.**
4. After this is accepted and merged, in order:
   - draw the sheets of the friends the edition casts (GPU, on your go);
   - draw its pages for Kennedi, then you pick (GPU);
   - a second edition for Sora and Ravi;
   - the story writer, which will use these checks as its gate.

### Decisions Made Here (change any)

- **An edition, not an edit.** The daily story stays as the snapshot it is.
  A personalised book is a new file in `personal-stories/` that records
  which daily story it is an edition of, keeps that story's beats and
  refrain, and adds the child and the friends.
- **Two friends in this edition, not four.** Maya and Theo. The story is
  about 335 words, and eight named characters would crowd both the text and
  the pictures. Sora and Ravi get the next edition.
- **One added scene** (page 2 below), where the first friend joins. The
  daily story has seven paragraphs; the edition has eight.
- **Page count is bounded at 4 to 12.** Four keeps the existing proof valid;
  twelve is about 5.6 hours of drawing per child.
- **The new checks apply to personal stories only.** The daily stories and
  their locks are not changed.

### Correct Fix Must Touch

- `storybook/personal-stories/whispering-moss.json` (new): the first
  edition, "{name} and the Whispering Moss".
- `storybook/tools/story-recipe.py`, in `story_problems` for a personal
  story, the checks under Behaviour.
- `storybook/tools/test-story-recipe.py`: the cases under Settling
  Evidence.
- This contract.

### Must Not Change

- **The daily stories** (`storybook/stories/`) and their page plan check.
  The new checks run only when `personal=True`.
- **Every existing lock and recipe format.** No template, setting, prompt
  or command changes, so nothing already locked or drafted is invalidated.
- **`meeting-pippa`** is not edited. It must still pass every new check.
- **`bedtime_broadcast`:** not read, written, imported or called. The
  `edition_of` record points at a snapshot in this repo, not at that one.
- **No real child.** Friends and Leo are invented; real customers' children
  never go into this repo.

## Behaviour

### What a Personal Story Must Now Pass

All of these are in addition to the existing checks. Each failure names the
page and the rule.

| Rule | A story fails if | A story passes if |
|---|---|---|
| **Page count** | it has fewer than 4 or more than 12 pages | it has 4 to 12 |
| **Nobody uninvited** | a page's `place` or `scene` names a canon character or a friend who is not in that page's cast | every name in them is in the cast |
| **Nobody missing** | a cast member is not in the page's `scene`: a canon character or friend by name, the child by one of the child slots (`{name}`, `{subject}`, `{object}`, `{possessive}`, `{reflexive}` or their capitalised forms) | every cast member is |
| **No moon** | a `place` or `scene` contains "moon" in any case, in any word ("moonlight", "Moon Berry Forest") | none does |
| **No cues** | its `text` contains `[` or `]` | it contains neither |
| **Edition provenance** | `source.edition_of` is present and is not `{"story", "content_sha256"}`, or names a story that is not in `stories/`, or its hash is not that story's `content_sha256` | it is absent, or valid |
| **Refrain kept** | it is an edition and its text holds the daily story's `refrain` a different number of times than the daily text does | the count is equal |

- A name is matched as a whole word in any case, so "Pippa's" names Pippa
  and "Mayan" does not name Maya.
- "Nobody missing" does not apply to the story's `text`: the text may name
  anyone. It is the picture's input that is checked.
- The existing mixing rule, the three-reference limit, the slot rules and
  the `{child}` cast rule are unchanged.

### The First Edition: "{name} and the Whispering Moss" (part of what you accept)

Season: gentle autumn, as the daily story. Refrain, three times, as the
daily story: "The lanterns dim, and the forest grows hushed." The child is
the hero; Pippa is beside them; Maya and Theo are new; Bramble and Barnaby
keep their scenes. Eight pages, one per paragraph:

| Page | Cast | Place | Time | What happens |
|---|---|---|---|---|
| 1 | {child}, Pippa | a fallen log among the autumn trees | late-afternoon | The child follows tiny Pippa, who is on a mission to find the softest moss in the forest. |
| 2 (added) | {child}, Pippa, Maya | a winding path among the autumn trees | late-afternoon | Maya, first down the path as always, joins them with her little lantern and knows where the moss grows. |
| 3 | {child}, Pippa | the edge of a glade of silver grass, by a mossy rock | late-afternoon | They find a patch of moss pale and fine as silver silk; the child reaches out one finger. |
| 4 | {child}, Pippa, Maya | a mossy rock near the Berry Brook | late-afternoon | The moss is soft as velvet; everyone giggles. Refrain. |
| 5 | {child}, Pippa, Bramble | beside a willow near the Berry Brook | late-afternoon | Bramble steps out and gives Pippa a small smooth stone wrapped in a fern, "for your collection". |
| 6 | {child}, Pippa, Theo | the mossy rock near the Berry Brook | dusk | Theo, the quiet collector, shows a feather from his pocket for Pippa's collection; they watch fireflies rise. Refrain. |
| 7 | {child}, Pippa, Barnaby | Barnaby's porch | evening | Barnaby waves slowly from his porch swing; everyone is sleepy. |
| 8 | {child}, Pippa | a soft bed of moss under the trees | night | The child and Pippa fall asleep on the moss. Refrain. |

- Friends: Maya on pages 2 and 4, Theo on page 6. Animals: Pippa on every
  page, Bramble on 5, Barnaby on 7. Largest cast: three, never more.
- The text is written to this table and shown to you in the pull request.
  It is the product, so you read every word before merge. It follows the
  canon's pacing (daytime curiosity slowing to stillness) and avoid list.
- To draw it for a child: the two friends' sheets must be locked first.
  That is two friends at four seeds, and then eight pages at about 28
  minutes each, so about 3.7 hours for one child's book.

### Threat Model and Concurrency

- The new checks are pure functions of the story file, the canon and the
  friend profiles. They read files and write nothing.
- No new lock, state or command. Two runs of `selftest` or `book-page`
  cannot interfere through these checks.
- The inputs are files the operator writes. A malformed one (a cast that is
  not a list, a scene that is not text) must fail a named check and never
  raise: the new checks read a page only after the existing shape check
  passes it.

### Failure Cases

| Input | Result |
|---|---|
| 3 pages, or 13 | refused: page count |
| a scene names Bramble, cast has no Bramble | refused: Bramble named but not cast |
| cast has Theo, scene never says Theo | refused: Theo cast but not in the scene |
| cast has {child}, scene has no child slot | refused: the child is cast but not in the scene |
| place "Moon Berry Forest", or scene "moonlight" | refused: moon |
| text with "[pause]" | refused: cue |
| `edition_of` pointing at a story that does not exist | refused: provenance |
| `edition_of` with a stale hash | refused: provenance |
| an edition missing one of the three refrains | refused: refrain count |
| a page that is not a dict, or has a non-text scene | refused by the existing shape check, with no traceback |

### Known Risks, Read at the Real Renders

- These checks read words. They cannot prove a picture: the model may still
  blend two characters or drop a prop. A page with the child and two
  friends has no animal to anchor it, and is the first to look at.
- A scene that describes someone without naming them ("the tiny dormouse")
  passes "nobody uninvited". The check catches the name, not the idea.
- Eight pages at four seeds is the cost for one child. A second child
  doubles it.

## Settling Evidence (planned)

In `storybook/tools/test-story-recipe.py`, each with the failing and the
passing side:

- **Page count:** 3 pages refused, 4 accepted, 12 accepted, 13 refused.
- **Nobody uninvited:** a scene naming a canon character not in the cast
  refused; a place naming a friend not in the cast refused; the same names
  in the cast accepted; "Pippa's" matches; "Mayan" does not match Maya;
  matching ignores case.
- **Nobody missing:** a canon cast member, a friend and the child each
  absent from the scene refused; each present accepted; each child slot
  form (`{name}`, `{Subject}`, ...) counts as the child.
- **No moon:** "moon", "Moonlit", "MOONLIGHT" and "Moon Berry Forest" in a
  place and in a scene refused; a place and scene with none accepted; "moon"
  in the story's text alone is accepted.
- **No cues:** `[pause]`, a lone `[` and a lone `]` refused.
- **Edition provenance:** absent accepted; valid accepted; a missing story,
  a stale hash, a missing key and an extra key each refused.
- **Refrain:** equal count accepted; one fewer and one more refused.
- **Malformed input:** a non-dict page, a non-list cast and a non-text
  scene each give a named problem and no exception.
- **The real tree:** `selftest` reports 0 problems with the new edition;
  `meeting-pippa` and the daily story still pass; the new edition has eight
  pages, no cast over three, Maya, Theo, Pippa, Bramble and Barnaby, and the
  refrain three times.
- **Mutation run:** each new check broken one at a time in a copy of the
  tool; the full suite must fail every time.

## Not Addressed

- **Sharing pictures between books.** A page that does not cast the child,
  such as one of Pippa and Maya, would look the same in every child's book.
  Drawing it once would cut the cost. Today every book page is drawn per
  child. This needs its own contract.
- **Real customers' children.** The form, and where a real child's profile
  lives, outside this repo. Not built; the checks here do not depend on it.
- **Sora and Ravi.** The second edition.
- **The story writer.** An automatic writer would use these checks as its
  gate. This slice writes the first edition by hand.
- **Print.** Upscaling for the page size, the page layout and the printed
  proof.
- **The reader and the daily ebook,** and any wiring into `bedtime_broadcast`.

## Contract Amendments

None yet.

## Verification

Filled in with the implementation.
