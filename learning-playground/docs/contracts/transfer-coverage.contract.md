# Transfer Coverage Contract

Transfer coverage is the bridge between mastery evidence and approved content breadth. It tells the parent when a skill looks strong in one context, when another approved context is available, and when the app lacks enough approved transfer content to prove mastery honestly.

## Requirements

- Every activity must declare transfer metadata.
- Every activity transfer `skill_id` must match an activity `skill_id`.
- Every skill used by an activity must have planned transfer context types in the curriculum graph.
- Single-context fluency must not equal mastery.
- `likely_mastered` requires successful evidence from at least two approved transfer contexts.
- `mastered` requires transfer evidence plus later retention evidence.
- Content gap recommendations must cite the missing context type.
- Parent approval is required before a transfer recommendation is treated as approved.

## Non-Scope

- No backend content service.
- No open web content.
- No mass-generated activities.
- No automatic child-facing routing.
- No rewards, streaks, rankings, or pressure loops.
