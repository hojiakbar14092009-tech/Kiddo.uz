import { useEffect, useState, type RefObject } from 'react'

/**
 * Whether the element is on screen (any part of it). A 3D canvas uses it to
 * stop drawing while scrolled away; a hidden tab stops requestAnimationFrame
 * by itself. True until measured, and always true without IntersectionObserver.
 */
export function useInView(target: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(true)
  useEffect(() => {
    const element = target.current
    if (!element || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? true))
    observer.observe(element)
    return () => observer.disconnect()
  }, [target])
  return inView
}
