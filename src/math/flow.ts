import { type Mat, eigen } from './mat2'

export type FlowKind = 'saddle' | 'sink' | 'source' | 'spiral in' | 'spiral out' | 'centre' | 'degenerate'

export function classify(A: Mat): { kind: FlowKind; note: string } {
  const E = eigen(A)
  if (!E.real) {
    if (Math.abs(E.re) < 1e-6) return { kind: 'centre', note: 'purely imaginary eigenvalues: everything orbits' }
    return E.re < 0 ? { kind: 'spiral in', note: 'complex eigenvalues with negative real part' } : { kind: 'spiral out', note: 'complex eigenvalues with positive real part' }
  }
  const [l1, l2] = E.values
  if (Math.abs(l1) < 1e-6 || Math.abs(l2) < 1e-6) return { kind: 'degenerate', note: 'a zero eigenvalue: a whole line of fixed points' }
  if (l1 > 0 && l2 < 0) return { kind: 'saddle', note: 'one positive, one negative eigenvalue' }
  if (l1 < 0 && l2 < 0) return { kind: 'sink', note: 'both eigenvalues negative: everything falls in' }
  return { kind: 'source', note: 'both eigenvalues positive: everything flies out' }
}

export const FLOW_PRESETS: { name: string; m: Mat }[] = [
  { name: 'Saddle', m: { a: 1, b: 0.3, c: 0.3, d: -1 } },
  { name: 'Spiral in', m: { a: -0.3, b: -1.2, c: 1.2, d: -0.3 } },
  { name: 'Centre', m: { a: 0, b: -1, c: 1, d: 0 } },
  { name: 'Sink', m: { a: -1, b: 0.5, c: 0, d: -0.6 } },
  { name: 'Source', m: { a: 0.6, b: 0.2, c: -0.4, d: 0.9 } },
]
