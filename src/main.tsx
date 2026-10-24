import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { reloadForUpdate } from './app/errors/staleBuild'
import { registerServiceWorker } from './app/registerServiceWorker'
import { dropPublicVoiceCache } from './services/audio/voicePaths'
import { useSettingsStore } from './store/settingsStore'
import { applyLanguage, loadLanguage } from './i18n'
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

/** Longest the first render waits for the child's language (its texts load as their own chunk). */
const LANGUAGE_WAIT_MS = 1500

async function start(root: HTMLElement) {
  // the stored language's texts first, so a Russian or English screen never flashes Uzbek;
  // on a very slow network the app starts anyway and switches when they arrive
  const language = useSettingsStore.getState().language
  if (language) {
    await Promise.race([
      loadLanguage(language).catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, LANGUAGE_WAIT_MS)),
    ])
    applyLanguage(language)
  }
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void start(rootElement)

registerServiceWorker()
// private voice build: clips cached by an earlier public build are removed
void dropPublicVoiceCache()
