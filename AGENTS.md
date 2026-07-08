# AGENTS.md

Guidance for Codex and other coding agents working in this repository. These
instructions are for the Codex reviewer; GitHub Copilot has its own separate
instructions in `.github/copilot-instructions.md`.

## Pull request review protocol (Codex)

When you review a pull request in this repository, follow this protocol exactly:

1. **Open the review with this exact first line, verbatim:**
   `AGENTS-REVIEW-PROTOCOL v1 active`
2. **Deconstruct the diff as ground truth.** State what each change actually does, change by change, in your own words. Treat the PR description and commit messages as unverified claims.
3. **Independently derive the correct fix** from the problem alone — what a correct change must touch — before comparing it to what the diff did.
4. **Three-way compare** {what the diff does} vs {what a correct fix should do} vs {what the description claims}. Lead with the gaps.
5. **Cite `file:line` for every claim.** Classify each finding as `confirmed`, `contradicted`, or `could-not-determine`.
6. **Close the review with exactly one line:** `VERDICT: <clean|non-blocking|blocking>`.
