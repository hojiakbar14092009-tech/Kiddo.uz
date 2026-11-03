import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { ProBadge } from '@/components/ui/ProLock'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import { useCanUse } from '@/domain/entitlements'
import { tDynamic } from '@/lib/tDynamic'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { useShortsStore } from '@/store/shortsStore'
import {
  freeLeft,
  mayWatch,
  PER_SITTING,
  posterUrl,
  SHORTS,
  videoUrl,
  type Short,
  type ShortId,
} from './catalog'

const NO_SHORTS: ShortId[] = []

/**
 * The cartoons (Phase 60): short vertical films about what Kiddo teaches. One is
 * opened at a time and nothing plays on by itself; after a few the robot suggests
 * playing instead. Free opens two different cartoons (and may watch those again);
 * the rest wait for PRO, explained calmly for a grown-up, never sold to the child.
 */
export function ShortsPage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const pro = useCanUse('shorts')
  const opened = useShortsStore((state) => state.opened[childKey] ?? NO_SHORTS)
  const open = useShortsStore((state) => state.open)
  const { sayText } = useSpeaker()
  const [playing, setPlaying] = useState<Short | null>(null)
  const [sitting, setSitting] = useState(0)
  const enough = sitting >= PER_SITTING
  const left = freeLeft(opened)

  useEffect(() => {
    if (enough) void sayText(t('shorts.say.enough'))
  }, [enough, sayText, t])

  const proNote = useRef<HTMLElement>(null)

  const watch = (short: Short) => {
    if (enough) return
    if (!mayWatch(short.id, opened, pro)) {
      // a locked cartoon points to the calm note for a grown-up, never to a purchase
      proNote.current?.scrollIntoView({ block: 'center' })
      proNote.current?.focus()
      return
    }
    setPlaying(short)
  }

  /** A cartoon counts (for Free's two, and the sitting) once it really starts playing. */
  const started = (short: Short) => {
    open(childKey, short.id)
    setSitting((count) => count + 1)
  }

  return (
    <Screen
      header={<TitleTopBar title={t('shorts.title')} back="/explore" />}
      className="items-center gap-4 px-4 py-5"
    >
      {!pro && (
        <p
          className="rounded-full bg-coin-soft px-4 py-1.5 font-display text-lg font-bold"
          data-testid="shorts-free-left"
        >
          {left > 0 ? t('shorts.freeLeft', { n: left }) : t('shorts.freeOver')}
        </p>
      )}

      {enough && (
        <section
          className="flex w-full max-w-xl flex-col items-center gap-3 rounded-[28px] bg-primary-soft p-5 text-center"
          data-testid="shorts-enough"
        >
          <span aria-hidden="true" className="text-5xl">
            🎮
          </span>
          <p className="font-display text-xl font-bold">{t('shorts.enough')}</p>
          <LinkButton to="/explore" size="md">
            {t('sciGames.play')}
          </LinkButton>
        </section>
      )}

      <ul className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {SHORTS.map((short) => {
          const locked = !mayWatch(short.id, opened, pro)
          const title = tDynamic(t, `shorts.items.${short.id}.title`)
          return (
            <li key={short.id}>
              <button
                type="button"
                onClick={() => watch(short)}
                disabled={enough}
                aria-label={locked ? `${title} (PRO)` : title}
                data-locked={locked ? 'true' : 'false'}
                data-testid={`short-${short.id}`}
                className={clsx(
                  'relative flex w-full flex-col overflow-hidden rounded-[24px] bg-surface text-left shadow-[0_6px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-60',
                )}
              >
                <Poster short={short} dim={locked} />
                <span className="flex flex-col gap-0.5 p-3">
                  <span className="font-display text-lg leading-tight font-bold text-balance">
                    {title}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {tDynamic(t, `shorts.items.${short.id}.text`)}
                  </span>
                </span>
                {locked && (
                  <span className="absolute top-4 right-4">
                    <ProBadge size="sm" />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {!pro && left === 0 && (
        <section
          ref={proNote}
          tabIndex={-1}
          className="flex w-full max-w-xl flex-col items-center gap-2 rounded-[28px] bg-cream p-5 text-center outline-none focus-visible:ring-4 focus-visible:ring-focus"
          data-testid="shorts-pro"
        >
          <p className="font-display text-xl font-bold">{t('shorts.proTitle')}</p>
          <p className="text-ink-soft">{t('shorts.proText')}</p>
          <LinkButton to="/parent" variant="soft" size="md">
            {t('shorts.toPro')}
          </LinkButton>
        </section>
      )}

      {playing && (
        <Player
          short={playing}
          onStarted={() => started(playing)}
          onClose={() => setPlaying(null)}
        />
      )}
    </Screen>
  )
}

/** The cartoon's still picture, or its big emoji while there is none. */
function Poster({ short, dim }: { short: Short; dim: boolean }) {
  const [failed, setFailed] = useState(false)
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative flex aspect-[4/5] w-full items-center justify-center',
        short.tone,
        dim && 'opacity-60 grayscale-[40%]',
      )}
    >
      {failed ? (
        <span className="text-6xl leading-none sm:text-7xl">{short.emoji}</span>
      ) : (
        <img
          src={posterUrl(short.id)}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      )}
      <span className="absolute bottom-2 left-2 flex size-11 items-center justify-center rounded-full bg-surface/90 text-xl shadow-[0_2px_0_var(--color-line)]">
        ▶
      </span>
    </span>
  )
}

/** One cartoon, full screen; at the end: play the game it was about, or close. */
function Player({
  short,
  onStarted,
  onClose,
}: {
  short: Short
  onStarted: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const counted = useRef(false)
  useFocusTrap(panel, close)
  const [paused, setPaused] = useState(false)
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [progress, setProgress] = useState(0)
  const title = tDynamic(t, `shorts.items.${short.id}.title`)

  useEffect(() => {
    close.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (element.paused) void element.play().catch(() => setPaused(true))
    else element.pause()
  }

  const again = () => {
    setEnded(false)
    const element = video.current
    if (!element) return
    element.currentTime = 0
    void element.play().catch(() => setPaused(true))
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-night/95 p-[max(0.5rem,env(safe-area-inset-top))_0.5rem_max(0.5rem,env(safe-area-inset-bottom))]"
      data-testid="short-player"
      ref={panel}
    >
      <div className="relative flex h-full max-h-[92dvh] w-full max-w-[min(100%,calc(92dvh*9/16))] flex-col overflow-hidden rounded-[24px] bg-night">
        {failed ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center text-white">
            <span aria-hidden="true" className="text-7xl">
              {short.emoji}
            </span>
            <p className="font-display text-xl font-bold" role="alert">
              {t('shorts.loadError')}
            </p>
          </div>
        ) : (
          <video
            ref={video}
            src={videoUrl(language, short.id)}
            poster={posterUrl(short.id)}
            autoPlay
            playsInline
            preload="auto"
            onClick={toggle}
            onPlay={() => {
              setPaused(false)
              if (!counted.current) {
                counted.current = true
                onStarted()
              }
            }}
            onPause={() => setPaused(true)}
            onEnded={() => setEnded(true)}
            onError={() => setFailed(true)}
            onTimeUpdate={(event) => {
              const element = event.currentTarget
              if (element.duration > 0) setProgress(element.currentTime / element.duration)
            }}
            className="size-full flex-1 object-contain"
          />
        )}

        {/* progress, then the controls */}
        <div className="absolute inset-x-3 top-3 h-1.5 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-coin" style={{ width: `${progress * 100}%` }} />
        </div>
        <button
          ref={close}
          type="button"
          onClick={onClose}
          aria-label={t('shorts.close')}
          className="absolute top-6 right-3 flex size-12 items-center justify-center rounded-full bg-white/90 text-2xl text-ink shadow-[0_3px_0_rgb(0_0_0/0.25)]"
          data-testid="short-close"
        >
          ✕
        </button>
        {!failed && !ended && (
          <button
            type="button"
            onClick={toggle}
            aria-label={paused ? t('shorts.watch') : t('shorts.pause')}
            className={clsx(
              'absolute bottom-4 left-4 flex size-14 items-center justify-center rounded-full bg-white/90 text-2xl text-ink shadow-[0_3px_0_rgb(0_0_0/0.25)] transition-opacity',
              paused ? 'opacity-100' : 'opacity-70',
            )}
          >
            {paused ? '▶' : '⏸'}
          </button>
        )}
        {ended && (
          <div
            className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-night via-night/80 to-transparent px-4 pt-16 pb-6"
            data-testid="short-ended"
          >
            {short.play && (
              <Button
                onClick={() => {
                  onClose()
                  void navigate(short.play!)
                }}
              >
                {t('shorts.playGame')}
              </Button>
            )}
            <div className="flex gap-3">
              <Button variant="soft" size="md" onClick={again} aria-label={t('shorts.again')}>
                <span aria-hidden="true">↻</span>
              </Button>
              <Button variant="soft" size="md" onClick={onClose}>
                {t('shorts.close')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
