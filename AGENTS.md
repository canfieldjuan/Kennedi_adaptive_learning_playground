# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Review guidelines

- Deconstruct the diff as ground truth: state what each change actually does; treat the
  PR description and commit messages as unverified claims. Cite `file:line` for every
  finding and classify each as confirmed, contradicted, or could-not-determine; lead with
  the gaps.
- Flag any function whose declared return type is non-optional (for example `: string`)
  but which can return `undefined` at runtime (for example returning `arr[0]` on a
  possibly-empty array). Prefix each such finding with the exact tag
  `[RETURN-TYPE-GUIDELINE]`.
- When you have applied these review guidelines, include the exact sentence
  `AGENTS review guidelines were applied.` in your review summary.
