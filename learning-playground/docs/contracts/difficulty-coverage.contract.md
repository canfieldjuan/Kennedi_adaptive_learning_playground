# Difficulty Coverage Contract

## Purpose

Difficulty coverage explains whether the approved activity catalog can produce
evidence for a curriculum rung. It reports the fit of the content library; it
does not measure or label the child.

## Source Of Truth

- Curriculum rung difficulty bands come from the loaded curriculum graph.
- Approved playable content comes from `APPROVED_ACTIVITIES`.
- Activity difficulty boundaries are inclusive.
- Declaring a curriculum rung does not prove that playable content exists for
  that rung.

## Evaluation

For a known skill and exact declared current level, evaluation reports:

- current rung label and difficulty band
- approved activity IDs in that band
- covered rung count and total rung count
- every missing rung and its difficulty band
- `covered` when the current rung has at least one approved activity
- `blocked_by_content_gap` when the current rung has none

An unknown skill or undeclared level returns no evaluation. It must not be
silently coerced to another rung.

## Parent Experience

- Difficulty coverage is parent-only evidence.
- A blocked rung is described as missing approved content, never as the child
  being behind, failing, or unable.
- Existing mastery, transfer, recommendation, approval, and active-guidance
  behavior remains independent and unchanged.
- Coverage information never creates, launches, applies, or routes to content.

## Child Safety

- Difficulty coverage is never rendered in child mode.
- No reward, streak, rank, timer, pressure language, or automatic adaptation is
  introduced by coverage reporting.
