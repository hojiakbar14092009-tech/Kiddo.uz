import { Navigate, Outlet } from 'react-router-dom'
import { useParentStore } from '@/store/parentStore'

/** The dashboard needs a signed-in parent (a cloud account or demo mode). */
export function RequireParentSession() {
  const session = useParentStore((state) => state.session)
  return session ? <Outlet /> : <Navigate to="/parent/login" replace />
}
