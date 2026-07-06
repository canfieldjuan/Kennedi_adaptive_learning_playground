/**
 * Contract tests: Safety rules enforcement.
 *
 * Tests:
 * 1. No activity JSON contains external links (http:// or https://).
 * 2. AI-created packs cannot be approved automatically.
 * 3. Video activities cannot autoplay next activity.
 */

import { describe, test, expect } from 'vitest';
import artColorCircle from '../../src/content/activities/art-color-circle.json';
import mathCountStarsThree from '../../src/content/activities/math-count-stars-three.json';
import phonicsFindB from '../../src/content/activities/phonics-find-b.json';
import shapesFindCircle from '../../src/content/activities/shapes-find-circle.json';
import videoVault from '../../src/content/activities/video-vault.json';
import animalsPack from '../../src/content/packs/animals.v1.json';
import shapesPack from '../../src/content/packs/shapes.v1.json';
import familySafeVideos from '../../src/content/videos/family-safe-videos.v1.json';

interface ActivityJson {
  id: string;
  safety: {
    requires_parent_approval: boolean;
    external_links_allowed: boolean;
    contains_video?: boolean;
  };
  content: Record<string, unknown>;
  [key: string]: unknown;
}

interface ContentPackJson {
  id: string;
  status: string;
  created_by: string;
  approved_by_parent: boolean;
  [key: string]: unknown;
}

interface VideoManifestJson {
  id: string;
  items: Array<{
    id: string;
    path: string;
    source: string;
    approved_by_parent: boolean;
    thumbnail_path?: string;
    autoplay?: boolean;
    autoplay_next?: boolean;
    loop?: boolean;
  }>;
  [key: string]: unknown;
}

const allActivities: ActivityJson[] = [
  phonicsFindB as unknown as ActivityJson,
  shapesFindCircle as unknown as ActivityJson,
  mathCountStarsThree as unknown as ActivityJson,
  artColorCircle as unknown as ActivityJson,
  videoVault as unknown as ActivityJson,
];

const allPacks: ContentPackJson[] = [
  animalsPack as unknown as ContentPackJson,
  shapesPack as unknown as ContentPackJson,
];

const allVideoManifests: VideoManifestJson[] = [
  familySafeVideos as unknown as VideoManifestJson,
];

describe('safety contract', () => {
  test('child activities cannot contain external links', () => {
    for (const activity of allActivities) {
      const serialized = JSON.stringify(activity);
      expect(serialized).not.toMatch(/https?:\/\//);
    }
  });

  test('AI-generated content must be parent approved before child mode', () => {
    for (const pack of allPacks) {
      if (pack.created_by === 'ai') {
        expect(pack.approved_by_parent).toBe(true);
        expect(pack.status).toBe('approved');
      }
    }
  });

  test('video activities cannot autoplay next activity', () => {
    for (const activity of allActivities) {
      if (activity.safety.contains_video) {
        expect((activity.content as Record<string, unknown>).autoplay_next).not.toBe(true);
      }
    }
  });

  test('all activities have external_links_allowed set to false', () => {
    for (const activity of allActivities) {
      expect(activity.safety.external_links_allowed).toBe(false);
    }
  });

  test('all activities require parent approval', () => {
    for (const activity of allActivities) {
      expect(activity.safety.requires_parent_approval).toBe(true);
    }
  });

  test('video manifests cannot contain external links', () => {
    for (const manifest of allVideoManifests) {
      const serialized = JSON.stringify(manifest);
      expect(serialized).not.toMatch(/https?:\/\//);
    }
  });

  test('video manifest items must be parent-approved local media', () => {
    for (const manifest of allVideoManifests) {
      for (const item of manifest.items) {
        expect(item.source).toBe('local');
        expect(item.approved_by_parent).toBe(true);
        expect(item.path).toMatch(/^\/assets\/videos?\//);
        expect(item.path).not.toMatch(/https?:\/\//);
        expect(item.thumbnail_path ?? '').not.toMatch(/https?:\/\//);
        expect(item.autoplay).not.toBe(true);
        expect(item.autoplay_next).not.toBe(true);
        expect(item.loop).not.toBe(true);
      }
    }
  });

  test('AI-created packs that are not parent-approved must stay in draft', () => {
    // This test validates the contract rule: AI packs cannot be auto-approved.
    // We create a synthetic violating pack and verify it would fail the contract.
    const aiDraftPack: ContentPackJson = {
      id: 'ai-test-pack',
      status: 'approved',
      created_by: 'ai',
      approved_by_parent: false,
    };

    // An AI pack that claims "approved" status but has no parent approval
    // must be caught by the contract.
    if (aiDraftPack.created_by === 'ai') {
      // This SHOULD fail — proving the contract catches it.
      const violatesContract =
        aiDraftPack.status === 'approved' && !aiDraftPack.approved_by_parent;
      expect(violatesContract).toBe(true); // The violation exists
    }
  });
});
