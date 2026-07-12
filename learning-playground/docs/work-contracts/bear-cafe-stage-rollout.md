# Bear Cafe stage rollout (art arc — post-approval slice)

The owner approved the pickup-window style by merging #92. Per the art
contract's rollout rule ("after approval, extend the accepted style to
the remaining stages"), this slice brings the phone, workbench, and
complete stages up to the approved look, and reconciles the approved
scene's elements into the shared component library.

## Before Code

### Root Cause

Only the delivery stage carries the approved production art. The audit
found the other stages colliding with the base environment: the phone
stage's tilted call card cuts through the menu board, lamp, and shelf
(progress dots sit ON the lamp); the workbench is the worst surface in
the app — order card through the window frame, food panel on the wall
shelf, menu lines bleeding under the Check area. And the approved
pickup-window elements live only in that scene's export — not yet in
the library, so nothing can reuse them.

### Correct Fix Must Touch

- `design-source/art-direction/cafe-component-library.svg` — the
  approved pickup elements become components: `awning-scalloped`
  (valance + half-disc scallops), `tile-wall` panel,
  `service-window-arch`, `counter-sill`. Geometry lifted from the
  APPROVED export so the style stays exactly what the owner signed.
- Stage quieting now that stages own richer content:
  `[data-stage='phone']` and `[data-stage='workbench']` fade
  `cafe-env__prop--minor` like delivery already does (0.28), so the
  base wall props stop fighting the interactive cards.
- Phone stage: the call card loses its tilt (the rotation makes the
  prop overlaps read as accidents) and centers in the stage like the
  delivery cluster (`margin-block: auto` pattern).
- Workbench stage: reserved-zone relief — the order card, check, tray,
  and food shelf sit over quieted props; the workbench food panel gets
  the approved cream/ink panel treatment (awning strip header from the
  library) replacing its collision-prone free-floating look.
- Complete stage: the celebration bear panel gets the counter-sill
  grounding so it reads as part of the cafe, not a floating card.
- `docs/art/asset-provenance.md` — pickup family status →
  `look_approved` (owner merged #92, 2026-07-11); new entries for the
  reconciled components and stage treatments.
- Captures per stage (desktop + mobile) + this contract.

### Must Not Change

- Zero gameplay/order/evidence/speech changes; the approved delivery
  scene stays byte-identical; protected games untouched.
- No new food/bear/tray art — existing runtime art is reused.

### Verification Plan

Full gate + live play-through of all five orders (phone → workbench →
delivery → complete) on desktop + 390×844 with captures; headless
render of any new library exports.

## Contract Amendments

- **Library reconciliation deferred**: `design-source/art-direction/`
  lives on the un-merged #93 branch — creating the same file here would
  guarantee a cross-PR conflict and couple this rollout to an
  unapproved PR. The four approved pickup components
  (awning-scalloped, tile-wall, service-window-arch, counter-sill) move
  into the library in a follow-up immediately after #93 merges. This
  slice ships what main supports: stage prop-quieting, phone/complete
  centering, the ledger flip, and captures.
- **Stage-name correction (live probe)**: the stage attribute set is
  `phone|make|fix|plating|delivery|handoff|complete` — there is no
  `workbench` stage. The first quieting draft enumerated stage names and
  silently missed `make`/`fix`/`plating`/`handoff` (probe: full-ink
  plant beside quieted props on the make stage). Fix: quiet
  `.cafe-env__prop--minor` under `.bear-cafe-environment` universally —
  no stage list to drift out of sync.
- **Phone card tilt kept**: the "tilt" is the cafeRing wobble animation
  (already reduced-motion-guarded), not a static rotation — with the
  wall props quieted it reads as charm, not collision; removing it
  would be scope creep.

## Cold Diff Audit

(to be completed after implementation)
