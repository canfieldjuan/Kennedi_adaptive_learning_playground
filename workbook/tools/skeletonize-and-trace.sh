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
set -euo pipefail
IN="$1"
OUT="$2"
THRESH="${3:-70}"
PRUNE_PX=30
TMP_PRE="$(mktemp --suffix=.pbm)"
TMP_SKEL="$(mktemp --suffix=.png)"
TMP_PRUNED="$(mktemp --suffix=.png)"
TMP_POST="$(mktemp --suffix=.pbm)"
trap 'rm -f "$TMP_PRE" "$TMP_SKEL" "$TMP_PRUNED" "$TMP_POST"' EXIT

convert "$IN" -threshold "${THRESH}%" -alpha off -negate "$TMP_PRE"
convert "$TMP_PRE" -morphology Thinning:-1 Skeleton "$TMP_SKEL"
convert "$TMP_SKEL" -morphology Thinning:"$PRUNE_PX" LineEnds "$TMP_PRUNED"
convert "$TMP_PRUNED" -negate -threshold 50% -alpha off "$TMP_POST"
potrace "$TMP_POST" -s -o "$OUT" --flat
echo "wrote $OUT"
