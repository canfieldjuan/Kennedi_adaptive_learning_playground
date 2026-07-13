/**
 * Voice-line identity — shared by the runtime voice pack, the manifest
 * builder script, and the contract tests, so a spoken string always maps to
 * the same clip id everywhere.
 *
 * A line's id is a hash of its NORMALIZED text: whitespace collapsed and
 * trimmed, case preserved (Emma's delivery of "B" vs "b" differs, so case is
 * part of identity). The pack is keyed by id; any string that hashes to a
 * missing id simply falls back to the device voice.
 */

export type VoiceLineStyle = 'prompt' | 'phonics' | 'story';

export interface VoiceLineEntry {
  id: string;
  text: string;
  style: VoiceLineStyle;
}

export interface VoiceManifest {
  /** Pack identity, matches the asset folder under /assets/audio/voice/. */
  pack: string;
  voice: string;
  lines: VoiceLineEntry[];
}

export function normalizeVoiceLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** FNV-1a 32-bit over the normalized text, as 8 hex chars. */
export function voiceLineId(text: string): string {
  const normalized = normalizeVoiceLine(text);
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
