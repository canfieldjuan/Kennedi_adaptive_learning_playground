import { describe, expect, test } from 'vitest';
import { validateVideoManifest } from '../../src/modules/video-vault/video-manifest';

describe('bilingual story manifest v3 boundary', () => {
  test('accepts a complete story without exposing it to the legacy runtime adapter', () => {
    const result = validateVideoManifest(makeStoryManifest(), 'family-safe-videos-v1');

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.source_schema_version).toBe(3);
    expect(result.approved_items).toHaveLength(1);
    expect(result.approved_items[0]).toMatchObject({
      kind: 'bilingual_story',
      id: 'colorless-castle-proof',
      language_register: 'es-419',
    });
    expect(result.playable_videos).toEqual([]);
  });

  test.each([
    ['unknown schema', (manifest: Record<string, unknown>) => {
      manifest.schema_version = 4;
    }, 'schema_version must be 3'],
    ['missing discriminator', (manifest: Record<string, unknown>) => {
      delete getStory(manifest).kind;
    }, 'kind must be approved_video or bilingual_story'],
    ['unknown discriminator', (manifest: Record<string, unknown>) => {
      getStory(manifest).kind = 'story_video';
    }, 'kind must be approved_video or bilingual_story'],
  ])('rejects %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    mutate(manifest);

    expectInvalid(manifest, expectedIssue);
  });

  test('rejects a missing required story mode', () => {
    const manifest = makeStoryManifest();
    delete getRecord(getStory(manifest).modes).spanish_replay;

    expectInvalid(manifest, 'mode spanish_replay must be an object');
  });

  test.each([
    ['remote mode path', (story: Record<string, unknown>) => {
      getRecord(getRecord(story.modes).english).path = 'https://example.com/story.webm';
    }, 'safe local video asset'],
    ['duplicate mode path', (story: Record<string, unknown>) => {
      const modes = getRecord(story.modes);
      getRecord(modes.story_bridge).path = getRecord(modes.english).path;
    }, 'path must be unique'],
    ['missing media hash', (story: Record<string, unknown>) => {
      getRecord(getRecord(story.modes).english).sha256 = '';
    }, 'sha256 must be a lowercase SHA-256 digest'],
    ['duplicate media id', (story: Record<string, unknown>) => {
      const modes = getRecord(story.modes);
      getRecord(modes.story_bridge).id = getRecord(modes.english).id;
    }, 'media id must be unique'],
    ['automatic playback', (story: Record<string, unknown>) => {
      story.autoplay = true;
    }, 'cannot autoplay, loop, or autoplay the next item'],
  ])('rejects %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    mutate(getStory(manifest));

    expectInvalid(manifest, expectedIssue);
  });

  test('rejects a cue outside its authored mode duration', () => {
    const manifest = makeStoryManifest();
    const responseCue = findCue(getStory(manifest), 'english-response');
    responseCue.end_ms = 61_000;
    getRecord(responseCue.repeat_boundary).end_ms = 61_000;

    expectInvalid(manifest, 'end_ms must not exceed its mode duration');
  });

  test('rejects a Spanish Replay cue authored as English', () => {
    const manifest = makeStoryManifest();
    const prompt = getRecord(findCue(getStory(manifest), 'spanish-replay-narration').prompt);
    prompt.language = 'en';
    Reflect.deleteProperty(prompt, 'spanish_approval');

    expectInvalid(manifest, 'Spanish Replay prompt must use es-419');
  });

  test('rejects a word exposure cue that cites an undeclared target word', () => {
    const manifest = makeStoryManifest();
    findCue(getStory(manifest), 'english-word').target_word_ids = ['missing-word'];

    expectInvalid(manifest, 'target_word_ids 0 must reference a declared id');
  });

  test.each([
    ['automatic resume', (cue: Record<string, unknown>) => {
      cue.resume_behavior = 'continue';
    }, 'resumes only after explicit child action'],
    ['timeout', (cue: Record<string, unknown>) => {
      cue.timeout_ms = 2_000;
    }, 'cannot declare timeout or auto-resume'],
    ['too few choices', (cue: Record<string, unknown>) => {
      cue.visual_targets = [getArray(cue.visual_targets)[0]];
    }, 'must present at least two visual targets'],
    ['guided target outside cue choices', (cue: Record<string, unknown>) => {
      cue.guided_target_id = 'castle';
    }, 'guided_target_id must reference a cue visual target'],
    ['repeat leaves the pause', (cue: Record<string, unknown>) => {
      getRecord(cue.repeat_boundary).return_to = 'resume_playback';
    }, 'repeat must return to the paused cue'],
  ])('rejects response pause with %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    mutate(findCue(getStory(manifest), 'english-response'));

    expectInvalid(manifest, expectedIssue);
  });

  test.each([
    ['missing visual target', (cue: Record<string, unknown>) => {
      getRecord(getArray(cue.visual_targets)[0]).target_id = 'missing-target';
    }, 'target_id must reference a declared id'],
    ['missing interaction slot', (cue: Record<string, unknown>) => {
      getRecord(getArray(cue.visual_targets)[0]).slot_id = 'missing-slot';
    }, 'slot_id must reference a declared id'],
    ['repeat beginning inside the line', (cue: Record<string, unknown>) => {
      getRecord(cue.repeat_boundary).start_ms = Number(cue.start_ms) + 1;
    }, 'repeat_boundary must start at or before the cue'],
    ['repeat ending before the line', (cue: Record<string, unknown>) => {
      getRecord(cue.repeat_boundary).end_ms = Number(cue.end_ms) - 1;
    }, 'repeat_boundary must end at or after the cue'],
  ])('rejects authored cue with %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    mutate(findCue(getStory(manifest), 'english-response'));

    expectInvalid(manifest, expectedIssue);
  });

  test.each([
    ['pending pronunciation review', (approval: Record<string, unknown>) => {
      approval.pronunciation_review_status = 'pending';
    }, 'pronunciation review must be approved'],
    ['wrong regional register', (approval: Record<string, unknown>) => {
      approval.register = 'es-ES';
    }, 'register must be es-419'],
    ['remote audio', (approval: Record<string, unknown>) => {
      approval.audio_asset_path = 'https://example.com/line.wav';
    }, 'must be a safe local audio asset'],
    ['missing hash', (approval: Record<string, unknown>) => {
      approval.audio_sha256 = '';
    }, 'audio_sha256 must be a lowercase SHA-256 digest'],
    ['impossible approval date', (approval: Record<string, unknown>) => {
      approval.approved_at = '2026-02-30T12:00:00Z';
    }, 'approved_at must be an ISO timestamp'],
    ['mismatched Spanish text', (approval: Record<string, unknown>) => {
      approval.spanish_text = 'Texto diferente.';
    }, 'spanish_text must match the authored Spanish text'],
  ])('rejects Spanish narration with %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    const cue = findCue(getStory(manifest), 'spanish-replay-narration');
    mutate(getRecord(getRecord(cue.prompt).spanish_approval));

    expectInvalid(manifest, expectedIssue);
  });

  test('rejects a Spanish prompt whose separate audio path differs from its approval', () => {
    const manifest = makeStoryManifest();
    const prompt = getRecord(findCue(getStory(manifest), 'spanish-replay-narration').prompt);
    prompt.audio_asset_path = '/assets/audio/story-vault/another-line.wav';

    expectInvalid(manifest, 'prompt audio path must match its Spanish approval');
  });

  test.each([
    ['unknown color reference', (page: Record<string, unknown>) => {
      getRecord(getArray(page.color_targets)[0]).allowed_color_ids = ['missing-color'];
    }, 'allowed_color_ids 0 must reference a declared id'],
    ['unsafe page asset', (page: Record<string, unknown>) => {
      getRecord(getArray(page.stickers)[0]).asset_path = '../moon.svg';
    }, 'must be a safe local image asset'],
    ['unbounded sticker count', (page: Record<string, unknown>) => {
      page.max_stickers = 3;
    }, 'max_stickers must be an integer from 1 to 2'],
    ['unknown page schema', (page: Record<string, unknown>) => {
      page.schema_version = 2;
    }, 'schema_version must be 1'],
  ])('rejects completion page with %s', (_label, mutate, expectedIssue) => {
    const manifest = makeStoryManifest();
    mutate(getRecord(getStory(manifest).completion_page));

    expectInvalid(manifest, expectedIssue);
  });

  test('rejects a ninth target word in the bounded proof schema', () => {
    const manifest = makeStoryManifest();
    const words = getArray(getStory(manifest).target_words);
    while (words.length < 9) {
      const index = words.length;
      words.push({
        id: `word-${index}`,
        english_text: `word ${index}`,
        spanish_text: `palabra ${index}`,
        visual_target_id: 'banana',
        spanish_approval: makeSpanishApproval(
          `palabra ${index}`,
          `word ${index}`,
          `word-${index}`
        ),
      });
    }

    expectInvalid(manifest, 'target_words must contain 1 to 8 items');
  });
});

function makeStoryManifest(): Record<string, unknown> {
  return {
    id: 'family-safe-videos-v1',
    schema_version: 3,
    version: 3,
    title: 'Family Safe Videos',
    intake_mode: 'repo_bundled',
    parent_imports_supported: false,
    approved_by_parent: true,
    evidence_role: 'exposure_only',
    items: [{
      kind: 'bilingual_story',
      id: 'colorless-castle-proof',
      title: 'The Castle Lost Its Colors',
      story_family: 'colors',
      source: 'local',
      approved_by_parent: true,
      evidence_role: 'exposure_only',
      language_register: 'es-419',
      thumbnail_path: '/assets/images/story-vault/castle-proof.svg',
      modes: {
        english: makeMediaExport('/assets/videos/castle-proof-english.webm'),
        story_bridge: makeMediaExport('/assets/videos/castle-proof-bridge.webm'),
        spanish_replay: makeMediaExport('/assets/videos/castle-proof-spanish.webm'),
      },
      visual_targets: [
        {
          id: 'banana',
          asset_path: '/assets/images/story-vault/banana.svg',
          english_label: 'banana',
          spanish_label: 'banana',
          approved_by_parent: true,
        },
        {
          id: 'apple',
          asset_path: '/assets/images/story-vault/apple.svg',
          english_label: 'apple',
          spanish_label: 'manzana',
          approved_by_parent: true,
        },
      ],
      interaction_slots: [
        { id: 'choice-left', label: 'Left choice' },
        { id: 'choice-right', label: 'Right choice' },
      ],
      target_words: [{
        id: 'word-banana',
        english_text: 'banana',
        spanish_text: 'banana',
        visual_target_id: 'banana',
        spanish_approval: makeSpanishApproval('banana', 'banana', 'word-banana'),
      }],
      target_phrases: [{
        id: 'phrase-find-banana',
        english_text: 'Find the banana.',
        spanish_text: 'Busca la banana.',
        visual_target_id: 'banana',
        spanish_approval: makeSpanishApproval(
          'Busca la banana.',
          'Find the banana.',
          'phrase-find-banana'
        ),
      }],
      cues: [
        ...makeModeCues('english', 'en'),
        ...makeModeCues('story-bridge', 'en'),
        ...makeModeCues('spanish-replay', 'es-419'),
      ],
      completion_page: {
        schema_version: 1,
        id: 'castle-restored-page',
        title: 'My Restored Castle',
        background_asset_path: '/assets/images/story-vault/castle-page.svg',
        scene_variants: [{
          id: 'castle-restored',
          label: 'Restored castle',
          asset_path: '/assets/images/story-vault/castle-restored.svg',
        }],
        colors: [
          { id: 'purple', label: 'Purple', value: '#7d4bc7' },
          { id: 'yellow', label: 'Yellow', value: '#f2c94c' },
        ],
        color_targets: [{
          id: 'castle-walls',
          label: 'Castle walls',
          allowed_color_ids: ['purple', 'yellow'],
        }],
        stickers: [
          {
            id: 'moon',
            label: 'Moon',
            asset_path: '/assets/images/story-vault/moon.svg',
          },
          {
            id: 'star',
            label: 'Star',
            asset_path: '/assets/images/story-vault/star.svg',
          },
        ],
        sticker_slots: [
          { id: 'upper-left', label: 'Upper left' },
          { id: 'upper-right', label: 'Upper right' },
        ],
        max_stickers: 1,
        characters: [{
          id: 'friendly-dragon',
          label: 'Friendly dragon',
          asset_path: '/assets/images/story-vault/friendly-dragon.svg',
        }],
        character_slots: [{ id: 'castle-window', label: 'Castle window' }],
      },
    }],
  };
}

function makeMediaExport(path: string): Record<string, unknown> {
  return {
    id: path.replace('/assets/videos/', '').replace('.webm', ''),
    path,
    duration_seconds: 60,
    mime_type: 'video/webm',
    source: 'local',
    approved_by_parent: true,
    sha256: 'a'.repeat(64),
  };
}

function makeModeCues(
  idPrefix: string,
  language: 'en' | 'es-419'
): Array<Record<string, unknown>> {
  const mode = idPrefix.replaceAll('-', '_');
  const narrationPrompt = language === 'en'
    ? makePrompt('The castle needs its colors.', 'en', 'The castle needs its colors.')
    : makePrompt(
      'El castillo necesita sus colores.',
      'es-419',
      'The castle needs its colors.',
      'castle-needs-colors'
    );
  const responsePrompt = language === 'en'
    ? makePrompt('Find the banana.', 'en', 'Find the banana.')
    : makePrompt('Busca la banana.', 'es-419', 'Find the banana.', 'find-banana');
  const completionPrompt = language === 'en'
    ? makePrompt('The castle has its colors.', 'en', 'The castle has its colors.')
    : makePrompt(
      'El castillo tiene sus colores.',
      'es-419',
      'The castle has its colors.',
      'castle-has-colors'
    );

  return [
    makePassiveCue(`${idPrefix}-narration`, mode, 'narration_line', 0, 4_000, narrationPrompt),
    {
      ...makePassiveCue(
        `${idPrefix}-word`,
        mode,
        'word_exposure',
        5_000,
        8_000,
        language === 'en'
          ? makePrompt('Banana.', 'en', 'Banana.')
          : makePrompt('Banana.', 'es-419', 'Banana.', 'banana-line')
      ),
      target_word_ids: ['word-banana'],
    },
    {
      id: `${idPrefix}-response`,
      mode,
      start_ms: 10_000,
      end_ms: 14_000,
      cue_type: 'response_pause',
      pauses_playback: true,
      required_child_action: 'select_visual_target',
      prompt: responsePrompt,
      visual_targets: [
        { target_id: 'banana', slot_id: 'choice-left' },
        { target_id: 'apple', slot_id: 'choice-right' },
      ],
      guided_target_id: 'banana',
      resume_behavior: 'after_explicit_action',
      repeat_boundary: {
        start_ms: 10_000,
        end_ms: 14_000,
        return_to: 'paused_cue',
      },
    },
    makePassiveCue(
      `${idPrefix}-completion`,
      mode,
      'completion',
      55_000,
      59_000,
      completionPrompt
    ),
  ];
}

function makePassiveCue(
  id: string,
  mode: string,
  cueType: string,
  startMs: number,
  endMs: number,
  prompt: Record<string, unknown>
): Record<string, unknown> {
  return {
    id,
    mode,
    start_ms: startMs,
    end_ms: endMs,
    cue_type: cueType,
    pauses_playback: false,
    required_child_action: 'none',
    prompt,
    visual_targets: [],
    resume_behavior: 'continue',
    repeat_boundary: {
      start_ms: startMs,
      end_ms: endMs,
      return_to: 'resume_playback',
    },
  };
}

function makePrompt(
  text: string,
  language: 'en' | 'es-419',
  englishIntent: string,
  audioId?: string
): Record<string, unknown> {
  if (language === 'en') {
    return { text, language, english_intent: englishIntent };
  }

  const approval = makeSpanishApproval(text, englishIntent, audioId ?? 'spanish-line');
  return {
    text,
    language,
    english_intent: englishIntent,
    audio_asset_path: approval.audio_asset_path,
    spanish_approval: approval,
  };
}

function makeSpanishApproval(
  spanishText: string,
  englishIntent: string,
  audioId: string
): Record<string, unknown> {
  return {
    spanish_text: spanishText,
    english_intent: englishIntent,
    register: 'es-419',
    pronunciation_review_status: 'approved',
    reviewer: 'fluent-reviewer',
    approved_at: '2026-07-13T12:00:00Z',
    approval_version: 1,
    audio_asset_path: `/assets/audio/story-vault/${audioId}.wav`,
    audio_sha256: 'b'.repeat(64),
  };
}

function expectInvalid(manifest: Record<string, unknown>, issueText: string): void {
  const result = validateVideoManifest(manifest, 'family-safe-videos-v1');
  expect(result.valid).toBe(false);
  expect(result.approved_items).toEqual([]);
  expect(result.playable_videos).toEqual([]);
  expect(result.issues.some((issue) => issue.includes(issueText))).toBe(true);
}

function getStory(manifest: Record<string, unknown>): Record<string, unknown> {
  return getRecord(getArray(manifest.items)[0]);
}

function findCue(story: Record<string, unknown>, id: string): Record<string, unknown> {
  const cue = getArray(story.cues).find((candidate) => (
    getRecord(candidate).id === id
  ));
  if (!cue) throw new Error(`missing test cue ${id}`);
  return getRecord(cue);
}

function getRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected test fixture record');
  }
  return value as Record<string, unknown>;
}

function getArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('expected test fixture array');
  return value;
}
