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

| Mode | Ask | Skill evidence |
|---|---|---|
| `free_decorate` | "Make Baby Polar Bear a picture." | creative choice — no wrong answers; selections logged, completion on Done |
| `color_request` | "Baby Polar Bear wants pink." | color recognition: requested vs selected, hints, response time |
| `quantity_decorate` | "Add 3 stars." | counting: evaluated only on Check, over/under recorded, hint never auto-fills |
| `pattern` | "Make pink, yellow, pink, yellow." | color sequencing (color_fill level 2 "combined orders"): per-position correctness, self-correction |
| `fix_art` | "Oops — that star should be yellow." | error detection + correction: mismatch found and repainted |

## Hard rules

- One event system: `ActivityAttemptEvent` via `appendEvent`. No second
  progress store. Incorrect work never emits `completed`.
- Evidence is honest: quantity modes never evaluate per tap; free modes
  never emit correctness they didn't measure; skills named on an event are
  the skills the round actually exercised.
- Curriculum discipline: studio activities map to existing graph skills
  (`color_fill`, `counting`). New skills enter the graph only through an
  explicit, tested graph change — never casually from content.
- Safety: local inline SVG art only; no external links, open web, ads,
  sharing, generated images, camera, or microphone. Parent approval
  required on every activity. Adaptation stays parent-approved only.
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
