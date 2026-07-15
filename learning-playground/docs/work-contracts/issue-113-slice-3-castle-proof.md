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

### Owner Look Approval and Bounded Sequence Rollout

The owner approved the representative Inkscape proof on 2026-07-13 ("those work
for me chief"). This satisfies the look gate for illustration style, density,
character scale, line weight, palette, contrast, mobile readability, and
environmental richness. It does not approve final video or runtime use.

The tracked art surface may now expand only to five additional editable SVGs
beside the approved find-yellow source and one six-frame review contact sheet
under `docs/captures/video/colorless-castle/`. Each scene must preserve the
approved castle construction, Finn construction, ink, palette, 960x544 canvas,
named Inkscape layers, no-text/no-remote boundary, and authored story order:

1. colorless castle invitation;
2. red door restoration;
3. blue window restoration;
4. approved find-yellow response scene, unchanged;
5. green garden and purple roof restoration; and
6. fully restored celebration.

The five new scenes may change pose, framing emphasis, and visible restoration
state only to carry those beats. They must not add narration, response targets,
runtime interaction, evidence, or story duration. Every source must pass XML,
Inkscape render, local-resource, layer, and visual continuity checks before the
ignored local review videos are rebuilt. Final Foundry assembly remains blocked
by multilingual Spanish approval and final owner audio/video review.

The first complete contact-sheet review found one state-continuity defect: the
look-approved find-yellow proof already colored the garden and roofs, leaving
the following authored restoration beat with no visible transformation. Look
approval governs the illustration language, not an incorrect story state. The
allowed correction therefore expands narrowly to desaturating the unchanged
garden and roof geometry in scenes one through four while preserving scene
four's approved composition, scale, line work, target geometry, and hierarchy.
Scenes five and six alone reveal the green garden and purple roofs. The contact
sheet also showed scene-five and scene-six foreground panels reading like open
books; those panels must be removed in favor of scenery and non-object ribbons.
No other approved-proof geometry or story behavior may change.

### Owner Sequence Approval and Spanish Voice Bakeoff

The owner reviewed the corrected six-frame contact sheet on 2026-07-14 and
approved the sequence as "good enough for now." This clears the bounded visual
sequence gate for the ignored Castle proof. It does not approve a final video,
runtime asset, public asset, or future episode artwork without another review.

Spanish production may now begin with one isolated voice bakeoff. The same
authored line, `¿Dónde está la pintura amarilla?`, must be rendered once with
each voice exposed by the supplied multilingual Orpheus model: `javi`, `sergio`,
and `maria`. The three finite local WAVs and their review metadata must remain
under ignored `.content-foundry/imports/castle-content-proof/spanish-voice-bakeoff/`.
They must not overwrite any existing cue, review packet, ledger, or English Tara
artifact. All three samples must use the same text, model, render settings, and
normalization target so the owner can compare the voices rather than different
production recipes.

No full Spanish cue render may begin until the owner explicitly selects an
eligible sample. Voice selection alone does not approve pronunciation: every
final target word and line remains subject to exact text, audio-hash, and fluent
review before storyboard assembly. This amendment does not permit a runtime
voice selector, model dependency, remote service, shared voice-core change, or
automatic review decision.

The first owner listening pass rejected `maria` for production voice identity
and pacing: pronunciation was good, but the sample sounded masculine and too
fast. That partial pronunciation approval does not select the voice. Maria must
not be rerendered or promoted in this bakeoff. Because the Javi and Sergio takes
are shorter than the rejected Maria take, the allowed review surface expands
only to deterministic slower copies of their existing raw WAVs using the repo's
established child-facing Orpheus `atempo=0.85` rule followed by the same
normalization target. No new model inference, new text, Maria variant, cue
replacement, or final voice selection is permitted by this amendment.

On 2026-07-15, the owner selected `sergio-slow.wav` as the recipe reference for
the full Spanish review render. This authorizes rendering the 13 exact Spanish
cue artifacts with the supplied multilingual checkpoint, `sergio` voice, the
recorded generation settings, `atempo=0.85`, and the shared normalization target.
The two cue ids containing the already-rendered find-yellow sentence must reuse
the selected take's exact normalized bytes rather than introduce a stochastic
second reading. The eight target-word reviews continue to cite the hash-bound cue
artifacts that contain those words; this slice must not invent separate word
clips. Selection authorizes review rendering only. It does not approve any new
line, target-word record, synchronized export, storyboard, or runtime asset.
Every exact artifact remains pending until the named fluent reviewer records its
text and pronunciation disposition, and the pre-existing English Orpheus model
and unrelated LM Studio workload must be restored after the bounded render.
Generated review artifacts must use measured two-pass normalization against the
shared `I=-18:TP=-3:LRA=7` target and must measure between -21 and -16 LUFS with
a true peak no higher than -3 dBTP before owner review. The selected find-yellow
sample remains byte-exact at its measured -19.4 LUFS. A line outside those
bounds is a rejected review artifact, not evidence that may be approved. The
generated lines may use one shared bounded speech-compression preconditioner
before two-pass normalization so an isolated transient cannot suppress the
whole narration line; the selected sample must remain unmodified.

On 2026-07-15, after receiving the no-autoplay review index for manifest
`e2683c6f7ddc3f7a06585a0d0d5378e00d46b3063bcf8d3891523f488cd29061`,
the owner and named fluent reviewer responded **Approved**. That disposition
approves the exact text, pronunciation, pacing, and voice quality of all 13
hash-bound Sergio WAVs and the eight target-word mappings in that manifest. It
does not approve a future rerender or any synchronized video. The approved
manifest must record reviewer `Juan Canfield`, an approval timestamp, and one
approval version while retaining the reviewed audio and source hashes.

This approval authorizes copying only those exact 13 WAV bytes into their
authored cue paths, rebuilding the review packet and production ledger, passing
the existing exact-hash storyboard guard, and assembling the three local proof
exports. The packet builder must import approval only when text, intent,
register, cue bindings, and hashes still match; any mismatch must remain pending
or fail. Final synchronized exports and the Foundry draft still require a
separate owner audio/visual disposition before Slice 3 can be complete.

The first approved-storyboard assembly attempt proved a local packet-builder
path defect: it stripped the `castle-content-proof/` namespace from scene and
narration paths that Foundry resolves relative to the imports root. Foundry
correctly rejected the missing `rsvg-scene-00.png` before draft creation. The
fix surface expands only to the ignored Castle storyboard builder, which must
preserve the already-authored import-root-relative paths. Shared Foundry path
resolution, validation, and assembly code must remain unchanged.

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

### Inkscape Art-Direction Proof and Sequence

The owner approved the representative find-yellow look on 2026-07-13. That
approval unlocked only the five additional editable story scenes and one
six-frame contact sheet defined above. All six sources are original Category A
vector art, reuse only the approved project ink and palette language, and retain
seven named Inkscape layers. No legacy geometry, third-party element, font,
generated production element, or remote resource is embedded.

Editable source SHA-256 values:

| Story beat | Editable source | SHA-256 |
| --- | --- | --- |
| Colorless invitation | `castle-scene-01-colorless.svg` | `5ef5d8fe4a8d4393cbbc82a91b7cc3bd74b38d1e603c1576b7cd0581b3bb8495` |
| Red door | `castle-scene-02-red-door.svg` | `bcea32a693f1a1bc55c70f1beed2322f8fcf53bcb8ab32486499304c46d2978f` |
| Blue windows | `castle-scene-03-blue-windows.svg` | `359a6b5eee16a38f0ad6464f5e0bc9dd2091b44b9933442f19983a45beb68fab` |
| Find yellow | `castle-find-yellow-art-proof.svg` | `6592af21ee78e0fb405aa7287d402744601aa1a3b4a0f173157e9a5ed820892a` |
| Green garden and purple roofs | `castle-scene-05-garden-roofs.svg` | `d33e5b3fe62aece80afe841e64ab28e7fb7876eb01d80ab0db7afa4fc1fc9900` |
| Celebration | `castle-scene-06-celebration.svg` | `088eddf59f026083dbc8680783c23b35a6f8a81a9d578e543204c7b70de92c62` |

Review evidence:

- desktop find-yellow capture: 960x544, 27,864 bytes,
  `e4f0d34fb68756818b2f028bb521008ff8e3d582b0eb670aaf04dcb471f15abb`
- mobile find-yellow capture: 390x221, 9,976 bytes,
  `f7afba77e2173b07c02e105363b6f29be1532f939d535e1ca99baddde9f0ef53`
- existing-versus-proposed comparison: 1480x428, 31,112 bytes,
  `7fff0d210563fae6cf584d992cee09c8fff563f21f621b923eb7638cf630e4d5`
- six-frame sequence contact sheet: 1476x568, 79,424 bytes,
  `cb4e4994965ca980f91d4d376f5e91f53e90dc1dd8a89e615b5be81056cf9f92`

The first full contact sheet exposed two continuity defects. Garden and roof
colors appeared in the find-yellow scene before their authored restoration
beat, and the final two foreground panels resembled open books. The corrected
sources retain the approved composition and geometry while keeping the garden
and roofs muted through scene four, revealing them in scene five, and using
direct garden/ribbon scenery without the false book forms.

Inkscape 1.4.4 rendered every source at 960x544. XML and source guards found
exactly seven named layers per source and no `<text>`, `<image>`, `href`,
external URL, or base64 content. `paint-red`, `paint-yellow`, and `paint-green`
remain unique to the response scene. Inkscape geometry queries report all three
target groups as 95x118 at y=419.5; the correct yellow jar differs by paint
color only and is not pre-highlighted.

The sources and captures are proof-sequence-approved review evidence, not
approved video, runtime media, or public assets. The owner approved the corrected
six-frame story sequence on 2026-07-14; final synchronized export review remains
required.

### Multilingual Spanish Voice Bakeoff

After the owner approved the six-frame proof sequence, the supplied local
`orpheus-3b-italian_spanish-ft.gguf` model rendered the same authored line,
`¿Dónde está la pintura amarilla?`, once with each Spanish voice. Every sample
was normalized with `loudnorm=I=-18:TP=-3:LRA=7` to 48 kHz mono PCM and remains
inside ignored `spanish-voice-bakeoff/`:

| Voice | Duration | Integrated loudness | True peak | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `javi` | 1.450667 s | -18.5 LUFS | -3.0 dBTP | `dcbd7df0918839f511dfa673048dbc83de829e79a04922d0b6eb86f28e34262d` |
| `sergio` | 1.706667 s | -19.5 LUFS | -3.0 dBTP | `eb29d17067f5f4bd8be61e60071397286d8bff6329965d23606ff14a386096e6` |
| `maria` | 2.133333 s | -19.1 LUFS | -3.0 dBTP | `4a7cc59c5f48fee92d71679780b5b7e7b23c2efc571218d24fadbecbc1d7e705` |

The owner's first listening pass accepted Maria's pronunciation but rejected
the sample's masculine voice identity and fast pacing. Maria is not a production
candidate. Deterministic `atempo=0.85` review copies were derived from the
existing Javi and Sergio raw WAVs, then normalized with the same target:

| Voice | Duration | Integrated loudness | True peak | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `javi-slow` | 1.682125 s | -18.2 LUFS | -3.0 dBTP | `371f730a97430f13eb37bfe02d9bb2f62b459171cbb3537e2a4d5c47d5e641c7` |
| `sergio-slow` | 1.992500 s | -19.4 LUFS | -3.0 dBTP | `ee79165b1d28ee8c6fa30c73c013880ff743bc739f528c5d7fc54057a565fb65` |

No second model inference occurred. Both slower variants retain the exact
original take and text while changing only playback tempo and normalization.

`review-metadata.json` has SHA-256
`29e4c4a4d2a87229b94a7e0c21f81040f8f470f311a8fe540c5cd27185dfd111`
and binds the shared text, English intent, model source, render settings,
normalization, raw/final hashes, durations, measured loudness, Maria's separate
pronunciation/rejection dispositions, and Sergio's owner-selected review-render
recipe. Exact line approval remains separate. JSON parsing and exact final-file
hash checks passed.

The first LM Studio load replaced an idle unrelated Qwen model under local
resource guardrails. No inference was interrupted. After the three samples,
the Spanish checkpoint was unloaded and
`qwen2.5-coder-32b-instruct-abliterated` was restored at context 8192 and
parallel 4. The Orpheus `.env` is restored to `orpheus-3b-ft.gguf`, and its
English-configured decoder is active on loopback port 5005. No cue audio,
review packet, ledger, English Tara artifact, tracked media, or app file changed.
Maria remains rejected, Javi remains unselected, and Sergio is selected only as
the full-line review-render recipe. Exact Spanish artifact review remains pending.

### Sergio Full-Line Spanish Review Render

The owner selected `sergio-slow.wav` on 2026-07-15. The bounded renderer used
the supplied multilingual checkpoint and existing raw model results to create 13
separate ignored review WAVs under `spanish-sergio-review/`. The two
find-yellow cue ids reuse the selected sample's exact bytes and SHA-256. The
other 11 cues use `sergio`, `atempo=0.85`, one shared bounded speech compressor,
and measured two-pass `loudnorm=I=-18:TP=-3:LRA=7` normalization:

| Cue | Duration | Loudness | True peak | SHA-256 |
| --- | ---: | ---: | ---: | --- |
| `bridge-castle-name` | 1.587 s | -18.01 LUFS | -4.25 dBTP | `1eba6f09e900609fbe0c828dd351fdccedf454a3c624fd75eb9c52a806ef5df3` |
| `bridge-door-red` | 2.195 s | -18.00 LUFS | -4.12 dBTP | `de83773f5755c868d01783d3afe57d763bb27878338f3208f287406b47b09cae` |
| `bridge-blue-word` | 0.691 s | -19.50 LUFS | -3.00 dBTP | `3604b7acd644b681d52fdd2619ffecb35695c06e8436c0b0713c107d4a782a28` |
| `bridge-find-yellow` | 1.992 s | -19.37 LUFS | -3.00 dBTP | `ee79165b1d28ee8c6fa30c73c013880ff743bc739f528c5d7fc54057a565fb65` |
| `bridge-yellow-word` | 1.378 s | -18.69 LUFS | -3.00 dBTP | `95b04de7ba5eea742f8a9ae88eb3b1da44d31eae6fd45635d7609119792d4c9c` |
| `bridge-green-purple-es` | 1.090 s | -18.01 LUFS | -5.89 dBTP | `f1f6a1c1b08b1877bfead3a8cead4f68c49cd565bc58b466865a3f7a7a5bb597` |
| `bridge-castle-restored` | 3.498 s | -18.19 LUFS | -3.10 dBTP | `92d15a56b1e5fc49bb20db08cb1e615fccbc1e03c789c6664f9b9b9c750d9dd2` |
| `spanish-castle-faded` | 6.908 s | -18.02 LUFS | -6.69 dBTP | `b9adccbe7f8545b78382d40cc5a0c266ecff09c8cd8dbf09962fde616e89dd91` |
| `spanish-door-red` | 2.898 s | -18.71 LUFS | -3.00 dBTP | `f47b0460dbdc9307be0d3051be6d95ad6100406111cf0a3394e5dbd7fde7ef95` |
| `spanish-windows-blue` | 2.803 s | -20.18 LUFS | -3.00 dBTP | `4330796559c1c37f8571631e66e80d8354ca040fbcc39985705b56af5c1e2f0a` |
| `spanish-find-yellow` | 1.992 s | -19.37 LUFS | -3.00 dBTP | `ee79165b1d28ee8c6fa30c73c013880ff743bc739f528c5d7fc54057a565fb65` |
| `spanish-green-purple` | 4.797 s | -17.99 LUFS | -3.00 dBTP | `022dbdb5a2180eaa4eff72955cd56e1f07ee92ea3c5e16e68a6dd1aad6aaa7cd` |
| `spanish-castle-restored` | 4.106 s | -18.14 LUFS | -3.00 dBTP | `e46aac0c194c9e13fe314c6e38a2b39f5df6b35e6a438a1a7d9a43c2ba37996d` |

The first post-render measurement rejected `spanish-windows-blue` at -23.29
LUFS. Reprocessing the already-rendered raw files with the contract's shared
compressor and two-pass normalization fixed the set without another model call.
All final artifacts decode as finite 48 kHz mono PCM, remain inside their next
cue and scene boundaries, measure from -20.18 to -17.99 LUFS, and peak at or
below -3 dBTP.

`render-sergio-spanish-review.py` has SHA-256
`6e5bfae195735d98b0d81dda1e26d1901468e71775915ab7ddb1d182818b9934`.
It reuses hash-bound raw outputs, refuses a changed selected sample, validates
the 13-cue and 8-word cardinalities, and rejects format, timing, loudness, peak,
or missing-word-evidence failures. `review-manifest.json` has SHA-256
`e2683c6f7ddc3f7a06585a0d0d5378e00d46b3063bcf8d3891523f488cd29061`
and binds every final artifact to its raw source hash, exact Spanish text,
English intent, `es-419` register, media measurements, target-word evidence,
and pending review fields. `REVIEW.md` has SHA-256
`87611fc6354229c979b549be5e4fe152e11f9bf832ea7c955093afcf8b49a5f0`
and provides a no-autoplay human review index.

No pre-existing cue WAV, review packet, production ledger, synchronized export,
tracked media, public asset, or app file changed. After rendering, the Spanish
checkpoint was unloaded, Qwen remained at context 8192 and parallel 4, the
unchanged `.env` still names `orpheus-3b-ft.gguf`, and the detached
English-configured Orpheus service was restored on loopback port 5005.

### Exact Spanish Approval and Foundry Draft

The owner's **Approved** disposition was applied only to pre-approval manifest
`e2683c6f7ddc3f7a06585a0d0d5378e00d46b3063bcf8d3891523f488cd29061`.
The approved manifest has SHA-256
`e9afbb3b1422ef4f57be51f1856cb60815d37f1502fa5045f0ccb97c66edd295`
and records `Juan Canfield`, `2026-07-15T19:26:26Z`, approval version
`castle-sergio-review-v1`, 13 approved pronunciation records, and eight approved
target-word records while retaining every reviewed audio and source hash.

`approve-and-promote-sergio-review.py` has SHA-256
`d7aef165c8b7c3fc5ae28ae9fb5a366ffd1ff70c8a8bdcf467d167f63c9e5ff2`.
It verifies the exact pending-manifest hash, cardinalities, artifact bytes,
target-word cue bindings, and evidence hashes before writing approval and
copying the same 13 bytes into authored cue paths. A second run preserved the
approved-manifest hash and promoted hashes. A changed Spanish sentence caused
the packet import to fail with `approved review mismatch in spanish_text`; the
exact approved manifest was restored before subsequent work.

The rebuilt `castle-review-packet.json` has SHA-256
`e1db64327c94a8e53d9708c78cd3b736c891d559fc66a7555c324cc6c16665cf`.
It contains 13 approved Spanish line records, eight approved target-word
records, separate Tara and Sergio recipes, and the exact approved manifest hash.
The local packet builder has SHA-256
`9d90b3ccdb60029b4dd277d597b2beef7975891a1fb5742f5ca54e4e8a7af434`.

The first assembly validation rejected the semantically UTC but contract-invalid
`+00:00` timestamp form. The approval recorder normalized every record to the
required `Z` form. The next attempt proved the ignored Castle storyboard builder
had stripped the required `castle-content-proof/` import namespace. Foundry
rejected the first missing scene before creating a draft. The local builder was
corrected without changing shared Foundry code; its SHA-256 is
`21dc1476d336c7ef87e94f71b98ee4e764201e8a6fd1a5dd8e749c31dabf058d`.
The approved storyboard has SHA-256
`17e2f8f488b6fd023299715f35718a1c84eddf408e0cf6ad35fffde982f4bc8a`
and preserves all authored import-root-relative paths.

Foundry then created ignored draft
`draft-0cd7d01b-dae1-4802-a2bf-571dd0b2dfbb`. Its `draft.json` has SHA-256
`d542577f7f25811054e9f59390fdce3f958bf11885c44726f79339cb55863f59`:

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| English | 594,810 | `d792e69c66e6df961e68ba491cbb1bab4247cc18435d3bdad0a9ad125b8b167d` |
| Story Bridge | 628,350 | `39a18efdc1c64a915399f784465abb0461530b751abe9c8ca4c241cbd9499113` |
| Spanish Replay | 642,531 | `63f8437c4f60578c5238eb06101dc47a46297a0e8ce79b8716a3dd6c10592fe4` |
| Poster | 170,929 | `6741bef88a12307cd7d153cef4ef6ca0a8d0a6d5f53783863e47406303da4767` |
| Contact sheet | 122,814 | `3f9725072b32d459605342c9ed701b1c479b1b29d1414cd4588b9d6067956f4e` |

Draft validation passed with no hash mismatch. All three 50.008-second exports
decode as 960x544 VP9 plus 48 kHz mono Opus. English measures -17.98 LUFS and
-2.83 dBTP; Story Bridge measures -17.98 LUFS and -2.81 dBTP; Spanish Replay
measures -17.99 LUFS and -2.79 dBTP. The bilingual-proof QA, 13-cue Spanish
approval check, poster, and 12-sample contact sheet all pass. Cold visual review
of the 1000x440 contact sheet preserved the approved six-beat sequence.

The bound production ledger has SHA-256
`1d4406021b5fc738bd0234833507eaddf9bf20e1c4182be6c98b20326a410f65`.
It records the draft and five exact outputs while leaving owner audio/visual
review pending. `FINAL_REVIEW.md` has SHA-256
`74b1c5e64cc1d9dbd18a996ea71fde91eb6c136a79c91caee5397d65cd735563`
and provides a no-autoplay index. The draft remains local, ignored, unpublished,
unintegrated, and `approval: null`.

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

At that provisional stage, `castle-review-packet.json` had hash
`c00eb9511889790ea288b250afedbec25d34896cc1ff36f8204ed21f767c963a`.
It binds 8 target-word records and 13 Spanish line records to their exact audio
hashes, English intent, `es-419` register, and then-pending named-reviewer
fields. At that stage, `castle-production-ledger.json` had hash
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
errors. These were local review aids, not Foundry outputs or approved runtime
media. At that stage, all exact Spanish text and pronunciation remained pending
fluent review; no line-level approval, Foundry storyboard, Foundry draft, or
final owner disposition was fabricated. The later exact approval and resulting
Foundry draft are recorded above without retroactively treating these
provisional exports as final outputs.

The owner approved the existing English Tara clips as candidates on
2026-07-13. Those exact English bytes are frozen. The owner also identified
himself as the fluent Spanish reviewer and supplied the local
`orpheus-3b-italian_spanish-ft.gguf` model for the exact Spanish review render.
The initial Tara-rendered Spanish cue candidates remain unapproved and must not
be mistaken for multilingual-model output. After visual approval, the
multilingual model produced the isolated bakeoff and selected Sergio review set
recorded above. At that staging checkpoint, no pre-existing target-word or cue
path had been replaced; the later exact-byte promotion is recorded at line 530.

### Current Gaps

- Representative Inkscape look review: **approved**. The prior placeholder
  sequence remains rejected.
- Owner review of the corrected six-frame story sequence: **approved for this
  proof** on 2026-07-14. Final synchronized export review remains pending.
- Multilingual Spanish voice bakeoff: **selected**. Maria is rejected, Javi is
  unselected, and Sergio at 85% tempo is the explicit review-render recipe.
- Full multilingual-model rendering of the 13 Spanish cue artifacts and their 8
  target-word evidence mappings: **approved** at exact text and audio hashes by
  the named fluent reviewer.
- Owner English narration review: **approved candidate**. Final synchronized
  export review remains pending.
- Final `bilingual_story_proof` storyboard and three-export assembly:
  **generated and machine-validated** as a local review-required draft.
- Owner review and manual decision on the exact final Foundry draft: **pending**.

Gap audit: **NOT DONE**. Content, exact Spanish review, and final assembly are
delivered. Owner audio/visual review and the manual draft decision remain.

## Cold Diff Audit

### Gaps

- Owner audio/visual review and the manual decision for exact draft
  `draft-0cd7d01b-dae1-4802-a2bf-571dd0b2dfbb` remain pending at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:658`. The approved
  Spanish artifacts and machine-validated assembly do not approve the
  synchronized result. Therefore the full Slice 3 gap audit is **NOT DONE**.
- Change without contract trace: none. The branch diff contains the declared
  contract, narrow narration-rule correction, six bounded Inkscape sources,
  four review captures, and their provenance entry. The Spanish WAVs, local
  approval and packet builders, manifests, final draft, and review indices remain
  ignored local execution evidence as required by the draft-only boundary.
- Protected surface touched: none. No app runtime, Video Vault manifest,
  `public/assets`, voice core, Foundry implementation, learning engine, storage,
  dependency, other branch, or other worktree file moved.

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
7. `docs/work-contracts/issue-113-slice-3-castle-proof.md:206` records the
   owner's representative-look approval, authorizes exactly five more sources
   and one contact sheet, and declares the continuity correction found during
   cold visual review at line 233.
8. `docs/work-contracts/issue-113-slice-3-castle-proof.md:245` records the
   owner's bounded sequence approval and permits only an isolated, equal-recipe
   three-voice Spanish bakeoff before explicit voice selection. The review
   amendment at line 269 rejects Maria and permits only deterministic slower
   review copies of the two remaining existing takes. The amendment at line 279
   selects Sergio for a review render while preserving exact artifact approval;
   lines 301-316 bind the owner's approval to one exact manifest and preserve a
   separate synchronized-export review gate.
9. `design-source/video-vault/colorless-castle/castle-scene-01-colorless.svg:31`
   creates the muted invitation state, with the closed paint case at line 95;
   `castle-scene-02-red-door.svg:43` preserves muted roofs while revealing the
   red door and its bounded paint supply at line 95; and
   `castle-scene-03-blue-windows.svg:43` keeps the same roof state while adding
   blue windows and the bounded blue supply at line 95.
10. `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:31`
   now keeps the garden and roofs muted through the response beat. Its equal
   red, yellow, and green target groups remain at lines 97, 102, and 107.
11. `design-source/video-vault/colorless-castle/castle-scene-05-garden-roofs.svg:32`
    reveals the green grounds and the purple roofs at line 43, then uses direct
    garden scenery rather than a book-like panel at line 95.
12. `design-source/video-vault/colorless-castle/castle-scene-06-celebration.svg:75`
    changes Finn to the celebration pose and places ribbons and stars directly
    over the scene without a foreground panel at line 93.
13. `docs/art/asset-provenance.md:164` records original Category A ownership,
    all six exact source paths, Inkscape/ImageMagick tools, look approval, review
    captures, and the explicit no-runtime boundary through line 193.
14. The four review-only WebP captures named at
    `docs/art/asset-provenance.md:189` provide desktop, mobile,
    existing-versus-proposed, and six-frame sequence evidence. They do not
    create a runtime asset.
15. `docs/work-contracts/issue-113-slice-3-castle-proof.md:375` records the exact
    six-source and capture hashes, structural validation, owner/reviewer status,
    and final-review boundary.
16. `docs/work-contracts/issue-113-slice-3-castle-proof.md:425` records the three
    original bakeoff artifacts, two slower review copies, media measurements,
    review metadata hash, and bounded recipe selection.
17. `docs/work-contracts/issue-113-slice-3-castle-proof.md:470` records the 13
    exact Sergio review artifacts, selected-sample byte reuse, loudness defect
    and correction, pre-approval review manifest, source hashes, and restored
    local services.
18. `docs/work-contracts/issue-113-slice-3-castle-proof.md:520` records the exact
    Spanish approval manifest, idempotent promotion guard, mismatch rejection,
    timestamp and path validation failures, corrected local storyboard, final
    draft id, five output hashes, media QA, and the still-pending owner decision.

### Contract Traceability

- Root cause and real review gap ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:9` and the evidence at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:520`.
- Correct production and review surface ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:25`, with the narrowed
  proof at line 175 and approved sequence boundary at line 206.
- Must-not-change boundary ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:61`; the diff changes no
  runtime, public asset, app module, dependency, or learning-system file.
- Owner-approved offline Tara source ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:131` and the narrow
  narration-rule correction at `docs/contracts/content-foundry.contract.md:79`.
- Owner-reported art-quality cause ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:165`; the approved look
  and bounded rollout are recorded at line 206.
- Story-state continuity -> the contract correction at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:233` appears in muted
  scene-four grounds/roofs at
  `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:31`
  and restored scene-five grounds/roofs at
  `design-source/video-vault/colorless-castle/castle-scene-05-garden-roofs.svg:32`.
- Equal-recipe Spanish voice comparison -> contract boundary at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:245` and exact artifact
  evidence at line 425. No tracked audio path changed.
- Owner-selected full Spanish review render -> bounded contract at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:279` and exact execution
  evidence at line 470.
- Exact Spanish approval -> hash-bound contract at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:301` and approved packet
  evidence at line 520. A changed sentence fails import, and approval does not
  extend to rerenders or synchronized video.
- Final local three-mode assembly -> output and QA evidence at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:557`; the draft remains
  local, ignored, unintegrated, and unapproved at line 581.
- Equal, non-leading paint choices -> source groups at
  `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:97`
  and the measured result recorded at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:388`.
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
- `xmllint --noout` passed for all six Inkscape sources.
- Art source guards passed: every source is 960x544 with seven named layers and
  no text, image, href, remote, or base64 content; the response source alone has
  exactly one red, yellow, and green target id.
- Inkscape geometry queries passed: all three paint groups are 95x118 at the
  same y=419.5 coordinate.
- Inkscape 1.4.4 rendered all six scenes. The corrected sequence passed worker
  visual continuity review, including the mobile response frame and removal of
  both book-like foreground panels.
- ImageMagick reports 960x544, 390x221, 1480x428, and 1476x568 for the desktop,
  mobile, comparison, and sequence contact-sheet captures.
- Spanish bakeoff validation passed: all three samples use the same exact text
  and multilingual model, parse as finite 48 kHz mono PCM, retain exact hashes,
  peak at -3.0 dBTP, and match the ignored review metadata.
- Slower-candidate validation passed: Javi and Sergio derive from their original
  raw samples with only `atempo=0.85` plus the shared normalization, remain
  finite 48 kHz mono PCM, retain exact hashes, and match the review metadata.
- Sergio review-render validation passed: exactly 13 artifacts and 8 target-word
  mappings are hash-bound to exact text, intent, register, raw sources, and media
  measurements. Both find-yellow cues retain the selected sample's exact
  SHA-256.
- Every Sergio review artifact decodes as 48 kHz mono PCM, ends before its next
  cue and scene boundary, measures between -20.18 and -17.99 LUFS, and peaks at
  or below -3 dBTP. The rejected -23.29 LUFS intermediate is not in the packet.
- Local service restoration passed: the Spanish model was unloaded, the prior
  Qwen identifier/context/parallel settings were restored, the Orpheus `.env`
  again names `orpheus-3b-ft.gguf`, and the English decoder is active on port
  5005. No long-running tool session remains open.
- Exact approval promotion passed: 13 line records and 8 target-word mappings
  retain their reviewed hashes, reviewer, `Z` timestamp, and approval version.
  A second run preserved the approved manifest and promoted output hashes.
- Approval mismatch guard passed: changing one approved Spanish sentence caused
  packet import to fail; restoring the exact manifest restored the valid packet.
- Timestamp and path guards passed by rejection: Foundry refused the invalid
  `+00:00` approval timestamp and then the missing import-root scene path before
  creating any draft. The corrected local inputs use `Z` and preserve the
  `castle-content-proof/` namespace; shared Foundry code did not change.
- Final Foundry assembly and `validate-draft` passed for
  `draft-0cd7d01b-dae1-4802-a2bf-571dd0b2dfbb` with zero hash mismatches and the
  parent visual-review requirement intact.
- All three final 50.008-second WebM outputs fully decode as 960x544 VP9 plus
  48 kHz mono Opus. Their measured loudness is -17.99 to -17.98 LUFS and their
  true peaks are no higher than -2.79 dBTP.
- Final poster and 12-sample contact-sheet generation passed. Cold visual review
  of the 1000x440 contact sheet preserves the approved six-beat sequence.
- `npm ci`: passed; 56 locked packages installed, zero vulnerabilities.
- `npm test`: passed on the current owned checkout; change-contract check, 58 Content
  Foundry tests with one intentional live skip, 64 Vitest files, and 884/884 app
  tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 141 modules. The existing
  greater-than-500-kB chunk warning remains.
- `npm run lint --if-present`: completed; no lint script exists.
- `git diff --check`: passed.

This is an interim cold reconstruction, not a completion declaration. Every
current tracked change traces to the written contract, every currently allowed
content and assembly change is present, and no declared protected surface
moved. The audit must be repeated only after the owner reviews the three exact
synchronized exports and records the manual draft decision.
