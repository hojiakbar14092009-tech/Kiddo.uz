/*
 * Where the attention helper looks (Phase 58). Leaving the app is noticed on every
 * child screen; sitting without a touch and looking away only while the child is
 * learning or playing (a menu or a reward screen is fine to look at slowly, and a
 * cartoon is watched, not touched).
 */

/** Not the child area: the helper is silent here. */
const OUTSIDE = ['/parent', '/admin', '/dev']
/** Child screens without a lesson: no "no touch" or "looking away" reminders. */
const CALM = new Set([
  '/',
  '/welcome',
  '/child-select',
  '/home',
  '/learn',
  '/explore',
  '/my-world',
  '/alphabet',
  '/reward',
  '/rest',
  '/shop',
  '/collection',
  '/studio/gallery',
])
/** Watched rather than played (the cartoons). */
const WATCHED = ['/shorts']

function under(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

/** A child screen at all (leaving the app is noticed). */
export function inChildArea(pathname: string): boolean {
  return pathname !== '/' && pathname !== '/rest' && !under(pathname, OUTSIDE)
}

/** A screen where the child is learning or playing (touch and gaze are watched). */
export function isLearningScreen(pathname: string): boolean {
  return inChildArea(pathname) && !CALM.has(pathname) && !under(pathname, WATCHED)
}
