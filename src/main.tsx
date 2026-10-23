import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { reloadForUpdate } from './app/errors/staleBuild'
import { registerServiceWorker } from './app/registerServiceWorker'
import { dropPublicVoiceCache } from './services/audio/voicePaths'
import './i18n'
import './styles/fonts'
import './styles/index.css'

// A lazily loaded file missing after a new deploy: reload once to get the new version.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForUpdate()) event.preventDefault()
})

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element #root was not found in index.html')
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerServiceWorker()
// private voice build: clips cached by an earlier public build are removed
void dropPublicVoiceCache()
