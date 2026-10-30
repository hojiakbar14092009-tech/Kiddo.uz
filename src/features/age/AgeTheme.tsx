import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ageBand } from '@/domain/adaptive'
import { childAge, useActiveChild, useAgeLevel } from '@/store/familyStore'

/**
 * Puts the child's age on <html>, so colours and sizes follow it (index.css).
 * Two separate things (Phase 22): `data-age` is the young presentation level
 * (4/5/6) and `data-band` the visual maturity by real age, so an older
 * beginner gets foundational work without a preschool look.
 */
export function AgeTheme() {
  const level = useAgeLevel()
  const child = useActiveChild()
  const band = ageBand(child ? childAge(child) : null)
  const { pathname } = useLocation()
  const neutral =
    pathname.startsWith('/parent') || pathname.startsWith('/admin') || pathname === '/'

  useEffect(() => {
    const root = document.documentElement
    if (neutral) {
      delete root.dataset.age
      delete root.dataset.band
    } else {
      root.dataset.age = String(level)
      root.dataset.band = band
    }
  }, [level, band, neutral])

  return null
}
