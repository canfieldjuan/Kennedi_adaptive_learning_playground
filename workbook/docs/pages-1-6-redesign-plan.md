# Pages 1-6 redesign plan (2026-09-12)

Rebuilds Pages 1-6 from "functioning technical prototype" into an approved
workbook: real educational progression, one primary skill per page, the
locked Concept C Boss Kennedi + Floppy-Ear puppy art (see
`docs/design-system.md`'s Art Direction v2 and `docs/art/asset-provenance.md`)
replacing the old programmatic `illustrations/boss-kennedi.mjs` figure
everywhere it currently appears on a real page.

Architecture, build pipeline, page-module contract (`meta` + `render()`),
shared components (`pageShell`, `bossMissionBox`, `pictureChoiceRow`,
`tracingWord`, `handwritingLine`, `rewardStar`, `illustrationFrame`,
`drawingBox`), 0.5in safe margin, and pure-black-ink rule are all
**preserved as-is** -- nothing here changes the system, only what each page
builds from it. See "Shared-infrastructure changes" below for the two small,
justified exceptions.

## What's wrong today (confirmed by rendering + reading every current page,
not just source)

- **Page 1**: primitive circle/rect Kennedi, small, off-center; scattered
  tiny animals. The approved full-color hero scene
  (`design-source/scenes/cover-concept-c-final.png`) already exists and is
  dramatically stronger -- proven in the (unwired) `dist-proof/page-01-proof.png`.
- **Page 2**: "Circle your boss badge" (badge/heart/basketball) is an
  arbitrary quiz with no connection to name-writing, the page's actual job.
  Tiny decorative Kennedi icon, mismatched ruled-line styles left over from
  iteration.
- **Page 3** and **Page 5** both trace BOSS/boss and both have a "circle the
  boss" activity -- pure duplication. Page 3's "Draw yourself being the
  boss" prompt has no connection to the "I am the boss" read-aloud.
- **Page 4**: 5 abstract line-practice rows with no start/destination, one
  separate "boss mission" row bolted on with mismatched visual treatment.
  Exactly the "not a maze, but also not a journey" problem in the brief.
- **Page 5**: "FIND IT" choice row is badge/apple/shoe/dog -- none of those
  besides badge start with B. No actual phonics/letter teaching happens
  despite the page being the closest thing to a "letter" page in the book.
  A second, unrelated "what does a boss use to make a plan" quiz
  (clipboard/hook/sock) is bolted on below.
- **Page 6**: 7 stacked sections (word reveal, say it, trace it x2, write
  it, who-needs-help choice row, boss-mission choice row, finish-the-
  sentence, reward star) on one sheet. Confirmed in the rendered screenshot:
  everything above the fold is cramped and small; the bottom ~35% of the
  page is empty whitespace. This is the page named in the brief as the
  worst offender and it reproduces at full size on screen.

## Shared-infrastructure changes (small, apply to all pages)

1. **`src/content/asset-inline.mjs`** (moved up from
   `content/proof-pages/asset-inline.mjs`, which no longer describes its
   scope -- both the proof pages and the real pages now use it):
   - `inlineSvgFile(path)` -- unchanged, already used by the page-6 art
     proof.
   - `inlineImageFile(path)` -- **new**. The page-1 art proof embedded the
     cover PNG via `<img src="${absoluteFilesystemPath}">`. That resolves
     fine under `file://` on the machine that built it, but bakes a
     machine-specific absolute path into a committed `dist/` file --
     it breaks on any other checkout path/machine/CI, which contradicts
     render.mjs's own stated goal ("every generated file works standalone
     ... opens directly via file://"). Fixed the same way fonts already are:
     base64 data URI, so the raster hero art travels with the HTML.
2. **`scripts/preview-page.mjs`** (new, reusable for pages 7+ too): renders
   + screenshots + spot-verifies ONE page module (console/page errors,
   overflow, title-in-document) without registering it in `book-1.mjs` or
   touching `dist/`. Lets a page author iterate on a single new/edited page
   before wiring it into the real book, per design-system.md step 4.
   `node scripts/preview-page.mjs src/content/pages/<file>.mjs`.

Both changes verified: `node scripts/build-art-proof.mjs` still succeeds
(exercises the moved `inlineSvgFile` import from both proof-page callers),
and `node scripts/preview-page.mjs src/content/pages/page-01-cover.mjs`
renders/screenshots/passes clean against the *existing* (pre-redesign)
cover page.

## Per-page plan

Each entry: primary skill -> structure (top to bottom) -> assets -> notable
decisions.

### Page 1 -- Cover (`page-01-cover.mjs`, kept name)

No activity (unchanged intent). Structure: eyebrow / title / subtitle /
tagline (unchanged text/CSS) -> full-bleed color hero art
(`design-source/scenes/cover-concept-c-final.png` via `inlineImageFile`,
replacing the `bossKennedi('hero', {crown:true})` + scattered-animals
composition) -> footer (unchanged). The PNG already contains Kennedi +
puppy + bird in one composed, professionally-styled image, so the
`.cover-art` layout simplifies to one centered image instead of 3
independently-placed SVGs, sized via an inline style on the `<img>`
(`max-width:100%; max-height:100%; object-fit:contain`, same pattern the
page-1 art proof already used) rather than a new `components.css` rule --
keeps Page 1 from touching any file Page 2 might also touch in the same
parallel build pass. Verified visually, not assumed.

### Page 2 -- My Name Is Kennedi (`page-02-my-name.mjs`, was
`page-02-belongs-to.mjs`)

Primary skill: name recognition + early name writing. Structure: "My name
is Kennedi." -> one large model of "Kennedi" (`.word-display`, sized to
read as the page's obvious entry point) -> one genuinely large
`tracingWord('Kennedi', { height: ~220 })` (current book default is 150;
this page's whole job is the tracing, so it gets the largest treatment in
the book) -> one generous `handwritingLine({ rows: 2 })` independent
writing area -> a prominent Kennedi illustration (locked pose, e.g.
`02-hero-clipboard.svg` or `03-waving.svg`) with a small name-tag label
next to her. Optional reinforcement: 3-card choice row, "Circle your name,"
text cards "Kennedi" / two clearly different short names (e.g. "Maya" /
"Sam"). `pictureChoiceRow`'s `items` only accepts `{svg}`; rather than
extend a shared component in `activities.mjs` for one page's need (and
risk a concurrent edit racing another page's shared-file change in the
same parallel build pass), Page 2 hand-composes the 3 cards directly in
its own file, reusing the existing `.choice-block`/`.choice-row`/
`.choice-card` CSS classes with a `.word-display.word-display-sm` label
inside each card instead of an svg -- zero shared-file edits, same visual
system. Removes the old badge/heart/basketball question entirely.

### Page 3 -- Meet Boss Kennedi (`page-03-meet-boss-kennedi.mjs`, was
`page-03-i-am-the-boss.mjs`)

Primary skill: listening comprehension + identity language. Structure:
read-aloud "I am Kennedi. / I am kind. / I can make a plan." -> one
illustrated scene: Kennedi sitting+writing (`06-sitting-writing.svg` --
already reads as "making a plan") with a puppy nearby -> activity "Circle
the picture showing Kennedi making a plan," 2-3 card `pictureChoiceRow`:
correct = the sitting-writing scene/pose; distractor(s) = a Kennedi pose
that is clearly NOT planning (e.g. `08-celebrating.svg`). Optional
reinforcement: "Draw one thing you would put in your plan" -> `drawingBox`.
Removes the BOSS/boss tracing and the disconnected "circle the boss" /
"draw yourself being the boss" activities (tracing BOSS now lives only on
Page 5, where it's taught as phonics, not repeated here).

### Page 4 -- Pencil Adventure (`page-04-pencil-adventure.mjs`, was
`page-04-pencil-training.mjs`)

Primary skill: pencil control. Instruction: "Start at the star. Follow the
path." Five rows, each `practiceRow(kind)` flanked by a small start icon
and destination icon (not a separate "bonus mission" row bolted on --
every row gets the same treatment, unifying what was previously "4 generic
rows + 1 special row"):

| kind | start | destination | why |
|---|---|---|---|
| horizontal | pencil (`pencilIcon`) | paper (new small hand-drawn icon, same stroke convention) | straight pencil stroke across a page is the literal real-world motion |
| vertical | bird (`bird('branch')`) | nest (new small hand-drawn icon) | flying up |
| wave | puppy (`puppy('reach')`) | ball (`ballIcon`) | bouncy/playful motion |
| zigzag | Kennedi (`05-pointing.svg`, simplified tier at this size) | clipboard (`clipboardIcon`) | energetic "boss" dash -- this is the brief's explicit "Kennedi to clipboard" pair, replacing the old `curvedTracingPath()`/bonus-mission special case |
| loop | cat (`cat('sleep')`) | cozy bed (new small hand-drawn icon) | a curled sleeping cat visually rhymes with a loop |

The brief names 4 pairs as "such as" examples for 5 row kinds; the 5th
(cat -> bed) is invented from an asset that already exists in `animals.mjs`
-- no new character art. `practiceRow()` in `pencil-practice.mjs` gets
extended with optional `start`/`end` icon slots and a star glyph at the
literal path start (currently a plain dot) -- a shared-module change since
design-system.md invites exactly this ("if an existing pose truly doesn't
fit... add a new export... so the next page can reuse it too"), and no
other page imports `pencil-practice.mjs`, so it carries zero cross-page
conflict risk. Paths get visually larger/bolder per the brief; verified
against the overflow check, not assumed.

### Page 5 -- Boss Begins With B (`page-05-letter-b.mjs`, was
`page-05-word-boss.mjs`)

Primary skill: uppercase/lowercase B recognition (the book's first real
phonics page -- previously this page taught nothing phonetic despite being
the closest thing to one). Structure: "B is for Boss." -> large `B` +
large `b` (`.word-display`-scale, not tracing) -> one
`tracingWord('B', {height: ~140})` + one `tracingWord('b', {height: ~110})`
-> one `handwritingLine({rows: 1})` -> "Circle the pictures that begin
with B": 4-card `pictureChoiceRow` (badge/`bossBadgeIcon`, ball/`ballIcon`,
bird/`bird('branch')`, apple/`appleIcon` as the one non-B distractor) at
full (non-compact) card size so they read as "large, unambiguous." This is
a multiple-correct-answer activity (3 of 4), documented as such in
`meta.correctAnswers`. Removes the second "what does a boss use to make a
plan" quiz entirely -- one skill, one page.

### Page 6 -- Helping Mission (`page-06-helping-mission.mjs`, was
`page-06-word-help.mjs`, **built first as the pilot page**)

Primary skill: understanding/expressing "help." Structure: read-aloud "The
puppy needs help. / Kennedi can help." -> one hero scene combining the
puppy reaching for an out-of-reach ball (`02-reaching.svg`) and Kennedi
kneeling to help (`04-helping.svg`) in one frame -- tells "puppy needs
help -> Kennedi helps" in a single glance instead of a separate
"who needs help" sub-question -> activity "What should Kennedi do?", 3-card
`pictureChoiceRow` at full size: help the puppy (`04-helping.svg`, correct)
/ walk away / hide the ball. Reinforcement (the one allowed): sentence
completion "I can ___." with a large `tracingWord('help')` in the blank --
this replaces the old separate TRACE IT + WRITE IT + FINISH THE SENTENCE
as three separate sections with just the one that actually demonstrates
the word in context. Small `rewardStar` at the close (celebratory, not a
second learning activity, so it doesn't count against "one reinforcement").

**"Walk away" has no locked pose** (the 8 locked poses don't include a
back-turned/walking pose, and the brief's "do not create another character
style or return to the primitive programmatic figure" rules out the old
`bossKennedi('walkAway')` SVG that the page-6 art proof deliberately left
as an old/new contrast). No new character art is generated for this --
that would mean starting the local ComfyUI/FLUX pipeline, which needs the
operator's explicit go-ahead per standing project guidance, and it's out of
this task's stated scope ("Use the locked character assets," not "generate
an additional pose"). Depicted instead as a simple hand-drawn
footprints-leading-away icon (same stroke convention as the existing
`ballBehindBoxIcon()`, which page 6 already has and keeps reusing for the
third choice) -- unambiguous to a preschooler ("going away") without
needing Kennedi's specific figure at all.

## Cross-page decisions

- **File renames**: pages 2/3/4/5/6 get new filenames matching their new
  titles (table above); `book-1.mjs` is rewired to the new files in one
  pass after all six are built and verified, and the superseded old
  `page-0N-*.mjs` files are deleted then (not before, and not by the
  per-page builders, so no two agents ever touch `book-1.mjs` or delete
  a file the other still needs mid-build).
- **`illustrations/boss-kennedi.mjs`** (the old primitive figure) is left
  in place but no longer imported by any of Pages 1-6 -- it's still used by
  `content/proof-pages/page-06-help-art-proof.mjs`'s intentional old/new
  comparison, which is historical record and out of this task's scope.
- Nothing in `dist-proof/`, `docs/art/asset-provenance.md`, or
  `docs/design-system.md`'s existing Art Direction v2 section is rewritten
  by this slice -- it's accurate history of how the assets were produced.
  `design-system.md` gets one addition: marking Art Direction v2 as
  **applied** to Pages 1-6 (it currently reads "NOT yet wired into
  book-1.mjs," which stops being true once this lands).
