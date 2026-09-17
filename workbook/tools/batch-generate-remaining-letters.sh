#!/usr/bin/env bash
# One-time batch driver for Book 2's remaining 19 letter illustrations
# (D,E,F,G,H,I,J,K,L,M,O,Q,R,S,T,U,V,W,Y -- N and P reuse existing locked
# assets, nest.svg and pencil.svg). 4 candidates per letter at the SAME
# proven seeds already used for apple/ball/xylophone/zebra, same prompt
# TEMPLATE recipe (object vs animal), per the established
# generate-a-batch-then-compare method (kennedi-asset-generation-method
# memory) -- not single-thread iteration.
set -euo pipefail
cd "$(dirname "$0")/.."

SEEDS="61 72 83 94"

gen_object() {
  local name="$1" prompt="$2"
  mkdir -p design-source/objects/drafts
  for seed in $SEEDS; do
    python3 tools/comfy-generate.py "$prompt" --seed "$seed" --steps 28 \
      --out "design-source/objects/drafts/${name}-candidate-${seed}.png"
  done
}

gen_animal() {
  local name="$1" prompt="$2"
  mkdir -p design-source/animals/drafts
  for seed in $SEEDS; do
    python3 tools/comfy-generate.py "$prompt" --seed "$seed" --steps 28 \
      --out "design-source/animals/drafts/${name}-candidate-${seed}.png"
  done
}

gen_animal dog "a single cute cartoon puppy sitting, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body and ears, fur texture accent lines on the ears and tail drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_animal elephant "a single cute cartoon elephant standing, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body and ears, wrinkle texture accent lines on the trunk and ears drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_animal fish "a single cute cartoon fish swimming, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body, fin and scale detail lines drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_animal giraffe "a single cute cartoon giraffe standing, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body and long neck, spot pattern lines across the body and neck drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_object house "children's coloring book clipart of a single simple house with a triangular roof, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), a door, a window, and a chimney drawn with the same bold black line weight, soft airbrushed gray shading gradient on the roof for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_object igloo "children's coloring book clipart of a single igloo made of snow blocks, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), a rounded doorway and individual snow-block lines drawn with the same bold black line weight, soft airbrushed gray shading gradient on the dome for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_animal jellyfish "a single cute cartoon jellyfish floating, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the dome-shaped body, wavy tentacle lines drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_object kite "children's coloring book clipart of a single diamond-shaped kite with a long tail, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), cross-strut lines and small bow-tied tail ribbons drawn with the same bold black line weight, soft airbrushed gray shading gradient on one half for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_animal lion "a single cute cartoon lion sitting, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body and mane, fluffy mane texture lines drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_object moon "children's coloring book clipart of a single crescent moon, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), a few small crater and star accent lines drawn with the same bold black line weight, soft airbrushed gray shading gradient along the curve for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_animal owl "a single cute cartoon owl perched, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body and wings, feather texture accent lines on the wings and chest drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_animal queen "a single cute cartoon queen character standing, wearing a simple crown and a flowing robe, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the robe, simple jewel and fabric-fold accent lines on the crown and robe drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_object rainbow "children's coloring book clipart of a single rainbow arc with a few clouds at each end, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), individual color-band arc lines and fluffy cloud outline details drawn with the same bold black line weight, soft airbrushed gray shading gradient on the clouds for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_object sun "children's coloring book clipart of a single simple sun with triangular rays, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), individual ray lines drawn with the same bold black line weight, soft airbrushed gray shading gradient on the center circle for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_object tree "children's coloring book clipart of a single simple tree with a round leafy top and a trunk, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), bark texture lines on the trunk and leaf-cluster outline details drawn with the same bold black line weight, soft airbrushed gray shading gradient on the leafy top for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_object umbrella "children's coloring book clipart of a single open umbrella, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), individual panel-seam lines and a curved handle drawn with the same bold black line weight, soft airbrushed gray shading gradient on one panel for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_object violin "children's coloring book clipart of a single violin with a bow, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), string lines, f-hole details, and tuning peg shapes drawn with the same bold black line weight, soft airbrushed gray shading gradient on the body for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

gen_animal whale "a single cute cartoon whale swimming, children's coloring book clipart style, confident clean bold black outline of uniform thickness (not sketchy, not scribbled), big round expressive eyes, soft airbrushed gray shading gradient for roundness on the body, a small water-spout line above the blowhole and belly-crease detail lines drawn with the same bold black line weight, centered on plain white background, simple flat 2D illustration, no text, no color"

gen_object yoyo "children's coloring book clipart of a single yo-yo with its string, one confident clean single-stroke black outline of uniform thickness (not sketchy, not scribbled, not doubled or hatched lines), a center axle line and side-panel groove details drawn with the same bold black line weight, soft airbrushed gray shading gradient on one half for roundness, centered alone on plain white background, simple flat 2D illustration, no face, no eyes, no character, no text, no color"

echo "ALL DONE"
