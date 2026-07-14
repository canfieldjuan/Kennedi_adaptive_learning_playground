# Adding a Number Train World

A world pack changes the fantasy, not the learning contract. If your new
world needs a runtime branch, stop — the abstraction is being violated;
extend the pack type with a declared capability instead.

## The checklist

1. **Folder**: `src/modules/number-train/worlds/<world-id>/` with
   `<world-id>-art.ts` (renderers) and `<world-id>.world.ts` (manifest).
2. **Art, in the illustrated standard** (`game-environment.contract.md`):
   purple ink `#3a2461`, warm flat fills, clear silhouettes.
   **Counting guardrail is law**: the scene holds ZERO countable clusters
   (no discrete stars/birds/windows-in-rows; glows and towns are
   continuous shapes), and the passenger token stays high-contrast and
   countable at the standard seat size, in the same figure language
   (round face, dot eyes, smile).
3. **Manifest** (`NumberTrainWorldPack`): id, version, labels
   (spokenLabel!), previewSvg, vehicleFrontSvg, passengerSvg,
   mountEnvironment, full palette (dark skies NEED honest
   textInk/textSoft), completion destination, customization slots
   (semantically parallel to `vehicle_accent`/`vehicle_badge` where
   honest), mobile mode, reducedMotion declaration, provenanceRef.
4. **Accent regions**: parts of the vehicle art that should recolor use
   `fill="var(--vehicle-accent, <default>)"`.
5. **Register** in `world-registry.ts`. The default stays Train Station.
6. **Style proof BEFORE the full build**: render one representative
   count round via a temporary resolve patch (never committed), capture
   desktop + 390×844 side-by-side with an existing world, and get the
   owner's look approval. Then finish the world.
7. **Provenance**: ledger entry in `docs/art/asset-provenance.md` +
   layered editable mirror under `design-source/number-train/worlds/`.
8. **Voice**: nothing to wire — the collector reads the registry. Run
   `npx vite-node scripts/voice/build-voice-manifest.ts` then render the
   new clips in ALL THREE packs
   (`generate_voice_pack.py --pack {tara,emma,dad} --only-missing`).
   CI fails until every new spoken line has a clip in every pack.
9. **Gate**: the contract tests validate your manifest automatically
   (registry sweep) and enforce zero world ids in the runtime. Full
   `npm test` + typecheck + build + live captures.

## What you may NOT do

- Branch the runtime on a world id (the contract test will catch you).
- Lock, price, meter, or randomize access to a world or a customization
  choice (reward contract).
- Add countable decoration to a counting game's scenery.
- Ship spoken lines outside the enumeration (they'd fall back to the
  robot voice — the lockstep test catches new lines, but only if they
  flow through the manifest/registry).
- Change quantity grouping, evidence, hints, or a11y semantics — the
  protected behavior map in the arc contract is the law.
