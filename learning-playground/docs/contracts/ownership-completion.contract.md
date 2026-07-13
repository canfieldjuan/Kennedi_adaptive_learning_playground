# Ownership Completion Contract

## Purpose

Learning should give the child meaningful agency inside a play world. The app
must not merely dress answer selection in scenery and call it play. A primary
game finishes with a visible result that exists because of the child's action,
reflects the child's choices, and remains available long enough to feel owned.

This contract governs new primary games and every maturity pass over an
existing primary game. It does not change curriculum, mastery, transfer,
parent approval, or evidence rules.

## Child Principle #1: Transformative Agency

**The child should change the world, not merely answer questions about it.**

The learning concept should be embodied in an action whenever the play fantasy
supports one:

- put five stars into the sky instead of only counting displayed stars;
- feed a bear two cookies instead of identifying which bear wants two;
- pack B-sound objects into Pip's backpack instead of only tapping a B word;
- build a snowman from circles instead of only finding a circle;
- build a concrete word and let that word alter the scene instead of only
  accepting the letter sequence.

An activity may still contain constrained choices, checks, or spoken questions.
The primary child action must nevertheless create, place, repair, arrange,
deliver, transform, or direct something in the game world when a coherent
embodied action exists. Do not force decorative transformations onto abstract
concepts when they would obscure the learning truth.

## Child Principle #2: Ownership Completion

**Completion should create ownership, not payment. The child should finish
with something she made, changed, personalized, or placed into the world.**

A compliant primary-game completion answers all four questions:

1. What exists at the end that did not exist at the beginning?
2. What part of it reflects the child's unscored choice?
3. Can the child see and inspect the result before the game moves on?
4. Can the child revisit it without earning access again?

Points, stars, currency, streaks, loot, unlock meters, or a generic celebration
do not answer these questions. They may acknowledge completion only where the
reward and safety contracts permit; they cannot substitute for the thing the
child made.

## Completion Object

Every primary game must define a completion object: the smallest structured
state that can faithfully reproduce the child's finished result.

Examples include:

- a cafe order with its exact food, quantities, packaging color, sticker, and
  stamp;
- a word-stage scene with the built word, resulting object, and chosen
  placement or detail;
- a train journey with the exact loaded passengers or cargo, conductor choice,
  route, and destination;
- an artwork with its actual surface, fills, marks, and sticker placements;
- a story with its selected ingredients, ordered choice path, and ending.

The completion object is not a score and is not a second progress system. It is
the source of truth for payoff and preservation.

## Exact-Choice Continuity

The result must preserve the child's exact choices through the entire payoff.
The delivery, journey, gallery, shelf, album, or ending must render from the
same completion object produced by play.

Do not replace the result with a generic asset at handoff. If the child chose a
purple bag, moon sticker, and star stamp, the customer receives that bag. If
the child loaded fourteen passengers and chose a red flag, the departing train
shows fourteen passengers and the red flag. If the child painted a green sky,
the gallery keeps the green sky in the positions the child painted it.

An approximate reconstruction is non-compliant when it changes or discards a
choice visible in the completed work.

## Customization Rules

Ownership choices are:

- **chosen, not randomized** — random scenery variation is allowed, but access
  to colors, stickers, placement, or other expression is not randomly granted;
- **expressive, not scored** — no color, sticker, arrangement, or style is
  better, worth more, or treated as skill evidence merely because it was
  preferred;
- **available without streaks or currency** — expression belongs to the
  activity, not an economy layered over it;
- **connected to what the child created** — decorate the delivered bag, train,
  page, picture, word scene, or story rather than paying out a disconnected
  sticker chest;
- **preserved long enough to admire or revisit** — the finished result is not
  immediately wiped for the next round.

## Bounded Enrichment

The default task-oriented game rhythm is:

```txt
one core learning action -> one or two ownership actions -> one payoff
```

Ownership must deepen the play without turning completion into chores. Bear
Cafe and Number Train should keep packaging and decoration light. Art Studio
and Story Stage may support longer open-ended creation because creation is the
primary action.

Every additional ownership step needs a clear connection to the completion
object. Remove steps that exist only to extend session time.

## Child-Controlled Finish

After payoff, the finished result remains visible until the child chooses a
large, clear action such as Deliver, Add to Book, Done, Home, Play Again, or
Next. Do not automatically wipe a completed creation or start another round.

The child must have a quiet inspection moment. Motion is bounded, calm, and
reduced-motion-safe; inspection does not autoplay into another activity.

## Preservation and Revisit

Preservation is local-first, bounded, and included in the app's existing
export and clear-data boundaries. A game may use:

- a capped pure view over an existing durable event record when that record
  contains enough exact state to reproduce the result; or
- a narrow non-evaluative local record when expressive state does not belong in
  assessment evidence.

Preservation does not require permanent retention of every tiny action. It does
require a bounded child-facing collection such as a cafe order wall, word
stage, route map, art gallery, photo book, or story shelf when revisit adds
meaning. Revisit never requires points, replaying a lesson, or earning access
again.

Malformed or stale stored completion objects fail safely. Collections must be
capped and must not grow without limit.

## Evidence Boundary

Core learning actions continue to emit the existing approved evidence shape.
Ownership state must not create a second progress system or alter mastery,
transfer strength, difficulty, recommendation weight, or correct answers.

Expressive choices may be preserved as non-scored metadata only when existing
evidence consumers ignore them by contract. Otherwise use a separate narrow
non-evaluative record. Never emit correct, incorrect, hint, mastery, or trait
claims for a preference.

The child may stop after completing the learning action without being marked
wrong because an optional expressive action was skipped. A game may provide a
safe default in the completion object, but the child must still have a real
unscored choice during the primary-game experience.

## Acceptance Test

A primary game is ownership-complete only when automated and visual checks
prove:

- the learning action visibly changes world state;
- at least one unscored choice appears in the completion object;
- the same completion object drives the payoff and preserved view;
- the exact visible choices survive delivery, transition, and revisit;
- the result remains on screen until a child-controlled action;
- revisit works without currency, streaks, randomness, or repeated labor;
- expressive choices do not affect scoring or learning evidence;
- persistence is local, bounded, exportable, clearable, and malformed-data
  safe;
- the flow stays preschool-safe and does not add physical difficulty, time
  pressure, clutter, or reading dependency.

Browser verification must cover the completed result before transition and the
same result after revisit on desktop and mobile. Structural tests alone cannot
prove exact visual continuity.

## Rejection Tests

Reject or redesign a primary-game change when:

- the child only selects an answer and no meaningful world state changes;
- completion produces only praise, stars, confetti, currency, or an unlock;
- customization is randomized, scored, gated, or disconnected from the work;
- the payoff substitutes a generic object for the child's completed object;
- the result disappears automatically;
- expressive choices influence mastery or recommendations;
- ownership steps outweigh the central play action;
- the collection grows without a cap or leaves local export/clear boundaries;
- the game calls an approximate reconstruction the child's exact creation.

## Adoption Gate

Every new primary game must satisfy this contract before child launch. Game
intake and maturity work must name the completion object, ownership choice,
payoff continuity, preservation surface, evidence boundary, and bounded-flow
budget in their written change contract.

Existing primary games are not grandfathered in as compliant. Their current
behavior must be audited from code and retrofitted through small game-owned
slices. A permanent contract does not authorize one broad cross-game rewrite.
