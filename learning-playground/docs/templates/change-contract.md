# Change Contract

## Before Code

### Root Cause
What is actually wrong, and why?

### Correct Fix Must Touch
What files, modules, tests, scripts, or docs must change to fix the root cause?

### Must Not Change
What modules and behaviors does this work not depend on and must leave alone?

## Contract Amendments
Record any scope change discovered during verification before touching the new area.

## Cold Diff Audit

### Gaps
Lead with any standing gap:

- change without contract trace:
- contract requirement not delivered:
- protected surface touched:

Do not declare done while any gap stands.

### Change By Change Reconstruction
Read the diff cold and cite file and line for each meaningful change.

### Contract Traceability
For each touched file, state the contract item it satisfies.

### Verification
List commands, browser checks, and any verification that could not run.
