# Editable Art Source

This is the single repository root for editable production-art source governed
by `docs/contracts/art-production-assets.contract.md`. Production exports remain
in the application's established local asset locations; this directory does not
replace or duplicate `public/assets/` or game-owned runtime modules.

Create game folders only when approved source files exist. Use this structure:

```text
design-source/
  art-direction/
  bear-cafe/
  words/
  bear-art-studio/
  number-train/
  story-stage/
  video-vault/
```

Each graphics PR should commit only the editable source used by its approved
exports. Prefer a standards-based SVG source alongside proprietary `.fig`,
`.afdesign`, or `.ai` files when practical. Do not commit autosaves, caches,
temporary exports, duplicate artboards, unused concepts, or unbounded revision
history.

The corresponding production and source paths must be recorded together in
`docs/art/asset-provenance.md`.
