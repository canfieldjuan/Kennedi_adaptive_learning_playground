# Kennedi’s Orders Game Design Spec

## 1. Game Summary

`Kennedi's Orders` is a pretend restaurant game where the child runs a tiny Bear Cafe. A bear character calls the cafe, gives an order, and waits while the child makes, decorates, checks, and delivers the food.

The visible game is role play:
- answer the ringing phone
- hear who is calling
- make the order on the kitchen counter
- decorate or choose attributes
- check the tray
- deliver through the window
- see the character react

The hidden learning job is to produce evidence for:
- counting objects
- quantity matching
- color recognition
- first sound recognition
- vocabulary
- sequencing
- working memory
- category sorting
- basic logic
- early executive function

This game is not a quiz screen. The learning task is embedded inside the job of being the chef, order-taker, maker, checker, and delivery boss.

## 2. Child Fantasy

The child is in charge of the Bear Cafe.

The game should consistently frame her as:
- the chef who decides when the order is ready
- the boss who answers the phone
- the maker who builds the food
- the decorator who adds the finishing touch
- the checker who catches kitchen mix-ups
- the delivery leader who sends food to the right bear

Core role-play language:
- "You're the chef."
- "Daddy Bear is calling."
- "What did he order?"
- "Make the order."
- "Check the tray."
- "Deliver it."
- "Order ready."
- "You fixed it."
- "You delivered it."

The child should feel like she is running the place, not being tested.

## 3. Why This Fits the Child

This child already loves bossing the play, pretend phone calls, making food, taking orders, delivering things, decorating, color play, bear family stories, and winning little missions. `Kennedi's Orders` combines those interests into one short, repeatable pretend-play loop.

The cognitive ceiling can rise without making the physical interaction harder:
- early rounds allow free choice and ownership
- later rounds add color, quantity, sound, memory, and correction challenges
- touch targets stay large
- prompts are spoken
- checking and fixing are framed as boss work
- no screen tells her she failed

The game also matches advanced preschool language without requiring reading. Prompts can be spoken in complete, playful sentences while the interactive choices remain icon-first and tap-first.

## 4. Core Loop

1. The cafe phone rings.
2. The child taps the phone.
3. One bear appears on the call card and gives an order.
4. The child selects or builds the requested food on the kitchen counter.
5. The child decorates or chooses attributes when needed.
6. The child taps the tray check button.
7. The tray either becomes ready or invites a gentle fix.
8. The child taps the delivery window.
9. The bear receives the order and reacts happily.
10. The game logs evidence through the existing event logger.
11. The child chooses "next order" or "done."

Required activity state names for implementation handoff:
- `idle_cafe`
- `phone_ringing`
- `order_intro`
- `order_prompt`
- `make_food`
- `decorate_or_attribute`
- `tray_check`
- `fix_order`
- `delivery`
- `character_reaction`
- `round_complete`

Round length target:
- first build: 45 to 90 seconds
- mature build: 30 to 120 seconds depending on level

## 5. Screen-by-Screen UX

### Screen 1: Bear Cafe Home

Purpose: establish role and let the child start one order.

Visible elements:
- cozy Bear Cafe counter
- big toy phone
- three bear portraits in the environment
- tray area visible but inactive
- one large "open cafe" or phone-tap start target

Behavior:
- phone gives a calm ring animation
- tapping phone starts the round
- no menu grid for the child
- parent-only controls stay behind the parent gate

Spoken prompt:
- "The Bear Cafe is open. You're the chef."

Evidence:
- optional `round_started`
- input type: `tap`

### Screen 2: Phone Call

Purpose: deliver the order as pretend play.

Visible elements:
- large phone card
- caller portrait: Baby Polar Bear, Mama Bear, or Daddy Bear
- 1 to 3 order icons, depending on level
- replay prompt button with speaker icon
- large "make it" button or direct transition after prompt

Behavior:
- character says the order aloud
- order icons can pulse once after speech
- child can tap replay without penalty

Spoken prompt examples:
- "Daddy Bear is calling. He wants a pink cupcake."
- "Baby Polar Bear wants 3 berries."
- "Mama Bear wants foods that start like bear."

Evidence:
- `prompt_replayed` when speaker is tapped
- replay count contributes to working-memory evidence but is not treated as failure

### Screen 3: Kitchen Counter

Purpose: build or choose the food.

Visible elements:
- large plate or tray in the center
- 3 to 6 food choices, depending on difficulty
- food objects: cupcake, berry, banana, bread, cookie, soup, apple
- optional count bowl or ingredient row for quantity rounds

Primary interaction:
- tap a food to place it on the tray
- tap placed food to remove it
- for quantity, each tap adds one item with a visible count

Forgiveness:
- hit boxes extend beyond visible art
- a selected food can be changed before tray check
- over-counting is fixable by tapping an item off the tray

Evidence:
- selected food ids
- correct food ids
- attempt number
- response time
- input type

### Screen 4: Decoration or Attribute Station

Purpose: select color or decoration when required.

Visible elements:
- food preview on tray
- large color swatches: pink, yellow, red, orange, blue
- decoration buttons: sprinkles, stars, hearts, bubbles
- simple "done" tray button

Behavior:
- Level 1 allows any decoration
- attribute rounds require the requested color
- decoration choice can still be logged as preference evidence
- color change is instant and reversible before tray check

Evidence:
- selected color
- correct color when applicable
- selected decoration
- hint shown

### Screen 5: Tray Check

Purpose: compare the made order to the spoken order.

Visible elements:
- tray on one side
- simple order ticket on the other side
- check button with a large checkmark icon
- no red X

Behavior:
- correct order moves to delivery
- mismatch enters `fix_order`
- mismatch feedback names the order, not the child

Spoken correct feedback:
- "Order ready."
- "You made the order."

Spoken fix feedback:
- "Let's check the order."
- "Daddy Bear asked for 3. Let's count."
- "Baby Polar Bear wanted something pink."

Evidence:
- outcome
- mismatch type
- attempts
- hint usage
- correction success

### Screen 6: Fix the Order

Purpose: let the child act like the boss correcting the kitchen.

Visible elements:
- same tray and order ticket
- mismatched part gently wiggles
- large replacement choices or add/remove controls

Behavior:
- no failure screen
- child can correct the tray
- after repeated misses, a spoken hint appears
- the bear waits cheerfully

Language:
- "You can fix it."
- "The kitchen needs one more cookie."
- "That was tricky. You found it."

Evidence:
- detected mismatch
- corrected mismatch
- time to correction
- hint shown
- self-correction evidence

### Screen 7: Delivery Window

Purpose: finish the pretend job with a clear success moment.

Visible elements:
- delivery window or counter handoff
- caller bear waiting
- tray with completed order
- big delivery target

Behavior:
- tap delivery window to hand over the order
- food slides gently to the character
- bear smiles, waves, or claps softly
- short chime

Spoken feedback:
- "Order delivered."
- "You delivered it."

Evidence:
- activity completed
- final outcome
- completion time

### Screen 8: Next Order or Done

Purpose: give control without creating an endless autoplay chain.

Visible elements:
- two large choices: next order, done
- optional bear family wave
- no streaks, coins, loot, or score

Behavior:
- child must choose next order
- no automatic next round
- parent-approved activity variants only

Evidence:
- `next_order_selected` or `session_done_selected`

## 6. Natural Progression

### Level 1: Free Make

Purpose: let the child understand the kitchen and feel ownership.

Prompt examples:
- "Make Baby Polar Bear a snack."
- "Pick something yummy."
- "Decorate it."

Choices:
- 3 to 5 foods
- all colors and decorations allowed

Skills:
- choice making
- vocabulary
- creative confidence
- object recognition

Evidence:
- selected food
- selected color
- selected decoration
- completed delivery
- prompt replay use

Outcome rules:
- no right or wrong
- `outcome: completed_free_make`

Recommended transfer context:
- `role_play_order_matching`
- `same_format_same_examples`

### Level 2: Single Attribute Order

Purpose: match one requested object plus one visible attribute.

Prompt examples:
- "Daddy Bear wants a pink cupcake."
- "Mama Bear wants yellow soup."
- "Baby Polar Bear wants a red berry."

Choices:
- 3 foods
- 3 color swatches at first, then 5

Skills:
- color recognition
- object recognition
- listening comprehension
- vocabulary

Evidence:
- correct object
- selected object
- correct color
- selected color
- response time
- hint usage

Outcome rules:
- `correct`
- `incorrect_object`
- `incorrect_color`
- `mixed_then_corrected`

Recommended transfer context:
- `attribute_combo_order`
- `same_format_same_examples`
- `same_format_new_examples`

### Level 3: Quantity Order

Purpose: count objects into the tray.

Prompt examples:
- "Baby Polar Bear wants 3 berries."
- "Daddy Bear wants 2 cookies."
- "Mama Bear wants 4 apple slices."

Choices:
- one requested food with add/remove count controls in earliest version
- later, 3 food choices plus count

Skills:
- counting objects
- one-to-one correspondence
- quantity matching
- self-correction

Evidence:
- count requested
- count selected
- over-count or under-count
- corrected count
- response time
- hint usage

Outcome rules:
- `correct_quantity`
- `under_count`
- `over_count`
- `corrected_quantity`

Recommended transfer context:
- `quantity_in_pretend_play`
- `different_prompt_mode`

Example:
- Prompt: "Baby Polar Bear wants 3 berries."
- First selected: 4 berries.
- Outcome: `over_count`
- Hint: "Count them with me."
- Correction: selected 3 berries.
- Evidence summary: quantity understanding partial, self-correction yes, counting objects practicing.

### Level 4: Two-Part Order

Purpose: hold and match color plus quantity plus object.

Prompt examples:
- "Daddy Bear wants 2 yellow cookies."
- "Mama Bear wants 3 pink berries."
- "Baby Polar Bear wants 1 red cupcake."

Choices:
- 3 foods
- 3 to 5 colors
- tap-to-add quantity

Skills:
- working memory
- color plus quantity
- object plus attribute matching
- multi-step listening

Evidence:
- matched object
- matched color
- matched quantity
- attempts
- hints
- prompt replay use

Outcome rules:
- `correct_all_parts`
- `incorrect_object`
- `incorrect_color`
- `incorrect_quantity`
- `partial_match`
- `corrected_all_parts`

Recommended transfer context:
- `attribute_combo_order`
- `quantity_in_pretend_play`
- `different_prompt_mode`

### Level 5: First Sound Order

Purpose: sort foods by first sound inside a restaurant order.

Prompt examples:
- "Baby Polar Bear wants foods that start with B."
- "Pick foods that start like bear."
- "Find banana, berry, and bread."

Correct examples:
- banana
- berry
- bread

Distractors:
- apple
- cookie
- soup

Skills:
- first sound recognition
- phonemic awareness
- vocabulary
- category sorting

Evidence:
- correct first-sound choices
- incorrect distractors
- hint usage
- successful transfer from basic phonics
- distractor confusion

Outcome rules:
- `correct_sound_sort`
- `mixed_sound_sort`
- `distractor_selected`
- `corrected_sound_sort`

Recommended transfer context:
- `phonics_food_sort`
- `category_sort`

Example:
- Prompt: "Pick foods that start with B."
- Selected: banana, berry, cookie.
- Outcome: `mixed_sound_sort`
- Evidence summary: initial /b/ practicing, category sort partial, distractor confusion cookie.

### Level 6: Memory Order

Purpose: remember two parts or two item groups before building.

Prompt examples:
- "Daddy Bear wants 2 bananas and 1 cookie."
- "Mama Bear wants pink soup and 3 berries."
- "Baby Polar Bear wants a yellow cup and 2 crackers."

Choices:
- 4 to 6 food choices
- color swatches when needed
- replay button always available

Skills:
- working memory
- sequencing
- quantity
- vocabulary
- listening comprehension

Evidence:
- remembered items
- missed items
- corrected items
- repeated prompt used
- order of actions

Outcome rules:
- `remembered_full_order`
- `missed_item`
- `missed_attribute`
- `used_replay_then_correct`
- `corrected_memory_order`

Recommended transfer context:
- `memory_order_recall`
- `delayed_review`
- `different_prompt_mode`

### Level 7: Fix the Order

Purpose: compare the order ticket to a prepared tray and correct the mismatch.

Prompt examples:
- "Oops. Baby Bear ordered berries, but got soup."
- "Daddy Bear wanted 3 cookies, but there are only 2."
- "Mama Bear wanted yellow, but this is red."

Interaction:
- child sees the tray and order ticket
- mismatch part wiggles gently after the first check or after a hint
- child removes, adds, or recolors the wrong part

Skills:
- error detection
- correction
- comparison
- reasoning
- executive function

Evidence:
- detected mismatch
- mismatch type
- corrected mismatch
- time to correction
- hint usage

Outcome rules:
- `detected_mismatch`
- `corrected_object_mismatch`
- `corrected_quantity_mismatch`
- `corrected_color_mismatch`
- `hinted_correction`

Recommended transfer context:
- `error_correction_order_fix`
- `reverse_mapping`

Important framing:
- the kitchen made the mix-up
- the child is the boss fixing the kitchen
- never imply the child caused a bad order

## 7. Skill Mapping

| Skill area | In-game behavior | Evidence signal | Levels |
| --- | --- | --- | --- |
| Choice making | chooses food or decoration in a free order | selected food and decoration, completed delivery | 1 |
| Vocabulary | identifies foods, colors, decorations, bear callers | selected object ids, prompt vocabulary ids | 1-7 |
| Object recognition | picks requested food | selected choice id vs correct choice id | 2-7 |
| Color recognition | applies requested color | selected color vs correct color | 2, 4, 6, 7 |
| Counting objects | taps the correct number of items | count requested, count selected, over/under | 3, 4, 6, 7 |
| Quantity matching | compares tray amount to order | corrected count, quantity mismatch detection | 3, 4, 6, 7 |
| First sound recognition | sorts B foods from distractors | correct B selections, distractors selected | 5 |
| Category sorting | groups foods by initial sound or food type | set accuracy, distractor strength | 5 |
| Working memory | remembers multi-part order | replay use, missed item, corrected item | 4, 6 |
| Sequencing | answers, makes, checks, delivers | state completion order, delivery completion | 1-7 |
| Basic logic | compares order ticket to tray | mismatch type and correction path | 7 |
| Executive function | pauses, checks, fixes, retries | self-correction without harsh feedback | 3-7 |

Skill id naming recommendation:
- `vocabulary_food_names`
- `object_recognition_food`
- `color_recognition_basic`
- `counting_objects_to_5`
- `quantity_matching_to_5`
- `initial_sound_b`
- `category_sort_by_initial_sound`
- `working_memory_two_part_order`
- `sequencing_order_delivery`
- `error_detection_order_mismatch`
- `self_correction_after_feedback`

## 8. Transfer Metadata Plan

Every activity variant should define transfer metadata. The game should not create a separate progress model. It should attach transfer metadata to variants and emit events through the existing event logger.

Recommended game-specific context ids:
- `role_play_order_matching`
- `quantity_in_pretend_play`
- `attribute_combo_order`
- `phonics_food_sort`
- `memory_order_recall`
- `error_correction_order_fix`
- `delivery_sequence`

Recommended `TransferContextType` usage:
- `same_format_same_examples`: repeat an order with the same food set and same interaction model
- `same_format_new_examples`: same level with new foods, colors, or bear caller
- `different_prompt_mode`: move between spoken order, icon ticket, and parent-observed real-world prompt
- `different_interaction_model`: tap-to-select in this game vs another approved activity format
- `reverse_mapping`: show a made tray and ask the child to fix it or identify the order
- `category_sort`: first-sound food sorting
- `delayed_review`: later replay of a previously practiced skill
- `parent_observed_real_world`: parent notes a real-world order-taking, counting, or first-sound moment

Example transfer metadata:

```json
{
  "context_type": "category_sort",
  "context_id": "phonics_food_sort",
  "example_set_id": "b-foods-set-1",
  "prompt_mode": "spoken",
  "source_game": "kennedis-orders",
  "interaction_model": "tap_to_select"
}
```

Variant-level transfer examples:

```json
[
  {
    "activity_id": "kennedis-orders-free-make-001",
    "context_type": "same_format_same_examples",
    "context_id": "role_play_order_matching",
    "example_set_id": "bear-cafe-starter-foods",
    "prompt_mode": "spoken"
  },
  {
    "activity_id": "kennedis-orders-pink-cupcake-001",
    "context_type": "same_format_new_examples",
    "context_id": "attribute_combo_order",
    "example_set_id": "starter-food-colors-1",
    "prompt_mode": "spoken"
  },
  {
    "activity_id": "kennedis-orders-three-berries-001",
    "context_type": "different_prompt_mode",
    "context_id": "quantity_in_pretend_play",
    "example_set_id": "counting-foods-to-5-1",
    "prompt_mode": "spoken"
  },
  {
    "activity_id": "kennedis-orders-b-foods-001",
    "context_type": "category_sort",
    "context_id": "phonics_food_sort",
    "example_set_id": "b-foods-set-1",
    "prompt_mode": "spoken"
  }
]
```

## 9. Evidence and Event Mapping

The game must emit evidence events through the existing event logger. It must not invent a second progress system.

Required event fields for game events:
- `activity_id`
- `activity_version`
- `skill_ids`
- `session_id`
- `child_id`
- `timestamp`
- `outcome`
- `selected_choice_id`
- `correct_choice_id`
- `attempt_number`
- `response_time_ms`
- `difficulty_level`
- `choice_count`
- `distractor_strength`
- `input_type`
- `hint_shown`
- `prompt`
- `selected_answer`
- `correct_answer`
- `context_id`
- `context_type`

Recommended event names:
- `order_round_started`
- `phone_answered`
- `order_prompt_played`
- `order_prompt_replayed`
- `food_selected`
- `food_removed`
- `attribute_selected`
- `tray_checked`
- `hint_shown`
- `order_corrected`
- `order_delivered`
- `order_round_completed`

### Level 1 Evidence

Primary outcome:
- `completed_free_make`

Log:
- selected food
- selected decoration
- selected color if any
- delivered yes/no
- response time from prompt to delivery

Evidence interpretation:
- vocabulary exposure
- object recognition practice
- creative confidence
- sequence completion

### Level 2 Evidence

Primary outcomes:
- `correct`
- `incorrect_object`
- `incorrect_color`
- `mixed_then_corrected`

Log:
- requested object and color
- selected object and color
- hint shown
- attempt count
- response time

Evidence interpretation:
- color recognition
- food vocabulary
- listening comprehension

### Level 3 Evidence

Primary outcomes:
- `correct_quantity`
- `under_count`
- `over_count`
- `corrected_quantity`

Log:
- count requested
- count selected
- add/remove actions
- hint shown
- corrected count

Example event payload:

```json
{
  "activity_id": "kennedis-orders-three-berries-001",
  "activity_version": "1.0.0",
  "skill_ids": ["counting_objects_to_5", "quantity_matching_to_5", "self_correction_after_feedback"],
  "outcome": "corrected_quantity",
  "selected_choice_id": "berry",
  "correct_choice_id": "berry",
  "attempt_number": 2,
  "response_time_ms": 18300,
  "difficulty_level": 3,
  "choice_count": 1,
  "distractor_strength": "none",
  "input_type": "tap_to_add",
  "hint_shown": true,
  "prompt": "Baby Polar Bear wants 3 berries.",
  "selected_answer": { "food_id": "berry", "quantity": 3, "first_attempt_quantity": 4 },
  "correct_answer": { "food_id": "berry", "quantity": 3 },
  "context_id": "quantity_in_pretend_play",
  "context_type": "different_prompt_mode"
}
```

Evidence interpretation:
- quantity understanding partial when over/under count occurs
- self-correction yes when final corrected count matches
- counting objects practicing

### Level 4 Evidence

Primary outcomes:
- `correct_all_parts`
- `partial_match`
- `corrected_all_parts`

Log:
- requested object, color, and quantity
- selected object, color, and quantity
- which parts matched
- prompt replay use

Evidence interpretation:
- working memory
- multi-attribute matching
- quantity plus attribute coordination

### Level 5 Evidence

Primary outcomes:
- `correct_sound_sort`
- `mixed_sound_sort`
- `distractor_selected`
- `corrected_sound_sort`

Log:
- correct initial-sound set
- selected set
- distractors selected
- hint usage
- final corrected set

Example event payload:

```json
{
  "activity_id": "kennedis-orders-b-foods-001",
  "activity_version": "1.0.0",
  "skill_ids": ["initial_sound_b", "category_sort_by_initial_sound", "vocabulary_food_names"],
  "outcome": "mixed_sound_sort",
  "selected_choice_id": "banana,berry,cookie",
  "correct_choice_id": "banana,berry,bread",
  "attempt_number": 1,
  "response_time_ms": 22100,
  "difficulty_level": 5,
  "choice_count": 6,
  "distractor_strength": "medium",
  "input_type": "tap_to_select",
  "hint_shown": true,
  "prompt": "Pick foods that start with B.",
  "selected_answer": ["banana", "berry", "cookie"],
  "correct_answer": ["banana", "berry", "bread"],
  "context_id": "phonics_food_sort",
  "context_type": "category_sort"
}
```

Evidence interpretation:
- initial /b/ practicing
- category sort partial
- distractor confusion: cookie

### Level 6 Evidence

Primary outcomes:
- `remembered_full_order`
- `missed_item`
- `missed_attribute`
- `used_replay_then_correct`
- `corrected_memory_order`

Log:
- complete requested order
- selected order
- missing items
- prompt replay count
- sequence of selections

Evidence interpretation:
- working memory strength
- sequencing
- listening comprehension
- vocabulary

### Level 7 Evidence

Primary outcomes:
- `detected_mismatch`
- `corrected_object_mismatch`
- `corrected_quantity_mismatch`
- `corrected_color_mismatch`
- `hinted_correction`

Log:
- mismatch type
- whether the child checked before hint
- correction action
- time to correction
- hint usage

Evidence interpretation:
- error detection
- comparison
- reasoning
- executive function
- self-correction

## 10. Feedback Rules

Correct feedback:
- food sparkles gently
- character smiles
- short warm chime
- spoken line: "You made the order."
- alternate spoken line: "Order ready."

Delivery feedback:
- tray slides to character
- character receives order
- spoken line: "Order delivered."
- alternate spoken line: "You delivered it."

Incorrect or incomplete feedback:
- object gently wiggles
- no harsh sound
- no red X
- no "wrong"
- no "failed"
- character or narrator says: "Let's check the order."
- after repeated miss, hint appears

Hint examples:
- "Daddy Bear asked for 3. Let's count."
- "Baby Polar Bear wanted something pink."
- "Bear starts with b-b-b. Banana starts with b-b-b."
- "The kitchen needs one more cookie."

Allowed praise:
- "You found it."
- "You made the order."
- "You fixed it."
- "You tried again."
- "That was tricky."
- "You delivered it."

Avoid:
- "You are so smart."
- "Wrong."
- "You failed."
- "Try harder."
- "You lost."

Feedback timing:
- first mismatch: gentle check prompt only
- second mismatch: specific hint
- third mismatch: reduce choices or highlight relevant order ticket part
- completion: always warm, short, and finite

## 11. Parent Dashboard Evidence Examples

Counting objects to 5:

```txt
Skill: Counting objects to 5
Game: Kennedi's Orders
Evidence:
- Requested: 3 berries
- Selected: 3 berries
- Hints used: 0
- Result: correct
Recommendation impact:
- supports quantity matching in pretend-play context
```

Initial /b/ sound:

```txt
Skill: Initial /b/ sound
Game: Kennedi's Orders
Evidence:
- Correctly selected banana and berry
- Incorrectly selected cookie
- Used 1 sound hint
Result:
- practicing
Recommendation:
- repeat with new B-food examples
```

Error correction:

```txt
Skill: Error correction
Game: Kennedi's Orders
Evidence:
- Detected missing cookie
- Added 1 cookie without hint
Result:
- strong self-correction evidence
```

Working memory:

```txt
Skill: Working memory for two-part order
Game: Kennedi's Orders
Evidence:
- Requested: 2 bananas and 1 cookie
- Built: 2 bananas
- Replayed prompt: 1 time
- Added missing cookie after replay
Result:
- practicing with successful repair
Recommendation:
- repeat two-part orders with same foods before adding a color attribute
```

Color recognition:

```txt
Skill: Color recognition
Game: Kennedi's Orders
Evidence:
- Requested: pink cupcake
- Selected: cupcake
- Color selected: pink
- Hints used: 0
Result:
- strong evidence in food-order context
```

## 12. Content Pack Examples

Content packs should stay local, bundled, or parent-approved. New variants should enter draft or pending state unless the existing approval system defines a stricter state.

Starter characters:

```json
[
  {
    "id": "baby-polar-bear",
    "display_name": "Baby Polar Bear",
    "voice_prompt_style": "small_playful",
    "approved": true
  },
  {
    "id": "mama-bear",
    "display_name": "Mama Bear",
    "voice_prompt_style": "warm_clear",
    "approved": true
  },
  {
    "id": "daddy-bear",
    "display_name": "Daddy Bear",
    "voice_prompt_style": "cozy_clear",
    "approved": true
  }
]
```

Starter foods:

```json
[
  { "id": "cupcake", "label": "cupcake", "first_sound": "c", "category": "treat" },
  { "id": "berry", "label": "berry", "first_sound": "b", "category": "fruit" },
  { "id": "banana", "label": "banana", "first_sound": "b", "category": "fruit" },
  { "id": "bread", "label": "bread", "first_sound": "b", "category": "bakery" },
  { "id": "cookie", "label": "cookie", "first_sound": "c", "category": "treat" },
  { "id": "soup", "label": "soup", "first_sound": "s", "category": "meal" },
  { "id": "apple", "label": "apple", "first_sound": "a", "category": "fruit" }
]
```

Starter colors:

```json
[
  { "id": "pink", "label": "pink", "hex": "#f472b6", "favorite_weight": "high" },
  { "id": "yellow", "label": "yellow", "hex": "#facc15", "favorite_weight": "medium" },
  { "id": "red", "label": "red", "hex": "#ef4444", "favorite_weight": "medium" },
  { "id": "orange", "label": "orange", "hex": "#fb923c", "favorite_weight": "medium" },
  { "id": "blue", "label": "blue", "hex": "#60a5fa", "favorite_weight": "medium" }
]
```

Starter decorations:

```json
[
  { "id": "sprinkles", "label": "sprinkles" },
  { "id": "stars", "label": "stars" },
  { "id": "hearts", "label": "hearts" },
  { "id": "bubbles", "label": "bubbles" }
]
```

Minimum first-build activity variants:

```json
[
  {
    "id": "kennedis-orders-free-make-001",
    "status": "pending_parent_approval",
    "level": 1,
    "character_id": "baby-polar-bear",
    "prompt": "Make Baby Polar Bear a snack.",
    "required_answer": null,
    "skills": ["vocabulary_food_names", "object_recognition_food", "sequencing_order_delivery"],
    "context_id": "role_play_order_matching",
    "context_type": "same_format_same_examples"
  },
  {
    "id": "kennedis-orders-pink-cupcake-001",
    "status": "pending_parent_approval",
    "level": 2,
    "character_id": "daddy-bear",
    "prompt": "Daddy Bear wants a pink cupcake.",
    "required_answer": { "food_id": "cupcake", "color_id": "pink" },
    "skills": ["object_recognition_food", "color_recognition_basic", "listening_comprehension_spoken_order"],
    "context_id": "attribute_combo_order",
    "context_type": "same_format_same_examples"
  },
  {
    "id": "kennedis-orders-three-berries-001",
    "status": "pending_parent_approval",
    "level": 3,
    "character_id": "baby-polar-bear",
    "prompt": "Baby Polar Bear wants 3 berries.",
    "required_answer": { "food_id": "berry", "quantity": 3 },
    "skills": ["counting_objects_to_5", "quantity_matching_to_5"],
    "context_id": "quantity_in_pretend_play",
    "context_type": "different_prompt_mode"
  },
  {
    "id": "kennedis-orders-b-foods-001",
    "status": "pending_parent_approval",
    "level": 5,
    "character_id": "mama-bear",
    "prompt": "Pick foods that start with B.",
    "required_answer": { "food_ids": ["banana", "berry", "bread"] },
    "distractors": ["apple", "cookie", "soup"],
    "skills": ["initial_sound_b", "category_sort_by_initial_sound", "vocabulary_food_names"],
    "context_id": "phonics_food_sort",
    "context_type": "category_sort"
  }
]
```

## 13. Accessibility and Touch Rules

Touch and layout:
- primary touch targets should be at least 64px by 64px
- preferred target size is 80px by 80px or larger on tablets
- hit boxes should extend beyond decorative art
- tray, phone, and delivery targets should be visually obvious
- no tiny drag targets
- first build should prefer tap-to-select and tap-then-place
- drag/drop may be added later only with large forgiving zones

Prompting:
- no reading required in child mode
- every order prompt must be spoken
- replay prompt button must be available during build and memory levels
- order ticket can show icons for parent transparency and child visual support

Motor safety:
- no speed pressure
- no penalty for slow response
- no rapid repeated taps required
- no precision tracing
- no long hold required

Visual safety:
- warm, colorful, cozy Bear Cafe style
- simple screens with 3 to 6 choices
- pink should be prominent but not the only color
- avoid visual clutter
- calm animations only
- avoid flashing, shaking, or surprise motion

Audio:
- no autoplay chains
- phone ring should be soft and finite
- chime should be short and gentle
- speech should be clear, slow enough for a 3-year-old body, but not babyish

## 14. Safety Audit

Child mode must not include:
- external links
- open web
- YouTube browsing
- ads
- comments
- chat
- social sharing
- leaderboards
- streaks
- random reward loops
- infinite scroll
- autoplay chains
- unapproved AI-generated content
- harsh failure states
- shame language
- red-X-centered feedback
- hard "you lost" screens

Content safety rules:
- all characters, foods, prompts, images, and audio must be local, bundled, or parent-approved
- new activity variants must be draft or pending until approved
- child mode must show only approved content
- parent gate remains the boundary for approval, evidence review, and settings

Game-specific safety notes:
- no real phone call simulation beyond a toy cafe phone
- no contact list
- no microphone requirement
- no open-ended text entry
- no public sharing of created food trays
- no economy, coins, store, streak, loot, or leaderboard

Failure-state audit:
- incorrect choices lead to check-and-fix
- the kitchen/order can be wrong, not the child
- feedback never says "wrong," "failed," "lost," or "try harder"
- every round can finish after correction

## 15. Minimal First Build Scope

Minimum playable version:
- phone rings
- child answers call
- one of three bear characters gives order
- child chooses food from large options
- child decorates or selects requested attribute
- child delivers order
- character reacts
- event is logged
- activity completes

Minimum activity variants:
- Free Make
- Pink cupcake order
- 3 berries order
- B-food first sound order

Minimum characters:
- Baby Polar Bear
- Mama Bear
- Daddy Bear

Minimum foods:
- cupcake
- berry
- banana
- bread
- cookie
- soup
- apple

Minimum colors:
- pink
- yellow
- red
- orange
- blue

Minimum decorations:
- sprinkles
- stars
- hearts
- bubbles

Minimum states:
- `phone_ringing`
- `order_prompt`
- `make_food`
- `decorate_or_attribute`
- `tray_check`
- `delivery`
- `character_reaction`
- `round_complete`

Minimum evidence:
- activity id and version
- skill ids
- selected answer
- correct answer when applicable
- outcome
- response time
- attempt number
- hint shown
- difficulty level
- context id and context type

Explicit non-scope:
- other games
- backend
- user accounts
- cloud sync
- AI tutor chat
- public sharing
- real payment/store features
- real phone/audio calling
- open-ended generative content in child mode
- complex inventory system
- scoring economy
- streaks
- leaderboards
- randomized loot rewards
- full curriculum expansion

## 16. Implementation Handoff Notes

Recommended module boundary:
- create a `kennedis-orders` game module only when implementation begins
- keep game rendering and state transitions inside that module
- use existing activity registry, event logger, transfer metadata, approval state, and parent dashboard pathways
- do not create a parallel game progress store

Activity data expectations:
- one activity variant should describe one order challenge
- each variant should declare difficulty level, character, prompt, allowed choices, correct answer, skills, and transfer metadata
- Level 1 variants may have `required_answer: null`
- Level 5 variants need correct set and distractor set
- Level 7 variants need both `expected_order` and `prepared_tray`

State machine expectations:
- order prompt must be available before choices are enabled
- every selection should be reversible before tray check
- tray check is the evidence commit point for answer correctness
- final delivery is the activity completion point
- prompt replay is allowed and logged

Event logging expectations:
- emit low-level interaction events only if the existing logger supports them without schema expansion
- always emit a round completion evidence event
- include transfer context on the evidence event
- log hints as boolean plus optional hint id if available
- record response time from end of spoken prompt to tray check, and completion time from phone answer to delivery

Parent approval expectations:
- game content packs and activity variants must respect existing approval flow
- child mode should filter to approved variants only
- parent dashboard can show draft evidence format before approving new variants, but child cannot launch unapproved content

Adaptivity expectations:
- difficulty may move upward cognitively by adding attributes, quantities, memory load, or distractors
- physical interaction should remain stable: large tap targets, forgiving selection, no speed pressure
- when evidence is mixed, repeat same pretend-play format with new examples before changing interaction model

Art and audio expectations:
- use cozy Bear Cafe art with clear large objects
- foods should be visually distinct by silhouette and color
- bear characters should have simple happy/neutral/waiting reactions
- audio prompts should be local or parent-approved
- no need for real voice recognition or microphone input

## 17. Future Expansion Ideas for This Game Only

These are later expansions inside `Kennedi's Orders`, not separate roadmap games:
- more approved bear-family order scripts
- additional food sets for new first sounds, such as M foods or S foods
- parent-approved favorite color packs
- seasonal cafe decorations
- two-bear combined orders after Level 6 is strong
- "boss ticket" mode where the child chooses which order ticket to make first
- real-world parent observation prompts, such as "Kennedi counted 3 crackers at snack"
- delayed review orders that revisit a previous skill after several days
- optional outfit apron choice for the chef before the first order
- delivery address icons inside the cafe, still without maps or open web
