# Copilot instructions

Repository custom instructions for GitHub Copilot. (Codex has its own instructions in `AGENTS.md`.)

## Review guidelines

Treat the code and diff as ground truth; the PR description and commit messages are unverified claims.

- Reconstruct the diff in your own words, change by change, before trusting the description. Report gaps between what the diff does, what a correct fix should do, and what the description claims.
- Cite `file:line` for every finding. Classify each as confirmed, contradicted, or could-not-determine; never confirm without a citation. Lead with the gaps.
- Hunt: security (authn/authz, injection, secrets, SSRF, path traversal), data integrity (destructive ops, migrations, idempotency), concurrency (check-then-act, races, await-ordering), contract (signature/return-shape/schema; non-optional return that can be `undefined`/null), resource (leaks, unbounded growth, missing timeout/limit). For guards and validators, probe both sides of the boundary and any falsy/default defeat.
- Only P1 (exploitable security / realistic data loss) and P2 (breaks a primary or plausible path, silent failure, broken contract, race under load) block; each must state the concrete failure path. P3/P4 are non-blocking, and "no P1/P2 found" is a valid result.
