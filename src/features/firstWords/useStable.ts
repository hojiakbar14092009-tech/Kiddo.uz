import { useCallback, useLayoutEffect, useRef } from 'react'

/** A function that always calls the latest version of `fn` but never changes itself. */
export function useStable<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn)
  useLayoutEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: A) => ref.current(...args), [])
}
