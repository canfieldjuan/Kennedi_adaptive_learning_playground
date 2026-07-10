/**
 * Video Vault — local, parent-approved media only.
 */

export interface VideoVaultConfig {
  manifest: VideoVaultManifest;
}

export interface VideoVaultManifest {
  id: string;
  version: number;
  title: string;
  description?: string;
  intake_mode: 'repo_bundled';
  parent_imports_supported: false;
  approved_by_parent: true;
  evidence_role: 'exposure_only';
  items: ApprovedVideo[];
}

export type SupportedVideoMimeType = 'video/mp4' | 'video/webm';

export interface ApprovedVideo {
  id: string;
  title: string;
  path: string;
  duration_seconds: number;
  mime_type: SupportedVideoMimeType;
  evidence_role: 'exposure_only';
  source: 'local';
  approved_by_parent: true;
  thumbnail_path?: string;
}
