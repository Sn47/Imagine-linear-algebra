import { useEffect, useRef, useState } from 'react'
import { useStore, PRESETS, type StackItem } from '../state/store'
import { LENSES, LENS_ORDER } from '../state/lenses'
import { compose, det, trace, eigen, svd, rot, diag, fmt, rank, inverse, lu, qr, project, solve, col1, col2, cross, len, fromCols, dot, mul, scale, mmul, type Mat } from '../math/mat2'
import { det3, cross3, len3, col3, rank3, type Vec3 } from '../math/mat3'

/** Number input that keeps what you type until it parses, and follows outside changes (drags) when not focused. */
function NumberField({ value, onChange, className, label }: { value: number; onChange: (n: number) => void; className: string; label: string }) {
  const [text, setText] = useState(String(+value.toFixed(2)))
  const [focused, setFocused] = useState(false)
  useEffect(() => { if (!focused) setText(String(+value.toFixed(2))) }, [value, focused])
  return (
    <input
      className={className}
      type="text"
      inputMode="decimal"
      value={text}
      aria-label={label}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); setText(String(+value.toFixed(2))) }}
      onChange={(e) => { setText(e.target.value); const n = parseFloat(e.target.value); if (Number.isFinite(n)) onChange(n) }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); onChange(+(value + (e.key === 'ArrowUp' ? 0.1 : -0.1) * (e.shiftKey ? 10 : 1)).toFixed(3)) }
      }}
    />
  )
}

function Vec3Editor({ name, v, onChange }: { name: string; v: Vec3; onChange: (v: Vec3) => void }) {
  return (
    <div className="vec3">
      <span className="mono muted">{name}</span>
      <div className="matrix one">
        <NumberField className="" value={v.x} label={`${name} x`} onChange={(x) => onChange({ ...v, x })} />
        <NumberField className="" value={v.y} label={`${name} y`} onChange={(y) => onChange({ ...v, y })} />
        <NumberField className="" value={v.z} label={`${name} z`} onChange={(z) => onChange({ ...v, z })} />
      </div>
    </div>
  )
}

function Matrix3Editor({ cols = 3, rows = 3 }: { cols?: number; rows?: number }) {
  const { m3, setM3 } = useStore()
  const cls = ['i', 'j', 'k']
  return (
    <div className={`matrix three c${cols}`}>
      {Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (
        <NumberField key={`${r}${c}`} className={cls[c]} value={m3[r][c]} label={`row ${r + 1} column ${c + 1}`} onChange={(v) => setM3(r, c, v)} />
      )))}
    </div>
  )
}

function MatrixEditor({ item, index }: { item: StackItem; index: number }) {
  const { setMatrix, removeMatrix, moveMatrix, stack, t, lens } = useStore()
  const active = lens === 'transform' && t > index && t <= index + 1
  const field = (k: keyof Mat, cls: string, label: string) => (
    <NumberField className={cls} value={item.m[k]} label={`${item.name} ${label}`} onChange={(n) => setMatrix(item.id, { [k]: n })} />
  )
  return (
    <div className={`stack-item${active ? ' active' : ''}`}>
      <div className="stack-head">
        <span className="mono">{item.name}</span>
        {stack.length > 1 && (
          <span className="stack-tools">
            <button onClick={() => moveMatrix(item.id, -1)} disabled={index === 0} aria-label="Apply earlier">↑</button>
            <button onClick={() => moveMatrix(item.id, 1)} disabled={index === stack.length - 1} aria-label="Apply later">↓</button>
            <button onClick={() => removeMatrix(item.id)} aria-label="Remove matrix">×</button>
          </span>
        )}
      </div>
      <div className="matrix">
        {field('a', 'i', 'a')}{field('b', 'j', 'b')}{field('c', 'i', 'c')}{field('d', 'j', 'd')}
      </div>
    </div>
  )
}

function Mini({ name, m, on }: { name: string; m: Mat; on: boolean }) {
  return (
    <div className={`factor${on ? ' on' : ''}`}>
      <div className="name">{name}</div>
      <div className="mini"><span>{fmt(m.a)}</span><span>{fmt(m.b)}</span><span>{fmt(m.c)}</span><span>{fmt(m.d)}</span></div>
    </div>
  )
}

export default function Panel({ onPlay }: { onPlay: () => void }) {
  const s = useStore()
  const asideRef = useRef<HTMLElement>(null)
  useEffect(() => { asideRef.current?.scrollTo({ top: 0 }) }, [s.lens])
  const M = compose(s.stack.map((it) => it.m))
  const d = det(M)
  const E = eigen(M)
  const F = svd(M)
  const stage = s.t < 1 ? 0 : s.t < 2 ? 1 : 2

  const rows: [string, string, string?][] = [
    ['Determinant', fmt(d), d < -1e-9 ? 'orientation flipped' : Math.abs(d) < 1e-9 ? 'collapses a dimension' : undefined],
    ['Trace', fmt(trace(M))],
  ]
  const vectorLens = s.lens === 'vector' || s.lens === 'add' || s.lens === 'dot' || s.lens === 'duality' || s.lens === 'spaces' || !!LENSES[s.lens].is3d
  if (vectorLens) rows.length = 0
  if (s.lens === 'vector') {
    const v = s.probe
    rows.push(['v', `(${fmt(v.x)}, ${fmt(v.y)})`], ['Length', fmt(len(v)), '√(x² + y²)'], ['Angle', `${fmt((Math.atan2(v.y, v.x) * 180) / Math.PI, 1)}°`, 'from the x axis'])
  }
  if (s.lens === 'add') {
    const u = s.probe, v = scale(s.probe2, s.options.k)
    rows.push(['u', `(${fmt(u.x)}, ${fmt(u.y)})`], [s.options.k === 1 ? 'v' : `${fmt(s.options.k, 1)}v`, `(${fmt(v.x)}, ${fmt(v.y)})`], ['u + v', `(${fmt(u.x + v.x)}, ${fmt(u.y + v.y)})`, 'add the x parts, add the y parts'])
  }
  if (s.lens === 'dot') {
    const u = s.probe, v = s.probe2
    const d = dot(u, v)
    const cosT = d / (len(u) * len(v) || 1)
    rows.push(['u · v', fmt(d), `${fmt(u.x)}·${fmt(v.x)} + ${fmt(u.y)}·${fmt(v.y)}`], ['Angle', `${fmt((Math.acos(Math.max(-1, Math.min(1, cosT))) * 180) / Math.PI, 1)}°`], ['|u| |v| cos θ', fmt(len(u) * len(v) * cosT), 'the same number'], ['Shadow length', fmt(Math.abs(project(v, u).coef) * len(u))])
  }
  if (s.lens === 'matvec') {
    const x = s.probe, Ax = mul(M, x)
    rows.push(['x', `(${fmt(x.x)}, ${fmt(x.y)})`], ['Ax', `(${fmt(Ax.x)}, ${fmt(Ax.y)})`, `${fmt(x.x)}·(${fmt(M.a)}, ${fmt(M.c)}) + ${fmt(x.y)}·(${fmt(M.b)}, ${fmt(M.d)})`])
  }
  if (s.lens === 'duality') {
    const u = s.probe2, v = s.probe
    rows.length = 0
    rows.push(['1 × 2 matrix', `[${fmt(u.x)}  ${fmt(u.y)}]`, 'the same numbers as u'], ['applied to v', fmt(dot(u, v)), `${fmt(u.x)}·${fmt(v.x)} + ${fmt(u.y)}·${fmt(v.y)}`], ['î lands at', fmt(u.x)], ['ĵ lands at', fmt(u.y)])
  }
  if (s.lens === 'determinant') {
    rows.length = 0
    rows.push(['det A', fmt(d), `${fmt(M.a)}·${fmt(M.d)} − ${fmt(M.b)}·${fmt(M.c)}`], ['Orientation', d < -1e-9 ? 'flipped' : Math.abs(d) < 1e-9 ? 'collapsed' : 'kept'])
    if (s.stack.length > 1) {
      const ds = s.stack.map((it) => det(it.m))
      rows.push(['Each det', ds.map((x) => fmt(x)).join(' × ')], ['Product', fmt(ds.reduce((a, b) => a * b, 1)), 'equals det of the product'])
    }
  }
  if (s.lens === 'cramer') {
    const x = solve(M, s.probe), bb = s.probe
    rows.length = 0
    rows.push(['det A', fmt(d)], ['det [b  col2]', fmt(cross(bb, col2(M)))], ['det [col1  b]', fmt(cross(col1(M), bb))])
    rows.push(['x', x ? `(${fmt(x.x)}, ${fmt(x.y)})` : 'no unique solution', x ? 'each coordinate is a ratio of the two' : undefined])
  }
  if (s.lens === 'inverse') {
    const inv = inverse(M)
    if (inv) { const x = mul(inv, s.probe); rows.push(['b', `(${fmt(s.probe.x)}, ${fmt(s.probe.y)})`], ['x = A⁻¹b', `(${fmt(x.x)}, ${fmt(x.y)})`, 'so that Ax = b']) }
  }
  if (s.lens === 'basis') {
    const inv = inverse(M)
    if (inv) { const R = rot(Math.PI / 2); const N = mmul(inv, mmul(R, M)); rows.push(['B⁻¹ M B', `[${fmt(N.a)} ${fmt(N.b)}; ${fmt(N.c)} ${fmt(N.d)}]`, 'a 90° rotation, described in basis B']) }
  }
  if (s.lens === 'eigen') {
    const m = trace(M) / 2, pr = det(M)
    rows.push(['m = tr/2', fmt(m)], ['p = det', fmt(pr)], ['m² − p', fmt(m * m - pr), m * m - pr < 0 ? 'negative: complex eigenvalues' : 'λ = m ± √(m² − p)'])
  }
  if (s.lens === 'transform3') {
    rows.length = 0
    const d3 = det3(s.m3)
    rows.push(['det', fmt(d3), d3 < -1e-9 ? 'turned inside out' : Math.abs(d3) < 1e-6 ? 'volume lost' : 'volume scale'], ['Rank', String(rank3(s.m3))])
  }
  if (s.lens === 'nonsquare') {
    rows.length = 0
    const c1 = col3(s.m3, 0), c2 = col3(s.m3, 1)
    rows.push(['Shape', '3 × 2', '3 outputs, 2 inputs'], ['Rank', len3(cross3(c1, c2)) > 1e-6 ? '2' : '1'])
  }
  if (s.lens === 'cross') {
    rows.length = 0
    const w = cross3(s.u3, s.v3)
    rows.push(['u × v', `(${fmt(w.x)}, ${fmt(w.y)}, ${fmt(w.z)})`], ['|u × v|', fmt(len3(w)), 'area of the parallelogram'], ['u · (u × v)', fmt(s.u3.x * w.x + s.u3.y * w.y + s.u3.z * w.z), 'perpendicular to u'], ['2D version', fmt(s.u3.x * s.v3.y - s.u3.y * s.v3.x), 'det [u v] using x and y only'])
  }
  if (s.lens === 'spaces') {
    rows.length = 0
    const [a, b, c, dd] = s.poly
    rows.push(['f as a vector', `(${fmt(a, 1)}, ${fmt(b, 1)}, ${fmt(c, 1)}, ${fmt(dd, 1)})`, 'basis 1, x, x², x³'], ['f′ as a vector', `(${fmt(b, 1)}, ${fmt(2 * c, 1)}, ${fmt(3 * dd, 1)}, 0)`, 'the matrix times the vector above'])
  }
  if (s.lens === 'subspaces') rows.push(['Rank', String(rank(M))], ['Nullity', String(2 - rank(M))])
  if (s.lens === 'eigen' || s.lens === 'iterate' || s.lens === 'transform') {
    if (E.real) rows.push(['λ₁', fmt(E.values[0])], ['λ₂', fmt(E.values[1]), E.repeated ? 'repeated' : undefined])
    else rows.push(['Eigenvalues', `${fmt(E.re)} ± ${fmt(E.im)}i`, 'complex: no real eigenvectors, it rotates'])
  }
  if (s.lens === 'svd') rows.push(['σ₁', fmt(F.s1)], ['σ₂', fmt(Math.abs(F.s2)), F.s2 < 0 ? 'with a flip' : undefined])
  if (s.lens === 'basis') {
    const c = solve(M, s.probe)
    rows.push(['v, standard', `(${fmt(s.probe.x)}, ${fmt(s.probe.y)})`], ['v, in basis B', c ? `(${fmt(c.x)}, ${fmt(c.y)})` : 'undefined'])
  }
  if (s.lens === 'project') {
    const { coef, e } = project(s.probe, col1(M))
    rows.push(['Best x in a·x ≈ b', fmt(coef)], ['Error |b − p|', fmt(len(e))])
  }
  if (s.lens === 'span') {
    const vs = s.objects.filter((o) => o.kind === 'vector').map((o) => (o as { v: { x: number; y: number } }).v)
    const indep = vs.length >= 2 && Math.abs(cross(vs[0], vs[1])) > 1e-3 * len(vs[0]) * len(vs[1])
    rows.length = 0
    rows.push(['Vectors', String(vs.length)], ['Span', vs.length === 0 ? 'just the origin' : indep ? 'the whole plane' : 'a line'])
    if (indep) { const c = solve(fromCols(vs[0], vs[1]), s.probe)!; rows.push(['target = c₁v₁ + c₂v₂', `c₁ ${fmt(c.x)}, c₂ ${fmt(c.y)}`]) }
  }

  const idx = LENS_ORDER.indexOf(s.lens)
  const prev = idx > 0 ? LENS_ORDER[idx - 1] : null
  const next = idx < LENS_ORDER.length - 1 ? LENS_ORDER[idx + 1] : null
  const inv = inverse(M)
  const LU = lu(M)
  const QR = qr(M)
  const PR = project(s.probe, col1(M))
  const luStage = s.t < 1 ? 0 : s.t < 2 ? 1 : 2
  const qrStage = s.t < 1 ? 0 : s.t < 2 ? 1 : 2
  return (
    <aside ref={asideRef}>
      <div>
        <h1>{LENSES[s.lens].title}</h1>
        <p className="hint">{LENSES[s.lens].hint}</p>
        {LENSES[s.lens].chapter && <p className="chapter">Essence of linear algebra, chapter {LENSES[s.lens].chapter}</p>}
      </div>


      {s.lens === 'add' && (
        <section>
          <p className="label">Scale v by k = {fmt(s.options.k, 1)}</p>
          <input className="scrub" type="range" min={-3} max={3} step={0.1} value={s.options.k} aria-label="Scalar k" onChange={(e) => s.setOption('k', parseFloat(e.target.value))} />
        </section>
      )}

      {(s.lens === 'transform3' || s.lens === 'nonsquare') && (
        <section>
          <p className="label">{s.lens === 'nonsquare' ? 'Matrix, 3 rows by 2 columns' : 'Matrix, columns are where î, ĵ, k̂ land'}</p>
          <Matrix3Editor cols={s.lens === 'nonsquare' ? 2 : 3} />
          {s.lens === 'transform3' && <div className="chips">
            {[['Identity', [[1,0,0],[0,1,0],[0,0,1]]], ['Rotate z', [[0.707,-0.707,0],[0.707,0.707,0],[0,0,1]]], ['Stretch', [[1.5,0,0],[0,0.7,0],[0,0,1.2]]], ['Shear', [[1,0,0.6],[0,1,0.3],[0,0,1]]], ['Flatten', [[1,0.5,1.5],[0,1,1],[1,0,1]]]].map(([n, m]) => (
              <button key={n as string} onClick={() => { s.setM3All(m as never); onPlay() }}>{n as string}</button>
            ))}
          </div>}
        </section>
      )}
      {s.lens === 'cross' && (
        <section>
          <p className="label">Vectors, or drag them in the view</p>
          <Vec3Editor name="u" v={s.u3} onChange={s.setU3} />
          <Vec3Editor name="v" v={s.v3} onChange={s.setV3} />
        </section>
      )}
      {s.lens === 'spaces' && (
        <section>
          <p className="label">f(x) = a + bx + cx² + dx³</p>
          {(['a', 'b', 'c', 'd'] as const).map((n, i) => (
            <label key={n} className="coef"><span className="mono">{n} = {fmt(s.poly[i], 1)}</span>
              <input className="scrub" type="range" min={-3} max={3} step={0.1} value={s.poly[i]} onChange={(e) => s.setPoly(i, parseFloat(e.target.value))} aria-label={`coefficient ${n}`} />
            </label>
          ))}
          <p className="label">The derivative as a matrix</p>
          <div className="matrix three c4 fixed"><span>0</span><span>1</span><span>0</span><span>0</span><span>0</span><span>0</span><span>2</span><span>0</span><span>0</span><span>0</span><span>0</span><span>3</span><span>0</span><span>0</span><span>0</span><span>0</span></div>
        </section>
      )}
      {s.lens === 'transform' && (
        <div className="chips toggles"><button aria-pressed={s.options.nonlinear} onClick={() => s.setOption('nonlinear', !s.options.nonlinear)}>Not linear, for contrast</button></div>
      )}

      {!vectorLens && <section>
        <div className="section-head">
          <p className="label">{s.stack.length > 1 ? 'Matrices, applied in order' : 'Matrix'}</p>
          <button className="link" onClick={() => s.addMatrix()}>Add matrix</button>
        </div>
        <div className="stack">
          {s.stack.map((it, i) => <MatrixEditor key={it.id} item={it} index={i} />)}
        </div>
        {s.stack.length > 1 && (
          <div className="product">
            <span className="label">Product</span>
            <div className="mini"><span>{fmt(M.a)}</span><span>{fmt(M.b)}</span><span>{fmt(M.c)}</span><span>{fmt(M.d)}</span></div>
          </div>
        )}
      </section>}

      {!vectorLens && <details className="fold">
        <summary>Presets</summary>
        <div className="chips">
          {PRESETS.map((p) => <button key={p.name} onClick={() => { s.replaceStack(p.stack); onPlay() }}>{p.name}</button>)}
        </div>
      </details>}


      <section>
        <p className="label">Readouts</p>
        <dl className="readouts">
          {rows.map(([k, v, note]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd>{note && <dd className="note">{note}</dd>}</div>
          ))}
        </dl>
      </section>

      {s.lens === 'svd' && (
        <section>
          <p className="label">Factors, A = U Σ Vᵀ</p>
          <div className="factors">
            <Mini name="U" m={rot(F.thetaU)} on={stage === 2} />
            <Mini name="Σ" m={diag(F.s1, F.s2)} on={stage === 1} />
            <Mini name="Vᵀ" m={rot(-F.thetaV)} on={stage === 0} />
          </div>
        </section>
      )}
      {s.lens === 'lu' && (
        <section>
          <p className="label">{LU.swapped ? 'Factors, P A = L U' : 'Factors, A = L U'}</p>
          <div className="factors">
            {LU.swapped && <Mini name="P" m={{ a: 0, b: 1, c: 1, d: 0 }} on={luStage === 2} />}
            <Mini name="L" m={LU.L} on={luStage === 1} />
            <Mini name="U" m={LU.U} on={luStage === 0} />
          </div>
        </section>
      )}
      {s.lens === 'qr' && (
        <section>
          <p className="label">Factors, A = Q R</p>
          <div className="factors">
            <Mini name="Q" m={fromCols(QR.q1, QR.q2)} on={qrStage >= 2} />
            <Mini name="R" m={QR.R} on={qrStage >= 1} />
          </div>
          {QR.dependent && <p className="empty">The columns are dependent, so R has a zero on its diagonal.</p>}
        </section>
      )}
      {s.lens === 'inverse' && (
        <section>
          <p className="label">Inverse</p>
          {inv ? <div className="factors"><Mini name="A⁻¹" m={inv} on={s.t > 1} /></div> : <p className="empty">Singular: det = 0, so no matrix undoes this one.</p>}
        </section>
      )}
      {s.lens === 'project' && (
        <section>
          <p className="label">Projection matrix onto the line, P = a aᵀ / aᵀa</p>
          <div className="factors"><Mini name="P" m={PR.P} on /></div>
        </section>
      )}
      {s.lens === 'iterate' && (
        <section>
          <p className="label">Iteration</p>
          <div className="chips toggles">
            <button aria-pressed={s.options.normalize} onClick={() => s.setOption('normalize', !s.options.normalize)}>Normalise each step</button>
            {[6, 10, 20].map((n) => <button key={n} aria-pressed={s.options.steps === n} onClick={() => s.setOption('steps', n)}>{n} steps</button>)}
          </div>
          <p className="empty">With normalising on this is power iteration. Off, the vector grows or shrinks by λ each step.</p>
        </section>
      )}
      <details className="fold" open={s.objects.length > 0 || !!s.drawing}>
        <summary>Your objects{s.objects.length ? ` (${s.objects.length})` : ''}</summary>
        <div className="section-head">
          <span />
          <span className="section-actions">
            <button className="link" onClick={() => s.addVector()}>Add vector</button>
            <button className="link" onClick={() => s.startDrawing()} disabled={!!s.drawing}>Draw shape</button>
          </span>
        </div>
        {s.objects.length === 0 ? (
          <p className="empty">{vectorLens ? 'Add extra vectors to compare, or draw a shape just for fun.' : 'Nothing yet. Add a vector to drag around, or draw a shape on the canvas and watch the matrix act on it.'}</p>
        ) : (
          <ul className="objects">
            {s.objects.map((o) => (
              <li key={o.id}>
                <input className="name" value={o.name} onChange={(e) => s.renameObject(o.id, e.target.value)} aria-label="Object name" />
                <span className="mono muted">
                  {o.kind === 'vector' ? `(${fmt(o.v.x)}, ${fmt(o.v.y)})` : `${o.points.length} points`}
                </span>
                <button onClick={() => s.removeObject(o.id)} aria-label={`Remove ${o.name}`}>×</button>
              </li>
            ))}
          </ul>
        )}
        <div className="chips toggles">
          <button aria-pressed={s.show.grid} onClick={() => s.toggle('grid')}>Grid</button>
          <button aria-pressed={s.show.square} onClick={() => s.toggle('square')}>Unit square</button>
          <button aria-pressed={s.show.circle} onClick={() => s.toggle('circle')}>Unit circle</button>
        </div>
      </details>
      <details className="fold">
        <summary>What is going on</summary>
        {LENSES[s.lens].story.map((para, i) => <p key={i} className="story">{para}</p>)}
      </details>
      <details className="fold">
        <summary>Try this</summary>
        <ul className="try">{LENSES[s.lens].tryThis.map((x, i) => <li key={i}>{x}</li>)}</ul>
      </details>
      <details className="fold">
        <summary>Words used here</summary>
        <dl className="terms">
          {LENSES[s.lens].terms.map((x) => <div key={x.term}><dt>{x.term}</dt><dd>{x.meaning}</dd></div>)}
        </dl>
      </details>
      <details className="fold">
        <summary>Controls</summary>
        <p className="story muted">Scroll to zoom, drag the background to pan, 0 resets the view. Hold shift to snap to the grid. Alt-click to drop a vector. Drag any corner of a shape. Space plays.</p>
      </details>

      <nav className="pager" aria-label="Previous and next">
        {prev ? <button onClick={() => { s.setLens(prev); onPlay() }}>← {LENSES[prev].title}</button> : <span />}
        {next ? <button onClick={() => { s.setLens(next); onPlay() }}>{LENSES[next].title} →</button> : <span />}
      </nav>
    </aside>
  )
}
