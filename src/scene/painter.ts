import { mul, len, I, type Mat, type Vec } from '../math/mat2'

export type Colors = Record<'grid' | 'gridAccent' | 'axis' | 'text' | 'muted' | 'faint' | 'accent' | 'warm' | 'soft' | 'warmSoft' | 'bg', string>

export function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement)
  const g = (k: string) => cs.getPropertyValue(k).trim()
  return {
    grid: g('--grid'), gridAccent: g('--grid-accent'), axis: g('--axis'), text: g('--text'), muted: g('--muted'), faint: g('--faint'),
    accent: g('--accent'), warm: g('--warm'), soft: g('--accent-soft'), warmSoft: g('--warm-soft'), bg: g('--bg'),
  }
}

export type Geom = { W: number; H: number; unit: number; cx: number; cy: number }

export class Painter {
  ctx: CanvasRenderingContext2D
  g: Geom
  C: Colors
  private mono: string
  constructor(ctx: CanvasRenderingContext2D, g: Geom, C: Colors, mono: string) { this.ctx = ctx; this.g = g; this.C = C; this.mono = mono }

  sx = (x: number) => this.g.cx + x * this.g.unit
  sy = (y: number) => this.g.cy - y * this.g.unit

  clear() { this.ctx.clearRect(0, 0, this.g.W, this.g.H) }

  line(p: Vec, q: Vec, color: string, width = 1, dash: number[] = []) {
    const { ctx } = this
    ctx.beginPath(); ctx.moveTo(this.sx(p.x), this.sy(p.y)); ctx.lineTo(this.sx(q.x), this.sy(q.y))
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([])
  }

  /** Infinite line through the origin (or `through`) in direction u. */
  ray(u: Vec, color: string, width = 1, dash: number[] = [], through: Vec = { x: 0, y: 0 }) {
    if (len(u) < 1e-9) return
    const b = this.bounds()
    const n = (Math.max(Math.abs(b.xmin), Math.abs(b.xmax), Math.abs(b.ymin), Math.abs(b.ymax)) * 2 + 4) / len(u)
    this.line({ x: through.x - u.x * n, y: through.y - u.y * n }, { x: through.x + u.x * n, y: through.y + u.y * n }, color, width, dash)
  }

  arrow(v: Vec, color: string, label?: string, width = 2.25, from: Vec = { x: 0, y: 0 }) {
    const { ctx } = this
    const d = { x: v.x - from.x, y: v.y - from.y }
    const L = len(d)
    if (L < 1e-6) return
    const hx = this.sx(v.x), hy = this.sy(v.y)
    const ux = d.x / L, uy = -d.y / L
    const head = Math.min(11, L * this.g.unit * 0.6)
    ctx.beginPath(); ctx.moveTo(this.sx(from.x), this.sy(from.y)); ctx.lineTo(hx - ux * head * 0.7, hy - uy * head * 0.7)
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(hx, hy)
    ctx.lineTo(hx - ux * head - uy * head * 0.45, hy - uy * head + ux * head * 0.45)
    ctx.lineTo(hx - ux * head + uy * head * 0.45, hy - uy * head - ux * head * 0.45)
    ctx.closePath(); ctx.fillStyle = color; ctx.fill()
    if (label) this.label(label, { x: v.x, y: v.y }, color, { dx: ux * 14, dy: uy * 14 })
  }

  label(text: string, at: Vec, color: string, off: { dx: number; dy: number } = { dx: 10, dy: -10 }, align: CanvasTextAlign = 'center') {
    const { ctx } = this
    ctx.font = `500 13px ${this.mono}`; ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.textAlign = align
    ctx.fillText(text, this.sx(at.x) + off.dx, this.sy(at.y) + off.dy)
  }

  /** Short note in the corner of the stage. */
  note(text: string, color = this.C.muted) {
    const { ctx } = this
    ctx.font = `400 13px ${this.mono}`; ctx.fillStyle = color; ctx.textBaseline = 'top'; ctx.textAlign = 'left'
    ctx.fillText(text, 16, 16)
  }

  dot(p: Vec, color: string, r = 3.5) {
    const { ctx } = this
    ctx.beginPath(); ctx.arc(this.sx(p.x), this.sy(p.y), r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
  }

  /** World-space bounds currently visible. */
  bounds() {
    const { W, H, unit, cx, cy } = this.g
    return { xmin: -cx / unit, xmax: (W - cx) / unit, ymin: (cy - H) / unit, ymax: cy / unit }
  }

  /** Grid step so lines stay at least ~28px apart at the current zoom. */
  step(minPx = 28) {
    const px = this.g.unit
    for (const s of [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100]) if (s * px >= minPx) return s
    return 200
  }

  grid(M: Mat = I, color = this.C.grid, width = 1) {
    const b = this.bounds()
    const R = Math.max(Math.abs(b.xmin), Math.abs(b.xmax), Math.abs(b.ymin), Math.abs(b.ymax)) * 3 + 2
    const step = this.step()
    const n = Math.min(Math.ceil(R / step), 400)
    for (let i = -n; i <= n; i++) {
      const k = i * step
      this.line(mul(M, { x: k, y: -n * step }), mul(M, { x: k, y: n * step }), color, width)
      this.line(mul(M, { x: -n * step, y: k }), mul(M, { x: n * step, y: k }), color, width)
    }
  }

  /** Tick labels along the axes, in screen space so they stay readable. */
  ticks() {
    const { ctx } = this
    const b = this.bounds()
    const step = this.step(70)
    ctx.font = `400 11px ${this.mono}`; ctx.fillStyle = this.C.faint; ctx.textBaseline = 'top'; ctx.textAlign = 'center'
    const fmtTick = (v: number) => (Math.abs(v) < 1e-9 ? '0' : (+v.toFixed(3)).toString().replace('-', '\u2212'))
    for (let x = Math.ceil(b.xmin / step) * step; x <= b.xmax; x += step) {
      if (Math.abs(x) < 1e-9) continue
      ctx.fillText(fmtTick(x), this.sx(x), Math.min(Math.max(this.sy(0) + 4, 4), this.g.H - 16))
    }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'right'
    for (let y = Math.ceil(b.ymin / step) * step; y <= b.ymax; y += step) {
      if (Math.abs(y) < 1e-9) continue
      ctx.fillText(fmtTick(y), Math.min(Math.max(this.sx(0) - 6, 28), this.g.W - 4), this.sy(y))
    }
  }

  axes() {
    const b = this.bounds()
    this.line({ x: b.xmin, y: 0 }, { x: b.xmax, y: 0 }, this.C.axis, 1)
    this.line({ x: 0, y: b.ymin }, { x: 0, y: b.ymax }, this.C.axis, 1)
  }

  circle(M: Mat, color: string, width = 1, dash: number[] = []) {
    const { ctx } = this
    ctx.beginPath()
    for (let k = 0; k <= 120; k++) {
      const th = (k / 120) * Math.PI * 2
      const p = mul(M, { x: Math.cos(th), y: Math.sin(th) })
      if (k === 0) ctx.moveTo(this.sx(p.x), this.sy(p.y)); else ctx.lineTo(this.sx(p.x), this.sy(p.y))
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash); ctx.stroke(); ctx.setLineDash([])
  }

  polygon(pts: Vec[], M: Mat, fill: string, stroke: string, close = true, width = 1.5) {
    const { ctx } = this
    if (!pts.length) return
    ctx.beginPath()
    pts.forEach((p, i) => { const q = mul(M, p); if (i === 0) ctx.moveTo(this.sx(q.x), this.sy(q.y)); else ctx.lineTo(this.sx(q.x), this.sy(q.y)) })
    if (close) { ctx.closePath(); if (fill !== 'transparent') { ctx.fillStyle = fill; ctx.fill() } }
    if (stroke !== 'transparent') { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke() }
  }

  fillPlane(color: string) { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, this.g.W, this.g.H) }

  /** Translucent band along an infinite line to show a 1D subspace. */
  band(u: Vec, color: string, halfWidth = 0.08) {
    if (len(u) < 1e-9) return
    const hw = (halfWidth * 50) / this.g.unit // constant on screen
    const n = { x: -u.y / len(u) * hw, y: u.x / len(u) * hw }
    const b = this.bounds()
    const k = (Math.max(Math.abs(b.xmin), Math.abs(b.xmax), Math.abs(b.ymin), Math.abs(b.ymax)) * 2 + 4) / len(u)
    this.polygon([
      { x: -u.x * k + n.x, y: -u.y * k + n.y }, { x: u.x * k + n.x, y: u.y * k + n.y },
      { x: u.x * k - n.x, y: u.y * k - n.y }, { x: -u.x * k - n.x, y: -u.y * k - n.y },
    ], I, color, 'transparent')
  }

  /** Small right-angle mark at `at` between directions u and v. */
  rightAngle(at: Vec, u: Vec, v: Vec, color: string) {
    const s = 0.22
    const a = { x: at.x + u.x * s, y: at.y + u.y * s }
    const b = { x: at.x + u.x * s + v.x * s, y: at.y + u.y * s + v.y * s }
    const c = { x: at.x + v.x * s, y: at.y + v.y * s }
    this.line(a, b, color, 1); this.line(b, c, color, 1)
  }
}
