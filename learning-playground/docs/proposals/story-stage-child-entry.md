# Story Stage child-entry proposal (spec §22)

**Status: awaiting owner decision — nothing here is implemented.**
Story Stage currently has a direct route (`#story-stage`) and a Parent
Panel launch card; the child home grid is untouched, per the arc's
"do not silently change the home-screen contract" rule. This document
is the required comparison so the entry decision is made deliberately.

## The ground truth today

- The child home is a 2×2 `home-grid` (max-width 600px) over the
  softened cafe backdrop: **Words** (pink), **Cafe** (blue), **Math**
  (green), **Art** (orange). Each card is icon + one-word label +
  spoken label on tap.
- The whole home fits one screen at 1366×900 and at 390×844.
- Story Stage is a complete, verified experience (7 slices: Pick Three
  setup, three families × five characters × four settings, Tell Me a
  Story / Tell It Together, story history) — it is ready to be found
  by the child, not just launched by a parent.

## Option A — fifth child home choice

Two shapes were considered:

**A1: five equal tiles.** A 2×2 grid plus one orphan tile. The odd
fifth tile either dangles alone on its row (reads as an afterthought)
or forces a 3+2 / single-column rearrangement that shrinks every tap
target. Weak on visual hierarchy and one-screen fit; not recommended.

**A2: Story as a featured wide card (recommended shape).** The 2×2
grid keeps its symmetry; a fifth card spans both columns
(`grid-column: 1 / -1`) above or below it, carrying the story-room
identity (valance purple, Poppy + Biscuit vignette).

- **Desktop layout:** trivially fits inside the 600px column; the wide
  card reads as a distinct "story time" band, not a fifth clone.
- **Mobile layout (390×844):** the grid currently uses well under the
  viewport height; one added band (~120–140px at mobile card sizing)
  keeps the home on one screen. Must be verified with a capture at
  implementation time, per the standing capture pass.
- **One-screen fit:** holds in both viewports (to be pinned by the
  existing mobile-child-ui tests when implemented).
- **Visual hierarchy:** the wide card is intentionally MORE prominent
  than the four square tiles. That prominence is defensible: Story
  Stage is the only creative, non-evaluated surface, and the wide band
  frames it as "story time" rather than "fifth lesson".
- **Featured wider card?** Yes — that is exactly this variant.
- **Navigation cost:** zero. One tap from home, same as every game —
  the decisive point for a preschool non-reader.

## Option B — child-facing game shelf / More Games entry

- **Extra navigation cost:** one more tap AND one more concept: a
  "More" meta-tile is an abstraction, not a game. A non-reader has to
  learn that one specific door hides other rooms.
- **Discoverability:** Story Stage would be the ONLY game behind the
  door — the newest experience gets the worst placement. Real risk it
  simply isn't found without an adult.
- **Future scalability:** the genuine strength. At 6+ games a shelf
  (or paged home) becomes the right structure, and the home contract
  will need renegotiating anyway.
- **Complexity now:** a new child-facing navigation level, a new safety
  surface to test (shelf route, empty states, back behavior), new
  contract tests — all to hold exactly one item today.

## Recommendation

**Option A2 — Story Stage as a featured wide card on the child home —
now; adopt the shelf only when a sixth child game makes it necessary.**

Rationale in one line: at five games, a preschooler's discoverability
beats architectural generality — a shelf that holds one game buys
tomorrow's scalability with today's findability.

Implementation sketch (NOT done, ~1 small slice when approved):
`HOME_OPTIONS` entry routing to `#story-stage` with a
`.home-card--wide` variant (`grid-column: 1 / -1`), illustrated story
vignette, spoken label "Story Time"; home contract + cohesion +
mobile-viewport test updates; capture pass both viewports. No existing
game moves or shrinks below its current tap size; nothing is removed
(per §22, removal would need explicit owner approval — none is
proposed).

Decision needed from Juan: approve A2 (a follow-up slice implements
it), pick Option B instead, or keep the current parent-launched-only
state.
