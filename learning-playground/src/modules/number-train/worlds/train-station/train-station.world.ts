/**
 * Train Station — Number Train's default world: the game's current fantasy
 * captured as a world-pack manifest.
 *
 * Slice 1 rule: this pack REFERENCES the existing renderers (train-art,
 * station-environment) without moving or redrawing anything — the game must
 * look and behave exactly as before. The extraction slice wires the runtime
 * through this manifest; later slices add the shuttle world beside it.
 */

import { trainEngineSvg, passengerSvg } from '../../train-art';
import { createStationEnvironment } from '../../station-environment';
import {
  NUMBER_TRAIN_GAME_ID,
  type NumberTrainWorldPack,
} from '../../world-pack.types';

const INK = '#3a2461';

/** Selector preview: the engine on the platform band (single object — the
 * preview must not introduce countable clusters either). */
function previewSvg(): string {
  return `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="160" height="100" fill="#dcecf8"/>
      <path d="M 0 52 q 40 -10 80 -4 q 50 7 80 -2 v 54 h -160 Z" fill="#cfe0b8"/>
      <rect x="0" y="72" width="160" height="28" fill="#e8d3ae"/>
      <g transform="translate(46 22) scale(0.62)">${trainEngineSvg()}</g>
    </svg>`;
}

export const TRAIN_STATION_WORLD: NumberTrainWorldPack = {
  id: 'train-station',
  version: 1,
  gameId: NUMBER_TRAIN_GAME_ID,
  label: 'Train Station',
  spokenLabel: 'The train station!',

  previewSvg,
  vehicleFrontSvg: trainEngineSvg,
  passengerSvg,
  mountEnvironment: createStationEnvironment,

  palette: {
    vehicleBody: '#f6f0ff',
    vehicleTrim: INK,
    seatEmpty: '#fbf9ff',
    seatOccupied: '#fdf3d0',
    ground: '#e8d3ae',
    sky: '#dcecf8',
    textInk: '#3a2461',
    textSoft: '#5c4a86',
  },

  completion: {
    destinationLabel: 'the station',
    // null = the existing arrival treatment; the completion slice may give
    // the station a rendered destination beat.
    destinationSceneSvg: null,
  },

  // Filled by the ownership-customization slice (conductor hat, train flag,
  // engine accent are the candidates). Empty is valid until then.
  customization: [],

  mobile: { mode: 'bands-only-swap' },
  reducedMotion: { nonessentialAnimationDisabled: true },
  provenanceRef: 'Number Train station scene (proof)',
};
