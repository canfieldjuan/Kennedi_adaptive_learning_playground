import { bossBadgeIcon, starIcon } from '../illustrations/icons.mjs';

/**
 * The recurring "Boss Mission" callout box: badge + label + one short
 * instruction + whatever activity markup goes inside.
 *
 * `compact: true` applies `.mission-box-compact` / `.mission-badge-compact`
 * (tighter padding, smaller badge, see components.css) for a content-dense
 * page. Default sizing for existing callers is unchanged.
 */
export function bossMissionBox({ instruction, body = '', compact = false }) {
  const boxClass = compact ? 'mission-box mission-box-compact' : 'mission-box';
  const badgeClass = compact ? 'mission-badge mission-badge-compact' : 'mission-badge';
  return `
<div class="${boxClass}">
  <div class="mission-label">
    <span class="${badgeClass}">${bossBadgeIcon('boss badge')}</span>
    <span class="mission-kicker">Boss Mission</span>
  </div>
  <p class="instruction">${instruction}</p>
  ${body}
</div>`;
}

/**
 * A row of large picture-choice cards. `items` is [{ svg }] in display
 * order -- callers keep the answer key in the page-data file, never in a
 * class name or attribute, so the printed page doesn't leak the answer.
 *
 * `compact: true` applies `.choice-card-compact` (smaller min-height/padding,
 * see components.css) for content-dense pages that also need a picture-choice
 * mission -- the default (unset) card sizing is unchanged for existing pages.
 * `compact: 'sm'` applies `.choice-card-compact-sm` on top (smaller still) --
 * for pages with more than one picture-choice row competing for room on the
 * same sheet. `compact: 'xs'` switches the row to `.choice-row-xs` (flex,
 * fixed-width, non-stretched cards, see components.css) -- for a page with
 * more than one picture-choice row AND a portrait-aspect illustration (e.g.
 * full-body Boss Kennedi, taller than wide), where stretching cards to fill
 * a grid column at any small icon % just produces a wide flat bar with a
 * tiny icon stranded in the middle; fixed-width cards keep the icon a
 * legible, proportionate fraction of its own (smaller) card. Existing
 * `compact: true`/`'sm'` callers are unaffected.
 */
export function pictureChoiceRow({ instruction, items, columns, compact = false }) {
  const cols = columns || items.length;
  const isXs = compact === 'xs';
  const cardClass = isXs
    ? 'choice-card choice-card-compact choice-card-compact-xs'
    : compact === 'sm'
    ? 'choice-card choice-card-compact choice-card-compact-sm'
    : compact
    ? 'choice-card choice-card-compact'
    : 'choice-card';
  const rowClass = isXs ? 'choice-row choice-row-xs' : 'choice-row';
  const cards = items
    .map((item) => `<div class="${cardClass}">${item.svg}</div>`)
    .join('');
  return `
<div class="choice-block">
  ${instruction ? `<p class="instruction">${instruction}</p>` : ''}
  <div class="${rowClass}" style="--cols:${cols};">${cards}</div>
</div>`;
}

export function rewardStar(opts = {}) {
  const { caption = 'MISSION COMPLETE', size } = opts;
  const sizeStyle = size ? ` style="width:${size};height:${size};"` : '';
  return `
<div class="reward-block">
  <p class="reward-caption">${caption}</p>
  <div class="reward-star"${sizeStyle}>${starIcon('color the star', false)}</div>
</div>`;
}

export function illustrationFrame({ inner, className = '' }) {
  return `<div class="illo-frame ${className}">${inner}</div>`;
}

export function drawingBox({ className = '' } = {}) {
  return `<div class="drawing-box ${className}"></div>`;
}
