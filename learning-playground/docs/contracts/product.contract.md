# Learning Playground Product Contract

## Purpose
Create a private, local-first educational playground for an advanced preschool child.

## Adaptation fit principle
The purpose of adaptation is not to measure the child.

The purpose of adaptation is to continually improve the fit between the child and the learning experience.

When the app reports on progress, it should primarily explain how well the current activities fit the learner - not how the learner compares to an arbitrary standard.

When tempted to add rankings, age-equivalent labels, or "gifted" badges, hold them against that principle and ask: Does this improve the fit, or are we just measuring for the sake of measuring?

Today this playground is for one child. Someday it could support a child with dyslexia, another learning two languages, or one who races through math but struggles with attention. The engine does not have to know what kind of learner they are. It keeps asking one question:

"Is today's learning experience a better fit than yesterday's?"

## Primary user
A 3-year-old child with advanced cognitive ability in selected domains.

## Secondary user
Parent/admin who configures learning packs, reviews AI-generated content, monitors progress, and controls safety.

## Product principles
1. Challenge by mastery, not age.
2. Preserve preschool-safe interaction design.
3. The child should change the world, not merely answer questions about it.
4. Completion should create ownership, not payment: the child finishes with
   something she made, changed, personalized, or placed into the world.
5. Preserve the child's exact choices through payoff and local revisit.
6. Respond to effort, curiosity, and completion without compulsive rewards.
7. Avoid external links, ads, feeds, open search, and autoplay chains.
8. Store child data locally by default.
9. Let the parent approve all generated content before child exposure.
10. Use sessions, not endless engagement.
11. Every activity must be observable, testable, and resettable.

Primary game design and maturity work must satisfy
`docs/contracts/ownership-completion.contract.md`.

## MVP modules
- Home shell
- Puzzle / Logic
- Words / Speech
- Math / Patterns
- Art / Coloring
- Video Vault
- Parent Panel
- Local progress storage

## Explicit non-goals for MVP
- No public accounts
- No social sharing
- No open YouTube
- No cloud analytics
- No speech recognition dependency
- No generative AI directly visible to child
- No infinite progression loop
