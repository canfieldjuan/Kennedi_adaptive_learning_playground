# PR Wake Claim Contract

## Purpose

Short-lived workers may be started by overlapping push, review, comment, check,
or scheduled wakes. Before runtime automation is wired, one repository-owned
primitive must prevent two workers from owning the same pull-request head and
must remember completed delivery identities.

## Trusted Inputs

The caller supplies an action, repository, positive pull-request number, exact
40-character expected head SHA, supported wake source, bounded wake id, and an
absolute canonical claim-root directory. `complete` and `abandon` also require
the unguessable token returned by `acquire`.

The claim root is dedicated operator-created local state. It must already exist
as a private, current-user-owned real directory and may not be reached through
a symbolic-link path. Every acquisition must first reserve one of 4,096 atomic
capacity slots. Slots survive completion and are released on abandonment, so
parallel different-head acquires cannot exceed the wake-record bound. Atomic
publication reports temporary contention separately from an already-published
record. Active publication residue is keyed by its reserved capacity slot and
is removed with that slot only when its publisher is provably dead and no
active, transition, or completed owner exists.

## Claim Identity

The active claim key is the SHA-256 digest of repository, pull request, and
expected head. Therefore every wake source for one exact head contends on one
active file, while a new head has an independent claim.

A completed wake receipt is keyed by repository, pull request, head, wake
source, and wake id. It remains after the active claim is released so replaying
the same delivery cannot start another worker.

## Acquire Contract

`acquire` first checks for an exact completed receipt and otherwise publishes a
fully written active record with an exclusive atomic link. Exactly one
contender returns `acquired`; the same active or completed wake returns
`duplicate`; a different
wake for that head returns `busy`.

Empty, oversized, symbolic-link, non-regular, malformed, contradictory, or
unknown state fails closed. Active claims do not expire and are never stolen by
elapsed time. A crashed owner therefore requires explicit operator recovery in
a later slice.

## Complete and Abandon Contract

`complete` requires the exact active claim token, durably creates the completed
receipt, and only then removes the active file. If completion was interrupted
after the receipt write, retrying with the same token finishes removal
idempotently. An exclusive transition marker serializes conflicting complete
or abandon calls and blocks a new acquire until the transition finishes. A
retry with the same action and token validates and resumes an existing marker;
same-action finalization is idempotent under overlapping retries.

A matching completed receipt is authoritative for that wake's completion retry
even if a newer wake now owns the shared PR/head active record. The retry never
mutates the newer owner.

`abandon` requires the exact active claim token and removes only the active
record. It writes no completed receipt, so the wake may be retried. The same
token can finish marker cleanup after an interrupted abandon.

## Output and Exit Contract

Every JSON result has schema version `1`, decision type
`kennedi.pr-wake-claim`, exact ownership fields, and
`merge_authorized: false`.

- exit `0`: `acquired`, `completed`, or `abandoned`;
- exit `1`: `duplicate` or `busy`;
- exit `2`: invalid input, unsafe state, token mismatch, or I/O uncertainty.

Only an acquired result contains a claim token. Busy and duplicate results do
not expose another worker's token.

## Non-Scope

This primitive does not fetch GitHub state, subscribe, dispatch or launch a
worker, poll, retry, infer readiness, resolve review threads, grant merge
authority, merge, mutate branch protection, reclaim stale active claims,
persist a session baton, clean worktrees, or select the next slice.
