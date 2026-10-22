import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { BulbIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/Dialog'
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
          'relative flex size-14 shrink-0 items-center justify-center rounded-full text-ink transition-colors sm:size-16',
          glow ? 'bg-coin shadow-press-coin ring-6 ring-coin/35' : 'bg-surface shadow-press',
        )}
      >
        <BulbIcon size={30} />
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
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    void voice.speak([text])
    return () => voice.stop()
    // read once when opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  return (
    <BottomSheet
      title={
        <>
          <BulbIcon size={30} className="mr-2 inline-block align-[-0.2em] text-coin-shadow" />
          {text}
        </>
      }
      onClose={onClose}
      initialFocus={button}
      size="lg"
      testId="learn-help"
    >
      {children}
      <Button ref={button} onClick={onClose}>
        {t('learn.helpOk')}
      </Button>
    </BottomSheet>
  )
}
