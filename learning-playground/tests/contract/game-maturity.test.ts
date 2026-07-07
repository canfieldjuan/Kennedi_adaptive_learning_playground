import { describe, expect, test } from 'vitest';
import { APPROVED_ACTIVITIES } from '../../src/content/activity-catalog';
import kennediRuntimeSource from '../../src/modules/kennedis-orders/KennedisOrdersActivity.ts?raw';
import safariRuntimeSource from '../../src/modules/nature-camera-safari/NatureCameraSafariActivity.ts?raw';
import safariLogicSource from '../../src/modules/nature-camera-safari/nature-camera-safari.logic.ts?raw';
import type { LearningActivity } from '../../src/types/activity';

const matureGameIds = ['kennedis-orders', 'nature-camera-safari'];
const gameActivities = APPROVED_ACTIVITIES.filter((activity) => (
  typeof activity.content.game === 'string'
));

describe('v0.3.0 game maturity contract', () => {
  test('does not add a new game to the catalog', () => {
    const games = [...new Set(gameActivities.map((activity) => String(activity.content.game)))].sort();

    expect(games).toEqual(matureGameIds);
  });

  test('existing games have at least three rounds and progression variants', () => {
    const byGame = groupByGame();

    for (const gameId of matureGameIds) {
      const activities = byGame.get(gameId) ?? [];
      const modes = new Set(activities.map((activity) => activity.content.mode));

      expect(activities.length).toBeGreaterThanOrEqual(3);
      expect(modes.size).toBeGreaterThanOrEqual(3);
    }
  });

  test('multi-round chains complete without loops or missing catalog entries', () => {
    expect(followNextActivityIds('kennedis-orders-free-make-001')).toEqual([
      'kennedis-orders-free-make-001',
      'kennedis-orders-pink-cupcake-001',
      'kennedis-orders-three-berries-001',
      'kennedis-orders-b-foods-001',
      'kennedis-orders-fix-berries-001',
    ]);

    expect(followNextActivityIds('nature-camera-free-picture-walk')).toEqual([
      'nature-camera-free-picture-walk',
      'nature-camera-bird-photo',
      'nature-camera-squirrel-photo',
      'nature-camera-count-two-birds',
      'nature-camera-b-sound-safari',
      'nature-camera-album-review',
    ]);
  });

  test('activities include parent-readable evidence summary support', () => {
    for (const activity of gameActivities) {
      expect(activity.content.parent_evidence_summary).toEqual(expect.any(String));
      expect(String(activity.content.parent_evidence_summary).length).toBeGreaterThan(20);
    }
  });

  test('no real camera or direct media APIs are requested', () => {
    const combinedSource = `${kennediRuntimeSource}\n${safariRuntimeSource}\n${safariLogicSource}`;

    expect(combinedSource).not.toMatch(/getUserMedia|mediaDevices|enumerateDevices/);
    expect(combinedSource).not.toMatch(/navigator\.permissions/);
  });
});

function groupByGame(): Map<string, LearningActivity[]> {
  const byGame = new Map<string, LearningActivity[]>();

  for (const activity of gameActivities) {
    const gameId = String(activity.content.game);
    byGame.set(gameId, [...(byGame.get(gameId) ?? []), activity]);
  }

  return byGame;
}

function followNextActivityIds(firstActivityId: string): string[] {
  const visited: string[] = [];
  let currentId: string | undefined = firstActivityId;

  while (currentId) {
    if (visited.includes(currentId)) throw new Error(`Loop in game chain at ${currentId}`);
    const activity = APPROVED_ACTIVITIES.find((entry) => entry.id === currentId);
    if (!activity) throw new Error(`Missing chained activity ${currentId}`);

    visited.push(currentId);
    currentId = typeof activity.content.next_activity_id === 'string'
      ? activity.content.next_activity_id
      : undefined;
  }

  return visited;
}
