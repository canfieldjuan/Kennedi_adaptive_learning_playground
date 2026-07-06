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
  items: ApprovedVideo[];
}

export interface ApprovedVideo {
  id: string;
  title: string;
  path: string;
  duration_seconds: number;
  source: 'local';
  approved_by_parent: true;
  thumbnail_path?: string;
}
