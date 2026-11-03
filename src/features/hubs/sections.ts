/*
 * The child's app in four sections (Phase 40), one tab each: Bugun (today's
 * plan), O‘rgan (learning), Kashf et (worlds to discover) and Mening dunyom
 * (the city, treasures, shop and art). Every child page belongs to one
 * section, which gives it its world: a calm background and colour of its own
 * (a system, never random per page). The parent and admin areas have none.
 */

export const SECTIONS = ['today', 'learn', 'explore', 'mine'] as const
export type Section = (typeof SECTIONS)[number]

/** The tab of each section: its page and its picture (public/3d). */
export const SECTION_TABS: Record<Section, { route: string; icon: string }> = {
  today: { route: '/home', icon: 'sun' },
  learn: { route: '/learn', icon: 'book' },
  explore: { route: '/explore', icon: 'telescope' },
  mine: { route: '/my-world', icon: 'castle' },
}

/** Path prefixes of each section (the longest match wins). */
const PREFIXES: readonly (readonly [string, Section])[] = [
  ['/home', 'today'],
  ['/reward', 'today'],
  ['/rest', 'today'],
  ['/learn/space', 'explore'],
  ['/learn', 'learn'],
  ['/games', 'learn'],
  ['/sci', 'learn'],
  ['/shorts', 'explore'],
  ['/alphabet', 'learn'],
  ['/tasks', 'learn'],
  ['/exam', 'learn'],
  ['/math-lab', 'learn'],
  ['/trace', 'learn'],
  ['/stories', 'learn'],
  ['/feelings', 'learn'],
  ['/mistake-garden', 'learn'],
  ['/explore', 'explore'],
  ['/adventure', 'explore'],
  ['/worlds', 'explore'],
  ['/spaceport', 'explore'],
  ['/science-lab', 'explore'],
  ['/shadow-lab', 'explore'],
  ['/scale-portal', 'explore'],
  ['/my-world', 'mine'],
  ['/collection', 'mine'],
  ['/shop', 'mine'],
  ['/studio', 'mine'],
]

/** The section a path belongs to (null: the language page, onboarding, parent, admin). */
export function sectionOf(pathname: string): Section | null {
  let best: readonly [string, Section] | null = null
  for (const entry of PREFIXES) {
    const [prefix] = entry
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = entry
    }
  }
  return best ? best[1] : null
}

/** The page of a section's hub: where a page's back button leads. */
export function hubOf(pathname: string): string {
  const section = sectionOf(pathname)
  return section ? SECTION_TABS[section].route : '/home'
}
