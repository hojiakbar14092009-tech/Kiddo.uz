import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAgeLevel } from '@/store/familyStore'

/** Puts the child’s age on <html>, so colours and sizes follow it (see index.css). */
export function AgeTheme() {
  const level = useAgeLevel()
  const { pathname } = useLocation()
  const neutral = pathname.startsWith('/parent') || pathname === '/'

  useEffect(() => {
    const root = document.documentElement
    if (neutral) delete root.dataset.age
    else root.dataset.age = String(level)
  }, [level, neutral])

  return null
}
