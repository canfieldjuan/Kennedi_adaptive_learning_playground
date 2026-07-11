/**
 * The friendly train station — the game-owned illustrated scene behind the
 * Number Train (visual arc stage 5, issue #55). Purely decorative:
 * aria-hidden, pointer-events disabled, no <text> anywhere.
 *
 * Hard guardrail: every Number Train round is a counting task, so the scenery
 * contains NO loose countable objects — hills and the town are continuous
 * silhouettes (no window rows), the rails have no discrete sleeper ties, and
 * there are no birds, clouds-in-groups, or repeated small props.
 */

export function createStationEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'station-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<img
      class="station-env__svg"
      src="/assets/images/train-station-proof.svg"
      alt=""
      aria-hidden="true"
      draggable="false"
    >`;
  return environment;
}
