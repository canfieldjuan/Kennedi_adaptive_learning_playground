## The app adapts cognitive difficulty upward while keeping physical interaction and emotional feedback preschool-safe.

## Core product contract

This is not a “learning website for a 3-year-old.”

It is a **local-first adaptive learning playground** for a child who is physically 3, cognitively ahead in some lanes, and still very much a preschooler in motor control, emotion, attention, and fatigue.

That means the platform must separate:

| Layer               | Must respect                                           |
| ------------------- | ------------------------------------------------------ |
| **Body age**        | big buttons, low precision, short sessions, no clutter |
| **Cognitive level** | harder questions, richer words, faster progression     |
| **Emotional age**   | gentle failure, no shame, no grind                     |
| **Parent control**  | you approve content, difficulty, and media             |
| **System safety**   | no open web, no algorithm feeds, no child data leakage |

That separation is the whole architecture. Most kid apps fail because they mash those together like a cursed casserole.

---

# 1. Project contract

## `product.contract.md`

```md
# Learning Playground Product Contract

## Purpose
Create a private, local-first educational playground for an advanced preschool child.

## Adaptation fit principle
The purpose of adaptation is not to measure the child.

The purpose of adaptation is to continually improve the fit between the child and the learning experience.

When the app reports on progress, it should primarily explain how well the current activities fit the learner - not how the learner compares to an arbitrary standard.

When tempted to add rankings, age-equivalent labels, or "gifted" badges, hold them against that principle and ask: Does this improve the fit, or are we just measuring for the sake of measuring?

Today this playground is for one child. Someday it could support a child with dyslexia, another learning two languages, or one who races through math but struggles with attention. The engine does not have to know what kind of learner they are. It keeps asking one question:

"Is today's learning experience a better fit than yesterday's?"

## Primary user
A 3-year-old child with advanced cognitive ability in selected domains.

## Secondary user
Parent/admin who configures learning packs, reviews AI-generated content, monitors progress, and controls safety.

## Product principles
1. Challenge by mastery, not age.
2. Preserve preschool-safe interaction design.
3. Reward effort, curiosity, and completion, not compulsive streaks.
4. Avoid external links, ads, feeds, open search, and autoplay chains.
5. Store child data locally by default.
6. Let the parent approve all generated content before child exposure.
7. Use sessions, not endless engagement.
8. Every activity must be observable, testable, and resettable.

## MVP modules
- Home shell
- Puzzle / Logic
- Words / Speech
- Math / Patterns
- Art / Coloring
- Video Vault
- Parent Panel
- Local progress storage

## Explicit non-goals for MVP
- No public accounts
- No social sharing
- No open YouTube
- No cloud analytics
- No speech recognition dependency
- No generative AI directly visible to child
- No infinite progression loop
```

---

# 2. Child UX contract

This contract protects her from the system being too “adult” just because she’s smart. Smart does not mean she suddenly has surgical touchscreen precision. Horrifying how often adults confuse those.

## `ui-child.contract.md`

```md
# Child UI Contract

## Navigation
- Child-facing navigation must be icon-first.
- Text labels are optional support, never required for navigation.
- Each main screen may show no more than 4 primary choices.
- Every primary action must be tappable.

## Touch targets
- Primary targets must be visually large.
- Primary targets must include forgiving hit zones larger than the visible asset.
- Interactive objects must not be packed tightly together.
- Accidental miss must never trigger punishment.

## Input priority
Preferred interaction order:
1. Tap
2. Tap-then-select
3. Tap-and-hold
4. Drag only when the activity requires it

## Feedback
Every interaction must produce feedback:
- Correct: snap/glow/sound/speech/animation
- Incorrect: bounce/gentle cue/retry
- Idle: subtle prompt after delay
- Completion: short celebration, then return or next choice

## Failure behavior
Wrong answers must:
- Not remove progress
- Not shame the child
- Not display red X as primary feedback
- Offer one hint after repeated miss

## Session rules
- Activities must be short.
- Parent may set session limits.
- No autoplay next activity.
- No infinite feed.
```

### UI acceptance checks

```md
- [ ] A child can start an activity with one tap from home.
- [ ] A child can return home without reading.
- [ ] No screen has more than 4 primary child choices.
- [ ] Every tappable child element has a forgiving hit zone.
- [ ] Wrong answers bounce or guide instead of fail silently.
- [ ] No child-facing screen links to the open internet.
```

---

# 3. Learning domain contract

Do not hardcode “age 3,” “age 4,” “kindergarten.” That’s how you trap her in baby content and make her bored enough to overthrow the living room.

Use **domains, skills, and mastery levels**.

## `learning-domain.contract.ts`

```ts
export type LearningDomain =
  | "literacy"
  | "phonics"
  | "math"
  | "logic"
  | "spatial"
  | "memory"
  | "science"
  | "music"
  | "art"
  | "emotional"
  | "language"
  | "coding_concepts";

export type SkillId =
  | "letter_recognition"
  | "letter_sound_match"
  | "initial_sound"
  | "rhyming"
  | "vocabulary"
  | "counting"
  | "subitizing"
  | "shape_match"
  | "pattern_extend"
  | "same_different"
  | "category_sort"
  | "sequence_order"
  | "memory_match"
  | "emotion_identify"
  | "cause_effect"
  | "debug_sequence"
  | "color_fill"
  | "sound_match";

export type MasteryLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface SkillContract {
  skill_id: SkillId;
  domain: LearningDomain;
  level: MasteryLevel;
  prerequisite_skill_ids: SkillId[];
  observable_behavior: string;
  example_activity_ids: string[];
}
```

### Level meaning

| Level | Meaning                      |
| ----- | ---------------------------- |
| 0     | Introduce with heavy support |
| 1     | Recognize                    |
| 2     | Match                        |
| 3     | Choose among distractors     |
| 4     | Apply in a new context       |
| 5     | Explain, create, or transfer |

For a 3-year-old with advanced skills, she may be level 4 in vocabulary but level 1 in fine motor tracing. That is normal. Uneven development is not a bug. It is childhood, that adorable chaos engine.

---

# 4. Activity contract

Every game/activity needs one schema. This keeps the app extensible.

## `activity.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Learning Activity",
  "type": "object",
  "required": [
    "id",
    "version",
    "title",
    "domain",
    "skill_ids",
    "difficulty",
    "interaction_model",
    "estimated_duration_seconds",
    "content",
    "success_rules",
    "feedback_rules",
    "safety"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "version": {
      "type": "integer",
      "minimum": 1
    },
    "title": {
      "type": "string"
    },
    "domain": {
      "type": "string",
      "enum": [
        "literacy",
        "phonics",
        "math",
        "logic",
        "spatial",
        "memory",
        "science",
        "music",
        "art",
        "emotional",
        "language",
        "coding_concepts"
      ]
    },
    "skill_ids": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "difficulty": {
      "type": "object",
      "required": ["level", "choice_count", "distractor_strength"],
      "properties": {
        "level": { "type": "integer", "minimum": 0, "maximum": 5 },
        "choice_count": { "type": "integer", "minimum": 2, "maximum": 6 },
        "distractor_strength": {
          "type": "string",
          "enum": ["none", "easy", "medium", "hard"]
        }
      }
    },
    "interaction_model": {
      "type": "string",
      "enum": [
        "tap",
        "tap_to_match",
        "tap_then_place",
        "drag_drop",
        "draw",
        "color_fill",
        "watch_then_do"
      ]
    },
    "estimated_duration_seconds": {
      "type": "integer",
      "minimum": 15,
      "maximum": 300
    },
    "content": {
      "type": "object"
    },
    "success_rules": {
      "type": "object"
    },
    "feedback_rules": {
      "type": "object"
    },
    "safety": {
      "type": "object",
      "required": ["requires_parent_approval", "external_links_allowed"],
      "properties": {
        "requires_parent_approval": { "type": "boolean" },
        "external_links_allowed": { "type": "boolean" },
        "contains_video": { "type": "boolean" },
        "contains_audio": { "type": "boolean" }
      }
    }
  }
}
```

---

# 5. Example activity contract

## Letter sound match

```json
{
  "id": "phonics-find-b",
  "version": 1,
  "title": "Find the /b/ Sound",
  "domain": "phonics",
  "skill_ids": ["initial_sound", "letter_sound_match"],
  "difficulty": {
    "level": 2,
    "choice_count": 3,
    "distractor_strength": "easy"
  },
  "interaction_model": "tap_to_match",
  "estimated_duration_seconds": 60,
  "content": {
    "prompt_audio": "Find the word that starts with b.",
    "target_sound": "b",
    "choices": [
      {
        "id": "bear",
        "label": "bear",
        "image": "/assets/images/bear.svg",
        "correct": true
      },
      {
        "id": "cat",
        "label": "cat",
        "image": "/assets/images/cat.svg",
        "correct": false
      },
      {
        "id": "sun",
        "label": "sun",
        "image": "/assets/images/sun.svg",
        "correct": false
      }
    ]
  },
  "success_rules": {
    "correct_choice_id": "bear",
    "required_correct_count": 1,
    "max_attempts_before_hint": 2
  },
  "feedback_rules": {
    "correct": {
      "speech": "Bear starts with b!",
      "animation": "glow_pop",
      "sound": "soft_chime"
    },
    "incorrect": {
      "speech": "Try again. Listen for b.",
      "animation": "gentle_bounce",
      "sound": "soft_boing"
    },
    "hint": {
      "speech": "Buh, buh, bear.",
      "highlight_target": true
    }
  },
  "safety": {
    "requires_parent_approval": true,
    "external_links_allowed": false,
    "contains_video": false,
    "contains_audio": true
  }
}
```

---

# 6. Progress contract

Progress should track mastery signals, not just “she clicked 800 things.” Raw engagement is how the internet became a slot machine with comments.

## `progress.contract.ts`

```ts
export interface ChildProgressProfile {
  child_id: string;
  profile_version: number;
  created_at: string;
  updated_at: string;
  skill_mastery: Record<string, SkillMasteryState>;
  session_summary: SessionSummary[];
}

export interface SkillMasteryState {
  skill_id: string;
  current_level: number;
  confidence: number;
  total_attempts: number;
  correct_attempts: number;
  recent_accuracy: number;
  recent_average_response_ms: number;
  last_seen_at: string;
  last_promoted_at?: string;
  needs_review: boolean;
}

export interface SessionSummary {
  session_id: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  activities_completed: number;
  skills_touched: string[];
  parent_notes?: string;
}
```

### Do not track

```md
- No behavioral ad data
- No third-party analytics
- No heatmaps
- No precise biometric inference
- No open-ended voice recordings in MVP
- No cloud sync by default
```

---

# 7. Attempt event contract

This is the “logs are gospel” layer. Every meaningful interaction becomes a local event. Not creepy surveillance. Just enough to know whether the activity works.

## `attempt-event.contract.ts`

```ts
export type AttemptOutcome =
  | "correct"
  | "incorrect"
  | "hint_used"
  | "abandoned"
  | "completed";

export interface ActivityAttemptEvent {
  event_id: string;
  session_id: string;
  child_id: string;
  activity_id: string;
  activity_version: number;
  skill_ids: string[];
  timestamp: string;

  outcome: AttemptOutcome;

  selected_choice_id?: string;
  correct_choice_id?: string;

  attempt_number: number;
  response_time_ms: number;

  difficulty_level: number;
  choice_count: number;
  distractor_strength: "none" | "easy" | "medium" | "hard";

  input_type: "tap" | "drag" | "draw" | "video" | "speech";
  hint_shown: boolean;

  metadata?: Record<string, string | number | boolean>;
}
```

### Event rules

```md
- Every completed activity must emit at least one completion event.
- Every incorrect answer must emit an incorrect event.
- Every hint must emit a hint_used event.
- Events are stored locally first.
- Events may be exported by parent as JSON.
- Events must never be sent to a server without explicit parent action.
```

---

# 8. Adaptive difficulty contract

Keep this simple. No ML cosplay. A tiny deterministic rules engine is plenty for v1, because apparently the toddler app does not need Kubernetes and reinforcement learning.

## `adaptive-difficulty.contract.md`

```md
# Adaptive Difficulty Contract

## Goal
Adjust challenge based on recent mastery without creating pressure, addiction, or frustration.

## Promotion rule
Promote skill level when:
- recent accuracy >= 80%
- minimum recent attempts >= 5
- average response time is not extremely slow
- no repeated hint dependency
- child completed without visible frustration, if parent notes are available

## Review rule
Keep level stable when:
- recent accuracy is between 50% and 79%
- child needs hints but still completes
- response time is improving

## Support rule
Lower difficulty or add scaffolding when:
- recent accuracy < 50%
- child abandons twice in a row
- same wrong answer repeats
- parent marks activity as frustrating

## Difficulty knobs
- choice_count
- distractor_strength
- prompt_complexity
- visual_similarity
- time_pressure_enabled
- hint_level
- required_sequence_length

## Forbidden knobs
- No streak pressure
- No countdown timers by default
- No loss animations
- No shame language
- No random reward jackpot
```

## Deterministic scoring

```ts
export function shouldPromoteSkill(state: SkillMasteryState): boolean {
  return (
    state.total_attempts >= 5 &&
    state.recent_accuracy >= 0.8 &&
    state.confidence >= 0.7 &&
    !state.needs_review
  );
}

export function shouldAddSupport(state: SkillMasteryState): boolean {
  return (
    state.total_attempts >= 3 &&
    state.recent_accuracy < 0.5
  );
}
```

---

# 9. Reward contract

This one matters. The goal is **intrinsic motivation**, not “tiny casino in a unicorn costume.”

## `reward.contract.md`

```md
# Reward Contract

## Allowed rewards
- Short animation
- Gentle sound
- Spoken encouragement
- Unlocking a creative sticker after session completion
- Parent-visible milestone
- "You figured it out" feedback
- Curiosity prompt after success

## Forbidden rewards
- Streaks
- Daily pressure
- Random loot boxes
- Infinite levels
- Punitive loss states
- Social comparison
- Leaderboards
- Ads
- Engagement bait

## Reward language
Prefer:
- "You found it."
- "You solved it."
- "You tried again."
- "That was a tricky one."
- "You noticed the pattern."

Avoid:
- "You are so smart."
- "You failed."
- "Wrong."
- "Try harder."
- "You lost."
```

Why avoid “you’re so smart”? Because praising identity can backfire. Praise process: effort, noticing, trying, solving. Tiny humans need resilience, not a fragile genius label wrapped around their forehead like a LinkedIn headline.

---

# 10. Content pack contract

All lessons should be swappable. You should be able to add “animals,” “space,” “Black art,” “music,” “shapes,” whatever, without editing game code.

## `content-pack.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Content Pack",
  "type": "object",
  "required": [
    "id",
    "version",
    "title",
    "status",
    "created_by",
    "approved_by_parent",
    "items"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9-]+$"
    },
    "version": {
      "type": "integer",
      "minimum": 1
    },
    "title": {
      "type": "string"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "approved", "archived"]
    },
    "created_by": {
      "type": "string",
      "enum": ["parent", "ai", "system"]
    },
    "approved_by_parent": {
      "type": "boolean"
    },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "type", "label"],
        "properties": {
          "id": { "type": "string" },
          "type": {
            "type": "string",
            "enum": ["word", "image", "sound", "video", "shape", "story_prompt"]
          },
          "label": { "type": "string" },
          "phonetic_hint": { "type": "string" },
          "image_path": { "type": "string" },
          "audio_path": { "type": "string" },
          "video_path": { "type": "string" },
          "tags": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    }
  }
}
```

---

# 11. AI content contract

AI can help you generate content. AI should not talk directly to the child in MVP. Don’t let the robot babysit. I say this as the robot.

## `ai-content.contract.md`

```md
# AI Content Contract

## AI may generate
- Word lists
- Rhyming sets
- Category groups
- Simple stories
- Question prompts
- Activity drafts
- Parent summaries
- Difficulty variants

## AI may not directly publish to child mode
All AI-generated content must enter draft state.

## Parent approval required
Before child exposure, parent must review:
- wording
- age appropriateness
- cultural fit
- emotional tone
- factual correctness
- media assets

## AI output format
AI must return valid JSON matching activity or content-pack schemas.

## Rejection rules
Reject generated content if it contains:
- scary themes
- adult topics
- shame/punishment language
- external links
- ads or brands
- unsafe physical instructions
- misleading facts
- text too complex for child-facing UI
```

---

# 12. Safety contract

This is the hard boundary. No open internet inside child mode. Not “mostly safe.” Not “YouTube Kids seems fine.” No. The algorithm is a raccoon in a lab coat.

## `safety.contract.md`

```md
# Safety Contract

## Child mode must never expose
- External links
- Search bars for web content
- Open YouTube
- Ads
- Comment sections
- Chat boxes
- Upload forms
- Public sharing
- Unreviewed AI output
- Autoplay chains
- Infinite scroll

## Child mode may expose
- Approved local videos
- Approved images
- Approved audio
- Approved activities
- Parent-created content packs

## Parent gate
Parent panel must require one of:
- passcode
- long press sequence
- hidden gesture
- device-level guided access exit

## Media rule
Every video must be:
- locally hosted or parent-approved
- manually started
- finite
- followed by return/home/action choice
```

---

# 13. Storage contract

Start local. Use `localStorage` for MVP settings and IndexedDB when you need larger structured data.

## `storage.contract.ts`

```ts
export interface StorageContract {
  settings: ParentSettings;
  child_profile: ChildProgressProfile;
  activity_events: ActivityAttemptEvent[];
  content_packs: ContentPack[];
  approved_assets: ApprovedAsset[];
}

export interface ParentSettings {
  child_display_name: string;
  session_limit_minutes: number;
  sound_enabled: boolean;
  speech_enabled: boolean;
  video_enabled: boolean;
  max_activity_choices: number;
  difficulty_mode: "fixed" | "adaptive";
  allowed_domains: LearningDomain[];
  parent_gate_enabled: boolean;
  parent_gate_phrase: string;
}

export interface ApprovedAsset {
  id: string;
  type: "image" | "audio" | "video" | "svg";
  path: string;
  source: "local" | "parent_upload" | "generated";
  approved_by_parent: boolean;
  created_at: string;
}
```

### Storage rules

```md
- Settings may live in localStorage.
- Events and content packs should move to IndexedDB once they grow.
- All stored data must be exportable as JSON.
- Parent must be able to reset progress.
- Parent must be able to archive activities.
- No child data leaves device by default.
```

---

# 14. Runtime activity contract

Every activity should implement the same runtime interface. That lets you swap ZIM, Konva, p5.js, or plain DOM later without rewriting the learning model.

## `activity-runtime.contract.ts`

```ts
export interface ActivityRuntime {
  activity_id: string;

  load(activity: LearningActivity, context: ActivityContext): Promise<void>;

  start(): void;

  pause(): void;

  resume(): void;

  destroy(): void;

  onAttempt(handler: (event: ActivityAttemptEvent) => void): void;

  onComplete(handler: (summary: ActivityCompletionSummary) => void): void;
}

export interface ActivityContext {
  child_id: string;
  session_id: string;
  parent_settings: ParentSettings;
  current_skill_states: Record<string, SkillMasteryState>;
  audio: AudioService;
  speech: SpeechService;
  storage: StorageService;
}

export interface ActivityCompletionSummary {
  activity_id: string;
  completed: boolean;
  duration_seconds: number;
  attempts: number;
  correct: number;
  hints_used: number;
  skill_updates: SkillMasteryState[];
}
```

---

# 15. Speech contract

Speech synthesis should be treated as support, not the only path.

## `speech.contract.md`

```md
# Speech Contract

## Speech usage
Speech may be used for:
- prompts
- object names
- letter sounds
- encouragement
- hints

## Speech fallback
Every speech prompt must have:
- visual equivalent
- repeat button
- parent setting to disable speech

## Voice rules
- Use slow, clear rate.
- Keep utterances short.
- Avoid long paragraphs.
- Cancel previous utterance before speaking new prompt.
- Do not queue many utterances.
```

## Speech service

```ts
export interface SpeechService {
  enabled: boolean;
  speak(text: string, options?: SpeechOptions): void;
  stop(): void;
  repeatLast(): void;
}

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  interrupt?: boolean;
}
```

---

# 16. Parent dashboard contract

Parent dashboard should answer: **What is she drawn to? What is too easy? What is too hard? What should I give her next?**

Not “daily active toddler retention.” Humanity has declined enough.

## `parent-dashboard.contract.md`

```md
# Parent Dashboard Contract

## Parent dashboard must show
- Recent sessions
- Skills practiced
- Current mastery by domain
- Activities completed
- Activities abandoned
- Skills ready for next level
- Skills needing review
- Parent notes
- Content approval queue

## Parent may configure
- enabled modules
- session duration
- difficulty mode
- allowed content packs
- speech on/off
- video on/off
- reset progress
- export data

## Dashboard must not show
- manipulative engagement scores
- comparison to other children
- ranking
- pressure language
```

---

# 17. Activity types for MVP

Start with 5. Not 40. You are building a learning loop, not a Pixar acquisition target.

## MVP activity contracts

| Activity           | Domain             | Interaction     | Why                         |
| ------------------ | ------------------ | --------------- | --------------------------- |
| Find the Match     | Logic / Vocabulary | Tap             | easiest reliable loop       |
| Sound Starts With  | Phonics            | Tap-to-match    | literacy without typing     |
| Count the Group    | Math               | Tap             | early numeracy              |
| Finish the Pattern | Logic              | Tap-then-select | pattern recognition         |
| Color the Shape    | Art                | Canvas fill     | creativity + motor practice |

---

# 18. Curriculum map contract

## `curriculum-map.v1.json`

```json
{
  "version": 1,
  "domains": {
    "literacy": {
      "skills": [
        {
          "id": "letter_recognition",
          "levels": [
            "Match identical letters",
            "Find named letter from 2 choices",
            "Find named letter from 4 choices",
            "Match uppercase to lowercase",
            "Find letter inside word"
          ]
        },
        {
          "id": "vocabulary",
          "levels": [
            "Name familiar object",
            "Match spoken word to picture",
            "Sort objects by category",
            "Choose object by description",
            "Explain why item belongs"
          ]
        }
      ]
    },
    "math": {
      "skills": [
        {
          "id": "counting",
          "levels": [
            "Count 1 to 3",
            "Count 1 to 5",
            "Count 1 to 10",
            "Match numeral to quantity",
            "Compare more vs less"
          ]
        },
        {
          "id": "subitizing",
          "levels": [
            "Recognize 1",
            "Recognize 2",
            "Recognize 3",
            "Recognize 4",
            "Recognize 5"
          ]
        }
      ]
    },
    "logic": {
      "skills": [
        {
          "id": "pattern_extend",
          "levels": [
            "AB pattern",
            "AAB pattern",
            "ABC pattern",
            "shape plus color pattern",
            "create own pattern"
          ]
        },
        {
          "id": "category_sort",
          "levels": [
            "same vs different",
            "sort by color",
            "sort by shape",
            "sort by function",
            "explain category rule"
          ]
        }
      ]
    },
    "coding_concepts": {
      "skills": [
        {
          "id": "sequence_order",
          "levels": [
            "first then next",
            "3-step sequence",
            "fix wrong order",
            "choose missing step",
            "debug simple path"
          ]
        }
      ]
    }
  }
}
```

---

# 19. File structure contract

Here’s the repo layout I’d use.

```txt
learning-playground/
  public/
    assets/
      images/
      audio/
      video/
      stickers/
    manifest.json

  src/
    app/
      main.ts
      router.ts
      session.ts

    contracts/
      activity.schema.json
      content-pack.schema.json
      product.contract.md
      ui-child.contract.md
      safety.contract.md
      reward.contract.md
      adaptive-difficulty.contract.md

    core/
      activity-registry.ts
      activity-runtime.ts
      adaptive-engine.ts
      event-log.ts
      storage.ts
      speech.ts
      audio.ts

    modules/
      home/
      parent-panel/
      puzzle-match/
      phonics-match/
      count-group/
      pattern-builder/
      coloring-book/
      video-vault/

    content/
      packs/
        animals.v1.json
        shapes.v1.json
        colors.v1.json
        family-safe-videos.v1.json

    styles/
      base.css
      child-ui.css
      parent-ui.css

  tests/
    contract/
      validate-activities.test.ts
      validate-content-packs.test.ts
      safety-rules.test.ts
      ui-rules.test.ts

    fixtures/
      valid-activity.json
      invalid-external-link-activity.json
```

---

# 20. Mechanical checks

This is where you stop future-you from inventing regret.

## `tests/contract/safety-rules.test.ts`

```ts
describe("safety contract", () => {
  test("child activities cannot contain external links", () => {
    for (const activity of loadAllActivities()) {
      expect(JSON.stringify(activity)).not.toMatch(/https?:\/\//);
    }
  });

  test("AI generated content must be parent approved before child mode", () => {
    for (const pack of loadAllContentPacks()) {
      if (pack.created_by === "ai") {
        expect(pack.approved_by_parent).toBe(true);
        expect(pack.status).toBe("approved");
      }
    }
  });

  test("video activities cannot autoplay next activity", () => {
    for (const activity of loadAllActivities()) {
      if (activity.safety.contains_video) {
        expect(activity.content.autoplay_next).not.toBe(true);
      }
    }
  });
});
```

## `tests/contract/validate-activities.test.ts`

```ts
describe("activity schema contract", () => {
  test("all activities match schema", () => {
    const schema = loadSchema("activity.schema.json");

    for (const activity of loadAllActivities()) {
      const result = validate(schema, activity);
      expect(result.valid).toBe(true);
    }
  });

  test("activities must have short duration", () => {
    for (const activity of loadAllActivities()) {
      expect(activity.estimated_duration_seconds).toBeLessThanOrEqual(300);
    }
  });

  test("activities must require parent approval", () => {
    for (const activity of loadAllActivities()) {
      expect(activity.safety.requires_parent_approval).toBe(true);
    }
  });
});
```

---

# 21. MVP build contract

## Version 0.1 must ship with:

```md
# MVP Definition of Done

## Child mode
- [ ] Home screen with 4 large icons
- [ ] Puzzle activity works
- [ ] Word/speech activity works
- [ ] Math/counting activity works
- [ ] Coloring activity works
- [ ] Video vault plays only approved local videos
- [ ] No external links in child mode
- [ ] Audio starts only after user interaction

## Parent mode
- [ ] Hidden parent gate exists
- [ ] Parent can enable/disable modules
- [ ] Parent can view recent progress
- [ ] Parent can approve content packs
- [ ] Parent can reset progress
- [ ] Parent can export local data

## Data
- [ ] Progress persists locally
- [ ] Attempt events are logged
- [ ] Content packs validate against schema
- [ ] Activities validate against schema

## Safety
- [ ] No ads
- [ ] No open web
- [ ] No autoplay chains
- [ ] No unapproved AI content
- [ ] No cloud sync by default
```

---

# 22. Contract priority order

Build in this order:

1. **Safety contract**
2. **Activity schema**
3. **Progress/event schema**
4. **Child UI contract**
5. **Parent dashboard contract**
6. **Adaptive difficulty contract**
7. **AI content contract**

Do not start with animations. Animations are dessert. Contracts are vegetables. Annoying, necessary, and somehow always pushed around the plate.

---

# The real architecture decision

Use this as the governing rule:

```md
The app adapts cognitive difficulty upward while keeping physical interaction and emotional feedback preschool-safe.
```

That one sentence should sit at the top of the repo.

Because she may be advanced, but she is still 3. The site should stretch her brain without making the interface expect 5-year-old patience, 8-year-old reading, or adult motor control. That is the difference between “custom learning playground” and “tiny person fighting bad UI while dad calls it enrichment.”
