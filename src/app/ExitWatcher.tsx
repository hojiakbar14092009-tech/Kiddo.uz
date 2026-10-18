import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useActivityStore } from '@/store/activityStore'
import { useFamilyStore } from '@/store/familyStore'

/**
 * Notes the time whenever a child leaves Kiddo – closes the tab, switches to
 * another app or locks the screen – and when they come back. Parents see it in
 * their area (and, with a cloud account, on their own phone after sync).
 */
export function ExitWatcher() {
  const { pathname } = useLocation()
  const inParentArea = pathname.startsWith('/parent')

  useEffect(() => {
    if (inParentArea) return undefined
    const childId = () => useFamilyStore.getState().activeChildId
    const onHide = () => {
      const id = childId()
      if (id) useActivityStore.getState().record(id, 'left')
    }
    const onVisibility = () => {
      const id = childId()
      if (!id) return
      if (document.visibilityState === 'hidden') onHide()
      else useActivityStore.getState().record(id, 'returned')
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [inParentArea])

  return null
}
