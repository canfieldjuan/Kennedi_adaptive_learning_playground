# Long-Running PR Slice Contract

## Purpose

Long-running work in Kennedi's playground is a durable sequence of small,
reviewed PR slices. It is not a permanently running coding session. Each worker
must be able to stop, lose process memory, and resume from persisted state
without broadening ownership or weakening merge gates.

This contract defines the repository-level behavior. A later watcher or wake
bridge may implement it, but automation may not weaken it.

## State Machine

Each slice has exactly one state:

| State | Meaning | Allowed next states |
|---|---|---|
| `planned` | Approved issue/contract and lane exist; no code yet | `building`, `blocked` |
| `building` | One owned worktree/branch is changing only contracted files | `pr_open`, `blocked` |
| `pr_open` | One ready-for-review PR exists at the recorded head | `waiting`, `attention`, `blocked` |
| `waiting` | The worker is stopped until an explicit wake | `attention`, `scheduled_confirmation`, `blocked` |
| `attention` | A push, review, red check, moved head, or contradictory state requires an active worker | `building`, `waiting`, `blocked` |
| `scheduled_confirmation` | A scheduled wake is re-proving all current-head merge gates | `waiting`, `merged`, `blocked` |
| `merged` | The exact owned head was merged and the owned worktree/branch can be removed | terminal |
| `blocked` | Progress requires an operator decision or external-state change | `planned`, `building`, `waiting` after explicit release |

An event wake never transitions directly to `merged`. A watcher never performs
the `merged` transition.

## Persisted Session State

Before a PR is opened or mutated, write a session record from
`docs/templates/long-run-session-state.md` to
`~/.local/state/kennedi-long-runs/<session-id>.md`.

The record must contain:

- repository, issue/change contract, ownership lane, current task, and explicit
  non-scope;
- worktree path, branch, base SHA, owned PR number/URL, and expected head SHA;
- the exact PRs/branches the session may and must not touch;
- last-seen configured checks, unresolved thread ids/count, review decision,
  merge state, and observation timestamp;
- wake source (`push`, `review`, `check`, or `scheduled`), subscription state,
  and the next scheduled confirmation;
- operator merge-authorization source and whether it applies to this slice;
- the ordered next approved slice or the explicit statement `none`;
- last safe action and next exact action.

Process memory, a chat transcript, a PR title/body, and a notification are not
substitutes for this record. Missing, malformed, stale, or contradictory state
is non-ready.

PR creation may begin with `PR: none`, but the worker must atomically update the
record with the returned PR number/URL, current head SHA, and subscription
outcome before it stops or performs another GitHub mutation. After every push,
persist the new expected head and invalidate the prior live observation before
the worker stops.

## Ownership

One session owns at most one active PR and one branch/worktree. Same repository,
feature area, or author does not imply ownership. Before any push, comment
resolution, close, or merge action, re-fetch the open PR list and confirm that
the recorded PR number, branch, and expected head SHA all match live GitHub.

If the live head differs, stop and inspect it. Do not force-push over unknown
work and do not carry readiness from the old head. Shared checkouts and untracked
files belong to their current owner and are not implementation surfaces.

## Wake Authority

After a PR open or push, subscribe the authenticated builder to the PR and stop
the worker. Do not keep an in-chat sleep loop or continuously running model
session alive.

- Push, review, comment, and check events are attention wakes. They may inspect,
  report, or start a scoped fix worker; they cannot merge.
- A scheduled wake may enter `scheduled_confirmation`. It may only report ready
  unless the active builder has explicit merge authority recorded for the exact
  slice.
- A watcher or wake bridge is read-only. It cannot gain merge authority from an
  environment variable, config file, event payload, or readiness label.
- Duplicate wakes for the same PR/head must be serialized or deduplicated before
  runtime automation is enabled.

## Readiness Predicate

Readiness is true only for one stable observation of the recorded head SHA:

1. The PR exists, is open, and is not a draft.
2. The initial and final PR head reads equal the recorded expected head.
3. The persisted required-check set is non-empty, includes `quality-gate`, and
   includes every check required by the repository's current rules. Every one
   is present on that head, completed, and successful. Empty, missing, pending,
   skipped, canceled, failed, or unknown required results are non-ready.
4. Every GraphQL `reviewThreads` page is fetched with bounded, validated
   pagination, and unresolved count is zero. Outdated but unresolved threads
   remain unresolved.
5. `reviewDecision` is not `CHANGES_REQUESTED`.
6. Mergeability is known and clean; conflicts, unknown state, or contradictory
   metadata are non-ready.
7. The head is read again after checks/threads/merge state are collected and is
   unchanged.

Flat comment or review counts, a workflow summary, a stale snapshot, optional
check success, or GitHub's merge button alone cannot satisfy readiness.

## Merge Guard

Immediately before merge, the active builder must re-fetch the PR head, required
checks, all review threads, review decision, and mergeability. The local branch
and persisted expected head must match the remote head, and the worktree must be
clean.

Merge requires explicit operator authorization recorded for this slice and an
expected-head guard such as `--match-head-commit`. Never use `--admin`, bypass
required checks, ignore unresolved threads, or merge from an attention wake.

After merge, verify the merge commit on `main`, record a receipt, and remove only
the owned worktree and branch.

## Next Slice

The next slice is an explicit ordered value in persisted state. It is never
inferred from code, issue labels, nearby TODOs, reviewer suggestions, or an open
PR in the same area. Start it only after the owned PR is merged or the operator
explicitly releases the session from that dependency.

An empty queue ends the arc cleanly. It does not authorize discovery work or a
new implementation lane.

## Failure Behavior

- GitHub/API errors, malformed JSON, pagination uncertainty, stale head state,
  missing configured checks, and unknown mergeability fail closed.
- A red check or unresolved review thread produces `attention`, not readiness.
- A pending check remains `waiting` unless new review activity also requires
  `attention`.
- A terminal/closed PR stops the watcher without selecting another task.
- A genuinely operator-owned decision is recorded as `blocked`; technical
  uncertainty is investigated within the approved scope.
- No failure path grants a watcher, event handler, or duplicate worker merge
  authority.
