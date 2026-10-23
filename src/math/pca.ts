import { type Vec, type Mat, eigen } from './mat2'

export function pca(points: Vec[]) {
  const n = points.length
  if (n < 2) return null
  const mean = { x: points.reduce((a, p) => a + p.x, 0) / n, y: points.reduce((a, p) => a + p.y, 0) / n }
  let sxx = 0, sxy = 0, syy = 0
  for (const p of points) { const dx = p.x - mean.x, dy = p.y - mean.y; sxx += dx * dx; sxy += dx * dy; syy += dy * dy }
  const cov: Mat = { a: sxx / (n - 1), b: sxy / (n - 1), c: sxy / (n - 1), d: syy / (n - 1) }
  const E = eigen(cov)
  if (!E.real) return null
  return { mean, cov, values: E.values, vectors: E.vectors }
}

export function randomCloud(n: number, angle: number, sx: number, sy: number, center: Vec): Vec[] {
  const out: Vec[] = []
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
  for (let i = 0; i < n; i++) {
    const a = gauss() * sx, b = gauss() * sy
    out.push({ x: center.x + a * Math.cos(angle) - b * Math.sin(angle), y: center.y + a * Math.sin(angle) + b * Math.cos(angle) })
  }
  return out
}
