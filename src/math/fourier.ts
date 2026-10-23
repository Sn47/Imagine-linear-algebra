import type { Vec } from './mat2'

/** Resample a closed polyline to n points evenly spaced along its length. */
export function resample(path: Vec[], n: number): Vec[] {
  if (path.length < 2) return []
  const pts = [...path, path[0]]
  const seg: number[] = []
  let total = 0
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(d); total += d }
  if (total < 1e-9) return []
  const out: Vec[] = []
  let i = 1, acc = 0
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total
    while (acc + seg[i - 1] < target && i < pts.length - 1) { acc += seg[i - 1]; i++ }
    const f = seg[i - 1] > 0 ? (target - acc) / seg[i - 1] : 0
    out.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f })
  }
  return out
}

export type Epicycle = { freq: number; amp: number; phase: number }

/** Discrete Fourier transform of a closed path (as complex numbers), sorted by amplitude. */
export function epicycles(points: Vec[], maxCircles: number): Epicycle[] {
  const N = points.length
  if (!N) return []
  const out: Epicycle[] = []
  const K = Math.floor(maxCircles / 2)
  for (let k = -K; k <= K; k++) {
    let re = 0, im = 0
    for (let n = 0; n < N; n++) {
      const th = (-2 * Math.PI * k * n) / N
      re += points[n].x * Math.cos(th) - points[n].y * Math.sin(th)
      im += points[n].x * Math.sin(th) + points[n].y * Math.cos(th)
    }
    re /= N; im /= N
    out.push({ freq: k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) })
  }
  return out.sort((a, b) => b.amp - a.amp).slice(0, maxCircles)
}

/** Position of the chain at time tau in [0, 1): the sequence of joint points. */
export function chain(cycles: Epicycle[], tau: number): Vec[] {
  const pts: Vec[] = [{ x: 0, y: 0 }]
  let x = 0, y = 0
  for (const c of cycles) {
    const a = 2 * Math.PI * c.freq * tau + c.phase
    x += c.amp * Math.cos(a); y += c.amp * Math.sin(a)
    pts.push({ x, y })
  }
  return pts
}

export const SHAPES: Record<string, (n: number) => Vec[]> = {
  heart: (n) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return { x: 0.16 * 16 * Math.sin(t) ** 3, y: 0.16 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) } }),
  star: (n) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; const r = 2 + 0.9 * Math.cos(5 * t); return { x: r * Math.cos(t), y: r * Math.sin(t) } }),
  square: () => [{ x: -2, y: -2 }, { x: 2, y: -2 }, { x: 2, y: 2 }, { x: -2, y: 2 }],
  logo: () => [{ x: -1.5, y: -1.8 }, { x: 1.9, y: -1.8 }, { x: 1.9, y: -1.1 }, { x: -0.8, y: -1.1 }, { x: -0.8, y: 2 }, { x: -1.5, y: 2 }],
  infinity: (n) => Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; const d = 1 + Math.sin(t) ** 2; return { x: (2.6 * Math.cos(t)) / d, y: (2.6 * Math.sin(t) * Math.cos(t)) / d } }),
}
