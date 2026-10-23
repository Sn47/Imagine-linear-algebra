/** One-sided Jacobi SVD for a small dense m×n matrix (row-major). Returns U (m×n), s (n), V (n×n). */
export function svdn(A: Float64Array, m: number, n: number, sweeps = 30) {
  const U = Float64Array.from(A)
  const V = new Float64Array(n * n)
  for (let i = 0; i < n; i++) V[i * n + i] = 1
  for (let sweep = 0; sweep < sweeps; sweep++) {
    let off = 0
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      let alpha = 0, beta = 0, gamma = 0
      for (let i = 0; i < m; i++) { const up = U[i * n + p], uq = U[i * n + q]; alpha += up * up; beta += uq * uq; gamma += up * uq }
      if (Math.abs(gamma) < 1e-12) continue
      off += (gamma * gamma) / (alpha * beta)
      const zeta = (beta - alpha) / (2 * gamma)
      const t = Math.sign(zeta || 1) / (Math.abs(zeta) + Math.sqrt(1 + zeta * zeta))
      const c = 1 / Math.sqrt(1 + t * t), s = c * t
      for (let i = 0; i < m; i++) { const up = U[i * n + p], uq = U[i * n + q]; U[i * n + p] = c * up - s * uq; U[i * n + q] = s * up + c * uq }
      for (let i = 0; i < n; i++) { const vp = V[i * n + p], vq = V[i * n + q]; V[i * n + p] = c * vp - s * vq; V[i * n + q] = s * vp + c * vq }
    }
    if (off < 1e-14) break
  }
  const s = new Float64Array(n)
  for (let j = 0; j < n; j++) {
    let norm = 0
    for (let i = 0; i < m; i++) norm += U[i * n + j] * U[i * n + j]
    norm = Math.sqrt(norm); s[j] = norm
    if (norm > 1e-12) for (let i = 0; i < m; i++) U[i * n + j] /= norm
  }
  // sort by descending singular value
  const order = Array.from(s.keys()).sort((a, b) => s[b] - s[a])
  const U2 = new Float64Array(m * n), V2 = new Float64Array(n * n), s2 = new Float64Array(n)
  order.forEach((j, k) => {
    s2[k] = s[j]
    for (let i = 0; i < m; i++) U2[i * n + k] = U[i * n + j]
    for (let i = 0; i < n; i++) V2[i * n + k] = V[i * n + j]
  })
  return { U: U2, s: s2, V: V2 }
}

/** Rank-k reconstruction. */
export function reconstruct(U: Float64Array, s: Float64Array, V: Float64Array, m: number, n: number, k: number) {
  const out = new Float64Array(m * n)
  for (let r = 0; r < k; r++) {
    const sr = s[r]
    if (sr < 1e-12) break
    for (let i = 0; i < m; i++) {
      const u = U[i * n + r] * sr
      if (u === 0) continue
      for (let j = 0; j < n; j++) out[i * n + j] += u * V[j * n + r]
    }
  }
  return out
}

/** A built-in test image so the lens works before anyone uploads a photo. */
export function sampleImage(size = 64): Float64Array {
  const img = new Float64Array(size * size)
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const x = (j / size) * 2 - 1, y = (i / size) * 2 - 1
    let v = 0.55 + 0.25 * x - 0.15 * y
    if (Math.hypot(x + 0.3, y + 0.2) < 0.35) v = 0.15
    if (Math.abs(x - 0.4) < 0.25 && Math.abs(y - 0.35) < 0.3) v = 0.9
    if (y > 0.55) v = 0.3 + 0.1 * Math.sin(x * 12)
    img[i * size + j] = Math.max(0, Math.min(1, v))
  }
  return img
}
