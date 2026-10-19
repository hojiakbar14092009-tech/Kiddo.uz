import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { useLearnVoice } from './voice'

/**
 * The help bulb of the new sections. The help is always written (Free and
 * PRO) and may show a picture or a demonstration; on PRO with the voice on it
 * is also read out. `onOpen` lets a test note that help was used.
 */
export function HelpButton({
  text,
  children,
  glow = false,
  onOpen,
}: {
  text: string
  /** A picture or demonstration under the text. */
  children?: ReactNode
  /** The child seems stuck: the bulb lights up and wiggles. */
  glow?: boolean
  onOpen?: () => void
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const [open, setOpen] = useState(false)

  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          setOpen(true)
          onOpen?.()
        }}
        aria-label={t('learn.help')}
        animate={
          glow && !open && !reduceMotion
            ? { rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.12, 1] }
            : { rotate: 0, scale: 1 }
        }
        transition={glow ? { duration: 1.1, repeat: Infinity, repeatDelay: 1.2 } : undefined}
        className={clsx(
          'relative flex size-14 shrink-0 items-center justify-center rounded-full text-3xl transition-colors sm:size-16',
          glow
            ? 'bg-coin shadow-[0_0_0_6px_rgba(255,201,60,0.35),0_5px_0_var(--color-coin-shadow)]'
            : 'bg-surface shadow-[0_5px_0_var(--color-line)]',
        )}
      >
        <span aria-hidden="true">💡</span>
      </motion.button>
      {open && (
        <HelpSheet text={text} onClose={() => setOpen(false)}>
          {children}
        </HelpSheet>
      )}
    </>
  )
}

function HelpSheet({
  text,
  children,
  onClose,
}: {
  text: string
  children?: ReactNode
  onClose: () => void
}) {
  const { t } = useTranslation()
  const voice = useLearnVoice()
  const dialog = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useFocusTrap(dialog, button)

  useEffect(() => {
    void voice.speak([text])
    return () => voice.stop()
    // read once when opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="learn-help-title"
        className="flex max-h-full w-full max-w-lg flex-col items-center gap-4 overflow-y-auto rounded-[36px] bg-surface p-6 text-center text-ink shadow-[0_8px_0_var(--color-line)]"
      >
        <h2 id="learn-help-title" className="font-display text-2xl font-extrabold sm:text-3xl">
          <span aria-hidden="true">💡 </span>
          {text}
        </h2>
        {children}
        <Button ref={button} onClick={onClose}>
          {t('learn.helpOk')}
        </Button>
      </div>
    </div>
  )
}
