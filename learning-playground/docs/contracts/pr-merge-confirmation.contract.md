# PR Scheduled Merge Confirmation Contract

## Purpose

The scheduled merge-confirmation probe consumes one current, complete readiness
proof and reports whether an active builder may consider a separately guarded
merge. It never grants authority and never performs the merge.

## Trusted Inputs

The CLI requires exactly `--wake-source scheduled`, one repository in
`owner/name` form, one positive PR number, and one 40-character expected head
SHA. It reads one JSON document from stdin. The document must satisfy the
complete schema-version `1` `kennedi.pr-readiness` proof contract. For every
non-error proof, its repository, PR number, and expected head must exactly match
those command inputs, and its observation timestamp must be present and valid.
A producer error proof may omit that unavailable evidence; it remains an error
decision bound to the command-input identifiers.

Input is capped at 2 MiB. Empty, oversized, malformed, unsupported-version,
incomplete, identity-mismatched, or contradictory proof input is an error decision.
Push, review, comment, and check wakes are not accepted by this probe.

## Decision Precedence

After validating the complete input, apply these rules in order:

1. A stable non-error proof whose PR is no longer `OPEN` is `terminal`.
2. A producer `error` proof is `error` and blocks confirmation.
3. A complete proof with `ready=true` is `ready` and may only be reported to an
   active builder as `ready_for_guarded_merge=true`.
4. Every other complete proof is `not_ready` and returns to `waiting` with the
   producer's failure codes.

No proof field, CLI argument, environment variable, exit code, event payload,
or decision can set `merge_authorized=true`. Repository, PR, and head inputs
bind the report to persisted ownership; they do not grant merge authority.

## Ready Boundary

`ready_for_guarded_merge=true` is valid only when the shared readiness-proof
validator proves the full predicate: exact stable head, current stable base,
open non-draft PR, non-empty stable required policy including `quality-gate`,
all required checks successful on that head, complete bounded pagination, zero
unresolved review threads, no changes requested, and `MERGEABLE`/`CLEAN` state.

The probe does not accept a partial substitute for the readiness proof and does
not reconstruct GitHub state from comments, check summaries, labels, or local
repository metadata.

## Output Schema

Every output is one JSON object with:

- `schema_version: 1` and `decision_type: "kennedi.pr-merge-confirmation"`;
- `wake_source: "scheduled"` when the source was accepted;
- the accepted repository, PR number, and expected head SHA, which is verified
  against every non-error proof;
- `decision` (`ready`, `not_ready`, `terminal`, or `error`);
- `next_state`, `action`, and stable `reason_codes`;
- the proof observation timestamp when available;
- boolean `ready_for_guarded_merge`; and
- `merge_authorized: false`.

The output is a report, not a merge receipt or authority token.

## Exit Contract

- Exit `0`: a valid complete proof is `ready` for a separately guarded merge.
- Exit `1`: a valid complete proof is `not_ready`.
- Exit `2`: input, schema, proof, or internal confirmation error.
- Exit `3`: the PR is stably terminal.

Consumers must parse the output. Exit `0` cannot bypass persisted operator
authorization, a clean local worktree, or the immediately-before-merge
expected-head guard.

## Resource Boundary

The probe reads at most 2 MiB from stdin. It makes no network request, reads no
token or session file, invokes no subprocess, and writes no filesystem state.
Its command inputs are identifiers only, not authority.

## Mutation Boundary

The probe performs no GitHub operation, workflow dispatch, process launch,
subscription/review/thread mutation, branch/ruleset mutation, queue selection,
or merge. Expected-head merge execution, receipt recording, cleanup, workflow
wiring, and duplicate-wake serialization remain separate active-builder or
later-slice responsibilities.
