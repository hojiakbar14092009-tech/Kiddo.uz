import { registerSW } from 'virtual:pwa-register'

const CHECK_EVERY_MS = 60_000

/**
 * Installs the service worker that makes Kiddo work offline. A child is never
 * asked to “update”: a new version is fetched in the background and the page
 * switches to it on its own. Because Kiddo is one page that is rarely reloaded,
 * it looks for a new version every minute and whenever the tab comes back into
 * view – otherwise a tab left open would keep showing the old version.
 *
 * It registers after the page's `load` event (not immediately): on a first
 * visit the worker then downloads the offline copy (about 6.5 MB) once the
 * child's first screen is in, instead of competing with it.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  registerSW({
    immediate: false,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine !== false) void registration.update().catch(() => undefined)
      }
      setInterval(check, CHECK_EVERY_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
