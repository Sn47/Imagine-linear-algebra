import { useEffect, useRef, useState } from 'react'
import { useStore } from '../state/store'
import { LENSES } from '../state/lenses'
import { Painter, readColors, type Colors, type Geom } from './painter'
import { draw, matrixAt, product } from './lenses'
import { Painter3, type Camera } from './painter3'
import { col3, withCol, type Vec3 } from '../math/mat3'
import { col1, col2, fmt, type Vec } from '../math/mat2'

const HALF = 5.2 // units from centre on the short side at zoom 1
const HIT = 20 // px
const MIN_ZOOM = 0.08
const MAX_ZOOM = 40

type View = { zoom: number; pan: Vec } // pan in world units

export default function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const geom = useRef<Geom>({ W: 0, H: 0, unit: 50, cx: 0, cy: 0 })
  const size = useRef({ W: 0, H: 0 })
  const view = useRef<View>({ zoom: 1, pan: { x: 0, y: 0 } })
  const cam = useRef<Camera>({ yaw: -0.6, pitch: 0.5 })
  const colorsRef = useRef<Colors | null>(null)
  const drag = useRef<{ id: string } | { pan: true; start: Vec; pan0: Vec } | { orbit: true; start: Vec; cam0: Camera } | null>(null)
  const is3d = () => !!LENSES[useStore.getState().lens].is3d
  const painter3 = () => new Painter3(new Painter(canvasRef.current!.getContext('2d')!, geom.current, colorsRef.current ?? readColors(), ''), cam.current)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; zoom0: number; mid: Vec } | null>(null)
  const [cursor, setCursor] = useState<Vec | null>(null)
  const [zoomLabel, setZoomLabel] = useState(1)
  const hover = useRef<Vec | null>(null)

  const state = useStore()
  const { drawing, t } = state

  const applyView = () => {
    const { W, H } = size.current
    const z = view.current.zoom
    const unit = (Math.min(W, H) / (2 * HALF)) * z
    geom.current = { W, H, unit, cx: W / 2 - view.current.pan.x * unit, cy: H / 2 + view.current.pan.y * unit }
    setZoomLabel(z)
    useStore.setState({})
  }

  const toWorld = (ev: { clientX: number; clientY: number }): Vec => {
    const r = canvasRef.current!.getBoundingClientRect()
    const { cx, cy, unit } = geom.current
    return { x: (ev.clientX - r.left - cx) / unit, y: -(ev.clientY - r.top - cy) / unit }
  }

  /** Zoom by factor around a screen point so that point stays fixed. */
  const zoomAt = (factor: number, screen: { x: number; y: number }) => {
    const before = toWorld({ clientX: screen.x, clientY: screen.y })
    view.current.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.current.zoom * factor))
    applyView()
    const after = toWorld({ clientX: screen.x, clientY: screen.y })
    view.current.pan = { x: view.current.pan.x + (before.x - after.x), y: view.current.pan.y + (before.y - after.y) }
    applyView()
  }
  const resetView = () => { view.current = { zoom: 1, pan: { x: 0, y: 0 } }; cam.current = { yaw: -0.6, pitch: 0.5 }; applyView() }
  const centerScreen = () => {
    const r = canvasRef.current!.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }

  // Render on every state change.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    if (!colorsRef.current) colorsRef.current = readColors()
    const mono = getComputedStyle(document.body).getPropertyValue('--mono')
    draw(new Painter(ctx, geom.current, colorsRef.current, mono), state, t, cam.current)
    // halo on the handle under the cursor, so draggable things announce themselves
    const h = hover.current
    if (h) {
      const { cx, cy, unit } = geom.current
      ctx.beginPath(); ctx.arc(cx + h.x * unit, cy - h.y * unit, 9, 0, Math.PI * 2)
      ctx.strokeStyle = colorsRef.current.text; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1
    }
  })

  // Size, theme, wheel.
  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      if (r.width === size.current.W && r.height === size.current.H) return
      size.current = { W: r.width, H: r.height }
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr)
      canvas.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
      applyView()
    })
    ro.observe(wrap)
    const refresh = () => { colorsRef.current = readColors(); useStore.setState({}) }
    const mo = new MutationObserver(refresh)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', refresh)
    document.fonts?.ready.then(() => useStore.setState({}))

    // Wheel: zoom by default (pinch on trackpads arrives as ctrl+wheel); shift or sideways scroll pans.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY)
      if (e.shiftKey || horizontal) {
        const u = geom.current.unit
        view.current.pan = { x: view.current.pan.x + (horizontal ? e.deltaX : e.deltaY) / u, y: view.current.pan.y }
        applyView()
        return
      }
      const factor = Math.exp(-e.deltaY * (e.ctrlKey || e.metaKey ? 0.01 : 0.0018))
      zoomAt(factor, { x: e.clientX, y: e.clientY })
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => { ro.disconnect(); mo.disconnect(); mq.removeEventListener('change', refresh); canvas.removeEventListener('wheel', onWheel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 4D auto-rotation
  const spin4 = useStore((st) => st.spin4)
  useEffect(() => {
    if (!spin4) return
    let id = 0
    const tick = () => {
      const st = useStore.getState()
      st.setAngle4(2, st.angles4[2] + 0.006)
      st.setAngle4(3, st.angles4[3] + 0.004)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [spin4])

  // Keyboard: arrows pan, + / - zoom, 0 resets.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const stepPx = 60 / geom.current.unit
      if (e.key === 'ArrowLeft') view.current.pan.x -= stepPx
      else if (e.key === 'ArrowRight') view.current.pan.x += stepPx
      else if (e.key === 'ArrowUp') view.current.pan.y += stepPx
      else if (e.key === 'ArrowDown') view.current.pan.y -= stepPx
      else if (e.key === '+' || e.key === '=') { zoomAt(1.25, centerScreen()); return }
      else if (e.key === '-' || e.key === '_') { zoomAt(0.8, centerScreen()); return }
      else if (e.key === '0') { resetView(); return }
      else return
      e.preventDefault(); applyView()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Draggable handles for the current lens, plus every user vector tip and shape vertex.
  const handles = (): { id: string; p: Vec }[] => {
    const s = useStore.getState()
    const kinds = LENSES[s.lens].handles
    const hs: { id: string; p: Vec }[] = []
    if (s.stack.length === 1) {
      if (kinds.includes('basis')) { const M = matrixAt(s, s.t); hs.push({ id: 'e1', p: col1(M) }, { id: 'e2', p: col2(M) }) }
      if (kinds.includes('columns')) { const A = product(s); hs.push({ id: 'e1', p: col1(A) }, { id: 'e2', p: col2(A) }) }
    }
    if (s.lens === 'spaces') { const [a, b, c, d] = s.poly; const x = s.probe.x; hs.push({ id: 'fx', p: { x, y: a + b * x + c * x * x + d * x * x * x } }); return hs }
    if (kinds.includes('cols3')) { const q = painter3(); ([0, 1, 2] as const).forEach((c) => hs.push({ id: `c3:${c}`, p: q.flat(col3(s.m3, c)) })) }
    if (s.lens === 'pca') { s.points.forEach((pt, i) => hs.push({ id: `pt:${i}`, p: pt })); return hs }
    if (kinds.includes('u3')) hs.push({ id: 'u3', p: painter3().flat(s.u3) })
    if (kinds.includes('v3')) hs.push({ id: 'v3', p: painter3().flat(s.v3) })
    if (LENSES[s.lens].is3d) return hs
    if (kinds.includes('probe')) hs.push({ id: 'probe', p: s.probe })
    if (kinds.includes('probe2')) hs.push({ id: 'probe2', p: s.lens === 'add' && s.options.k !== 1 ? s.probe2 : s.probe2 })
    for (const o of s.objects) {
      if (o.kind === 'vector') hs.push({ id: o.id, p: o.v })
      else o.points.forEach((pt, i) => hs.push({ id: `${o.id}:${i}`, p: pt }))
    }
    return hs
  }
  const hit = (ev: { clientX: number; clientY: number }): { id: string; p: Vec } | null => {
    const w = toWorld(ev)
    const { unit } = geom.current
    let best: { id: string; p: Vec } | null = null, bd = HIT
    for (const h of handles()) { const d = Math.hypot(h.p.x - w.x, h.p.y - w.y) * unit; if (d < bd) { bd = d; best = h } }
    return best
  }
  const snap = (w: Vec, shift: boolean): Vec => {
    if (!shift) return w
    const g = 0.5
    return { x: Math.round(w.x / g) * g, y: Math.round(w.y / g) * g }
  }

  const onDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const s = useStore.getState()
    const el = ev.currentTarget
    el.setPointerCapture(ev.pointerId)
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom0: view.current.zoom, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
      drag.current = null
      return
    }
    if (s.drawing) { s.addDrawingPoint(snap(toWorld(ev), ev.shiftKey)); return }
    if (ev.altKey && !is3d()) { s.addVector(snap(toWorld(ev), ev.shiftKey)); return }
    const h = ev.button === 1 ? null : hit(ev)
    if (!h && s.lens === 'pca' && ev.button === 0) { s.addPoint(snap(toWorld(ev), ev.shiftKey)); return }
    if (h) {
      if ((h.id === 'e1' || h.id === 'e2') && LENSES[s.lens].handles.includes('basis')) s.setT(s.tMax())
      drag.current = { id: h.id }
      el.classList.add('grabbing')
      return
    }
    if (is3d() && !ev.shiftKey) {
      drag.current = { orbit: true, start: { x: ev.clientX, y: ev.clientY }, cam0: { ...cam.current } }
      el.classList.add('panning')
      return
    }
    drag.current = { pan: true, start: { x: ev.clientX, y: ev.clientY }, pan0: { ...view.current.pan } }
    el.classList.add('panning')
  }

  const onMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const s = useStore.getState()
    const el = ev.currentTarget
    if (pointers.current.has(ev.pointerId)) pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY })
    setCursor(toWorld(ev))

    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const target = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (pinch.current.zoom0 * dist) / pinch.current.dist))
      zoomAt(target / view.current.zoom, mid)
      const u = geom.current.unit
      view.current.pan = { x: view.current.pan.x - (mid.x - pinch.current.mid.x) / u, y: view.current.pan.y + (mid.y - pinch.current.mid.y) / u }
      pinch.current.mid = mid
      applyView()
      return
    }

    const d = drag.current
    if (!d) {
      const h = s.drawing ? null : hit(ev)
      el.classList.toggle('grab', !!h)
      const prev = hover.current
      hover.current = h ? h.p : null
      if (!!prev !== !!h || (h && prev && (prev.x !== h.p.x || prev.y !== h.p.y))) useStore.setState({})
      return
    }
    if ('orbit' in d) {
      cam.current = { yaw: d.cam0.yaw + (ev.clientX - d.start.x) * 0.008, pitch: Math.max(-1.5, Math.min(1.5, d.cam0.pitch + (ev.clientY - d.start.y) * 0.008)) }
      useStore.setState({})
      return
    }
    if ('pan' in d) {
      const u = geom.current.unit
      view.current.pan = { x: d.pan0.x - (ev.clientX - d.start.x) / u, y: d.pan0.y + (ev.clientY - d.start.y) / u }
      applyView()
      return
    }
    const w = snap(toWorld(ev), ev.shiftKey)
    if (d.id.startsWith('c3:')) {
      const q = painter3()
      const c = +d.id.slice(3) as 0 | 1 | 2
      const cur = col3(s.m3, c)
      const nv: Vec3 = q.unview({ x: w.x, y: w.y, z: q.view(cur).z })
      s.setM3All(withCol(s.m3, c, nv))
      return
    }
    if (d.id.startsWith('pt:')) { s.setPoint(+d.id.slice(3), w); return }
    if (d.id === 'u3' || d.id === 'v3') {
      // move in the screen plane, keep the depth component
      const q = painter3()
      const cur = d.id === 'u3' ? s.u3 : s.v3
      const depth = q.view(cur).z
      const nv: Vec3 = q.unview({ x: w.x, y: w.y, z: depth })
      if (d.id === 'u3') s.setU3(nv); else s.setV3(nv)
      return
    }
    if (d.id === 'fx') { s.setProbe({ x: w.x, y: s.probe.y }); return }
    if (d.id === 'e1') s.setMatrix(s.stack[0].id, { a: w.x, c: w.y })
    else if (d.id === 'e2') s.setMatrix(s.stack[0].id, { b: w.x, d: w.y })
    else if (d.id === 'probe') s.setProbe(w)
    else if (d.id === 'probe2') s.setProbe2(w)
    else if (d.id.includes(':')) { const [id, i] = d.id.split(':'); s.setShapePoint(id, +i, w) }
    else s.setVector(d.id, w)
  }

  const onUp = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(ev.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    drag.current = null
    ev.currentTarget.classList.remove('grabbing', 'panning')
  }
  const onDouble = () => { const s = useStore.getState(); if (s.drawing) s.finishDrawing() }

  return (
    <div className={`viewport${drawing ? ' drawing' : ''}`} ref={wrapRef}>
      <canvas
        id="scene-canvas"
        ref={canvasRef}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerLeave={() => { setCursor(null); hover.current = null; useStore.setState({}) }} onDoubleClick={onDouble} onContextMenu={(e) => e.preventDefault()}
      />
      {cursor && !is3d() && <div className="coords">{fmt(cursor.x)}, {fmt(cursor.y)}</div>}
      <div className="view-tools">
        <button onClick={() => zoomAt(0.8, centerScreen())} aria-label="Zoom out">−</button>
        <span>{Math.round(zoomLabel * 100)}%</span>
        <button onClick={() => zoomAt(1.25, centerScreen())} aria-label="Zoom in">+</button>
        <button onClick={resetView} disabled={zoomLabel === 1 && view.current.pan.x === 0 && view.current.pan.y === 0}>Reset view</button>
      </div>
      {drawing && (
        <div className="draw-bar">
          <span>{drawing.length < 3 ? `Click to place points (${drawing.length} of 3 minimum)` : `${drawing.length} points. Double-click or finish.`}</span>
          <button onClick={() => state.finishDrawing()} disabled={drawing.length < 3}>Finish shape</button>
          <button onClick={() => state.cancelDrawing()}>Cancel</button>
        </div>
      )}
    </div>
  )
}
