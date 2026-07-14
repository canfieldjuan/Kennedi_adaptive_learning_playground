/**
 * Number Train world-pack contract: every registered world validates, Train
 * Station is the stable default, resolution is fail-open, and the validator
 * actually rejects each malformation class (a guard proven only on good
 * input is no guard).
 */

import { describe, expect, test, vi } from 'vitest';
import {
  NUMBER_TRAIN_WORLDS,
  DEFAULT_WORLD_ID,
  resolveNumberTrainWorld,
} from '../../src/modules/number-train/world-registry';
import {
  validateWorldPack,
  validateWorldRegistry,
} from '../../src/modules/number-train/world-validator';
import { TRAIN_STATION_WORLD } from '../../src/modules/number-train/worlds/train-station/train-station.world';
import {
  worldChromeBackground,
  type NumberTrainWorldPack,
  type WorldCustomizationSlot,
} from '../../src/modules/number-train/world-pack.types';

function validPack(): NumberTrainWorldPack {
  // A structurally valid fixture independent of any real art.
  return {
    id: 'fixture-world',
    version: 1,
    gameId: 'number-train',
    label: 'Fixture',
    spokenLabel: 'The fixture world!',
    previewSvg: () => '<svg viewBox="0 0 1 1"></svg>',
    vehicleFrontSvg: () => '<svg viewBox="0 0 1 1"></svg>',
    passengerSvg: () => '<svg viewBox="0 0 1 1"></svg>',
    mountEnvironment: () => ({}) as unknown as HTMLElement,
    palette: {
      vehicleBody: '#ffffff',
      vehicleTrim: '#3a2461',
      seatEmpty: '#fbf9ff',
      seatOccupied: '#fdf3d0',
      ground: '#e8d3ae',
      sky: '#dcecf8',
      textInk: '#3a2461',
      textSoft: '#5c4a86',
    },
    completion: { destinationLabel: 'the fixture', destinationSceneSvg: null },
    customization: [],
    mobile: { mode: 'bands-only-swap' },
    reducedMotion: { nonessentialAnimationDisabled: true },
    provenanceRef: 'Fixture family',
  };
}

function validSlot(): WorldCustomizationSlot {
  return {
    id: 'vehicle_accent',
    label: 'Train color',
    spokenLabel: 'Pick your train color!',
    choices: [
      { id: 'red', label: 'Red', spokenLabel: 'Red!', accentColor: '#e05d5d' },
      { id: 'blue', label: 'Blue', spokenLabel: 'Blue!', accentColor: '#74b9ff' },
    ],
    defaultChoiceId: 'red',
  };
}

describe('number train world packs', () => {
  test('every registered world validates and ids are unique', () => {
    // The station environment mounts a DOM element; give the validator a
    // document to work with in this node test environment.
    vi.stubGlobal('document', {
      createElement: () => ({
        setAttribute: () => {},
        appendChild: () => {},
        set innerHTML(_v: string) {},
        className: '',
      }),
    });
    expect(validateWorldRegistry(NUMBER_TRAIN_WORLDS)).toEqual([]);
    vi.unstubAllGlobals();
  });

  test('train station is the stable default', () => {
    expect(DEFAULT_WORLD_ID).toBe('train-station');
    expect(resolveNumberTrainWorld(undefined)).toBe(TRAIN_STATION_WORLD);
  });

  test('unknown, removed, and malformed preferences fall back to the default', () => {
    expect(resolveNumberTrainWorld('space-shuttle-9000')).toBe(TRAIN_STATION_WORLD);
    expect(resolveNumberTrainWorld('')).toBe(TRAIN_STATION_WORLD);
    expect(resolveNumberTrainWorld(42)).toBe(TRAIN_STATION_WORLD);
    expect(resolveNumberTrainWorld({ id: 'train-station' })).toBe(TRAIN_STATION_WORLD);
    expect(resolveNumberTrainWorld(null)).toBe(TRAIN_STATION_WORLD);
  });

  test('a valid preference resolves to its world', () => {
    expect(resolveNumberTrainWorld('train-station')).toBe(TRAIN_STATION_WORLD);
    expect(resolveNumberTrainWorld('space-shuttle').id).toBe('space-shuttle');
  });

  test('the runtime holds zero world-specific conditionals', () => {
    // The acceptance criterion of the whole arc: the second world is
    // manifest + assets, not branches. The core runtime must never mention
    // a concrete world id.
    // @ts-expect-error Vitest runs in Node; the app does not ship Node typings.
    // eslint-disable-next-line
    const { readFileSync } = require('node:fs');
    const runtime = readFileSync(
      new URL(
        '../../src/modules/number-train/NumberTrainActivity.ts',
        import.meta.url
      ),
      'utf8'
    );
    expect(runtime).not.toContain('space-shuttle');
    expect(runtime).not.toContain('SPACE_SHUTTLE');
    expect(runtime).not.toContain('TRAIN_STATION');
    // 'train-station' appears exactly once: the legacy screen-scope CSS
    // class on the container (applied identically for every world — the
    // shuttle renders under it too). Any second occurrence would be a
    // world-specific branch sneaking in.
    expect(runtime.split('train-station')).toHaveLength(2);
    expect(runtime).toContain(
      "className = 'child-container activity-screen number-train-screen train-station'"
    );
  });

  test('duplicate world ids fail registry validation', () => {
    const errors = validateWorldRegistry([validPack(), validPack()]);
    expect(errors.some((e) => e.includes('duplicate world id'))).toBe(true);
  });

  test('foreign game ownership fails', () => {
    const pack = validPack();
    (pack as { gameId: string }).gameId = 'bear-cafe';
    expect(validateWorldPack(pack).some((e) => e.includes('game-owned'))).toBe(true);
  });

  test('missing required renderers fail', () => {
    const pack = validPack();
    (pack as Partial<NumberTrainWorldPack>).previewSvg = undefined;
    (pack as Partial<NumberTrainWorldPack>).passengerSvg = undefined;
    const errors = validateWorldPack(pack);
    expect(errors.some((e) => e.includes('previewSvg'))).toBe(true);
    expect(errors.some((e) => e.includes('passengerSvg'))).toBe(true);
  });

  test('external URLs in art fail', () => {
    const pack = validPack();
    pack.vehicleFrontSvg = () =>
      '<svg viewBox="0 0 1 1"><image href="https://evil.example/x.png"/></svg>';
    expect(
      validateWorldPack(pack).some((e) => e.includes('external URL'))
    ).toBe(true);
  });

  test('invalid palette colors fail', () => {
    const pack = validPack();
    pack.palette.sky = 'sky blue';
    expect(
      validateWorldPack(pack).some((e) => e.includes('palette.sky'))
    ).toBe(true);
  });

  test('empty spoken labels fail', () => {
    const pack = validPack();
    pack.spokenLabel = '  ';
    expect(
      validateWorldPack(pack).some((e) => e.includes('spoken label'))
    ).toBe(true);
  });

  test('missing completion and provenance fail', () => {
    const pack = validPack();
    pack.completion = { destinationLabel: '', destinationSceneSvg: null };
    pack.provenanceRef = '';
    const errors = validateWorldPack(pack);
    expect(errors.some((e) => e.includes('destinationLabel'))).toBe(true);
    expect(errors.some((e) => e.includes('provenanceRef'))).toBe(true);
  });

  test('invalid mobile and reduced-motion declarations fail', () => {
    const pack = validPack();
    (pack.mobile as { mode: string }).mode = 'zoom-and-pray';
    (pack.reducedMotion as { nonessentialAnimationDisabled: boolean }).nonessentialAnimationDisabled = false;
    const errors = validateWorldPack(pack);
    expect(errors.some((e) => e.includes('mobile.mode'))).toBe(true);
    expect(errors.some((e) => e.includes('reducedMotion'))).toBe(true);
  });

  test('customization slots validate both directions', () => {
    const good = validPack();
    good.customization = [validSlot()];
    expect(validateWorldPack(good)).toEqual([]);

    const bad = validPack();
    const slot = validSlot();
    slot.defaultChoiceId = 'nonexistent';
    slot.choices.push({
      id: 'red',
      label: 'Red again',
      spokenLabel: 'Red!',
      accentColor: '#e05d5d',
    });
    slot.choices.push({
      id: 'both',
      label: 'Both provided',
      spokenLabel: 'Both!',
      accentColor: '#e05d5d',
      artSvg: '<svg/>',
    });
    bad.customization = [slot, { ...validSlot(), id: 'vehicle_accent' }];
    const errors = validateWorldPack(bad);
    expect(errors.some((e) => e.includes('defaultChoiceId'))).toBe(true);
    expect(errors.some((e) => e.includes('duplicate choice id'))).toBe(true);
    expect(errors.some((e) => e.includes('exactly one of'))).toBe(true);
    expect(errors.some((e) => e.includes('duplicate slot id'))).toBe(true);
  });

  test('chrome background derivation handles shorthand hex and matches the previous value exactly', () => {
    // Train Station: exactly the rgba the icon buttons used before packs.
    expect(worldChromeBackground('#3a2461')).toBe('rgba(58, 36, 97, 0.12)');
    // Shorthand hex must expand, never concatenate into an invalid token.
    expect(worldChromeBackground('#fff')).toBe('rgba(255, 255, 255, 0.12)');
    expect(worldChromeBackground('#fdf3d0')).toBe('rgba(253, 243, 208, 0.12)');
  });

  test('flavor lines must be plain spoken text', () => {
    const pack = validPack();
    pack.flavor = { arrivalLine: 'Visit https://example.com now!' };
    expect(
      validateWorldPack(pack).some((e) => e.includes('plain spoken text'))
    ).toBe(true);
  });
});
