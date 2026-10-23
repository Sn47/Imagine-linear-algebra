import { describe, it, expect } from 'vitest'
import { compose, composeAt, eigen, svd, svdAt, inverse, lu, qr, project, det, mmul, mul, I, solve, type Mat } from '../math/mat2'
import { det3, cross3, dot3, rank3, type Mat3 } from '../math/mat3'
import { eigen3, cubicRoots } from '../math/eig3'
import { svdn, reconstruct, sampleImage } from '../math/svdn'
import { pca } from '../math/pca'
import { resample, epicycles, chain, SHAPES } from '../math/fourier'
import { chaosGame, IFS } from '../math/ifs'
import { classify } from '../math/flow'
import { rotate4, project4, tesseract } from '../math/hyper'

const close = (a: number, b: number, tol = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(tol)
const matClose = (P: Mat, Q: Mat, tol = 1e-6) => { close(P.a, Q.a, tol); close(P.b, Q.b, tol); close(P.c, Q.c, tol); close(P.d, Q.d, tol) }

describe('2x2', () => {
  const A: Mat = { a: 1, b: 0.5, c: 0, d: 1.2 }
  const B: Mat = { a: 0, b: -1, c: 1, d: 0 }
  it('compose applies left to right', () => matClose(compose([A, B]), mmul(B, A)))
  it('composeAt interpolates stagewise', () => { matClose(composeAt([A, B], 0), I); matClose(composeAt([A, B], 1), A); matClose(composeAt([A, B], 2), mmul(B, A)) })
  it('eigen satisfies Av = λv', () => {
    const M: Mat = { a: 2, b: 1, c: 1, d: 3 }
    const E = eigen(M)
    expect(E.real).toBe(true)
    if (E.real) E.vectors.forEach((v, i) => { const Av = mul(M, v); close(Av.x, E.values[i] * v.x); close(Av.y, E.values[i] * v.y) })
  })
  it('eigen detects rotation as complex', () => expect(eigen(B).real).toBe(false))
  it('svd reconstructs the matrix and is correct at t=3', () => {
    for (const M of [A, B, { a: 0, b: 1, c: 1, d: 0 }, { a: 1, b: 0.5, c: 2, d: 1 }, { a: 2, b: 0.5, c: 0.5, d: 1 }]) {
      const f = svd(M)
      matClose(svdAt(f, 3), M, 1e-6)
      expect(f.s1).toBeGreaterThanOrEqual(Math.abs(f.s2) - 1e-9)
    }
  })
  it('inverse undoes', () => { const inv = inverse(A)!; matClose(mmul(inv, A), I) ; expect(inverse({ a: 1, b: 2, c: 2, d: 4 })).toBeNull() })
  it('lu multiplies back', () => {
    for (const M of [A, { a: 0, b: 1, c: 2, d: 3 }]) {
      const { L, U, swapped } = lu(M)
      const PA = swapped ? { a: M.c, b: M.d, c: M.a, d: M.b } : M
      matClose(mmul(L, U), PA)
    }
  })
  it('qr gives orthonormal q and reproduces A', () => {
    const { q1, q2, R } = qr(A)
    close(q1.x * q2.x + q1.y * q2.y, 0); close(Math.hypot(q1.x, q1.y), 1); close(Math.hypot(q2.x, q2.y), 1)
    const Q: Mat = { a: q1.x, b: q2.x, c: q1.y, d: q2.y }
    matClose(mmul(Q, R), A)
  })
  it('projection residual is perpendicular', () => { const { p, e } = project({ x: 3, y: 1 }, { x: 1, y: 2 }); close(e.x * 1 + e.y * 2, 0); close(p.x * 2 - p.y * 1, 0) })
  it('solve', () => { const x = solve(A, { x: 2, y: 1.2 })!; close(x.x, 1.5); close(x.y, 1) })
  it('det', () => close(det(A), 1.2))
})

describe('3x3', () => {
  const R: Mat3 = [[0.707, -0.707, 0], [0.707, 0.707, 0], [0, 0, 1]]
  it('rotation about z has eigenvalue 1 along k', () => {
    const E = eigen3(R)
    const one = E.find((e) => Math.abs(e.value - 1) < 1e-3)!
    expect(one).toBeTruthy(); close(Math.abs(one.vector.z), 1, 1e-3)
  })
  it('diagonal has its diagonal as eigenvalues', () => {
    const E = eigen3([[1.5, 0, 0], [0, 0.7, 0], [0, 0, 1.2]]).map((e) => e.value).sort()
    expect(E.length).toBe(3); close(E[0], 0.7, 1e-9); close(E[1], 1.2, 1e-9); close(E[2], 1.5, 1e-9)
  })
  it('cubic roots', () => { const r = cubicRoots(-6, 11, -6).sort(); close(r[0], 1, 1e-9); close(r[1], 2, 1e-9); close(r[2], 3, 1e-9) })
  it('cross is perpendicular, det and rank', () => {
    const u = { x: 2, y: 0.5, z: 0 }, v = { x: 0.5, y: 2, z: 0.8 }
    const w = cross3(u, v); close(dot3(u, w), 0); close(dot3(v, w), 0)
    close(det3(R), 1, 1e-3); expect(rank3([[1, 2, 3], [2, 4, 6], [1, 1, 1]])).toBe(2)
  })
})

describe('svd for images', () => {
  it('full rank reconstruction matches', () => {
    const img = sampleImage(16)
    const { U, s, V } = svdn(img, 16, 16)
    const rec = reconstruct(U, s, V, 16, 16, 16)
    let err = 0; for (let i = 0; i < img.length; i++) err = Math.max(err, Math.abs(img[i] - rec[i]))
    expect(err).toBeLessThan(1e-6)
    for (let i = 1; i < 16; i++) expect(s[i - 1]).toBeGreaterThanOrEqual(s[i] - 1e-12)
  })
})

describe('pca', () => {
  it('finds the direction of a diagonal line', () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i / 10, y: i / 10 + (i % 2 ? 0.01 : -0.01) }))
    const R = pca(pts)!
    close(Math.abs(R.vectors[0].x), Math.SQRT1_2, 1e-2); expect(R.values[0]).toBeGreaterThan(R.values[1] * 100)
  })
})

describe('fourier epicycles', () => {
  it('a circle needs one circle', () => {
    const pts = resample(Array.from({ length: 64 }, (_, i) => ({ x: Math.cos((i / 64) * 2 * Math.PI), y: Math.sin((i / 64) * 2 * Math.PI) })), 128)
    const cyc = epicycles(pts, 7)
    expect(cyc[0].freq).toBe(1); close(cyc[0].amp, 1, 1e-2); expect(cyc[1].amp).toBeLessThan(1e-2)
  })
  it('chain with all circles reproduces the shape', () => {
    const target = resample(SHAPES.heart(200), 128)
    const cyc = epicycles(target, 127)
    const tip = chain(cyc, 0).at(-1)!
    close(tip.x, target[0].x, 1e-2); close(tip.y, target[0].y, 1e-2)
  })
})

describe('ifs and flow and 4d', () => {
  it('chaos game stays bounded and deterministic', () => {
    const a = chaosGame(IFS.fern.maps, 2000, 0), b = chaosGame(IFS.fern.maps, 2000, 0)
    expect(a.length).toBe(2000); expect(a[100]).toEqual(b[100]); expect(a.every((p) => Math.abs(p.x) < 5 && p.y >= -0.01 && p.y < 11)).toBe(true)
  })
  it('classifies flows', () => {
    expect(classify({ a: 1, b: 0, c: 0, d: -1 }).kind).toBe('saddle')
    expect(classify({ a: 0, b: -1, c: 1, d: 0 }).kind).toBe('centre')
    expect(classify({ a: -0.3, b: -1, c: 1, d: -0.3 }).kind).toBe('spiral in')
    expect(classify({ a: -1, b: 0, c: 0, d: -2 }).kind).toBe('sink')
  })
  it('4d rotation preserves length; tesseract has 32 edges', () => {
    const v = rotate4([1, 2, 3, 4], [0.3, 0.2, 0.1, 0.4, 0.5, 0.6])
    close(Math.hypot(...v), Math.hypot(1, 2, 3, 4), 1e-9)
    expect(tesseract.edges.length).toBe(32); expect(project4([0, 0, 0, 0]).x).toBe(0)
  })
})
