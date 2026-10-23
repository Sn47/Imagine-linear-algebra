import type { Painter } from './painter'
import { type Vec3, type Mat3, mul3, len3 } from '../math/mat3'

export type Camera = { yaw: number; pitch: number }

/** A thin 3D layer over the 2D painter: orthographic camera with z up. */
export class Painter3 {
  p: Painter
  cam: Camera
  constructor(p: Painter, cam: Camera) { this.p = p; this.cam = cam }

  /** Rotate into camera space. Returns (right, up, depth). */
  view(v: Vec3): Vec3 {
    const { yaw, pitch } = this.cam
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
    const x1 = v.x * cy - v.y * sy, y1 = v.x * sy + v.y * cy
    return { x: x1, y: v.z * cp - y1 * sp, z: y1 * cp + v.z * sp }
  }
  /** Inverse of view: screen-plane offsets back into world. */
  unview(v: Vec3): Vec3 {
    const { yaw, pitch } = this.cam
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch)
    const y1 = v.z * cp - v.y * sp, z = v.y * cp + v.z * sp
    return { x: v.x * cy + y1 * sy, y: -v.x * sy + y1 * cy, z }
  }
  screen(v: Vec3) { const w = this.view(v); return { x: this.p.sx(w.x), y: this.p.sy(w.y), depth: w.z } }
  /** 2D world point (for the 2D painter) for a 3D point. */
  flat(v: Vec3) { const w = this.view(v); return { x: w.x, y: w.y } }

  line(a: Vec3, b: Vec3, color: string, width = 1, dash: number[] = []) { this.p.line(this.flat(a), this.flat(b), color, width, dash) }
  arrow(v: Vec3, color: string, label?: string, width = 2.25, from: Vec3 = { x: 0, y: 0, z: 0 }) {
    if (len3({ x: v.x - from.x, y: v.y - from.y, z: v.z - from.z }) < 1e-6) return
    this.p.arrow(this.flat(v), color, label, width, this.flat(from))
  }
  label(text: string, at: Vec3, color: string, off = { dx: 10, dy: -10 }) { this.p.label(text, this.flat(at), color, off) }
  dot(v: Vec3, color: string, r = 3.5) { this.p.dot(this.flat(v), color, r) }

  /** Ground grid on the xy plane, transformed by M. */
  grid(M: Mat3, color: string, width = 1, R = 4) {
    for (let i = -R; i <= R; i++) {
      this.line(mul3(M, { x: i, y: -R, z: 0 }), mul3(M, { x: i, y: R, z: 0 }), color, width)
      this.line(mul3(M, { x: -R, y: i, z: 0 }), mul3(M, { x: R, y: i, z: 0 }), color, width)
    }
  }
  axes(R = 4) {
    this.line({ x: -R, y: 0, z: 0 }, { x: R, y: 0, z: 0 }, this.p.C.axis, 1)
    this.line({ x: 0, y: -R, z: 0 }, { x: 0, y: R, z: 0 }, this.p.C.axis, 1)
    this.line({ x: 0, y: 0, z: -R }, { x: 0, y: 0, z: R }, this.p.C.axis, 1)
  }
  /** Unit cube under M: translucent faces, depth-sorted, then edges. */
  cube(M: Mat3, fill: string, stroke: string) {
    const c = (x: number, y: number, z: number) => mul3(M, { x, y, z })
    const P = [c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0), c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)]
    const faces = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]]
    const withDepth = faces.map((f) => ({ f, d: f.reduce((a, i) => a + this.view(P[i]).z, 0) / 4 }))
    withDepth.sort((a, b) => a.d - b.d)
    for (const { f } of withDepth) this.p.polygon(f.map((i) => this.flat(P[i])), { a: 1, b: 0, c: 0, d: 1 }, fill, stroke, true, 1)
  }
  /** Parallelogram spanned by two vectors from the origin. */
  parallelogram(u: Vec3, v: Vec3, fill: string, stroke: string) {
    const pts = [{ x: 0, y: 0, z: 0 }, u, { x: u.x + v.x, y: u.y + v.y, z: u.z + v.z }, v]
    this.p.polygon(pts.map((q) => this.flat(q)), { a: 1, b: 0, c: 0, d: 1 }, fill, stroke, true, 1)
  }
}
