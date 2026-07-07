# Activity Variant Brief Contract

Activity variant briefs turn transfer coverage gaps into design-ready work. A brief is not an activity, a game module, or child-visible content. It is a parent/build-side instruction for what kind of approved local activity should be designed next and why.

## Requirements

- A brief must cite the skill, domain, current transfer state, missing transfer context, required strength, reason, suggested game family, suggested activity pattern, and required evidence threshold.
- A brief must only target richer transfer contexts: `different_prompt_mode`, `different_interaction_model`, `reverse_mapping`, `category_sort`, `delayed_review`, or `parent_observed_real_world`.
- A brief required strength must be `medium`, `strong`, or `retention`; weak same-format contexts do not receive design briefs.
- Weak-only transfer coverage must recommend richer briefs before more same-format variants.
- Briefs must be parent/build-side only and must not create child-visible activities automatically.
- Parent approval is required before a brief can be treated as approved design work.
- Parent brief decisions must support `approve_brief`, `hold_brief`, and `archive_brief`.
- Parent brief decisions must be stored locally, included in local export, shown only in the parent panel, and cleared by clear progress.
- The Parent Panel must derive a design queue from the latest decision for each `skill_id` plus `brief_id`.
- The design queue must group briefs as approved, held, or archived without changing raw decision history.
- The design queue must stay parent-only and must not create child-visible activities automatically.
- Later implemented activities may reference a brief with `originating_brief_id` without requiring existing activity JSON to migrate.
- A later implemented rich transfer activity must satisfy `docs/contracts/transfer-context-truth.contract.md` before its context can count as stronger transfer evidence.
- Briefs must not contain external links.

## Interface

```ts
export interface ActivityVariantBrief {
  brief_id: string;
  skill_id: string;
  domain: LearningDomain;
  current_transfer_state: string;
  reason: string;
  required_context_type:
    | "different_prompt_mode"
    | "different_interaction_model"
    | "reverse_mapping"
    | "category_sort"
    | "delayed_review"
    | "parent_observed_real_world";
  required_strength: "medium" | "strong" | "retention";
  suggested_game_family:
    | "kennedis_orders"
    | "color_lab"
    | "dress_up_stage"
    | "story_director"
    | "delivery_race"
    | "stage_boss";
  suggested_activity_pattern: string;
  required_evidence: {
    minimum_accuracy?: number;
    max_hint_rate?: number;
    min_successful_attempts?: number;
    requires_retention_gap_hours?: number;
  };
  child_facing_summary: string;
  parent_facing_summary: string;
  status:
    | "draft"
    | "ready_for_design"
    | "designed"
    | "approved"
    | "implemented"
    | "archived";
}
```

## Parent Decision Interface

```ts
export interface ParentActivityBriefDecision {
  decision_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  decision_type: "approve_brief" | "hold_brief" | "archive_brief";
  brief_id: string;
  required_context_type: ActivityVariantBrief["required_context_type"];
  required_strength: ActivityVariantBrief["required_strength"];
  suggested_game_family: ActivityVariantBrief["suggested_game_family"];
  suggested_activity_pattern: string;
  reason: string;
  status_at_decision: ActivityVariantBrief["status"];
  created_at: string;
}
```

## Parent Design Queue

```ts
export interface ActivityBriefDesignQueue {
  approved: ActivityBriefDesignQueueItem[];
  held: ActivityBriefDesignQueueItem[];
  archived: ActivityBriefDesignQueueItem[];
  total_count: number;
}
```

## Non-Scope

- No backend content service.
- No random activity generation.
- No new game modules.
- No automatic child routing.
- No rewards, streaks, rankings, or pressure loops.
- No weakening parent approval or safety rules.
