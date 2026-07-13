# Change Contract: Emma voice pack

## Root Cause

The games speak through raw device speechSynthesis — robotic, inconsistent
across devices, and unable to guarantee phonics pronunciation. The owner
wants "a real good" voice without any API living in the game (and the
safety contract forbids runtime network services anyway).

## Correct Fix Must Touch

- `src/core/voice-lines.ts` — shared line identity (normalize + FNV-1a id)
  used by runtime, builder, and tests.
- `scripts/voice/collect-voice-lines.ts` — enumerate every packed line from
  live content (activity JSON prompts/feedback, phonics letter-first
  composition, the FULL resolvable Story Stage space via the real resolver,
  cafe character/static lines, system lines).
- `scripts/voice/build-voice-manifest.ts` (vite-node) — writes
  `src/content/voice/emma-voice-manifest.json`.
- `scripts/voice/generate_voice_pack.py` — offline Kokoro bf_emma render
  (prompt 0.92 / story 0.90 / phonics 0.75 per owner listen-approvals) ->
  `public/assets/audio/voice/emma/<id>.mp3`.
- `src/core/voice-pack.ts` — VoicePackSpeech wrapper: packed line -> local
  clip; unpacked/error/autoplay-refusal -> base speech (never silent);
  stop/repeatLast/enabled semantics preserved.
- `src/app/main.ts` — wrap the speech service.
- `src/modules/parent-panel/ParentPanel.ts` — voice picker gains "Emma —
  storyteller (recorded, default)"; 'device' sentinel for device default;
  Test button previews through the pack.
- `src/types/storage.ts` — speech_voice_uri semantics comment.
- Tests: `tests/core/voice-pack.test.ts` (behavior),
  `tests/contract/voice-pack.test.ts` (manifest lockstep with content,
  clip-per-line on disk, ids honest, no external URLs, story coverage).

## Must Not Change

- SpeechServiceInterface shape (modules keep calling speak/stop/repeatLast).
- Activity JSON, event evidence shapes, session-timer behavior.
- Number Train templated lines and cafe fix-feedback quantity/color lines —
  deliberately fall back to device voice this slice; they enter the pack in
  a follow-up that extracts their line builders.
- speech_enabled semantics (Off still silences everything).

## Verification

- `npm test` full gate + `npm run typecheck`.
- Live probe: story narration plays the Emma clip (network tab shows local
  MP3), unpacked train count line falls back to device voice, parent panel
  Test previews Emma, device-voice option bypasses the pack.

## Contract Amendments

(none yet)
