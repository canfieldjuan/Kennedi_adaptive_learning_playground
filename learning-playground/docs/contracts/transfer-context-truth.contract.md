# Transfer Context Truth Contract

Rich transfer metadata must describe what the activity actually asks the child to do. A strong or medium context label is evidence metadata, not decoration.

## Requirements

- Activities with weak contexts may use the existing same-format activity shape.
- Activities with rich transfer contexts must have detectable content structure that matches the declared context.
- `reverse_mapping` activities must ask from an example back to the matching symbol, sound, category, or concept.
- A tap-choice `reverse_mapping` activity must include a source example, a target symbol, letter, or concept, and answer choices that are symbols or concepts rather than the original examples.
- The correct choice in a `reverse_mapping` activity must match the declared target.
- `different_prompt_mode` activities must change the prompt framing, not just swap examples.
- A tap-choice math `different_prompt_mode` activity must include a visual quantity card, a target quantity, rendered prompt images matching that quantity, and numeral choices.
- The correct choice in a math `different_prompt_mode` activity must match the declared target quantity.
- A Bear Cafe `category_sort` activity must require a category set and include distractors that do not belong to that category.
- A Bear Cafe `different_prompt_mode` fix-order activity must begin from an incorrect tray state and ask the child to repair the mismatch.
- Implemented rich transfer activities must reference an originating brief with `originating_brief_id`.
- Rich transfer activities must remain local, parent-approved, and free of external child-facing links.
- A rich transfer label must not be used to make a same-format/new-example clone look stronger than it is.

## Non-Scope

- No unrelated game modules.
- No backend content validation service.
- No automatic child routing.
- No rewards, streaks, rankings, or pressure loops.
- No weakening parent approval, safety, transfer, or mastery rules.
