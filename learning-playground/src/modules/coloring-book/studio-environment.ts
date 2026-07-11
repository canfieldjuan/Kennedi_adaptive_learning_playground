/**
 * The Art studio — the game-owned illustrated scene behind the coloring
 * activity (visual arc stage 4, issue #55). Deliberately ALL-NEUTRAL: creams,
 * wood tones, and gray-beige only, so color on this screen belongs
 * exclusively to the palette swatches and the child's filled shape — no
 * decoration can ever be confused with a color choice. Purely decorative:
 * aria-hidden, pointer-events disabled, no <text> anywhere.
 */

export function createStudioEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'studio-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<img
      class="studio-env__svg"
      src="/assets/images/studio-room-proof.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
    >`;
  return environment;
}
