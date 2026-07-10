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

export type {
  ActivityTransferMetadata,
  LearningActivity,
  TransferContextType,
  TransferPromptMode,
} from './activity';

export type {
  AttemptOutcome,
  InputType,
  ActivityAttemptEvent,
  SkillAttemptOutcome,
} from './events';

export type {
  ChildProgressProfile,
  SkillMasteryState,
  SessionSummary,
} from './progress';

export type { ParentObservation, ParentObservationCategory } from './observations';

export type {
  ParentDifficultyAction,
  ParentDifficultyActionType,
  ParentDifficultyOverride,
  ParentDifficultyOverrideType,
} from './parent-actions';

export type {
  ParentTransferDecision,
  ParentTransferDecisionType,
} from './transfer';

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
