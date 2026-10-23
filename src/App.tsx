import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'
import { useStore } from './state/store'
import { LENSES, GROUPS, LENS_ORDER, groupOf } from './state/lenses'
import Scene from './scene/Scene'
import Panel from './panel/Panel'

const STAGE_NAMES: Partial<Record<string, string[]>> = {
  svd: ['rotate', 'stretch', 'rotate'],
  lu: ['U', 'L'],
  qr: ['normalise', 'project', 'subtract'],
  inverse: ['A', 'A\u207b\u00b9'],
}

export default function App() {
  const s = useStore()
  const animRef = useRef<{ stop: () => void } | null>(null)
  const [copied, setCopied] = useState(false)
  const [recording, setRecording] = useState(false)
  const [sheet, setSheet] = useState<'peek' | 'open'>('peek')
  const [welcome, setWelcome] = useState(() => { try { return !localStorage.getItem('linear:welcomed') && !location.hash } catch { return false } })
  const dismissWelcome = () => { setWelcome(false); try { localStorage.setItem('linear:welcomed', '1') } catch { /* ignore */ } }
  const tMax = s.tMax()

  const stop = () => { animRef.current?.stop(); animRef.current = null }

  const play = () => {
    stop()
    const st = useStore.getState()
    const end = st.tMax()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { st.setT(end); return }
    st.setT(0)
    const staged = end > 1
    animRef.current = animate(0, end, {
      duration: st.lens === 'iterate' ? 0.35 * end : staged ? 1.4 * end : 2,
      ease: staged ? 'linear' : [0.16, 1, 0.3, 1],
      onUpdate: (v) => useStore.getState().setT(v),
    })
  }

  useEffect(() => {
    const loaded = useStore.getState().loadFromHash()
    const id = window.setTimeout(play, loaded ? 150 : 400)
    return () => { window.clearTimeout(id); stop() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useStore.getState()
      if (e.key === 'Escape' && st.drawing) st.cancelDrawing()
      if (e.key === 'Enter' && st.drawing) st.finishDrawing()
      if (e.target instanceof HTMLInputElement) return
      if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); play() }
      if (e.key === ']' || e.key === '[') {
        const i = LENS_ORDER.indexOf(st.lens) + (e.key === ']' ? 1 : -1)
        if (i >= 0 && i < LENS_ORDER.length) { stop(); st.setLens(LENS_ORDER[i]); play() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const share = async () => {
    const hash = s.toHash()
    history.replaceState(null, '', `#${hash}`)
    try {
      await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${hash}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard unavailable: the hash is already in the address bar */ }
  }

  const sceneCanvas = () => document.getElementById('scene-canvas') as HTMLCanvasElement | null
  const exportPng = () => {
    const c = sceneCanvas(); if (!c) return
    const out = document.createElement('canvas'); out.width = c.width; out.height = c.height
    const ctx = out.getContext('2d')!
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fff'
    ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(c, 0, 0)
    const a = document.createElement('a'); a.download = `linear-${s.lens}.png`; a.href = out.toDataURL('image/png'); a.click()
  }
  const recordVideo = () => {
    const c = sceneCanvas(); if (!c || recording || typeof MediaRecorder === 'undefined') return
    // draw onto a composite canvas with the page background so the video is not transparent
    const out = document.createElement('canvas'); out.width = c.width; out.height = c.height
    const ctx = out.getContext('2d')!
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#fff'
    let raf = 0
    const paint = () => { ctx.fillStyle = bg; ctx.fillRect(0, 0, out.width, out.height); ctx.drawImage(c, 0, 0); raf = requestAnimationFrame(paint) }
    paint()
    const stream = out.captureStream(60)
    const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) ?? ''
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => chunks.push(e.data)
    rec.onstop = () => {
      cancelAnimationFrame(raf)
      const blob = new Blob(chunks, { type: rec.mimeType })
      const a = document.createElement('a'); a.download = `linear-${s.lens}.${rec.mimeType.includes('mp4') ? 'mp4' : 'webm'}`; a.href = URL.createObjectURL(blob); a.click()
      setRecording(false)
    }
    setRecording(true)
    rec.start()
    play()
    const end = useStore.getState().tMax()
    const duration = useStore.getState().lens === 'iterate' ? 0.35 * end : end > 1 ? 1.4 * end : 2
    window.setTimeout(() => rec.stop(), duration * 1000 + 600)
  }

  const toggleTheme = () => {
    const root = document.documentElement
    const dark = getComputedStyle(root).colorScheme.includes('dark')
    root.dataset.theme = dark ? 'light' : 'dark'
  }

  const names = STAGE_NAMES[s.lens] ?? (s.lens === 'transform' && s.stack.length > 1 ? s.stack.map((it) => it.name) : null)
  const phase = s.lens === 'iterate'
    ? `step ${Math.min(s.options.steps, Math.floor(s.t))}`
    : names
      ? (s.t >= tMax ? 'done' : names[Math.min(names.length - 1, Math.floor(s.t))])
      : `t = ${s.t.toFixed(2)}`

  return (
    <div className="app">
      <header>
        <div className="brand">
          <svg viewBox="0 0 32 32" width="18" height="18" fill="none" strokeLinecap="round" strokeWidth="3.5" aria-hidden="true"><path d="M8 24h16" stroke="var(--accent)"/><path d="M8 24V8" stroke="var(--warm)"/></svg>
          Linear <span>see linear algebra</span>
        </div>
        <nav aria-label="Topics">
          {GROUPS.map((g) => (
            <button key={g.name} aria-current={groupOf(s.lens).name === g.name} onClick={() => { stop(); s.setLens(g.lenses[0]) }}>{g.name}</button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="quiet" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
          <button className="quiet" onClick={exportPng}>PNG</button>
          <button className="quiet" onClick={recordVideo} disabled={recording}>{recording ? 'Recording…' : 'Video'}</button>
          <button className="quiet" onClick={toggleTheme} aria-label="Toggle theme">Theme</button>
        </div>
      </header>

      <div className="subnav" aria-label="Lenses in this topic">
        {groupOf(s.lens).lenses.map((l, i) => (
          <button key={l} aria-current={s.lens === l} onClick={() => { stop(); s.setLens(l) }}>
            <span className="n">{i + 1}</span>{LENSES[l].title}
          </button>
        ))}
      </div>

      {welcome && (
        <div className="welcome" role="dialog" aria-label="Welcome">
          <div>
            <p className="welcome-title">Linear is a place to see linear algebra.</p>
            <p>Every page is a scene you can drag, zoom and change. Start with a single vector and follow Next all the way to SVD, or jump to any topic above.</p>
            <p className="muted">Drag arrow tips. Scroll to zoom. Space replays. Press ] for the next idea.</p>
            <button className="play" onClick={dismissWelcome}>Start</button>
          </div>
        </div>
      )}

      <main>
        <section className="stage" aria-label="Scene">
          <Scene />
          <div className="controls">
            <button className="play" onClick={play}>Play</button>
            <input
              className="scrub" type="range" min={0} max={tMax} step={0.001} value={s.t}
              aria-label="Scrub animation"
              onChange={(e) => { stop(); s.setT(parseFloat(e.target.value)) }}
            />
            <div className="phase">{phase}</div>
          </div>
        </section>
        <div className={`sheet ${sheet}`}>
          <button className="sheet-handle" aria-label={sheet === 'open' ? 'Collapse panel' : 'Expand panel'} onClick={() => setSheet(sheet === 'open' ? 'peek' : 'open')}><span /></button>
          <Panel onPlay={play} />
        </div>
      </main>
    </div>
  )
}
