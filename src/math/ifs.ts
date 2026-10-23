import type { Vec } from './mat2'

/** Affine map x -> M x + b, with a probability for the chaos game. */
export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number; p: number }

export const IFS: Record<string, { name: string; maps: Affine[]; scale: number; center: Vec }> = {
  fern: {
    name: 'Barnsley fern', scale: 0.45, center: { x: 0, y: -2.3 },
    maps: [
      { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, p: 0.01 },
      { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, p: 0.85 },
      { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, p: 0.07 },
      { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, p: 0.07 },
    ],
  },
  sierpinski: {
    name: 'Sierpinski triangle', scale: 4, center: { x: -2, y: -1.8 },
    maps: [
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0, f: 0, p: 1 / 3 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.5, f: 0, p: 1 / 3 },
      { a: 0.5, b: 0, c: 0, d: 0.5, e: 0.25, f: 0.5, p: 1 / 3 },
    ],
  },
  dragon: {
    name: 'Dragon curve', scale: 3.5, center: { x: -1, y: -0.5 },
    maps: [
      { a: 0.5, b: -0.5, c: 0.5, d: 0.5, e: 0, f: 0, p: 0.5 },
      { a: -0.5, b: -0.5, c: 0.5, d: -0.5, e: 1, f: 0, p: 0.5 },
    ],
  },
  tree: {
    name: 'Fractal tree', scale: 1.6, center: { x: 0, y: -2.2 },
    maps: [
      { a: 0, b: 0, c: 0, d: 0.5, e: 0, f: 0, p: 0.05 },
      { a: 0.42, b: -0.42, c: 0.42, d: 0.42, e: 0, f: 0.2, p: 0.4 },
      { a: 0.42, b: 0.42, c: -0.42, d: 0.42, e: 0, f: 0.2, p: 0.4 },
      { a: 0.1, b: 0, c: 0, d: 0.1, e: 0, f: 0.2, p: 0.15 },
    ],
  },
}

/** Apply the map, with an optional extra rotation (the "bend" control). */
export function applyAffine(m: Affine, v: Vec, bend = 0): Vec {
  const x = m.a * v.x + m.b * v.y + m.e, y = m.c * v.x + m.d * v.y + m.f
  if (!bend) return { x, y }
  const c = Math.cos(bend), s = Math.sin(bend)
  return { x: x * c - y * s, y: x * s + y * c }
}

/** Chaos game: n points of the attractor. Deterministic for a seed so the picture is stable. */
export function chaosGame(maps: Affine[], n: number, bend: number, seed = 7): Vec[] {
  let state = seed
  const rnd = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  const pts: Vec[] = []
  let v: Vec = { x: 0, y: 0 }
  for (let i = 0; i < n + 20; i++) {
    let r = rnd(), k = 0
    for (; k < maps.length - 1; k++) { r -= maps[k].p; if (r <= 0) break }
    v = applyAffine(maps[k], v, k === 1 ? bend : 0)
    if (i >= 20) pts.push(v)
  }
  return pts
}
