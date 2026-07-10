# PR Attention Decision Contract

## Purpose

The one-shot attention decision consumes one current readiness proof and one
explicit GitHub event source. It decides whether a short-lived worker should
inspect, wait, report readiness for a later scheduled confirmation, or stop.
It cannot dispatch a worker or authorize/perform a merge.

## Trusted Inputs

The CLI accepts exactly `--wake-source push|review|comment|check` and reads one
JSON document from stdin. The document must be a schema-version `1`
`kennedi.pr-readiness` proof.

Input is capped at 2 MiB. Empty, oversized, malformed, unsupported-version,
inconsistent, or incomplete proof input is an error decision.
`scheduled` is not an event source for this probe.

## Decision Precedence

After validating the complete input, apply these rules in order:

1. A non-error proof whose initial PR state is not `OPEN` is `terminal`, even if
   the wake source would otherwise require attention.
2. `push`, `review`, and `comment` are always `attention`. New event activity
   outranks pending checks and can never produce merge authority.
3. A check wake with an error proof or stale, changed, contradictory, missing,
   failed, unresolved-review, changes-requested, conflict, or unknown state is
   `attention`.
4. A check wake whose only non-ready causes are draft state and required checks
   that are all verifiably pending is `waiting`.
5. A check wake with `ready=true` is `waiting` with
   `ready_for_scheduled_confirmation=true` and action `report_ready`.

Unknown failure codes and contradictory proof fields fail closed to
`attention`, not waiting or readiness.

## Pending Versus Failed Checks

A required row is pending only when at least one matching context exists and
every matching context reports a known pending state: `QUEUED`, `IN_PROGRESS`,
`PENDING`, `EXPECTED`, `WAITING`, or `REQUESTED`.

A missing row, an unknown state, a completed non-success conclusion, or a
terminal status such as failed, canceled, timed out, skipped, neutral, stale,
error, action-required, or startup-failure requires `attention`.

## Output Schema

Every output is one JSON object with:

- `schema_version: 1` and `decision_type: "kennedi.pr-attention"`;
- the accepted wake source when available;
- `decision` (`attention`, `waiting`, `terminal`, or `error`);
- `next_state`, `action`, and stable `reason_codes`;
- the proof's expected head SHA when available;
- boolean `ready_for_scheduled_confirmation`; and
- `merge_authorized: false`.

No output field, event source, environment variable, proof field, or exit code
can change `merge_authorized` to true.

## Exit Contract

- Exit `0`: valid decision is `attention`.
- Exit `1`: valid decision is `waiting`, including report-ready.
- Exit `2`: input, schema, or internal classification error.
- Exit `3`: valid decision is `terminal`.

Consumers must parse the output; exit `0` is permission to inspect, not merge.

## Resource Boundary

The probe reads at most 2 MiB from stdin and makes no network request. It reads
no token, repository file, session file, environment authority, or queue.

## Mutation Boundary

The probe performs no GitHub operation, workflow dispatch, process launch,
filesystem write, subscription/review/thread mutation, branch/ruleset change,
queue selection, or merge. Event wiring, duplicate-wake locking, and scheduled
confirmation belong to later slices.
