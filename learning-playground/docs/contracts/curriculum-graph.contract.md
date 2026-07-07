# Curriculum Graph Contract

The curriculum graph is local product data. It defines the skills the app knows how to reason about, the prerequisites between those skills, and the activity contexts that can provide evidence.

## Requirements

- Every activity `skill_id` must exist in the curriculum graph.
- Every prerequisite and unlock reference must point to an existing skill.
- A skill must not unlock itself.
- Prerequisite chains must not contain cycles.
- The graph must cover only local, parent-approved learning content.
- The graph must not contain external child-facing links.

## Phase 3 Scope

The first graph covers existing MVP activities only. It must not add new game types, backend services, accounts, cloud sync, external content, or child-facing AI.

