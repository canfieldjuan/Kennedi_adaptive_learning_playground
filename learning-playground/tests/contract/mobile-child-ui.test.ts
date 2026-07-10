import { describe, expect, test } from 'vitest';
import mobileContract from '../../docs/contracts/mobile-child-ui.contract.md?raw';
// @ts-expect-error Vitest runs in Node; the app intentionally does not ship Node typings.
import { readFileSync } from 'node:fs';

const childUiCss = readFixture('../../src/styles/child-ui.css');
const baseCss = readFixture('../../src/styles/base.css');
const tapChoiceSource = readFixture('../../src/modules/tap-choice/TapChoiceActivity.ts');
const wordBuilderSource = readFixture(
  '../../src/modules/phonics-match/WordBuilderActivity.ts'
);

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
    expect(childUiCss).toContain('@media (min-width: 568px) and (max-width: 940px) and (orientation: landscape)');
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
    expect(childUiCss).toContain('min-height: 80px');
    expect(wordBuilderSource).toContain('word-builder-screen');
    expect(childUiCss).toContain('"object slots"');
    expect(childUiCss).toContain('"character tray"');
  });

  test('disables symbolic word-model completion motion when reduced motion is requested', () => {
    expect(childUiCss).toContain(
      '.word-builder__picture-image.is-alive,\n  .word-builder__model.is-alive'
    );
  });

  test('keeps wide-landscape home cards compact without shrinking phone targets', () => {
    expect(childUiCss).toContain('@media (min-width: 769px) and (max-height: 710px) and (orientation: landscape)');
    expect(childUiCss).toContain('@media (min-width: 769px) and (min-height: 711px)');
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
    expect(childUiCss).toContain('min-height: 80px');
  });

  test('keeps color-request mismatch motion guarded', () => {
    expect(childUiCss).toContain('.coloring-shape.is-wrong,');
  });

  test('compacts the Number Train display for phones without shrinking controls', () => {
    // Portrait AND short-landscape share one compaction block; only the
    // display train/journey/path shrink — numeral choices and load controls
    // stay on the shared child-safe sizing.
    expect(childUiCss).toContain('/* Compact Number Train for phones');
    expect(childUiCss).toContain('.number-train__engine--path');
    expect(childUiCss).toMatch(
      /Compact Number Train for phones[\s\S]*?\(max-width: 940px\) and \(max-height: 480px\) and \(orientation: landscape\)/
    );
    expect(childUiCss).toMatch(
      /Compact Number Train for phones[\s\S]*?\.number-train__seat \{\s*width: 28px/
    );
    expect(childUiCss).toMatch(
      /\.number-train__choices \.number-train__check \{\s*min-height: 72px/
    );
  });

  test('scopes the large scene prompt layout to one-image scene activities', () => {
    expect(tapChoiceSource).toContain("promptVisualLayout === 'scene'");
    expect(tapChoiceSource).toContain("activity.content.prompt_visual_layout === 'scene'");
    expect(tapChoiceSource).toContain('promptImages.length === 1');
    expect(childUiCss).toContain('.activity-prompt-visual--scene');
    expect(childUiCss).toContain('.activity-screen--scene-prompt');
    expect(childUiCss).toContain('"scene choices"');
    expect(childUiCss).toContain('repeat(3, minmax(76px, 1fr))');
  });

  test('keeps the Word Workshop environment inert and shallow on phones', () => {
    expect(childUiCss).toMatch(
      /\.workshop-environment \{[\s\S]*?pointer-events: none;[\s\S]*?\}/
    );
    expect(childUiCss).toMatch(
      /\.workshop-environment \.workshop-env__prop--minor \{\s*display: none;/
    );
  });

  test('keeps the Bear Cafe environment inert and shallow on phones', () => {
    // The decorative scene can never intercept taps, and its minor props get
    // out of the way on small screens (game environment contract).
    expect(childUiCss).toMatch(
      /\.bear-cafe-environment \{[\s\S]*?pointer-events: none;[\s\S]*?\}/
    );
    expect(childUiCss).toMatch(
      /\.bear-cafe-environment \.cafe-env__prop--minor \{\s*display: none;/
    );
  });

  test('scopes the shape-garden tint to the spatial (Shapes) domain only', () => {
    // The direct-route Shapes lane — the only spatial-domain content — gets a
    // light tint (cohesion pass); every other tap-choice domain keeps the
    // dark surface.
    expect(tapChoiceSource).toContain(
      "options.activity.domain === 'spatial' ? 'activity-screen--shape-garden' : ''"
    );
    expect(childUiCss).toContain('.activity-screen--shape-garden');
    expect(childUiCss).toMatch(
      /\.activity-screen--shape-garden \.activity-choice \{[\s\S]*?background: #fffdf7;/
    );
  });

  test('the art gallery shelf honors the hidden attribute', () => {
    // The shelf's flex display would otherwise override the UA's
    // [hidden] { display: none } and show an empty strip during play.
    expect(childUiCss).toMatch(
      /\.bear-art-studio__shelf\[hidden\] \{\s*display: none;/
    );
  });

  test('keeps the train station environment inert and shallow on phones', () => {
    expect(childUiCss).toMatch(
      /\.station-environment \{[\s\S]*?pointer-events: none;[\s\S]*?\}/
    );
    expect(childUiCss).toMatch(
      /\.station-environment \.station-env__prop--minor \{\s*display: none;/
    );
  });

  test('keeps the Art studio environment inert and shallow on phones', () => {
    expect(childUiCss).toMatch(
      /\.studio-environment \{[\s\S]*?pointer-events: none;[\s\S]*?\}/
    );
    expect(childUiCss).toMatch(
      /\.studio-environment \.studio-env__prop--minor \{\s*display: none;/
    );
    // The decorative easel legs disappear on phones so the shape's footprint
    // stays exactly what the landscape grid expects.
    expect(childUiCss).toMatch(
      /\.coloring-studio \.coloring-shape::before,\s*\.coloring-studio \.coloring-shape::after \{\s*display: none;/
    );
  });
});
