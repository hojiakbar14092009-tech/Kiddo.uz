import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { useCanUse } from '@/domain/entitlements'
import { tDynamic } from '@/lib/tDynamic'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useChildKey } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { useShortsStore } from '@/store/shortsStore'
import { captionAt, cuesFor, NO_CAPTION, TITLE_SECONDS, type CaptionState } from './captions'
import {
  freeLeft,
  isLive,
  mayWatch,
  PER_SITTING,
  posterUrl,
  SHORTS,
  videoUrl,
  type Short,
  type ShortId,
} from './catalog'
import { ShortQuiz } from './ShortQuiz'
import { learnedSwipe, markSwipeLearned } from './swipe'

const NO_SHORTS: ShortId[] = []
/** How long a finished cartoon waits before the hand shows how to swipe on. */
const HINT_AFTER_END_MS = 2500
/** A child who has never swiped is shown how this long into the first cartoon. */
const FIRST_HINT_MS = 7000

/** The subtitles' size, chosen by a grown-up or the child; kept on this device. */
const SIZES = ['m', 'l', 'xl'] as const
type Size = (typeof SIZES)[number]
const SIZE_CLASS: Record<Size, string> = { m: 'text-xl', l: 'text-2xl', xl: 'text-3xl' }
const SIZE_KEY = 'kiddo.shorts.captionSize'

function readSize(): Size {
  try {
    const saved = localStorage.getItem(SIZE_KEY)
    return SIZES.find((size) => size === saved) ?? 'l'
  } catch {
    return 'l'
  }
}

function saveSize(size: Size): void {
  try {
    localStorage.setItem(SIZE_KEY, size)
  } catch {
    // a private window: it is chosen again next time
  }
}

/**
 * The cartoons (Phases 60 and 69): a full-screen feed like the ones children know.
 * The first cartoon plays as soon as the page opens; swiping up brings the next,
 * and a hand shows how until the child has done it once. Only learning cartoons;
 * after a few in one sitting the feed ends with an invitation to play. Free opens
 * two different cartoons (and may rewatch them); the rest show a calm note for a
 * grown-up, never a purchase for the child.
 */
export function ShortsPage() {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const pro = useCanUse('shorts')
  const opened = useShortsStore((state) => state.opened[childKey] ?? NO_SHORTS)
  const open = useShortsStore((state) => state.open)
  const { sayText } = useSpeaker()
  const reduceMotion = useReducedMotion() ?? false
  const feed = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [watched, setWatched] = useState<ShortId[]>([])
  const [hint, setHint] = useState(false)
  const [swiped, setSwiped] = useState(() => learnedSwipe())
  const [size, setSize] = useState(readSize)
  const left = freeLeft(opened)
  const enough = watched.length >= PER_SITTING

  // the card in view is the active one (it plays; the others pause)
  useEffect(() => {
    const root = feed.current
    if (!root) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) continue
          const index = Number((entry.target as HTMLElement).dataset.index)
          setActive(index)
          setHint(false)
          if (index > 0) {
            setSwiped(true)
            markSwipeLearned()
          }
        }
      },
      { root, threshold: [0.6] },
    )
    root.querySelectorAll('[data-index]').forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [])

  // a child who has not swiped yet is shown how, a few seconds into the first cartoon
  useEffect(() => {
    if (swiped) return undefined
    const timer = setTimeout(() => setHint(true), FIRST_HINT_MS)
    return () => clearTimeout(timer)
  }, [swiped])
  useEffect(() => {
    if (hint && !swiped) void sayText(t('shorts.say.swipe'))
  }, [hint, sayText, swiped, t])

  const started = useCallback(
    (short: Short) => {
      open(childKey, short.id)
      setWatched((list) => (list.includes(short.id) ? list : [...list, short.id]))
    },
    [childKey, open],
  )

  const ended = useCallback(() => {
    if (!swiped) setTimeout(() => setHint(true), HINT_AFTER_END_MS)
  }, [swiped])

  const next = useCallback(() => {
    const root = feed.current
    if (!root) return
    root.scrollTo({
      top: (active + 1) * root.clientHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }, [active, reduceMotion])

  return (
    <div className="fixed inset-0 z-10 bg-night" data-testid="shorts-feed">
      <div
        ref={feed}
        className="h-dvh snap-y snap-mandatory overflow-y-scroll overscroll-contain [scrollbar-width:none]"
      >
        {SHORTS.map((short, index) => {
          const locked = !mayWatch(short.id, opened, pro)
          const capped = enough && !watched.includes(short.id)
          return (
            <section
              key={short.id}
              data-index={index}
              data-testid={`short-${short.id}`}
              data-locked={locked ? 'true' : 'false'}
              className="relative flex h-dvh snap-start snap-always items-center justify-center"
            >
              {locked || capped ? (
                <LockedCard short={short} capped={capped} />
              ) : (
                <Player
                  short={short}
                  active={active === index}
                  live={isLive(index, active)}
                  size={size}
                  onStarted={started}
                  onEnded={ended}
                  onNext={index + 1 < SHORTS.length ? next : undefined}
                />
              )}
            </section>
          )
        })}
      </div>

      {/* the way out, and Free's count */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          to="/explore"
          aria-label={t('common.back')}
          data-sound="back"
          className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white/90 text-ink shadow-[0_3px_0_rgb(0_0_0/0.25)]"
        >
          <ChevronLeftIcon size={28} />
        </Link>
        <div className="flex items-start gap-2">
          {SHORTS[active]?.bare && (
            <button
              type="button"
              aria-label={t('shorts.captionSize')}
              data-testid="shorts-caption-size"
              onClick={() => {
                const next = SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]!
                setSize(next)
                saveSize(next)
              }}
              className="pointer-events-auto flex size-12 items-center justify-center rounded-full bg-white/90 font-display text-xl font-extrabold text-ink shadow-[0_3px_0_rgb(0_0_0/0.25)]"
            >
              Aa
            </button>
          )}
          {!pro && (
            <p
              className="rounded-full bg-coin px-3 py-1.5 font-display text-base font-bold text-ink shadow-[0_3px_0_var(--color-coin-shadow)]"
              data-testid="shorts-free-left"
            >
              {left > 0 ? t('shorts.freeLeft', { n: left }) : t('shorts.freeOver')}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>{hint && !swiped && <SwipeHint onNext={next} />}</AnimatePresence>
    </div>
  )
}

/** A hand sliding up the screen: "swipe up for the next one" (a tap does it too). */
function SwipeHint({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  return (
    <motion.button
      type="button"
      onClick={onNext}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-x-0 top-[16%] z-30 mx-auto flex w-fit flex-col items-center rounded-3xl bg-night/70 px-4 py-2 text-white backdrop-blur"
      data-testid="shorts-swipe-hint"
    >
      <motion.span
        aria-hidden="true"
        className="text-4xl"
        animate={reduceMotion ? {} : { y: [30, -40, 30], opacity: [0, 1, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        👆
      </motion.span>
      <span className="font-display text-base font-bold">{t('shorts.swipe')}</span>
    </motion.button>
  )
}

/** One cartoon, full screen: plays while in view; tap to pause; at the end, play its game. */
function Player({
  short,
  active,
  live,
  size,
  onStarted,
  onEnded,
  onNext,
}: {
  short: Short
  active: boolean
  /** A video only while in view or next; every other cartoon is its poster. */
  live: boolean
  size: Size
  onStarted: (short: Short) => void
  onEnded: () => void
  onNext?: () => void
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion() ?? false
  const video = useRef<HTMLVideoElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const counted = useRef(false)
  // calm motion: nothing starts by itself, a tap does
  const [paused, setPaused] = useState(reduceMotion)
  const [muted, setMuted] = useState(false)
  const [ended, setEnded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [caption, setCaption] = useState<CaptionState>(NO_CAPTION)
  const [titleOn, setTitleOn] = useState(false)
  const cues = useMemo(
    () => (short.bare ? cuesFor(short.id, language) : []),
    [short.bare, short.id, language],
  )

  // the progress bar and the subtitles follow the picture frame by frame, without
  // re-rendering the page sixty times a second (state changes only when a word lights)
  useEffect(() => {
    const element = video.current
    if (!element || !active) return undefined
    let frame = 0
    const tick = () => {
      const time = element.currentTime
      if (bar.current && element.duration > 0) {
        bar.current.style.width = `${(time / element.duration) * 100}%`
      }
      if (short.bare) {
        const next = captionAt(cues, time)
        setCaption((prev) => (prev.cue === next.cue && prev.lit === next.lit ? prev : next))
        setTitleOn(time < TITLE_SECONDS)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, cues, short.bare])

  // in view: play (with sound when the browser lets it; else muted, with a sound button)
  useEffect(() => {
    const element = video.current
    if (!element) return
    if (!active) {
      element.pause()
      return
    }
    if (reduceMotion) return
    element.muted = false
    element.play().catch(() => {
      element.muted = true
      setMuted(true)
      void element.play().catch(() => setPaused(true))
    })
  }, [active, reduceMotion])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (muted) {
      element.muted = false
      setMuted(false)
      return
    }
    if (element.paused) void element.play().catch(() => setPaused(true))
    else element.pause()
  }

  const again = () => {
    const element = video.current
    if (!element) return
    setEnded(false)
    element.currentTime = 0
    void element.play().catch(() => setPaused(true))
  }

  return (
    <div
      className="relative h-full w-full max-w-[min(100%,calc(100dvh*9/16))] overflow-hidden bg-night"
      data-testid="short-player"
      data-active={active ? 'true' : 'false'}
    >
      {failed ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center text-white">
          <img src={posterUrl(short.id)} alt="" className="w-48 rounded-3xl" />
          <p className="font-display text-xl font-bold" role="alert">
            {t('shorts.loadError')}
          </p>
        </div>
      ) : live ? (
        <video
          ref={video}
          src={videoUrl(language, short.id)}
          poster={posterUrl(short.id)}
          playsInline
          preload="auto"
          onClick={toggle}
          onPlay={() => {
            setPaused(false)
            setEnded(false)
            if (!counted.current) {
              counted.current = true
              onStarted(short)
            }
          }}
          onPause={() => setPaused(true)}
          onEnded={() => {
            setEnded(true)
            onEnded()
          }}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <img src={posterUrl(short.id)} alt="" className="size-full object-cover" />
      )}

      {live && (
        <div className="pointer-events-none absolute inset-x-3 top-[max(4.5rem,calc(env(safe-area-inset-top)+4rem))] h-1.5 overflow-hidden rounded-full bg-white/25">
          <div ref={bar} className="h-full rounded-full bg-coin" style={{ width: '0%' }} />
        </div>
      )}

      {/* a bare cartoon: the app writes its title at the start and its words as they are spoken */}
      {short.bare && titleOn && (
        <p
          className="pointer-events-none absolute inset-x-5 top-[max(7rem,calc(env(safe-area-inset-top)+6.5rem))] text-center font-display text-3xl leading-tight font-extrabold text-balance text-white [text-shadow:0_2px_8px_rgb(0_0_0/0.55)]"
          data-testid="short-title"
        >
          {tDynamic(t, `shorts.items.${short.id}.title`)}
        </p>
      )}
      {short.bare && caption.cue >= 0 && !ended && (
        <p
          className={clsx(
            'pointer-events-none absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] max-h-[20%] overflow-hidden rounded-3xl bg-night/80 px-4 py-2 text-center font-display leading-snug font-extrabold text-balance text-white',
            SIZE_CLASS[size],
          )}
          data-testid="short-caption"
        >
          {cues[caption.cue]!.words.map((word, i) => (
            <span key={i} className={i < caption.lit ? 'text-coin' : 'opacity-60'}>
              {word}{' '}
            </span>
          ))}
        </p>
      )}

      {live && !failed && (paused || muted) && !ended && (
        <button
          type="button"
          onClick={toggle}
          aria-label={muted ? t('shorts.sound') : t('shorts.watch')}
          className="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-4xl text-ink shadow-[0_4px_0_rgb(0_0_0/0.25)]"
          data-testid="short-toggle"
        >
          {muted ? '🔊' : '▶'}
        </button>
      )}

      {ended && (
        <div
          className={clsx(
            'absolute inset-x-0 flex flex-col items-center gap-3 px-4',
            short.quiz ? 'top-[24%]' : 'bottom-[24%]',
          )}
          data-testid="short-ended"
        >
          {short.quiz && <ShortQuiz short={short} quiz={short.quiz} />}
          {short.play && (
            <Button onClick={() => void navigate(short.play!)}>{t('shorts.playGame')}</Button>
          )}
          {short.quiz && (
            <p className="text-sm text-white/85 [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
              {tDynamic(t, `shorts.items.${short.id}.text`)}
            </p>
          )}
          <div className="flex gap-3">
            <Button variant="soft" size="md" onClick={again} aria-label={t('shorts.again')}>
              <span aria-hidden="true">↻</span>
            </Button>
            {onNext && (
              <Button variant="soft" size="md" onClick={onNext}>
                {t('shorts.next')}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** A cartoon Free has no more room for, or the end of a sitting. */
function LockedCard({ short, capped }: { short: Short; capped: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="relative flex h-full w-full max-w-[min(100%,calc(100dvh*9/16))] flex-col items-center justify-center overflow-hidden">
      <img
        src={posterUrl(short.id)}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-40 blur-sm"
      />
      <div
        className={clsx(
          'relative mx-5 flex flex-col items-center gap-3 rounded-[2rem] p-6 text-center',
          capped ? 'bg-primary-soft' : 'bg-cream',
        )}
        data-testid={capped ? 'shorts-enough' : 'shorts-pro'}
      >
        <span aria-hidden="true" className="text-5xl">
          {capped ? '🎮' : '👑'}
        </span>
        <p className="font-display text-xl font-bold">
          {capped ? t('shorts.enough') : t('shorts.proTitle')}
        </p>
        {!capped && <p className="text-ink-soft">{t('shorts.proText')}</p>}
        <LinkButton
          to={capped ? '/games' : '/parent'}
          variant={capped ? 'primary' : 'soft'}
          size="md"
        >
          {capped ? t('sciGames.play') : t('shorts.toPro')}
        </LinkButton>
      </div>
    </div>
  )
}
