import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverShell } from '../../components/layout.mjs';
import { inlineImageFile, inlineSvgFile, withSvgLabel } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');

// Art Direction v2, Mode A (color hero art) -- see docs/art/asset-provenance.md.
// Single approved full-color hero scene (Kennedi + puppy + bird already
// composed together), replacing the old 3-SVG bossKennedi/puppy/bird/cat
// composition. Embedded as a base64 data: URI (not a raw filesystem path)
// so the generated HTML still opens standalone via file:// on any machine.
const heroScene = inlineImageFile(path.join(WORKBOOK, 'design-source/scenes/cover-concept-c-final.png'));

// Locked, textured FLUX-generated assets (Art Direction v2 continued,
// 2026-09-13), replacing the old hand-coded icons.mjs primitives -- see
// page-04's generation notes for the method. These run at 0.35in, well
// under the smallest size (0.75in) the print-size test sheet actually
// validated for even the SIMPLIFIED tier, so unlike every other page's
// use of this asset set, this one specifically needs its print output
// checked at real size (rasterized PDF, not the source PNG) before
// trusting it -- full-detail linework that reads fine at 0.9in+ can clog
// into an illegible blob well before that at cover-footer scale.
const paintbrushLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'paintbrush.svg')), 'paintbrush');
const magnifyingGlassLocked = withSvgLabel(inlineSvgFile(path.join(OBJECTS_LOCKED, 'magnifying-glass.svg')), 'magnifying glass');

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
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${paintbrushLocked}</span>
        <span class="icon-inline" style="width:0.35in;height:0.35in;">${magnifyingGlassLocked}</span>
      </span>
    </div>
  `;
  return coverShell({ body });
}
