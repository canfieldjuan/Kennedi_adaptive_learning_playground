/**
 * Shared SVG helpers. Every illustration in this system is bold-outline,
 * black-and-white, and built from these primitives so the visual language
 * stays consistent across pages (and, later, the coloring pack).
 */

export const INK = '#000000';

/** Wraps inner SVG markup in a viewBox'd <svg> that fills its container. */
export function svgWrap(viewBox, inner, { className = 'illo', label = '' } = {}) {
  const labelAttr = label ? ` role="img" aria-label="${label}"` : ' aria-hidden="true"';
  return `<svg viewBox="${viewBox}" class="${className}"${labelAttr} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
}

/** A sized box wrapper (inches) around any inner SVG markup string. */
export function iconBox(inner, { width = '0.9in', height = '0.9in', className = 'icon-box' } = {}) {
  return `<span class="${className}" style="width:${width};height:${height};">${inner}</span>`;
}

export function starPoints(cx, cy, outerR, innerR, points = 5, rotationDeg = -90) {
  const step = Math.PI / points;
  const rot = (rotationDeg * Math.PI) / 180;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + i * step;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function starPolygon(cx, cy, outerR, innerR, attrs = '') {
  return `<polygon points="${starPoints(cx, cy, outerR, innerR)}" ${attrs} />`;
}
