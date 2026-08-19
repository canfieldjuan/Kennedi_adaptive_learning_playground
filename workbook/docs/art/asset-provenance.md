# Art asset provenance

Tracks every AI-generated or AI-assisted illustration asset in `workbook/`.
Companion to `docs/design-system.md`'s Art Direction v2 section. Mirrors the
convention used by the main app's `learning-playground/docs/art/`.

**Status of everything on this page: DRAFT / OWNER VISUAL APPROVAL REQUIRED.**
None of it is wired into the real 6-page book (`src/content/book-1.mjs`).
It exists only as `dist-proof/` integration proof and `design-source/*/concepts/`
comparison material.

## Pipeline

1. **Generation**: FLUX.1-dev (GGUF Q8_0 quantized unet), running locally via
   ComfyUI (`~/Desktop/ComfyUI-master`, txt2img graph replicated in
   `workbook/tools/comfy-generate.py`). No cloud API, no Recraft (not
   connected in this environment -- see "Tooling note" below).
2. **Vectorization**: `workbook/tools/vectorize-line-art.sh` (ImageMagick
   threshold to pure black/white, then `potrace -s --flat` -> single
   compound-path SVG). Only run on B&W line-art generations (Mode B); color
   Mode A images are kept as raster PNG.
3. **Cleanup tooling available but not yet used**: Inkscape 1.2.2 (installed
   this session via `apt-get install inkscape` for this slice) is available
   as the canonical SVG editor/cleanup/export step per the design-source
   convention, for whenever a human (or a future pass) wants to hand-edit a
   traced path (simplify nodes, adjust proportions, etc.). Nothing here has
   been through manual Inkscape cleanup yet -- the potrace output was used
   as-is.

## Tooling note (read before regenerating anything)

Recraft MCP was requested first per the task brief but is **not connected**
in this environment: not present in `claude mcp list`, no API key in env.
Registering it requires the operator's own Recraft account/API key. The
local ComfyUI + FLUX.1-dev setup was already present on this machine
(`~/Desktop/ComfyUI-master`, models under `models/unet/`) and is what was
actually used -- Claude started the ComfyUI backend
(`start_comfyui.sh`) and called its HTTP API directly (the bundled
`comfyui_mcp_server.py` stdio MCP server was also registered via
`claude mcp add comfyui -- ...` for future sessions, but a newly-added MCP
server doesn't hot-load into an already-running session, so this session
talked to ComfyUI's HTTP API on :8188 directly rather than through the MCP
tool wrapper).

## Assets

| Asset | Path | Source | Date | Seed | Status |
|---|---|---|---|---|---|
| Kennedi concept A "Soft Modern" | `design-source/boss-kennedi/concepts/concept-a-soft-modern.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 700254593 | draft, not selected |
| Kennedi concept B "Bold Graphic" | `design-source/boss-kennedi/concepts/concept-b-bold-graphic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 395600475 | draft, #2 recommendation |
| Kennedi concept C "Textured Detailed" | `design-source/boss-kennedi/concepts/concept-c-textured-detailed.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 280033295 | draft, **#1 recommendation** |
| Kennedi concept D "Dynamic Athletic" | `design-source/boss-kennedi/concepts/concept-d-dynamic-athletic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 2747905419 | draft, not selected |
| Kennedi concept C, helping pose | `design-source/boss-kennedi/concepts/kennedi-c-help-pose.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 1289894415 | draft, used in page-6 integration proof; badge shows a stray "6" glyph artifact, needs a regenerate/fix pass before production |
| Puppy concept A "Floppy-Ear Classic" | `design-source/animals/puppy-concepts/concept-a-floppy-classic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 122563601 | draft, #1 recommendation (versatility) |
| Puppy concept B "Perky Energetic" | `design-source/animals/puppy-concepts/concept-b-perky-energetic.{png,svg}` | FLUX.1-dev + potrace (threshold 60, not default 70) | 2026-08-19 | 2045129096 | draft, situational use |
| Cover composition (color, Mode A) | `design-source/scenes/cover-concept-c-final.png` | FLUX.1-dev (color, no vectorization -- Mode A raster is acceptable) | 2026-08-19 | 2741432617 | draft, used in page-1 integration proof |
| Concept contact sheet | `docs/art/concept-contact-sheet.png` | ImageMagick `montage` of the 6 vectorized concepts above | 2026-08-19 | n/a | reference only |

All generation prompts are recorded verbatim in the workflow script that
produced them (`.claude` session transcript) and summarized in each concept
agent's own description embedded via the `label`/rationale in this table's
git history -- not duplicated here to avoid drift; regenerate by re-reading
the relevant `design-source/*/concepts/*.png` alongside this table if a
prompt needs to be recovered.

## Known issues / not yet done

- **Character consistency across poses is not solved.** The two Kennedi C
  images (standing-with-clipboard, helping-a-puppy) share the same prompt
  language and general silhouette but were generated independently (no
  ControlNet/IP-Adapter/LoRA character lock available in this pipeline) --
  they are close but not pixel-identical in proportion. A real pose library
  needs a proper character-consistency workflow before Pages 7+.
- **Badge artifact**: the helping-pose generation put a stray "6" inside
  Kennedi's badge circle (FLUX hallucination). Needs a regenerate or manual
  Inkscape fix before this specific image is production-eligible.
- **Small-icon legibility tradeoff**: on page 6 (the most content-dense page
  in the book), fitting the richer Concept C art into the existing layout
  required shrinking the hero illustration to ~0.5in, well below where its
  extra detail actually reads. See the "Print test findings" section of
  docs/design-system.md's Art Direction v2 for the recommended mitigation
  (a simplified icon-scale tier of the same character, closer to Concept B's
  economy of line, for anything under ~1in).
- No potrace/Inkscape node-count cleanup pass has been done. The traced SVGs
  are usable and print cleanly (verified via PDF rasterization) but are one
  large compound path each, not a hand-editable multi-part vector.
