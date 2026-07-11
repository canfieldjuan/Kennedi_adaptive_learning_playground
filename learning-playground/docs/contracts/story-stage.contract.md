# Kennedi's Story Stage Contract

## Purpose

A local storytelling system that composes coherent authored stories from
child-selected ingredients (character, place, problem), presents meaningful
narrative decisions, narrates complete stories when needed, and supports
adult improvisation — without generative AI, cloud calls, or recording.

Two family contexts are first-class:

1. **Tell Me a Story (default)** — the game narrates every scene, shows it,
   asks what should happen next, and reaches a complete ending. The adult
   only launches the game and stays nearby. No improvisation required, no
   adult writing prompts shown.
2. **Tell It Together** — the same story content, art, decisions, and
   branches, but each scene presents the adult a concise storyteller cue
   (the beat, the fact that must stay true, a question to ask Kennedi,
   optionally one silly detail) instead of auto-narration. An adult-only
   control can always reveal/play the authored narration — the session can
   never strand because the adult is stuck. Mode is a parent setting
   (defaults to narrated), never a child-facing reading-heavy selector.

## Story shape

Stories are AUTHORED FAMILIES with controlled compatible substitutions —
never sentence-fragment mad-libs. A play-through is ~5–6 short scenes:
intro → problem → decision → consequence + obstacle → decision → clear
resolution. Exactly two illustrated choices per decision; every choice
causes a visible, narrated consequence before any branch convergence; every
reachable path ends; no cycles, no dead scenes, no fake choices. Same
setup + same choices ⇒ same story.

## Hard rules

- **Creative choices are not assessments.** The runtime emits no attempt
  events, no correct/incorrect/hint outcomes, no mastery/transfer/
  difficulty evidence. Story Stage is registered as its own route, NOT a
  catalog activity, so it cannot join coverage/transfer/recommendation
  machinery even by accident.
- **Story history (when built) is non-evaluative**: session id, mode,
  family, selections, choice path, ending, timestamps, completion status —
  nothing interpretive, no audio, no adult improvisation, no trait
  inference. Local only; included in parent export; removed by clear-data.
- **Narration** uses the existing local speech service only: one short
  beat per scene, no overlap, Repeat replays, scene changes stop speech,
  Home cleans up, no autoplay between scenes. Playable with speech off
  (the concise on-screen caption is readable by the adult).
- **Safety tone**: missing friends are safe, broken things get fixed or
  transformed, obstacles are gentle, safety is restored clearly. No death,
  violence, threats, abandonment, humiliation, punishment, or shame.
- **Copyright**: original characters and broad archetypes only. No branded
  names, designs, or fan art. (Future seam: private parent-supplied
  character packs — documented, never bundled.)
- **Visual standard**: local inline SVG in the playground's illustrated
  style (ink outlines, warm flat fills); decorative layers `aria-hidden`
  and `pointer-events: none`; reduced-motion guarded; the picture must
  communicate the scene before the narration does.

## Future seams (documented, not built)

Authored story-pack model + pure validator (slice 2); Pick Three setup
(slice 3); the Lost Friend / Broken Thing / Special Delivery families with
an original content pack (slice 4); Tell It Together + parent mode setting
(slice 5); story history + Recent Stories parent section (slice 6); the
story-room visual pass + the fifth-tile vs game-shelf child-entry proposal
(slice 7); parent-recorded narration clips (post-arc, needs owner call).
