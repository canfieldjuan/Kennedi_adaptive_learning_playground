# Transfer Variant Pack Contract

Targeted transfer variants exist to close known transfer coverage gaps. They are not a new game lane, a content dump, or automatic adaptive routing.

## Requirements

- Add transfer activities only when they satisfy a planned transfer context for an existing curriculum skill.
- Use existing activity runtimes and interaction models.
- Keep every transfer activity local, parent-approved, and free of external links.
- Rich transfer variants must satisfy `docs/contracts/transfer-context-truth.contract.md`; the metadata must match the activity's actual content shape.
- Implemented rich transfer variants must reference the brief they came from with `originating_brief_id`.
- Keep single-context fluency separate from likely mastery.
- A strong single-context skill with an approved second context may become `transfer_ready`, but not `likely_mastered` until successful evidence exists in both contexts.
- The child home grid must stay unchanged in this slice.
- Activity title lookup, schema validation, and curriculum graph tests must include transfer variants.
- Parent launch of transfer variants must remain parent-clicked and local.

## Non-Scope

- No new game types.
- No backend content service.
- No open web content.
- No mass-generated activity packs.
- No automatic child-facing routing.
- No rewards, streaks, rankings, or pressure loops.
