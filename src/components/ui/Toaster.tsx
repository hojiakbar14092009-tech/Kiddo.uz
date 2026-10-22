import clsx from 'clsx'
import { createPortal } from 'react-dom'
import { CheckIcon } from '@/components/icons'
import { useAnyDialogOpen } from './dialogStack'
import { useToastStore, type ToastTone } from './toast'

const TONE: Record<ToastTone, string> = {
  info: 'bg-ink text-white',
  success: 'bg-primary text-white',
  warning: 'bg-coin text-ink',
}

/**
 * Where the notices appear: bottom centre, above the home bar; while a dialog
 * is open they move to the top, so they never cover its buttons.
 */
export function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)
  const dialogOpen = useAnyDialogOpen()
  return createPortal(
    <div
      // a live region without role="status": it is always on the page, and the
      // other status messages (tier, offline…) stay the only "status" elements
      aria-live="polite"
      aria-relevant="additions"
      className={clsx(
        'pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4',
        dialogOpen
          ? 'top-0 pt-[max(1rem,env(safe-area-inset-top))]'
          : 'bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))]',
      )}
    >
      {toasts.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => dismiss(item.id)}
          className={clsx(
            'pointer-events-auto inline-flex min-h-12 max-w-md animate-pop-in items-center gap-2 rounded-full px-5 py-2 text-left font-display text-lg font-bold shadow-press-sm',
            TONE[item.tone],
          )}
        >
          {item.tone === 'success' && <CheckIcon size={22} />}
          {item.text}
        </button>
      ))}
    </div>,
    document.body,
  )
}
