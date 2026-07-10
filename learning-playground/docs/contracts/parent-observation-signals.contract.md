# Parent Observation Signals Contract

## Purpose

Parent observations describe how well the learning experience fit the child.
They are not grades, diagnoses, rankings, or substitutes for child responses.

## Categories

New observations may use one of these parent-only categories:

- General note
- Independent success
- Needed support
- Too easy
- About right
- Too hard
- Frustration
- Real-world transfer

An observation may apply to the whole session or to named curriculum skills.
These fields are additive; legacy free-text observations remain valid.

## Evidence Boundary

- Structured `independent_success` and `real_world_transfer` may contribute
  parent-observation evidence only to explicitly tagged skills.
- Structured fit, support, frustration, and general categories do not become
  positive mastery evidence, even when their prose names a skill.
- A parent observation alone cannot start or master a skill.
- Legacy observations retain their original note-to-skill matching behavior.

## Interpretation Boundary

- Structured needed-support, too-hard, and frustration signals affect only their
  tagged skills, or the whole session when no skill is selected.
- Legacy and general notes retain the existing frustration-keyword fallback.
- Categories do not auto-apply difficulty, route the child, or change mastery
  thresholds.

## Safety And Data

- Observation controls and labels are parent-only.
- All fields remain local and are included in the existing export/reset paths.
- No backend, account, cloud sync, analytics, or storage migration is required.
