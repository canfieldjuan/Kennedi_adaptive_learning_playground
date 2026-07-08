// Throwaway probe for the on-main reviewer-steering test. Not wired into the
// app; this PR is not meant to merge.

export function firstNonEmpty(values: string[]): string {
  for (const value of values) {
    if (value) return value;
  }
  return values[0];
}
