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
`a154a1f1f5bd9a4897e4a188fad570fbdb7b28c23bc352f7f1b7dee7f93b437d`
and binds the shared text, English intent, model source, render settings,
normalization, raw/final hashes, durations, measured loudness, and pending
review state. It also records Maria's pronunciation approval and production
rejection separately. JSON parsing and exact final-file hash checks passed.

The first LM Studio load replaced an idle unrelated Qwen model under local
resource guardrails. No inference was interrupted. After the three samples,
the Spanish checkpoint was unloaded and
`qwen2.5-coder-32b-instruct-abliterated` was restored at context 8192 and
parallel 4. The Orpheus `.env` is restored to `orpheus-3b-ft.gguf`, and its
English-configured decoder is active on loopback port 5005. No cue audio,
review packet, ledger, English Tara artifact, tracked media, or app file changed.
Maria remains rejected. The slower Javi and Sergio candidates remain unselected
and pronunciation-pending.

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
The initial Tara-rendered Spanish cue candidates remain unapproved and must not
be mistaken for multilingual-model output. After visual approval, the
multilingual model produced only the isolated three-voice bakeoff recorded
above; no final target-word or cue path has been rendered or replaced.

### Current Gaps

- Representative Inkscape look review: **approved**. The prior placeholder
  sequence remains rejected.
- Owner review of the corrected six-frame story sequence: **approved for this
  proof** on 2026-07-14. Final synchronized export review remains pending.
- Multilingual Spanish voice bakeoff: **generated**. Maria is rejected for
  production voice identity and pacing despite accepted pronunciation. Slower
  Javi and Sergio review copies await owner voice/pronunciation disposition; no
  candidate is selected implicitly.
- Full multilingual-model rendering and exact owner/fluent review of the 8
  target words and 13 Spanish line artifacts: **pending**. The reviewer identity
  is established; no final Spanish artifact has been approved.
- Owner English narration review: **approved candidate**. Final synchronized
  export review remains pending.
- Final `bilingual_story_proof` storyboard and three-export assembly: blocked by
  Spanish voice selection and the exact Spanish approval records.
- Owner review and manual decision on the final Foundry draft: blocked by final
  assembly.

Gap audit: **NOT DONE**. The proof sequence is approved, but Spanish voice
selection, exact Spanish review, final assembly, and final owner review remain.

## Cold Diff Audit

### Gaps

- Owner voice and pronunciation disposition for the slower Javi and Sergio
  samples are not delivered at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:484`. Maria is rejected,
  and neither remaining candidate may become the final voice by default.
- Full multilingual Spanish rendering and exact line approval are not delivered
  at `docs/work-contracts/issue-113-slice-3-castle-proof.md:488`. Reviewer
  identity is known, but no approval is inferred from that identity.
- Final Foundry assembly, synchronized export review, and manual decision remain
  blocked at `docs/work-contracts/issue-113-slice-3-castle-proof.md:493`.
  Therefore the full Slice 3 gap audit is **NOT DONE**.
- Change without contract trace: none. The branch diff contains the declared
  contract, narrow narration-rule correction, six bounded Inkscape sources,
  four review captures, and their provenance entry.
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
   amendment at line 268 rejects Maria and permits only deterministic slower
   review copies of the two remaining existing takes.
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
15. `docs/work-contracts/issue-113-slice-3-castle-proof.md:318` records the exact
    six-source and capture hashes, structural validation, owner/reviewer status,
    and final-review boundary.
16. `docs/work-contracts/issue-113-slice-3-castle-proof.md:378` records the three
    original bakeoff artifacts, two slower review copies, media measurements,
    review metadata hash, restored local services, and the honest remaining gaps
    at line 478.

### Contract Traceability

- Root cause and real review gap ->
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:9` and the evidence at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:206`.
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
  evidence at line 378. No tracked or cue audio path changed.
- Equal, non-leading paint choices -> source groups at
  `design-source/video-vault/colorless-castle/castle-find-yellow-art-proof.svg:97`
  and the measured result recorded at
  `docs/work-contracts/issue-113-slice-3-castle-proof.md:370`.
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
- Local service restoration passed: the Spanish model was unloaded, the prior
  Qwen identifier/context/parallel settings were restored, the Orpheus `.env`
  again names `orpheus-3b-ft.gguf`, and the English decoder is active on port
  5005. No long-running tool session remains open.
- `npm ci`: passed; 56 locked packages installed, zero vulnerabilities.
- `npm test`: passed after the clean rebase; change-contract check, 58 Content
  Foundry tests with one intentional live skip, 64 Vitest files, and 883/883 app
  tests.
- `npm run typecheck`: passed.
- `npm run build`: passed; Vite transformed 141 modules. The existing
  greater-than-500-kB chunk warning remains.
- `npm run lint --if-present`: completed; no lint script exists.
- `git diff --check`: passed.

This is an interim cold reconstruction, not a completion declaration. Every
current tracked change traces to the written contract, every currently allowed
sequence change is present, and no declared protected surface moved. The audit
must be repeated after voice selection, exact multilingual Spanish review, final
assembly, and the human decision are present.
