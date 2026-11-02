import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { resetLearner } from './lib/learner'
import './index.css'

registerSW({ immediate: true })

// Dev only: ?reset forgets the learner, to run the placement again.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('reset')) resetLearner()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
