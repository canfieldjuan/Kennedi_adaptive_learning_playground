/** The garden owns fruit location and spatial movement. Rendering never awards fruit. */
export type Point = Readonly<{ x: number; y: number }>;
export const APPLE_IDS = ['a', 'b', 'c', 'd', 'e'] as const;
export type AppleId = typeof APPLE_IDS[number];
export type AppleLocation = 'tree' | 'basket' | 'table';
export type GardenPhase = 'collecting' | 'counting' | 'complete';
export type Cloth = 'rose' | 'sky' | 'honey';
export interface GardenState {
  phase: GardenPhase;
  apples: Record<AppleId, AppleLocation>;
  cloth: Cloth;
}
export const BEAR_APPLES = 2;
export const REQUESTED_APPLES = 3;
export const START: Point = { x: 510, y: 650 };
export const TREE_STOP: Point = { x: 360, y: 460 };
export const BEAR_STOP: Point = { x: 700, y: 530 };
export const REACH = 85;
export const WALK_SPEED = 210;

export function newGarden(): GardenState {
  return { phase: 'collecting', apples: { a: 'tree', b: 'tree', c: 'tree', d: 'tree', e: 'tree' }, cloth: 'rose' };
}
export function fruitAt(state: GardenState, location: AppleLocation): AppleId[] {
  return APPLE_IDS.filter(id => state.apples[id] === location);
}
export function near(position: Point, target: Point): boolean {
  return Math.hypot(position.x - target.x, position.y - target.y) <= REACH;
}
export function pickApple(state: GardenState, id: AppleId, position: Point): boolean {
  if (state.phase !== 'collecting') return false;
  if (!near(position, TREE_STOP)) return false;
  if (state.apples[id] !== 'tree') return false;
  state.apples[id] = 'basket';
  return true;
}
export function returnApple(state: GardenState, position: Point): boolean {
  if (state.phase !== 'collecting') return false;
  if (!near(position, TREE_STOP)) return false;
  const id = fruitAt(state, 'basket').at(-1);
  if (id === undefined) return false;
  state.apples[id] = 'tree';
  return true;
}
export type Delivery = 'not-near' | 'already-delivered' | 'need-more' | 'bring-fewer' | 'delivered';
export function deliver(state: GardenState, position: Point): Delivery {
  if (state.phase !== 'collecting') return 'already-delivered';
  if (!near(position, BEAR_STOP)) return 'not-near';
  const basket = fruitAt(state, 'basket');
  if (basket.length < REQUESTED_APPLES) return 'need-more';
  if (basket.length > REQUESTED_APPLES) return 'bring-fewer';
  for (const id of basket) state.apples[id] = 'table';
  state.phase = 'counting';
  return 'delivered';
}
export function totalOnTable(state: GardenState): number {
  return BEAR_APPLES + fruitAt(state, 'table').length;
}
export function answer(state: GardenState, value: number): boolean {
  if (state.phase !== 'counting') return false;
  if (value !== totalOnTable(state)) return false;
  state.phase = 'complete';
  return true;
}

// Feet collide with the pond, trunk and table footprint, not their painted tops.
// This excludes walking through solid props/water; cosmetic occlusion alone
// cannot prevent those impossible paths. The surrounding grass stays walkable.
export function walkable(p: Point): boolean {
  return p.x >= 80 && p.x <= 1120 && p.y >= 320 && p.y <= 740
    && Math.hypot((p.x - 255) / 65, (p.y - 395) / 55) > 1
    && !(p.x >= 740 && p.x <= 970 && p.y >= 360 && p.y <= 500)
    && Math.hypot((p.x - 1010) / 195, (p.y - 710) / 125) > 1;
}

/** Small fixed garden lattice: breadth-first routing around props, not through them. */
export function pathTo(from: Point, destination: Point): Point[] {
  const nodes: Point[] = [];
  for (let y = 320; y <= 740; y += 20) {
    for (let x = 80; x <= 1120; x += 20) {
      if (walkable({ x, y })) nodes.push({ x, y });
    }
  }
  const closest = (p: Point) => nodes.reduce((best, node) =>
    Math.hypot(node.x - p.x, node.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? node : best);
  const start = closest(from);
  const end = closest(destination);
  const key = (p: Point) => `${p.x},${p.y}`;
  const available = new Map(nodes.map(p => [key(p), p]));
  const previous = new Map<string, Point | null>([[key(start), null]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!;
    if (key(current) === key(end)) break;
    for (const [dx, dy] of [[20, 0], [-20, 0], [0, 20], [0, -20]]) {
      const next = available.get(key({ x: current.x + dx!, y: current.y + dy! }));
      if (next && !previous.has(key(next))) {
        previous.set(key(next), current);
        queue.push(next);
      }
    }
  }
  const route: Point[] = [];
  let current: Point | null = end;
  while (current) {
    route.unshift(current);
    current = previous.get(key(current)) ?? null;
  }
  return route;
}

/** Substeps prevent tunnelling through a footprint even after a slow frame. */
export function walk(position: Point, dx: number, dy: number, seconds: number): Point {
  const length = Math.hypot(dx, dy);
  if (length === 0) return position;
  const distance = WALK_SPEED * seconds;
  const steps = Math.max(1, Math.ceil(distance / 4));
  const vx = dx / length * distance / steps;
  const vy = dy / length * distance / steps;
  let p = position;
  for (let i = 0; i < steps; i++) {
    const horizontal = { x: p.x + vx, y: p.y };
    if (walkable(horizontal)) p = horizontal;
    const vertical = { x: p.x, y: p.y + vy };
    if (walkable(vertical)) p = vertical;
  }
  return p;
}
