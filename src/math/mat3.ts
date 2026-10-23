export type Vec3 = { x: number; y: number; z: number }
/** Row-major 3x3: m[r][c]. Columns are where i, j, k land. */
export type Mat3 = [[number, number, number], [number, number, number], [number, number, number]]

export const I3: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })
export const mul3 = (M: Mat3, v: Vec3): Vec3 => ({
  x: M[0][0] * v.x + M[0][1] * v.y + M[0][2] * v.z,
  y: M[1][0] * v.x + M[1][1] * v.y + M[1][2] * v.z,
  z: M[2][0] * v.x + M[2][1] * v.y + M[2][2] * v.z,
})
export const col3 = (M: Mat3, c: 0 | 1 | 2): Vec3 => ({ x: M[0][c], y: M[1][c], z: M[2][c] })
export const det3 = (M: Mat3) =>
  M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
  M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
  M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
export const lerp3 = (P: Mat3, Q: Mat3, t: number): Mat3 =>
  P.map((row, r) => row.map((v, c) => v + (Q[r][c] - v) * t)) as Mat3
export const add3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
export const scale3 = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k })
export const dot3 = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z
export const len3 = (a: Vec3) => Math.hypot(a.x, a.y, a.z)
export const cross3 = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
export const withCol = (M: Mat3, c: 0 | 1 | 2, v: Vec3): Mat3 =>
  M.map((row, r) => row.map((x, cc) => (cc === c ? [v.x, v.y, v.z][r] : x))) as Mat3
export const rank3 = (M: Mat3): 0 | 1 | 2 | 3 => {
  if (Math.abs(det3(M)) > 1e-6) return 3
  const c = [col3(M, 0), col3(M, 1), col3(M, 2)]
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (len3(cross3(c[i], c[j])) > 1e-6) return 2
  return c.some((v) => len3(v) > 1e-6) ? 1 : 0
}
