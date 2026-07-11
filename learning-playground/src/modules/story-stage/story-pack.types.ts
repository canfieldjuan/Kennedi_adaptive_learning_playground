/**
 * The authored story-pack model (arc slice 2).
 *
 * Stories are AUTHORED FAMILIES with controlled substitutions — never
 * sentence-fragment composition. Narration and adult cues are templates
 * over a closed token set ({hero}, {Hero}, {friend}, {setting}, {they},
 * {their}); tokens resolve from authored entity phrases, so substitutions
 * can change names, pronouns, art, and small authored details but can
 * never assemble a semantically incoherent story.
 *
 * Every scene carries BOTH the child narration and the adult storyteller
 * cue: Tell It Together (slice 5) is a runtime feature over this data,
 * never a content retrofit. Packs are provably sound via the pure
 * validator before anything ships.
 */

export type PackSceneKind =
  | 'intro'
  | 'problem'
  | 'decision'
  | 'consequence'
  | 'ending';

/** The closed substitution token set. Anything else fails validation. */
export const STORY_TOKENS = [
  '{hero}',
  '{Hero}',
  '{their}',
  '{Their}',
  '{friend}',
  '{friendPhrase}',
  '{friendThem}',
  '{setting}',
  '{settingDetail}',
] as const;

export interface StoryCharacter {
  id: string;
  /** Child-facing card label, e.g. "Princess Poppy". */
  label: string;
  /** Full introduction name for {Hero}, e.g. "Princess Poppy the explorer". */
  introName: string;
  /** Short in-story name for {hero}, e.g. "Poppy". */
  shortName: string;
  /** Short archetype line spoken at selection (slice 3). */
  spokenIntro: string;
  /** Possessive pronoun ("her"/"his"/"their") for {their}. */
  possessive: string;
  /** Art key into the pack's illustration set. */
  art: string;
}

export interface StorySetting {
  id: string;
  label: string;
  spokenIntro: string;
  /** The in-narration phrase for {setting}, e.g. "the enchanted forest". */
  phrase: string;
  /** Authored flavor clause for {settingDetail}, e.g. "where the trees sparkle softly". */
  detail: string;
  art: string;
}

export interface StoryProblem {
  id: string;
  label: string;
  spokenIntro: string;
  /**
   * Friend fields exist only for problems ABOUT a friend (Lost Friend).
   * A family template may use the friend tokens only with problems that
   * define them — the validator dry-resolves every supported
   * combination, so a mismatch cannot ship.
   */
  friendLabel?: string;
  /** Fuller phrase for {friendPhrase}, e.g. "puppy friend Biscuit". */
  friendPhrase?: string;
  /** Object pronoun for {friendThem}, e.g. "him". */
  friendThem?: string;
  art: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  art: string;
  next: string;
}

/**
 * The adult storyteller cue for one scene (Tell It Together, slice 5):
 * concise, scannable, never a script.
 */
export interface AdultCue {
  /** What happens in this scene. */
  beat: string;
  /** The emotional or plot fact that must remain true. */
  keepTrue: string;
  /** A suggested question to ask Kennedi. */
  ask: string;
  /** Optional silly detail the adult may use. */
  silly?: string;
}

export interface PackScene {
  id: string;
  kind: PackSceneKind;
  /** Narration TEMPLATE over the closed token set. */
  narration: string;
  /** Adult cue TEMPLATES over the same token set. Required everywhere. */
  cue: AdultCue;
  art: string;
  /** Exactly two when kind === 'decision'. */
  choices?: [StoryChoice, StoryChoice];
  /** Continue target for non-decision, non-ending scenes. */
  next?: string;
  /** Stable ending id when kind === 'ending'. */
  endingId?: string;
}

export interface StoryFamily {
  id: string;
  /** e.g. 'lost-friend' | 'broken-thing' | 'special-delivery'. */
  archetype: string;
  title: string;
  /** Opening line template, spoken once at story start. */
  opening: string;
  entrySceneId: string;
  /** Upper bound for every play path (validator-enforced). */
  maxPathLength: number;
  /** Compatibility: which pack entities this family supports. */
  characterIds: string[];
  settingIds: string[];
  problemIds: string[];
  scenes: PackScene[];
}

export interface StoryPack {
  id: string;
  version: number;
  characters: StoryCharacter[];
  settings: StorySetting[];
  problems: StoryProblem[];
  families: StoryFamily[];
}

export interface StorySelection {
  characterId: string;
  settingId: string;
  problemId: string;
}

/** A fully resolved, playable scene (all tokens substituted). */
export interface ResolvedScene {
  id: string;
  kind: PackSceneKind;
  narration: string;
  cue: AdultCue;
  art: string;
  choices?: [StoryChoice, StoryChoice];
  next?: string;
  endingId?: string;
}

export interface ResolvedStory {
  familyId: string;
  title: string;
  opening: string;
  entrySceneId: string;
  pathLength: number;
  selection: StorySelection;
  scenes: ResolvedScene[];
}
