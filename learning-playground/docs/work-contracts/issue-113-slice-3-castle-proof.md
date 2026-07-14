# Issue #113 Slice 3: The Castle Lost Its Colors Content Proof

This slice produces one bounded, local Castle proof for human review. It uses
the existing `bilingual_story_proof` profile and keeps every output outside the
child runtime until separate approval and integration work.

## Before Production

### Root Cause

The repository now defines the bilingual story manifest and has a working
Content Foundry profile that can assemble three independently narrated exports
from one shared visual sequence. It still has no actual Castle content packet
or assembled proof. Consequently, the project cannot review the visual story,
language balance, authored response moments, narration quality, or the fit of a
45-to-90-second proof before investing in runtime integration.

The missing capability is content evidence, not another media architecture.
The existing assembler already owns duration, scene, cue, file-size, codec,
loudness, true-peak, hashing, provenance, contact-sheet, and draft-state
boundaries. Slice 3 must exercise those boundaries with real local inputs and
human review. It must not bypass either review by treating machine QA, generated
audio, or an automated translation as approval.

### Correct Fix Must Touch

- This work contract must define the content and review standard before any
  production input or output is created, then record the exact run, hashes,
  QA, human dispositions, blockers, and cold audit.
- Ignored `.content-foundry/imports/castle-content-proof/` must contain one
  bounded authored source packet:
  - one 45-to-90-second shared visual sequence using at most 12 local scenes;
  - an English narration track, a Story Bridge track containing English and
    `es-419`, and a Spanish Replay track containing only `es-419`;
  - stable narration cue ids and local finite WAV inputs;
  - no more than eight target words;
  - one or two authored, unscored response moments with stable visual target
    ids, explicit-child-action semantics, and authored repeat boundaries;
  - exact neutral Latin American Spanish text and English intent tied to fluent
    pronunciation-review records and SHA-256 hashes of the reviewed audio;
  - a storyboard accepted by the existing `bilingual_story_proof` validator;
  - a local production ledger naming source origin, prompts or construction
    method, seeds where applicable, and source hashes.
- The existing Content Foundry CLI must assemble that packet into exactly one
  ignored `.content-foundry/drafts/` record containing English, Story Bridge,
  and Spanish Replay WebM exports from the same scene snapshots, plus poster,
  contact sheet, independent mode QA, source/output hashes, and
  `requires_parent_visual_review: true`.
- A fluent reviewer must approve every Spanish line and exact audio artifact.
  Automated translation, model output, or this worker's judgment cannot stand
  in for that reviewer.
- The owner must review the visual sequence and all three audio/video exports.
  Approval or rejection must be recorded through the existing manual decision
  boundary; machine QA cannot stand in for owner review.
- The proof must remain a local draft. The tracked diff may record the contract
  and non-binary execution evidence, but it must not contain generated media.
- If the live run proves an implementation defect in the existing Foundry,
  amend this contract before touching only the responsible Foundry module,
  contract, and focused tests. A model-quality problem is not a code defect.

### Must Not Change

- Video Vault manifest types, validators, catalog, routes, runtime player,
  controls, exposure records, evidence adapter, or approved media.
- `public/assets`, activity JSON, child UI, parent UI, games, shared voice core,
  voice packs, speech services, or narration playback.
- Content Foundry profile limits, approval semantics, draft schema, workflow
  templates, ComfyUI installation, models, nodes, or configuration unless a
  reproducible production run first proves a defect and this contract is
  amended.
- Story ownership persistence, shelf, completion-page runtime, export/reset,
  local app storage, activity events, curriculum, progress, evidence, mastery,
  transfer, recommendations, difficulty, or parent approval rules.
- Backend, auth, accounts, cloud sync, open web input, remote media, public
  sharing, AI tutor chat, generated child voice, rewards, streaks,
  leaderboards, autoplay, looping, automatic next-story playback, scored
  response moments, a full episode profile, dependency versions, broad
  refactors, unrelated formatting, PR #116, or any concurrent worktree.

### Content Standard

- Working title: **The Castle Lost Its Colors**.
- Proof duration: 45 to 90 seconds.
- Shared story beats: invitation, color restoration, one or two response
  moments, visible completed castle, calm ending.
- Target vocabulary is concrete, visible, and limited to eight or fewer items.
- Response moments invite a visual choice and resume only after explicit child
  action in the later runtime. They are authored here but are not made playable
  in this slice.
- The three exports use the same visual sequence. Language support changes by
  mode; the story action and timing do not.
- No generated text, letters, numerals, logo, watermark, frightening imagery,
  unsafe motion, or evidence-bearing object manipulation may appear.

### Assumptions / Blockers

- The current proof profile and separate-export approach are sufficient; no
  synchronized multi-track runtime is required.
- Static illustrated scenes are acceptable for the proof. Any Wan motion used
  must remain optional ambient micro-motion and pass the existing visual
  continuity review.
- ComfyUI is installed locally but was not running when this contract was
  written. A generation run must first confirm loopback availability and an
  idle shared queue.
- No Castle narration or fluent Spanish approval artifact was found in the
  owned worktree before production. The worker may prepare visuals, English
  intent, timing, and draft scripts, but it must not mark Spanish or owner
  review complete without the actual reviewers and exact audio hashes.
- The slice remains **NOT DONE** while either fluent Spanish review or owner
  visual/audio review is pending.

### Verification Plan

- validate local inputs and exact source hashes
- run the existing bilingual proof assembly CLI
- validate the resulting draft and every recorded output hash
- decode all three WebM exports with `ffmpeg`
- inspect the 12-frame contact sheet and each full export
- verify mode duration, dimensions, codecs, loudness, true peak, and size
- confirm all Spanish approvals match exact text, intent, reviewer metadata,
  and snapshotted WAV hashes
- confirm the draft remains ignored, local, unpublished, and absent from every
  Video Vault/app surface
- after any tracked changes: `npm test`, `npm run typecheck`, `npm run build`,
  `npm run lint --if-present`, `npm run check:work-contract`, and
  `git diff --check`
- cold-read the tracked diff and local execution record against this contract

## Contract Amendments

Record any scope change before touching the newly required surface.

## Production Evidence

### Live Authoring Preflight

- ComfyUI 0.25.0 started on loopback `http://127.0.0.1:8188` with an
  NVIDIA RTX 3090 and RTX 4060 Ti available.
- `foundry.py status` reported both finite profiles and the four canonical
  workflows. `/queue` reported no running or pending job before generation.
- The service was stopped after the bounded runs; no queued job was abandoned.

### Generated Image Trials

Three bounded canonical workflow drafts passed dimensions and hash validation
but were rejected by worker visual review:

| Draft | Workflow | Output hash | Disposition |
| --- | --- | --- | --- |
| `draft-e6edec8a-171b-4d5c-bc2e-b3d01bd38a81` | Flux Redux, seed `2026071301`, strength `0.8` | `32d670de25196c0795fc51e9af1608bb21d7ee240dbca351ec9cd7af35595c2a` | Reject: Finn is coherent, but the castle is too small and the unrelated music box survived. |
| `draft-d9f41527-082e-44df-8a3d-cac30ead9b54` | Flux Redux, seed `2026071302`, strength `0.45` | `868af80ed63fe39aa5bac45c23182387b0543b7f587b62420e5f98e66440e420` | Reject: stronger castle composition, but the music box remained and the requested paint jars were absent. |
| `draft-a8c55af9-6f62-446d-b1d3-fd454037e096` | Flux inpaint, seed `2026071303` | `e919660dc58582a0ee0b330f984b00e31a027e4a6c2ffc935048c8cf3d8e9c6a` | Reject: five jars and a table replaced the requested three jars, and fake handwriting appeared. |

All three records remain local drafts with `approval: null`, parent visual
review required, and no hash mismatch. No rejected output is in the Castle
sequence. These are model-quality failures, so no Foundry code or workflow was
changed.

### Shared Visual Sequence

The accepted worker-review candidate uses deterministic, text-free vector art
derived from the existing Finn and moon-castle visual language. It contains six
8-second scenes: faded castle, red door, blue windows, three-paint response
scene, green garden/purple roofs, and restored-castle celebration.

- source SVG: `8e66cd1a74eb92d161236d1cac6892408b9e242ef0036ac76c3b01a378873c4c`
- scene 0: `8eb066f6da936b73ea26c927fe89c4f8c150170dacdc09dd6813e2eaafb743bf`
- scene 1: `195b3ebf220834140d3d14415f51330530c18bf6a5a459d49b7a8c2f266006d0`
- scene 2: `2b97ab557b78cc4f30bc1c6dec270e233828f1784b1af5c5bbe008dd0fbcc6f3`
- scene 3: `94b3c130bec7b5af0dad92e6b35724423a19d566a7607d2b8e4cbe904d111af1`
- scene 4: `2b0d415ab9b74ea5173320906a8a22e6e129eeedc716bf16a378ffb156f9159d`
- scene 5: `20f1a0a5d2ccae4ee9a4812a08f61c03b0e486771ea4381e1dadd5ea3e929d7d`
- visual review WebM: `52a924c8e581077e766e217872eafecfbcd05d218d2473fb983ec8592ceeadf3`

The visual review file is 48.042 seconds, VP9, 960x544, 24 fps, 356,061
bytes, and decodes without ffmpeg errors. It contains no audio and is not a
final bilingual proof export. Owner visual disposition is pending.

### Authorship Packet

`castle-proof-authorship.json` has hash
`deb086e59d8f21b1c1a59ecb98cef1e14782fbe584f164afb88985fe8e78fa80`.
It defines exactly eight target words, six cues per mode, one shared visual
response moment, three stable paint target ids, explicit-child-action-only
resume, no timeout, no scoring, and authored repeat bounds. `RECORDING.md`
lists the 18 required per-line WAV files.

All Spanish text and mixed-language pronunciation remains explicitly
`pending_fluent_review`. No Castle WAV was present, so no exact audio hash,
fluent approval artifact, Foundry storyboard, three-mode assembly, or owner
audio disposition has been fabricated.

### Current Gaps

- Fluent Spanish text/pronunciation review: **pending**.
- Exact 48 kHz mono human WAV recordings and Spanish audio hashes: **pending**.
- Final `bilingual_story_proof` storyboard and three-export assembly: blocked by
  those exact audio artifacts.
- Owner visual review of the candidate sequence: **pending**.
- Owner audio/video review and manual draft decision: blocked by final assembly.

Gap audit: **NOT DONE**. The visual/authorship portion is ready for human input,
but Slice 3 cannot be declared complete under its contract yet.

## Cold Diff Audit

### Gaps

- Contract requirements not delivered: exact human narration, fluent Spanish
  approval, final three-mode assembly, owner review, and manual decision remain
  open at lines 193-203. This is why the gap audit is **NOT DONE**.
- Change without contract trace: none. The tracked diff contains only this work
  contract; the generated inputs, rejected drafts, and visual review candidate
  remain under the contractually ignored `.content-foundry/` root.
- Protected surface touched: none. `git status --short` reports no Video Vault,
  app runtime, public asset, voice core, learning engine, storage, dependency,
  other PR, or other worktree file.

### Change By Change Reconstruction

1. `docs/work-contracts/issue-113-slice-3-castle-proof.md:9` states that the
   missing object is reviewable Castle content, not another media system.
2. `docs/work-contracts/issue-113-slice-3-castle-proof.md:25` defines the local
   source packet, exact three-export assembly, Spanish and owner approval gates,
   draft-only boundary, and the only permitted response to a proven Foundry
   defect.
3. `docs/work-contracts/issue-113-slice-3-castle-proof.md:61` protects every app,
   learning, runtime, voice, persistence, infrastructure, dependency, and
   concurrent-work surface this production slice does not require.
4. `docs/work-contracts/issue-113-slice-3-castle-proof.md:135` records the live
   loopback preflight, three machine-valid but visually rejected model drafts,
   accepted worker-review vector candidate and hashes, authorship packet, exact
   pending human inputs, and honest NOT DONE state.

### Contract Traceability

- Root cause and real review gap -> lines 9-23 and the evidence at lines 133-203.
- Correct production and review surface -> lines 25-59 and the ignored local
  packet recorded at lines 159-191.
- Must-not-change boundary -> lines 61-78 and the one-file tracked status.
- No contract amendment was required: model quality failed, but the existing
  Foundry code and workflows behaved according to contract.

### Verification

- Content Foundry status and queue preflight: passed; loopback service ready and
  queue empty before generation.
- Three generated-draft validations: passed with no hash mismatch; all remain
  unapproved local drafts and were rejected visually.
- Authorship JSON parse: `jq empty` passed.
- Visual review media probe: passed; 48.042 seconds, VP9, 960x544, 24 fps,
  356,061 bytes.
- Visual review decode: `ffmpeg -v error ... -f null -` passed with no errors.
- `npm ci`: passed; 56 locked packages installed, zero vulnerabilities.
- `npm test`: passed; change-contract check, 58 Content Foundry tests with one
  intentional live skip, 62 Vitest files, and 848/848 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 132 modules. The existing
  greater-than-500-kB chunk warning remains.
- `npm run lint --if-present`: completed; no lint script exists.
- `git diff --check`: passed.

This is an interim cold reconstruction, not a completion declaration. It must
be repeated after the exact reviewed audio, final assembly, and human decision
are present.
