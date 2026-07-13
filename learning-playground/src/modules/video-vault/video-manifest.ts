import type {
  ApprovedVideo,
  ApprovedVideoItem,
  BilingualStoryMode,
  BilingualStoryVideoItem,
  SupportedVideoMimeType,
  VideoVaultManifestItem,
} from './video-vault.types';

export interface VideoManifestValidation {
  valid: boolean;
  issues: string[];
  source_schema_version?: 2 | 3;
  approved_items: VideoVaultManifestItem[];
  /** Existing runtime adapter. Bilingual stories remain excluded until Slice 4. */
  playable_videos: ApprovedVideo[];
}

const MAX_VIDEO_DURATION_SECONDS = 300;
const MAX_MANIFEST_ITEMS = 50;
const MAX_STORY_CUES = 128;
const MAX_VISUAL_TARGETS = 32;
const MAX_INTERACTION_SLOTS = 16;
const MAX_TARGET_WORDS = 8;
const MAX_TARGET_PHRASES = 2;
const MAX_PAGE_REGISTRY_ITEMS = 32;
const MAX_STICKERS_PER_PAGE = 2;

const STORY_MODES: BilingualStoryMode[] = [
  'english',
  'story_bridge',
  'spanish_replay',
];
const VIDEO_EXTENSIONS: Record<SupportedVideoMimeType, RegExp> = {
  'video/mp4': /\.mp4$/i,
  'video/webm': /\.webm$/i,
};
const THUMBNAIL_EXTENSION = /\.(?:jpe?g|png|webp|svg)$/i;
const AUDIO_EXTENSION = /\.(?:m4a|mp3|ogg|wav)$/i;
const SAFE_ID = /^[a-z0-9-]+$/;
const SHA256 = /^[a-f0-9]{64}$/;
const HEX_COLOR = /^#[a-f0-9]{6}$/i;

export function validateVideoManifest(
  value: unknown,
  expectedManifestId?: string
): VideoManifestValidation {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return invalidResult(['manifest must be an object']);
  }

  validateManifestPolicy(value, expectedManifestId, issues);
  const sourceSchemaVersion = getSourceSchemaVersion(value, issues);

  const items = getBoundedArray(
    value.items,
    'manifest items',
    0,
    MAX_MANIFEST_ITEMS,
    issues
  );
  if (sourceSchemaVersion === undefined) return invalidResult(issues);

  const itemIds = new Set<string>();
  const mediaPaths = new Set<string>();
  const approvedItems: VideoVaultManifestItem[] = [];

  for (const [index, item] of items.entries()) {
    const normalized = sourceSchemaVersion === 2
      ? validateLegacyVideoItem(item, index, issues, itemIds, mediaPaths)
      : validateV3Item(item, index, issues, itemIds, mediaPaths);
    if (normalized) approvedItems.push(normalized);
  }

  if (issues.length > 0) return invalidResult(issues);

  return {
    valid: true,
    issues: [],
    source_schema_version: sourceSchemaVersion,
    approved_items: approvedItems,
    playable_videos: approvedItems.filter(
      (item): item is ApprovedVideoItem => item.kind === 'approved_video'
    ),
  };
}

function validateManifestPolicy(
  value: Record<string, unknown>,
  expectedManifestId: string | undefined,
  issues: string[]
): void {
  const manifestId = getNonEmptyString(value.id);
  if (!manifestId) issues.push('manifest id must be a non-empty string');
  if (expectedManifestId !== undefined && manifestId !== expectedManifestId) {
    issues.push('manifest id does not match the activity manifest id');
  }
  if (!Number.isInteger(value.version) || Number(value.version) < 1) {
    issues.push('manifest version must be a positive integer');
  }
  if (!getNonEmptyString(value.title)) {
    issues.push('manifest title must be a non-empty string');
  }
  if (value.intake_mode !== 'repo_bundled') {
    issues.push('manifest intake_mode must be repo_bundled');
  }
  if (value.parent_imports_supported !== false) {
    issues.push('manifest parent imports must remain unsupported');
  }
  if (value.approved_by_parent !== true) {
    issues.push('manifest must be approved by a parent');
  }
  if (value.evidence_role !== 'exposure_only') {
    issues.push('manifest evidence_role must be exposure_only');
  }
}

function getSourceSchemaVersion(
  value: Record<string, unknown>,
  issues: string[]
): 2 | 3 | undefined {
  if (value.schema_version === undefined) {
    if (value.version === 2) return 2;
    issues.push('manifest without schema_version must be the legacy version 2 shape');
    return undefined;
  }
  if (value.schema_version === 3) return 3;

  issues.push('manifest schema_version must be 3');
  return undefined;
}

function validateLegacyVideoItem(
  value: unknown,
  index: number,
  issues: string[],
  itemIds: Set<string>,
  mediaPaths: Set<string>
): ApprovedVideoItem | undefined {
  const prefix = `item ${index}`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object`);
    return undefined;
  }
  if (value.kind !== undefined) {
    issues.push(`${prefix} legacy version 2 item must not declare kind`);
  }

  validateApprovedVideoFields(value, prefix, issues, itemIds, mediaPaths);
  return { ...value, kind: 'approved_video' } as unknown as ApprovedVideoItem;
}

function validateV3Item(
  value: unknown,
  index: number,
  issues: string[],
  itemIds: Set<string>,
  mediaPaths: Set<string>
): VideoVaultManifestItem | undefined {
  const prefix = `item ${index}`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object`);
    return undefined;
  }

  if (value.kind === 'approved_video') {
    validateApprovedVideoFields(value, prefix, issues, itemIds, mediaPaths);
    return value as unknown as ApprovedVideoItem;
  }
  if (value.kind === 'bilingual_story') {
    validateBilingualStory(value, prefix, issues, itemIds, mediaPaths);
    return value as unknown as BilingualStoryVideoItem;
  }

  issues.push(`${prefix} kind must be approved_video or bilingual_story`);
  return undefined;
}

function validateApprovedVideoFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[],
  itemIds: Set<string>,
  mediaPaths: Set<string>
): void {
  validateItemIdentity(value, prefix, issues, itemIds);
  validateVideoAsset(
    value.path,
    value.mime_type,
    value.duration_seconds,
    `${prefix}`,
    issues,
    mediaPaths
  );
  validateLocalApprovalPolicy(value, prefix, issues);

  const responseActivityId = getNonEmptyString(value.response_activity_id);
  if (!responseActivityId || !SAFE_ID.test(responseActivityId)) {
    issues.push(`${prefix} response_activity_id must be a local activity id`);
  }

  if (value.thumbnail_path !== undefined) {
    validateImagePath(value.thumbnail_path, `${prefix} thumbnail_path`, issues);
  }
  rejectAutomaticPlayback(value, prefix, issues);
}

function validateBilingualStory(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[],
  itemIds: Set<string>,
  mediaPaths: Set<string>
): void {
  validateItemIdentity(value, prefix, issues, itemIds);
  validateLocalApprovalPolicy(value, prefix, issues);
  rejectAutomaticPlayback(value, prefix, issues);

  if (!getNonEmptyString(value.story_family)) {
    issues.push(`${prefix} story_family must be a non-empty string`);
  }
  if (value.language_register !== 'es-419') {
    issues.push(`${prefix} language_register must be es-419`);
  }
  validateImagePath(value.thumbnail_path, `${prefix} thumbnail_path`, issues);

  const modeDurations = validateStoryModes(value.modes, prefix, issues, mediaPaths);
  const visualTargetIds = validateVisualTargets(value.visual_targets, prefix, issues);
  const interactionSlotIds = validateInteractionSlots(
    value.interaction_slots,
    prefix,
    issues
  );
  const languageTargetIds = new Set<string>();
  const targetWordIds = validateLanguageTargets(
    value.target_words,
    `${prefix} target_words`,
    1,
    MAX_TARGET_WORDS,
    visualTargetIds,
    issues,
    languageTargetIds
  );
  validateLanguageTargets(
    value.target_phrases,
    `${prefix} target_phrases`,
    0,
    MAX_TARGET_PHRASES,
    visualTargetIds,
    issues,
    languageTargetIds
  );
  validateStoryCues(
    value.cues,
    prefix,
    modeDurations,
    visualTargetIds,
    interactionSlotIds,
    targetWordIds,
    issues
  );
  validateCompletionPage(value.completion_page, prefix, issues);
}

function validateItemIdentity(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[],
  itemIds: Set<string>
): void {
  const id = getSafeId(value.id);
  if (!id) {
    issues.push(`${prefix} id must use lowercase letters, numbers, and hyphens`);
  } else if (itemIds.has(id)) {
    issues.push(`${prefix} id must be unique`);
  } else {
    itemIds.add(id);
  }
  if (!getNonEmptyString(value.title)) {
    issues.push(`${prefix} title must be a non-empty string`);
  }
}

function validateLocalApprovalPolicy(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  if (value.source !== 'local') issues.push(`${prefix} source must be local`);
  if (value.approved_by_parent !== true) {
    issues.push(`${prefix} must be approved by a parent`);
  }
  if (value.evidence_role !== 'exposure_only') {
    issues.push(`${prefix} evidence_role must be exposure_only`);
  }
}

function validateStoryModes(
  value: unknown,
  prefix: string,
  issues: string[],
  mediaPaths: Set<string>
): Map<BilingualStoryMode, number> {
  const durations = new Map<BilingualStoryMode, number>();
  if (!isRecord(value)) {
    issues.push(`${prefix} modes must be an object`);
    return durations;
  }

  const modeKeys = Object.keys(value);
  for (const key of modeKeys) {
    if (!STORY_MODES.includes(key as BilingualStoryMode)) {
      issues.push(`${prefix} modes contains unsupported mode ${key}`);
    }
  }

  const mediaIds = new Set<string>();
  for (const mode of STORY_MODES) {
    const modeValue = value[mode];
    const modePrefix = `${prefix} mode ${mode}`;
    if (!isRecord(modeValue)) {
      issues.push(`${modePrefix} must be an object`);
      continue;
    }
    addUniqueId(modeValue.id, `${modePrefix} media`, mediaIds, issues);
    validateVideoAsset(
      modeValue.path,
      modeValue.mime_type,
      modeValue.duration_seconds,
      modePrefix,
      issues,
      mediaPaths
    );
    if (modeValue.source !== 'local') issues.push(`${modePrefix} source must be local`);
    if (modeValue.approved_by_parent !== true) {
      issues.push(`${modePrefix} must be approved by a parent`);
    }
    rejectAutomaticPlayback(modeValue, modePrefix, issues);
    if (!isSha256(modeValue.sha256)) {
      issues.push(`${modePrefix} sha256 must be a lowercase SHA-256 digest`);
    }
    if (Number.isInteger(modeValue.duration_seconds)) {
      durations.set(mode, Number(modeValue.duration_seconds));
    }
  }
  return durations;
}

function validateVideoAsset(
  pathValue: unknown,
  mimeValue: unknown,
  durationValue: unknown,
  prefix: string,
  issues: string[],
  mediaPaths: Set<string>
): void {
  const path = getNonEmptyString(pathValue);
  const mimeType = getSupportedMimeType(mimeValue);
  if (!path || !isSafeLocalPath(path, /^\/assets\/videos?\//)) {
    issues.push(`${prefix} path must be a safe local video asset`);
  } else {
    if (mediaPaths.has(path)) issues.push(`${prefix} path must be unique`);
    else mediaPaths.add(path);
    if (mimeType && !VIDEO_EXTENSIONS[mimeType].test(path)) {
      issues.push(`${prefix} path extension must match mime_type`);
    }
  }
  if (!mimeType) issues.push(`${prefix} mime_type must be video/mp4 or video/webm`);
  if (
    !Number.isInteger(durationValue) ||
    Number(durationValue) < 1 ||
    Number(durationValue) > MAX_VIDEO_DURATION_SECONDS
  ) {
    issues.push(`${prefix} duration_seconds must be an integer from 1 to 300`);
  }
}

function validateVisualTargets(
  value: unknown,
  prefix: string,
  issues: string[]
): Set<string> {
  const targets = getBoundedArray(
    value,
    `${prefix} visual_targets`,
    1,
    MAX_VISUAL_TARGETS,
    issues
  );
  const ids = new Set<string>();
  for (const [index, target] of targets.entries()) {
    const targetPrefix = `${prefix} visual_target ${index}`;
    if (!isRecord(target)) {
      issues.push(`${targetPrefix} must be an object`);
      continue;
    }
    addUniqueId(target.id, targetPrefix, ids, issues);
    validateImagePath(target.asset_path, `${targetPrefix} asset_path`, issues);
    if (!getNonEmptyString(target.english_label)) {
      issues.push(`${targetPrefix} english_label must be a non-empty string`);
    }
    if (!getNonEmptyString(target.spanish_label)) {
      issues.push(`${targetPrefix} spanish_label must be a non-empty string`);
    }
    if (target.approved_by_parent !== true) {
      issues.push(`${targetPrefix} must be approved by a parent`);
    }
  }
  return ids;
}

function validateInteractionSlots(
  value: unknown,
  prefix: string,
  issues: string[]
): Set<string> {
  const slots = getBoundedArray(
    value,
    `${prefix} interaction_slots`,
    1,
    MAX_INTERACTION_SLOTS,
    issues
  );
  const ids = new Set<string>();
  for (const [index, slot] of slots.entries()) {
    const slotPrefix = `${prefix} interaction_slot ${index}`;
    if (!isRecord(slot)) {
      issues.push(`${slotPrefix} must be an object`);
      continue;
    }
    addUniqueId(slot.id, slotPrefix, ids, issues);
    if (!getNonEmptyString(slot.label)) {
      issues.push(`${slotPrefix} label must be a non-empty string`);
    }
  }
  return ids;
}

function validateLanguageTargets(
  value: unknown,
  prefix: string,
  minItems: number,
  maxItems: number,
  visualTargetIds: Set<string>,
  issues: string[],
  sharedIds: Set<string>
): Set<string> {
  const targets = getBoundedArray(value, prefix, minItems, maxItems, issues);
  const targetIds = new Set<string>();
  for (const [index, target] of targets.entries()) {
    const targetPrefix = `${prefix} ${index}`;
    if (!isRecord(target)) {
      issues.push(`${targetPrefix} must be an object`);
      continue;
    }
    const id = addUniqueId(target.id, targetPrefix, sharedIds, issues);
    if (id) targetIds.add(id);
    const englishText = getNonEmptyString(target.english_text);
    const spanishText = getNonEmptyString(target.spanish_text);
    if (!englishText) issues.push(`${targetPrefix} english_text must be non-empty`);
    if (!spanishText) issues.push(`${targetPrefix} spanish_text must be non-empty`);
    validateReference(
      target.visual_target_id,
      visualTargetIds,
      `${targetPrefix} visual_target_id`,
      issues
    );
    validateSpanishApproval(
      target.spanish_approval,
      `${targetPrefix} spanish_approval`,
      spanishText,
      englishText,
      issues
    );
  }
  return targetIds;
}

function validateStoryCues(
  value: unknown,
  prefix: string,
  modeDurations: Map<BilingualStoryMode, number>,
  visualTargetIds: Set<string>,
  interactionSlotIds: Set<string>,
  targetWordIds: Set<string>,
  issues: string[]
): void {
  const cues = getBoundedArray(value, `${prefix} cues`, 1, MAX_STORY_CUES, issues);
  const cueIds = new Set<string>();
  const completionCounts = new Map<BilingualStoryMode, number>();
  const responseCounts = new Map<BilingualStoryMode, number>();

  for (const [index, cue] of cues.entries()) {
    const cuePrefix = `${prefix} cue ${index}`;
    if (!isRecord(cue)) {
      issues.push(`${cuePrefix} must be an object`);
      continue;
    }
    addUniqueId(cue.id, cuePrefix, cueIds, issues);

    const mode = getStoryMode(cue.mode);
    if (!mode) issues.push(`${cuePrefix} mode must be a supported story mode`);
    const durationMs = mode ? (modeDurations.get(mode) ?? 0) * 1000 : 0;
    validateTimeSpan(cue.start_ms, cue.end_ms, durationMs, cuePrefix, issues);
    validateCuePrompt(cue.prompt, mode, cuePrefix, issues);

    const cueTargets = validateCueTargets(
      cue.visual_targets,
      cuePrefix,
      visualTargetIds,
      interactionSlotIds,
      issues
    );
    validateRepeatBoundary(cue.repeat_boundary, cue, durationMs, cuePrefix, issues);

    if (cue.cue_type === 'response_pause') {
      if (mode) responseCounts.set(mode, (responseCounts.get(mode) ?? 0) + 1);
      validateResponsePause(cue, cueTargets, cuePrefix, issues);
    } else if (
      cue.cue_type === 'narration_line' ||
      cue.cue_type === 'word_exposure' ||
      cue.cue_type === 'scene_transition' ||
      cue.cue_type === 'completion'
    ) {
      validatePassiveCue(cue, cuePrefix, issues);
      if (cue.cue_type === 'word_exposure') {
        validateTargetWordReferences(cue.target_word_ids, targetWordIds, cuePrefix, issues);
      }
      if (cue.cue_type === 'completion' && mode) {
        completionCounts.set(mode, (completionCounts.get(mode) ?? 0) + 1);
      }
    } else {
      issues.push(`${cuePrefix} cue_type is unsupported`);
    }
  }

  for (const mode of STORY_MODES) {
    if ((completionCounts.get(mode) ?? 0) !== 1) {
      issues.push(`${prefix} mode ${mode} must have exactly one completion cue`);
    }
    const responseCount = responseCounts.get(mode) ?? 0;
    if (responseCount < 1 || responseCount > 2) {
      issues.push(`${prefix} mode ${mode} must have one or two response_pause cues`);
    }
  }
}

function validateCuePrompt(
  value: unknown,
  mode: BilingualStoryMode | undefined,
  prefix: string,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix} prompt must be an object`);
    return;
  }
  const text = getNonEmptyString(value.text);
  const englishIntent = getNonEmptyString(value.english_intent);
  if (!text) issues.push(`${prefix} prompt text must be non-empty`);
  if (!englishIntent) issues.push(`${prefix} prompt english_intent must be non-empty`);
  if (value.language !== 'en' && value.language !== 'es-419') {
    issues.push(`${prefix} prompt language must be en or es-419`);
  }
  if (mode === 'english' && value.language !== 'en') {
    issues.push(`${prefix} English mode prompt must use en`);
  }
  if (mode === 'spanish_replay' && value.language !== 'es-419') {
    issues.push(`${prefix} Spanish Replay prompt must use es-419`);
  }
  if (value.audio_asset_path !== undefined) {
    validateAudioPath(value.audio_asset_path, `${prefix} prompt audio_asset_path`, issues);
  }

  if (value.language === 'es-419') {
    validateSpanishApproval(
      value.spanish_approval,
      `${prefix} prompt spanish_approval`,
      text,
      englishIntent,
      issues
    );
    if (
      isRecord(value.spanish_approval) &&
      value.audio_asset_path !== undefined &&
      value.audio_asset_path !== value.spanish_approval.audio_asset_path
    ) {
      issues.push(`${prefix} prompt audio path must match its Spanish approval`);
    }
  } else if (value.spanish_approval !== undefined) {
    issues.push(`${prefix} English prompt must not declare Spanish approval`);
  }
}

function validateCueTargets(
  value: unknown,
  prefix: string,
  visualTargetIds: Set<string>,
  interactionSlotIds: Set<string>,
  issues: string[]
): Set<string> {
  const targets = getBoundedArray(
    value,
    `${prefix} visual_targets`,
    0,
    MAX_VISUAL_TARGETS,
    issues
  );
  const usedTargets = new Set<string>();
  const usedSlots = new Set<string>();
  for (const [index, target] of targets.entries()) {
    const targetPrefix = `${prefix} visual_target ${index}`;
    if (!isRecord(target)) {
      issues.push(`${targetPrefix} must be an object`);
      continue;
    }
    const targetId = validateReference(
      target.target_id,
      visualTargetIds,
      `${targetPrefix} target_id`,
      issues
    );
    const slotId = validateReference(
      target.slot_id,
      interactionSlotIds,
      `${targetPrefix} slot_id`,
      issues
    );
    if (targetId) {
      if (usedTargets.has(targetId)) issues.push(`${targetPrefix} target_id must be unique`);
      usedTargets.add(targetId);
    }
    if (slotId) {
      if (usedSlots.has(slotId)) issues.push(`${targetPrefix} slot_id must be unique`);
      usedSlots.add(slotId);
    }
  }
  return usedTargets;
}

function validateRepeatBoundary(
  value: unknown,
  cue: Record<string, unknown>,
  durationMs: number,
  prefix: string,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix} repeat_boundary must be an object`);
    return;
  }
  validateTimeSpan(
    value.start_ms,
    value.end_ms,
    durationMs,
    `${prefix} repeat_boundary`,
    issues
  );
  if (
    Number.isInteger(value.start_ms) &&
    Number.isInteger(cue.start_ms) &&
    Number(value.start_ms) > Number(cue.start_ms)
  ) {
    issues.push(`${prefix} repeat_boundary must start at or before the cue`);
  }
  if (
    Number.isInteger(value.end_ms) &&
    Number.isInteger(cue.end_ms) &&
    Number(value.end_ms) < Number(cue.end_ms)
  ) {
    issues.push(`${prefix} repeat_boundary must end at or after the cue`);
  }
}

function validateResponsePause(
  cue: Record<string, unknown>,
  cueTargetIds: Set<string>,
  prefix: string,
  issues: string[]
): void {
  if (cue.pauses_playback !== true) {
    issues.push(`${prefix} response_pause must pause playback`);
  }
  if (cue.required_child_action !== 'select_visual_target') {
    issues.push(`${prefix} response_pause requires explicit visual target selection`);
  }
  if (cue.resume_behavior !== 'after_explicit_action') {
    issues.push(`${prefix} response_pause resumes only after explicit child action`);
  }
  if (cueTargetIds.size < 2) {
    issues.push(`${prefix} response_pause must present at least two visual targets`);
  }
  const guidedTargetId = getSafeId(cue.guided_target_id);
  if (!guidedTargetId || !cueTargetIds.has(guidedTargetId)) {
    issues.push(`${prefix} guided_target_id must reference a cue visual target`);
  }
  if (
    !isRecord(cue.repeat_boundary) ||
    cue.repeat_boundary.return_to !== 'paused_cue'
  ) {
    issues.push(`${prefix} response_pause repeat must return to the paused cue`);
  }
  if (cue.timeout_ms !== undefined || cue.auto_resume !== undefined) {
    issues.push(`${prefix} response_pause cannot declare timeout or auto-resume behavior`);
  }
}

function validatePassiveCue(
  cue: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  if (cue.pauses_playback !== false) issues.push(`${prefix} passive cue cannot pause playback`);
  if (cue.required_child_action !== 'none') {
    issues.push(`${prefix} passive cue cannot require child action`);
  }
  if (cue.resume_behavior !== 'continue') {
    issues.push(`${prefix} passive cue resume_behavior must be continue`);
  }
  if (
    !isRecord(cue.repeat_boundary) ||
    cue.repeat_boundary.return_to !== 'resume_playback'
  ) {
    issues.push(`${prefix} passive cue repeat must return to playback`);
  }
  if (cue.guided_target_id !== undefined) {
    issues.push(`${prefix} passive cue cannot declare guided_target_id`);
  }
}

function validateTargetWordReferences(
  value: unknown,
  targetWordIds: Set<string>,
  prefix: string,
  issues: string[]
): void {
  const ids = getBoundedArray(value, `${prefix} target_word_ids`, 1, MAX_TARGET_WORDS, issues);
  const seen = new Set<string>();
  for (const [index, id] of ids.entries()) {
    const resolved = validateReference(
      id,
      targetWordIds,
      `${prefix} target_word_ids ${index}`,
      issues
    );
    if (resolved) {
      if (seen.has(resolved)) issues.push(`${prefix} target_word_ids must be unique`);
      seen.add(resolved);
    }
  }
}

function validateSpanishApproval(
  value: unknown,
  prefix: string,
  expectedSpanishText: string | undefined,
  expectedEnglishIntent: string | undefined,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an approved Spanish review artifact`);
    return;
  }
  const spanishText = getNonEmptyString(value.spanish_text);
  const englishIntent = getNonEmptyString(value.english_intent);
  if (!spanishText || spanishText !== expectedSpanishText) {
    issues.push(`${prefix} spanish_text must match the authored Spanish text`);
  }
  if (!englishIntent || englishIntent !== expectedEnglishIntent) {
    issues.push(`${prefix} english_intent must match the authored English intent`);
  }
  if (value.register !== 'es-419') issues.push(`${prefix} register must be es-419`);
  if (value.pronunciation_review_status !== 'approved') {
    issues.push(`${prefix} pronunciation review must be approved`);
  }
  if (!getNonEmptyString(value.reviewer)) issues.push(`${prefix} reviewer must be non-empty`);
  if (!isIsoTimestamp(value.approved_at)) {
    issues.push(`${prefix} approved_at must be an ISO timestamp`);
  }
  if (!Number.isInteger(value.approval_version) || Number(value.approval_version) < 1) {
    issues.push(`${prefix} approval_version must be a positive integer`);
  }
  validateAudioPath(value.audio_asset_path, `${prefix} audio_asset_path`, issues);
  if (!isSha256(value.audio_sha256)) {
    issues.push(`${prefix} audio_sha256 must be a lowercase SHA-256 digest`);
  }
}

function validateCompletionPage(
  value: unknown,
  prefix: string,
  issues: string[]
): void {
  const pagePrefix = `${prefix} completion_page`;
  if (!isRecord(value)) {
    issues.push(`${pagePrefix} must be an object`);
    return;
  }
  if (value.schema_version !== 1) {
    issues.push(`${pagePrefix} schema_version must be 1`);
  }
  if (!getSafeId(value.id)) issues.push(`${pagePrefix} id must be a safe local id`);
  if (!getNonEmptyString(value.title)) issues.push(`${pagePrefix} title must be non-empty`);
  validateImagePath(value.background_asset_path, `${pagePrefix} background_asset_path`, issues);

  validatePageAssetRegistry(value.scene_variants, `${pagePrefix} scene_variants`, issues);
  const colorIds = validatePageColors(value.colors, pagePrefix, issues);
  validatePageColorTargets(value.color_targets, pagePrefix, colorIds, issues);
  const stickerIds = validatePageAssetRegistry(value.stickers, `${pagePrefix} stickers`, issues);
  const stickerSlotIds = validatePageSlots(
    value.sticker_slots,
    `${pagePrefix} sticker_slots`,
    issues
  );
  validatePageAssetRegistry(value.characters, `${pagePrefix} characters`, issues);
  validatePageSlots(value.character_slots, `${pagePrefix} character_slots`, issues);

  if (
    !Number.isInteger(value.max_stickers) ||
    Number(value.max_stickers) < 1 ||
    Number(value.max_stickers) > MAX_STICKERS_PER_PAGE
  ) {
    issues.push(`${pagePrefix} max_stickers must be an integer from 1 to 2`);
  } else if (
    Number(value.max_stickers) > stickerIds.size ||
    Number(value.max_stickers) > stickerSlotIds.size
  ) {
    issues.push(`${pagePrefix} max_stickers cannot exceed sticker choices or slots`);
  }
}

function validatePageAssetRegistry(
  value: unknown,
  prefix: string,
  issues: string[]
): Set<string> {
  const entries = getBoundedArray(value, prefix, 1, MAX_PAGE_REGISTRY_ITEMS, issues);
  const ids = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const entryPrefix = `${prefix} ${index}`;
    if (!isRecord(entry)) {
      issues.push(`${entryPrefix} must be an object`);
      continue;
    }
    addUniqueId(entry.id, entryPrefix, ids, issues);
    if (!getNonEmptyString(entry.label)) issues.push(`${entryPrefix} label must be non-empty`);
    validateImagePath(entry.asset_path, `${entryPrefix} asset_path`, issues);
  }
  return ids;
}

function validatePageColors(
  value: unknown,
  prefix: string,
  issues: string[]
): Set<string> {
  const entries = getBoundedArray(
    value,
    `${prefix} colors`,
    1,
    MAX_PAGE_REGISTRY_ITEMS,
    issues
  );
  const ids = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const entryPrefix = `${prefix} color ${index}`;
    if (!isRecord(entry)) {
      issues.push(`${entryPrefix} must be an object`);
      continue;
    }
    addUniqueId(entry.id, entryPrefix, ids, issues);
    if (!getNonEmptyString(entry.label)) issues.push(`${entryPrefix} label must be non-empty`);
    if (typeof entry.value !== 'string' || !HEX_COLOR.test(entry.value)) {
      issues.push(`${entryPrefix} value must be a six-digit hex color`);
    }
  }
  return ids;
}

function validatePageColorTargets(
  value: unknown,
  prefix: string,
  colorIds: Set<string>,
  issues: string[]
): void {
  const entries = getBoundedArray(
    value,
    `${prefix} color_targets`,
    1,
    MAX_PAGE_REGISTRY_ITEMS,
    issues
  );
  const ids = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const entryPrefix = `${prefix} color_target ${index}`;
    if (!isRecord(entry)) {
      issues.push(`${entryPrefix} must be an object`);
      continue;
    }
    addUniqueId(entry.id, entryPrefix, ids, issues);
    if (!getNonEmptyString(entry.label)) issues.push(`${entryPrefix} label must be non-empty`);
    const allowedIds = getBoundedArray(
      entry.allowed_color_ids,
      `${entryPrefix} allowed_color_ids`,
      1,
      MAX_PAGE_REGISTRY_ITEMS,
      issues
    );
    const seen = new Set<string>();
    for (const [allowedIndex, allowedId] of allowedIds.entries()) {
      const resolved = validateReference(
        allowedId,
        colorIds,
        `${entryPrefix} allowed_color_ids ${allowedIndex}`,
        issues
      );
      if (resolved) {
        if (seen.has(resolved)) issues.push(`${entryPrefix} allowed_color_ids must be unique`);
        seen.add(resolved);
      }
    }
  }
}

function validatePageSlots(
  value: unknown,
  prefix: string,
  issues: string[]
): Set<string> {
  const entries = getBoundedArray(value, prefix, 1, MAX_PAGE_REGISTRY_ITEMS, issues);
  const ids = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    const entryPrefix = `${prefix} ${index}`;
    if (!isRecord(entry)) {
      issues.push(`${entryPrefix} must be an object`);
      continue;
    }
    addUniqueId(entry.id, entryPrefix, ids, issues);
    if (!getNonEmptyString(entry.label)) issues.push(`${entryPrefix} label must be non-empty`);
  }
  return ids;
}

function validateTimeSpan(
  startValue: unknown,
  endValue: unknown,
  durationMs: number,
  prefix: string,
  issues: string[]
): void {
  if (!Number.isInteger(startValue) || Number(startValue) < 0) {
    issues.push(`${prefix} start_ms must be a non-negative integer`);
  }
  if (!Number.isInteger(endValue) || Number(endValue) <= Number(startValue)) {
    issues.push(`${prefix} end_ms must be an integer after start_ms`);
  }
  if (durationMs > 0 && Number(endValue) > durationMs) {
    issues.push(`${prefix} end_ms must not exceed its mode duration`);
  }
}

function validateImagePath(value: unknown, prefix: string, issues: string[]): void {
  const path = getNonEmptyString(value);
  if (
    !path ||
    !isSafeLocalPath(path, /^\/assets\/images?\//) ||
    !THUMBNAIL_EXTENSION.test(path)
  ) {
    issues.push(`${prefix} must be a safe local image asset`);
  }
}

function validateAudioPath(value: unknown, prefix: string, issues: string[]): void {
  const path = getNonEmptyString(value);
  if (
    !path ||
    !isSafeLocalPath(path, /^\/assets\/audio\//) ||
    !AUDIO_EXTENSION.test(path)
  ) {
    issues.push(`${prefix} must be a safe local audio asset`);
  }
}

function rejectAutomaticPlayback(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  if (value.autoplay === true || value.autoplay_next === true || value.loop === true) {
    issues.push(`${prefix} cannot autoplay, loop, or autoplay the next item`);
  }
}

function addUniqueId(
  value: unknown,
  prefix: string,
  ids: Set<string>,
  issues: string[]
): string | undefined {
  const id = getSafeId(value);
  if (!id) {
    issues.push(`${prefix} id must use lowercase letters, numbers, and hyphens`);
    return undefined;
  }
  if (ids.has(id)) issues.push(`${prefix} id must be unique`);
  else ids.add(id);
  return id;
}

function validateReference(
  value: unknown,
  ids: Set<string>,
  prefix: string,
  issues: string[]
): string | undefined {
  const id = getSafeId(value);
  if (!id || !ids.has(id)) {
    issues.push(`${prefix} must reference a declared id`);
    return undefined;
  }
  return id;
}

function getBoundedArray(
  value: unknown,
  prefix: string,
  minItems: number,
  maxItems: number,
  issues: string[]
): unknown[] {
  if (!Array.isArray(value)) {
    issues.push(`${prefix} must be an array`);
    return [];
  }
  if (value.length < minItems || value.length > maxItems) {
    issues.push(`${prefix} must contain ${minItems} to ${maxItems} items`);
  }
  return value.length > maxItems ? value.slice(0, maxItems) : value;
}

function isSafeLocalPath(path: string, prefix: RegExp): boolean {
  const pathSegments = path.split('/');

  return (
    prefix.test(path) &&
    !/https?:\/\//i.test(path) &&
    !pathSegments.some((segment) => segment === '.' || segment === '..') &&
    !path.includes('\\') &&
    !path.includes('%') &&
    !path.includes('//') &&
    !path.includes('?') &&
    !path.includes('#')
  );
}

function getSupportedMimeType(value: unknown): SupportedVideoMimeType | undefined {
  return value === 'video/mp4' || value === 'video/webm' ? value : undefined;
}

function getStoryMode(value: unknown): BilingualStoryMode | undefined {
  return value === 'english' || value === 'story_bridge' || value === 'spanish_replay'
    ? value
    : undefined;
}

function getSafeId(value: unknown): string | undefined {
  const id = getNonEmptyString(value);
  return id && SAFE_ID.test(id) ? id : undefined;
}

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed === value ? value : undefined;
}

function isSha256(value: unknown): boolean {
  return typeof value === 'string' && SHA256.test(value);
}

function isIsoTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?Z$/.exec(value);
  if (!match) return false;

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day &&
    parsed.getUTCHours() === hour &&
    parsed.getUTCMinutes() === minute &&
    parsed.getUTCSeconds() === second;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResult(issues: string[]): VideoManifestValidation {
  return { valid: false, issues, approved_items: [], playable_videos: [] };
}
