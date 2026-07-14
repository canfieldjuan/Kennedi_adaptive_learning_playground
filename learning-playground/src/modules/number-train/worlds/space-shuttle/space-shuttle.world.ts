/**
 * Space Shuttle — Number Train's second world and the abstraction's proof
 * (owner look-approved via the slice-3 proof, PR #124).
 *
 * Same runtime, same rounds, same evidence: only the fantasy changes. The
 * scene mounts under the shared environment positioning class (a layout
 * contract, not a station-specific style), and the dark-sky palette drives
 * the text-ink capability the proof introduced.
 */

import {
  shuttleFrontSvg,
  astronautSvg,
  spaceSceneSvg,
} from './space-shuttle-art';
import {
  NUMBER_TRAIN_GAME_ID,
  type NumberTrainWorldPack,
} from '../../world-pack.types';

const INK = '#3a2461';

/** Selector preview: the shuttle over the launch-pad bands. */
function previewSvg(): string {
  return `<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <rect x="0" y="0" width="160" height="100" fill="#232a52"/>
      <path d="M 0 46 q 44 -10 84 -4 q 46 6 76 -2 v 60 h -160 Z" fill="#38406f"/>
      <circle cx="128" cy="24" r="15" fill="#fdf3d0" stroke="#e8dcae" stroke-width="2.4"/>
      <rect x="0" y="72" width="160" height="28" fill="#454e80"/>
      <g transform="translate(44 20) scale(0.62)">${shuttleFrontSvg()}</g>
    </svg>`;
}

export const SPACE_SHUTTLE_WORLD: NumberTrainWorldPack = {
  id: 'space-shuttle',
  version: 1,
  gameId: NUMBER_TRAIN_GAME_ID,
  label: 'Space Shuttle',
  spokenLabel: 'The space shuttle!',

  previewSvg,
  vehicleFrontSvg: shuttleFrontSvg,
  passengerSvg: astronautSvg,
  mountEnvironment: () => {
    const environment = document.createElement('div');
    // The shared environment layout class: absolute, inert, behind content.
    environment.className = 'station-environment';
    environment.setAttribute('aria-hidden', 'true');
    environment.innerHTML = spaceSceneSvg();
    return environment;
  },

  palette: {
    vehicleBody: '#eef3fb',
    vehicleTrim: INK,
    seatEmpty: '#fbf9ff',
    seatOccupied: '#dff2fb',
    ground: '#454e80',
    sky: '#232a52',
    textInk: '#fdf3d0',
    textSoft: '#d9d2ef',
  },

  flavor: {
    arrivalLine: 'The moon base! What a landing!',
  },

  completion: {
    destinationLabel: 'the moon base',
    // The arrival beat reuses the existing flow with the flavor line above;
    // a rendered destination scene may join in the ownership slice.
    destinationSceneSvg: null,
  },

  // Filled by the ownership-customization slice (mission helmet, shuttle
  // badge, shuttle accent are the candidates from the approved preview).
  customization: [],

  mobile: { mode: 'inline-crop' },
  reducedMotion: { nonessentialAnimationDisabled: true },
  provenanceRef: 'Space Shuttle world (Number Train)',
};
