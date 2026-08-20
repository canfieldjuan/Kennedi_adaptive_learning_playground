# Art asset provenance

Tracks every AI-generated or AI-assisted illustration asset in `workbook/`.
Companion to `docs/design-system.md`'s Art Direction v2 section. Mirrors the
convention used by the main app's `learning-playground/docs/art/`.

**Status of everything on this page: DRAFT / OWNER VISUAL APPROVAL REQUIRED.**
None of it is wired into the real 6-page book (`src/content/book-1.mjs`).
It exists only as `dist-proof/` integration proof and
`design-source/*/concepts/` + `design-source/*/locked-poses/` +
`design-source/*/simplified-tier/` comparison material.

## 2026-08-19: Character-lock slice (current)

Concept C ("Textured Detailed") was approved as the canonical direction.
This slice's job was narrower: prove Kennedi stays recognizably the same
child across 8 poses, build a simplified small-print tier, lock a canonical
puppy, and fix the known badge artifact. Full writeup of what was tried,
what worked, and what didn't: `docs/design-system.md`'s Art Direction v2
section ("Character-lock mechanism" and "What actually worked / didn't").

**Both known issues from the previous slice are now fixed:**
- Character consistency: solved via FLUX.1 Redux (style/subject transfer)
  from a single clean neutral reference image, NOT plain repeated text
  prompts. See mechanism writeup in design-system.md.
- Badge artifact: the stray "6" in the old help-pose image, AND a
  previously-unreported stray glyph in the cover image's badge (looked like
  a "Y"), are both fixed by regenerating with explicit "plain round badge,
  simple star only, no letters/numbers" language. Neither old asset is
  referenced anywhere anymore.

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

## Assets: concept-comparison phase (previous slice)

| Asset | Path | Source | Date | Seed | Status |
|---|---|---|---|---|---|
| Kennedi concept A "Soft Modern" | `design-source/boss-kennedi/concepts/concept-a-soft-modern.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 700254593 | draft, not selected |
| Kennedi concept B "Bold Graphic" | `design-source/boss-kennedi/concepts/concept-b-bold-graphic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 395600475 | draft, not selected as primary (informed the simplified tier's economy-of-line goal) |
| Kennedi concept C "Textured Detailed" | `design-source/boss-kennedi/concepts/concept-c-textured-detailed.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 280033295 | **approved direction** -- superseded as the pose-1 asset by `locked-poses/02-hero-clipboard.svg` below (regenerated for cross-pose consistency + badge fix); kept for history |
| Kennedi concept D "Dynamic Athletic" | `design-source/boss-kennedi/concepts/concept-d-dynamic-athletic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 2747905419 | draft, not selected |
| ~~Kennedi concept C, helping pose~~ | ~~`design-source/boss-kennedi/concepts/kennedi-c-help-pose.{png,svg}`~~ | FLUX.1-dev + potrace | 2026-08-19 | 1289894415 | **SUPERSEDED -- do not use.** Badge showed a stray "6" glyph artifact. Replaced by `locked-poses/04-helping.svg`. |
| Puppy concept A "Floppy-Ear Classic" | `design-source/animals/puppy-concepts/concept-a-floppy-classic.{png,svg}` | FLUX.1-dev + potrace | 2026-08-19 | 122563601 | **approved as canonical puppy base** -- reused directly as `locked-poses/01-sitting.svg` |
| Puppy concept B "Perky Energetic" | `design-source/animals/puppy-concepts/concept-b-perky-energetic.{png,svg}` | FLUX.1-dev + potrace (threshold 60, not default 70) | 2026-08-19 | 2045129096 | draft, not the canonical base per owner decision |
| Concept contact sheet | `docs/art/concept-contact-sheet.png` | ImageMagick `montage` of the 6 vectorized concepts above | 2026-08-19 | n/a | reference only |

## Assets: character-lock phase (this slice, 2026-08-19)

All generated via `workbook/tools/comfy-generate-redux.py` (FLUX.1 Redux
style/subject transfer from a reference image + a new text prompt per pose),
then `workbook/tools/vectorize-line-art.sh` (potrace, threshold 70 unless
noted). Reference image for all Kennedi poses:
`design-source/boss-kennedi/locked-poses/01-neutral.png` (the clean neutral
standing pose, itself plain FLUX.1-dev, no Redux). Reference for all puppy
poses: `concept-a-floppy-classic.png` above.

**8-pose Kennedi consistency sheet** (`design-source/boss-kennedi/locked-poses/`,
sheet image: `docs/art/kennedi-consistency-sheet.png`):

| # | Pose | File | Redux strength | Notes |
|---|---|---|---|---|
| 1 | Neutral / front standing | `01-neutral.{png,svg}` | n/a (this IS the reference) | clean star badge, no artifacts |
| 2 | Hero + clipboard | `02-hero-clipboard.{png,svg}` | 0.08 | regenerated for cross-pose consistency; took 5 attempts before the clipboard rendered convincingly held (see "What didn't work" below) |
| 3 | Waving | `03-waving.{png,svg}` | 0.2 | |
| 4 | Helping / bending | `04-helping.{png,svg}` | 0.08 | true kneeling pose; took 2 attempts (first attempt at 0.08 improved on the failed 0.2 attempt but wasn't kneeling low enough) |
| 5 | Pointing | `05-pointing.{png,svg}` | 0.2 | |
| 6 | Sitting + writing | `06-sitting-writing.{png,svg}` | 0.08 | first attempt at 0.2 failed to sit at all (stayed standing) |
| 7 | Thinking | `07-thinking.{png,svg}` | 0.08 | 3rd attempt; final pose is arms-crossed (not literal hand-on-chin) -- accepted as a valid "thinking" read, artifact-free, after the hand-on-chin version had a stray badge glyph |
| 8 | Celebrating / excited | `08-celebrating.{png,svg}` | 0.2 | |

**Simplified small-scale tier** (`design-source/boss-kennedi/simplified-tier/`):
NOT generated via a "simplify" prompt (see "What didn't work" below). Instead,
the already-correct locked poses 02/04/05 were re-traced with looser potrace
parameters (`-t 20 -O 1.0 -a 1.2` vs the default `-t 2 -O 0.2`), which merges
small speckles and smooths curves for a ~25% smaller/simpler path (measured:
hero 38148->28022 bytes, helping 37215->28074, pointing 31583->24521).
Validated empirically at real print size -- see Print test findings below.

**Canonical puppy pose sheet** (`design-source/animals/locked-poses/`, sheet
image: `docs/art/puppy-consistency-sheet.png`):

| # | Pose | File | Redux strength | Notes |
|---|---|---|---|---|
| 1 | Sitting (canonical base) | `01-sitting.{png,svg}` | n/a (this IS the reference, = concept-a-floppy-classic) | |
| 2 | Reaching | `02-reaching.{png,svg}` | 0.15 | 4 attempts: 2 blank-image generation failures (rare model failure, unrelated to prompt), 2 framing failures (puppy too small in frame) |
| 3 | Happy / alert | `03-happy-alert.{png,svg}` | 0.15 | 3rd attempt; first two had faint/pale-gray linework unsuitable for print, fixed with explicit "bold thick solid black, not thin or faint" language |
| 4 | Playing | `04-playing.{png,svg}` | 0.15 | 3rd attempt; first was a blank-image failure, second had faint lines (same fix as above) |

**Cover composition, badge-fixed** (`design-source/scenes/cover-concept-c-final.png`,
overwrites the previous-slice file at the same path): FLUX.1-dev, color, no
Redux (single generation, no cross-pose consistency needed for one hero
image). The previous-slice cover had an unreported stray glyph (looked like
"Y") inside the badge, found during this slice's verification pass and fixed
by regenerating with explicit "plain round badge, simple star only, no
letters/numbers" language. Seed: new generation, not recorded (accepted on
first attempt after the badge-language fix).

**Print-size test sheet**: `dist-proof/print-size-test.html` /
`dist-proof/print-size-test.pdf` / `dist-proof/pdf-raster/size-test-*.png`
(300dpi rasterization of the actual PDF). Shows the 3 simplified-tier Kennedi
poses + 2 puppy poses at 0.75in, 1.0in, 1.5in in dashed-border boxes.

## Character-lock mechanism (read before generating more poses)

Plain repeated text prompts do NOT lock character identity across FLUX
generations -- confirmed by direct comparison in the previous slice (the
`concept-c-textured-detailed` and `kennedi-c-help-pose` images share a prompt
template but are visibly different children on close inspection: different
bangs, different skirt cut, different badge treatment).

The fix: **FLUX.1 Redux** (`models/style_models/flux1-redux-dev.safetensors`
+ `models/clip_vision/sigclip_vision_patch14_384.safetensors`, both already
present in this ComfyUI install). It encodes a reference image via SigCLIP
and merges that encoding into the text conditioning before sampling
(`workbook/tools/comfy-generate-redux.py`, nodes: `CLIPVisionLoader` ->
`CLIPVisionEncode` -> `StyleModelLoader` -> `StyleModelApply` ->
`FluxGuidance` -> `KSampler`). This is genuinely different from "same seed"
or "same prompt" -- it conditions on the actual reference image's visual
identity.

**What actually worked:**
- A **clean neutral reference** (plain standing pose, empty hands, no held
  objects) as the Redux source, NOT a reference already holding a prop --
  Redux carries over held objects/props from the reference far more
  strongly than it carries over arm-gesture-only changes.
- **Redux strength 0.08** for anything that changes body posture (sitting,
  kneeling) or adds/removes a held object (clipboard, pencil). Strength 0.2+
  reliably reproduced the reference's standing pose/empty-hands almost
  unchanged regardless of the text prompt.
- **Redux strength 0.15-0.2** worked fine for arm-gesture-only changes that
  keep the body standing (waving, pointing, celebrating).
- Explicitly describing the badge every time ("a round badge with a star
  inside pinned on her collared shirt") -- Redux alone doesn't reliably
  carry small design details like a badge at low strength.
- Explicitly countering two recurring failure modes in the prompt itself:
  "bold thick solid black outlines (not thin or faint)" fixed a pattern of
  washed-out/pale-gray output on some generations; "plain round badge, a
  simple star only, no letters, no numbers" fixed recurring hallucinated
  glyphs inside the badge (this hit 3 separate images across both slices:
  the help-pose "6", the cover's "Y"-like glyph, and one mid-process
  thinking-pose attempt).

**What didn't work (tried and abandoned, so the next person doesn't repeat
it):**
- Asking FLUX to "simplify" the linework via prompt language ("very
  simplified bold icon style, minimal interior lines") while still using
  Redux from the detailed reference -- output either stayed nearly as
  detailed as the source, or in one case (the "helping" simplified attempt)
  came out with badly faded/pale linework and the wrong pose. Abandoned in
  favor of the potrace-parameter approach described above.
- Blurring the raster image before thresholding, to make fine hair-strand
  detail disappear before vectorizing -- this works for filled regions but
  is actively destructive on stroke/outline art: thin lines fragment into
  broken speckles rather than smoothing away. One quick test confirmed this
  and it was not pursued further.
- Redux at 0.12-0.2 for "hero + clipboard" specifically -- 4 attempts, all
  either dropped the clipboard entirely (reverting to the neutral reference's
  empty-hands pose) or rendered it as a disconnected floating object with
  hands not actually gripping it. Only succeeded once strength dropped to
  0.08 with a prompt describing both arms wrapped around the clipboard.

## Known issues / not yet done

- **Small-icon legibility**: validated empirically this slice (see Print
  test findings) -- simplified-tier assets read clearly down to 1.0in and
  are borderline-but-usable at 0.75in (silhouette and face stay legible;
  fine detail like the badge star compresses to "a small decoration" rather
  than a clearly star-shaped mark at that size). 1.5in+ is fully clean.
- **Pose 7 ("thinking") is arms-crossed, not literal hand-on-chin.** A
  hand-on-chin version was successfully generated but had a stray badge
  glyph; the arms-crossed version was clean and accepted as a valid
  "thinking" read rather than spending further generation budget chasing
  the exact gesture.
- **No LoRA/ControlNet training was done.** The Redux mechanism is a strong
  practical fix but is still probabilistic -- expect an occasional
  regeneration to be needed when producing new poses later, using the same
  neutral reference + the strength guidance above.
- No potrace/Inkscape node-count cleanup pass has been done beyond the
  parameter-based simplified tier. The traced SVGs print cleanly (verified
  via PDF rasterization at 150-300dpi) but are single compound paths, not
  hand-editable multi-part vectors.
- The page-6 integration proof's "walk away" choice-card icon is
  intentionally left as the OLD programmatic `bossKennedi('walkAway')` SVG
  (no locked-pose equivalent was generated -- "walking away" wasn't one of
  the 8 required poses). This is a deliberate old/new contrast in the proof,
  not an oversight, but it means that one proof page still mixes styles.
