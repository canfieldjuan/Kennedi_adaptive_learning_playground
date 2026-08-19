#!/usr/bin/env bash
# Thresholds a generated line-art PNG to pure black/white and traces it to an
# editable SVG via potrace. Requires ImageMagick (`convert`) and `potrace`.
#
# Usage: vectorize-line-art.sh input.png output.svg [threshold%]
set -euo pipefail
IN="$1"
OUT="$2"
THRESH="${3:-70}"
TMP_PBM="$(mktemp --suffix=.pbm)"
trap 'rm -f "$TMP_PBM"' EXIT

convert "$IN" -threshold "${THRESH}%" -alpha off "$TMP_PBM"
potrace "$TMP_PBM" -s -o "$OUT" --flat
echo "wrote $OUT"
