import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

const splash = document.getElementById('splash')
const shownAt = performance.now()
const ready = (document.fonts ? document.fonts.ready : Promise.resolve()) as Promise<unknown>
ready.then(() => {
  const wait = Math.max(0, 700 - (performance.now() - shownAt))
  window.setTimeout(() => { splash?.classList.add('done'); window.setTimeout(() => splash?.remove(), 400) }, wait)
})
