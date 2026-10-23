import type { Painter } from './painter'
import { Painter3, type Camera } from './painter3'
import { I3, lerp3, det3, col3, cross3, len3, scale3, add3, mul3, type Mat3, type Vec3 } from '../math/mat3'
import { eigen3 } from '../math/eig3'
import { pca } from '../math/pca'
import { svdn, reconstruct, sampleImage } from '../math/svdn'
import { rotate4, project4, tesseract } from '../math/hyper'
import type { Lens } from '../state/lenses'
import {
  I, mul, len, fmt, compose, composeAt, lerpMat, clamp01, lerp, det, rank, subspaces, eigen, svd, svdAt,
  inverse, lu, qr, project, iterate, solve, col1, col2, cross, unit, scale, add, dot, type Mat, type Vec,
} from '../math/mat2'

export type SceneState = {
  lens: Lens
  stack: { name: string; m: Mat }[]
  objects: ({ kind: 'vector'; name: string; v: Vec } | { kind: 'shape'; name: string; points: Vec[] })[]
  probe: Vec
  probe2: Vec
  show: { grid: boolean; circle: boolean; square: boolean }
  drawing: Vec[] | null
  options: { normalize: boolean; steps: number; k: number; nonlinear: boolean }
  m3: Mat3
  u3: Vec3
  v3: Vec3
  poly: [number, number, number, number]
  points: Vec[]
  image: { size: number; data: Float64Array } | null
  rank: number
  fourier: { terms: number; wave: 'square' | 'triangle' | 'saw' }
  angles4: number[]
}

export const product = (s: SceneState) => compose(s.stack.map((it) => it.m))

/** The matrix the grid, square, circle and user objects are drawn through at time t. */
export function matrixAt(s: SceneState, t: number): Mat {
  const A = product(s)
  switch (s.lens) {
    case 'transform': return composeAt(s.stack.map((it) => it.m), t)
    case 'subspaces': return lerpMat(I, A, clamp01(t))
    case 'inverse': {
      const inv = inverse(A)
      if (t <= 1) return lerpMat(I, A, clamp01(t))
      return inv ? lerpMat(A, I, clamp01(t - 1)) : A
    }
    case 'lu': {
      const { L, U, swapped } = lu(A)
      const P: Mat = swapped ? { a: 0, b: 1, c: 1, d: 0 } : I
      const M = lerpMat(I, L, clamp01(t - 1))
      return mul2(mul2(P, M), lerpMat(I, U, clamp01(t)))
    }
    case 'svd': return svdAt(svd(A), t)
    case 'basis': return A
    case 'eigen':
    case 'iterate':
    case 'project':
    case 'qr':
    case 'span':
    case 'matvec':
      return A
    case 'determinant': return composeAt(s.stack.map((it) => it.m), t)
    case 'multiply': return composeAt(s.stack.map((it) => it.m).slice(0, 2), t / 2)
    case 'complex': return lerpMat(I, { a: s.probe.x, b: -s.probe.y, c: s.probe.y, d: s.probe.x }, clamp01(t))
    case 'cramer':
      return A
    default:
      return I
  }
}
const mul2 = (P: Mat, Q: Mat): Mat => ({ a: P.a * Q.a + P.b * Q.c, b: P.a * Q.b + P.b * Q.d, c: P.c * Q.a + P.d * Q.c, d: P.c * Q.b + P.d * Q.d })

/** Whether the transformed grid should be drawn for this lens. */
const showsGridMap: Partial<Record<Lens, boolean>> = {
  transform: true, subspaces: true, inverse: true, lu: true, svd: true, basis: true,
  eigen: true, iterate: false, project: false, qr: false, span: false,
  vector: false, add: false, dot: false, matvec: false,
  duality: false, determinant: true, cramer: false, transform3: false, nonsquare: false, cross: false, spaces: false, multiply: true, complex: true,
}
const showsGrid = (l: Lens) => !!showsGridMap[l]
const showsBasisMap: Partial<Record<Lens, boolean>> = {
  transform: true, subspaces: true, inverse: true, lu: true, svd: true, basis: true,
  eigen: false, iterate: false, project: false, qr: false, span: false,
  vector: false, add: false, dot: false, matvec: false,
  duality: false, determinant: true, cramer: false, transform3: false, nonsquare: false, cross: false, spaces: false, multiply: true, complex: true,
}
const showsBasisArrows = (l: Lens) => !!showsBasisMap[l]

/** A non-linear warp for contrast: curves the grid, which no matrix can do. */
const warp = (q: Vec, t: number): Vec => ({ x: q.x + t * 0.25 * q.y * q.y * Math.sign(q.y) * 0.5, y: q.y + t * 0.6 * Math.sin(q.x) })

function drawWarpedGrid(p: Painter, t: number, color: string) {
  const R = 8
  for (let i = -R; i <= R; i++) {
    for (const vertical of [true, false]) {
      p.ctx.beginPath()
      for (let k = 0; k <= 48; k++) {
        const u = -R + (2 * R * k) / 48
        const q = warp(vertical ? { x: i, y: u } : { x: u, y: i }, t)
        if (k === 0) p.ctx.moveTo(p.sx(q.x), p.sy(q.y)); else p.ctx.lineTo(p.sx(q.x), p.sy(q.y))
      }
      p.ctx.strokeStyle = color; p.ctx.lineWidth = 1; p.ctx.stroke()
    }
  }
}

const K3 = '#3a9d6c' // k-hat; a third scene colour only 3D needs

function draw3d(p: Painter, s: SceneState, t: number, cam: Camera) {
  const C = p.C
  const q = new Painter3(p, cam)
  p.clear()
  q.grid(I3, C.grid, 1, 5)
  q.axes(5)
  switch (s.lens) {
    case 'transform3': {
      const M = lerp3(I3, s.m3, clamp01(t))
      q.grid(M, C.gridAccent, 1, 3)
      q.cube(M, C.soft, C.accent)
      q.arrow(col3(M, 0), C.accent, '\u00ee', 2.5)
      q.arrow(col3(M, 1), C.warm, '\u0135', 2.5)
      q.arrow(col3(M, 2), K3, 'k\u0302', 2.5)
      for (const o of s.objects) if (o.kind === 'vector') { const v = { x: o.v.x, y: o.v.y, z: 0 }; q.arrow(v, C.faint, undefined, 1.5); q.arrow(mul3(M, v), C.text, o.name, 2.25) }
      const d = det3(M)
      p.note(`det = ${fmt(d)}  ${d < -1e-9 ? 'turned inside out' : Math.abs(d) < 1e-6 ? 'flattened' : 'volume scale'}`)
      break
    }
    case 'nonsquare': {
      // 3 x 2: first two columns of m3, inputs from the plane
      const c1 = col3(s.m3, 0), c2 = col3(s.m3, 1)
      const tt = clamp01(t)
      const M: Mat3 = lerp3(I3, [[c1.x, c2.x, 0], [c1.y, c2.y, 0], [c1.z, c2.z, 0]], tt)
      for (let i = -3; i <= 3; i++) {
        q.line(mul3(M, { x: i, y: -3, z: 0 }), mul3(M, { x: i, y: 3, z: 0 }), C.gridAccent, 1)
        q.line(mul3(M, { x: -3, y: i, z: 0 }), mul3(M, { x: 3, y: i, z: 0 }), C.gridAccent, 1)
      }
      q.parallelogram(col3(M, 0), col3(M, 1), C.soft, 'transparent')
      q.arrow(col3(M, 0), C.accent, '\u00ee', 2.5)
      q.arrow(col3(M, 1), C.warm, '\u0135', 2.5)
      for (const o of s.objects) if (o.kind === 'vector') { const v = { x: o.v.x, y: o.v.y, z: 0 }; q.arrow(v, C.faint, undefined, 1.5); q.arrow(mul3(M, v), C.text, o.name, 2.25) }
      const r = len3(cross3(c1, c2)) > 1e-6 ? 2 : 1
      p.note(tt < 0.999 ? 'lifting the plane into 3D' : r === 2 ? 'the image is a plane: rank 2' : 'the columns are parallel: the image is a line')
      break
    }
    case 'eigen3': {
      const M = s.m3
      const E = eigen3(M)
      q.cube(lerp3(I3, M, 1), 'transparent', C.gridAccent)
      E.forEach((e) => { const far = scale3(e.vector, 6); q.line(scale3(far, -1), far, C.faint, 1, [2, 6]) })
      const v = s.u3, Av = mul3(M, v)
      const cr = cross3(v, Av)
      const aligned = len3(cr) < 0.03 * len3(v) * Math.max(len3(Av), 1e-6) && len3(Av) > 1e-3
      q.arrow(Av, C.warm, 'Av', aligned ? 3 : 2.25)
      q.arrow(v, C.accent, 'v', aligned ? 3 : 2.25)
      q.arrow(col3(M, 0), C.accent, undefined, 1); q.arrow(col3(M, 1), C.warm, undefined, 1); q.arrow(col3(M, 2), K3, undefined, 1)
      if (aligned) { const l = (v.x * Av.x + v.y * Av.y + v.z * Av.z) / (len3(v) * len3(v)); q.label(`\u03bb = ${fmt(l)}`, v, C.text, { dx: 20, dy: 24 }) }
      p.note(E.length === 3 ? 'three real eigen-directions' : 'one real eigen-direction, the other two are complex')
      break
    }
    case 'hyper': {
      const pts = tesseract.verts.map((v) => project4(rotate4(v, s.angles4)))
      // edges, nearer ones stronger
      for (const [a, b] of tesseract.edges) {
        const inner = tesseract.verts[a][3] < 0 && tesseract.verts[b][3] < 0
        q.line(pts[a], pts[b], inner ? C.warm : C.accent, 1.25)
      }
      pts.forEach((v) => q.dot(v, C.text, 2.5))
      p.note('a tesseract, rotated in 4D and projected to 3D')
      break
    }
    case 'cross': {
      const u = s.u3, v = s.v3
      const w = cross3(u, v)
      const wt = scale3(w, clamp01(t))
      q.parallelogram(u, v, C.soft, C.faint)
      q.arrow(u, C.accent, 'u', 2.5)
      q.arrow(v, C.warm, 'v', 2.5)
      q.arrow(wt, C.text, 'u \u00d7 v', 2.5)
      q.dot(add3(u, v), C.faint, 2)
      p.note(`|u \u00d7 v| = ${fmt(len3(w))}  (area of the parallelogram)`)
      break
    }
    default: break
  }
}

function drawSpaces(p: Painter, s: SceneState, t: number) {
  const C = p.C
  const [a, b, c, d] = s.poly
  p.clear(); p.grid(I, C.grid, 1); p.axes(); p.ticks()
  const f = (x: number) => a + b * x + c * x * x + d * x * x * x
  const df = (x: number) => b + 2 * c * x + 3 * d * x * x
  const bnd = p.bounds()
  const plot = (g: (x: number) => number, color: string, width: number, dash: number[] = []) => {
    p.ctx.beginPath()
    const N = 240
    for (let k = 0; k <= N; k++) {
      const x = bnd.xmin + ((bnd.xmax - bnd.xmin) * k) / N
      const y = Math.max(-1e4, Math.min(1e4, g(x)))
      if (k === 0) p.ctx.moveTo(p.sx(x), p.sy(y)); else p.ctx.lineTo(p.sx(x), p.sy(y))
    }
    p.ctx.strokeStyle = color; p.ctx.lineWidth = width; p.ctx.setLineDash(dash); p.ctx.stroke(); p.ctx.setLineDash([])
  }
  plot(f, C.accent, 2.25)
  plot((x) => df(x) * clamp01(t), C.warm, 2, [6, 4])
  // tangent at the probe x
  const x0 = s.probe.x
  const y0 = f(x0), m = df(x0)
  p.line({ x: x0 - 1.2, y: y0 - 1.2 * m }, { x: x0 + 1.2, y: y0 + 1.2 * m }, C.muted, 1)
  p.dot({ x: x0, y: y0 }, C.accent, 4)
  p.dot({ x: x0, y: df(x0) }, C.warm, 3)
  p.label('f', { x: bnd.xmax - 0.6, y: f(bnd.xmax - 0.6) }, C.accent, { dx: 0, dy: -14 })
  p.label('f\u2032', { x: bnd.xmax - 1.4, y: df(bnd.xmax - 1.4) }, C.warm, { dx: 0, dy: -14 })
  p.label(`slope ${fmt(m)}`, { x: x0, y: y0 }, C.muted, { dx: 14, dy: 16 }, 'left')
}

function drawPca(p: Painter, s: SceneState, t: number) {
  const C = p.C
  p.clear(); p.grid(I, C.grid, 1); p.axes(); p.ticks()
  const R = pca(s.points)
  if (R) {
    const [l1, l2] = R.values
    const [e1, e2] = R.vectors
    const k = 2 * clamp01(t) // 2 standard deviations
    // covariance ellipse
    p.ctx.beginPath()
    for (let i = 0; i <= 90; i++) {
      const th = (i / 90) * Math.PI * 2
      const a = Math.sqrt(Math.max(l1, 0)) * k * Math.cos(th), b = Math.sqrt(Math.max(l2, 0)) * k * Math.sin(th)
      const x = R.mean.x + a * e1.x + b * e2.x, y = R.mean.y + a * e1.y + b * e2.y
      if (i === 0) p.ctx.moveTo(p.sx(x), p.sy(y)); else p.ctx.lineTo(p.sx(x), p.sy(y))
    }
    p.ctx.fillStyle = C.soft; p.ctx.fill(); p.ctx.strokeStyle = C.accent; p.ctx.lineWidth = 1; p.ctx.stroke()
    p.ray(e1, C.accent, 1.5, [], R.mean)
    p.ray(e2, C.faint, 1, [4, 4], R.mean)
    const a1 = add(R.mean, scale(e1, Math.sqrt(Math.max(l1, 0)) * k)), a2 = add(R.mean, scale(e2, Math.sqrt(Math.max(l2, 0)) * k))
    p.arrow(a1, C.accent, 'PC1', 2.5, R.mean)
    p.arrow(a2, C.warm, 'PC2', 2, R.mean)
    // projections onto PC1
    for (const q of s.points) {
      const d = { x: q.x - R.mean.x, y: q.y - R.mean.y }
      const c = dot(d, e1)
      const foot = add(R.mean, scale(e1, c))
      p.line(q, foot, C.faint, 1, [2, 3])
      p.dot(foot, C.accent, 2)
    }
    p.dot(R.mean, C.text, 4)
  }
  s.points.forEach((q) => p.dot(q, C.text, 3.5))
  if (!s.points.length) p.note('click anywhere to add data points, or load a cloud from the panel')
}

let imgCache: { key: string; U: Float64Array; sv: Float64Array; V: Float64Array; data: Float64Array } | null = null
export function imageSvd(img: { size: number; data: Float64Array }) {
  const key = `${img.size}:${img.data[0]}:${img.data[img.data.length - 1]}:${img.data.length}`
  if (!imgCache || imgCache.key !== key || imgCache.data !== img.data) {
    const { U, s, V } = svdn(img.data, img.size, img.size)
    imgCache = { key, U, sv: s, V, data: img.data }
  }
  return imgCache
}
export const defaultImage = { size: 64, data: sampleImage(64) }

function drawCompress(p: Painter, s: SceneState) {
  const C = p.C
  p.clear()
  const img = s.image ?? defaultImage
  const { U, sv, V } = imageSvd(img)
  const k = Math.max(1, Math.min(img.size, s.rank))
  const rec = reconstruct(U, sv, V, img.size, img.size, k)
  const side = Math.min(p.g.W * 0.4, p.g.H * 0.62)
  const gap = Math.min(40, p.g.W * 0.04)
  const x0 = p.g.W / 2 - side - gap / 2, y0 = (p.g.H - side) / 2 - 30
  const paint = (data: Float64Array, x: number, y: number) => {
    const n = img.size, cell = side / n
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = Math.max(0, Math.min(1, data[i * n + j]))
      const g = Math.round(v * 255)
      p.ctx.fillStyle = `rgb(${g},${g},${g})`
      p.ctx.fillRect(x + j * cell, y + i * cell, cell + 0.6, cell + 0.6)
    }
    p.ctx.strokeStyle = C.faint; p.ctx.lineWidth = 1; p.ctx.strokeRect(x, y, side, side)
  }
  paint(img.data, x0, y0)
  paint(rec, x0 + side + gap, y0)
  p.ctx.font = `500 13px ${getComputedStyle(document.body).getPropertyValue('--mono')}`
  p.ctx.fillStyle = C.muted; p.ctx.textAlign = 'center'; p.ctx.textBaseline = 'top'
  p.ctx.fillText(`original: ${img.size} \u00d7 ${img.size} = ${img.size * img.size} numbers`, x0 + side / 2, y0 + side + 10)
  const kept = k * (2 * img.size + 1)
  p.ctx.fillText(`rank ${k}: ${kept} numbers (${Math.round((100 * kept) / (img.size * img.size))}%)`, x0 + side + gap + side / 2, y0 + side + 10)
  // singular value bars
  const bx = x0, by = y0 + side + 44, bw = 2 * side + gap, bh = Math.min(70, p.g.H - by - 16)
  const n = Math.min(img.size, 48)
  const max = sv[0] || 1
  for (let i = 0; i < n; i++) {
    const h = (sv[i] / max) * bh
    p.ctx.fillStyle = i < k ? C.accent : C.grid
    p.ctx.fillRect(bx + (i * bw) / n, by + bh - h, bw / n - 2, h)
  }
}

function drawFourier(p: Painter, s: SceneState, t: number) {
  const C = p.C
  p.clear(); p.grid(I, C.grid, 1); p.axes(); p.ticks()
  const { terms, wave } = s.fourier
  const target = (x: number) => {
    const u = ((x % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
    if (wave === 'square') return u < Math.PI ? 1 : -1
    if (wave === 'saw') return 1 - u / Math.PI
    return u < Math.PI ? 1 - (2 * u) / Math.PI : -1 + (2 * (u - Math.PI)) / Math.PI // triangle
  }
  const coef = (n: number) => {
    if (wave === 'square') return n % 2 ? 4 / (Math.PI * n) : 0
    if (wave === 'saw') return 2 / (Math.PI * n)
    return n % 2 ? 8 / (Math.PI * Math.PI * n * n) : 0
  }
  const basis = (n: number, x: number) => (wave === 'triangle' ? Math.cos(n * x) : Math.sin(n * x))
  const N = Math.max(1, Math.round(terms * clamp01(t)) || 1)
  const partial = (x: number) => { let v = 0; for (let n = 1; n <= N; n++) v += coef(n) * basis(n, x); return v }
  const b = p.bounds()
  const plot = (g: (x: number) => number, color: string, width: number, dash: number[] = []) => {
    p.ctx.beginPath()
    const K = 600
    for (let k = 0; k <= K; k++) { const x = b.xmin + ((b.xmax - b.xmin) * k) / K; const y = g(x); if (k === 0) p.ctx.moveTo(p.sx(x), p.sy(y)); else p.ctx.lineTo(p.sx(x), p.sy(y)) }
    p.ctx.strokeStyle = color; p.ctx.lineWidth = width; p.ctx.setLineDash(dash); p.ctx.stroke(); p.ctx.setLineDash([])
  }
  plot(target, C.faint, 1.5, [4, 4])
  for (let n = 1; n <= N; n++) if (coef(n)) plot((x) => coef(n) * basis(n, x), C.gridAccent, 1)
  plot(partial, C.accent, 2.25)
  p.note(`${N} term${N > 1 ? 's' : ''}: ${Array.from({ length: N }, (_, i) => i + 1).filter((n) => coef(n)).map((n) => `${fmt(coef(n))}\u00b7${wave === 'triangle' ? 'cos' : 'sin'}(${n}x)`).join(' + ') || '0'}`)
}

export function draw(p: Painter, s: SceneState, t: number, cam: Camera) {
  if (s.lens === 'transform3' || s.lens === 'nonsquare' || s.lens === 'cross' || s.lens === 'eigen3' || s.lens === 'hyper') return draw3d(p, s, t, cam)
  if (s.lens === 'spaces') return drawSpaces(p, s, t)
  if (s.lens === 'pca') return drawPca(p, s, t)
  if (s.lens === 'compress') return drawCompress(p, s)
  if (s.lens === 'fourier') return drawFourier(p, s, t)
  const C = p.C
  const A = product(s)
  const M = matrixAt(s, t)
  const e1 = col1(M), e2 = col2(M)

  p.clear()
  p.grid(I, C.grid, 1)
  p.axes()
  p.ticks()
  if (s.lens === 'transform' && s.options.nonlinear) {
    drawWarpedGrid(p, clamp01(t), C.gridAccent)
    p.note('not linear: lines bend, so no matrix can describe this')
    return
  }

  // Shared layers: transformed grid, unit square and circle, user objects.
  if (s.show.grid && showsGrid(s.lens)) p.grid(M, C.gridAccent, 1)
  if (s.show.circle) { p.circle(I, C.axis, 1); p.circle(M, s.lens === 'svd' ? C.text : C.accent, s.lens === 'svd' ? 1.5 : 1, s.lens === 'svd' ? [] : [4, 4]) }
  if (s.show.square && showsGrid(s.lens)) p.polygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], M, C.soft, 'transparent')

  for (const o of s.objects) if (o.kind === 'shape') {
    p.polygon(o.points, I, 'transparent', C.faint)
    p.polygon(o.points, M, C.warmSoft, C.warm)
  }
  if (s.drawing) {
    p.polygon(s.drawing, I, 'transparent', C.warm, false)
    s.drawing.forEach((q) => p.dot(q, C.warm))
  }

  switch (s.lens) {
    case 'multiply': {
      const [Am, Bm] = s.stack.map((it) => it.m)
      if (!Bm) break
      const cell = Math.min(3, Math.floor(t)) // 0..3 reading order
      const j = cell % 2 // column of A
      const colA = j === 0 ? col1(Am) : col2(Am)
      const tt = clamp01(t / 2) // grid progress is shared
      const stage2 = clamp01(t / 2 - 0.5) * 2
      const carried = mul(lerpMat(I, Bm, clamp01((t - 2) / 2)), colA)
      p.arrow(colA, C.faint, j === 0 ? 'A\u00ee' : 'A\u0135', 1.5)
      p.arrow(carried, j === 0 ? C.accent : C.warm, `B(A${j === 0 ? '\u00ee' : '\u0135'})`, 2.5)
      if (stage2 > 0) { const q = mul(Bm, colA); p.line({ x: q.x, y: 0 }, q, C.faint, 1, [3, 3]); p.line({ x: 0, y: q.y }, q, C.faint, 1, [3, 3]) }
      p.note(tt < 0.5 ? 'first A acts' : 'then B acts on the columns of A')
      break
    }
    case 'complex': {
      const z = s.probe
      p.circle(I, C.axis, 1)
      p.dot(z, C.text, 4)
      p.label(`z = ${fmt(z.x)} ${z.y < 0 ? '\u2212' : '+'} ${fmt(Math.abs(z.y))}i`, z, C.text, { dx: 0, dy: -18 })
      p.label(`|z| = ${fmt(len(z))}, angle ${fmt((Math.atan2(z.y, z.x) * 180) / Math.PI, 0)}\u00b0`, z, C.muted, { dx: 0, dy: 20 })
      break
    }
    case 'duality': {
      const u = s.probe2, v = s.probe
      const L = len(u)
      if (L < 1e-6) break
      const uh = unit(u)
      p.ray(uh, C.faint, 1, [4, 4])
      // ticks along the number line, one unit of output = 1/|u| along the line
      const b = p.bounds()
      const reach = Math.max(Math.abs(b.xmin), Math.abs(b.xmax), Math.abs(b.ymin), Math.abs(b.ymax)) * 2
      const per = 1 / L
      const n = Math.min(60, Math.floor(reach / per))
      for (let k = -n; k <= n; k++) {
        const c = scale(uh, k * per)
        const nrm = { x: -uh.y * 0.08, y: uh.x * 0.08 }
        p.line({ x: c.x - nrm.x, y: c.y - nrm.y }, { x: c.x + nrm.x, y: c.y + nrm.y }, C.muted, 1)
        if (k !== 0 && (Math.abs(k) <= 3 || k % 5 === 0)) p.label(String(k), c, C.faint, { dx: -uh.y * 16, dy: -uh.x * 16 })
      }
      const drop = (w: Vec, color: string, name: string) => {
        const val = dot(u, w)
        const foot = scale(uh, val * per)
        p.line(w, scale(foot, 1), C.faint, 1, [3, 3])
        p.dot(foot, color, 3.5)
        p.label(`${name} \u21a6 ${fmt(val)}`, foot, color, { dx: uh.y * 18, dy: uh.x * 18 })
      }
      drop({ x: 1, y: 0 }, C.accent, '\u00ee')
      drop({ x: 0, y: 1 }, C.warm, '\u0135')
      drop(v, C.text, 'v')
      p.arrow({ x: 1, y: 0 }, C.accent, undefined, 1.5)
      p.arrow({ x: 0, y: 1 }, C.warm, undefined, 1.5)
      p.arrow(u, C.muted, 'u', 2)
      p.arrow(v, C.text, 'v', 2.5)
      p.note(`[${fmt(u.x)}  ${fmt(u.y)}] v  =  u \u00b7 v  =  ${fmt(dot(u, v))}`)
      break
    }
    case 'determinant': {
      const d = det(M)
      p.polygon([{ x: 0, y: 0 }, e1, add(e1, e2), e2], I, 'transparent', C.accent, true, 1.5)
      p.label(`area ${fmt(Math.abs(d))}`, { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 }, C.text, { dx: 0, dy: 0 })
      p.note(d < -1e-9 ? 'det < 0: the plane is flipped over' : Math.abs(d) < 1e-6 ? 'det = 0: flattened onto a line' : 'det > 0: orientation kept')
      break
    }
    case 'cramer': {
      const c1 = col1(A), c2 = col2(A)
      const x = solve(A, s.probe)
      const bb = s.probe
      if (!x) { p.note('det = 0: no unique solution', C.warm); p.arrow(bb, C.text, 'b', 2.5); break }
      const tt = clamp01(t)
      // input picture, faint: i-hat and x
      p.polygon([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1 + x.x, y: x.y }, x], I, C.warmSoft, C.faint)
      p.arrow(x, C.muted, `x = (${fmt(x.x)}, ${fmt(x.y)})`, 1.5)
      p.label(`area = y = ${fmt(x.y)}`, { x: (1 + x.x) / 2, y: x.y / 2 }, C.warm, { dx: 0, dy: 0 })
      // output picture: column 1 and b
      const e = scale(c1, tt), f = bb
      p.polygon([{ x: 0, y: 0 }, e, add(e, f), f], I, C.soft, C.accent)
      p.arrow(c1, C.accent, 'column 1', 2)
      p.arrow(c2, C.faint, 'column 2', 1.5)
      p.arrow(bb, C.text, 'b', 2.5)
      const area = cross(c1, bb)
      p.label(`area = det \u00b7 y = ${fmt(area)}`, { x: (c1.x + bb.x) / 2, y: (c1.y + bb.y) / 2 }, C.accent, { dx: 0, dy: 18 })
      break
    }
    case 'vector': {
      const v = scale(s.probe, clamp01(t))
      // component lines
      p.line({ x: v.x, y: 0 }, v, C.faint, 1, [3, 4])
      p.line({ x: 0, y: v.y }, v, C.faint, 1, [3, 4])
      p.label(`x = ${fmt(v.x)}`, { x: v.x / 2, y: 0 }, C.muted, { dx: 0, dy: v.y >= 0 ? 16 : -16 })
      p.label(`y = ${fmt(v.y)}`, { x: 0, y: v.y / 2 }, C.muted, { dx: v.x >= 0 ? -34 : 34, dy: 0 })
      p.arrow(v, C.accent, `v = (${fmt(v.x)}, ${fmt(v.y)})`, 2.5)
      p.dot({ x: 0, y: 0 }, C.text, 3)
      break
    }
    case 'add': {
      const u = s.probe, v = scale(s.probe2, s.options.k)
      const shift = scale(u, clamp01(t))
      const sum = add(u, v)
      p.polygon([{ x: 0, y: 0 }, u, sum, v], I, C.soft, 'transparent')
      p.arrow(v, C.faint, undefined, 1.5)
      p.arrow(u, C.accent, 'u', 2.5)
      p.arrow(add(shift, v), C.warm, s.options.k === 1 ? 'v' : `${fmt(s.options.k, 1)}v`, 2.5, shift)
      if (t >= 0.999) p.arrow(sum, C.text, 'u + v', 2.5)
      if (s.options.k !== 1) p.arrow(s.probe2, C.faint, 'v', 1)
      break
    }
    case 'dot': {
      const u = s.probe, v = s.probe2
      const { p: sh } = project(v, u)
      const d = dot(u, v)
      p.ray(u, C.faint, 1, [2, 6])
      const sht = scale(sh, clamp01(t))
      p.line(v, sht, C.muted, 1, [4, 4])
      p.arrow(sht, C.muted, 'shadow', 1.5)
      if (t >= 0.999 && len(v) > 0.05 && Math.abs(d) > 0.05) p.rightAngle(sh, unit(u), unit({ x: v.x - sh.x, y: v.y - sh.y }), C.muted)
      // angle arc
      const a0 = Math.atan2(u.y, u.x), a1 = Math.atan2(v.y, v.x)
      p.ctx.beginPath(); p.ctx.arc(p.sx(0), p.sy(0), 0.7 * p.g.unit, -a0, -a1, cross(u, v) > 0)
      p.ctx.strokeStyle = C.muted; p.ctx.lineWidth = 1; p.ctx.stroke()
      p.arrow(u, C.accent, 'u', 2.5)
      p.arrow(v, C.warm, 'v', 2.5)
      p.note(`u · v = ${fmt(d)}   ${Math.abs(d) < 0.05 ? 'perpendicular' : d > 0 ? 'they agree' : 'they oppose'}`)
      break
    }
    case 'matvec': {
      const c1 = col1(A), c2 = col2(A), x = s.probe
      const t1 = clamp01(t * 2), t2 = clamp01(t * 2 - 1)
      const leg1 = scale(c1, x.x * t1)
      const leg2 = add(leg1, scale(c2, x.y * t2))
      p.arrow(c1, C.accent, '\u00ee', 2)
      p.arrow(c2, C.warm, '\u0135', 2)
      p.arrow(x, C.faint, undefined, 1.5)
      p.label(`x = (${fmt(x.x)}, ${fmt(x.y)})`, x, C.muted, { dx: 0, dy: 20 })
      p.arrow(leg1, C.accent, `${fmt(x.x)} \u00ee`, 1.5)
      if (t2 > 0) p.arrow(leg2, C.warm, `${fmt(x.y)} \u0135`, 1.5, leg1)
      if (t >= 0.999) p.arrow(mul(A, x), C.text, 'Ax', 2.5)
      break
    }
    case 'transform': {
      const d = det(M)
      if (s.show.square && Math.abs(d) > 0.05) p.label(`det ${fmt(d)}`, { x: (e1.x + e2.x) / 2, y: (e1.y + e2.y) / 2 }, C.muted, { dx: 0, dy: 0 })
      break
    }
    case 'subspaces': {
      const r = rank(A)
      if (r === 1) {
        const { colDir, nullDir } = subspaces(A)
        p.band(colDir, C.soft)
        p.ray(colDir, C.accent, 1.5)
        p.ray(nullDir, C.warm, 1.5, [6, 5])
        p.label('column space', scale(colDir, 3.6), C.accent, { dx: 0, dy: -16 })
        p.label('null space', scale(nullDir, 3.6), C.warm, { dx: 0, dy: -16 })
        p.arrow(scale(nullDir, 1.5), C.warm, 'n', 2)
        p.arrow(mul(M, scale(nullDir, 1.5)), C.warm, undefined, 1.5)
      } else if (r === 2) {
        p.note('rank 2: the column space is the whole plane, the null space is just the origin')
      } else {
        p.note('rank 0: everything lands on the origin')
      }
      break
    }
    case 'span': {
      const vs = s.objects.filter((o) => o.kind === 'vector').map((o) => (o as { v: Vec }).v)
      const target = s.probe
      if (vs.length === 0) { p.note('add a vector or two from the panel'); p.arrow(target, C.text, 'target'); break }
      const [v1, v2] = vs
      const indep = v2 ? Math.abs(cross(v1, v2)) > 1e-3 * len(v1) * len(v2) : false
      if (indep) {
        p.fillPlane(C.soft)
        const c = solve({ a: v1.x, b: v2.x, c: v1.y, d: v2.y }, target)!
        const t1 = clamp01(t * 2), t2 = clamp01(t * 2 - 1)
        const leg1 = scale(v1, c.x * t1)
        const leg2 = add(leg1, scale(v2, c.y * t2))
        p.arrow(leg1, C.accent, `${fmt(c.x)} v1`, 1.5)
        if (t2 > 0) p.arrow(leg2, C.warm, `${fmt(c.y)} v2`, 1.5, leg1)
        p.arrow(target, C.text, 'target', 2.5)
      } else {
        const dir = unit(v1)
        p.band(dir, C.soft, 0.1)
        p.ray(dir, C.accent, 1)
        const onLine = Math.abs(cross(dir, target)) < 0.08
        p.arrow(target, onLine ? C.accent : C.text, onLine ? 'in the span' : 'outside the span', 2.5)
        p.note(vs.length > 1 ? 'your vectors are parallel, so they only span a line' : 'one vector spans a line')
      }
      vs.forEach((v, i) => p.arrow(v, i === 0 ? C.accent : i === 1 ? C.warm : C.muted, `v${i + 1}`))
      break
    }
    case 'basis': {
      const b1 = col1(A), b2 = col2(A)
      const c = solve(A, s.probe)
      p.arrow(b1, C.accent, 'b1'); p.arrow(b2, C.warm, 'b2')
      if (c) {
        const t1 = clamp01(t * 2), t2 = clamp01(t * 2 - 1)
        const leg1 = scale(b1, c.x * t1)
        const leg2 = add(leg1, scale(b2, c.y * t2))
        p.line({ x: 0, y: 0 }, leg1, C.accent, 1.5, [5, 4])
        if (t2 > 0) p.line(leg1, leg2, C.warm, 1.5, [5, 4])
        p.label(`[${fmt(c.x)}, ${fmt(c.y)}] in B`, s.probe, C.text, { dx: 0, dy: 26 })
      } else {
        p.note('the columns are dependent, so they are not a basis')
      }
      p.arrow(s.probe, C.text, 'v', 2.5)
      break
    }
    case 'project': {
      const u = col1(A)
      const { p: pr, e } = project(s.probe, u)
      p.ray(u, C.accent, 1.5)
      p.band(u, C.soft, 0.06)
      const pt = scale(pr, clamp01(t))
      const bt = s.probe
      p.line(bt, pt, C.warm, 1.5, [5, 4])
      if (t >= 0.999 && len(e) > 0.05) p.rightAngle(pr, unit(u), unit(e), C.muted)
      p.arrow(u, C.accent, 'a', 2)
      p.arrow(pt, C.accent, 'p', 2.5)
      p.arrow(bt, C.text, 'b', 2.5)
      if (t >= 0.999) p.label(`error ${fmt(len(e))}`, { x: (bt.x + pr.x) / 2, y: (bt.y + pr.y) / 2 }, C.warm, { dx: 14, dy: 0 }, 'left')
      break
    }
    case 'eigen': {
      const E = eigen(A)
      if (E.real) E.vectors.forEach((u) => p.ray(u, C.faint, 1, [2, 6]))
      const Av = mul(M, s.probe)
      const aligned = Math.abs(cross(s.probe, Av)) < 0.03 * len(s.probe) * Math.max(len(Av), 1e-6) && len(Av) > 1e-3
      p.arrow(Av, C.warm, 'Av', aligned ? 3 : 2.25)
      p.arrow(s.probe, C.accent, 'v', aligned ? 3 : 2.25)
      if (aligned) {
        const lambda = dot(s.probe, Av) / dot(s.probe, s.probe)
        p.label(`\u03bb = ${fmt(lambda)}`, s.probe, C.text, { dx: 20, dy: 24 })
      }
      break
    }
    case 'iterate': {
      const seq = iterate(A, s.probe, s.options.steps, s.options.normalize)
      const E = eigen(A)
      if (E.real) p.ray(E.vectors[0], C.faint, 1, [2, 6])
      for (let k = 1; k < seq.length; k++) p.line(seq[k - 1], seq[k], C.faint, 1)
      const k = Math.floor(t), f = t - k
      const cur = k >= seq.length - 1 ? seq[seq.length - 1] : { x: lerp(seq[k].x, seq[k + 1].x, f), y: lerp(seq[k].y, seq[k + 1].y, f) }
      seq.slice(0, k + 1).forEach((q, i) => p.dot(q, i === 0 ? C.accent : C.muted, i === 0 ? 4 : 2.5))
      p.arrow(s.probe, C.accent, 'v\u2080', 1.5)
      p.arrow(cur, C.warm, k >= 1 ? `A${sup(Math.min(k, s.options.steps))}v\u2080` : undefined, 2.5)
      if (!E.real) p.note('complex eigenvalues: the sequence spirals')
      break
    }
    case 'inverse': {
      const inv = inverse(A)
      const x = inv ? mul(inv, s.probe) : null
      p.arrow(s.probe, C.text, 'b', 2.5)
      if (x) { p.arrow(x, C.muted, 'x = A\u207b\u00b9b', 1.5); if (t <= 1) p.arrow(mul(M, x), C.accent, undefined, 1.5, undefined) }
      if (!inv) p.note('det = 0: this matrix has no inverse', C.warm)
      else if (t > 1) p.note(t >= 1.999 ? 'back where we started' : 'applying A\u207b\u00b9')
      else p.note('applying A')
      break
    }
    case 'lu': {
      const { swapped } = lu(A)
      p.note(t < 1 ? 'U: upper triangular' : t < 1.999 ? 'L: lower triangular shear' : swapped ? 'done, after one row swap' : 'done: A = L U')
      break
    }
    case 'qr': {
      const a1 = col1(A), a2 = col2(A)
      const { q1, q2, proj, resid, dependent } = qr(A)
      const t1 = clamp01(t), t2 = clamp01(t - 1), t3 = clamp01(t - 2)
      p.arrow(a1, C.faint, 'a1', 1.5); p.arrow(a2, C.faint, 'a2', 1.5)
      p.ray(q1, C.faint, 1, [2, 6])
      const q1t = { x: lerp(a1.x, q1.x, t1), y: lerp(a1.y, q1.y, t1) }
      p.arrow(q1t, C.accent, 'q1', 2.5)
      if (t2 > 0) {
        const pt = scale(proj, t2)
        p.line(a2, pt, C.muted, 1, [4, 4])
        p.arrow(pt, C.muted, undefined, 1.5)
        p.label('shadow', pt, C.muted, { dx: 0, dy: 18 })
      }
      if (t3 > 0 && !dependent) {
        const rt = scale(resid, 1)
        const end = { x: lerp(rt.x + proj.x, q2.x, t3), y: lerp(rt.y + proj.y, q2.y, t3) }
        const from = { x: lerp(proj.x, 0, t3), y: lerp(proj.y, 0, t3) }
        p.arrow(end, C.warm, 'q2', 2.5, from)
        if (t3 >= 0.999) p.rightAngle({ x: 0, y: 0 }, q1, q2, C.muted)
      }
      if (dependent) p.note('the columns are dependent, so there is no second direction', C.warm)
      break
    }
    case 'svd':
      break
  }

  if (showsBasisArrows(s.lens)) { p.arrow(e1, C.accent, '\u00ee'); p.arrow(e2, C.warm, '\u0135') }

  // User vectors: on lenses that transform the plane, show the original faintly and the image strongly.
  for (const o of s.objects) if (o.kind === 'vector' && s.lens !== 'span') {
    if (showsGrid(s.lens)) { p.arrow(o.v, C.faint, undefined, 1.5); p.arrow(mul(M, o.v), C.text, o.name, 2.25) }
    else p.arrow(o.v, C.muted, o.name, 1.75)
  }
}

const sup = (n: number) => String(n).replace(/\d/g, (d) => '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079'[+d])
