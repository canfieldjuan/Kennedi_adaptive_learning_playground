/**
 * The art canvas — the drawing/decorating surface behind Bear Art Studio's
 * canvas modes. One layer holds a <canvas> for brush strokes and free-placed
 * sticker elements, driven by pointer events (mouse and touch alike).
 *
 * Preschool-safe drawing: fat round-cap strokes, taps leave dots, no
 * precision anywhere. Evidence-safe: the module reports summarized actions
 * (first mark, stroke ends, placements) — never per pointer-move — and every
 * 2D-context call is guarded so DOM-mock tests exercise the evidence paths
 * without a real canvas.
 */

import { studioShapeSvg, type StudioShapeId } from './studio-art';

/** Internal drawing resolution; CSS scales the canvas to the easel. */
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 640;
const BRUSH_WIDTH = 26;

export interface ArtCanvasCallbacks {
  /** Once, at the very first brush contact. */
  onFirstMark?: (colorId: string) => void;
  /** At the end of every stroke (pointer up/leave) — the attempt boundary. */
  onStrokeEnd?: (colorId: string) => void;
  /** After a sticker lands; count is the current placed total. */
  onStickerPlace?: (shape: StudioShapeId, placedCount: number) => void;
  /** After a placed sticker is tapped away; count is the new total. */
  onStickerRemove?: (shape: StudioShapeId, placedCount: number) => void;
}

export interface ArtCanvas {
  element: HTMLElement;
  setTool(tool: 'brush' | 'sticker'): void;
  setBrushColor(colorId: string, colorValue: string): void;
  setSticker(shape: StudioShapeId): void;
  setLocked(locked: boolean): void;
  colorsUsed(): string[];
  placedStickers(): StudioShapeId[];
  actionCount(): number;
  destroy(): void;
}

export function createArtCanvas(options: {
  allowRemove: boolean;
  callbacks: ArtCanvasCallbacks;
}): ArtCanvas {
  const { callbacks } = options;

  const layer = document.createElement('div');
  layer.className = 'bear-art-studio__paint-layer';

  const canvas = document.createElement('canvas') as HTMLCanvasElement;
  canvas.className = 'bear-art-studio__paint';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  layer.appendChild(canvas);

  // Guarded: mock documents have no 2D context; drawing becomes a no-op
  // while the evidence callbacks still fire.
  const context = typeof canvas.getContext === 'function'
    ? canvas.getContext('2d')
    : null;
  if (context) {
    context.lineWidth = BRUSH_WIDTH;
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  let tool: 'brush' | 'sticker' = 'brush';
  let brushColorId = '';
  let brushColorValue = '#3a2461';
  let sticker: StudioShapeId | null = null;
  let locked = false;
  let stroking = false;
  let markedOnce = false;
  let actions = 0;
  const usedColorIds: string[] = [];
  const placed: Array<{ shape: StudioShapeId; element: HTMLElement }> = [];

  function canvasPoint(event: { clientX?: number; clientY?: number }): { x: number; y: number } {
    const rect = typeof layer.getBoundingClientRect === 'function'
      ? layer.getBoundingClientRect()
      : { left: 0, top: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    const width = rect.width || CANVAS_WIDTH;
    const height = rect.height || CANVAS_HEIGHT;
    const x = ((event.clientX ?? 0) - rect.left) / width;
    const y = ((event.clientY ?? 0) - rect.top) / height;
    return {
      x: Math.min(Math.max(x, 0), 1),
      y: Math.min(Math.max(y, 0), 1),
    };
  }

  function beginStroke(event: PointerEvent): void {
    if (locked || tool !== 'brush') return;
    stroking = true;
    const point = canvasPoint(event);
    if (context) {
      context.strokeStyle = brushColorValue;
      context.fillStyle = brushColorValue;
      // A tap alone leaves a friendly dot — short marks are real marks.
      context.beginPath();
      context.arc(point.x * CANVAS_WIDTH, point.y * CANVAS_HEIGHT, BRUSH_WIDTH / 2, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(point.x * CANVAS_WIDTH, point.y * CANVAS_HEIGHT);
    }
    actions += 1;
    if (brushColorId && !usedColorIds.includes(brushColorId)) {
      usedColorIds.push(brushColorId);
    }
    if (!markedOnce) {
      markedOnce = true;
      callbacks.onFirstMark?.(brushColorId);
    }
  }

  function continueStroke(event: PointerEvent): void {
    if (!stroking || locked || tool !== 'brush') return;
    const point = canvasPoint(event);
    if (context) {
      context.lineTo(point.x * CANVAS_WIDTH, point.y * CANVAS_HEIGHT);
      context.stroke();
    }
  }

  function endStroke(): void {
    if (!stroking) return;
    stroking = false;
    callbacks.onStrokeEnd?.(brushColorId);
  }

  function placeSticker(event: { clientX?: number; clientY?: number }): void {
    if (locked || tool !== 'sticker' || !sticker) return;
    const point = canvasPoint(event);
    const shape = sticker;
    const element = document.createElement('span');
    element.className = 'bear-art-studio__placed';
    element.setAttribute('aria-hidden', 'true');
    element.style.setProperty('--placed-x', `${Math.round(point.x * 100)}%`);
    element.style.setProperty('--placed-y', `${Math.round(point.y * 100)}%`);
    element.innerHTML = studioShapeSvg(shape);

    if (options.allowRemove) {
      const onRemove = (removeEvent?: { stopPropagation?: () => void }) => {
        removeEvent?.stopPropagation?.();
        if (locked) return;
        const index = placed.findIndex((entry) => entry.element === element);
        if (index === -1) return;
        placed.splice(index, 1);
        element.remove();
        callbacks.onStickerRemove?.(shape, placed.length);
      };
      element.addEventListener('click', onRemove);
    }

    layer.appendChild(element);
    placed.push({ shape, element });
    actions += 1;
    callbacks.onStickerPlace?.(shape, placed.length);
  }

  const onPointerDown = (event: PointerEvent) => beginStroke(event);
  const onPointerMove = (event: PointerEvent) => continueStroke(event);
  const onPointerUp = () => endStroke();
  const onClick = (event: MouseEvent) => placeSticker(event);

  layer.addEventListener('pointerdown', onPointerDown);
  layer.addEventListener('pointermove', onPointerMove);
  layer.addEventListener('pointerup', onPointerUp);
  layer.addEventListener('pointerleave', onPointerUp);
  layer.addEventListener('click', onClick);

  return {
    element: layer,
    setTool(next) {
      tool = next;
      layer.dataset.tool = next;
    },
    setBrushColor(colorId, colorValue) {
      brushColorId = colorId;
      brushColorValue = colorValue;
    },
    setSticker(shape) {
      sticker = shape;
    },
    setLocked(next) {
      locked = next;
      if (locked) stroking = false;
    },
    colorsUsed: () => [...usedColorIds],
    placedStickers: () => placed.map((entry) => entry.shape),
    actionCount: () => actions,
    destroy() {
      layer.removeEventListener('pointerdown', onPointerDown);
      layer.removeEventListener('pointermove', onPointerMove);
      layer.removeEventListener('pointerup', onPointerUp);
      layer.removeEventListener('pointerleave', onPointerUp);
      layer.removeEventListener('click', onClick);
      layer.remove();
    },
  };
}
