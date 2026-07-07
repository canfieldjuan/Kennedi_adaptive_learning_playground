/**
 * Barrel export for all domain types.
 */

export type {
  LearningDomain,
  SkillId,
  MasteryLevel,
  InteractionModel,
  DistractorStrength,
} from './domains';

export type { LearningActivity } from './activity';

export type {
  AttemptOutcome,
  InputType,
  ActivityAttemptEvent,
} from './events';

export type {
  ChildProgressProfile,
  SkillMasteryState,
  SessionSummary,
} from './progress';

export type { ParentObservation } from './observations';

export type {
  ParentDifficultyAction,
  ParentDifficultyActionType,
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from './parent-actions';

export type {
  ParentSettings,
  ApprovedAsset,
  StorageContract,
} from './storage';

export type {
  ContentPackItem,
  ContentPack,
} from './content-pack';

export type {
  SpeechServiceInterface,
  SpeechOptions,
  AudioServiceInterface,
  StorageServiceInterface,
  ActivityContext,
  ActivityCompletionSummary,
  ActivityRuntime,
} from './runtime';
