export type Vec = { x: number; y: number }
export type Mat = { a: number; b: number; c: number; d: number }

export const I: Mat = { a: 1, b: 0, c: 0, d: 1 }

export const lerp = (p: number, q: number, t: number) => p + (q - p) * t
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

export const mul = (M: Mat, v: Vec): Vec => ({ x: M.a * v.x + M.b * v.y, y: M.c * v.x + M.d * v.y })

export const mmul = (P: Mat, Q: Mat): Mat => ({
  a: P.a * Q.a + P.b * Q.c,
  b: P.a * Q.b + P.b * Q.d,
  c: P.c * Q.a + P.d * Q.c,
  d: P.c * Q.b + P.d * Q.d,
})

export const rot = (th: number): Mat => ({ a: Math.cos(th), b: -Math.sin(th), c: Math.sin(th), d: Math.cos(th) })
export const diag = (p: number, q: number): Mat => ({ a: p, b: 0, c: 0, d: q })
export const det = (M: Mat) => M.a * M.d - M.b * M.c
export const trace = (M: Mat) => M.a + M.d
export const len = (v: Vec) => Math.hypot(v.x, v.y)
export const lerpMat = (P: Mat, Q: Mat, t: number): Mat => ({
  a: lerp(P.a, Q.a, t),
  b: lerp(P.b, Q.b, t),
  c: lerp(P.c, Q.c, t),
  d: lerp(P.d, Q.d, t),
})

/** Product of a stack applied left to right: first matrix acts first. */
export const compose = (stack: Mat[]): Mat => stack.reduce((acc, M) => mmul(M, acc), I)

/** Stagewise interpolation through a stack: t in [0, stack.length]. */
export function composeAt(stack: Mat[], t: number): Mat {
  let acc = I
  stack.forEach((M, i) => {
    const s = clamp01(t - i)
    if (s <= 0) return
    acc = mmul(lerpMat(I, M, s), acc)
  })
  return acc
}

export type Eigen =
  | { real: true; values: [number, number]; vectors: [Vec, Vec]; repeated: boolean }
  | { real: false; re: number; im: number }

export function eigen(M: Mat): Eigen {
  const tr = trace(M)
  const dt = det(M)
  const disc = (tr * tr) / 4 - dt
  if (disc < -1e-9) return { real: false, re: tr / 2, im: Math.sqrt(-disc) }
  const r = Math.sqrt(Math.max(disc, 0))
  const values: [number, number] = [tr / 2 + r, tr / 2 - r]
  const vectors = values.map((l) => {
    let v: Vec
    if (Math.abs(M.b) > 1e-9) v = { x: M.b, y: l - M.a }
    else if (Math.abs(M.c) > 1e-9) v = { x: l - M.d, y: M.c }
    else v = Math.abs(M.a - l) < 1e-9 ? { x: 1, y: 0 } : { x: 0, y: 1 }
    const n = len(v) || 1
    return { x: v.x / n, y: v.y / n }
  }) as [Vec, Vec]
  return { real: true, values, vectors, repeated: r < 1e-6 }
}

export type SVD = { thetaV: number; s1: number; s2: number; thetaU: number }

/** 2x2 SVD with U and V as pure rotations; a reflection shows up as a negative s2. */
export function svd(M: Mat): SVD {
  const ata = mmul({ a: M.a, b: M.c, c: M.b, d: M.d }, M)
  const phi = 0.5 * Math.atan2(2 * ata.b, ata.a - ata.d)
  const v1 = { x: Math.cos(phi), y: Math.sin(phi) }
  const v2 = { x: -v1.y, y: v1.x }
  const Av1 = mul(M, v1)
  const Av2 = mul(M, v2)
  const l1 = len(Av1)
  const l2 = len(Av2)
  const first = l1 >= l2 ? { v: v1, img: Av1, s: l1, other: v2 } : { v: v2, img: Av2, s: l2, other: { x: -v2.y, y: v2.x } }
  const u1 = first.s > 1e-9 ? { x: first.img.x / first.s, y: first.img.y / first.s } : { x: 1, y: 0 }
  const u2 = { x: -u1.y, y: u1.x }
  const otherImg = mul(M, first.other)
  const s2 = Math.hypot(otherImg.x, otherImg.y)
  const sign = otherImg.x * u2.x + otherImg.y * u2.y < 0 ? -1 : 1
  return { thetaV: Math.atan2(first.v.y, first.v.x), s1: first.s, s2: sign * s2, thetaU: Math.atan2(u1.y, u1.x) }
}

/** The matrix shown at SVD time t in [0, 3]: rotate, stretch, rotate. */
export function svdAt(f: SVD, t: number): Mat {
  const R1 = rot(-f.thetaV * clamp01(t))
  const S = diag(lerp(1, f.s1, clamp01(t - 1)), lerp(1, f.s2, clamp01(t - 1)))
  const R3 = rot(f.thetaU * clamp01(t - 2))
  return mmul(R3, mmul(S, R1))
}

export const fmt = (x: number, n = 2) => (Math.abs(x) < 0.005 ? 0 : x).toFixed(n).replace('-', '\u2212')

export const transpose = (M: Mat): Mat => ({ a: M.a, b: M.c, c: M.b, d: M.d })
export const dot = (u: Vec, v: Vec) => u.x * v.x + u.y * v.y
export const cross = (u: Vec, v: Vec) => u.x * v.y - u.y * v.x
export const scale = (v: Vec, k: number): Vec => ({ x: v.x * k, y: v.y * k })
export const add = (u: Vec, v: Vec): Vec => ({ x: u.x + v.x, y: u.y + v.y })
export const sub = (u: Vec, v: Vec): Vec => ({ x: u.x - v.x, y: u.y - v.y })
export const unit = (v: Vec): Vec => { const L = len(v); return L > 1e-12 ? scale(v, 1 / L) : { x: 0, y: 0 } }
export const col1 = (M: Mat): Vec => ({ x: M.a, y: M.c })
export const col2 = (M: Mat): Vec => ({ x: M.b, y: M.d })
export const fromCols = (u: Vec, v: Vec): Mat => ({ a: u.x, b: v.x, c: u.y, d: v.y })

export const EPS = 1e-9

export function inverse(M: Mat): Mat | null {
  const d = det(M)
  if (Math.abs(d) < EPS) return null
  return { a: M.d / d, b: -M.b / d, c: -M.c / d, d: M.a / d }
}

/** Solve M x = v, or null when singular. */
export function solve(M: Mat, v: Vec): Vec | null {
  const inv = inverse(M)
  return inv ? mul(inv, v) : null
}

export function rank(M: Mat): 0 | 1 | 2 {
  if (Math.abs(det(M)) > 1e-6) return 2
  return Math.abs(M.a) + Math.abs(M.b) + Math.abs(M.c) + Math.abs(M.d) > 1e-6 ? 1 : 0
}

/** Column space direction and null space direction for a rank-1 matrix. */
export function subspaces(M: Mat): { colDir: Vec; nullDir: Vec } {
  const c1 = col1(M), c2 = col2(M)
  const colDir = unit(len(c1) >= len(c2) ? c1 : c2)
  const r1 = { x: M.a, y: M.b }, r2 = { x: M.c, y: M.d }
  const row = len(r1) >= len(r2) ? r1 : r2
  const nullDir = unit({ x: -row.y, y: row.x })
  return { colDir, nullDir }
}

/** P A = L U with at most one row swap. */
export function lu(M: Mat): { L: Mat; U: Mat; swapped: boolean } {
  let A = M
  let swapped = false
  if (Math.abs(A.a) < EPS && Math.abs(A.c) > EPS) { A = { a: M.c, b: M.d, c: M.a, d: M.b }; swapped = true }
  const l = Math.abs(A.a) > EPS ? A.c / A.a : 0
  const L: Mat = { a: 1, b: 0, c: l, d: 1 }
  const U: Mat = { a: A.a, b: A.b, c: 0, d: A.d - l * A.b }
  return { L, U, swapped }
}

/** Gram-Schmidt on the columns. */
export function qr(M: Mat): { q1: Vec; q2: Vec; proj: Vec; resid: Vec; R: Mat; dependent: boolean } {
  const a1 = col1(M), a2 = col2(M)
  const q1 = unit(a1)
  const r12 = dot(a2, q1)
  const proj = scale(q1, r12)
  const resid = sub(a2, proj)
  const r22 = len(resid)
  const dependent = r22 < 1e-6 || len(a1) < 1e-6
  const q2 = dependent ? { x: -q1.y, y: q1.x } : scale(resid, 1 / r22)
  return { q1, q2, proj, resid, R: { a: len(a1), b: r12, c: 0, d: r22 }, dependent }
}

/** Projection of b onto the line through u. */
export function project(b: Vec, u: Vec): { p: Vec; e: Vec; coef: number; P: Mat } {
  const uu = dot(u, u)
  if (uu < EPS) return { p: { x: 0, y: 0 }, e: b, coef: 0, P: { a: 0, b: 0, c: 0, d: 0 } }
  const coef = dot(b, u) / uu
  const p = scale(u, coef)
  return { p, e: sub(b, p), coef, P: { a: (u.x * u.x) / uu, b: (u.x * u.y) / uu, c: (u.x * u.y) / uu, d: (u.y * u.y) / uu } }
}

/** v, Av, A^2 v, ... optionally renormalised each step. */
export function iterate(M: Mat, v0: Vec, steps: number, normalize: boolean): Vec[] {
  const out: Vec[] = [normalize ? scale(unit(v0), 2) : v0]
  for (let k = 0; k < steps; k++) {
    let v = mul(M, out[out.length - 1])
    if (normalize) v = scale(unit(v), 2)
    out.push(v)
  }
  return out
}
