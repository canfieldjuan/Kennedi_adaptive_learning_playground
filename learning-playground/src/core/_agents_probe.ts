// Temporary probe used to verify automated-reviewer steering via AGENTS.md.
// Not wired into the app. Safe to delete; this PR is not meant to merge.

export function clampProbe(value: number, max: number): number {
  return value > max ? max : value;
}

// Re-push to re-trigger the automated reviewer on this PR.
export const PROBE_REVISION = 2;
