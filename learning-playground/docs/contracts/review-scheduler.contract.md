# Review Scheduler Contract

Review scheduling is local and deterministic. It helps the parent revisit a skill after time has passed; it must not steer the child automatically.

## Rules

- `likely_mastered` schedules review after 24 hours.
- A successful first review schedules the next review after 3 days.
- A successful second review schedules the next review after 7 days.
- Regression returns the skill to practice.
- Parent-visible review schedule records must be stored locally from mastery snapshots.
- Review schedule records must be included in local export and cleared by clear progress.
- Review schedule visibility must stay parent-only and must not create reminders, notifications, or child-facing routing.

## Parent Schedule Interface

```ts
export interface ParentReviewScheduleRecord {
  schedule_id: string;
  snapshot_id: string;
  session_id: string;
  child_id: string;
  skill_id: string;
  skill_label: string;
  mastery_status: MasteryStatus;
  interval_label: string;
  next_review_at?: string;
  status_after_review: MasteryStatus;
  recommended_action: RecommendedMasteryAction;
  created_at: string;
}
```

## Non-Scope

- No backend reminders.
- No notifications.
- No streaks.
- No pressure loops.
- No automatic child-facing routing.
