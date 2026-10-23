import type { Lens } from './lenses'
import { det, eigen, solve, cross, len, dot, compose, inverse, mul, project, col1, type Vec, type Mat } from '../math/mat2'
import { det3 } from '../math/mat3'
import { classify } from '../math/flow'

export type SceneLike = {
  stack: { m: Mat }[]
  probe: Vec
  probe2: Vec
  objects: ({ kind: 'vector'; v: Vec } | { kind: 'shape'; points: Vec[] })[]
  m3: number[][]
  points: Vec[]
  rank: number
  fourier: { terms: number }
  path: Vec[]
  circles: number
  options: { k: number }
}

export type Challenge = { text: string; check: (s: SceneLike) => boolean }

const near = (a: number, b: number, tol = 0.05) => Math.abs(a - b) < tol
const vnear = (a: Vec, b: Vec, tol = 0.1) => Math.hypot(a.x - b.x, a.y - b.y) < tol
const A = (s: SceneLike) => compose(s.stack.map((it) => it.m))

export const CHALLENGES: Partial<Record<Lens, Challenge[]>> = {
  vector: [
    { text: 'Make v = (3, −2).', check: (s) => vnear(s.probe, { x: 3, y: -2 }) },
    { text: 'Make v exactly 2 units long, pointing anywhere.', check: (s) => near(len(s.probe), 2, 0.05) },
    { text: 'Point v straight down.', check: (s) => Math.abs(s.probe.x) < 0.1 && s.probe.y < -0.5 },
  ],
  add: [
    { text: 'Make u + v = (0, 3).', check: (s) => vnear({ x: s.probe.x + s.options.k * s.probe2.x, y: s.probe.y + s.options.k * s.probe2.y }, { x: 0, y: 3 }) },
    { text: 'Make the sum vanish: u + kv = 0.', check: (s) => len({ x: s.probe.x + s.options.k * s.probe2.x, y: s.probe.y + s.options.k * s.probe2.y }) < 0.1 },
  ],
  dot: [
    { text: 'Make u and v perpendicular.', check: (s) => Math.abs(dot(s.probe, s.probe2)) < 0.08 && len(s.probe) > 0.5 && len(s.probe2) > 0.5 },
    { text: 'Make u · v = −2.', check: (s) => near(dot(s.probe, s.probe2), -2, 0.1) },
  ],
  matvec: [
    { text: 'Pick x so that Ax lands on (0, 0) without x being zero. Hint: first make A singular.', check: (s) => len(s.probe) > 0.3 && len(mul(A(s), s.probe)) < 0.1 },
    { text: 'Make Ax = (2, 2).', check: (s) => vnear(mul(A(s), s.probe), { x: 2, y: 2 }) },
  ],
  transform: [
    { text: 'Make the determinant −2.', check: (s) => near(det(A(s)), -2, 0.08) },
    { text: 'Flatten the plane: determinant zero, with the matrix not all zeros.', check: (s) => Math.abs(det(A(s))) < 0.03 && len(col1(A(s))) > 0.2 },
    { text: 'Build a pure 90° rotation by dragging î and ĵ.', check: (s) => { const M = A(s); return vnear(col1(M), { x: 0, y: 1 }) && vnear({ x: M.b, y: M.d }, { x: -1, y: 0 }) } },
  ],
  determinant: [
    { text: 'Make the area exactly 3 with orientation kept.', check: (s) => near(det(A(s)), 3, 0.08) },
    { text: 'Flip the plane: area 1, orientation reversed.', check: (s) => near(det(A(s)), -1, 0.08) },
  ],
  inverse: [
    { text: 'Choose a matrix with no inverse that still sends some vector to b.', check: (s) => { const M = A(s); const c = col1(M); return Math.abs(det(M)) < 0.03 && len(c) > 0.2 && Math.abs(cross(c, s.probe)) < 0.1 } },
  ],
  span: [
    { text: 'Add two vectors that only span a line.', check: (s) => { const vs = s.objects.filter((o) => o.kind === 'vector') as { v: Vec }[]; return vs.length >= 2 && Math.abs(cross(vs[0].v, vs[1].v)) < 0.05 * len(vs[0].v) * len(vs[1].v) } },
    { text: 'With two independent vectors, drag the target so that c₁ = 2 and c₂ = −1.', check: (s) => { const vs = s.objects.filter((o) => o.kind === 'vector') as { v: Vec }[]; if (vs.length < 2) return false; const c = solve({ a: vs[0].v.x, b: vs[1].v.x, c: vs[0].v.y, d: vs[1].v.y }, s.probe); return !!c && near(c.x, 2, 0.08) && near(c.y, -1, 0.08) } },
  ],
  subspaces: [
    { text: 'Make a rank-one matrix whose column space is the line y = x.', check: (s) => { const M = A(s); return Math.abs(det(M)) < 0.03 && Math.abs(M.a - M.c) < 0.08 && len(col1(M)) > 0.3 } },
  ],
  basis: [
    { text: 'Drag v so its coordinates in basis B are (1, 1).', check: (s) => { const c = solve(A(s), s.probe); return !!c && vnear(c, { x: 1, y: 1 }, 0.08) } },
  ],
  project: [
    { text: 'Drag b so the error is zero but b is not the origin.', check: (s) => len(project(s.probe, col1(A(s))).e) < 0.06 && len(s.probe) > 0.5 },
    { text: 'Make the best x equal to −1.', check: (s) => near(project(s.probe, col1(A(s))).coef, -1, 0.05) },
  ],
  cramer: [
    { text: 'Make the solution x = (1, 2).', check: (s) => { const x = solve(A(s), s.probe); return !!x && vnear(x, { x: 1, y: 2 }, 0.08) } },
  ],
  eigen: [
    { text: 'Find an eigenvector: line v up with Av.', check: (s) => { const Av = mul(A(s), s.probe); return Math.abs(cross(s.probe, Av)) < 0.03 * len(s.probe) * Math.max(len(Av), 1e-6) && len(Av) > 0.05 } },
    { text: 'Set a matrix with eigenvalues exactly 2 and 3.', check: (s) => { const E = eigen(A(s)); return E.real && near(E.values[0], 3, 0.05) && near(E.values[1], 2, 0.05) } },
    { text: 'Set a matrix with no real eigenvectors.', check: (s) => !eigen(A(s)).real },
  ],
  complex: [
    { text: 'Put z on the unit circle at 45°.', check: (s) => near(len(s.probe), 1, 0.05) && near(Math.atan2(s.probe.y, s.probe.x), Math.PI / 4, 0.06) },
    { text: 'Make z² = −1 (there are two answers).', check: (s) => near(len(s.probe), 1, 0.05) && Math.abs(s.probe.x) < 0.06 },
  ],
  transform3: [
    { text: 'Make the volume scale factor −1.', check: (s) => near(det3(s.m3 as never), -1, 0.1) },
    { text: 'Flatten the cube: determinant zero.', check: (s) => Math.abs(det3(s.m3 as never)) < 0.05 },
  ],
  pca: [
    { text: 'Add at least 8 points.', check: (s) => s.points.length >= 8 },
  ],
  compress: [
    { text: 'Find the smallest rank that keeps under 25% of the numbers.', check: (s) => s.rank * 129 < 0.25 * 4096 && s.rank >= 1 },
  ],
  fourier: [
    { text: 'Use at least 9 terms.', check: (s) => s.fourier.terms >= 9 },
  ],
  svd: [
    { text: 'Make σ₂ = 0 with σ₁ > 0.', check: (s) => { const M = A(s); return Math.abs(det(M)) < 0.03 && len(col1(M)) > 0.2 } },
  ],
  qr: [
    { text: 'Make the two columns perpendicular with R diagonal.', check: (s) => { const M = A(s); return Math.abs(M.a * M.b + M.c * M.d) < 0.05 && Math.abs(det(M)) > 0.2 } },
  ],
  lu: [
    { text: 'Make a matrix that needs a row swap.', check: (s) => { const M = A(s); return Math.abs(M.a) < 0.03 && Math.abs(M.c) > 0.2 } },
  ],
  iterate: [
    { text: 'Choose a matrix whose iteration spirals (complex eigenvalues).', check: (s) => !eigen(A(s)).real },
  ],
  duality: [
    { text: 'Make the 1×2 matrix send v to exactly 0 while v is not zero.', check: (s) => Math.abs(dot(s.probe, s.probe2)) < 0.06 && len(s.probe) > 0.5 && len(s.probe2) > 0.5 },
  ],
  cross: [],
  nonsquare: [],
  eigen3: [],
  epicycles: [
    { text: 'Draw your own shape on the canvas.', check: (s) => s.path.length >= 20 },
    { text: 'Reproduce it with 5 circles or fewer.', check: (s) => s.path.length >= 20 && s.circles <= 5 },
  ],
  flow: [
    { text: 'Make a saddle.', check: (s) => classify(A(s)).kind === 'saddle' },
    { text: 'Make a centre: closed orbits, nothing in or out.', check: (s) => classify(A(s)).kind === 'centre' },
    { text: 'Make a spiral that falls inward.', check: (s) => classify(A(s)).kind === 'spiral in' },
  ],
  multiply: [
    { text: 'Make BA = I by choosing B as the inverse of A.', check: (s) => { const [Am, Bm] = s.stack.map((it) => it.m); if (!Bm) return false; const inv = inverse(Am); return !!inv && vnear({ x: Bm.a, y: Bm.c }, { x: inv.a, y: inv.c }, 0.08) && vnear({ x: Bm.b, y: Bm.d }, { x: inv.b, y: inv.d }, 0.08) } },
  ],
}
