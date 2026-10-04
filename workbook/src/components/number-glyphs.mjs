// Single centerline strokes, matching the alphabet workbook's manuscript guides.
// Zero is a digit in 10 and 20; the practice sequence itself starts at one.
export const DIGITS = Object.freeze({
  0: ['M40 18 C6 18 6 90 40 90 C74 90 74 18 40 18'],
  1: ['M22 34 L40 18 V90', 'M22 90 H58'],
  2: ['M16 35 C16 12 66 12 66 35 C66 51 35 67 16 90 H68'],
  3: ['M17 27 C30 10 65 15 65 35 Q65 54 40 54', 'M40 54 C77 49 77 90 41 90 Q24 90 16 79'],
  4: ['M51 18 L14 65 H68', 'M51 18 V90'],
  5: ['M64 18 H20 V50', 'M20 50 C75 36 79 90 39 90 Q23 90 16 79'],
  6: ['M60 18 C31 18 16 42 16 66 C16 98 66 98 66 66 C66 34 16 34 16 66'],
  7: ['M14 18 H68 L30 90'],
  8: ['M40 54 C5 40 14 18 40 18 C66 18 75 40 40 54 C0 72 16 90 40 90 C64 90 80 72 40 54'],
  9: ['M64 42 C64 10 16 10 16 42 C16 74 64 74 64 42 V58 Q64 90 26 90'],
});

export function numberGlyph(number) {
  if (!Number.isInteger(number) || number < 1 || number > 20) {
    throw new TypeError('Practice numbers must be integers from 1 through 20.');
  }
  return [...String(number)].map((digit, index) =>
    `<g class="digit" transform="translate(${index * 64} 0)">${DIGITS[digit].map(d => `<path d="${d}"/>`).join('')}</g>`
  ).join('');
}
