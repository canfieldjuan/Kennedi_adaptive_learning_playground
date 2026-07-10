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
    expect(childUiCss).toContain('@media (max-width: 768px),');
    expect(childUiCss).toContain('(max-width: 940px) and (max-height: 480px) and (orientation: landscape)');
    expect(childUiCss).toContain('grid-template-columns: repeat(auto-fit, minmax(104px, 1fr))');
    expect(childUiCss).toContain('min-height: 112px');
    expect(childUiCss).toContain('.activity-feedback:empty');
  });

  test('keeps expanded hit zones inside compact mobile grids', () => {
    expect(childUiCss).toContain('.home-card::before,\n  .activity-choice::before');
    expect(childUiCss).toContain('inset: 0;\n    pointer-events: none;');
  });

  test('defines mobile Bear Cafe as scene plus tray/action plus compact kitchen', () => {
    expect(childUiCss).toContain('grid-template-areas:');
    expect(childUiCss).toContain('"ticket action"');
    expect(childUiCss).toContain('"tray tray"');
    expect(childUiCss).toContain('.bear-cafe-choice-grid');
    expect(childUiCss).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(childUiCss).toContain('@media (min-width: 704px) and (max-width: 940px) and (orientation: landscape)');
    expect(childUiCss).toContain('grid-template-columns: minmax(220px, 0.9fr) minmax(280px, 1.1fr)');
    expect(childUiCss).toContain('grid-template-columns: minmax(0, 1fr);');
    expect(childUiCss).toContain('grid-column: 1 / -1;');
  });

  test('covers phone landscape compaction and small Bear Cafe plates', () => {
    expect(childUiCss).toContain('(max-width: 940px) and (max-height: 480px) and (orientation: landscape)');
    expect(childUiCss).toContain('width: clamp(132px, 40vw, 156px)');
    expect(childUiCss).toContain('width: clamp(44px, 13vw, 48px)');
    expect(childUiCss).toContain('.phonics-character__art');
    expect(childUiCss).toContain('width: clamp(56px, 18dvh, 72px)');
    expect(childUiCss).toContain('.word-builder__tile');
    expect(childUiCss).toContain('min-height: 48px');
  });

  test('disables symbolic word-model completion motion when reduced motion is requested', () => {
    expect(childUiCss).toContain(
      '.word-builder__picture-image.is-alive,\n  .word-builder__model.is-alive'
    );
  });

  test('keeps wide-landscape home cards compact without shrinking phone targets', () => {
    expect(childUiCss).toContain('@media (min-width: 768px) and (min-height: 481px),');
    expect(childUiCss).toContain('(min-width: 941px)');
    expect(childUiCss).not.toContain('@media (min-width: 768px) {');
    expect(childUiCss).toContain('min-height: clamp(118px, 24dvh, 160px)');
  });

  test('reflows coloring palette and shape side by side in phone landscape', () => {
    expect(childUiCss).toContain('"title title"');
    expect(childUiCss).toContain('"prompt prompt"');
    expect(childUiCss).toContain('.coloring-screen--request');
    expect(childUiCss).toContain('"title request"');
    expect(childUiCss).toContain('"prompt request"');
    expect(childUiCss).toContain('"swatches shape"');
    expect(childUiCss).toContain('grid-template-columns: repeat(2, minmax(64px, 1fr))');
    expect(childUiCss).toContain('width: min(42dvh, 180px)');
    expect(childUiCss).toContain('min-height: 58px');
  });

  test('keeps color-request mismatch motion guarded', () => {
    expect(childUiCss).toContain('.coloring-shape.is-wrong,');
  });
});
