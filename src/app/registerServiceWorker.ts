import { registerSW } from 'virtual:pwa-register'

/**
 * Installs the service worker that makes Kiddo work offline. New versions are
 * picked up quietly on the next launch – a child is never asked to “update”.
 */
export function registerServiceWorker() {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
}
