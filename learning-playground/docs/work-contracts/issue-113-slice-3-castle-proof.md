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

### Owner-Approved Local Orpheus Narration

The owner identified `/home/juan-canfield/Desktop/voice-bakeoff/orpheus-tara-expressive`
as the Orpheus voice selected for the app, alongside the owner's own recorded
voice. The repository confirms that this is current product behavior rather
than a new voice choice:

- `src/types/storage.ts` and `src/modules/parent-panel/ParentPanel.ts` identify
  Tara as the recorded default voice pack;
- `src/content/voice/tara-voice-manifest.json` identifies the voice as
  `orpheus/tara`; and
- `scripts/voice/generate_voice_pack.py` records the owner-approved local
  LM Studio plus Orpheus recipe and makes the generated static files the only
  runtime artifacts.

This contradicts the stale absolute sentence in
`docs/contracts/content-foundry.contract.md` that generated voice is not part
of v1. The allowed surface therefore expands only to that contract. It must
permit finite owner-approved narration rendered by a local offline voice recipe
and then supplied to Foundry as immutable local audio. It must continue to
forbid runtime TTS, remote audio generation, child voice capture, automatic
approval, and any substitution for fluent review of exact Spanish text and
audio.

For this proof, Tara may render the 22 exact authored lines through the existing
loopback Orpheus recipe. Every resulting WAV must still receive an exact hash,
normalization, cue binding, fluent Spanish pronunciation review, and owner
audio/video disposition. Approval of Tara's general voice quality is not by
itself approval of a new Spanish line.

No app voice-selection code, voice pack, shared voice core, generation script,
runtime asset, dependency, or Content Foundry implementation may change under
this amendment.

### Inkscape Art-Direction Proof Before Sequence Rollout

The owner reviewed the provisional proof and identified the visual artwork as
the remaining quality problem. The narration is not the cause: the exact
English Tara clips are owner-approved candidates and must not be regenerated.
The existing Castle SVG is a technically valid deterministic placeholder, but
it did not follow the repository's established production-art workflow and its
simple symbol composition is below the required story-illustration quality.
Passing media probes did not establish art-direction quality.

The correct fix is one representative Inkscape proof scene before any full
sequence redraw. The tracked change surface expands only to:

- `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg`;
- review-only desktop, mobile, and existing-versus-proposed captures under
  `docs/captures/video/colorless-castle/`;
- a draft entry in `docs/art/asset-provenance.md`; and
- this work contract.

The proof must depict the find-yellow response beat because it tests the
load-bearing visual hierarchy: Finn, the partially restored castle, and three
clearly separated paint choices with yellow as the authored target. It must be
original Category A vector artwork, contain no third-party or generated
production element, use named Inkscape layers, preserve the approved project
ink and palette language, contain no text or remote reference, and render
locally through Inkscape 1.4.4. The source, headless render, desktop-scale
capture, mobile-scale capture, and comparison sheet must all be reviewable.

Only this one scene may be produced before owner look approval. The remaining
five scenes, final story sequence, and all final video exports stay blocked.
The placeholder sequence is rejected for visual quality and must not be
presented as the accepted Castle direction. Spanish-model rendering is paused
until the proof art is accepted; no existing English audio bytes change.

This amendment does not permit a runtime asset, Video Vault integration,
production manifest, new interaction, AI-generated production art, dependency,
public asset, or broad component-library change. The owner must explicitly
approve the proof's illustration style, scene density, character scale, line
weight, palette, contrast, mobile readability, and environmental richness
before the style can roll out to the other scenes.

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

### Rejected Placeholder Visual Sequence

The owner rejected this deterministic, text-free vector candidate because its
SVG artwork quality is below the project standard. It contains
five 8-second scenes and one 10-second scene: faded castle, red door, blue
windows, three-paint response scene, green garden/purple roofs, and
restored-castle celebration. The fourth restoration beat received two extra
seconds so its English and Spanish cues do not overlap.

- source SVG: `8e66cd1a74eb92d161236d1cac6892408b9e242ef0036ac76c3b01a378873c4c`
- scene 0: `8eb066f6da936b73ea26c927fe89c4f8c150170dacdc09dd6813e2eaafb743bf`
- scene 1: `195b3ebf220834140d3d14415f51330530c18bf6a5a459d49b7a8c2f266006d0`
- scene 2: `2b97ab557b78cc4f30bc1c6dec270e233828f1784b1af5c5bbe008dd0fbcc6f3`
- scene 3: `94b3c130bec7b5af0dad92e6b35724423a19d566a7607d2b8e4cbe904d111af1`
- scene 4: `2b0d415ab9b74ea5173320906a8a22e6e129eeedc716bf16a378ffb156f9159d`
- scene 5: `20f1a0a5d2ccae4ee9a4812a08f61c03b0e486771ea4381e1dadd5ea3e929d7d`
- visual review WebM: `9046456d96d7355a8c5bd081f647413498b713684b05bd95501eac9287a32324`

The visual review file is 50.042 seconds, VP9, 960x544, 24 fps, 319,944
bytes, and decodes without ffmpeg errors. It contains no audio and is not a
final bilingual proof export. The owner disposition is **rejected**; it remains
local evidence only and cannot define the Castle art direction.

### Inkscape Art-Direction Proof

The replacement proof stops at one representative find-yellow scene, as
required by the production-art look gate. It is original Category A vector art
with seven named Inkscape layers separating sky, grounds, castle, garden, Finn,
paint choices, and finishing detail. It reuses only the approved project ink and
palette language; no legacy geometry, third-party element, font, generated
production element, or remote resource is embedded.

- editable source:
  `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg`
- source SHA-256:
  `8b782d294b985cd42c757616e78c6c0147262732b99f61b58201a129a11e54d8`
- desktop capture: 960x544, 28,186 bytes,
  `7226f97243ca8e3d8cfec3b8713ebb1f794f0d82d61cb286f0c11df03916f036`
- mobile capture: 390x221, 10,498 bytes,
  `bd7e5799d6aa89efb4812834558994c41c41c711c153b48e82fd21fa9983b332`
- existing-versus-proposed comparison: 1480x428, 31,582 bytes,
  `fcd77539eb9b8f2361c1246905329cd052a6d39dc40c0a48fa8448b54cb99001`

Inkscape 1.4.4 rendered the source at both review sizes. XML and source guards
found no `<text>`, `<image>`, external URL, or base64 content. `paint-red`,
`paint-yellow`, and `paint-green` each occur exactly once. Inkscape geometry
queries report all three target groups as 95x118 with identical vertical
alignment; the correct yellow jar differs by paint color only and is not
pre-highlighted. The provenance ledger records the scene as `draft`, with no
runtime production path and owner look approval pending.

The source and captures are review evidence, not approved story frames. No
other Castle scene, video export, public asset, or runtime surface changed.

### Authorship Packet

`castle-proof-authorship.json` has hash
`3e5ae54605a984a3b21c4abdf199d880c30913041dbaa162f8eea516f758652c`.
It defines exactly eight target words, 6 English cues, 10 Story Bridge cues,
6 Spanish Replay cues, one shared visual response moment, three stable paint
target ids, explicit-child-action-only resume, no timeout, no scoring, and
authored repeat bounds. Splitting mixed-language Story Bridge sentences into
language-pure cues prevents Spanish words from bypassing the Spanish review
gate. `RECORDING.md` lists the 22 required per-line WAV files.

The owner-approved loopback `orpheus/tara` recipe rendered all 22 exact lines.
The local build normalized each result to a finite, nonempty, 48 kHz mono WAV.
A media probe confirmed that every clip ends before both its next authored cue
and its scene boundary. One first render of `spanish-find-yellow` ran for
50.859 seconds and was rejected; its authored line was reduced to the exact
already successful Story Bridge prompt, and the matching reviewed bytes are
used for both cue ids. No pathological output is part of the proof.

`castle-review-packet.json` has hash
`c00eb9511889790ea288b250afedbec25d34896cc1ff36f8204ed21f767c963a`.
It binds 8 target-word records and 13 Spanish line records to their exact audio
hashes, English intent, `es-419` register, and currently pending named-reviewer
fields. `castle-production-ledger.json` has hash
`3cf53cdb6e584327e543e27cd9321dc9e3e7b44aceaaa707f0f0e7604e99754a`
and records the local Tara recipe, source hashes, cue hashes, and review-export
hashes. A guard script refuses to create the Foundry storyboard while any word
or line lacks a named approval or while a reviewed audio hash has changed. The
packet builder preserves an existing approval only while its exact text,
intent, cue binding, and audio hashes remain unchanged; changed review inputs
reset to pending.

Three provisional synchronized review exports were produced from the shared
visual sequence and exact WAVs:

| Mode | Duration | Bytes | SHA-256 |
| --- | ---: | ---: | --- |
| English | 50.008 s | 648,392 | `945df6a3e94e8644fb15a61a6703abf76e84aae457cc40664e17d085d2f20ae8` |
| Story Bridge | 50.008 s | 735,706 | `20202201409b1bfa6852a217c9b3decf0ca3a81d6a80e9164f818569d99e5416` |
| Spanish Replay | 50.008 s | 747,047 | `a70c1fb3fe92e9b0a43154168618953935b5e5eff67357241d1c292d59c0436e` |

Each review export is VP9 plus 48 kHz mono Opus and decodes without ffmpeg
errors. These are local review aids, not Foundry outputs or approved runtime
media. All exact Spanish text and pronunciation remains explicitly pending
fluent review; no line-level approval, Foundry storyboard, Foundry draft, or
final owner disposition has been fabricated.

The owner approved the existing English Tara clips as candidates on
2026-07-13. Those exact English bytes are frozen. The owner also identified
himself as the fluent Spanish reviewer and supplied the local
`orpheus-3b-italian_spanish-ft.gguf` model for a future exact Spanish rerender.
The multilingual model was inspected and briefly loaded, but Spanish generation
was paused before producing a clip when the owner redirected the slice to the
art-quality problem. The current Spanish candidate clips remain unapproved and
must not be mistaken for multilingual-model output.

### Current Gaps

- Owner look review of the single Inkscape find-yellow proof: **pending**. The
  prior placeholder sequence is rejected.
- Multilingual-model rendering and exact owner/fluent review of the 8 target
  words and 13 Spanish line artifacts: **pending**. The reviewer identity is
  established; no new Spanish artifact has been approved.
- Owner English narration review: **approved candidate**. Final synchronized
  export review remains pending.
- Final `bilingual_story_proof` storyboard and three-export assembly: blocked by
  art-direction approval and the exact Spanish approval records.
- Owner review and manual decision on the final Foundry draft: blocked by final
  assembly.

Gap audit: **NOT DONE**. The visual/authorship portion is ready for human input,
but Slice 3 cannot be declared complete under its contract yet.

## Cold Diff Audit

### Gaps

- Owner look approval of the Inkscape proof is not delivered at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:344`; the previous
  placeholder is rejected, and the other five scenes correctly remain unbuilt.
- Multilingual Spanish rendering and exact line approval are not delivered at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:346`. Reviewer identity
  is known, but no approval is inferred from that identity.
- Final Foundry assembly, synchronized export review, and manual decision remain
  blocked at `docs/work-contracts/issue-113-slice-3-castle-proof.md:349`.
  Therefore the full Slice 3 gap audit is **NOT DONE**.
- Change without contract trace: none. The complete branch diff contains the
  work contract, narrow narration-rule correction, one declared Inkscape source,
  its three declared review captures, and its declared provenance entry.
- Protected surface touched: none. No app runtime, Video Vault manifest,
  `public/assets`, voice core, Foundry implementation, learning engine, storage,
  dependency, other PR, or other worktree file moved.

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
4. `docs/work-contracts/issue-113-slice-3-castle-proof.md:131` records the
   repository evidence for Tara, expands only the previously stale narration
   rule, and preserves exact Spanish and owner review gates.
5. `docs/contracts/content-foundry.contract.md:79` permits finite
   owner-approved local generated narration while continuing to forbid runtime
   TTS, remote audio, automatic approval, and unreviewed generated voice.
6. `docs/work-contracts/issue-113-slice-3-castle-proof.md:165` records the actual
   visual root cause and limits the correction to one representative Inkscape
   proof plus review evidence and provenance before sequence rollout.
7. `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:1`
   adds one 960x544 editable local source. Its seven named layers begin at lines
   21, 31, 39, 64, 75, 95, and 114; the equal-geometry target groups are at
   lines 97, 102, and 107.
8. `docs/art/asset-provenance.md:164` records original Category A ownership,
   exact source and capture paths, no third-party or generated production art,
   pending owner look approval, and the explicit no-rollout boundary.
9. The three review-only WebP captures named at
   `docs/art/asset-provenance.md:189` provide desktop, mobile, and
   existing-versus-proposed review evidence. They do not create a runtime asset.
10. `docs/work-contracts/issue-113-slice-3-castle-proof.md:206` records rejected
    model trials, rejected placeholder art, verified narration, the Inkscape
    proof and hashes, reviewer status, and the honest remaining gaps.

### Contract Traceability

- Root cause and real review gap ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:9` and the evidence at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:206`.
- Correct production and review surface ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:25`, with the narrowed
  art correction at `docs/work-contracts/issue-113-slice-3-castle-proof.md:175`.
- Must-not-change boundary ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:61` and the seven-file
  branch diff.
- Owner-approved offline Tara source ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:131` and the narrow
  narration-rule correction at `docs/contracts/content-foundry.contract.md:79`.
- Owner-reported art-quality cause ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:165`; required source,
  captures, and provenance appear at the exact paths declared on lines 178-182.
- Equal, non-leading paint choices -> source groups at
  `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:97`
  and the measured result recorded at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:275`.
- Model quality failed, but the existing Foundry code and workflows behaved
  according to contract; no Foundry implementation change was needed.

### Verification

- Content Foundry status and queue preflight: passed; loopback service ready and
  queue empty before generation.
- Three generated-draft validations: passed with no hash mismatch; all remain
  unapproved local drafts and were rejected visually.
- Authorship JSON parse: `jq empty` passed.
- All 22 narration WAV probes passed: finite, nonempty, 48 kHz mono, within the
  authored scene and next-cue boundaries.
- Visual review media probe: passed; 50.042 seconds, VP9, 960x544, 24 fps,
  319,944 bytes.
- Visual review decode: `ffmpeg -v error ... -f null -` passed with no errors.
- English, Story Bridge, and Spanish Replay review-export probes and full
  decodes passed; each is 50.008 seconds with VP9 video and 48 kHz mono Opus.
- Guarded storyboard builder: correctly refused pending fluent review with
  `castle: exact fluent review is incomplete`.
- Review-packet regeneration guard: approval preservation for unchanged hashes
  and invalidation for changed hashes both passed.
- `xmllint --noout` passed for the Inkscape source.
- Art source guard passed: seven named layers, no text/image/remote/base64
  content, and exactly one red, yellow, and green target id.
- Inkscape geometry queries passed: all three paint groups are 95x118 at the
  same vertical coordinate.
- Inkscape 1.4.4 desktop and mobile renders passed visual inspection; ImageMagick
  reports 960x544, 390x221, and 1480x428 for the two captures and comparison.
- `npm ci`: passed; 56 locked packages installed, zero vulnerabilities.
- `npm test`: passed; change-contract check, 58 Content Foundry tests with one
  intentional live skip, 63 Vitest files, and 862/862 app tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 134 modules. The existing
  greater-than-500-kB chunk warning remains.
- `npm run lint --if-present`: completed; no lint script exists.
- `git diff --check`: passed.

This is an interim cold reconstruction, not a completion declaration. It must
be repeated after art-direction approval, exact multilingual Spanish review,
final assembly, and the human decision are present.
