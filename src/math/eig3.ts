import { type Mat3, type Vec3, cross3, len3, scale3 } from './mat3'

/** Real roots of x³ + a x² + b x + c = 0. */
export function cubicRoots(a: number, b: number, c: number): number[] {
  const q = (3 * b - a * a) / 9
  const r = (9 * a * b - 27 * c - 2 * a * a * a) / 54
  const D = q * q * q + r * r
  const shift = -a / 3
  if (D > 1e-12) {
    const s = Math.cbrt(r + Math.sqrt(D)), t = Math.cbrt(r - Math.sqrt(D))
    return [shift + s + t]
  }
  if (Math.abs(D) <= 1e-12) {
    const s = Math.cbrt(r)
    return [shift + 2 * s, shift - s]
  }
  const th = Math.acos(Math.max(-1, Math.min(1, r / Math.sqrt(-q * q * q))))
  const m = 2 * Math.sqrt(-q)
  return [m * Math.cos(th / 3) + shift, m * Math.cos((th + 2 * Math.PI) / 3) + shift, m * Math.cos((th + 4 * Math.PI) / 3) + shift]
}

export type Eig3 = { value: number; vector: Vec3 }[]

/** Real eigenpairs of a 3x3 matrix, largest |λ| first. */
export function eigen3(M: Mat3): Eig3 {
  const tr = M[0][0] + M[1][1] + M[2][2]
  const minors =
    M[0][0] * M[1][1] - M[0][1] * M[1][0] + M[0][0] * M[2][2] - M[0][2] * M[2][0] + M[1][1] * M[2][2] - M[1][2] * M[2][1]
  const det =
    M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
    M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
    M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
  // λ³ − tr λ² + minors λ − det = 0
  const roots = cubicRoots(-tr, minors, -det)
  const out: Eig3 = []
  for (const l of roots) {
    const r = (i: number): Vec3 => ({ x: M[i][0] - (i === 0 ? l : 0), y: M[i][1] - (i === 1 ? l : 0), z: M[i][2] - (i === 2 ? l : 0) })
    const cands = [cross3(r(0), r(1)), cross3(r(0), r(2)), cross3(r(1), r(2))]
    let best = cands[0]
    for (const c of cands) if (len3(c) > len3(best)) best = c
    if (len3(best) < 1e-9) {
      // repeated eigenvalue with a plane of eigenvectors: pick something perpendicular to a non-zero row
      const rows = [r(0), r(1), r(2)].filter((v) => len3(v) > 1e-9)
      best = rows.length ? cross3(rows[0], Math.abs(rows[0].x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }) : { x: 1, y: 0, z: 0 }
    }
    out.push({ value: l, vector: scale3(best, 1 / len3(best)) })
  }
  return out.sort((p, q) => Math.abs(q.value) - Math.abs(p.value))
}
