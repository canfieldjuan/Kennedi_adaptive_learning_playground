import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverShell } from '../../components/layout.mjs';
import { paintbrushIcon, magnifyingGlassIcon } from '../../illustrations/icons.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');

export const meta = {
  pageNumber: 1,
  title: 'Kennedi Is The Boss (ART PROOF)',
  primarySkill: 'cover (no activity) -- art-direction integration proof, Mode A (color)',
  correctAnswers: {},
  artNote: 'Hero illustration is FLUX.1-dev generated (Concept C direction) + hand-picked, NOT the PR #133 programmatic SVG. Owner-approval-required draft.',
};

/**
 * Integration proof only -- do NOT wire this into book-1.mjs / the real
 * build. Renders via scripts/build-art-proof.mjs to dist-proof/.
 */
export function render() {
  const imgPath = path.join(WORKBOOK, 'design-source/scenes/cover-concept-c-final.png');
  const body = `
    <div class="cover-top">
      <p class="cover-eyebrow">My Preschool Adventure Book</p>
      <h1 class="cover-title"><span class="cover-title-line">KENNEDI</span><span class="cover-title-line">IS THE BOSS</span></h1>
      <p class="cover-subtitle">Learning Book 1</p>
      <p class="cover-tagline">Read &bull; Write &bull; Count &bull; Think &bull; Create</p>
    </div>
    <div class="cover-art">
      <img src="${imgPath}" alt="Boss Kennedi holding a clipboard and a raised pencil, with a puppy and a bird" style="max-height:100%; max-width:100%; object-fit:contain;" />
    </div>
    <div class="cover-bottom row" style="justify-content:space-between;">
      <span>My Preschool Adventure Book</span>
      <span class="row" style="gap:0.15in;">
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${paintbrushIcon()}</span>
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${magnifyingGlassIcon()}</span>
      </span>
    </div>
  `;
  return coverShell({ body });
}
