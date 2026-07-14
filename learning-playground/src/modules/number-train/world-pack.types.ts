/**
 * Number Train world packs — the typed boundary between the game's
 * mechanics and its fantasy.
 *
 * A world pack changes the fantasy, not the learning contract: it supplies
 * semantic presentation slots (vehicle, passenger, guide, scene, progress,
 * completion, expressive customization) and never owns rounds, evaluation,
 * evidence, hints, or accessibility semantics. The runtime asks for
 * concepts ("vehicle segment", "occupied seat", "guide happy"); whether the
 * world answers with a train car or a shuttle module is the pack's business.
 *
 * Worlds are expression, never progression (reward contract): no world or
 * customization choice may be earned, purchased, unlocked, or randomly
 * granted. Selection is the child's explicit act.
 *
 * These types are Number Train-owned. Other games must not import them;
 * future world systems for other games get their own boundary.
 */

export const NUMBER_TRAIN_GAME_ID = 'number-train';

/**
 * The translucent chrome background derived from a world's text ink —
 * expands 3-digit hex shorthand and emits exact rgba() so the derivation
 * can never produce an invalid color token, and the Train Station value
 * matches the game's previous rgba(58, 36, 97, 0.12) exactly.
 */
export function worldChromeBackground(textInk: string): string {
  let hex = textInk.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

/** One choice inside an expressive customization slot (never scored). */
export interface WorldCustomizationChoice {
  id: string;
  label: string;
  spokenLabel: string;
  /**
   * What the choice changes: a solid accent color (hex) or a small local
   * SVG snippet (badge, flag, headwear). Exactly one must be provided.
   */
  accentColor?: string;
  artSvg?: string;
}

/**
 * An expressive customization slot (ownership-completion contract): chosen
 * not randomized, available without labor, preserved exactly through the
 * completion payoff.
 */
export interface WorldCustomizationSlot {
  /** Semantic id, parallel across worlds where honest (e.g. vehicle_accent). */
  id: string;
  label: string;
  spokenLabel: string;
  choices: WorldCustomizationChoice[];
  defaultChoiceId: string;
}

/**
 * The palette the runtime applies as world-scoped CSS custom properties.
 * Values are hex colors; the runtime owns WHERE they apply (car fill, seat
 * borders, track) so worlds cannot restyle unrelated UI.
 */
export interface WorldPalette {
  vehicleBody: string;
  vehicleTrim: string;
  seatEmpty: string;
  seatOccupied: string;
  ground: string;
  sky: string;
  /** Header/title/feedback ink — dark-sky worlds need a light ink (proof
   * finding: ink-on-space is unreadable). */
  textInk: string;
  /** Softer prompt ink (may equal textInk on dark worlds). */
  textSoft: string;
}

/** Declared behavior for the compact/mobile presentation of the scene. */
export interface WorldMobileBehavior {
  /**
   * 'bands-only-swap': the scene ships a bands-only mobile export swapped
   * via <picture> at the compact query (the station pattern).
   * 'inline-crop': the scene is one inline SVG whose xMidYMax slice crop
   * naturally reduces to bands at compact widths (the shuttle pattern,
   * verified in the slice-3 proof captures).
   */
  mode: 'bands-only-swap' | 'inline-crop';
}

export interface NumberTrainWorldPack {
  /** Stable id; also the asset folder and CSS scope suffix. */
  id: string;
  /** Bumped when the pack's assets or manifest change meaningfully. */
  version: number;
  /** Must be NUMBER_TRAIN_GAME_ID — packs are game-owned. */
  gameId: typeof NUMBER_TRAIN_GAME_ID;
  /** Child-facing label (short; the selector card caption). */
  label: string;
  /** Spoken on preview tap (must exist in the voice-pack enumeration). */
  spokenLabel: string;

  /** Selector preview: a self-contained local SVG communicating the world. */
  previewSvg(): string;

  /** The engine/cockpit — the front of the vehicle (single object, no
   * countable clusters). */
  vehicleFrontSvg(): string;
  /** An occupied-seat token — MUST stay high-contrast and countable at the
   * existing seat size/positions. */
  passengerSvg(): string;

  /** The inert backdrop scene layer (aria-hidden, pointer-events none,
   * zero countable clusters). */
  mountEnvironment(): HTMLElement;

  palette: WorldPalette;

  /** Spoken flavor overrides; instructional meaning must stay equivalent.
   * Every string must be in the voice-pack enumeration. Omitted keys fall
   * back to the shared train lines. */
  flavor?: {
    arrivalLine?: string;
  };

  /** Where the trip ends (slice 4 renders it; earlier slices may reuse the
   * existing arrival treatment). */
  completion: {
    /** Child-facing description of the destination (a11y + parent view). */
    destinationLabel: string;
    /** Renders the destination beat; null = the existing arrival flow. */
    destinationSceneSvg: (() => string) | null;
  };

  /** Expressive slots (may be empty until the ownership slice lands). */
  customization: WorldCustomizationSlot[];

  mobile: WorldMobileBehavior;

  /** Worlds must declare that their extra animation is nonessential and
   * disabled under prefers-reduced-motion. */
  reducedMotion: { nonessentialAnimationDisabled: true };

  /** Heading of this world's family entry in docs/art/asset-provenance.md. */
  provenanceRef: string;
}
