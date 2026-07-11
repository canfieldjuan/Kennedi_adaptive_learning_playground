# Bear Art Studio Contract

## Purpose

The Art lane is a game, not a worksheet: the child is the artist for the
Bear family. Baby Polar Bear, Mama Bear, and Daddy Bear request art pieces;
the child colors, decorates, counts, patterns, and fixes them. Cognitive
difficulty adapts upward while physical interaction and emotional feedback
stay preschool-safe.

## Core loop

1. A bear asks for an art piece (portrait + icon-first visual request card
   + short spoken prompt).
2. The child works one art board with large swatches/stickers.
3. The game checks the request only when the mode calls for it.
4. The bear reacts (waiting → receiving → happy); evidence is logged.
5. The child takes the next request or goes home.

## Modes (one goal per screen)

| Mode | Ask | Interaction | Skill evidence |
|---|---|---|---|
| `free_decorate` | "Make Baby Polar Bear a picture." | brush + fill + free stickers on the canvas | creative choice — no wrong answers; summarized brush/color/sticker evidence, completion on Done |
| `color_request` | "Baby Polar Bear wants pink." | brush a stroke or fill the subject in the asked color | color recognition: requested vs used color, one attempt per stroke/fill, hints |
| `quantity_decorate` | "Add 3 stars." | place stickers freely; tap one to remove; completes at the asked count | counting: 1:1 placement, requested/placed recorded, per-placement events bounded by the target |
| `story_card` | "What belongs in the story?" | pick the fitting stickers from a pool | vocabulary/category inference |
| `pattern` | "Make pink, yellow, pink, yellow." | guided segments (guided slots stay outside free mode) | color sequencing: per-position correctness, self-correction |
| `fix_art` | "Oops — that star should be yellow." | fill-bucket repaint of the one wrong region | error detection + correction |

**Brush evidence is summarized, never streamed**: one first-mark event, one
event per distinct color used (bounded by the palette), one attempt per
stroke end in judged modes, one completion summary. Never an event per
pointer move.

## Hard rules

- One event system: `ActivityAttemptEvent` via `appendEvent`. No second
  progress store. Incorrect work never emits `completed`.
- Evidence is honest: quantity modes never evaluate per tap; free modes
  never emit correctness they didn't measure; skills named on an event are
  the skills the round actually exercised.
- Curriculum discipline: studio activities map to existing graph skills
  (`color_fill`, `counting`). New skills enter the graph only through an
  explicit, tested graph change — never casually from content.
- Safety: local project-owned art governed by
  `art-production-assets.contract.md`; no external links, open web, ads,
  sharing, unapproved generated images, camera, or microphone. Parent approval
  is required on every activity. Adaptation stays parent-approved only.
- Feedback: no harsh failure, no shame language, no red-X centering, no
  streaks, no reward economy. Incorrect = gentle wiggle + supportive line;
  repeated misses = glow hint. Completion is the only ending.
- Body vs mind: tap targets stay large (≥ 56px) and layouts one-screen on
  phones; difficulty climbs through the ask (match → count → pattern →
  fix), never through smaller targets or faster timers.

## Runtime boundary

`src/modules/bear-art-studio/` owns the studio. It is routed by
`interaction_model: tap_then_place` + `content.game: "bear-art-studio"`.
The legacy `ColoringActivity` (`interaction_model: color_fill`) stays
untouched and reachable for its existing activities and the parent lane.
