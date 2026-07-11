# Asset Provenance Ledger

This is the canonical ownership and source ledger for production artwork. It is
governed by `docs/contracts/art-production-assets.contract.md`.

An asset or cohesive family is production-ready only when every required field
below is complete, licenses are committed or linked when applicable, and the
owner's look approval is recorded. Do not infer ownership from a file's presence
in the repository or from an editor's export controls.

## Status Values

- `draft`: source or rights review is incomplete; not approved for child mode.
- `rights_verified`: provenance and redistribution rights are complete.
- `look_approved`: owner approved the representative visual proof.
- `production_ready`: rights, editable source, export, visual, and runtime checks
  all passed.
- `legacy_unverified`: predates this ledger; may continue running, but cannot be
  expanded, replaced, or represented as newly approved production art until its
  entry is completed.

## Required Entry Template

Copy this section once per asset or cohesive asset family.

```text
Asset family:
Game:
Status:
Production path(s):
Editable source path(s):
Creator:
Creation date:
Creation tool and version:
Origin category: A original | B project-owned source | C third-party
Original or third-party status:
Project-owned source material used:
Third-party elements:
Source URL(s):
License name and version/date:
License file path:
Commercial use permitted: yes | no | unclear
Modification permitted: yes | no | unclear
Software distribution permitted: yes | no | unclear
Public repository distribution permitted: yes | no | unclear
Continued use after subscription ends: yes | no | unclear | not applicable
Attribution requirement:
AI assistance: none | reference only | production use approved
AI approval/terms record:
Contact sheet path:
Desktop screenshot path(s):
Mobile screenshot path(s):
Owner look approval:
Restrictions and notes:
```

Any `no` or `unclear` rights field blocks production-ready status. A Category A
or B entry normally uses `not applicable` for third-party URL and license fields,
but it must still identify the creator and project-owned source.

## Current Ledger

No new production art is introduced by the production-workflow documentation
slice. Existing artwork predates this ledger and is not retroactively assigned
ownership claims here. The first graphics proof PR must add its complete entry
and must also document every legacy asset family it modifies or re-exports.

<!-- Add approved asset-family entries below this line. -->
