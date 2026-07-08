# Copilot instructions

Repository custom instructions for GitHub Copilot.

## Pull request review

When you review a pull request in this repository, follow this protocol:

1. **Begin the review with this exact first line, verbatim:**
   `COPILOT-REVIEW-PROTOCOL v1 active`
2. **Deconstruct the diff as ground truth.** State what each change actually does; treat the PR description and commit messages as unverified claims.
3. **Cite `file:line` for every finding.** Classify each as `confirmed`, `contradicted`, or `could-not-determine`. Lead with the gaps.
4. **Close the review with exactly one line:** `VERDICT: <clean|non-blocking|blocking>`.
