import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { reloadForUpdate } from './app/errors/staleBuild'
import { registerServiceWorker } from './app/registerServiceWorker'
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
