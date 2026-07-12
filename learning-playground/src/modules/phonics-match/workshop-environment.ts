/**
 * Pip's Word Workshop — the production-art scene behind all three Words
 * modes, composed from the shared component library
 * (design-source/art-direction/). Reserved clear zones keep the title,
 * prompt, Pip, and the card/tile band prop-free. Purely decorative:
 * aria-hidden, pointer-events disabled, softened by layer opacity.
 * HARD GUARDRAIL (unchanged): nothing in this scene may read as a letter,
 * word, tile, or choice — book spines are plain colors, the pin-board
 * holds abstract shapes, and there is no <text> anywhere.
 */

/**
 * The compact query from child-ui.css. Page CSS cannot reach inside an <img>,
 * so the old `.workshop-env__prop--minor { display: none }` phone rule is
 * unreachable for an image-mounted scene; the <picture> source swap below is
 * the mechanism that keeps the phone surface shallow instead (bands-only
 * export, no props).
 */
const COMPACT_MEDIA =
  '(max-width: 768px), (max-width: 940px) and (max-height: 480px) and (orientation: landscape)';

/** The decorative workshop layer shared by all three Words modes. */
export function createWorkshopEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'workshop-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<picture>
      <source media="${COMPACT_MEDIA}" srcset="/assets/images/words-workshop-proof-mobile.svg">
      <img
        class="workshop-env__svg"
        src="/assets/images/words-workshop-proof.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
      >
    </picture>`;
  return environment;
}
