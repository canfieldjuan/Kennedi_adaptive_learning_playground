# Issue #113 Slice 2: Content Foundry Bilingual Proof Profile

This slice adds a bounded offline authoring profile for a 45-to-90-second
bilingual story proof. It does not create story media or make a story playable.

## Before Code

### Root Cause

The Content Foundry currently has one narrated-storyboard contract. Its duration,
scene, cue, command-timeout, and contact-sheet limits are hard-coded around a
single video no longer than 30 seconds. It accepts one narration list and emits
one learning clip, so it cannot author the three separate English, Story Bridge,
and Spanish Replay exports required by the bilingual proof.

The Foundry already snapshots exact scene and narration bytes, records source and
output hashes, performs media QA, and leaves approval to a manual parent CLI.
Those are load-bearing safety and provenance boundaries. The missing capability
is therefore a profile-specific assembly contract and Spanish artifact gate, not
a second media pipeline and not a global increase to the existing short-clip
limits.

Without a bounded proof profile, producing the proof would require weakening the
30-second path for every clip, assembling untracked mode exports by hand, or
allowing reviewed Spanish text and audio to drift apart. Any of those paths would
make the draft manifest an unreliable account of the media a parent reviews.

### Correct Fix Must Touch

- `docs/contracts/content-foundry.contract.md` must define:
  - `short_clip` as the unchanged existing 30-second profile;
  - `bilingual_story_proof` as a separate 45-to-90-second profile;
  - exact three-mode output, bounded-resource, Spanish-review, QA, hash, and
    draft-only requirements;
  - the explicit absence of a full episode profile.
- `tools/content-foundry/content_foundry/profiles.py` (new) must provide immutable
  named profile limits for duration, scenes, narration cues, render timeout,
  output bytes, and contact-sheet density. Unknown profiles, including a future
  episode profile, must fail closed.
- `tools/content-foundry/content_foundry/media.py` must:
  - keep the current single-clip storyboard behavior on `short_clip`;
  - validate a separate bilingual proof storyboard with shared scenes and
    exactly English, Story Bridge, and Spanish Replay narration modes;
  - enforce 45-to-90 seconds, at most 12 shared scenes, at most 24 narration
    cues per mode, a 900-second render timeout, a 128 MiB ceiling per mode
    export, and a 12-frame contact sheet;
  - require stable cue ids and mode-appropriate `en` / `es-419` languages;
  - require every Spanish cue to carry an approved neutral Latin American
    review artifact whose text and audio hash match the authored line and exact
    snapshotted audio bytes;
  - snapshot shared visuals once and assemble three separate local WebM files
    from the same scene snapshots;
  - record profile limits, per-mode narration provenance, exact source hashes,
    output hashes, mode QA, contact-sheet density, and Spanish gate results in
    the review-required draft;
  - reject output size and profile boundary violations before a draft can pass
    QA or receive parent approval.
- `tools/content-foundry/content_foundry/service.py`, `foundry.py`, and
  `mcp_server.py` must expose proof assembly as a generation-only operation and
  report the finite profile limits. They must not expose approval, publication,
  app integration, or episode authoring.
- `tools/content-foundry/README.md` must document the proof input and manual
  command without implying that assembly approves or publishes it.
- `tools/content-foundry/examples/bilingual-story-proof.example.json` (new)
  must show the exact authored shape using local placeholder asset names and
  explicit Spanish approval records; it is an example, not generated media.
- `tools/content-foundry/tests/` must prove both sides of every profile boundary:
  - existing short clips retain the 30-second, 6-scene, 12-cue, 300-second, and
    8-frame behavior;
  - proof duration accepts 45 and 90 seconds and rejects values outside them;
  - proof scenes, per-mode cues, modes, languages, ids, output bytes, timeout,
    and contact density are bounded;
  - pending/malformed Spanish review, text drift, and audio-hash drift fail;
  - successful assembly emits exactly three mode exports plus review artifacts,
    all with hashes and passing per-mode QA;
  - no episode profile, approval tool, publication tool, or child integration
    is introduced.
- This work contract must receive a cold diff audit with exact file and line
  citations before the slice is called done.

### Must Not Change

- Video Vault manifest types, validators, runtime, routes, player controls,
  exposure records, evidence adapters, or approved media catalog.
- Any app `public/assets` file, generated image, generated audio, generated video,
  Spanish production translation, or Castle proof content. Media production is
  Slice 3 and stays draft-only there until separate review.
- Existing `short_clip` duration, scene count, narration count, command timeout,
  contact-sheet density, codecs, dimensions, loudness, true-peak, local-input,
  hashing, draft-state, or manual parent-approval behavior.
- ComfyUI graph templates, Wan motion calibration, Flux image generation,
  shared voice core, voice packs, speech services, or narration playback.
- Draft approval semantics: MCP remains unable to approve or publish, and CLI
  approval remains a separate human action after passing QA.
- Child UI, parent panel, storage, export/reset, ownership shelf, routes, games,
  activity/event schemas, curriculum, evidence, mastery, transfer,
  recommendations, difficulty, parent approval rules, or safety rules.
- Backend, auth, cloud sync, open web, public sharing, rewards, streaks,
  leaderboards, dependency versions, broad refactors, unrelated formatting,
  PR #116, or any concurrent worktree/branch.

### Assumptions / Blockers

- The proof uses one shared visual scene sequence and three separately assembled
  narration exports. A synchronized multi-track runtime is not required.
- `short_clip` keeps its effective 500 ms minimum because its existing scene
  contract requires at least one 500 ms scene. Its new explicit output ceiling
  is 64 MiB; this closes the existing contract's claimed finite-output boundary
  without changing normal 30-second output behavior.
- `bilingual_story_proof` uses at most 12 scenes and 24 cues per mode. These
  limits are enough for a 45-to-90-second proof while remaining intentionally
  smaller than a full episode authoring system.
- The proof contact sheet samples 12 evenly distributed frames in a 4-by-3
  layout. Since all three exports use the same snapshotted visual sequence, one
  shared contact sheet is authoritative for visual continuity; media QA still
  inspects all three exports independently.
- English mode contains only `en` cues. Spanish Replay contains only `es-419`
  cues. Story Bridge contains at least one of each. Every cue id is globally
  unique across all three modes.
- Spanish approval uses the same `es-419` semantics established by Slice 1.
  The approval record must identify exact Spanish text, English intent,
  reviewer, timestamp, version, pronunciation status, and SHA-256 of the local
  audio file. This slice validates authored artifacts but does not create or
  approve their linguistic content.
- Existing DraftStore input/output records are sufficient for profile and
  provenance metadata, so no draft-schema migration is required.
- Blockers: none discovered before implementation.

### Verification Plan

- focused Content Foundry profile/media/service tests
- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run lint --if-present`
- `npm run check:work-contract`
- `git diff --check`
- cold-read every touched file against this contract
- no browser pass: this slice changes offline authoring tools and docs only
- no live ComfyUI/GPU run: this slice assembles local test fixtures and does not
  alter ComfyUI workflows

## Contract Amendments

Record any scope change discovered during implementation before touching the new
area.

## Cold Diff Audit

### Gaps

- change without contract trace: **none**.
- contract requirement not delivered: **none for Slice 2**. Story media,
  Video Vault runtime, ownership persistence, and a full episode profile remain
  later slices by contract rather than unfinished work here.
- protected surface touched: **none**. The final diff contains no Video Vault,
  app runtime, public asset, generated media, ComfyUI workflow, voice, storage,
  learning-core, UI, package, dependency, or concurrent-lane file.

The cold read found three gaps before this audit was closed:

- Proof scene inspection initially used the short-profile default command
  timeout even though assembly and QA used the proof timeout. The final proof
  path passes 900 seconds into source inspection, narration inspection,
  assembly, output QA, poster, and contact-sheet commands at
  `tools/content-foundry/content_foundry/media.py:143` and
  `tools/content-foundry/content_foundry/media.py:164`.
- A caller could construct a lookalike profile object with the expected id but
  looser limits. Profiles now live in an immutable registry and every
  profile-consuming validator canonicalizes the complete record at
  `tools/content-foundry/content_foundry/profiles.py:50` and
  `tools/content-foundry/content_foundry/media.py:581`.
- Rejection tests covered past-the-cap scenes, cues, and output bytes but did not
  prove exact-cap inputs remained valid. Exact 12-scene, 24-cue-per-mode, and
  128 MiB acceptance probes now pass at
  `tools/content-foundry/tests/test_bilingual_proof.py:175` and
  `tools/content-foundry/tests/test_bilingual_proof.py:372`.

The same guard pass also rejected boolean contact-sheet dimensions and date-only
approval timestamps at `tools/content-foundry/content_foundry/media.py:316` and
`tools/content-foundry/content_foundry/media.py:707`. All gaps were corrected
before the complete verification suite was rerun.

The current-head Codex review then found that the legacy short storyboard path
ignored any authored `profile` field because it canonicalized only its function
argument. A payload declaring `bilingual_story_episode`, `null`, or another
unsupported profile could therefore be assembled silently as `short_clip`.
Legacy absence and exact `short_clip` remain valid, while every other declared
value now fails closed at `tools/content-foundry/content_foundry/media.py:543`.
The focused probe at `tools/content-foundry/tests/test_bilingual_proof.py:135`
covers exact, absent, future, wrong-profile, null, boolean, and empty values.

Do not declare done while any gap stands.

### Change By Change Reconstruction

1. `docs/contracts/content-foundry.contract.md:35` names the two finite media
   profiles, preserves the short-clip limits, defines the separate proof limits,
   requires three shared-visual exports and independent QA, defines the
   `es-419` audio-review gate, and explicitly excludes an episode profile. Lines
   58-66 retain manual draft approval and no publication.
2. `tools/content-foundry/content_foundry/profiles.py:10` introduces the frozen
   profile value. Lines 26-47 encode the 30-second short and 45-to-90-second
   proof budgets. Lines 50-70 make the registry immutable, reject unknown ids,
   and reject lookalike records whose limits differ from the canonical profile.
3. `tools/content-foundry/content_foundry/media.py:40` keeps legacy storyboard
   assembly on `short_clip`, records that profile in provenance, and threads its
   existing 300-second/8-frame behavior through the same media helpers. Lines
   123-269 add proof assembly: one snapshotted scene sequence, exact per-mode
   narration snapshots, audio peak and hash checks, three WebM exports,
   independent mode QA, one shared poster/contact sheet, output hashes, Spanish
   review results, and a review-required draft.
4. `tools/content-foundry/content_foundry/media.py:304` makes contact-sheet
   density and timeout profile-driven while rejecting invalid and boolean grid
   values. Lines 334-362 apply canonical duration, codec, size, loudness, peak,
   and timeout limits to output QA. Lines 438-531 pass the selected finite
   timeout through every ffmpeg stage without changing codec or mix behavior.
5. `tools/content-foundry/content_foundry/media.py:539` preserves short
   storyboard validation at 6 scenes, 12 cues, and 30 seconds. Lines 582-642
   validate the proof discriminator, 12-scene cap, inclusive 45-to-90-second
   duration, exact mode set, 24-cue cap, language composition, and global cue
   ids. Lines 645-722 validate cue fields and exact Spanish text, intent,
   register, approved pronunciation, reviewer, UTC timestamp, version, and
   lowercase SHA-256 before assembly compares that hash to snapshotted bytes.
6. `tools/content-foundry/content_foundry/service.py:36` reports only the short
   and proof limits; lines 164-168 expose proof assembly alongside the unchanged
   narrated-clip method. `tools/content-foundry/foundry.py:19` adds a manual
   `assemble-bilingual-proof` command while keeping `record-decision` separate.
   `tools/content-foundry/mcp_server.py:40` adds generation-only proof assembly;
   no approval or publication MCP operation exists.
7. `tools/content-foundry/README.md:55` documents the new tool, exact three-mode
   local draft, Spanish hash gate, example, and manual CLI command while stating
   that assembly neither approves nor publishes. The example at
   `tools/content-foundry/examples/bilingual-story-proof.example.json:1` shows a
   45-second shared scene sequence and all three authored modes with explicit
   Spanish approval records but contains no media.
8. `tools/content-foundry/tests/test_bilingual_proof.py:85` proves canonical
   short/proof limits, no episode profile, no forged-profile bypass, inclusive
   duration edges, exact and past-the-cap scenes/cues, exact mode/language/id
   rules, and Spanish artifact failures. Lines 258-350 prove one shared snapshot
   set produces exactly three hashed draft exports and that audio hash drift
   fails before draft creation. Lines 352-398 prove both sides of output-size
   and contact-sheet boundaries and the proof timeout/density.
9. `tools/content-foundry/tests/test_media.py:23` retains the original
   short-storyboard and 8-frame behavior while lines 76-144 now also assert its
   unchanged 300-second timeout through snapshot, assembly, poster, and contact
   helpers. `tools/content-foundry/tests/test_service_contract.py:65` verifies
   only short and proof profiles are advertised; lines 205-222 verify the MCP
   surface remains generation/validation-only.
10. This work contract records the root cause and protected surface before code
    and records this final reconstruction and verification after the cold read.

### Contract Traceability

- Separate bounded proof profile -> permanent contract, frozen profile registry,
  service status, validators, and exact-edge tests: **Correct Fix Must Touch**.
- Three exports from one visual sequence -> proof assembler, draft output roles,
  shared-snapshot test: **Root Cause** and **Correct Fix Must Touch**.
- Spanish approval tied to exact local bytes -> cue validator, snapshot hash
  comparison, provenance record, drift test: **Correct Fix Must Touch**.
- Timeout, file size, scene/cue caps, contact density, QA, hashes, provenance ->
  profile values, media helpers, draft details, both-side tests:
  **Correct Fix Must Touch**.
- Generation-only CLI/MCP and manual approval separation -> service/entrypoints,
  MCP allowlist test, docs: **Correct Fix Must Touch** and **Must Not Change**.
- Runtime, media production, episode authoring, public assets, voice, app logic,
  storage, learning core, dependencies, and concurrent work absence ->
  **Must Not Change**.
- Every final diff entry maps to a requirement above; no contract amendment was
  needed.

### Verification

- `npm ci` - passed; 56 locked packages installed, 0 vulnerabilities.
- Focused profile/media/service run - passed: 29 tests.
- `npm test` - passed after dependency setup: change-contract gate; 57 Content
  Foundry tests with 1 intentional live-Comfy skip; 62 Vitest files and 843/843
  tests.
- `npm run typecheck` - passed.
- `npm run build` - passed; Vite transformed 131 modules. The existing
  non-failing chunk-size warning remains; this offline authoring slice does not
  touch app bundling.
- `npm run lint --if-present` - exited 0; no lint script is defined.
- `npm run check:work-contract` - passed.
- `git diff --check` - passed.
- Browser QA - not run because the contract prohibits runtime/UI changes.
- Live ComfyUI/GPU - not run because no workflow or generated-media behavior
  changed; local deterministic assembly behavior is covered by media tests.

Gap audit for Issue #113 Slice 2: **DONE**.
