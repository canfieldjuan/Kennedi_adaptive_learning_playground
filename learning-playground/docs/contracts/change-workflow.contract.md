# Change Workflow Contract

## Purpose
Every code change must be derived from the problem, built only to that stated scope, and audited before it is called done.

This contract protects the playground from accidental broadening, unrelated edits, and "it seems fine" completion.

## Required Before Code
Before implementation begins, write a change contract with these sections:

### Root Cause
State what is actually wrong and why it exists.

This must name the cause, not just the visible symptom.

### Correct Fix Must Touch
State the files, modules, tests, scripts, or docs that a correct fix must change to reach the root cause.

This is the allowed implementation surface.

### Must Not Change
Name the modules and behaviors that the work does not depend on and must leave alone.

This is the protected surface.

## Build Rule
Build to the written contract.

- Nothing required by the contract may be left unimplemented.
- Nothing outside the contract may be added.
- If verification reveals a blocker outside the original scope, amend the contract before changing that area.
- The amendment must state why the new touch is required and what remains protected.

## Required Before Done
Before declaring the work done, reconstruct the diff cold.

Read the changed files as if you did not write them and report:

### Gaps
Lead with any gap found.

Report:

- any change that does not trace to the contract
- anything the contract required that the diff does not deliver
- anything touched that the contract said to leave alone

Do not declare done while any gap stands.

### Change By Change Reconstruction
State what each touched file actually changes.

Cite file and line for each meaningful change.

### Contract Traceability
For each touched file, state whether the change traces to:

- Root Cause
- Correct Fix Must Touch
- Must Not Change
- Contract Amendment

### Verification
Report the commands and browser checks that were run.

If a verification step could not run, state why and what risk remains.

## Required Template
Future work should use `docs/templates/change-contract.md` as the work log shape.

The template is intentionally small. It is a gate, not bureaucracy.
