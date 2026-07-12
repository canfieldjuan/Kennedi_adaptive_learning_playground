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

/**
 * The compact query from child-ui.css. Page CSS cannot reach inside an <img>,
 * so the old `.station-env__prop--minor { display: none }` phone rule is
 * unreachable for an image-mounted scene; the <picture> source swap below is
 * the mechanism that keeps the phone surface shallow instead (bands-only
 * export, no props).
 */
const COMPACT_MEDIA =
  '(max-width: 768px), (max-width: 940px) and (max-height: 480px) and (orientation: landscape)';

export function createStationEnvironment(): HTMLElement {
  const environment = document.createElement('div');
  environment.className = 'station-environment';
  environment.setAttribute('aria-hidden', 'true');
  environment.innerHTML = `<picture>
      <source media="${COMPACT_MEDIA}" srcset="/assets/images/train-station-proof-mobile.svg">
      <img
        class="station-env__svg"
        src="/assets/images/train-station-proof.svg"
        alt=""
        aria-hidden="true"
        draggable="false"
      >
    </picture>`;
  return environment;
}
