# AGENTS.md

Guidance for Codex and other automated reviewers working in this repository.
GitHub Copilot has its own instructions in `.github/copilot-instructions.md`.

## Review guidelines

Treat the code and diff as ground truth. The PR description, title, and commit messages are unverified claims.

**Method — apply to every review:**

- Reconstruct the diff independently: state what each change actually does, change by change, in your own words. Do not read intent from the description.
- Derive what a correct fix must touch from the problem alone, then compare it to what the diff did. Report every gap: diff vs description, diff vs correct fix (wrong / incomplete / symptom patch), and anything the diff changes that the description never mentions.
- Cite `file:line` for every claim. Classify each finding as confirmed, contradicted, or could-not-determine; never mark a finding confirmed without a citation. Lead with the gaps, not a summary.
- After a re-push, review the current code, not stale thread anchors.

**Hunt these categories — clear each only by trying to break it and failing, not by "did not notice a problem":**

- Security: authn/authz, injection, secrets, SSRF, deserialization, path traversal.
- Data integrity: destructive ops, migrations, transactions, idempotency.
- Concurrency: check-then-act, races, await-ordering. This is a common blind spot — always check it.
- Contract: signature, return shape, schema; a non-optional return type that can return `undefined`/null.
- Resource: leaks, unbounded growth, missing timeout or limit.
- Guards, validators, caps, sanitizers: probe the second side of every boundary — one input that should pass but may be rejected, and one that should fail but may pass. Check falsy/default defeat (`0`, `""`, `false`, past-the-max) on any cap or threshold, and confirm downstream code uses the sanitized value, not the raw one.
- Effect-claiming changes (move/redact/gate/route/fix a number): trace the factor that actually controls the effect and confirm the edit reaches it. A plausible-looking edit is not proof the effect changed.

**Severity:**

- Only P1 (exploitable security / realistic data loss) and P2 (breaks a primary or plausible path, silent failure, broken contract, race under load) block. Each P1/P2 must state the concrete failure path — exact input or sequence — or be downgraded.
- P3/P4 are non-blocking. "No P1/P2 found" is a valid, complete result; do not manufacture nits to have something to say.

## Builder and long-running slice rules

Every change starts with a written change contract under
`learning-playground/docs/work-contracts/` and follows
`learning-playground/docs/contracts/change-workflow.contract.md`.

Long-running work is a sequence of short-lived workers and small PRs, not one
continuous model session. The canonical state machine and merge predicate are
`learning-playground/docs/contracts/long-running-slices.contract.md`; copy
`learning-playground/docs/templates/long-run-session-state.md` to
`~/.local/state/kennedi-long-runs/<session-id>.md` for each active slice.

For every long-running slice:

- Work in an isolated branch/worktree. Treat the shared checkout and every
  other open PR as unowned unless the operator explicitly reassigns it.
- Persist the issue/change contract, worktree, branch, owned PR, expected head
  SHA, last-seen checks and review threads, wake mode, merge authorization, and
  next approved slice before opening or mutating a PR. Immediately after open
  or push, persist the returned PR identity, current head, and subscription
  outcome before the worker stops or performs another mutation.
- Own at most one active PR. After every open or push, subscribe to that PR and
  stop. A review/check/push event is attention-only; it never authorizes merge.
- On every wake, re-read the persisted state and live GitHub state. A moved
  head invalidates every prior check, review, and readiness observation.
- Watchers and wake handlers are read-only. They must not merge, delete
  branches, resolve threads, or infer the next task.
- Merge only from a fresh scheduled confirmation, only with explicit operator
  authority, and only when the current head satisfies the complete contract:
  a non-empty required-check set including `quality-gate`, all required checks
  present and green, every review-thread page fetched, zero unresolved threads
  (including outdated), no changes requested, and clean mergeability. Re-fetch
  immediately before using an expected-head guard. Never use admin bypass.
- After merge, remove only the owned worktree/branch and start only the next
  explicitly ordered slice. Missing or contradictory state is a stop, not a
  reason to guess.
