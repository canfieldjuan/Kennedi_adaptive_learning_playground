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
sheet image: `docs/art/kennedi-consistency-sheet.png`, built by
`tools/make-kennedi-consistency-sheet.sh` -- ImageMagick `montage` of the eight
locked PNGs; that script reproduces the original 2026-08-19 sheet with 0
differing pixels from the poses of that date. Regenerated 2026-09-24 after the
face + hair lock below. The Redux strengths in this table record how each
pose's body was generated; every head was repainted afterwards):

| # | Pose | File | Redux strength | Notes |
|---|---|---|---|---|
| 1 | Neutral / front standing | `01-neutral.{png,svg}` | n/a (this IS the reference) | clean star badge, no artifacts |
| 2 | Hero + clipboard | `02-hero-clipboard.{png,svg}` | 0.08 | regenerated for cross-pose consistency; took 5 attempts before the clipboard rendered convincingly held (see "What didn't work" below) |
| 3 | Waving | `03-waving.{png,svg}` | 0.2 | |
| ~~4~~ | ~~Helping / bending~~ | ~~`04-helping.{png,svg}`~~ | ~~0.08~~ | **SUPERSEDED 2026-09-23** -- failed 6 of 10 locked identity traits; replaced at the same path (see "2026-09-23: 04-helping replaced" below). Original notes: true kneeling pose; took 2 attempts (first attempt at 0.08 improved on the failed 0.2 attempt but wasn't kneeling low enough) |
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
(Committed proof artifacts predate the 2026-09-23 04-helping replacement and
were not rebuilt; they still show the old helping pose.)

## 2026-09-23: 04-helping replaced

**Why.** A character-consistency audit of the eight locked poses, scored
against design-system.md's "Locked identity traits", found `04-helping`
failing 6 of 10: older-looking face with smaller almond eyes, hair down with
one tie (not two pigtails), puffy shorts (not the pleated skirt), no socks,
barefoot. The other seven poses were scored as holding (identity >=3/4 vs
`01-neutral` in 6 of 7). **Corrected 2026-09-24:** that audit scored trait
*presence* (has pigtails, has eyelashes), not whether the faces matched --
side by side at equal scale all eight faces and hairstyles differed. See
"2026-09-24: face + hair lock" below. Cause, confirmed by reproduction: re-running the prompt embedded in the
old PNG's metadata with its recorded seed (2845242026) and strength (0.08)
regenerates the old PNG pixel-identically. That prompt never mentioned
socks, shoes, face, eyes or age, and omitted both guard phrases from "What
actually worked" below. The old puppy was also not the canonical puppy.

**Base generation** -- `tools/comfy-generate-redux.py` (unmodified),
reference `01-neutral.png` (via `kennedi-lock/kennedi-neutral-clean.png`,
byte-identical), Redux **0.08**, seed **202**, 30 steps, 1024x1024. Prompt:

> black and white line art, coloring-book style illustration, bold thick
> solid black outlines (not thin or faint) on a pure white background, no
> color, crisp clean sharp lines, clearly visible hands with five fingers
> each. The same young preschool-age girl character, about four years old,
> round chubby face, big round eyes with eyelashes, two high pigtails each
> tied with a small hair tie, a collared polo shirt with a plain round badge
> pinned on it (a simple star only, no letters, no numbers), a knee-length
> pleated skirt, short white socks and sneakers on both feet, full body,
> centered in frame, crouching down low on both bent knees close to the
> ground, upper body leaning far forward, one hand reaching out to gently
> pet a small friendly puppy sitting on the ground right in front of her,
> warm caring expression, looking down at the puppy.

Selected by the owner from 15 candidates (seeds 101/202/303 plus the
original seed, strengths 0.08 and 0.12, plus a one-knee / skirt-draped
prompt round). Finding: in this pipeline a low crouch and the full attribute
bundle compete -- more trait text pulls Redux back toward the standing
reference, and every low crouch rendered the skirt as shorts. Strength 0.12
reverted all four seeds to standing.

**Repairs** -- FLUX.1 Fill (`flux1-fill-dev-Q6_K.gguf`, guidance 30, 28
steps, euler/simple, DifferentialDiffusion), each result composited back
onto the base through its own feathered mask, so pixels outside each mask
are unchanged (verified: 0 changed pixels outside every mask):

1. Stray tail on her back removed -- Fill seed 33.
2. Six-digit hand corrected to thumb + four fingers -- Fill seed 203
   (6 seeds tried; 2 still had six digits).

**Canonical puppy** -- `animals/locked-poses/01-sitting.png` composited in
front of her (no generation): silhouette-masked, scaled to 225px tall,
bottom-right corner at (428, 898), outlines thickened 1px so its line weight
matches Kennedi's (5.7px). The replaced dog's pixels were refilled from
background; its leftover leg line and toe loop between the puppy and her
hand were then removed and that strip refilled with the flat ground-shadow
grey behind her hand. Grey tones vanish at the 70% vectorization threshold,
so the SVG carries line work only.

**Accepted deviations from the locked traits** (owner decision): puffy
shorts instead of the pleated skirt, and a small rectangular badge instead
of the round star badge.

**Derived files** -- `04-helping.svg` via `tools/vectorize-line-art.sh`
(default threshold); `simplified-tier/04-helping-simplified-source.png` is
the new PNG, and `04-helping-simplified.svg` is traced with the documented
looser parameters (threshold 70% + `potrace -s --flat -t 20 -O 1.0 -a 1.2`;
the same command reproduces the previous simplified SVG byte-for-byte). The
page-6 picture-card crop was re-measured on the new SVG (outer-`<svg>`
`getBBox()` x=264.0 y=79.2 w=473.4 h=818.8 -> viewBox `42 30 917 917`); the
same tool reproduces the old documented bbox and crop exactly. (Superseded
2026-09-24 by the face + hair lock, which re-measured this crop again.)

**Not in this repo:** the Fill-repair and puppy-composite scripts were run
from a scratch workspace outside the repo; the parameters above are the full
record.

## 2026-09-24: face + hair lock (all 8 poses)

**Why.** Owner review of the consistency sheet: "the faces and some features
are different among the different pictures." At equal face width the eight
poses showed eight similar girls: eyes (small dots / large glossy /
heavy-lashed), nose (none / curve / prominent "c" / freckled), bangs
(curtain / swept / center part / spiky), pigtails (curly / long straight /
short high puffs), and apparent age all varied. Cause: Redux strength is
asked to carry both pose change and identity. Posture changes need ~0.08
(0.2+ snaps back to the standing reference, see "What actually worked"),
and at 0.08 Redux transfers style and outfit but almost none of the face,
so FLUX invents a new face every pose.

**Fix: separate the two jobs.** Keep each pose's body exactly as drawn and
repaint only the head (face + hair + pigtails) against one canonical head.
Every repaint below is FLUX.1 Fill (`flux1-fill-dev-Q6_K.gguf`, guidance 30,
28 steps, euler/simple, DifferentialDiffusion), composited back onto the pose
through its mask feathered with a 3px Gaussian. **Verified for every pose:
0 changed pixels outside the head mask plus feather margin** (for 04 also
outside the strip above its head that was cleared of the old hair puffs).

**Canonical head -- `locked-poses/07-thinking.png` (owner pick).** 07's
original body and hair, with only its face repainted: Fill + Redux strength
**0.6**, seed **2**, reference = the pre-2026-09-24 `01-neutral` head crop
(x 300-720, y 40-460), face mask = ellipse center (507,252), radii 110x104.
Head-only Redux can run far above 0.08 because the pose is not regenerated.
Prompt: `<STYLE>. Close-up of <FACE>, a calm thoughtful expression, small
closed-mouth smile.`

**Other seven poses -- in-context head lock.** One 2048x1024 canvas: the
canonical `07-thinking.png` on the left half, the target pose on the right,
the target's head polygon masked (no Redux). Prompt: `<STYLE>. Two drawings
of the exact same girl side by side, the same character drawn twice:
identical face and identical hairstyle in both. She has <HEAD>. On the
right: <expression>.` Four seeds per pose; the owner-approved seed matched
the canonical face *and* hair (candidates that grew bangs, spiky pigtails,
barrettes or a stray signature scribble were rejected).

| Pose | Seed | Expression phrase |
|---|---|---|
| 01-neutral | 3 | the same girl standing, a gentle happy closed-mouth smile, looking at the viewer |
| 02-hero-clipboard | 3 | the same girl, a big happy open-mouth grin showing her top teeth, looking at the viewer |
| 03-waving | 2 | the same girl, a happy closed-mouth smile, looking at the viewer |
| 04-helping | 6 | see below |
| 05-pointing | 3 | the same girl, cheerful gentle closed-mouth smile, looking at the viewer |
| 06-sitting-writing | 3 | the same girl, a small happy closed-mouth smile, looking at the viewer |
| 08-celebrating | 3 | the same girl, a big excited open-mouth laugh, looking at the viewer |

Head mask polygons (1024px image coordinates):

```
01 [[290,48],[730,48],[792,108],[792,316],[640,316],[622,322],[400,322],[382,316],[248,316],[243,108]]
02 [[320,28],[700,28],[778,88],[788,366],[662,368],[622,336],[420,336],[382,330],[288,330],[278,88]]
03 [[262,78],[750,78],[802,138],[802,340],[700,346],[648,398],[600,410],[420,410],[375,398],[330,346],[214,340],[214,138]]
04 [[330,165],[420,150],[520,150],[600,165],[700,185],[765,230],[768,520],[610,522],[560,522],[460,522],[425,548],[300,550],[240,540],[236,230],[270,185]]
05 [[330,33],[700,33],[772,88],[778,368],[662,372],[642,382],[362,382],[342,372],[302,366],[230,364],[226,88]]
06 [[250,213],[760,213],[812,278],[812,490],[692,495],[642,528],[600,538],[420,538],[380,528],[330,470],[213,470],[213,278]]
08 [[330,53],[700,53],[747,100],[747,213],[702,240],[690,330],[650,354],[560,360],[470,360],[390,354],[345,330],[335,240],[288,213],[288,100]]
```

**04 needed a second pass.** Its old high hair puffs sat above the first
mask, so all four first-pass seeds kept them on top of the new pigtails.
Second pass: the larger polygon above, the old puffs erased first (region
x 230-775, y 55-235 outside the mask set to white), expression "the same
girl seen in a three-quarter view with her head tilted down, looking down
at a puppy on the ground, a warm caring closed-mouth smile; her hair is
parted in the middle and her two long smooth wavy pigtails hang down beside
her face to her shoulders", seeds 5-8, seed **6** chosen. Clean-up inside
the cleared strip only: marks not connected to the figure's line work
(fragments of hair drawn past the mask edge) removed, and the strip's pure
white re-toned to the image's background grey (253) so no brighter box shows.

**Prompt fragments.**
`<STYLE>` = black and white line art, coloring-book style illustration, bold
thick solid black outlines (not thin or faint) on a pure white background,
no color, crisp clean sharp lines.
`<FACE>` = the face of a young preschool girl, about four years old: a wide
round chubby face with a round chin, big round solid black eyes each with a
white shine dot and three short curled eyelashes on the outer corner, thin
curved eyebrows, a tiny small dot nose, a simple gentle closed-mouth smile,
three small hash-mark lines on each cheek.
`<HEAD>` = hair parted in the middle and pulled back smoothly with no bangs,
two long smooth wavy pigtails at the sides of her head each tied with a small
round hair tie; a round chubby face, big round dark eyes with white shine dots
and long curled eyelashes on the outer corners, thin arched eyebrows, a tiny
two-stroke nose, four small diagonal blush lines on each cheek.

**Derived files.** All 8 locked SVGs re-traced with
`tools/vectorize-line-art.sh`; simplified-tier 02/04/05 re-traced with the
documented looser parameters (both commands reproduce every previous SVG
byte-for-byte from the previous PNGs). Card crops re-measured with outer-
`<svg>` `getBBox()` (the same tool reproduces all four previous crops
exactly): page 3 -- 06 `129.2 178.3 745.5 745.5`, 08 `-6.3 13.9 1037.7
1037.7`, 03 `11.5 34.2 1005.1 1005.1`; page 6 -- 04 `105 131 811 811`.

**Print note.** The new faces' feature lines are thinner than the bodies'
(p75 stroke width 4-6px on the faces vs 5.7-7.2px on the bodies, measured on
all eight PNGs). At the 70% vectorization threshold the white eye-shine dots
partly fill in, leaving small irregular highlights; checked on all eight
rendered SVGs, every pose's eyes read the same way (large black eyes with
lashes), and lashes, brows, blush marks and smiles survive.

**Not changed:** outfits. The documented exceptions (03/08 crew necks; 04
shorts + rectangular badge) remain. **Not in this repo:** the head-lock
scripts ran from a scratch workspace; the parameters above are the full
record.

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
