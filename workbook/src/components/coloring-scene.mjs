import assert from 'node:assert/strict';
import path from 'node:path';
import { inlineSvgFile } from '../content/asset-inline.mjs';

// A fixed, trusted source-art slot, not arbitrary recipe HTML or file paths.
export const bunnyGarden = Object.freeze({
  scene: 'design-source/coloring/scenes/bunny-garden.svg',
  character: 'design-source/coloring/characters/bunny-coloring-opaque.svg',
});
export const turtlePond = Object.freeze({
  scene: 'design-source/coloring/scenes/turtle-pond.svg',
  character: 'design-source/coloring/characters/turtle-coloring-opaque.svg',
});

export function inlineBunnyGarden(root) {
  return inlineCharacterScene(root, bunnyGarden, 'bunny');
}
export function inlineTurtlePond(root) {
  return inlineCharacterScene(root, turtlePond, 'turtle');
}

// Only the fixed wrappers above select these inputs, never recipe paths/HTML.
function inlineCharacterScene(root, assets, characterName) {
  const scene = inlineSvgFile(path.join(root, assets.scene));
  const references = scene.match(new RegExp(`<image\\b[^>]*\\bid="${characterName}-reference"[^>]*\\/>`, 'g')) ?? [];
  assert.equal(references.length, 1, `Scene must contain exactly one canonical ${characterName} reference.`);
  const slot = references[0];
  assert.equal(slot.match(/\bhref="([^"]*)"/)?.[1], `../characters/${path.basename(assets.character)}`);
  const coordinates = ['x', 'y', 'width', 'height'].map(name => {
    const value = slot.match(new RegExp(`\\b${name}="(-?\\d+(?:\\.\\d+)?)"`))?.[1];
    assert.ok(value !== undefined && Number.isFinite(Number(value)), `Missing scene slot ${name}.`);
    if (name === 'width' || name === 'height') assert.ok(Number(value) > 0);
    return `${name}="${value}"`;
  }).join(' ');
  const character = inlineSvgFile(path.join(root, assets.character))
    .replace(/width="[^"]*"/, '').replace(/height="[^"]*"/, '')
    .replace('<svg ', `<svg id="coloring-${characterName}" ${coordinates} `);
  const output = scene.replace(slot, character);
  assert.ok(!/<image\b/.test(output), 'Published coloring scene must not depend on linked images.');
  return output;
}
