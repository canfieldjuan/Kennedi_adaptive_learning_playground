# Content Foundry Contract

## Purpose

Content Foundry turns parent-approved activity briefs into local draft media for
human review. It is build-side tooling, never a child-facing runtime or an
automatic content publisher.

## Canonical Workflow Rule

- Versioned API workflow templates under `tools/content-foundry/workflows` are
  the only production graph definitions.
- MCP tools load those templates and may mutate only declared input fields.
- ComfyUI UI workflows are scratch copies and do not control MCP execution.
- Every draft records workflow id/version, model names, prompt, seed, preset,
  source hashes, and output hashes.

## Local and Resource Boundaries

- ComfyUI must use loopback HTTP only.
- Source files must resolve inside the Foundry references or imports roots.
- Drafts stay under `.content-foundry/drafts` until a separate reviewed app
  integration change explicitly moves approved assets.
- Image tools expose only `video_scene` (960x544) and `square_asset`
  (1024x1024) presets with fixed draft/final sampler budgets.
- Wan safe-motion v2 emits one 81-frame, 24fps, 960x544 silent scene per job. It is limited
  to ambient or micro-motion, not evidence-bearing object manipulation.
- Jobs have bounded file sizes, seeds, timeouts, and output counts.
- Storyboard scenes are snapshotted before inspection and assembly. Decoded
  sources are limited to 1920x1080, 2,073,600 pixels, and at most 60 fps for
  video; narration and scene hashes describe the exact snapshots ffmpeg reads.
- ComfyUI uploads use content-addressed names so identical source retries reuse
  the same local input instead of allocating UUID-named copies.

## Media Profiles

- `short_clip` preserves the original assembly contract: 500 ms to 30 seconds,
  at most 6 scenes, at most 12 narration cues, a 300-second render timeout, a
  64 MiB output ceiling, and an 8-frame 4-by-2 contact sheet.
- `bilingual_story_proof` is a separate 45-to-90-second authoring profile: at
  most 12 shared scenes, at most 24 narration cues per mode, a 900-second render
  timeout, a 128 MiB ceiling for each mode export, and a 12-frame 4-by-3 contact
  sheet.
- The proof emits exactly three local exports from the same snapshotted scene
  sequence: English, Story Bridge, and Spanish Replay. Each export receives
  independent codec, duration, size, loudness, and peak QA.
- English mode uses only `en`; Spanish Replay uses only `es-419`; Story Bridge
  contains both. Cue ids are stable and globally unique across the proof.
- Every Spanish cue must carry an approved `es-419` review record identifying
  exact Spanish text, English intent, reviewer, timestamp, approval version,
  and the SHA-256 hash of the exact snapshotted local audio.
- One shared contact sheet is sufficient because all three exports use the same
  scene snapshots. Source and output hashes, profile limits, mode provenance,
  contact-sheet density, Spanish review results, and media QA live in the local
  review-required draft.
- Unknown profiles fail closed. `bilingual_story_episode` is not implemented.

## Draft and Approval Boundary

- Every generated artifact starts with `status: draft` and
  `requires_parent_visual_review: true`.
- MCP exposes generation and validation only. It must not expose approval,
  publication, catalog mutation, or child-asset copying.
- Parent approval is a manual CLI action that records reviewer, timestamp,
  notes, and content hashes inside the local draft.
- Approval does not publish. Child integration remains a separate pull request.

## Illustrated Scene Rules

- The production preset targets the existing Bear/Pip storybook language.
- Flux Redux provides reference guidance; explicit masks control edits; optional
  Canny guidance may preserve structure.
- Generated text, letters, numerals, logos, brands, and watermarks are invalid
  instructional content. Required text must be rendered deterministically.
- Motion drafts must provide a contact sheet for geometry and continuity review.

## Narration Rules

- Human narration is the v1 production default.
- Source audio is local, finite, and parent supplied.
- Final narration is 48kHz mono, near -18 LUFS, with true peak no higher than
  -2 dBTP. Final clips are finite VP9/Opus WebM within the selected profile's
  duration and file-size bounds.
- No child recording, microphone permission, generated voice, or remote audio
  service is part of v1.

## Non-Scope

- No child-facing AI, backend, auth, cloud sync, open web content, automatic
  activity creation, automatic approval, automatic routing, rewards, streaks,
  rankings, new game modules, or broad child-app refactor.
- No generated asset enters `public/assets`, an activity catalog, or a video
  manifest through Foundry tooling.

## Verification

- Dependency-free unit tests cover graph mutation, references, guards, paths,
  draft state, approval separation, and malformed ComfyUI responses.
- Media tests cover clean decode, dimensions, duration, codecs, loudness,
  posters, contact sheets, and hashes.
- Live ComfyUI node/model compatibility checks are opt-in through
  `CONTENT_FOUNDRY_LIVE=1`; CI never requires ComfyUI, models, or a GPU.
