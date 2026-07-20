/**
 * Dress-Up Studio wardrobe + scene art — original inline SVG in the app's
 * illustrated standard (purple ink #3a2461, warm flat fills, rounded friendly
 * geometry). Category A original project artwork; no <text>, no emoji, no
 * external assets, no base64.
 *
 * Every clothing piece is authored against the fixed doll anchor points in
 * doll-art.ts (viewBox 0 0 200 340), so pieces snap onto the same body. Each
 * renderer returns inner SVG markup (no <svg> wrapper). Unknown ids never
 * reach here — the compose layer skips a missing item fail-safe.
 */

import type {
  AccessoryItem,
  StudioFrame,
  StudioScene,
  StudioSticker,
  WardrobeItem,
} from './dress-up-studio.types';

export const INK = '#3a2461';

// — Small reusable motifs (also used for card stickers and top decorations) —

export function starPath(cx: number, cy: number, r: number, fill: string): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return `<path d="M${pts.join(' L')} Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}

export function heartPath(cx: number, cy: number, s: number, fill: string): string {
  return `<path d="M${cx},${cy + s * 0.9} q-${s},-${s * 0.72} -${s},-${s * 1.2} q0,-${s * 0.5} ${s * 0.5},-${s * 0.5} q${s * 0.33},0 ${s * 0.5},${s * 0.3} q${s * 0.17},-${s * 0.3} ${s * 0.5},-${s * 0.3} q${s * 0.5},0 ${s * 0.5},${s * 0.5} q0,${s * 0.48} -${s},${s * 1.2} Z" fill="${fill}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
}

export function flowerPath(cx: number, cy: number, r: number, fill: string): string {
  const petals = [0, 1, 2, 3, 4]
    .map((i) => {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      return `<circle cx="${(cx + r * Math.cos(a)).toFixed(1)}" cy="${(cy + r * Math.sin(a)).toFixed(1)}" r="${(r * 0.62).toFixed(1)}" fill="${fill}" stroke="${INK}" stroke-width="2.6"/>`;
    })
    .join('');
  return `<g>${petals}<circle cx="${cx}" cy="${cy}" r="${(r * 0.5).toFixed(1)}" fill="#fdf3d0" stroke="${INK}" stroke-width="2.6"/></g>`;
}

// — Tops (cover the torso y 120..200, short sleeves over the upper arms) —

export function topSvg(item: WardrobeItem): string {
  const shirt = `<path d="M70,120 Q100,110 130,120 L146,150 L128,160 L126,200 Q100,210 74,200 L72,160 L54,150 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  let deco = '';
  switch (item.id) {
    case 'top-star-tee':
      deco = starPath(100, 162, 13, '#fff3c4');
      break;
    case 'top-stripe-tee':
      deco = `<g stroke="#ffffff" stroke-width="6" opacity="0.8" stroke-linecap="round"><line x1="80" y1="150" x2="120" y2="150"/><line x1="80" y1="166" x2="120" y2="166"/><line x1="82" y1="182" x2="118" y2="182"/></g>`;
      break;
    case 'top-heart-sweater':
      deco = heartPath(100, 152, 12, '#fff3f7');
      break;
    case 'top-ruffle':
      deco = `<path d="M74,196 q8,10 16,0 q8,10 16,0 q8,10 16,0" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;
      break;
  }
  return `<g class="du-layer du-top">${shirt}${deco}</g>`;
}

// — Bottoms (skirt trapezoid, or full-length legs for pants/leggings) —

export function bottomSvg(item: WardrobeItem): string {
  if (item.id === 'bottom-denim-skirt') {
    return `<g class="du-layer du-bottom"><path d="M76,196 L66,248 Q100,260 134,248 L124,196 Q100,204 76,196 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M100,200 L100,252" stroke="${INK}" stroke-width="2.5" opacity="0.5"/></g>`;
  }
  // Pants / leggings: two legs from the hips to the ankles.
  const flare = item.id === 'bottom-flare-pants';
  const leftHem = flare ? 'L74,300 L100,300' : 'L82,300 L98,300';
  const rightHem = flare ? 'L100,300 L126,300' : 'L102,300 L118,300';
  return `<g class="du-layer du-bottom">
    <path d="M78,196 L82,300 ${leftHem} L100,198 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M100,198 ${rightHem} L118,300 L122,196 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  </g>`;
}

// — Dresses (torso + flared skirt; exclusive with top + bottom) —

export function dressSvg(item: WardrobeItem): string {
  const body = `<path d="M70,120 Q100,110 130,120 L128,158 L154,252 Q100,268 46,252 L72,158 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  let deco = '';
  switch (item.id) {
    case 'dress-party':
      deco = `${starPath(84, 210, 7, '#fff3c4')}${starPath(112, 226, 6, '#fff3c4')}${starPath(100, 190, 6, '#fff3c4')}`;
      break;
    case 'dress-sun':
      deco = flowerPath(100, 200, 12, '#fff3c4');
      break;
    case 'dress-tutu':
      deco = `<path d="M52,232 q12,16 24,0 q12,16 24,0 q12,16 24,0 q12,16 24,0" fill="none" stroke="#ffffff" stroke-width="5" stroke-linejoin="round" opacity="0.85"/>`;
      break;
    case 'dress-rainbow':
      deco = `<g stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9"><path d="M64,238 Q100,252 136,238" stroke="#f28fb3"/><path d="M60,226 Q100,240 140,226" stroke="#f6c85f"/><path d="M58,214 Q100,228 142,214" stroke="#7fceb6"/></g>`;
      break;
  }
  return `<g class="du-layer du-dress">${body}${deco}</g>`;
}

// — Shoes (at the feet y 298..320; boots reach up the ankle) —

export function shoesSvg(item: WardrobeItem): string {
  const tall = item.id === 'shoes-boots' || item.id === 'shoes-rain-boots';
  const top = tall ? 278 : 298;
  const foot = (x: number) =>
    `<path d="M${x - 8},${top} L${x - 8},308 Q${x - 8},318 ${x + 2},318 L${x + 14},318 Q${x + 20},318 ${x + 20},312 L${x + 20},${top} Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  const laces =
    item.id === 'shoes-sneakers'
      ? `<line x1="82" y1="304" x2="92" y2="304" stroke="#ffffff" stroke-width="3"/><line x1="106" y1="304" x2="116" y2="304" stroke="#ffffff" stroke-width="3"/>`
      : '';
  return `<g class="du-layer du-shoes">${foot(90)}${foot(110)}${laces}</g>`;
}

// — Jackets (open front over the torso + sleeves over the arms) —

export function jacketSvg(item: WardrobeItem): string {
  const panels = `<path d="M68,120 L54,150 L66,160 L70,204 L96,204 L96,122 Q82,116 68,120 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M132,120 L146,150 L134,160 L130,204 L104,204 L104,122 Q118,116 132,120 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
  let deco = '';
  switch (item.id) {
    case 'jacket-denim':
      deco = `<line x1="78" y1="172" x2="88" y2="172" stroke="${INK}" stroke-width="3" opacity="0.55"/><line x1="112" y1="172" x2="122" y2="172" stroke="${INK}" stroke-width="3" opacity="0.55"/>`;
      break;
    case 'jacket-raincoat':
      deco = `<path d="M84,116 Q100,104 116,116 L110,124 Q100,118 90,124 Z" fill="${item.value}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="90" cy="160" r="2.6" fill="${INK}"/><circle cx="90" cy="178" r="2.6" fill="${INK}"/>`;
      break;
    case 'jacket-puffer':
      deco = `<g stroke="${INK}" stroke-width="2.6" opacity="0.5"><line x1="70" y1="150" x2="96" y2="150"/><line x1="70" y1="172" x2="96" y2="172"/><line x1="104" y1="150" x2="130" y2="150"/><line x1="104" y1="172" x2="130" y2="172"/></g>`;
      break;
  }
  return `<g class="du-layer du-jacket">${panels}${deco}</g>`;
}

// — Accessories (multi-select; each positioned on its body anchor) —

export function accessorySvg(item: AccessoryItem): string {
  switch (item.id) {
    case 'acc-bow':
      return `<g class="du-layer du-acc-bow"><path d="M100,30 L84,20 Q78,30 84,40 Z" fill="${item.value}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><path d="M100,30 L116,20 Q122,30 116,40 Z" fill="${item.value}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/><circle cx="100" cy="30" r="6" fill="${item.value}" stroke="${INK}" stroke-width="4"/></g>`;
    case 'acc-bag':
      return `<g class="du-layer du-acc-bag"><path d="M72,132 L128,182" stroke="${INK}" stroke-width="4" fill="none" opacity="0.8"/><rect x="120" y="178" width="26" height="22" rx="6" fill="${item.value}" stroke="${INK}" stroke-width="4"/><path d="M126,178 q7,-8 14,0" fill="none" stroke="${INK}" stroke-width="3"/></g>`;
    case 'acc-necklace':
      return `<g class="du-layer du-acc-necklace"><path d="M86,120 Q100,134 114,120" fill="none" stroke="${item.value}" stroke-width="3.4"/>${heartPath(100, 128, 5, item.value)}</g>`;
    case 'acc-sun-hat':
      return `<g class="du-layer du-acc-hat"><ellipse cx="100" cy="44" rx="52" ry="14" fill="${item.value}" stroke="${INK}" stroke-width="5"/><path d="M74,44 Q100,8 126,44 Z" fill="${item.value}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/></g>`;
    default:
      return '';
  }
}

// — Scene backdrops (fill the card viewBox 0 0 240 360, drawn behind the doll) —

export function sceneBackdropSvg(scene: StudioScene): string {
  const bg = `<rect x="0" y="0" width="240" height="360" fill="${scene.value}"/>`;
  switch (scene.id) {
    case 'scene-birthday':
      return `${bg}<g stroke="${INK}" stroke-width="2.5"><line x1="18" y1="30" x2="222" y2="24" stroke-width="2"/><path d="M40,28 l10,20 l10,-22 Z" fill="#f6c85f"/><path d="M80,26 l10,22 l10,-24 Z" fill="#7fceb6"/><path d="M120,25 l10,23 l10,-25 Z" fill="#f28fb3"/><path d="M160,26 l10,22 l10,-24 Z" fill="#a7c8f0"/></g><g><circle cx="34" cy="120" r="22" fill="#f8a5c2" stroke="${INK}" stroke-width="3"/><line x1="34" y1="142" x2="34" y2="196" stroke="${INK}" stroke-width="2"/><circle cx="210" cy="140" r="20" fill="#a7d8c2" stroke="${INK}" stroke-width="3"/><line x1="210" y1="160" x2="210" y2="210" stroke="${INK}" stroke-width="2"/></g>`;
    case 'scene-park':
      return `${bg}<rect x="0" y="250" width="240" height="110" fill="#a7d59a"/><circle cx="46" cy="52" r="26" fill="#ffe08a" stroke="${INK}" stroke-width="3"/><g><rect x="188" y="150" width="18" height="110" fill="#a9744f" stroke="${INK}" stroke-width="3"/><circle cx="197" cy="140" r="46" fill="#7cbf6a" stroke="${INK}" stroke-width="4"/></g><path d="M0,250 q60,-16 120,0 q60,16 120,0" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>`;
    case 'scene-dance':
      return `${bg}<rect x="0" y="250" width="240" height="110" fill="#c7a9e6"/><path d="M40,0 L96,250 L0,250 Z" fill="#f7ecff" opacity="0.6"/><path d="M200,0 L144,250 L240,250 Z" fill="#f7ecff" opacity="0.6"/>${starPath(40, 60, 10, '#f6c85f')}${starPath(206, 84, 12, '#f6c85f')}${starPath(30, 150, 8, '#ffffff')}`;
    case 'scene-rainy':
      return `${bg}<g fill="#eef4fb" stroke="${INK}" stroke-width="3"><ellipse cx="70" cy="70" rx="40" ry="22"/><ellipse cx="176" cy="52" rx="34" ry="20"/></g><g stroke="#7fa8d0" stroke-width="4" stroke-linecap="round"><line x1="52" y1="110" x2="46" y2="128"/><line x1="96" y1="120" x2="90" y2="138"/><line x1="150" y1="108" x2="144" y2="126"/><line x1="196" y1="118" x2="190" y2="136"/></g><ellipse cx="120" cy="330" rx="70" ry="12" fill="#a7c4de" opacity="0.7"/>`;
    default:
      return bg;
  }
}

// — Card frame (border motif around the finished card, viewBox 0 0 240 360) —

export function frameSvg(frame: StudioFrame): string {
  const border = `<rect x="6" y="6" width="228" height="348" rx="16" fill="none" stroke="${frame.value}" stroke-width="10"/><rect x="14" y="14" width="212" height="332" rx="12" fill="none" stroke="${INK}" stroke-width="2" opacity="0.4"/>`;
  const corners: string[] = [];
  const spots: Array<[number, number]> = [
    [20, 20],
    [220, 20],
    [20, 340],
    [220, 340],
  ];
  for (const [x, y] of spots) {
    if (frame.id === 'frame-gold-stars') corners.push(starPath(x, y, 10, frame.value));
    else if (frame.id === 'frame-pink-hearts') corners.push(heartPath(x, y - 4, 8, frame.value));
    else corners.push(flowerPath(x, y, 9, frame.value));
  }
  return `<g class="du-frame">${border}${corners.join('')}</g>`;
}

// — Optional card sticker (a single motif in the lower-right of the card) —

export function cardStickerSvg(sticker: StudioSticker): string {
  const cx = 206;
  const cy = 300;
  switch (sticker.id) {
    case 'sticker-heart':
      return `<g class="du-card-sticker">${heartPath(cx, cy - 6, 14, '#f06fa6')}</g>`;
    case 'sticker-star':
      return `<g class="du-card-sticker">${starPath(cx, cy, 15, '#f6c343')}</g>`;
    case 'sticker-flower':
      return `<g class="du-card-sticker">${flowerPath(cx, cy, 13, '#f28fb3')}</g>`;
    default:
      return '';
  }
}
