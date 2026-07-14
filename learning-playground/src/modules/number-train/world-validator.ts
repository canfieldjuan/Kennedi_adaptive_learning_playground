/**
 * Pure world-pack validation — same convention as the story pack validator
 * and round-plan validation: collect human-readable errors, throw nothing.
 * Registered worlds must pass in contract tests before they can ship.
 */

import {
  NUMBER_TRAIN_GAME_ID,
  type NumberTrainWorldPack,
  type WorldCustomizationSlot,
} from './world-pack.types';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
// External references live in href/src attributes or CSS url() — the SVG
// xmlns namespace declaration is required XML, not a network reference.
const EXTERNAL_REF =
  /(?:href|src)\s*=\s*['"]\s*https?:|url\s*\(\s*['"]?(?:https?:)?\/\//i;
const SPOKEN_URL = /https?:\/\//i;
const WORLD_ID = /^[a-z][a-z0-9-]*$/;

export function validateWorldPack(pack: NumberTrainWorldPack): string[] {
  const errors: string[] = [];
  const at = `world ${pack.id || '(missing id)'}`;

  if (!WORLD_ID.test(pack.id ?? '')) {
    errors.push(`${at}: id must be kebab-case`);
  }
  if (!Number.isInteger(pack.version) || pack.version < 1) {
    errors.push(`${at}: version must be a positive integer`);
  }
  if (pack.gameId !== NUMBER_TRAIN_GAME_ID) {
    errors.push(`${at}: gameId must be '${NUMBER_TRAIN_GAME_ID}' — packs are game-owned`);
  }
  if (!pack.label?.trim()) errors.push(`${at}: empty label`);
  if (!pack.spokenLabel?.trim()) errors.push(`${at}: empty spoken label`);

  // Required renderers must exist and produce local-only markup.
  const renderers: Array<[string, (() => string) | undefined]> = [
    ['previewSvg', pack.previewSvg],
    ['vehicleFrontSvg', pack.vehicleFrontSvg],
    ['passengerSvg', pack.passengerSvg],
  ];
  for (const [name, render] of renderers) {
    if (typeof render !== 'function') {
      errors.push(`${at}: missing required renderer ${name}`);
      continue;
    }
    const markup = render();
    if (!markup || !markup.includes('<svg')) {
      errors.push(`${at}: ${name} must return inline SVG markup`);
    }
    if (markup && EXTERNAL_REF.test(markup)) {
      errors.push(`${at}: ${name} references an external URL`);
    }
  }
  if (typeof pack.mountEnvironment !== 'function') {
    errors.push(`${at}: missing required environment mount`);
  }

  // Palette: every slot present and a valid hex color.
  const palette = pack.palette ?? ({} as NumberTrainWorldPack['palette']);
  for (const key of [
    'vehicleBody',
    'vehicleTrim',
    'seatEmpty',
    'seatOccupied',
    'ground',
    'sky',
  ] as const) {
    const value = palette[key];
    if (!value || !HEX_COLOR.test(value)) {
      errors.push(`${at}: palette.${key} must be a hex color`);
    }
  }

  if (!pack.completion || typeof pack.completion.destinationLabel !== 'string' ||
      !pack.completion.destinationLabel.trim()) {
    errors.push(`${at}: completion.destinationLabel is required`);
  } else if (
    pack.completion.destinationSceneSvg !== null &&
    typeof pack.completion.destinationSceneSvg !== 'function'
  ) {
    errors.push(`${at}: completion.destinationSceneSvg must be a renderer or null`);
  }

  if (!Array.isArray(pack.customization)) {
    errors.push(`${at}: customization must be an array (may be empty)`);
  } else {
    const slotIds = new Set<string>();
    for (const slot of pack.customization) {
      errors.push(...validateSlot(at, slot, slotIds));
    }
  }

  if (pack.mobile?.mode !== 'bands-only-swap') {
    errors.push(`${at}: mobile.mode must declare a supported behavior`);
  }
  if (pack.reducedMotion?.nonessentialAnimationDisabled !== true) {
    errors.push(`${at}: reducedMotion.nonessentialAnimationDisabled must be true`);
  }
  if (!pack.provenanceRef?.trim()) {
    errors.push(`${at}: provenanceRef (asset ledger heading) is required`);
  }

  // Flavor lines are spoken: they must be plain text, not markup/URLs.
  if (pack.flavor?.arrivalLine !== undefined) {
    const line = pack.flavor.arrivalLine;
    if (!line.trim()) errors.push(`${at}: flavor.arrivalLine is empty`);
    if (SPOKEN_URL.test(line) || line.includes('<')) {
      errors.push(`${at}: flavor.arrivalLine must be plain spoken text`);
    }
  }

  return errors;
}

function validateSlot(
  at: string,
  slot: WorldCustomizationSlot,
  seenSlotIds: Set<string>
): string[] {
  const errors: string[] = [];
  const slotAt = `${at} slot ${slot.id || '(missing id)'}`;

  if (!slot.id?.trim()) errors.push(`${slotAt}: empty slot id`);
  if (seenSlotIds.has(slot.id)) errors.push(`${slotAt}: duplicate slot id`);
  seenSlotIds.add(slot.id);
  if (!slot.label?.trim()) errors.push(`${slotAt}: empty label`);
  if (!slot.spokenLabel?.trim()) errors.push(`${slotAt}: empty spoken label`);

  const choiceIds = new Set<string>();
  if (!Array.isArray(slot.choices) || slot.choices.length === 0) {
    errors.push(`${slotAt}: a slot needs at least one choice`);
    return errors;
  }
  for (const choice of slot.choices) {
    const choiceAt = `${slotAt} choice ${choice.id || '(missing id)'}`;
    if (!choice.id?.trim()) errors.push(`${choiceAt}: empty choice id`);
    if (choiceIds.has(choice.id)) errors.push(`${choiceAt}: duplicate choice id`);
    choiceIds.add(choice.id);
    if (!choice.label?.trim()) errors.push(`${choiceAt}: empty label`);
    if (!choice.spokenLabel?.trim()) errors.push(`${choiceAt}: empty spoken label`);
    const hasColor = typeof choice.accentColor === 'string';
    const hasArt = typeof choice.artSvg === 'string';
    if (hasColor === hasArt) {
      errors.push(`${choiceAt}: exactly one of accentColor or artSvg is required`);
    }
    if (hasColor && !HEX_COLOR.test(choice.accentColor as string)) {
      errors.push(`${choiceAt}: accentColor must be a hex color`);
    }
    if (hasArt && EXTERNAL_REF.test(choice.artSvg as string)) {
      errors.push(`${choiceAt}: artSvg references an external URL`);
    }
  }
  if (!choiceIds.has(slot.defaultChoiceId)) {
    errors.push(`${slotAt}: defaultChoiceId must be one of the choices`);
  }

  return errors;
}

/** Registry-level validation: per-pack rules plus cross-pack uniqueness. */
export function validateWorldRegistry(packs: NumberTrainWorldPack[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const pack of packs) {
    if (ids.has(pack.id)) {
      errors.push(`registry: duplicate world id ${pack.id}`);
    }
    ids.add(pack.id);
    errors.push(...validateWorldPack(pack));
  }
  return errors;
}
