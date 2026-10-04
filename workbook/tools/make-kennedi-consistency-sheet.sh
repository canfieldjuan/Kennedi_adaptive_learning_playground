#!/usr/bin/env bash
# Rebuilds docs/art/kennedi-consistency-sheet.png from the eight locked Boss
# Kennedi poses (design-source/boss-kennedi/locked-poses/0[1-8]-*.png). Re-run
# it whenever a locked pose changes.
#
# The montage recipe was recovered on 2026-09-23 by reproduction: run against
# the locked poses as of commit e1f2fce (where the sheet was first made), it
# reproduces that committed sheet with 0 differing pixels
# (`compare -metric AE`).
#
# Writes to a temp file in the output directory and renames it into place, so
# a failed run never truncates an existing sheet. PNG date/time chunks are
# excluded so unchanged poses give a byte-identical file (no spurious diff).
#
# Requires ImageMagick (`montage`) and the DejaVu Sans Bold font.
# Usage: make-kennedi-consistency-sheet.sh [output.png]
set -euo pipefail
WORKBOOK="$(cd "$(dirname "$0")/.." && pwd)"
POSES="$WORKBOOK/design-source/boss-kennedi/locked-poses"
OUT="${1:-$WORKBOOK/docs/art/kennedi-consistency-sheet.png}"

TMP="$(mktemp --suffix=.png "$(dirname "$OUT")/.kennedi-sheet.XXXXXX")"
trap 'rm -f "$TMP"' EXIT

montage \
  -label '1. Neutral'          "$POSES/01-neutral.png" \
  -label '2. Hero+Clipboard'   "$POSES/02-hero-clipboard.png" \
  -label '3. Waving'           "$POSES/03-waving.png" \
  -label '4. Helping/Bending'  "$POSES/04-helping.png" \
  -label '5. Pointing'         "$POSES/05-pointing.png" \
  -label '6. Sitting+Writing'  "$POSES/06-sitting-writing.png" \
  -label '7. Thinking'         "$POSES/07-thinking.png" \
  -label '8. Celebrating'      "$POSES/08-celebrating.png" \
  -tile 4x2 -geometry 400x400+15+15 -border 1 -bordercolor gray \
  -background white -font DejaVu-Sans-Bold -pointsize 20 \
  -define png:exclude-chunk=date,time \
  "$TMP"

# mktemp creates 0600; keep the replaced file's mode, or a normal new-file
# mode if there is nothing to replace.
if [ -e "$OUT" ]; then
  chmod --reference="$OUT" "$TMP"
else
  chmod "$(printf '%04o' $((0666 & ~0$(umask))))" "$TMP"
fi
mv -f "$TMP" "$OUT"
trap - EXIT
echo "wrote $OUT"
