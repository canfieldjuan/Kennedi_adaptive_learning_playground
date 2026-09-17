import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pageShell } from '../../components/layout.mjs';
import { tracingWord } from '../../components/tracing.mjs';
import { pictureChoiceRow, rewardStar } from '../../components/activities.mjs';
import { inlineSvgFile, withSvgLabel, withViewBox } from '../asset-inline.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, '../../..');
const KENNEDI_LOCKED = path.join(WORKBOOK, 'design-source/boss-kennedi/locked-poses');
const OBJECTS_LOCKED = path.join(WORKBOOK, 'design-source/objects/locked');

// Character-lock locked-pose asset (Art Direction v2 -- see
// docs/art/asset-provenance.md). Full detail throughout: both the hero
// scene and the picture-choice card size this well above the ~1in floor
// where full-detail art stays crisp, so the simplified tier isn't needed.
//
// The hero scene is 04-helping.svg ALONE, not composed with a second,
// separate puppy asset -- an earlier draft paired it with
// design-source/animals/locked-poses/02-reaching.svg (a standalone puppy)
// to show a "before" beat, but 04-helping.svg already contains its OWN
// puppy (Kennedi is kneeling down to a puppy drawn into the same image).
// Compositing a second, visually distinct puppy alongside it read as two
// different puppies in one scene -- confirmed by looking at the actual
// render, not assumed -- confusing for a page whose whole job is a single
// clear "puppy needs help -> Kennedi helps" read. One asset, one puppy,
// one clear story.
// Unlabeled -- reused below to build the separately-labeled, separately
// cropped choice-card version; withSvgLabel() inserts an attribute rather
// than replacing one, so labeling this raw copy would leave the card
// version with two role/aria-label pairs on one <svg>.
const kennediHelpingRaw = inlineSvgFile(path.join(KENNEDI_LOCKED, '04-helping.svg'));
// Labeled on the SVG root, not the wrapping <div> -- a div's role/aria-label
// works for on-screen assistive tech but does not survive into the tagged
// PDF's structure tree (confirmed against the committed PDF's /Alt entries),
// so this hero illustration was silently losing its description in the one
// deliverable this book is actually printed from.
const kennediHelping = withSvgLabel(kennediHelpingRaw, 'Kennedi kneeling down to help a puppy');

// withViewBox() is now shared (src/content/asset-inline.mjs) -- see its own
// doc comment for the measure-then-crop technique (getBBox() on the outer
// <svg>, pad 6%, square off). Computed once for these assets via getBBox()
// on 04-helping.svg (content bbox x=225.1 y=196.3 w=581.4 h=668.6 inside
// the 0-1024 viewBox). Reuse this same technique for any other locked pose
// going into a pictureChoiceRow -- do not just eyeball a crop.

// withSvgLabel() (src/content/asset-inline.mjs): without it, a raw
// inlineSvgFile() result dropped into a pictureChoiceRow card has no
// accessible name, so a screen-reader user reaches "What should Kennedi
// do?" with no name for this choice. Same gap page 3 has for the same
// reason.
const kennediHelpingCard = withSvgLabel(withViewBox(kennediHelpingRaw, '141 156 749 749'), 'Kennedi kneeling down to help the puppy');

export const meta = {
  pageNumber: 6,
  title: 'HELPING MISSION',
  primarySkill: 'understanding/expressing "help"',
  correctAnswers: {
    bossMission: 'item 1 (Kennedi kneeling down to help the puppy)',
  },
};

// Locked, textured FLUX-generated assets (Art Direction v2 continued,
// 2026-09-13) -- replaces two page-local hand-coded icons (the "hide the
// ball" and "walk away" wrong choices). No locked Kennedi pose exists for
// a back-turned/walking figure (not one of the 8 required poses -- see
// docs/art/asset-provenance.md), so the door+arrow reads as "the door is
// open and she's gone through it" instead of depicting Kennedi directly --
// same reasoning as the hand-drawn version this replaces, now executed in
// the locked-asset style instead of a simple stroke icon.
//
// Both DO need the same measure-then-crop treatment as kennediHelpingCard
// above, contrary to what a first pass at this assumed ("potrace-vectorized
// from a square 1024x1024 source like every other locked asset, so no
// special crop needed"): rendered in this row at real print size, both
// read noticeably smaller/sparser than the Kennedi card -- confirmed by
// looking at the actual rasterized page (dist/pdf-raster/page-6.png), not
// assumed from the source SVG. A first crop attempt (padding the raw
// generation's bbox 6%) only closed part of the gap -- the remaining
// difference wasn't framing, it was ink DENSITY: a door/crate outline is
// inherently leaner than a densely-detailed character illustration.
// Regenerated both from a prompt explicitly asking for a larger, closer,
// more detailed composition (visible hinges/panel detail on the door,
// wood-grain/rivet texture on the crate) before cropping, which closed
// most of the remaining gap.
//
// Content bbox measured the same way (getBBox() on the <svg> root -- NOT
// on the inner potrace <g>, whose own transform="translate(...)
// scale(0.1,-0.1)" makes getBBox() on it return raw pre-transform path
// coordinates ~10x too large): door-arrow.svg x=99.2 y=145.1 w=811.2
// h=834.7; ball-behind-box.svg x=209.6 y=277.4 w=618.1 h=508.9 (both
// inside the nominal 0-1024 viewBox). Padded 6% per axis then squared
// off, same recipe as kennediHelpingCard.
const ballBehindBoxLocked = withSvgLabel(withViewBox(inlineSvgFile(path.join(OBJECTS_LOCKED, 'ball-behind-box.svg')), '172 186 692 692'), 'a ball hidden behind a box');
const walkingAwayLocked = withSvgLabel(withViewBox(inlineSvgFile(path.join(OBJECTS_LOCKED, 'door-arrow.svg')), '37 95 935 935'), 'an open door with an arrow leading away, meaning Kennedi leaves');

export function render() {
  const body = `
    <div class="col">
      <p class="read-line">The puppy needs help.</p>
      <p class="read-line">Kennedi can help.</p>
    </div>
    <div class="row" style="justify-content:center;">
      <div style="width:2.2in;">${kennediHelping}</div>
    </div>
    ${pictureChoiceRow({
      instruction: 'What should Kennedi do?',
      columns: 3,
      items: [
        { svg: kennediHelpingCard },
        { svg: walkingAwayLocked },
        { svg: ballBehindBoxLocked },
      ],
    })}
    <div class="row" style="justify-content:center; align-items:center; gap:0.2in;">
      <p class="read-line" style="margin:0;">I can</p>
      <div style="width:2.3in;">${tracingWord('help', { height: 130 })}</div>
      <p class="read-line" style="margin:0;">.</p>
    </div>
    <div class="row" style="justify-content:flex-end;">
      ${rewardStar({ caption: 'MISSION COMPLETE', size: '0.5in' })}
    </div>
  `;
  return pageShell({ pageNumber: meta.pageNumber, title: meta.title, body });
}
