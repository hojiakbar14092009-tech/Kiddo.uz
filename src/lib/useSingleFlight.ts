import { useCallback, useRef, useState } from 'react'

/**
 * A button action that talks to the server runs once at a time: a second tap while the first is
 * on its way does nothing (no double payment, no second code sent). `pending` drives the
 * button's busy look; the ref guards even taps within the same frame, before React re-renders.
 */
export function useSingleFlight<A extends unknown[]>(action: (...args: A) => Promise<unknown>) {
  const busy = useRef(false)
  const [pending, setPending] = useState(false)
  const run = useCallback(
    async (...args: A) => {
      if (busy.current) return
      busy.current = true
      setPending(true)
      try {
        await action(...args)
      } finally {
        busy.current = false
        setPending(false)
      }
    },
    [action],
  )
  return [run, pending] as const
}
