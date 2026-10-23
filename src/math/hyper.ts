/** 4D helpers for the tesseract lens. */
export type Vec4 = [number, number, number, number]
export const PLANES: [number, number, string][] = [[0, 1, 'xy'], [0, 2, 'xz'], [0, 3, 'xw'], [1, 2, 'yz'], [1, 3, 'yw'], [2, 3, 'zw']]

export function rotate4(v: Vec4, angles: number[]): Vec4 {
  const out: Vec4 = [...v]
  PLANES.forEach(([i, j], k) => {
    const th = angles[k]
    if (!th) return
    const c = Math.cos(th), s = Math.sin(th)
    const a = out[i], b = out[j]
    out[i] = a * c - b * s
    out[j] = a * s + b * c
  })
  return out
}

/** Perspective from 4D to 3D: the w axis points at the viewer. */
export function project4(v: Vec4, distance = 3): { x: number; y: number; z: number } {
  const f = distance / (distance - v[3])
  return { x: v[0] * f, y: v[1] * f, z: v[2] * f }
}

export const tesseract = (() => {
  const verts: Vec4[] = []
  for (let i = 0; i < 16; i++) verts.push([(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1), (i & 8 ? 1 : -1)])
  const edges: [number, number][] = []
  for (let a = 0; a < 16; a++) for (let b = a + 1; b < 16; b++) { const d = a ^ b; if (d && !(d & (d - 1))) edges.push([a, b]) }
  return { verts, edges }
})()
