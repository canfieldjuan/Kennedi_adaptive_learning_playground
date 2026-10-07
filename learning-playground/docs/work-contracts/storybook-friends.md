# Storybook: Friends, the Other Children in the Hero's World

Branch `feat/storybook-friends`. Operator, 2026-10-07, on the roster and plan
proposed 2026-10-06: "Friends list is good".

## Before Code

### Root Cause

- The operator, 2026-10-06: "let's plan to add more real characters. Boys
  and girls that are her friends or that they meet along the way of their
  adventures. I do t want there to just a kid and a bunch of animals, we mix
  it up."
- The storybook tool can draw only two kinds of character:
  - the canon cast (`canon/moon-berry-forest.json`), which is three animals;
  - the hero, one child per book, from `storybook/children/`.
- So a personal story can only ever be the hero and animals. A page's cast
  accepts `{child}` and canon names, and nothing else.
- Nothing checks that a book mixes children and animals. The one personal
  story, `meeting-pippa`, is the hero, Pippa and Bramble.

### Where This Sits in the Arc

1. Merged: character sheets (#144), page plans and pages (#148), template v2
   and the three locks (#149), resumable renders (#151), the child hero
   (#153) and Kennedi's skin rewording (#154).
2. In flight, separately:
   - the page-check fix (#155), which every book page needs;
   - Kennedi's look (child-hero Amendment 5: skin, short pigtails, no
     blush), still being probed.
3. **This slice: invented friends, a boy or a girl each, drawn like the hero
   and cast in personal stories, and a rule that every book mixes children
   and animals.**
4. Afterwards: kids met along the way (one or two stories each), the
   personal-story writer, and wiring friends into the free daily stories,
   when you decide.

### Correct Fix Must Touch

- `storybook/friends/<id>.json` (new): one profile per friend. This slice
  adds four: `maya.json`, `theo.json`, `sora.json` and `ravi.json`.
- `storybook/personal-stories/meeting-pippa.json`: Maya replaces Bramble on
  page 3, so the proof story passes the mixing rule (below).
- `storybook/tools/story-recipe.py`:
  - **The friend profile check:** the child profile's rules plus
    `personality` and `role`.
  - **`friend ID` and `lock-friend ID --seed S [--force]`:** a friend's
    character sheet. These follow `child` and `lock-child` exactly: four
    seeds, set by set, resumable, locked from a staged copy under the one
    lock.
  - **A personal story's cast** may name friends, and the mixing rule.
  - **`book-page`** takes a friend's locked sheet as a reference.
  - **`selftest` also checks** every friend profile, every friend lock, and
    that no two characters share a name.
- `storybook/tools/test-story-recipe.py`: the cases under Settling Evidence.
- New folders, each made on first use:
  `storybook/design-source/friends/drafts/` and `.../locked/`.
- `.github/workflows/storybook-quality.yml`: the comment only, if it names
  what `selftest` covers.
- This contract.

### Must Not Change

- **The canon and its commands:** `character`, `lock`, `page`,
  `lock-page`, their templates, settings and recipe formats. Every existing
  lock rebuilds exactly as now.
- **The hero's commands:** `child` and `lock-child`, the child profile
  check, and Kennedi's and Leo's profiles. Kennedi's look changes only
  through child-hero Amendment 5.
- **The child sheet template.** Friends use it as it is (below).
- **The bedtime stories:** `storybook/stories/` and its plan check.
- **`bedtime_broadcast`:** not read, written, imported or called.
- **No real child.** Every friend is invented. Real customers' children
  never go into this repo, as the child-hero contract says.

## Behaviour

### A Friend Profile

A friend profile is a child profile with two more keys.

| Key | Rule |
|---|---|
| `name`, `child`, `age`, `appearance`, `source` | exactly the child profile's rules (child-hero contract, "A Child Profile") |
| `personality` | a non-empty single-line phrase of at most 200 characters |
| `role` | exactly `"friend"` (in many books) or `"met"` (met along the way, in one or two) |

- **No other keys.** The file name is the id: lowercase words joined by
  hyphens, as for a child.
- **`personality` and `role` are for whoever writes stories.** Neither
  reaches a prompt. Like a hero's appearance, a friend's look never changes
  the plot, and their personality never changes how they are drawn.
- **A friend is never a hero, and a hero is never a friend,** in this slice.
  `child` and `book-page` refuse a friend's id as the child. `friend`
  refuses a child's id.
- **Every name is unique.** No two friends, and no friend and canon
  character, share a name, compared without regard to case. `selftest` and
  every command that reads friends refuse a clash.

### The Four Friends (part of what you accept)

The roster you approved, with eyes and shoes added so a full-body sheet
fixes them. Change anything.

| Key | Maya | Theo | Sora | Ravi |
|---|---|---|---|---|
| child, age | girl, 5 | boy, 4 | girl, 6 | boy, 5 |
| skin | deep brown skin | fair skin with light freckles | light skin | medium brown skin |
| hair | black hair in two round puffs, each tied with a yellow ribbon | short curly copper-red hair | a straight black chin-length bob with a small red clip | short wavy black hair |
| eyes | dark brown eyes | green eyes | dark brown eyes | dark brown eyes |
| outfit | a yellow raincoat over a teal dress, and yellow rain boots | a striped blue-and-white shirt, brown overalls and brown boots | a lavender dress with big pockets, and white sneakers | a sky-blue hoodie, grey shorts and white sneakers |
| glasses | false | false | true | false |
| personality | the bold one, always first down the path | the quiet collector, with pockets full of pebbles and feathers | the planner, who carries a folded map | the joker, who makes up silly songs |
| role | friend | friend | friend | friend |

- Each friend's skin, hair and colours differ from Kennedi's and Leo's, so
  any two can share a page and still be told apart.
- **Sora's glasses** are drawn as the template's "round glasses". The
  proposal's red frames have no slot in the template, so they are dropped.
- **Skin wording follows what the Kennedi probes measured** (2026-10-06 and
  07): a plain colour ("deep brown", "medium brown", "light", "fair"), no
  "golden" or "warm". Those words drew Kennedi pale whatever came after them.

### Friend Sheets

- **The prompt is the child sheet template, at the version the hero uses**
  (`CHILD_TEMPLATE`, v1 today). So a friend and the hero look like they came
  from the same book.
- If child-hero Amendment 5 adds a template version or a step to take the
  blush off, friends get the same version and step, since they share the
  template. A friend's lock records its template version, like a child's.
- **Render settings:** `RENDERS` v1, seeds 61, 72, 83 and 94.
- **The recipe records** the friend's whole profile, so editing it fails the
  friend's lock until it is re-locked on purpose.
- **Files:** `design-source/friends/drafts/<id>-candidate-<seed>.png`,
  `<id>-contact-sheet.png` and `<id>-recipe.json`; the lock is
  `design-source/friends/locked/<id>.png` and `<id>.recipe.json`.
  `selftest` fails a recipe whose friend doesn't match its file name.

### A Personal Story's Cast, and the Mixing Rule

- **A page's cast** holds one to three different members (the edit model
  takes three references). Each is `{child}`, a canon character's name, or
  a friend's name.
- **The mixing rule.** A personal story fails its check unless:
  - at least one page's cast has a friend; and
  - at least one page's cast has a canon character.

  So "a kid and a bunch of animals" can't pass, and neither can a book with
  no animals.
- **The hero can't share a name with anyone in the story's cast,** friend or
  canon. Today's rule already refuses a hero named Pippa in a book with
  Pippa. It now also refuses a hero named Maya in a book with Maya.
- All other personal-story rules are unchanged: the slots, `{child}` on at
  least one page, a page that fills in the child must cast `{child}`.

### The Proof Story, Revised (part of what you accept)

`meeting-pippa` fails the mixing rule as it is: it has no friend. Rather
than write a second proof story, Maya replaces Bramble on page 3. Page 3
then shows the hero, a friend and an animal together, which is the proof the
plan asked for, and the book still renders four pages, not eight.

Paragraph 3 becomes:

> Then {possessive} friend Maya came running down the path, first as
> always, with her little lantern. "The softest moss grows by the Berry
> Brook," she said. So they walked there together, and {name} touched moss
> as pale and fine as silver silk. Pippa giggled beside {object}.

| Page | Cast | Place | Time | Scene |
|---|---|---|---|---|
| 3 | {child}, Pippa, Maya | a mossy rock near the Berry Brook | dusk | {name} kneels at a mossy rock, gently touching moss pale and fine as silver silk, with tiny Pippa sitting on the rock beside {object} and Maya standing nearby holding her small lantern |

- Paragraphs 1, 2 and 4, the title, the season and pages 1, 2 and 4 are
  unchanged.
- The story's `content_sha256` is recomputed, and its `source` records this
  contract.
- No book page is locked yet, so nothing locked changes. Bramble stays in
  the canon and in Pippa's bedtime story.

### Book Pages With Friends

- **In `<cast>`, a friend is "the boy" or "the girl"**, like the hero:
  "Kennedi is the girl in picture 1, Pippa is the dormouse in picture 2 and
  Maya is the girl in picture 3".
- **References, in picture order:** each one's kind (`child`, `character` or
  `friend`), its id, and the SHA-256 of its locked sheet. A friend's sheet
  comes from the friends' locks.
- **`book-page` renders only from sound sheets.** A friend in the cast needs
  a locked sheet that passes its lock checks, read once under the lock.
- **A book page lock fails** until it is re-locked on purpose when a
  friend's lock changes, as for the child and the animals.
- Everything else is the child-hero contract's "Book Pages" section as it
  is, including the reference fingerprints that #155 checks.

### Threat Model and Concurrency

The same as the earlier slices: one operator, one machine, and one lock on
the storybook root for every write. `friend` and `lock-friend` take it.

### Failure Cases

Each case exits before anything is written:
- an unknown friend;
- a friend profile that fails its check (any rule above, including a
  `role` other than "friend" or "met");
- two characters with the same name;
- a child's id given to `friend`, or a friend's id given to `child` or
  `book-page` as the child;
- a personal story with no friend in any cast, or no canon character in any
  cast;
- a cast naming someone who is not `{child}`, a canon character or a
  friend;
- a hero whose name is also the name of anyone in the story's cast;
- a friend in a page's cast with no locked sheet, or with a sheet that fails
  its lock checks;
- every existing case for children and book pages.

### Known Risks, Read at the Real Renders

- **Two children on one page may blend:** Maya's yellow ribbons on
  Kennedi's pigtails, or the same face twice. Page 3 is where this shows.
- **Skin:** Ravi's "medium brown" is new wording. Kennedi's probes showed
  this model drifts pale on mid tones.
- **Blush:** today's template draws pink cheeks on every child. Friends
  follow whatever Amendment 5 settles for Kennedi.
- **Sora's glasses** may come and go, as Leo's may.

## Settling Evidence (planned)

- **Tests against the fake ComfyUI:**
  - `friend`, then `lock-friend`, then `selftest`, end to end, for a girl
    and a boy. The prompt is the child template's, and the recipe records
    the whole profile.
  - **The friend profile check, on both sides:**
    - accepts `role` "friend" and "met", and a 200-character personality;
    - refuses `role` "Friend", "hero", "" or missing; a missing, empty,
      multi-line or 201-character personality; an extra key; and every
      child-profile refusal (one case each, since they share the check).
  - **Names:** a friend named "Pippa", and two friends both named "Maya"
    (one as "maya"), each fail `selftest` and refuse `book-page`.
  - **No crossing over:** `friend kennedi`, `child maya`, and `book-page`
    with `maya` as the child are each refused.
  - **The mixing rule:** a personal story with no friend fails; one with no
    canon character fails; one with both passes. A cast naming an unknown
    "Zara" fails.
  - **A hero named Maya** in a book with Maya is refused.
  - **`book-page` with a friend, end to end:** the uploads are the child's,
    Pippa's and Maya's locked sheets, byte for byte, in picture order; the
    prompt reads "Maya is the girl in picture 3"; `lock-book-page` and
    `selftest` pass.
  - **A book page lock fails `selftest`** after Maya is re-locked, and after
    her profile is edited.
  - Existing character, page, child and book page locks rebuild exactly as
    before, and every earlier case still passes.
  - **Mutation testing on the new checks:** each check broken on purpose
    fails a test.
- **`selftest` on the real storybook** passes with the four friends and the
  revised proof story.
- **GPU work, in an overnight window, after Kennedi's look settles:**
  - the four friends' sheets, four × four seeds (about half an hour), then
    your picks;
  - `meeting-pippa` page 3 for Kennedi (about 26 minutes for four seeds),
    read for blending, skin and scale.

## Not Addressed

- **Kids met along the way.** The `role` exists; no such kid is written yet.
- **Leo as a friend** in Kennedi's book, or any hero appearing in another
  hero's book.
- **Real orders whose child shares a friend's name.** This slice refuses
  that book. Swapping in another friend is a later rule.
- **Crowd scenes** of four or more characters on one page.
- **The personal-story writer**, and choosing which friends a book uses.
- **The free daily ebook** and `bedtime_broadcast`.

## Contract Amendments

None yet.

## Verification

Filled in when the slice is built.
