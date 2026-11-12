/**
 * Build setting for the service worker (used by vite.config.ts; pure, so a unit test checks it).
 * Only index.html's own scripts (its <script src> and modulepreload links) are precached;
 * every other chunk is cached the first time it is used.
 */
export function shellOnly<T extends { url: string }>(entries: T[], indexHtml: string): T[] {
  const shell = new Set([...indexHtml.matchAll(/(?:src|href)="\/([^"]+)"/g)].map((m) => m[1]))
  return entries.filter((entry) => !entry.url.endsWith('.js') || shell.has(entry.url))
}
