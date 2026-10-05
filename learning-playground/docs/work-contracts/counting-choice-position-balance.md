# Change Contract: balanced answer positions for explicit counting choices

## Before Code

### Root Cause

A choice-mode counting book places the correct number among three dotted choices. Without explicit choices, the
generator balances that position: `countingPages()` deals positions `i % 3` through a seeded shuffle
(`workbook/src/content/counting-practice.mjs:112`), and `verify` asserts the default book is exactly 8/8/8
(`workbook/scripts/counting.mjs:212`).

When a recipe gives explicit `choices`, they are kept verbatim (`counting-practice.mjs:118`). The verify balance check
only runs for the default book (`!customGroups`, `counting.mjs:212`). So nothing rejects a recipe whose correct
answers bunch in one box.

Observed on 2026-10-05: a Qwen Code + Strata run wrote `[count-1, count, count+1]` for every group. That put the
answer in the middle box in 6 of 8 questions (1/6/1). The recipe validated, built and passed `verify`. A child can
learn "circle the middle one" instead of counting.

### Correct Fix Must Touch

- `counting-practice.mjs`: one shared balance rule, applied in `createCountingBookFromGroups()` after the choices are
  final, so `resolveRecipe()` and `node scripts/workbook.mjs validate` reject a lopsided recipe at its origin, with a
  message naming the counts per position.
- `scripts/counting.mjs` verify: apply the same rule to custom-group choice books. The default book keeps its exact
  8/8/8 assertion.
- Rule: in choice mode, no position may hold the correct answer more than `ceil(groups / 3) + 1` times.
  - 1-2 groups always pass.
  - 3 groups: a maximum of 2.
  - 8 groups: a maximum of 4, so 1/6/1 fails and 4/2/2 passes.
- Tests: both directions and the boundary.
  - A lopsided explicit recipe is rejected.
  - The limit and the limit + 1 for the same group count are tested.
  - Mixed explicit and seeded recipes still pass.
  - The default book is unchanged.

### Must Not Change

- Explicit choices keep the author's exact order. `recipes.test.mjs:39` pins this.
- Lock and content hashes: choice order stays part of the locked content (`recipes.test.mjs:103`).
- Seeded placement, distractor selection, rendering, the schema, guided mode, and the alphabet and numbers templates.

### Assumptions / blockers

- The owner asked for this fix on 2026-10-05 ("Fix it now if it's not complex"), after the gap and a fix were
  described. That fix reordered explicit choices. This contract narrows it to a fail-closed guard, because the
  repo's tests make explicit order and lock fidelity an existing contract.
- No checked-in recipe has explicit choices (`recipes/*.json`), so no existing recipe or lock is affected.

### Verification plan

- `npm run workbook:test` and `npm run counting:test` pass, including the new tests.
- `node scripts/workbook.mjs validate` rejects the observed 1/6/1 recipe with the per-position counts. The same values
  reordered to 3/3/2 pass. `all` on a balanced explicit recipe passes `verify`.
- The default `counting-mixed` recipe still verifies 8/8/8. The `counting-custom` recipe (seeded choices) still
  verifies.

## Implementation summary

Implemented in `2811693`:

- `workbook/src/content/counting-practice.mjs`:
  - adds the exported `assertBalancedChoicePositions(groups)`, which counts the correct-answer position across all
    groups and enforces the limit `ceil(groups / 3) + 1`;
  - `createCountingBookFromGroups()` calls it in choice mode, after seeded choices are filled in.

  Explicit choices are not reordered.
- `workbook/scripts/counting.mjs`: verify applies the same helper to custom-group choice books. The default book keeps
  its exact 8/8/8 assertion.
- `workbook/tests/recipes.test.mjs` adds one test:
  - the observed 1/6/1 shape is rejected with its counts;
  - 8 groups: 2/4/2 passes at the limit, and 1/5/2 fails at the limit + 1;
  - 3 groups: 2/1/0 passes, and 3/0/0 fails;
  - a balanced explicit recipe keeps its exact order.

## Verification

- `npm run workbook:test`: 29 tests, 29 pass. `npm run counting:test`: 11 tests, 11 pass. The new test failed before
  the fix.
- The Qwen Code + Strata recipe from 2026-10-05 (`counting-choice-v2.json`) fails `validate`: `Correct answers bunch
  in one choice box (1/6/1 by position); reorder explicit choices so no box holds the answer more than 4 times.`
- The same numbers, with the answer moved to position `i % 3`, pass `validate`. `all` then exits 0, and verify
  reports `correct positions 3/3/2`.
- `all` on `recipes/counting-mixed.json` still verifies `8/8/8`. `all` on `recipes/counting-custom.json` still
  verifies `2/2/2`.

## Gap audit

DONE. Every "must touch" item is in `2811693`, and nothing in "must not change" moved:
- explicit order and the lock tests are unchanged;
- no schema, rendering or seeded-placement changes;
- no checked-in recipe has explicit choices.
