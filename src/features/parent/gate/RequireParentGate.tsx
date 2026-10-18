import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { isGateOpen, PARENT_GATE_MS, useParentGateStore } from '@/store/parentStore'
import { ParentGate } from './ParentGate'

/** Everything under `/parent` sits behind the grown-ups-only question. */
export function RequireParentGate() {
  const navigate = useNavigate()
  const openedAt = useParentGateStore((state) => state.openedAt)
  const open = useParentGateStore((state) => state.open)
  const [now, setNow] = useState(() => Date.now())

  // Close the gate again once its time is up, even if the parent leaves the tablet open.
  useEffect(() => {
    if (openedAt === null) return undefined
    const timer = setTimeout(() => setNow(Date.now()), openedAt + PARENT_GATE_MS - Date.now() + 50)
    return () => clearTimeout(timer)
  }, [openedAt, now])

  if (isGateOpen(openedAt, now)) return <Outlet />

  return (
    <Screen className="items-center justify-center p-4">
      <ParentGate
        onPass={() => {
          setNow(Date.now())
          open()
        }}
        onCancel={() => navigate('/home', { replace: true })}
      />
    </Screen>
  )
}
