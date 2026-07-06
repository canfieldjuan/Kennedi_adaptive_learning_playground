# Finding Verification Contract

## Purpose
Review findings, issue comments, and audit notes are unverified claims until the code proves them.

This contract prevents fixes from being driven by wording, severity labels, or suggested patches before the code has been read cold.

## Required Before Assessing Findings
Before accepting, rejecting, or fixing a finding, read the relevant code directly and reconstruct what it actually does.

The code is ground truth. The finding is a claim.

### Code Read Cold
State what the code actually does at the relevant locations in your own words.

Cite file and line for every relevant location.

Do not use the finding's wording as the description of behavior.

### Claim Breakdown
Treat each finding as a bundle of separate component claims.

Break the finding into:

- existence: whether the problem actually occurs
- location: where the behavior is actually implemented
- cause: what mechanism creates the behavior
- severity: the real blast radius
- fix: whether any proposed fix reaches the real cause

## Required Claim Classification
For each component claim, compare it to the cold code read and classify it.

### Confirmed
Use only when the code supports the claim.

Every confirmed claim must include a file and line citation.

### Contradicted
Use when the code disproves the claim, places it elsewhere, shows a different cause, shows overstated severity, or shows the proposed fix would only address a symptom.

Every contradicted claim must cite the code that disproves or relocates it.

### Could Not Determine
Use when the relevant code cannot be found, has changed, is outside the available workspace, or needs runtime evidence that has not been gathered.

Do not report a claim as confirmed when it belongs here.

## Required Report Order
Lead with gaps.

Gaps include findings that are:

- wrong
- overstated
- mislocated
- right about the symptom but wrong about the cause
- impossible to verify from the available code

After gaps, report confirmed claims, contradicted claims, and could-not-determine claims.

## Fix Eligibility
Do not plan or implement a fix until the real cause is confirmed or the uncertainty is explicitly named.

If a proposed fix is present in the finding, evaluate whether it reaches the real cause before adopting it.

## Required Template
Use `docs/templates/finding-verification.md` as the finding audit shape.
