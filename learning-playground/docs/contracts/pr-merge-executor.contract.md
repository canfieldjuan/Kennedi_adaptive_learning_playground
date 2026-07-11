# Active-Builder Guarded Merge Executor Contract

## Purpose

The active-builder executor performs one merge only after persisted operator
authority, exact local ownership, and a fresh live readiness confirmation all
agree. Watchers and event wakes cannot invoke or authorize this transition.

## Trusted Inputs

The CLI accepts exactly a scheduled wake source, repository, positive PR,
expected head SHA, branch, absolute worktree path, and absolute persisted
session-record path. Tokens remain environment connectivity, never authority.

The session record is capped at 64 KiB and must contain exactly one matching
repository, PR, branch, worktree, expected head, `scheduled_confirmation`
status, merge action, one-shot merge authorization, and non-`none` operator
authorization source. Missing, duplicated, malformed, or contradictory fields
fail closed.

## Local Guard

Before the live proof and again immediately before merge, the executor requires a clean worktree whose
canonical root, current branch, and HEAD exactly match the authorized record.
It invokes commands with argument arrays and never through a shell.

## Live Guard

The executor runs the repository-owned readiness producer for the authorized
repository, PR, and head, then validates its stdout with the scheduled
confirmation consumer. Only `decision=ready`,
`ready_for_guarded_merge=true`, and `merge_authorized=false` may continue.

## Merge Guard

The sole mutation is `gh pr merge` with `--repo`, `--merge`, and
`--match-head-commit` for the exact authorized head. The executor never uses
admin bypass, force, auto-merge, shell execution, or branch deletion.

After the mutation, it reads the PR again and reports success only when GitHub
returns `MERGED` with a valid merge commit. Command or receipt uncertainty
reports an unknown outcome, never `merge_performed=false`. It does not persist the receipt or
clean branches/worktrees.

## Output and Exit Contract

Every JSON output includes schema version `1`, decision type
`kennedi.pr-merge-execution`, repository, PR, expected head,
`merge_performed` (`true`, `false`, or `null` when outcome is unknown), and
either the verified merge receipt or a sanitized error.

- Exit `0`: guarded merge completed and receipt verified.
- Exit `2`: authority, local state, live proof, merge, or receipt failed closed.

No output is reusable merge authority.

## Non-Scope

Workflow/event wiring, polling, duplicate-wake serialization, automatic retry,
authority creation, receipt persistence, branch/worktree cleanup, thread or
review mutation, queue selection, and next-slice handoff remain separate.
