# Number Train World Packs — Arc Audit (slice 7)

Arc: PRs #121 (boundary) → #122 (extraction) → #124 (style proof, owner
look approval) → #125 (Space Shuttle world) → #126 (Kennedi picks) →
#127 (ownership customization). Governing contract:
`docs/work-contracts/number-train-world-packs.md`.

## Proof criteria (spec §25) — verdicts

| Criterion | Verdict | Evidence |
| --- | --- | --- |
| One runtime, both worlds | ✔ | `NumberTrainActivity.ts` is the only runtime; worlds enter via `resolveNumberTrainWorld` |
| One round generator / evaluator | ✔ | `buildSessionPlan` and the three round renderers take no world input at all |
| Equivalent evidence | ✔ | `createAttemptEvent` untouched by the arc; decoration emits zero events (test-pinned, #127) |
| Quantity structure preserved | ✔ | `SEATS_PER_CAR`, car math, and seat aria labels unchanged; ten-pod grid identical in both worlds (captures) |
| Accessibility preserved | ✔ | Same buttons/labels/announcements; selector cards and decor chips carry aria-label + aria-pressed |
| Mobile behavior | ✔ | station: bands-only `<picture>` swap; shuttle: inline-crop (declared mode) — world-choice and session verified at 390×844 (captures) |
| Second world = manifest + assets | ✔ | The shuttle is one manifest + one art module; the runtime gained exactly one declared capability (arrival flavor line) |
| No world conditionals in core | ✔ | Contract-test pinned: zero world ids in the runtime (the legacy `.train-station` screen-scope class is pinned to exactly one occurrence) |
| Exact customization through completion | ✔ | Browser-verified chain (#127 captures): blue+moon → arrival → record → keepsake |

## Reduced motion

The arc added **no new animation**: both worlds' scenes are static SVG;
the selector and decor beats use the existing `--transition-bounce`
hover transforms only. The pre-existing `prefers-reduced-motion` blocks
(pinned by the mobile contract tests) are unchanged and apply to both
worlds identically, satisfying each pack's declared
`reducedMotion.nonessentialAnimationDisabled`. No reduced-motion-only
capture differs from the standard captures because there is no
world-specific motion to disable.

## Accessibility notes

- World cards: `aria-label` = world label, `aria-pressed` selection
  state, spoken label on tap through the voice packs.
- Decor chips: `aria-label` = "slot: choice", `aria-pressed`; the badge
  overlay is `aria-hidden` (decorative duplicate of the chip semantics).
- Keepsake: single descriptive `aria-label` ("Your last trip: …"); its
  art is `aria-hidden`.
- Scenes remain `aria-hidden` + `pointer-events: none` in both worlds.
- Dark-sky readability is a validated palette capability (textInk /
  textSoft), not a per-world CSS patch.

## Performance notes

- Zero network requests added: all world art is inline SVG in code; no
  fonts, no fetches, no remote refs (validator-enforced).
- Both worlds' art modules are small TS files; scenes render as one SVG
  element each. No measurable bundle concern (production build passes
  with the same chunk profile).
- Timers/listeners ride the existing `cleanupHandlers`/session-cleanup
  discipline; the decorate beat registers its listeners there.
- No lazy-loading infrastructure was built — asset weight does not
  justify it (spec §24 explicitly defers this).

## Provenance

- Space Shuttle world: ledger entry (look approval = #124 merge) +
  layered design-source mirror.
- Train Station: the scene has its own ledger entry from the visual
  arc; the engine/passenger in-code art predates the ledger and remains
  Category B project-owned legacy (noted, not silently re-labeled).

## Voice

World labels, flavor lines, the selector prompt, the decorate prompt,
and every customization slot/choice label **self-enumerate from the
registry** into the voice pipeline — 487 lines × 3 packs, lockstep
contract-tested. A third world's lines join automatically (and CI fails
until its clips are rendered — by design).

## Cold diff summary (arc-wide)

Every file the arc touched belongs to one of: the world boundary
(types/validator/registry/preference/trip-history), the two world
manifests + art, one runtime capability (arrival flavor) + the two
child-facing beats (selection, decoration), scoped CSS, storage/export/
clear plumbing that mirrors the cafe pattern, tests, docs, and voice
enumeration. No other game changed; no evidence shape changed; no
learning behavior changed. The one legacy naming wart (`.train-station`
screen-scope class) is documented and test-pinned rather than churned.

## Future seams (documented only — NOT built, per spec §29)

The pattern that would generalize: game-owned pack types + registry +
validator; palette as scoped CSS variables with current values as
fallbacks; scene/vehicle/token as semantic renderer slots; selection as
a child pick; expressive slots feeding a capped completion record.
Candidates when their arcs call for it: Bear Café (Moon Bakery, Forest
Picnic Stand), Art Studio (Underwater Studio, Garden Workshop), Words
(Magic Stage, Forest Camp). Story Stage and the Story Vault stay
content-driven: their settings ARE authored content, not swappable
presentation.
