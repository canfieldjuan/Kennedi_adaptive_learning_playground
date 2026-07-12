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
- **Mobile screenshot path(s):** `docs/captures/video/bear-mixes-dough-vector-source-mobile.webp`; 390x215 source-scale review, not a runtime screenshot
- **Owner look approval:** Pending; deterministic proof replaces the owner-rejected generated-video direction
- **Restrictions and notes:** Review artifact only. Fourteen named Inkscape layers preserve exact Bear, hat, face, cafe, bowl, arm, grip, spoon, dough, and blink geometry. Chromium pauses and seeks the SVG timeline at each of 77 frame times; FFmpeg encodes single-threaded bit-exact VP9 with no audio and no inherited source metadata. Two independently cleaned full renders matched exactly: source SHA-256 `3fdf8aac7903e0c25478eb6c91eec6e53b618b791133fda20dc5c1a511f12984`, combined frame-set SHA-256 `fa802b6e28d788aa2e708d87b5ea85ae6424c16de88d6b8466cad7eebaeec115`, and WebM SHA-256 `ddfb83043806636d0cf16a775c90d8e21de11e6d96a2715c7a6f963741d9bdf1`. Generic deterministic FFmpeg encoder/duration fields remain; no prompt, authoring, source, or user metadata is present. No shipped video, narration, runtime, manifest, evidence, or approval behavior changed, and the game has no Inkscape, Chromium, FFmpeg, or renderer dependency at runtime.
