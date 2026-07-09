import { describe, expect, test } from 'vitest';
import mobileContract from '../../docs/contracts/mobile-child-ui.contract.md?raw';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { readFileSync } from 'node:fs';

const childUiCss = readFixture('../../src/styles/child-ui.css');
const baseCss = readFixture('../../src/styles/base.css');

function readFixture(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('mobile child UI contract', () => {
  test('documents the viewport-fit rule without making it absolute', () => {
    expect(mobileContract).toContain('Primary child gameplay should fit in one mobile viewport when reasonable.');
    expect(mobileContract).toContain('If fitting everything would make controls cramped');
    expect(mobileContract).toContain('Do not shrink controls below safe child size');
    expect(mobileContract).toContain('No required reading for gameplay.');
  });

  test('uses dynamic viewport height for child gameplay surfaces', () => {
    expect(baseCss).toContain('min-height: 100dvh');
    expect(childUiCss).toContain('min-height: 100dvh');
  });

  test('makes mobile top utility controls icon-only without removing aria labels', () => {
    expect(childUiCss).toContain('.activity-icon-button[aria-label="Return home"]::before');
    expect(childUiCss).toContain("content: '⌂'");
    expect(childUiCss).toContain('.activity-icon-button[aria-label="Repeat prompt"]::before');
    expect(childUiCss).toContain('.activity-icon-button[aria-label="Repeat order"]::before');
    expect(childUiCss).toContain("content: '↻'");
  });

  test('keeps mobile gameplay targets large while reducing vertical stacking', () => {
    expect(childUiCss).toContain('@media (max-width: 768px)');
    expect(childUiCss).toContain('grid-template-columns: repeat(auto-fit, minmax(104px, 1fr))');
    expect(childUiCss).toContain('min-height: 112px');
    expect(childUiCss).toContain('.activity-feedback:empty');
  });

  test('defines mobile Bear Cafe as scene plus tray/action plus compact kitchen', () => {
    expect(childUiCss).toContain('grid-template-areas:');
    expect(childUiCss).toContain('"ticket action"');
    expect(childUiCss).toContain('"tray tray"');
    expect(childUiCss).toContain('.bear-cafe-choice-grid');
    expect(childUiCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(childUiCss).toContain('@media (min-width: 640px) and (max-width: 768px) and (orientation: landscape)');
    expect(childUiCss).toContain('grid-template-columns: minmax(240px, 0.9fr) minmax(320px, 1.1fr)');
  });
});
