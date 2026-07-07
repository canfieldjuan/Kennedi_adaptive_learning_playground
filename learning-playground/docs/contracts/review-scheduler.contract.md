# Review Scheduler Contract

Review scheduling is local and deterministic. It helps the parent revisit a skill after time has passed; it must not steer the child automatically.

## Rules

- `likely_mastered` schedules review after 24 hours.
- A successful first review schedules the next review after 3 days.
- A successful second review schedules the next review after 7 days.
- Regression returns the skill to practice.

## Non-Scope

- No backend reminders.
- No notifications.
- No streaks.
- No pressure loops.
- No automatic child-facing routing.

