import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { isGateOpen, PARENT_GATE_MS, useParentGateStore } from '@/store/parentStore'
import { ParentGate } from './ParentGate'

/** Everything under `/parent` sits behind the grown-ups-only question, open while the parent works. */
export function RequireParentGate() {
  const navigate = useNavigate()
  const openedAt = useParentGateStore((state) => state.openedAt)
  const open = useParentGateStore((state) => state.open)
  const touch = useParentGateStore((state) => state.touch)
  const [now, setNow] = useState(() => Date.now())
  const isOpen = isGateOpen(openedAt, now)

  // A parent who is working keeps the area open (Phase 46): only ten idle minutes close it,
  // so a form being filled in is not swapped for the question.
  useEffect(() => {
    if (!isOpen) return undefined
    const active = () => touch()
    const events = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const
    for (const name of events) document.addEventListener(name, active, { passive: true })
    return () => {
      for (const name of events) document.removeEventListener(name, active)
    }
  }, [isOpen, touch])

  // Close the gate again once its time is up, even if the parent leaves the tablet open.
  useEffect(() => {
    if (openedAt === null) return undefined
    const timer = setTimeout(() => setNow(Date.now()), openedAt + PARENT_GATE_MS - Date.now() + 50)
    return () => clearTimeout(timer)
  }, [openedAt, now])

  if (isOpen) return <Outlet />

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
