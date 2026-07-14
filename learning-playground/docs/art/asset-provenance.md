# Asset Provenance Ledger

This is the canonical ownership and source ledger for production artwork. It is
governed by `docs/contracts/art-production-assets.contract.md`.

An asset or cohesive family is production-ready only when every required field
below is complete, licenses are committed or linked when applicable, and the
owner's look approval is recorded. Do not infer ownership from a file's presence
in the repository or from an editor's export controls.

## Status Values

- `draft`: source or rights review is incomplete; not approved for child mode.
- `rights_verified`: provenance and redistribution rights are complete.
- `look_approved`: owner approved the representative visual proof.
- `production_ready`: rights, editable source, export, visual, and runtime checks
  all passed.
- `legacy_unverified`: predates this ledger; may continue running, but cannot be
  expanded, replaced, or represented as newly approved production art until its
  entry is completed.

## Required Entry Template

Copy this section once per asset or cohesive asset family.

```text
Asset family:
Game:
Status:
Production path(s):
Editable source path(s):
Creator:
Creation date:
Creation tool and version:
Origin category: A original | B project-owned source | C third-party
Original or third-party status:
Project-owned source material used:
Third-party elements:
Source URL(s):
License name and version/date:
License file path:
Commercial use permitted: yes | no | unclear
Modification permitted: yes | no | unclear
Software distribution permitted: yes | no | unclear
Public repository distribution permitted: yes | no | unclear
Continued use after subscription ends: yes | no | unclear | not applicable
Attribution requirement:
AI assistance: none | reference only | production use approved
AI approval/terms record:
Contact sheet path:
Desktop screenshot path(s):
Mobile screenshot path(s):
Owner look approval:
Restrictions and notes:
```

Any `no` or `unclear` rights field blocks production-ready status. A Category A
or B entry normally uses `not applicable` for third-party URL and license fields,
but it must still identify the creator and project-owned source.

## Current Ledger

No new production art is introduced by the production-workflow documentation
slice. Existing artwork predates this ledger and is not retroactively assigned
ownership claims here. The first graphics proof PR must add its complete entry
and must also document every legacy asset family it modifies or re-exports.

<!-- Add approved asset-family entries below this line. -->

## Bear Cafe Pickup-Window Proof

- **Asset family:** Bear Cafe delivery and pickup-window environment proof
- **Game:** Kennedi's Orders / Bear Cafe
- **Status:** `rights_verified`
- **Production path(s):** `public/assets/images/bear-cafe-pickup-window-proof.svg`
- **Editable source path(s):** `design-source/bear-cafe/bear-cafe-pickup-window-proof.svg`
- **Creator:** Project developer, Codex production-art session
- **Creation date:** 2026-07-11
- **Creation tool and version:** Inkscape 1.4.4 Flatpak (`org.inkscape.Inkscape`)
- **Origin category:** A original
- **Original or third-party status:** Original project artwork
- **Project-owned source material used:** Established Bear Cafe palette and visual direction only; no legacy art embedded
- **Third-party elements:** None
- **Source URL(s):** Not applicable
- **License name and version/date:** Not applicable; original project artwork
- **License file path:** Not applicable
- **Commercial use permitted:** yes
- **Modification permitted:** yes
- **Software distribution permitted:** yes
- **Public repository distribution permitted:** yes
- **Continued use after subscription ends:** not applicable
- **Attribution requirement:** None
- **AI assistance:** none
- **AI approval/terms record:** Not applicable
- **Contact sheet path:** `docs/captures/bear-cafe/pickup-window-proof-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/bear-cafe/pickup-window-proof-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/bear-cafe/pickup-window-proof-mobile.webp`
- **Owner look approval:** APPROVED — the owner merged PR #92 on 2026-07-11; status `look_approved`, stage rollout authorized
- **Restrictions and notes:** Static decorative environment only. Dynamic bear, order, tray, and Deliver control remain runtime-owned. No Canva/Figma library content, stock media, font, icon pack, texture, Content Foundry output, or generative image tool was used. Decrowd revision (2026-07-11, owner feedback "crowded, elements overlap"): awning rebuilt as true half-disc scallops, painted counter plate removed (live order owns the zone), glass shine moved off the customer, wall shelf lowered out of the awning band, base environment props quieted during delivery, mobile delivery centered; editable source and export updated together.

## Bear Cafe Personalized Order Package

- **Asset family:** Bear Cafe reusable takeout bag frame and heart, star, and bubbles seal set
- **Game:** Kennedi's Orders / Bear Cafe
- **Status:** `rights_verified`
- **Production path(s):** `public/assets/images/bear-cafe-order-bag-frame.svg`; `public/assets/images/bear-cafe-seal-heart.svg`; `public/assets/images/bear-cafe-seal-star.svg`; `public/assets/images/bear-cafe-seal-bubbles.svg`
- **Editable source path(s):** `design-source/bear-cafe/bear-cafe-order-bag.svg`
- **Creator:** Project developer, Codex Bear Cafe ownership-completion session
- **Creation date:** 2026-07-13
- **Creation tool and version:** Inkscape 1.4.4 Flatpak (`org.inkscape.Inkscape`), component exports produced with `--export-id-only --export-plain-svg`
- **Origin category:** A original
- **Original or third-party status:** Original project artwork
- **Project-owned source material used:** Established Bear Cafe palette and line language only; no prior asset geometry embedded
- **Third-party elements:** None
- **Source URL(s):** Not applicable
- **License name and version/date:** Not applicable; original project artwork
- **License file path:** Not applicable
- **Commercial use permitted:** yes
- **Modification permitted:** yes
- **Software distribution permitted:** yes
- **Public repository distribution permitted:** yes
- **Continued use after subscription ends:** not applicable
- **Attribution requirement:** None
- **AI assistance:** none
- **AI approval/terms record:** Not applicable
- **Contact sheet path:** `docs/captures/bear-cafe/order-package-contact-sheet.webp`
- **Existing/proposed comparison path:** `docs/captures/bear-cafe/order-package-before-after.webp`
- **Desktop screenshot path(s):** `docs/captures/bear-cafe/order-package-desktop.webp`; `docs/captures/bear-cafe/order-wall-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/bear-cafe/order-package-mobile.webp`; `docs/captures/bear-cafe/order-wall-mobile.webp`
- **Owner look approval:** Pending owner review of the representative package, delivery continuity, and order-wall proof in this PR
- **Restrictions and notes:** Runtime uses only the exported local SVG files; Inkscape is an authoring/export tool and is not a dependency. Bag color remains runtime-owned CSS state so one original frame supports every child-chosen color without duplicated art. No `<text>`, font, remote reference, stock/library content, Canva content, plugin resource, or generative image tool is present. The exact package component is reused across packaging, delivery, handoff, final admiration, and revisit rather than substituted by a generic asset.

## Story Stage Lost-Log Production-Art Proof

- **Asset family:** Story Stage Lost Friend owl-and-hollow-log representative scene
- **Game:** Story Stage
- **Status:** `look_approved`
- **Production path(s):** `public/assets/images/story-stage-lost-log-proof.svg`
- **Editable source path(s):** `design-source/story-stage/story-stage-lost-log-proof.svg`
- **Creator:** Project developer, Codex Story Stage production-art session
- **Creation date:** 2026-07-13
- **Creation tool and version:** Inkscape 1.4.4 Flatpak (`org.inkscape.Inkscape`), plain SVG export produced with `--export-plain-svg`
- **Origin category:** A original
- **Original or third-party status:** Original project artwork
- **Project-owned source material used:** Established Story Stage palette, Princess Poppy identity, Biscuit identity, and friendly-owl story direction only; no prior asset geometry embedded
- **Third-party elements:** None
- **Source URL(s):** Not applicable
- **License name and version/date:** Not applicable; original project artwork
- **License file path:** Not applicable
- **Commercial use permitted:** yes
- **Modification permitted:** yes
- **Software distribution permitted:** yes
- **Public repository distribution permitted:** yes
- **Continued use after subscription ends:** not applicable
- **Attribution requirement:** None
- **AI assistance:** none
- **AI approval/terms record:** Not applicable
- **Contact sheet path:** `docs/captures/story-stage/lost-log-proof-contact-sheet.webp`
- **Existing/proposed comparison path:** `docs/captures/story-stage/lost-log-proof-before-desktop.webp`; `docs/captures/story-stage/lost-log-proof-before-mobile.webp`; `docs/captures/story-stage/lost-log-proof-proposed-desktop.webp`; `docs/captures/story-stage/lost-log-proof-proposed-mobile.webp`
- **Desktop screenshot path(s):** `docs/captures/story-stage/lost-log-proof-proposed-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/story-stage/lost-log-proof-proposed-mobile.webp`
- **Owner look approval:** APPROVED — the owner authorized PR #120 for merge on 2026-07-13 ("120 looks green lets merge and continue"); the proof's illustration style, scene density, character scale, line weight, palette, background contrast, mobile crop, and environmental richness are approved for a separately contracted rollout
- **Restrictions and notes:** The representative export is eligible only for the exact `lost-log` + Poppy + enchanted-forest combination. Every other scene, character, and setting remains runtime-composed so the child's actual selection is never replaced by generic proof art. Runtime depends only on the local production SVG; Inkscape is an authoring/export tool and is not a dependency. The scene is decorative, `aria-hidden`, and contains no interaction. No `<text>`, font, remote reference, embedded data, Canva/Figma/Inkscape library content, stock media, community file, plugin resource, third-party asset, Content Foundry output, or generative image tool is present. The complete third-party resource list is None. No unlisted stock or library element remains. The approved visual direction may be extended only through separately contracted Story Stage rollout slices.

## Story Stage Lost Friend Poppy-Forest Rollout Family

- **Asset family:** Story Stage Lost Friend Princess Poppy in the Enchanted Forest scene family
- **Game:** Story Stage
- **Status:** `rights_verified`
- **Production path(s):** `public/assets/images/story-stage-lost-intro-poppy-forest.svg`; `public/assets/images/story-stage-lost-problem-poppy-forest.svg`; `public/assets/images/story-stage-lost-where-poppy-forest.svg`; `public/assets/images/story-stage-lost-bush-poppy-forest.svg`; `public/assets/images/story-stage-lost-help-poppy-forest.svg`; `public/assets/images/story-stage-lost-ending-poppy-forest.svg`
- **Editable source path(s):** `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-intro-poppy-forest.svg`; `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-problem-poppy-forest.svg`; `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-where-poppy-forest.svg`; `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-bush-poppy-forest.svg`; `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-help-poppy-forest.svg`; `design-source/story-stage/lost-friend-poppy-forest/story-stage-lost-ending-poppy-forest.svg`
- **Creator:** Project developer, Codex Story Stage production-art rollout session
- **Creation date:** 2026-07-14
- **Creation tool and version:** Inkscape 1.4.4 Flatpak (`org.inkscape.Inkscape`), plain SVG exports produced with `--export-plain-svg`
- **Origin category:** A original
- **Original or third-party status:** Original project artwork
- **Project-owned source material used:** The approved Story Stage Lost-Log proof's palette, Princess Poppy and Biscuit construction language, forest depth, line weight, path, and composition standard; the merged proof remains independently documented above and is not duplicated in this family
- **Third-party elements:** None
- **Source URL(s):** Not applicable
- **License name and version/date:** Not applicable; original project artwork
- **License file path:** Not applicable
- **Commercial use permitted:** yes
- **Modification permitted:** yes
- **Software distribution permitted:** yes
- **Public repository distribution permitted:** yes
- **Continued use after subscription ends:** not applicable
- **Attribution requirement:** None
- **AI assistance:** none
- **AI approval/terms record:** Not applicable
- **Contact sheet path:** `docs/captures/story-stage/lost-friend-poppy-forest-contact-sheet.webp`
- **Existing/proposed comparison path:** The approved direction comparison remains `docs/captures/story-stage/lost-log-proof-contact-sheet.webp`; this rollout's complete-family review is `docs/captures/story-stage/lost-friend-poppy-forest-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/story-stage/lost-friend-poppy-forest-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/story-stage/lost-friend-poppy-forest-mobile.webp`
- **Owner look approval:** The visual direction was approved through PR #120 on 2026-07-13. Owner review of these six new scene compositions is pending; do not promote this family beyond `rights_verified` before that review.
- **Restrictions and notes:** These six exports join the separately documented approved Lost Log proof to cover the seven unique art keys for only Princess Poppy + Enchanted Forest + Lost Friend. Every other character, setting, story family, setup card, and choice card remains runtime-composed so the child's actual selection is preserved. Runtime depends only on local SVG exports; Inkscape is not a runtime dependency. Every scene is decorative, `aria-hidden`, and non-interactive. The sources and exports contain no `<text>`, font, remote reference, embedded image/data, Canva/Figma/Inkscape library content, stock media, community file, plugin resource, third-party asset, Content Foundry output, or generative image output. The complete third-party resource list is None. No unlisted stock or library element remains.

## Bear Bakes Bread Deterministic Mixing Video Proof

- **Asset family:** Bear Bakes Bread deterministic mixing vector proof
- **Game:** Video Vault / Bear Bakes Bread
- **Status:** `draft`
- **Production path(s):** None; review-only WebM at `docs/captures/video/bear-mixes-dough-vector-proof.webm`
- **Editable source path(s):** `design-source/video/bear-bakes-bread/mix-dough-vector-animation.svg`, `design-source/video/bear-bakes-bread/vector-render-manifest.json`
- **Creator:** Project developer, Codex deterministic-vector animation session
- **Creation date:** 2026-07-12
- **Creation tool and version:** Inkscape 1.4.4 Flatpak; Playwright Chromium 149.0.7827.55; FFmpeg 6.1.1
- **Origin category:** A original animation-ready vector artwork informed by B project-owned Bear Cafe visual direction
- **Original or third-party status:** Original project artwork and deterministic project-authored motion
- **Project-owned source material used:** Bear Cafe pickup-window palette, line language, awning, tile, shelf, and counter direction; the character, cooking pose, bowl, spoon, grip, dough, and motion timeline were drawn specifically for this proof
- **Third-party elements:** None; Chromium and FFmpeg are local authoring/rendering tools, not embedded assets or runtime dependencies
- **Source URL(s):** Not applicable
- **License name and version/date:** Not applicable; original project artwork
- **License file path:** Not applicable
- **Commercial use permitted:** yes
- **Modification permitted:** yes
- **Software distribution permitted:** yes
- **Public repository distribution permitted:** yes
- **Continued use after subscription ends:** not applicable
- **Attribution requirement:** None
- **AI assistance:** none
- **AI approval/terms record:** Not applicable; rejected Wan-generated concepts and their tooling were removed from the final PR diff
- **Contact sheet path:** `docs/captures/video/bear-mixes-dough-vector-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/video/bear-mixes-dough-vector-source-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/video/bear-mixes-dough-vector-source-mobile.webp`; 390x214 source-scale review, not a runtime screenshot
- **Owner look approval:** Pending; deterministic proof replaces the owner-rejected generated-video direction
- **Restrictions and notes:** Review artifact only. Fourteen named Inkscape layers preserve exact Bear, hat, face, cafe, bowl, arm, grip, spoon, dough, and blink geometry. After owner feedback that the first deterministic spoon moved vertically outside the bowl, the spoon was redrawn handle-up and working-end-down between the dough and front rim; arm, grip, and spoon now share a bounded 14-pixel horizontal stir with at most two pixels of vertical travel. Chromium pauses and resets the SVG immediately after load, then seeks each of 77 frame times and rejects a frame if the spoon center leaves the dough, the full working end leaves the bowl, or the hand, grip, and shaft separate. Source validation, hashing, and the browser data URL use one exact byte buffer; every proof target ID must appear exactly once in source and browser DOM. The lab, frames, review output, and per-proof atomic lock must remain outside the full Git checkout. A lock owner holds shared paths from cleanup through frame/output hashing and run-record publication, and a concurrent contender is rejected without touching them. FFmpeg encodes single-threaded bit-exact VP9 with no audio and no inherited source metadata. Three consecutive clean corrected renders matched exactly: source SHA-256 `af4947db573ba04e7f6a32dfa370d8068751e04675930ee3dc3fc5efaea390df`, combined frame-set SHA-256 `5635b8874f137c35eae7ea3edcd0c986a5ff0e2f609c39cf4144300eaaf1a7d6`, and WebM SHA-256 `67e0e28b72cfbe6fd0922b6330724d44191b3a501d507ac05eebcd5c330b904b`. Generic deterministic FFmpeg encoder/duration fields remain; no prompt, authoring, source, or user metadata is present. No shipped video, narration, runtime, manifest, evidence, or approval behavior changed, and the game has no Inkscape, Chromium, FFmpeg, or renderer dependency at runtime.

## Cafe component library (shared)

- **Asset family:** Playground cafe component library (window, sill cat, plants, hanging Bear Cafe sign with lettering-free bear emblem, hanging lamp, counter block, cookie jar, cake stand, cocoa cup)
- **Game:** Shared across games (canonical component source for scene composition)
- **Status:** `look_approved` (the library has no standalone runtime asset; its look is approved through the owner-approved scenes that instance it — #92/#93/#94/#95/#96)
- **Production path(s):** components ship only inside composed scene exports (no standalone runtime asset)
- **Editable source path(s):** `design-source/art-direction/cafe-component-library.svg`
- **Creator:** Project developer (session-authored)
- **Creation date:** 2026-07-11
- **Creation tool:** Generated as standards-based SVG, editable in Inkscape 1.4.4 (layer-labeled groups); headless-render verified
- **Origin:** Category A original artwork, adapting Category B project-owned motifs from the prior in-code home backdrop (`cafe-scene.ts`)
- **Third-party elements:** None
- **AI assistance:** None (rule-based vector generation, no generative image tools)
- **Commercial use / modification / distribution / public repository:** Project-owned, permitted
- **Attribution requirement:** None
- **Restrictions and notes:** Pickup reconciliation (2026-07-12): the four owner-approved Bear Cafe pickup-window elements (awning-scalloped, tile-wall, service-window-arch, counter-sill) are now library components, geometry lifted verbatim from the approved `design-source/bear-cafe/bear-cafe-pickup-window-proof.svg` (#92) inside translate wrappers, so future scenes instance exactly the style the owner signed. Canonical shared components — scenes must instance these rather than redraw one-off props; new props are added here first. No fonts anywhere (the old sign's system-font `<text>` is replaced by the bear emblem).

## Home room scene (proof)

- **Asset family:** Child home backdrop scene
- **Game:** Home screen
- **Status:** `look_approved`
- **Production path(s):** `public/assets/images/home-room-proof.svg`
- **Editable source path(s):** `design-source/home/home-room-proof.svg` (instances of the cafe component library)
- **Creator:** Project developer (session-authored)
- **Creation date:** 2026-07-11
- **Creation tool:** Composed from the component library; editable in Inkscape 1.4.4; headless-render verified
- **Origin:** Category A original composition of Category A/B components
- **Third-party elements:** None
- **AI assistance:** None
- **Commercial use / modification / distribution / public repository:** Project-owned, permitted
- **Contact sheet path:** `docs/captures/cohesion/home-room-proof-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/cohesion/home-room-proof-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/cohesion/home-room-proof-mobile.webp`
- **Owner look approval:** APPROVED — the owner authorized the merge of
  #93 on 2026-07-12 ("Lets merge them if possible"); status `look_approved`
- **Restrictions and notes:** Reserved clear zones (card grid center, greeting strip, Parent button corner) are load-bearing: props live in the margins only. Mobile cover-crop lands on the reserved center by design — a props-free wall; whether mobile should peek a prop is an owner look call.

## Words workshop scene (proof)

- **Asset family:** Pip's Word Workshop backdrop scene
- **Game:** Words (all three modes: find, blending, builder)
- **Status:** `look_approved`
- **Production path(s):** `public/assets/images/words-workshop-proof.svg`;
  `public/assets/images/words-workshop-proof-mobile.svg` (bands-only phone
  crop of the same editable source — delete the six `words-*` prop layers
  and re-export)
- **Editable source path(s):** `design-source/words/words-workshop-proof.svg` (instances of the shared component library; the library gained `bookshelf-low`, `pin-board`, `pencil-pot`)
- **Creator:** Project developer (session-authored)
- **Creation date:** 2026-07-11
- **Creation tool:** Composed from the component library; editable in Inkscape 1.4.4; headless-render verified
- **Origin:** Category A original composition, adapting Category B motifs from the prior in-code workshop scene
- **Third-party elements:** None
- **AI assistance:** None
- **Commercial use / modification / distribution / public repository:** Project-owned, permitted
- **Contact sheet path:** `docs/captures/word-workshop/words-workshop-proof-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/word-workshop/words-workshop-proof-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/word-workshop/words-workshop-proof-mobile.webp`
- **Owner look approval:** APPROVED — the owner authorized the merge of
  #94 on 2026-07-12 ("Lets merge them if possible"); status `look_approved`
- **Restrictions and notes:** HARD GUARDRAIL preserved — nothing reads as a letter, word, tile, or choice (plain spines, abstract pin-board, no `<text>`). Reserved clear zones: title/prompt strip, Pip column, the card/tile band. Portrait crop intentionally exits both edge prop groups.

## Number Train station scene (proof)

- **Asset family:** Number Train station backdrop scene
- **Game:** Math (Number Train, all bands)
- **Status:** `look_approved`
- **Production path(s):** `public/assets/images/train-station-proof.svg`;
  `public/assets/images/train-station-proof-mobile.svg` (bands-only phone
  crop of the same editable source — delete the five `train-*` prop layers
  and re-export)
- **Editable source path(s):** `design-source/number-train/train-station-proof.svg` (instances of the shared component library; the library gained `station-house`, `signal-post`, `skyline-blocks`, `sun-simple`, `cloud-puff`)
- **Creator:** Project developer (session-authored)
- **Creation date:** 2026-07-11
- **Creation tool:** Composed from the component library; editable in Inkscape 1.4.4; headless-render verified
- **Origin:** Category A original composition, adapting Category B motifs from the prior in-code station scene
- **Third-party elements:** None
- **AI assistance:** None
- **Commercial use / modification / distribution / public repository:** Project-owned, permitted
- **Contact sheet path:** `docs/captures/train-station/train-station-proof-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/train-station/train-station-proof-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/train-station/train-station-proof-mobile.webp`
- **Owner look approval:** APPROVED — the owner authorized the merge of
  #95 on 2026-07-12 ("Lets merge them if possible"); status `look_approved`
- **Restrictions and notes:** Counting-guardrail revision (2026-07-11, review): the cloud, signal lights, and town blocks are redrawn as single continuous silhouettes so the backdrop holds zero countable clusters; the library components were updated first and the scene + export re-derived from them. Reserved clear zones: title/progress strip, question line, the train band, the answer-card band. No digits or countable clusters in the backdrop (skyline blocks are abstract, low contrast) — the count evidence stays runtime-owned.

## Art studio room scene (proof)

- **Asset family:** Art studio backdrop scene (all-neutral)
- **Game:** Art (Bear Art Studio + legacy coloring, shared studio environment)
- **Status:** `look_approved`
- **Production path(s):** `public/assets/images/studio-room-proof.svg`;
  `public/assets/images/studio-room-proof-mobile.svg` (bands-only phone
  crop of the same editable source — delete the `studio-*` prop layers
  and re-export)
- **Editable source path(s):** `design-source/art-studio/studio-room-proof.svg` (instances of the shared component library; the library gained `wall-frame-dot`, `wall-frame-hill`, `art-shelf`)
- **Creator:** Project developer (session-authored)
- **Creation date:** 2026-07-11
- **Creation tool:** Composed from the component library with an authoring-time neutral-palette remap; editable in Inkscape 1.4.4; headless-render verified
- **Origin:** Category A original composition, adapting Category B motifs from the prior in-code studio scene
- **Third-party elements:** None
- **AI assistance:** None
- **Commercial use / modification / distribution / public repository:** Project-owned, permitted
- **Contact sheet path:** `docs/captures/art-studio/studio-room-proof-contact-sheet.webp`
- **Desktop screenshot path(s):** `docs/captures/art-studio/studio-room-proof-desktop.webp`
- **Mobile screenshot path(s):** `docs/captures/art-studio/studio-room-proof-mobile.webp`
- **Owner look approval:** APPROVED — the owner authorized the merge of
  #96 on 2026-07-12 ("Lets merge them if possible"); status `look_approved`
- **Restrictions and notes:** HARD GUARDRAIL — the art screens teach color, so the backdrop is ALL-NEUTRAL (every paint from the contract's neutral set; enforced by tests/modules/coloring.test.ts sweeping this shipped file). Reserved clear zones: request/bear strip, canvas, tool row, palette row.

## Emma voice pack (spoken prompts and story narration)

- **Asset family:** Recorded prompt/narration voice pack ("Emma")
- **Game:** All games (prompts, feedback, story narration); Story Stage is the
  showcase surface
- **Status:** `look_approved` (owner listen-approval, 2026-07-13: bakeoff of 7
  candidate voices -> kokoro bf_emma chosen; phonics pacing variant A —
  whole-line 0.75 speed — chosen by the owner)
- **Production path(s):** `public/assets/audio/voice/emma/<id>.mp3` (one clip
  per manifest line; 48 kbps mono, loudness-normalized)
- **Editable source path(s):** `src/content/voice/emma-voice-manifest.json`
  (line inventory; regenerated by `scripts/voice/build-voice-manifest.ts`) +
  `scripts/voice/generate_voice_pack.py` (the render recipe)
- **Creator:** Project developer (session-generated)
- **Creation date:** 2026-07-13
- **Creation tool:** Kokoro-82M TTS (Apache-2.0), voice `bf_emma`, run as an
  OFFLINE build tool (never a runtime dependency); ffmpeg encoding
- **Origin:** Category A original recordings of project-authored text
- **Third-party elements:** The Kokoro model weights (Apache-2.0) produced the
  audio; the spoken text is project-owned
- **AI assistance:** Yes — synthesized speech (Kokoro-82M, local, offline).
  No cloud service, no account, no child data involved at any point
- **Commercial use / modification / distribution / public repository:**
  Apache-2.0 model output, project-owned text — permitted
- **Owner look approval:** APPROVED (listen approval) — bakeoff winner chosen
  by the owner 2026-07-13; phonics pacing variant selected by the owner
- **Restrictions and notes:** Runtime plays local static clips only and falls
  back to device speech synthesis for any unpacked line (fail-open to the old
  behavior, never silent). Contract tests keep the manifest in lockstep with
  game content and require a shipped clip per line. Regeneration:
  `npx vite-node scripts/voice/build-voice-manifest.ts` then
  `python scripts/voice/generate_voice_pack.py --only-missing`.

## Tara voice pack (spoken prompts and story narration — default voice)

- **Asset family:** Recorded prompt/narration voice pack ("Tara")
- **Game:** All games; the parent picker default (Emma remains selectable)
- **Status:** `look_approved` (owner listen-approval 2026-07-13: picked the
  expressive Orpheus tara samples from the Round-2 bakeoff — 4 Orpheus
  voices vs the shipped Kokoro Emma)
- **Production path(s):** `public/assets/audio/voice/tara/<id>.mp3`
  (one clip per manifest line; 48 kbps mono, loudness-normalized; 14MB)
- **Editable source path(s):** `src/content/voice/tara-voice-manifest.json`
  + `scripts/voice/generate_voice_pack.py` (recipe incl. the curated
  performance map: <gasp> on the five story openings, <giggle> on the
  three celebration lines; clip ids hash the CLEAN text)
- **Creator:** Project developer (session-generated)
- **Creation date:** 2026-07-13
- **Creation tool:** Orpheus TTS (orpheus-3b-ft.gguf via LM Studio +
  Orpheus-FastAPI SNAC decoder in ~/Desktop/tts) run as an OFFLINE build
  tool; ffmpeg encoding; phonics clips atempo-slowed (owner pacing pick
  pending final tune, provisional 0.85)
- **Origin:** Category A original recordings of project-authored text
- **Third-party elements:** Orpheus model weights (Apache-2.0) produced the
  audio; the spoken text is project-owned
- **AI assistance:** Yes — synthesized speech (Orpheus-3B, local via
  LM Studio, offline). No cloud service, no account, no child data
- **Commercial use / modification / distribution / public repository:**
  Apache-2.0 model output, project-owned text — permitted
- **Owner look approval:** APPROVED (listen approval) — the owner pointed at
  orpheus-tara-expressive as the pick, 2026-07-13
- **Restrictions and notes:** Same runtime rules as the Emma pack: local
  static clips only, fail-open to device speech. Both packs share one line
  enumeration; the lockstep contract test sweeps BOTH. Regeneration:
  `npx vite-node scripts/voice/build-voice-manifest.ts` then
  `python scripts/voice/generate_voice_pack.py --pack tara --only-missing`.

## Dad voice pack (owner's cloned voice)

- **Asset family:** Recorded prompt/narration voice pack ("Dad")
- **Game:** All games; parent-picker option (Tara remains the default)
- **Status:** `look_approved` (owner listen-approvals 2026-07-13: v2 sample
  set signed off; story pacing tuned to calm + atempo 0.96 by the owner;
  phonics respelling variant A picked by the owner)
- **Production path(s):** `public/assets/audio/voice/dad/<id>.mp3`
- **Editable source path(s):** `src/content/voice/dad-voice-manifest.json`
  + `scripts/voice/generate_voice_pack.py` (--pack dad recipe incl. the
  phonics respell map). The owner's reference recording
  (~/Desktop/tts/juan-reference.wav) is deliberately NOT committed —
  personal voice data stays out of the repository; only rendered game
  lines ship.
- **Creator:** The project owner (voice); project developer (pipeline)
- **Creation date:** 2026-07-13
- **Creation tool:** Chatterbox TTS (MIT, Resemble AI) zero-shot clone of
  the owner's own 31s reference recording, run OFFLINE in a local venv;
  ffmpeg encoding. Chatterbox embeds an inaudible Perth watermark in
  generated audio by design.
- **Origin:** Category A — the owner's own voice, cloned with the owner's
  explicit consent, reading project-authored text
- **Third-party elements:** Chatterbox model weights (MIT)
- **AI assistance:** Yes — zero-shot voice cloning of the owner by the
  owner's request. No cloud service, no account, no child data
- **Commercial use / modification / distribution / public repository:**
  PUBLIC SHIPPING EXPLICITLY APPROVED by the owner (2026-07-13, "Ship it
  public") with the tradeoff surfaced: the rendered clips of the owner's
  cloned voice are publicly downloadable from the repo and the site
- **Owner look approval:** APPROVED (listen approvals across the
  juan-clone / v2 / v3-phonics sample sets)
- **Restrictions and notes:** Same runtime rules as the other packs: local
  static clips, fail-open to device speech. The clone may ONLY be used to
  render lines from the committed voice manifest — no other text without
  the owner's say-so. Regeneration requires the owner's local reference
  recording: `~/Desktop/tts/venv-chatterbox/bin/python
  scripts/voice/generate_voice_pack.py --pack dad --only-missing`.
