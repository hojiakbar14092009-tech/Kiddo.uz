import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside a modal dialog while it is open and gives it
 * back to whatever had it before when the dialog closes.
 */
export function useFocusTrap(
  container: RefObject<HTMLElement | null>,
  initial?: RefObject<HTMLElement | null>,
  /** With dialogs on top of each other, only the top one traps focus. */
  isActive: () => boolean = () => true,
) {
  const activeCheck = useRef(isActive)
  useEffect(() => {
    activeCheck.current = isActive
  })

  useEffect(() => {
    const element = container.current
    if (!element) return undefined
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (activeCheck.current()) (initial?.current ?? element).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !activeCheck.current()) return
      const items = [...element.querySelectorAll<HTMLElement>(FOCUSABLE)]
      const first = items[0]
      const last = items[items.length - 1]
      if (!first || !last) {
        event.preventDefault()
        return
      }
      const active = document.activeElement
      if (event.shiftKey && (active === first || !element.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !element.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [container, initial])
}
