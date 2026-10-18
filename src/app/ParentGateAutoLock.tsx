import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useParentGateStore } from '@/store/parentStore'

/**
 * Leaving the parent area in any way – the “To the kids” button, the browser’s
 * back button, a swipe – locks it again, so a child cannot walk back in.
 */
export function ParentGateAutoLock() {
  const { pathname } = useLocation()
  const close = useParentGateStore((state) => state.close)

  useEffect(() => {
    if (!pathname.startsWith('/parent')) close()
  }, [close, pathname])

  return null
}
