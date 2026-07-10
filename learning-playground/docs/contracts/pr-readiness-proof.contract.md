# PR Readiness Proof Contract

## Purpose

The live readiness producer turns current GitHub state into one versioned,
read-only proof for a single Kennedi pull request and expected head SHA. It does
not wake a worker, authorize a merge, perform a merge, or choose another slice.

## Trusted Inputs

Each run requires:

- one repository in `owner/name` form;
- one positive pull-request number;
- one exact 40-character expected head SHA from persisted session state; and
- a GitHub token read only from `GH_TOKEN` or `GITHUB_TOKEN`.

Repository, PR, and expected head are command inputs. A token is never accepted
on the command line, written to the proof, or included in an error message.

## Observation Order

One run must:

1. fetch the initial PR head, PR base OID, live base-branch target OID, state,
   draft state, review decision, mergeability, and merge-state status;
2. discover the required-check policy from classic branch protection and the
   active rules that apply to the base branch;
3. paginate the status/check rollup for the initial head SHA;
4. paginate every `reviewThreads` page;
5. fetch the PR metadata again; and
6. discover the required-check policy again.

The initial and final head SHA, PR base SHA, live base-branch SHA, PR state,
review decision, mergeability, merge-state status, and normalized required
policy must agree. The PR base SHA must also equal the live base-branch SHA. A
policy or PR/base-branch change during collection is contradictory state, not
readiness.

## Pagination

Applicable branch rules, check contexts, and review threads use a page size of
100. Every GraphQL connection must be read until `hasNextPage` is false. A next
page requires a non-empty cursor that differs from every cursor already used.
REST branch-rule pages continue until a page contains fewer than 100 rules.

Each source has a hard 100-page limit. Missing page information,
non-advancing/repeated cursors, duplicate thread ids, a collected thread count
that differs from GraphQL `totalCount`, malformed rules/nodes, or a page beyond
the limit is an error proof. Partial pages are never summarized as complete.

## Required Check Policy

Observed checks do not define policy. The producer unions and de-duplicates:

- classic protected-branch `contexts` and app-bound `checks`; and
- every applicable branch rule of type `required_status_checks`.

No classic protection is an empty classic source, not an API failure. An empty
combined policy or a policy that omits `quality-gate` is valid evidence that the
PR is not ready. An inaccessible, malformed, or unsupported policy response is
an error.

An app-bound requirement matches only the same context and app id. An unbound
requirement matches the same context name. A requirement is successful only
when at least one matching row exists and every matching row is successful:

- a check run is successful only with `status=COMPLETED` and
  `conclusion=SUCCESS`; and
- a commit status is successful only with `state=SUCCESS`.

Missing, pending, queued, skipped, neutral, canceled, timed out, stale, failed,
action-required, unknown, or contradictory required rows are non-ready.

## Review Threads

Every thread is counted by thread id. `isResolved=false` is unresolved even
when `isOutdated=true`. Readiness requires unresolved count `0` after complete
pagination. Flat comments, review counts, and outdated status cannot substitute
for thread resolution state.

## Ready Predicate

`ready=true` requires all of the following in one stable proof:

- initial and final head equal the expected head;
- initial and final PR base and live base-branch SHA agree, and the PR base is
  current with that branch;
- the PR is `OPEN` and not a draft;
- required policy is non-empty, stable, and includes `quality-gate`;
- every policy requirement is present and successful on the sampled head;
- check and thread pagination are complete;
- unresolved thread count is zero, including outdated threads;
- review decision is not `CHANGES_REQUESTED`;
- mergeability is `MERGEABLE`; and
- merge-state status is `CLEAN`.

Unknown or missing values fail closed.

## Proof Schema

The producer writes one JSON object to stdout with:

- `schema_version: 1` and `proof_type: "kennedi.pr-readiness"`;
- `status` (`ready`, `not_ready`, or `error`) and boolean `ready`;
- observation timestamp, repository, PR number, and expected head SHA;
- initial/final PR metadata and whether it stayed stable;
- normalized initial/final policy sources and requirements;
- exact-head check pages, observed contexts, and per-requirement result;
- thread pages, total count, unresolved ids/count, and outdated-unresolved
  count; and
- stable `failure_codes` explaining every proven non-ready boundary.

An error proof may omit evidence that could not be collected, but it must remain
schema version 1, set `ready=false`, set `status=error`, and include a sanitized
error code/message without response bodies, headers, or tokens.

## Exit Contract

- Exit `0`: a complete proof has `ready=true`.
- Exit `1`: a complete proof proves one or more non-ready conditions.
- Exit `2`: input, authentication, transport, pagination, GraphQL, HTTP, or
  response-schema failure prevented a complete proof.

Consumers must inspect both the exit code and proof schema. No exit path grants
merge authority.

## Mutation Boundary

The producer performs only GitHub GET and GraphQL query operations. It has no
mutation query, workflow dispatch, comment/review/thread write, subscription
write, branch/ruleset write, merge command, queue selection, or filesystem
snapshot output.
