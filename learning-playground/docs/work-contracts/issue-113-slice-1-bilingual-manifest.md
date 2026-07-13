# Issue #113 Slice 1: Bilingual Story Manifest Contract

This slice defines the versioned data boundary for bilingual stories inside the
existing Video Vault. It adds no media and activates no bilingual story runtime.

## Before Code

### Root Cause

The current Video Vault manifest has one undifferentiated item shape. Its
validator treats every item as a legacy local video and accepts any positive
`version`, so the data boundary cannot distinguish a supported schema from an
unknown future shape. It cannot represent three approved language exports,
authored cue and repeat boundaries, explicit child-controlled response pauses,
reviewed Spanish narration, validated visual targets, or the semantic
definition of a story completion page.

The existing `version` value is also load-bearing content provenance: video
completion events record it and the narration contract requires it to advance
when approved media changes. Reusing that field as a schema discriminator would
erase the distinction between schema compatibility and content revision.

Without an explicit discriminated and validated schema, later runtime or media
work would either make legacy fields broadly optional, accept malformed story
metadata, or duplicate the established local-media safety and exposure-only
evidence boundary.

### Correct Fix Must Touch

- `docs/contracts/bilingual-story-vault.contract.md` (new) must define:
  - the relationship between the existing Video Vault and bilingual stories;
  - separate schema and content version semantics;
  - the discriminated v3 item union and explicit legacy-v2 compatibility;
  - three local story modes and their approved media exports;
  - exact cue, visual-target, explicit-resume, and authored-repeat semantics;
  - the `es-419` narration approval artifact and local asset/hash rules;
  - separate non-evaluative exposure and semantic completion records;
  - completion-page registries and referential integrity;
  - the no-runtime/no-media boundary for this slice.
- `src/modules/video-vault/video-vault.types.ts` must add:
  - a legacy-v2 manifest type and a v3 discriminated manifest type;
  - `kind: "approved_video" | "bilingual_story"` item variants without
    optionalizing the legacy approved-video contract;
  - story-mode, cue, visual-target, Spanish-approval, exposure-record,
    completion-page-definition, and completion-record types;
  - a v3 `schema_version` separate from the existing content `version`.
- `src/modules/video-vault/video-manifest.ts` must:
  - accept only the explicitly supported legacy-v2 and v3 schema shapes;
  - normalize legacy approved videos into the discriminated item model;
  - preserve `playable_videos` as the existing runtime adapter;
  - expose validated normalized items for later slices without rendering them;
  - validate local media/image/audio paths, IDs, references, time bounds,
    required modes, explicit response actions, repeat boundaries, Spanish
    approvals, and semantic completion-page registries;
  - fail the whole manifest closed when any item or reference is invalid.
- `src/content/videos/family-safe-videos.v1.json` must migrate the current
  approved Bear Bakes Bread item to v3 using `schema_version: 3` and
  `kind: "approved_video"`, while retaining its content `version`, media,
  approval, response handoff, and every current runtime behavior.
- `tests/modules/video-vault.test.ts` must prove the migrated real manifest
  remains playable and that an explicit legacy-v2 fixture remains compatible.
- `tests/modules/bilingual-story-manifest.test.ts` (new) must prove a complete
  v3 bilingual story shape passes and probe both sides of the schema, cue,
  reference, timing, approval, path, and no-autoresume boundaries.
- This work contract must be completed with a cold diff audit and exact
  verification results before the slice is called done.

### Must Not Change

- `src/modules/video-vault/VideoVault.ts` and `video-evidence.ts`: this slice
  must not render bilingual stories, add controls, alter playback, change
  response handoff, or change emitted events.
- Content Foundry scripts, profiles, ComfyUI workflows, media assets,
  narration files, voice packs, speech services, and parent voice settings.
- Storage implementations, storage keys, migrations, export/reset behavior,
  shelf UI, decorated-page renderer, or thumbnail generation. Record shapes are
  defined now; persistence is Slice 5.
- Child routes, home tiles, Video Vault labels, child UI, parent panel, language
  selection controls, autoplay policy, and automatic next-story behavior.
- Universal activity/event schemas and all evidence, mastery, transfer,
  recommendation, progress, curriculum, difficulty, and parent-approval rules.
- Existing games, activity JSON, external-content protections, safety rules,
  rewards, streaks, timers, backend, auth, cloud sync, public sharing, or AI
  tutor behavior.
- Package/dependency versions, unrelated formatting, PR #112, the Tara
  voice-pack worktree, and the shared checkout's untracked workflow file.

### Assumptions / Blockers

- The current real manifest's `version: 2` remains its content revision. V3
  schema identity is represented independently as `schema_version: 3`.
- A legacy-v2 manifest is the current pre-discriminator shape with
  `version: 2` and no `schema_version`. It is accepted and normalized for
  compatibility; unknown schema versions fail closed.
- V3 approved-video items remain structurally compatible with the existing
  `ApprovedVideo` runtime adapter. Validated bilingual-story items are exposed
  to tests and future code but are intentionally absent from
  `playable_videos`, so no story can become child-visible in this slice.
- The first story contract requires exactly English, Story Bridge, and Spanish
  Replay exports. Later schema expansion requires a separately contracted
  version change.
- Response cues know the guided target so runtime guidance can be deterministic,
  but their records are explicitly non-evaluative and cannot claim accuracy.
- Semantic record and page-definition types do not create storage behavior.
- Blockers: none discovered before implementation.

### Verification Plan

- `npm ci`
- focused Video Vault manifest tests
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint --if-present`
- `npm run check:work-contract`
- `git diff --check`
- cold-read every touched file against this contract
- no browser pass: this slice is prohibited from changing runtime or UI

## Contract Amendments

Record any scope change discovered during verification before touching the new
area.

## Cold Diff Audit

### Gaps

- change without contract trace: **none**.
- contract requirement not delivered: **none for Slice 1**. Runtime playback,
  generated media, Foundry profiles, and storage remain later slices by
  contract rather than unfinished work in this slice.
- protected surface touched: **none**. The final diff contains no runtime,
  evidence, storage, voice, Foundry, route, child UI, parent panel, core
  learning, package, dependency, or unrelated-lane file.

The first cold read found two implementation gaps before this audit was closed:

- `StoryExposureRecord` identified the story and mode but not the exact media
  export. Stable media ids, manifest/content provenance, and record schema
  versions were added at `src/modules/video-vault/video-vault.types.ts:78` and
  `src/modules/video-vault/video-vault.types.ts:232`, then validated for
  uniqueness at `src/modules/video-vault/video-manifest.ts:319`.
- The legacy normalizer initially spread the untrusted record after assigning
  `kind`, so an explicit `kind: undefined` property could defeat the normalized
  discriminator. The final spread order makes the normalized kind authoritative
  at `src/modules/video-vault/video-manifest.ts:152`.

Both gaps were corrected and the complete verification suite was rerun.

The current-head Codex review then identified three additional boundary gaps:

- response pauses rejected only `auto_resume: true`, so `false` and string
  values could still attach forbidden auto-resume metadata. The presence check
  now rejects every declared value at
  `src/modules/video-vault/video-manifest.ts:705`.
- automatic-playback flags were rejected on the story item but not on each mode
  export. Every export now runs the same guard at
  `src/modules/video-vault/video-manifest.ts:340`.
- the shared language-target validator required at least one phrase even though
  the permanent contract only caps phrases at two. Words retain a minimum of
  one while phrases explicitly allow zero at
  `src/modules/video-vault/video-manifest.ts:237` and
  `src/modules/video-vault/video-manifest.ts:246`.

Focused regression tests cover all six exact review inputs at
`tests/modules/bilingual-story-manifest.test.ts:44`,
`tests/modules/bilingual-story-manifest.test.ts:69`, and
`tests/modules/bilingual-story-manifest.test.ts:110`. All three review gaps are
closed in the final diff.

Do not declare done while any gap stands.

### Change By Change Reconstruction

1. `docs/contracts/bilingual-story-vault.contract.md:5` makes bilingual stories
   an extension of the existing local, parent-approved, exposure-only Video
   Vault rather than a second system. Lines 50-82 separate schema version from
   content revision and define the v3 item discriminator. Lines 84-144 define
   the three exports and authored cue/repeat/resume rules. Lines 146-181 define
   visual references and the `es-419` review gate. Lines 183-236 separate
   non-evaluative exposure history from semantic ownership state. Lines 238-269
   bound collections and preserve the ordered seven-slice arc.
2. `src/modules/video-vault/video-vault.types.ts:9` separates the legacy-v2 and
   v3 manifest types while retaining the existing `ApprovedVideo` shape at line
   39. Lines 53-85 add the discriminated item and exact three-mode media model.
   Lines 88-192 define Spanish approval, visual registries, authored cue
   boundaries, and passive/response cue variants. Lines 194-230 define the
   versioned semantic completion-page registry. Lines 232-280 define separate,
   versioned exposure and exact-choice completion records without connecting
   either record to storage.
3. `src/modules/video-vault/video-manifest.ts:44` branches explicitly between
   supported legacy-v2 and v3 shapes, fails closed on every issue, exposes all
   normalized approved items, and keeps only `approved_video` items in the
   existing `playable_videos` adapter (lines 79-87). Lines 120-179 reject unknown
   schemas/kinds and normalize v2. Lines 210-375 validate story policy, the
   exact mode set, stable media ids, local paths, MIME/duration, approval, and
   hashes. Lines 380-548 validate bounded target/slot/language registries and
   per-mode cue requirements. Lines 550-731 validate language, timing, explicit
   response action, no timeout, guided targets, and authored repeat return
   state. Lines 755-832 validate exact Spanish approval artifacts and the
   versioned completion page. Lines 834-1041 validate semantic registries,
   references, color values, bounded arrays, and sticker limits. Lines
   1043-1098 preserve safe local paths, supported media, hashes, and strict UTC
   approval timestamps.
4. `src/content/videos/family-safe-videos.v1.json:3` identifies the real manifest
   as schema v3 while retaining content `version: 2`; line 13 marks Bear Bakes
   Bread as `approved_video`. Its path, duration, MIME, response activity,
   approval, source, thumbnail, and exposure role are unchanged.
5. `tests/modules/video-vault.test.ts:9` proves the migrated real manifest still
   reaches the existing runtime adapter. Lines 26-51 prove only the explicit
   legacy-v2 shape normalizes successfully. Lines 53-147 retain both passing
   and failing local-video boundaries, and lines 149-183 prove event metadata
   still records content version 2 and exposure-only completion.
6. `tests/modules/bilingual-story-manifest.test.ts:5` proves a complete v3 story
   validates while remaining absent from `playable_videos`. Lines 20-108 reject
   unknown schemas/kinds, missing modes, remote/duplicate media, missing hashes,
   autoplay, timing overflow, language mismatch, and dangling word references.
   Lines 110-192 reject automatic/timeout resume, insufficient or dangling
   choices, arbitrary repeat spans, unapproved/mismatched Spanish, invalid
   dates, unsafe audio, and mismatched prompt audio. Lines 194-232 reject
   malformed semantic page references, unsafe assets, sticker overflow, unknown
   page schemas, and target-word overflow. Lines 236-530 construct the complete
   three-mode, cue, approval, registry, and page fixture used by both sides of
   those probes.
7. This work contract records the root cause and protected surface before code
   at lines 8-105 and records the final cold audit and verification here.

### Contract Traceability

- Permanent bilingual boundary -> contract doc: **Correct Fix Must Touch**.
- Separate schema/content versions and discriminated v2/v3 types -> types and
  validator: **Root Cause** and **Correct Fix Must Touch**.
- Precise cues, visual references, explicit child resume, Spanish approval, and
  semantic completion definitions -> types, validator, focused tests:
  **Correct Fix Must Touch**.
- Legacy compatibility and unchanged Bear Bakes Bread behavior -> real manifest,
  legacy/runtime tests: **Correct Fix Must Touch**.
- Runtime, storage, voice, Foundry, evidence, learning core, UI, and dependency
  absence -> **Must Not Change**.
- Every final diff entry maps to one of those requirements; no amendment was
  needed.

### Verification

- `npm ci` - passed; 56 locked packages installed, 0 vulnerabilities.
- Focused manifest/evidence/runtime run - passed: 4 files, 80 tests.
- `npm test` - passed: change-contract gate; 46 Content Foundry tests with 1
  intentional skip; 62 Vitest files and 843/843 tests on the rebased head.
- `npm run typecheck` - passed.
- `npm run build` - passed; Vite transformed 131 modules. The rebased Tara
  voice-pack baseline emits a non-failing chunk-size warning; this slice does
  not touch voice or bundling code.
- `npm run lint --if-present` - exited 0; no lint script is defined.
- `git diff --check` - passed.
- Browser QA - not run because Slice 1 changes no runtime, route, UI, style, or
  media behavior and the written verification plan explicitly prohibits those
  surfaces.

Gap audit for Issue #113 Slice 1: **DONE**.
