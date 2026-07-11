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

/** The decorative workshop layer shared by all three Words modes. */
export function createWorkshopEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'workshop-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<img
      class="workshop-env__svg"
      src="/assets/images/words-workshop-proof.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
    >`;
  return environment;
}
