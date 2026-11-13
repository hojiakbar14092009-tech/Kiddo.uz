import { useCallback, useState, type ReactNode } from 'react'
import { ParentGate } from './ParentGate'

/**
 * The grown-ups question before one action only (buying Pro, deleting an account or data),
 * asked every time: `ask(action)` shows it, a right answer runs the action, "Back" drops it.
 */
export function useAdultCheck(): [ask: (action: () => void) => void, gate: ReactNode] {
  const [pending, setPending] = useState<(() => void) | null>(null)
  const ask = useCallback((action: () => void) => setPending(() => action), [])
  const gate = pending ? (
    <ParentGate
      onPass={() => {
        setPending(null)
        pending()
      }}
      onCancel={() => setPending(null)}
    />
  ) : null
  return [ask, gate]
}
