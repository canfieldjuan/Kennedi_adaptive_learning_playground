/**
 * The child home backdrop — a local production-art export composed from the
 * shared component library (design-source/art-direction/). Reserved clear
 * zones keep the greeting, the card grid, and the Parent button free of
 * props. Decoration only: aria-hidden, no pointer events, no fonts, no
 * external assets.
 */

export function createCafeBackdrop(): HTMLElement {
  const backdrop = document.createElement('div');
  backdrop.className = 'cafe-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML = `<img
      class="cafe-backdrop__img"
      src="/assets/images/home-room-proof.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
    >`;
  return backdrop;
}
