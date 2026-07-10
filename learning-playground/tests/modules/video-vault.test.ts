import { describe, expect, test } from 'vitest';
import videoVaultActivity from '../../src/content/activities/video-vault.json';
import realManifest from '../../src/content/videos/family-safe-videos.v1.json';
import { createVideoCompletionEvent } from '../../src/modules/video-vault/video-evidence';
import { validateVideoManifest } from '../../src/modules/video-vault/video-manifest';
import type { LearningActivity } from '../../src/types/activity';

describe('video vault manifest boundary', () => {
  test('accepts the real empty repo-bundled manifest', () => {
    expect(validateVideoManifest(realManifest, 'family-safe-videos-v1')).toEqual({
      valid: true,
      issues: [],
      playable_videos: [],
    });
  });

  test('accepts a non-empty parent-approved local exposure item', () => {
    const result = validateVideoManifest(makeManifest(), 'family-safe-videos-v1');

    expect(result.valid).toBe(true);
    expect(result.playable_videos).toHaveLength(1);
    expect(result.playable_videos[0]).toMatchObject({
      id: 'bear-bakes-bread',
      mime_type: 'video/mp4',
      evidence_role: 'exposure_only',
    });
  });

  test.each([1, 300])('accepts the duration boundary value %s', (durationSeconds) => {
    const result = validateVideoManifest(
      makeManifest({ duration_seconds: durationSeconds }),
      'family-safe-videos-v1'
    );

    expect(result.valid).toBe(true);
  });

  test('accepts a local filename containing adjacent dots outside a path segment', () => {
    const result = validateVideoManifest(
      makeManifest({ path: '/assets/videos/bear..bakes.mp4' }),
      'family-safe-videos-v1'
    );

    expect(result.valid).toBe(true);
  });

  test('rejects activity and manifest id mismatch', () => {
    expect(
      validateVideoManifest(makeManifest(), 'another-manifest').issues
    ).toContain('manifest id does not match the activity manifest id');
  });

  test.each([
    ['invalid item id', { id: 'Bear!' }, 'id must use lowercase'],
    ['blank item title', { title: ' ' }, 'title must be a non-empty string'],
    ['external path', { path: 'https://example.com/bear.mp4' }, 'safe local video asset'],
    ['path traversal', { path: '/assets/videos/../bear.mp4' }, 'safe local video asset'],
    ['encoded path traversal', { path: '/assets/videos/%2e%2e/bear.mp4' }, 'safe local video asset'],
    ['surrounding path whitespace', { path: ' /assets/videos/bear.mp4 ' }, 'safe local video asset'],
    ['unsupported mime', { mime_type: 'video/ogg' }, 'video/mp4 or video/webm'],
    ['extension mismatch', { mime_type: 'video/webm' }, 'extension must match'],
    ['zero duration', { duration_seconds: 0 }, 'integer from 1 to 300'],
    ['overlong duration', { duration_seconds: 301 }, 'integer from 1 to 300'],
    ['fractional duration', { duration_seconds: 12.5 }, 'integer from 1 to 300'],
    ['unapproved media', { approved_by_parent: false }, 'approved by a parent'],
    ['non-local source', { source: 'remote' }, 'source must be local'],
    ['skill-response role', { evidence_role: 'skill_response' }, 'exposure_only'],
    ['external thumbnail', { thumbnail_path: 'https://example.com/bear.png' }, 'safe local image'],
    ['autoplay', { autoplay: true }, 'cannot autoplay'],
    ['autoplay next', { autoplay_next: true }, 'cannot autoplay'],
    ['loop', { loop: true }, 'cannot autoplay'],
  ])('rejects %s', (_label, itemOverrides, issueText) => {
    const result = validateVideoManifest(
      makeManifest(itemOverrides),
      'family-safe-videos-v1'
    );

    expect(result.valid).toBe(false);
    expect(result.playable_videos).toEqual([]);
    expect(result.issues.some((issue) => issue.includes(issueText))).toBe(true);
  });

  test('rejects duplicate item ids and paths', () => {
    const manifest = makeManifest();
    manifest.items.push({ ...manifest.items[0] });
    const result = validateVideoManifest(manifest, 'family-safe-videos-v1');

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('item 1 id must be unique');
    expect(result.issues).toContain('item 1 path must be unique');
  });

  test.each([
    [{ id: '' }, 'manifest id must be a non-empty string'],
    [{ version: 0 }, 'manifest version must be a positive integer'],
    [{ title: ' ' }, 'manifest title must be a non-empty string'],
    [{ items: 'not-an-array' }, 'manifest items must be an array'],
    [{ intake_mode: 'parent_import' }, 'manifest intake_mode must be repo_bundled'],
    [{ parent_imports_supported: true }, 'manifest parent imports must remain unsupported'],
    [{ approved_by_parent: false }, 'manifest must be approved by a parent'],
    [{ evidence_role: 'skill_response' }, 'manifest evidence_role must be exposure_only'],
  ])('rejects an unsupported manifest policy', (manifestOverrides, issue) => {
    const result = validateVideoManifest(
      makeManifest({}, manifestOverrides),
      'family-safe-videos-v1'
    );

    expect(result.valid).toBe(false);
    expect(result.issues).toContain(issue);
  });

  test('completion event declares local exposure without claiming a correct response', () => {
    const video = validateVideoManifest(
      makeManifest(),
      'family-safe-videos-v1'
    ).playable_videos[0];
    expect(video).toBeDefined();

    const event = createVideoCompletionEvent({
      activity: videoVaultActivity as LearningActivity,
      childId: 'local-child',
      sessionId: 'session-1',
      manifestId: 'family-safe-videos-v1',
      promptText: 'Pick a video.',
      video: video!,
      attemptNumber: 1,
      responseTimeMs: 45_000,
    });

    expect(event).toMatchObject({
      outcome: 'completed',
      input_type: 'video',
      skill_outcomes: [{
        skill_id: 'vocabulary',
        outcome: 'completed',
      }],
      metadata: {
        manifest_id: 'family-safe-videos-v1',
        media_source: 'local',
        media_type: 'video/mp4',
        evidence_role: 'exposure_only',
      },
    });
  });
});

function makeManifest(
  itemOverrides: Record<string, unknown> = {},
  manifestOverrides: Record<string, unknown> = {}
) {
  return {
    id: 'family-safe-videos-v1',
    version: 1,
    title: 'Family Safe Videos',
    intake_mode: 'repo_bundled',
    parent_imports_supported: false,
    approved_by_parent: true,
    evidence_role: 'exposure_only',
    items: [{
      id: 'bear-bakes-bread',
      title: 'Bear Bakes Bread',
      path: '/assets/videos/bear-bakes-bread.mp4',
      duration_seconds: 45,
      mime_type: 'video/mp4',
      evidence_role: 'exposure_only',
      source: 'local',
      approved_by_parent: true,
      thumbnail_path: '/assets/images/bear.svg',
      ...itemOverrides,
    }],
    ...manifestOverrides,
  };
}
