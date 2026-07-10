// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const contract = readFixture('../../docs/contracts/difficulty-coverage.contract.md');
const parentPanelSource = readFixture(
  '../../src/modules/parent-panel/ParentPanel.ts'
);
const childSources = [
  '../../src/modules/home/HomeScreen.ts',
  '../../src/modules/kennedis-orders/KennedisOrdersActivity.ts',
  '../../src/modules/number-train/NumberTrainActivity.ts',
  '../../src/modules/phonics-match/PhonicsMatchActivity.ts',
  '../../src/modules/phonics-match/WordBuilderActivity.ts',
  '../../src/modules/tap-choice/TapChoiceActivity.ts',
].map(readFixture).join('\n');

describe('difficulty coverage contract', () => {
  test('defines coverage as content fit rather than a child label', () => {
    expect(contract).toContain('It reports the fit of the content library');
    expect(contract).toContain('not measure or label the child');
    expect(contract).toContain('blocked_by_content_gap');
    expect(contract).toContain('boundaries are inclusive');
  });

  test('renders coverage evidence in the Parent Panel only', () => {
    expect(parentPanelSource).toContain("createGuidanceLabel('Difficulty Coverage')");
    expect(parentPanelSource).toContain('{ skill_states: progress.skill_mastery }');
    expect(parentPanelSource).toContain("'Blocked by content gap'");
    expect(parentPanelSource).toContain("'Approved Activities'");
    expect(parentPanelSource).toContain("'Playable Rungs'");
    expect(parentPanelSource).toContain("'Coverage Note'");
    expect(childSources).not.toContain('Difficulty Coverage');
    expect(childSources).not.toContain('Blocked by content gap');
  });
});

function readFixture(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}
