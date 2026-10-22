import clsx from 'clsx'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEventHandler,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { dialogDepth, isTopDialog, nextDialogOrder, openDialog } from './dialogStack'
import { useFocusTrap } from './useFocusTrap'

/*
 * The one dialog of the app. Every modal (a purchase question, a hint, the
 * grown-ups gate, a celebration) is built on it, so all of them:
 * - are announced as a modal dialog with a title (and optional description),
 * - keep keyboard focus inside and give it back when closed,
 * - close with Escape and (if allowed) a tap on the backdrop – on the whole tap
 *   (press and release outside), so the release never lands on what was under it,
 * - stop the page behind from scrolling,
 * - render above everything else (a portal on <body>, so no parent can clip them);
 *   with one dialog on top of another, only the top one answers Escape and Tab,
 * - pop in softly (no motion with reduced motion, via the global rule).
 * `placement="sheet"` is the bottom sheet: it slides up from the bottom edge on
 * phones and sits in the middle from tablet width up. `placement="full"` covers
 * the whole screen (e.g. the ad player); it brings no colours of its own.
 */

export type DialogPlacement = 'center' | 'sheet' | 'full'
export type DialogSize = 'sm' | 'md' | 'lg'

export interface DialogProps {
  /** The title: always present for screen readers; `hideTitle` keeps it visually hidden. */
  title: ReactNode
  hideTitle?: boolean
  description?: ReactNode
  /** A picture shown above the title (e.g. the robot wearing what is being bought). */
  media?: ReactNode
  /** Called on Escape, on the backdrop (if `dismissible`) and by your own buttons. */
  onClose: () => void
  /** A tap outside closes it. Off for questions that need an explicit answer. */
  dismissible?: boolean
  /** Escape closes it (default). Off only while something must not be interrupted. */
  closeOnEscape?: boolean
  /** The element focused first (default: the dialog itself). */
  initialFocus?: RefObject<HTMLElement | null>
  placement?: DialogPlacement
  size?: DialogSize
  /** Extra classes for the panel (e.g. a tint). */
  className?: string
  /** Extra classes for the backdrop. */
  backdropClassName?: string
  /** `alertdialog` for questions that need an answer (e.g. a purchase). */
  role?: 'dialog' | 'alertdialog'
  testId?: string
  /** Keys pressed anywhere inside the dialog (e.g. digits for a keypad). */
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>
  children?: ReactNode
}

const SIZE: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
}

/** Open dialogs that hold the page still; the last one to close lets it scroll again. */
let scrollLocks = 0
let savedOverflow = ''

function lockScroll() {
  if (scrollLocks === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLocks += 1
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1)
  if (scrollLocks === 0) document.body.style.overflow = savedOverflow
}

export function Dialog({
  title,
  hideTitle = false,
  description,
  media,
  onClose,
  dismissible = true,
  closeOnEscape = true,
  initialFocus,
  placement = 'center',
  size = 'md',
  className,
  backdropClassName,
  role = 'dialog',
  testId,
  onKeyDown,
  children,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  const pressedOutside = useRef(false)
  const [order] = useState(nextDialogOrder)
  // registered before the focus trap below, so the trap already knows who is on top
  useEffect(() => openDialog(order), [order])
  useFocusTrap(panel, initialFocus, () => isTopDialog(order))

  useEffect(() => {
    close.current = onClose
  }, [onClose])

  useEffect(() => {
    lockScroll()
    return unlockScroll
  }, [])

  useEffect(() => {
    if (!closeOnEscape) return undefined
    const onKey = (event: KeyboardEvent) => {
      // only the top-most dialog answers Escape
      if (event.key !== 'Escape' || event.defaultPrevented || !isTopDialog(order)) return
      event.preventDefault()
      close.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeOnEscape, order])

  const sheet = placement === 'sheet'
  const full = placement === 'full'
  return createPortal(
    <div
      className={clsx(
        'fixed inset-0 flex justify-center animate-fade-in',
        full
          ? 'items-stretch'
          : sheet
            ? 'items-end bg-ink/35 pt-[max(1rem,env(safe-area-inset-top))] sm:items-center sm:p-4'
            : 'items-center bg-ink/35 p-4 pt-[max(1rem,env(safe-area-inset-top))]',
        backdropClassName,
      )}
      style={{ zIndex: 50 + dialogDepth(order) }}
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget
        // a dialog that needs an answer keeps the keyboard focus on a tap outside
        if (pressedOutside.current && !dismissible) event.preventDefault()
      }}
      onClick={(event) => {
        // closes only when the whole tap (press and release) was outside the panel
        const outside = pressedOutside.current && event.target === event.currentTarget
        pressedOutside.current = false
        if (outside && dismissible) close.current()
      }}
    >
      <div
        ref={panel}
        data-kiddo-dialog=""
        data-testid={testId}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={clsx(
          'flex w-full flex-col overscroll-contain outline-none',
          full
            ? 'h-full overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
            : [
                'max-h-full animate-pop-in items-center gap-4 overflow-y-auto bg-surface p-6 text-center text-ink',
                SIZE[size],
                sheet
                  ? 'rounded-t-panel pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-press-lg sm:rounded-panel'
                  : 'rounded-panel shadow-press-lg',
              ],
          className,
        )}
      >
        {sheet && (
          <span
            aria-hidden="true"
            className="-mt-2 h-1.5 w-12 rounded-full bg-line-strong sm:hidden"
          />
        )}
        {media}
        <h2
          id={titleId}
          className={clsx(
            'font-display text-2xl leading-tight font-extrabold sm:text-3xl',
            hideTitle && 'sr-only',
          )}
        >
          {title}
        </h2>
        {description && (
          <div id={descriptionId} className="text-lg text-ink-soft">
            {description}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

/** The bottom sheet: a Dialog that slides up from the bottom edge on phones. */
export function BottomSheet(props: Omit<DialogProps, 'placement'>) {
  return <Dialog {...props} placement="sheet" />
}
