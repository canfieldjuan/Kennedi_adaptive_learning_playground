# Bilingual Story Vault Contract

## Purpose

The Bilingual Story Vault extends the existing Video Vault with short,
parent-approved English and Spanish listening stories. It reuses the Video
Vault's local-media, manual-playback, and exposure-only evidence boundary. It
does not create a second media system, progress system, or voice runtime.

The first proof is a short version of **The Castle Lost Its Colors**. The proof
must establish whether the authored story, pauses, and ownership result fit the
child before a full-length episode is produced.

## Product Boundary

The intended child flow is:

```text
Choose story
-> Play in the parent-selected mode
-> One or two unscored response pauses
-> Story completes
-> Decorate the story page
-> Admire it or add it to the shelf
-> Replay / Shelf / Home
```

- The parent chooses the default language mode. The child is not asked to
  operate a language selector on every play.
- The story is language exposure, listening, and shared attention. Watching or
  tapping inside the story cannot claim vocabulary mastery, transfer, accuracy,
  conversational fluency, or retention.
- The completed page is ownership and closure, not a prize or scored outcome.
- The completed page remains visible until the child chooses Replay, Shelf, or
  Home.

## Existing Boundary

All Video Vault safety and evidence rules remain in force:

- media is repository-bundled, finite, local, and parent approved;
- playback starts manually;
- external media, remote thumbnails, autoplay, loops, and automatic next-story
  playback are forbidden;
- video completion remains `exposure_only`;
- evidence-bearing vocabulary work remains a separate activity or explicit
  parent observation;
- invalid manifests fail closed.

## Manifest Versions

`version` and `schema_version` have different meanings.

- `version` is the content revision. Existing completion events record it, and
  it advances when approved media or narration changes.
- `schema_version` identifies the data shape understood by the loader.
- The discriminated story schema is `schema_version: 3`.
- The already-shipped pre-discriminator manifest with `version: 2` and no
  `schema_version` is the only accepted legacy-v2 shape.
- Legacy-v2 approved videos normalize to `kind: "approved_video"`.
- Unknown or malformed schema versions fail closed. A positive integer alone
  is not proof that the schema is supported.

V3 items form a discriminated union:

```ts
type VideoVaultManifestItem =
  | ApprovedVideoItem
  | BilingualStoryVideoItem;

interface ApprovedVideoItem extends ApprovedVideo {
  kind: "approved_video";
}

interface BilingualStoryVideoItem {
  kind: "bilingual_story";
  // Story-only fields are required here, not optional on ApprovedVideoItem.
}
```

Bear Bakes Bread remains an approved video and does not acquire language modes,
cues, Spanish reviews, or a completion-page definition.

## Story Modes

A v3 bilingual story declares exactly three separately rendered and approved
local exports:

- `english`
- `story_bridge`
- `spanish_replay`

Each export declares a stable media id, safe local video path, supported MIME
type, bounded duration, local source, parent approval, and SHA-256 digest. The
first proof uses duplicated exports intentionally. Runtime synchronization of
one silent visual track with independently loaded narration is deferred.

English mode prompts use `en`. Spanish Replay prompts use `es-419`. Story Bridge
may use either language cue by cue.

## Authored Cues

Every cue declares:

- a stable cue id;
- one story mode;
- integer `start_ms` and `end_ms` within that mode's media duration;
- cue type;
- whether playback pauses;
- required child action;
- authored prompt text, language, and English intent;
- local prompt audio when separately supplied;
- validated visual target and interaction-slot references;
- resume behavior;
- authored repeat start, end, and return state.

Supported cue types are:

- `narration_line`
- `word_exposure`
- `response_pause`
- `scene_transition`
- `completion`

Passive cues do not pause, require no child action, continue playback, and
return to playback after a repeat.

A response pause must:

- pause playback;
- present at least two declared visual targets;
- identify one guided target used only for gentle deterministic guidance;
- require explicit visual-target selection;
- resume only after explicit child action;
- reject timeout and automatic-resume metadata;
- return to the same paused cue after repeating its authored line.

Repeat never seeks backward by an arbitrary duration. Its authored interval
must contain the cue interval and remain within the corresponding media export.
When Repeat is used at a response pause, the line plays and the runtime returns
to that same paused state.

Every mode contains exactly one completion cue and one or two response pauses
in the initial v3 proof contract.

## Visual Targets

Visual target ids are references, not informal strings.

- Every visual target resolves through the story's registry to an approved
  local image asset and stable English/Spanish labels.
- Every interaction slot resolves through the story's slot registry.
- A cue maps each presented target to a declared slot.
- Cue target and slot assignments are unique within that cue.
- Language targets and guided response targets must reference declared visual
  targets.
- Missing targets, missing slots, duplicate ids, unsafe paths, and dangling
  references invalidate the whole manifest.

## Spanish Approval Gate

The approved register is neutral Latin American Spanish, identified as
`es-419`.

Every Spanish target word, phrase, and spoken cue line includes an approval
artifact with:

- exact Spanish text;
- English intent;
- `es-419` register;
- `approved` pronunciation-review status;
- reviewer;
- approval timestamp;
- approval version;
- safe local audio asset path;
- SHA-256 digest of that audio asset.

The approved text and intent must match the authored target or prompt. Blank,
pending, mismatched, remote, unhashed, or unreviewed Spanish material invalidates
the manifest. Production translation may not be improvised by the runtime or
routed through an English-only voice pack.

## Exposure History

`StoryExposureRecord` is versioned, non-evaluative participation history. It
may retain:

- manifest/content revision, story, exact media export, session, and mode ids;
- start and optional completion timestamps;
- encountered cue and target-word ids;
- repeat and replay counts;
- response-pause selections and resume timestamps;
- whether the story completed.

It does not retain correctness, score, accuracy, ranking, mastery, transfer, or
retention claims. The existing `ActivityAttemptEvent` completion adapter remains
compatible and may reference the exposure record in a later runtime slice.

Defining this record does not authorize storage in the manifest slice.

## Ownership Completion

The completion-page definition is a registry of semantic choices:

- scene variants;
- palette colors and colorable targets;
- sticker assets and slots;
- character assets and slots;
- a maximum of two stickers for the initial bounded flow.

Every asset path and id is validated. Color targets reference declared color
ids. The definition supplies the legal choices from which a
`StoryVaultCompletionRecord` can be created.

The versioned completion record stores semantic state:

- story and originating exposure-record ids;
- completion-page and scene ids;
- target-to-color selections;
- sticker-to-slot placements;
- character-to-slot placements;
- creation timestamp.

Semantic state is authoritative. A PNG, canvas bitmap, serialized DOM, or
cached thumbnail cannot be the only saved form. Rendering and revisit must
reconstruct the page from the semantic record.

Persistence is implemented only in the later ownership slice. That slice must:

- keep the most recent 30 completed pages;
- evict the oldest-created record first;
- finish the current save before eviction;
- skip malformed records individually rather than clearing the shelf;
- include valid records in local export and reset behavior;
- preserve an export option before clear;
- keep ownership state completely outside evidence and mastery.

## Resource Bounds

The v3 proof manifest enforces bounded collections:

- at most 8 target words;
- at most 2 target phrases;
- at most 128 cues;
- at most 32 visual targets;
- at most 16 interaction slots;
- at most 32 entries in each completion-page registry;
- one or two stickers on a completed proof page;
- video exports no longer than the existing 300-second Video Vault ceiling.

Content Foundry applies the tighter profile-specific proof limit in a separate
slice. The existing short-clip profile must not inherit bilingual episode
budgets.

## Slice Adoption

1. Manifest slice: contract, types, validation, v2 compatibility, no media and
   no runtime behavior.
2. Foundry proof profile: bounded 45-to-90-second authoring and QA.
3. Castle proof media: three reviewed draft exports, not wired before approval.
4. Runtime slice: manual play, parent-selected mode, authored repeat, explicit
   unscored pauses, exposure records.
5. Ownership slice: semantic decoration, local shelf, revisit, export/reset.
6. Child validation: observe completion, repeats, pauses, decoration, replay,
   and shelf revisit.
7. Full episode decision: expand only if the proof demonstrates fit.

No slice may infer permission to begin the next one merely because its schema
already exists.

## Acceptance Tests

- The real approved-video manifest validates under v3 without bilingual-only
  fields and remains available through the existing runtime adapter.
- An explicit legacy-v2 manifest validates and normalizes to
  `kind: "approved_video"`.
- Unknown schema versions and v3 items without a supported discriminator fail
  closed.
- A complete bilingual-story item validates but is absent from
  `playable_videos` until the runtime slice.
- Missing modes, unsafe media, timing overflow, dangling targets/slots,
  automatic response resumption, arbitrary repeat boundaries, unapproved
  Spanish, and malformed completion registries fail closed.
- No manifest or story field weakens parent approval, local-only media,
  exposure-only evidence, or manual playback.
