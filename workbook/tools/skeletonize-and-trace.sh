#!/usr/bin/env bash
# Reduces a bold/filled glyph raster to its single-pixel-wide topological
# skeleton (true centerline, not an outline of the filled shape), then
# traces THAT to an SVG via potrace -- used for tracing-guide dots that
# read as a single pen stroke, not a hollow/outline "bubble letter".
# Requires ImageMagick (`convert`) and `potrace`.
#
# Usage: skeletonize-and-trace.sh input.png output.svg [threshold%]
#
# Why: tracing the OUTLINE of a filled glyph (what vectorize-line-art.sh
# does, correct for the book's character/object art) necessarily produces
# TWO parallel boundary curves (the shape's outer edge and inner edge) --
# fine for a solid silhouette, but for a tracing GUIDE it reads exactly
# like a hollow/bubble letter no matter how the boundary is drawn (solid
# stroke or dots), which is not what a real single-pen-stroke tracing
# workbook page looks like. A true morphological skeleton has no "inner"
# and "outer" edge -- it's topologically one line -- so tracing IT instead
# produces guide points a child can follow as a single stroke.
#
# ImageMagick's `-morphology Thinning:-1 Skeleton` operator treats WHITE
# pixels as the foreground to thin (the opposite of this project's usual
# black-ink-on-white convention) -- confirmed directly: skeletonizing
# without inverting first produced sparse, disconnected fragments, not a
# connected letter skeleton; inverting first (so the glyph is white on
# black) produced a clean single-line result, verified on both a plain
# rectangle and a real glyph. The skeleton output itself is then
# white-on-black -- negated back before threshold+potrace, since potrace
# expects black-as-foreground (this project's normal convention, matching
# vectorize-line-art.sh).
#
# potrace tracing a 1px-wide line produces a path that goes up one side
# and back down the other (there's no "outline vs. fill" distinction for
# potrace -- it always traces a boundary) -- but since the line is only
# ~1px wide on a 1000px canvas, both sides sit within ~1px of the true
# centerline, which is visually indistinguishable from a single stroke at
# any dot size actually used on the page. Confirmed by rendering the
# traced result directly, not assumed.
#
# PRUNING: a raw skeleton grows small spurious branches ("spurs") at
# sharp corners and T-junctions -- e.g. "A"'s peak, where the two legs
# meet, sprouts two short (~15-20px) whiskers pointing past the apex.
# This is standard, well-documented morphological-skeleton behavior, not
# a bug in this script -- but it was wrongly dismissed here as visually
# negligible; at real dot-tracing scale it is NOT negligible, because a
# spur gets its own dot(s) same as any other stroke, reading as a stray
# mark rather than fading away the way a thin drawn line would (owner,
# looking at the rendered page: "the dots seem unorganized and sloppy,
# with extra dots making the letters look funny at the tops"). Pre-blurring
# the raster before skeletonizing does NOT fix this -- tested directly:
# the same whiskers appear regardless of blur radius, since they come
# from the skeleton's topology at the junction, not from raster noise.
# The actual fix is standard skeleton PRUNING: `-morphology Thinning:N
# LineEnds` erodes N pixels in from every line-end, each pass -- a spur
# shorter than N pixels disappears entirely, while a real stroke (much
# longer) is only trimmed by that same N pixels at its own tip, which
# potrace's tracing of a still-plenty-long remaining stroke doesn't
# visibly shorten. PRUNE_PX=30 confirmed directly (cropped/zoomed
# before-vs-after renders, not assumed): 0 leaves the full whisker, 10-20
# shrinks it but leaves a visible stub, 30 removes it cleanly while the
# peak's own rounded arc stays intact, 50 starts visibly flattening that
# arc too -- so 30 is comfortably past "spur gone" and short of "eating
# real strokes".
#
# ISOLATED SMALL COMPONENTS (i/j's dot): PRUNE_PX erodes N pixels in from
# EVERY line-end, on EVERY separate connected component of the skeleton,
# not just spurs attached to a long stroke. Lowercase i/j's dot is its
# own small, fully disconnected blob (confirmed via `-connected-components`:
# ~56x56px bounding box on this script's working canvas, vs. 65x376px+
# for even the shortest real letter stroke elsewhere in the alphabet) --
# every one of its pixels sits within PRUNE_PX of an end, same as a real
# spur, so unpruned LineEnds erosion doesn't just trim it, it erodes the
# whole thing down to a 1px remnant, which potrace's own default speckle
# filter then discards -- confirmed directly: the committed
# i-lower.svg/j-lower.svg outlines (before this fix) contained only the
# stem/descender path, no dot at all, silently teaching an incomplete
# letterform.
#
# Fix: identify small ISOLATED FOREGROUND components in the raw
# (unpruned) skeleton, and restore exactly those pixels after the normal
# pruning pass runs on everything else -- so a spur still attached to a
# real stroke gets eaten as before, but a genuinely separate small
# component survives untouched. This must filter on BOTH size AND color
# (foreground/white only) -- a first version of this fix used
# `-define connected-components:area-threshold`, which merges ANY
# small-area component into its neighbor regardless of color; for a
# letter with an enclosed counter (O, A, D, e, ...), the hole in the
# middle is itself a connected BACKGROUND component, and for the
# thin-ringed skeleton (not the bold filled glyph) that hole is large in
# absolute pixels but was still getting merged/recolored as if it were a
# tiny foreground blob, filling the entire letter solid black -- caught
# by rendering "O" before vs. after (a hollow ring became a filled disc),
# not assumed safe from the i/j fix alone. The corrected approach reads
# each component's own bounding box AND mean-color from
# `-connected-components`'s verbose report, and only touches components
# that are BOTH foreground (mean-color gray(255)) AND small
# (bounding-box width and height both under SMALL_COMPONENT_PX) --
# background-colored regions (any size, including a large enclosed hole)
# are never eligible no matter how the area math shakes out.
# SMALL_COMPONENT_PX=100 (confirmed on i/j: dot bounding box ~56x56 on
# both, comfortably under; O's ring bounding box is 408x464, comfortably
# over) -- wide margin either side. Every other letter in this alphabet
# is a single connected skeleton component (crossbars/counters touch
# their stem even though they read as separate strokes visually, and an
# enclosed counter's hole is background-colored so the color filter
# excludes it), so this only ever fires for i/j's dot -- confirmed by
# regenerating all 52 letters and diffing against the pre-fix outputs:
# only i-lower/j-lower changed, and O-upper (representative of every
# other letter with a hole) came out byte-identical to its pre-fix
# output.
set -euo pipefail
IN="$1"
OUT="$2"
THRESH="${3:-70}"
PRUNE_PX=30
SMALL_COMPONENT_PX=100
TMP_PRE="$(mktemp --suffix=.pbm)"
TMP_SKEL="$(mktemp --suffix=.png)"
TMP_PRUNED="$(mktemp --suffix=.png)"
TMP_LABELS="$(mktemp --suffix=.png)"
TMP_CC_INFO="$(mktemp --suffix=.txt)"
TMP_SMALL_MASK="$(mktemp --suffix=.png)"
TMP_ID_MASK="$(mktemp --suffix=.png)"
TMP_FINAL_SKEL="$(mktemp --suffix=.png)"
TMP_POST="$(mktemp --suffix=.pbm)"
trap 'rm -f "$TMP_PRE" "$TMP_SKEL" "$TMP_PRUNED" "$TMP_LABELS" "$TMP_CC_INFO" "$TMP_SMALL_MASK" "$TMP_ID_MASK" "$TMP_FINAL_SKEL" "$TMP_POST"' EXIT

convert "$IN" -threshold "${THRESH}%" -alpha off -negate "$TMP_PRE"
convert "$TMP_PRE" -morphology Thinning:-1 Skeleton "$TMP_SKEL"
convert "$TMP_SKEL" -morphology Thinning:"$PRUNE_PX" LineEnds "$TMP_PRUNED"

# Label every connected component of the RAW (unpruned) skeleton -- the
# output image encodes each pixel's own component id as its raw pixel
# value (confirmed directly against the verbose report below), and the
# verbose report gives each id's bounding box and mean-color so small
# foreground-only components can be picked out precisely.
convert "$TMP_SKEL" -define connected-components:verbose=true -connected-components 8 "$TMP_LABELS" > "$TMP_CC_INFO"

convert -size "$(identify -format '%wx%h' "$TMP_SKEL")" xc:black "$TMP_SMALL_MASK"
small_ids=$(awk -v thresh="$SMALL_COMPONENT_PX" '
  /gray\(255\)/ {
    id = $1; sub(/:$/, "", id)
    split($2, box, "x"); w = box[1]
    split(box[2], box2, "+"); h = box2[1]
    if (w < thresh && h < thresh) print id
  }' "$TMP_CC_INFO")
for id in $small_ids; do
  convert "$TMP_LABELS" -fx "abs(u*65535-$id)<0.5?1:0" "$TMP_ID_MASK"
  convert "$TMP_SMALL_MASK" "$TMP_ID_MASK" -compose Lighten -composite "$TMP_SMALL_MASK"
done

# Restore those small components into the pruned result (per-pixel max of
# two binary images == union/OR).
convert "$TMP_PRUNED" "$TMP_SMALL_MASK" -compose Lighten -composite "$TMP_FINAL_SKEL"

convert "$TMP_FINAL_SKEL" -negate -threshold 50% -alpha off "$TMP_POST"
potrace "$TMP_POST" -s -o "$OUT" --flat
echo "wrote $OUT"
