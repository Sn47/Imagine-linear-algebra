import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'
import { useStore } from './state/store'
import { LENSES, GROUPS, groupOf } from './state/lenses'
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
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); play() }
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
        <div className="brand">Basis <span>a linear algebra playground</span></div>
        <nav aria-label="Topics">
          {GROUPS.map((g) => (
            <button key={g.name} aria-current={groupOf(s.lens).name === g.name} onClick={() => { stop(); s.setLens(g.lenses[0]) }}>{g.name}</button>
          ))}
        </nav>
        <div className="header-actions">
          <button className="quiet" onClick={share}>{copied ? 'Link copied' : 'Share'}</button>
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
        <Panel onPlay={play} />
      </main>
    </div>
  )
}
