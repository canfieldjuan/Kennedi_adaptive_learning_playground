# Change Contract: Tara voice pack (Orpheus) as default, Emma retained

## Root Cause

The owner ran a second voice bakeoff (Orpheus via LM Studio vs the shipped
Kokoro Emma) and picked the expressive Orpheus tara samples — Orpheus
supports emotion tags (<giggle>, <gasp>) that Kokoro cannot produce, which
matters most for the storytelling game.

## Correct Fix Must Touch

- `scripts/voice/generate_voice_pack.py` — two-pack generator (--pack
  emma|tara): kokoro backend unchanged; Orpheus backend via the local
  Orpheus-FastAPI decoder; curated performance map (5 story openings get
  <gasp>, 3 celebration lines get <giggle>); phonics atempo (no speed
  param in Orpheus), owner-tunable.
- `scripts/voice/build-voice-manifest.ts` — emits BOTH pack manifests from
  the single line enumeration.
- `src/core/voice-pack.ts` — multi-pack VoicePackSpeech (pack registry,
  first pack = default, voice-pack:<name> URIs select).
- `src/app/main.ts` + `ParentPanel.ts` — tara default, Emma selectable,
  preview through both packs.
- `src/types/storage.ts` — setting semantics comment.
- Tests: multi-pack unit test; contract test parameterized over both packs.
- New assets: public/assets/audio/voice/tara/ (471 clips) + tara manifest.

## Must Not Change

- The line enumeration (identical for both packs), clip id scheme, emma
  clips, fail-open behavior, speech_enabled semantics.

## Verification

- Full gate (801 tests incl. both-pack lockstep + clip-per-line sweeps).
- Live probe: default voice plays /voice/tara/ clips; voice-pack:emma
  plays /voice/emma/; device option bypasses.

## Contract Amendments

- Phonics pacing: rendered at provisional atempo 0.85; the owner has
  pacing samples (~/Desktop/voice-bakeoff/tara-phonics-pacing) — final
  pick re-processes 24 clips via
  `generate_voice_pack.py --pack tara --styles phonics --phonics-tempo <t>`.
