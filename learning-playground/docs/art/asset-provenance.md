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

## Bear Bakes Bread Mixing Video Proof

- **Asset family:** Bear Bakes Bread mixing-beat video proof
- **Game:** Video Vault / Bear Bakes Bread
- **Status:** `draft`
- **Production path(s):** None; the selected proof is review-only at `docs/captures/video/bear-mixes-dough-proof.webm`
- **Editable source path(s):** `design-source/video/bear-bakes-bread/mix-dough-source.svg`, `design-source/video/bear-bakes-bread/workflow.json`, `design-source/video/bear-bakes-bread/workflow-api.json`, `design-source/video/bear-bakes-bread/render-manifest.json`, `design-source/video/bear-bakes-bread/prompts.md`, `design-source/video/bear-bakes-bread/environment.json`
- **Creator:** Project developer, Codex video-production proof session
- **Creation date:** 2026-07-11
- **Creation tool and version:** Inkscape 1.4.4 Flatpak; ComfyUI 0.25.0; Wan2.2 TI2V 5B; FFmpeg 6.1.1
- **Origin category:** B project-owned source, transformed into an AI-assisted review proof
- **Original or third-party status:** Project-owned source illustration plus non-exclusive AI-assisted output; no claim that the generated motion is original, exclusive, or independently copyrightable
- **Project-owned source material used:** Existing Bear Bakes Bread mixing illustration from `public/assets/images/video-bear-mixes-dough.svg`, adapted as the editable 1280x704 source frame
- **Third-party elements:** Wan2.2 TI2V 5B model, Wan2.2 VAE, and UMT5 text encoder used only as external authoring dependencies; no third-party visual input, LoRA, custom node, cloud node, stock asset, font, character, or voice
- **Source URL(s):** `https://huggingface.co/Wan-AI/Wan2.2-TI2V-5B`, `https://github.com/Wan-Video/Wan2.2`
- **License name and version/date:** Apache License 2.0 for the Wan2.2 model files; model publisher states it claims no rights over generated content
- **License file path:** External model license at the source URLs; model weights and license are not redistributed by this repository
- **Commercial use permitted:** yes under the published model terms, subject to lawful use and unresolved source-by-source training-data provenance
- **Modification permitted:** yes
- **Software distribution permitted:** yes for this review output; model weights are not distributed
- **Public repository distribution permitted:** yes for this review output under the published model terms; model weights are not distributed
- **Continued use after subscription ends:** not applicable; all authoring tools and weights are local
- **Attribution requirement:** Apache-2.0 notice applies to redistributed model files; none are redistributed here
- **AI assistance:** reference only
- **AI approval/terms record:** Owner authorized the private one-beat proof on 2026-07-11 after disclosure that training-data provenance is incomplete, no indemnification is provided, outputs are not assumed exclusive or copyrightable, and production use requires a separate owner look decision; see `docs/work-contracts/comfy-bear-video-one-beat-proof.md`
- **Contact sheet path:** `docs/captures/video/bear-mixes-dough-four-seed-contact-sheet.webp`
- **Desktop screenshot path(s):** Not applicable; no runtime integration in this proof
- **Mobile screenshot path(s):** Not applicable; no runtime integration in this proof
- **Owner look approval:** Pending; seed `31415926` was selected for owner review after all four fixed candidates were inspected
- **Restrictions and notes:** Review artifact only. The selected seed preserves the bear silhouette and scene while moving the spoon through the bowl; seeds `11235813` and `27182818` showed long final freezes, and seed `27182818` also distorted the reaching arm. Exact model SHA-256 values, prompts, seeds, graph bindings, environment, and generation limits are recorded in the editable source bundle. The current child-visible WebM, human narration, video manifest, runtime, evidence, and approval behavior are unchanged. No unlisted stock or library element remains, and the game does not depend on Inkscape, ComfyUI, Wan2.2, or FFmpeg at runtime.
