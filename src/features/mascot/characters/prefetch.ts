import { contextOf, MASCOTS, mascotFor } from './registry'

/*
 * Selective prefetch: when the child's next step is clear (the journey's
 * main quest), the guide of that place is downloaded in the background, so
 * it is there the moment the child arrives. One low-priority request into the
 * browser's (and, via the service worker, the offline) cache; nothing is
 * parsed and no WebGL memory is used. Never all ten.
 */

const asked = new Set<string>()

export function prefetchMascotFor(route: string): void {
  const url = MASCOTS[mascotFor(contextOf(route.split('?')[0] ?? route))].model
  if (asked.has(url) || typeof fetch === 'undefined') return
  asked.add(url)
  void fetch(url, { priority: 'low' } as RequestInit).catch(() => asked.delete(url))
}
