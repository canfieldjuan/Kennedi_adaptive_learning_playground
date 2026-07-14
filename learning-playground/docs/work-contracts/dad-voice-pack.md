# Change Contract: Dad voice pack (owner's cloned voice, third pack)

## Root Cause

The owner wants his own voice in the games — the strongest
personalization the playground can offer (Child Principle #1 adjacent:
ownership). Chatterbox (MIT) clones from a 31s owner-recorded reference.

## Correct Fix Must Touch

- `scripts/voice/generate_voice_pack.py` — dad backend (chatterbox,
  venv-chatterbox): prompt exagg 0.55 / story 0.40 + atempo 0.96 /
  phonics 0.45, cfg 0.3; phonics respell map (owner variant A: "buh" ->
  "buhh", comma-chains -> hard stops, "b-b-b" -> "buh buh buh").
- `scripts/voice/build-voice-manifest.ts` — emit the dad manifest.
- `src/app/main.ts` + `ParentPanel.ts` — third pack registered; picker
  gains "Dad — recorded at home"; Tara stays default.
- `src/types/storage.ts` comment; contract test PACKS list + dad.
- New assets: public/assets/audio/voice/dad/ (471 clips) + manifest.

## Must Not Change

- Tara/Emma packs and the default; line enumeration; fail-open behavior.
- The reference recording NEVER enters the repo.

## Verification

- Full gate (three-pack lockstep + clip sweeps) + typecheck.
- Live probe: voice-pack:dad plays /voice/dad/ clips.

## Decision Record

- Public shipping of the cloned-voice clips: owner-approved explicitly
  ("Ship it public", 2026-07-13) after the tradeoff was surfaced.
