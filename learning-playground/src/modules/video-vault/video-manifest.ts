import type {
  ApprovedVideo,
  SupportedVideoMimeType,
  VideoVaultManifest,
} from './video-vault.types';

export interface VideoManifestValidation {
  valid: boolean;
  issues: string[];
  playable_videos: ApprovedVideo[];
}

const MAX_VIDEO_DURATION_SECONDS = 300;
const VIDEO_EXTENSIONS: Record<SupportedVideoMimeType, RegExp> = {
  'video/mp4': /\.mp4$/i,
  'video/webm': /\.webm$/i,
};
const THUMBNAIL_EXTENSION = /\.(?:jpe?g|png|webp|svg)$/i;

export function validateVideoManifest(
  value: unknown,
  expectedManifestId?: string
): VideoManifestValidation {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return invalidResult(['manifest must be an object']);
  }

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
  if (!Array.isArray(value.items)) {
    issues.push('manifest items must be an array');
    return invalidResult(issues);
  }

  const itemIds = new Set<string>();
  const itemPaths = new Set<string>();

  for (const [index, item] of value.items.entries()) {
    validateVideoItem(item, index, issues, itemIds, itemPaths);
  }

  if (issues.length > 0) return invalidResult(issues);

  const manifest = value as unknown as VideoVaultManifest;
  return {
    valid: true,
    issues: [],
    playable_videos: manifest.items,
  };
}

function validateVideoItem(
  value: unknown,
  index: number,
  issues: string[],
  itemIds: Set<string>,
  itemPaths: Set<string>
): void {
  const prefix = `item ${index}`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object`);
    return;
  }

  const id = getNonEmptyString(value.id);
  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    issues.push(`${prefix} id must use lowercase letters, numbers, and hyphens`);
  } else if (itemIds.has(id)) {
    issues.push(`${prefix} id must be unique`);
  } else {
    itemIds.add(id);
  }

  if (!getNonEmptyString(value.title)) {
    issues.push(`${prefix} title must be a non-empty string`);
  }

  const path = getNonEmptyString(value.path);
  const mimeType = getSupportedMimeType(value.mime_type);
  if (!path || !isSafeLocalPath(path, /^\/assets\/videos?\//)) {
    issues.push(`${prefix} path must be a safe local video asset`);
  } else {
    if (itemPaths.has(path)) {
      issues.push(`${prefix} path must be unique`);
    } else {
      itemPaths.add(path);
    }
    if (mimeType && !VIDEO_EXTENSIONS[mimeType].test(path)) {
      issues.push(`${prefix} path extension must match mime_type`);
    }
  }

  if (!mimeType) {
    issues.push(`${prefix} mime_type must be video/mp4 or video/webm`);
  }
  if (
    !Number.isInteger(value.duration_seconds) ||
    Number(value.duration_seconds) < 1 ||
    Number(value.duration_seconds) > MAX_VIDEO_DURATION_SECONDS
  ) {
    issues.push(`${prefix} duration_seconds must be an integer from 1 to 300`);
  }
  if (value.source !== 'local') {
    issues.push(`${prefix} source must be local`);
  }
  if (value.approved_by_parent !== true) {
    issues.push(`${prefix} must be approved by a parent`);
  }
  if (value.evidence_role !== 'exposure_only') {
    issues.push(`${prefix} evidence_role must be exposure_only`);
  }

  if (value.thumbnail_path !== undefined) {
    const thumbnailPath = getNonEmptyString(value.thumbnail_path);
    if (
      !thumbnailPath ||
      !isSafeLocalPath(thumbnailPath, /^\/assets\/images?\//) ||
      !THUMBNAIL_EXTENSION.test(thumbnailPath)
    ) {
      issues.push(`${prefix} thumbnail_path must be a safe local image asset`);
    }
  }

  if (value.autoplay === true || value.autoplay_next === true || value.loop === true) {
    issues.push(`${prefix} cannot autoplay, loop, or autoplay the next item`);
  }
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

function getNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed === value ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidResult(issues: string[]): VideoManifestValidation {
  return { valid: false, issues, playable_videos: [] };
}
