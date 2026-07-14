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

  customization: [
    {
      id: 'vehicle_accent',
      label: 'Train color',
      spokenLabel: 'Pick your train color!',
      choices: [
        { id: 'red', label: 'Red', spokenLabel: 'Red!', accentColor: '#e05d5d' },
        { id: 'blue', label: 'Blue', spokenLabel: 'Blue!', accentColor: '#74b9ff' },
        { id: 'purple', label: 'Purple', spokenLabel: 'Purple!', accentColor: '#a29bfe' },
      ],
      defaultChoiceId: 'red',
    },
    {
      id: 'vehicle_badge',
      label: 'Train flag',
      spokenLabel: 'Pick your train flag!',
      choices: [
        {
          id: 'star',
          label: 'Star flag',
          spokenLabel: 'A star!',
          artSvg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M6 6 h22 l-6 7 6 7 h-22 Z" fill="#fdf3d0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><line x1="6" y1="6" x2="6" y2="36" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M16 9.5 l1.7 3.4 3.8 .4 -2.8 2.6 .8 3.7 -3.5 -1.9 -3.5 1.9 .8 -3.7 -2.8 -2.6 3.8 -.4 Z" fill="#f6c343" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
        },
        {
          id: 'heart',
          label: 'Heart flag',
          spokenLabel: 'A heart!',
          artSvg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><path d="M6 6 h22 l-6 7 6 7 h-22 Z" fill="#fdf3d0" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><line x1="6" y1="6" x2="6" y2="36" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M16 18.5 q-4.5 -3.6 -2.4 -6.6 q1.9 -2.6 4.4 -.3 q2.5 -2.3 4.4 .3 q2.1 3 -2.4 6.6 l-2 1.6 Z" transform="translate(-1.5 -2)" fill="#ef8fa5" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
        },
      ],
      defaultChoiceId: 'star',
    },
  ],

  mobile: { mode: 'bands-only-swap' },
  reducedMotion: { nonessentialAnimationDisabled: true },
  provenanceRef: 'Number Train station scene (proof)',
};
