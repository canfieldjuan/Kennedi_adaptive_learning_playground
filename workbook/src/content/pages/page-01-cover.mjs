import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverShell } from '../../components/layout.mjs';
import { paintbrushIcon, magnifyingGlassIcon } from '../../illustrations/icons.mjs';
import { inlineImageFile } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');

// Art Direction v2, Mode A (color hero art) -- see docs/art/asset-provenance.md.
// Single approved full-color hero scene (Kennedi + puppy + bird already
// composed together), replacing the old 3-SVG bossKennedi/puppy/bird/cat
// composition. Embedded as a base64 data: URI (not a raw filesystem path)
// so the generated HTML still opens standalone via file:// on any machine.
const heroScene = inlineImageFile(path.join(WORKBOOK, 'design-source/scenes/cover-concept-c-final.png'));

export const meta = {
  pageNumber: 1,
  title: 'Kennedi Is The Boss',
  primarySkill: 'cover (no activity)',
  correctAnswers: {},
};

export function render() {
  const body = `
    <div class="cover-top">
      <p class="cover-eyebrow">My Preschool Adventure Book</p>
      <h1 class="cover-title"><span class="cover-title-line">KENNEDI</span><span class="cover-title-line">IS THE BOSS</span></h1>
      <p class="cover-subtitle">Learning Book 1</p>
      <p class="cover-tagline">Read &bull; Write &bull; Count &bull; Think &bull; Create</p>
    </div>
    <div class="cover-art">
      <img src="${heroScene}" alt="Boss Kennedi holding a clipboard and a raised pencil, with a puppy and a bird" style="max-width:100%; max-height:100%; object-fit:contain;" />
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
