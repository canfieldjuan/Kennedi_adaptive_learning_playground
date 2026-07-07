# Transfer Coverage Contract

Transfer coverage is the bridge between mastery evidence and approved content breadth. It tells the parent when a skill looks strong in one context, when another approved context is available, and when the app lacks enough approved transfer content to prove mastery honestly.

## Requirements

- Every activity must declare transfer metadata.
- Every activity transfer `skill_id` must match an activity `skill_id`.
- Every skill used by an activity must have planned transfer context types in the curriculum graph.
- Single-context fluency must not equal mastery.
- `likely_mastered` requires successful evidence from at least two approved transfer contexts.
- Transfer contexts must be assigned a strength tier: `weak`, `medium`, `strong`, or `retention`.
- `same_format_same_examples` and `same_format_new_examples` are weak transfer.
- `different_prompt_mode` and `different_interaction_model` are medium transfer.
- `reverse_mapping`, `category_sort`, and `parent_observed_real_world` are strong transfer.
- `delayed_review` is retention transfer.
- Weak-only transfer must not produce `likely_mastered`.
- `likely_mastered` requires at least one successful medium or strong transfer context.
- `mastered` requires transfer evidence plus later retention evidence.
- Content gap recommendations must cite the missing context type and missing context strength.
- When only weak transfer evidence exists, content gap recommendations must prefer richer missing contexts before more weak variants.
- Weak-only transfer coverage must generate activity variant briefs for richer missing contexts.
- Activity variant briefs must stay parent/build-side and must not become child-visible activities automatically.
- Parent approval is required before a transfer recommendation is treated as approved.

## Non-Scope

- No backend content service.
- No open web content.
- No mass-generated activities.
- No automatic child-facing routing.
- No rewards, streaks, rankings, or pressure loops.
