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

## Cafe component library (shared)

- **Asset family:** Playground cafe component library (window, sill cat, plants, hanging Bear Cafe sign with lettering-free bear emblem, hanging lamp, counter block, cookie jar, cake stand, cocoa cup)
- **Game:** Shared across games (canonical component source for scene composition)
- **Status:** `rights_verified`
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
- **Restrictions and notes:** Canonical shared components — scenes must instance these rather than redraw one-off props; new props are added here first. No fonts anywhere (the old sign's system-font `<text>` is replaced by the bear emblem).

## Home room scene (proof)

- **Asset family:** Child home backdrop scene
- **Game:** Home screen
- **Status:** `rights_verified` (owner look approval pending)
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
- **Owner look approval:** Pending — recorded by the owner's merge of this
  proof PR (owner merge IS the approval act, per the #92 -> #100 precedent);
  the post-merge rollout PR flips this line to `look_approved`. Only the
  owner merges proof PRs, so this asset cannot reach child mode without the
  approval having happened. Do not extend the style until then.
- **Restrictions and notes:** Reserved clear zones (card grid center, greeting strip, Parent button corner) are load-bearing: props live in the margins only. Mobile cover-crop lands on the reserved center by design — a props-free wall; whether mobile should peek a prop is an owner look call.

## Words workshop scene (proof)

- **Asset family:** Pip's Word Workshop backdrop scene
- **Game:** Words (all three modes: find, blending, builder)
- **Status:** `rights_verified` (owner look approval pending)
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
- **Owner look approval:** Pending — recorded by the owner's merge of this
  proof PR (owner merge IS the approval act, per the #92 -> #100 precedent);
  the post-merge rollout PR flips this line to `look_approved`. Only the
  owner merges proof PRs, so this asset cannot reach child mode without the
  approval having happened. Do not extend the style until then.
- **Restrictions and notes:** HARD GUARDRAIL preserved — nothing reads as a letter, word, tile, or choice (plain spines, abstract pin-board, no `<text>`). Reserved clear zones: title/prompt strip, Pip column, the card/tile band. Portrait crop intentionally exits both edge prop groups.

## Number Train station scene (proof)

- **Asset family:** Number Train station backdrop scene
- **Game:** Math (Number Train, all bands)
- **Status:** `rights_verified` (owner look approval pending)
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
- **Owner look approval:** Pending — recorded by the owner's merge of this
  proof PR (owner merge IS the approval act, per the #92 -> #100 precedent);
  the post-merge rollout PR flips this line to `look_approved`. Only the
  owner merges proof PRs, so this asset cannot reach child mode without the
  approval having happened. Do not extend the style until then.
- **Restrictions and notes:** Counting-guardrail revision (2026-07-11, review): the cloud, signal lights, and town blocks are redrawn as single continuous silhouettes so the backdrop holds zero countable clusters; the library components were updated first and the scene + export re-derived from them. Reserved clear zones: title/progress strip, question line, the train band, the answer-card band. No digits or countable clusters in the backdrop (skyline blocks are abstract, low contrast) — the count evidence stays runtime-owned.
