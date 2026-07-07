# Mastery Contract

Mastery is evidence-based fit information for the parent. It is not a ranking, score, age label, or permanent judgement of the child.

## Requirements

- Mastery evaluation must cite local evidence sources.
- Single-context fluency must be represented as `single_context_fluent`, not `likely_mastered`.
- Repeated success in only one approved transfer context may reach `single_context_fluent`, but must not become `likely_mastered` or `mastered`.
- Mastery requires transfer evidence before `mastered`.
- `likely_mastered` requires successful evidence from at least two approved transfer contexts.
- `likely_mastered` requires at least one successful medium or strong transfer context.
- Weak-only transfer contexts must not produce `likely_mastered`.
- `mastered` requires likely-mastered evidence plus retention or parent-observed real-world transfer evidence.
- Regression can lower a previously stronger status.
- Recommendations must stay parent-controlled and must not auto-apply difficulty changes.
- Evidence language must avoid comparison, shame, rankings, streaks, gifted labels, or age-equivalent labels.
- Parent-visible mastery snapshots must be stored locally when the Parent Panel reviews a skill.
- A mastery snapshot must cite source event IDs or parent observation IDs.
- Mastery snapshots must be included in local export and cleared by clear progress.
- Persisting a mastery snapshot must not change child routing or apply a recommendation.

## Statuses

- `not_started`
- `introduced`
- `practicing`
- `single_context_fluent`
- `transfer_ready`
- `likely_mastered`
- `mastered`
- `needs_review`
- `regressed`
- `blocked_by_content_gap`

## Recommended Actions

- `introduce`
- `practice`
- `increase_difficulty`
- `test_transfer`
- `schedule_review`
- `add_support`
- `pause_skill`

## Parent Snapshot Interface

```ts
export interface ParentMasterySnapshot {
  snapshot_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  previous_status: MasteryStatus;
  next_status: MasteryStatus;
  confidence: number;
  recommended_action: RecommendedMasteryAction;
  reason: string;
  evidence_summary: string;
  skill_graph_rule: string;
  source_event_ids: string[];
  source_observation_ids: string[];
  created_at: string;
}
```
