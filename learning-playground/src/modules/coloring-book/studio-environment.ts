/**
 * The Art studio — the game-owned illustrated scene behind the coloring
 * activity (visual arc stage 4, issue #55). Deliberately ALL-NEUTRAL: creams,
 * wood tones, and gray-beige only, so color on this screen belongs
 * exclusively to the palette swatches and the child's filled shape — no
 * decoration can ever be confused with a color choice. Purely decorative:
 * aria-hidden, pointer-events disabled, no <text> anywhere.
 */

/**
 * The compact query from child-ui.css. Page CSS cannot reach inside an <img>,
 * so the old `.studio-env__prop--minor { display: none }` phone rule is
 * unreachable for an image-mounted scene; the <picture> source swap below is
 * the mechanism that keeps the phone surface shallow instead (bands-only
 * export, no props).
 */
const COMPACT_MEDIA =
  '(max-width: 768px), (max-width: 940px) and (max-height: 480px) and (orientation: landscape)';

export function createStudioEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'studio-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<picture>
      <source media="${COMPACT_MEDIA}" srcset="/assets/images/studio-room-proof-mobile.svg">
      <img
        class="studio-env__svg"
        src="/assets/images/studio-room-proof.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
      >
    </picture>`;
  return environment;
}
