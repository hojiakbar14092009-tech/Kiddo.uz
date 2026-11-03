import clsx from 'clsx'
import { motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { MascotFigure } from '@/features/mascot/MascotFigure'
import { MascotThoughtBubble } from '@/features/mascot/MascotThoughtBubble'
import { TOP_GAMES } from '@/features/games/catalog'
import { track } from '@/domain/analytics'
import { tashkentDay } from '@/lib/dates'
import { tDynamic } from '@/lib/tDynamic'
import { audioManager } from '@/services/audio/audioManager'
import { playCue } from '@/services/audio/soundLanguage'
import { useAttentionStore } from '@/store/attentionStore'
import { childAge, useActiveChild, useMascotModel } from '@/store/familyStore'
import { useChildKey, useWearing } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { watchCamera, type CameraWatch } from './cameraWatcher'
import { inChildArea, isLearningScreen } from './routes'
import {
  AWAY_MIN_MS,
  idleMsFor,
  initialTracker,
  lineFor,
  LOOK_AWAY_MS,
  noteDistraction,
  type Distraction,
  withName,
} from './tracker'

/** How long the robot's reminder stays on screen. */
const SHOWN_MS = 6500
/** The call sound first, then the robot's words (so the two never overlap). */
const SPEAK_AFTER_MS = 700

/** Touches, keys and scrolling all mean the child is there. */
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * The attention helper (Phase 58, docs/architecture/attention.md). Runs only after a
 * grown-up said yes; on the grown-ups' screens it is not there at all.
 */
export function AttentionHelper() {
  const consent = useAttentionStore((state) => state.consent)
  const camera = useAttentionStore((state) => state.camera)
  const { pathname } = useLocation()
  const childKey = useChildKey()
  if (consent !== 'granted' || !inChildArea(pathname)) return null
  // each child starts with a clean count
  return <AttentionRunner key={childKey} pathname={pathname} camera={camera} />
}

function AttentionRunner({ pathname, camera }: { pathname: string; camera: boolean }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const navigate = useNavigate()
  const child = useActiveChild()
  const childKey = useChildKey()
  const note = useAttentionStore((state) => state.note)
  const age = child ? childAge(child) : null
  const learning = isLearningScreen(pathname)

  const tracker = useRef(initialTracker())
  const turn = useRef(0)
  const [shown, setShown] = useState<{ key: number; text: string } | null>(null)
  const [offer, setOffer] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  // the latest words and language, so the reminders' effects never restart over them
  const say = useRef({ t, language, name: child?.name, childKey, note })
  useEffect(() => {
    say.current = { t, language, name: child?.name, childKey, note }
  }, [child?.name, childKey, language, note, t])
  const speakTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(speakTimer.current), [])

  const fire = useCallback((cause: Distraction) => {
    // nothing counts while the app is hidden, and a reminder never talks over the robot
    // already speaking (a lesson's instruction); coming back is greeted either way
    if (document.visibilityState !== 'visible') return
    if (cause !== 'away' && audioManager.getStatus() !== 'idle') return
    const { state, action } = noteDistraction(tracker.current, cause, Date.now())
    tracker.current = state
    if (!action) return
    const { t: translate, language: spoken, name, childKey: key, note: log } = say.current
    const line = tDynamic(translate, `attention.say.${lineFor(action, turn.current++)}`)
    // the child's own name comes first: nothing turns a head faster (Phase 71)
    const text = action.kind === 'welcomeBack' ? line : withName(name, line)
    const day = tashkentDay()
    if (action.kind === 'offerGames') {
      setOffer(true)
      log(key, day, 'offers')
      track('attention_offer')
    } else {
      setShown({ key: Date.now(), text })
      log(key, day, action.kind === 'welcomeBack' ? 'away' : 'reminders')
      if (action.kind === 'nudge') track('attention_nudge')
    }
    // a short call sound in every tier (it is not speech), then the voice: PRO's (or the
    // demo's), the name itself said by the device voice; Free sees the robot and its bubble
    if (action.kind !== 'welcomeBack') playCue('alert', { byTap: true })
    clearTimeout(speakTimer.current)
    speakTimer.current = setTimeout(
      () => void audioManager.speak([{ text }], { language: spoken }),
      action.kind === 'welcomeBack' ? 0 : SPEAK_AFTER_MS,
    )
  }, [])

  // the reminder hides on its own
  useEffect(() => {
    if (!shown) return undefined
    const timer = setTimeout(() => setShown(null), SHOWN_MS)
    return () => clearTimeout(timer)
  }, [shown])

  // leaving the app: greeted on the way back; the camera is closed meanwhile
  useEffect(() => {
    let hiddenAt: number | null = null
    const onVisibility = () => {
      const isVisible = document.visibilityState === 'visible'
      setVisible(isVisible)
      if (!isVisible) {
        hiddenAt = Date.now()
        return
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= AWAY_MIN_MS) fire('away')
      hiddenAt = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [fire])

  // no touch for a while on a learning screen (the robot reading aloud counts as busy)
  useEffect(() => {
    if (!learning) return undefined
    const idleMs = idleMsFor(age)
    let timer: ReturnType<typeof setTimeout> | undefined
    const restart = () => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        fire('idle')
        restart()
      }, idleMs)
    }
    restart()
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, restart, { passive: true }))
    return () => {
      clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, restart))
    }
  }, [age, fire, learning])

  // the camera: only with the grown-up's yes, only on a learning screen, only while visible
  useEffect(() => {
    if (!learning || !camera || !visible) return undefined
    let watch: CameraWatch | null = null
    let cancelled = false
    let awayTimer: ReturnType<typeof setTimeout> | undefined
    watchCamera(
      (gaze) => {
        clearTimeout(awayTimer)
        if (gaze === 'away') awayTimer = setTimeout(() => fire('lookAway'), LOOK_AWAY_MS)
      },
      // the sign shows as soon as the camera is open, before the detector has loaded
      () => {
        if (cancelled) return
        setCameraOn(true)
        track('attention_camera')
      },
    )
      .then((started) => {
        if (cancelled) started.stop()
        else watch = started
      })
      // no camera, or the browser said no: the helper goes on without it
      .catch(() => {
        if (!cancelled) setCameraOn(false)
      })
    return () => {
      cancelled = true
      clearTimeout(awayTimer)
      watch?.stop()
      setCameraOn(false)
    }
  }, [camera, fire, learning, visible])

  const go = (to: string) => {
    setOffer(false)
    note(childKey, tashkentDay(), 'games')
    track('attention_offer_taken')
    void navigate(to)
  }

  return (
    <>
      {cameraOn && <CameraBadge label={t('attention.cameraOn')} />}
      <NudgeMascot message={shown} />
      {offer && (
        <Dialog
          title={t('attention.offerTitle')}
          description={t('attention.offerText')}
          onClose={() => setOffer(false)}
          size="lg"
          testId="attention-offer"
        >
          <ul className="mt-4 grid grid-cols-2 gap-3 min-[560px]:grid-cols-3">
            {TOP_GAMES.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  onClick={() => go(game.to)}
                  className={clsx(
                    'flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center font-display text-lg leading-tight font-bold shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none',
                    game.tint,
                  )}
                >
                  <span aria-hidden="true" className="text-5xl leading-none">
                    {game.emoji}
                  </span>
                  {tDynamic(t, game.labelKey)}
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => go('/games')}
                data-testid="attention-all-games"
                className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-3xl bg-coin p-3 text-center font-display text-lg leading-tight font-bold shadow-[0_5px_0_var(--color-coin-shadow)] transition-transform active:translate-y-1 active:shadow-none"
              >
                <span aria-hidden="true" className="text-5xl leading-none">
                  🎮
                </span>
                {t('games.all')}
              </button>
            </li>
          </ul>
          <Button variant="soft" size="md" className="mt-4" onClick={() => setOffer(false)}>
            {t('attention.later')}
          </Button>
        </Dialog>
      )}
    </>
  )
}

/** The robot peeks in from the lower left corner with its reminder. */
function NudgeMascot({ message }: { message: { key: number; text: string } | null }) {
  const model = useMascotModel()
  const wearing = useWearing()
  const reduceMotion = useReducedMotion() ?? false
  const visible = message !== null
  return (
    <div
      aria-hidden={!visible}
      data-testid="attention-nudge"
      className="pointer-events-none fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom)+5rem))] left-0 z-40 flex items-end"
    >
      <motion.div
        initial={false}
        animate={{ x: visible ? '-18%' : '-110%' }}
        transition={
          reduceMotion ? { duration: 0.15 } : { type: 'spring', stiffness: 80, damping: 13 }
        }
        className="w-[96px] sm:w-[130px]"
      >
        <MascotFigure
          model={model}
          wearing={wearing}
          mood={visible ? 'wave' : 'idle'}
          className="h-auto w-full"
        />
      </motion.div>
      <MascotThoughtBubble
        message={message ? { text: message.text, emoji: '👀' } : null}
        messageKey={message?.key ?? 0}
        side="left"
      />
    </div>
  )
}

/** While the camera looks, a small sign says so (the browser shows its own too). */
function CameraBadge({ label }: { label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className="pointer-events-none fixed top-[max(0.5rem,env(safe-area-inset-top))] left-1/2 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full bg-surface/90 px-2.5 py-1 text-sm shadow-[0_2px_0_var(--color-line)]"
    >
      <span
        aria-hidden="true"
        className="size-2 rounded-full bg-primary motion-safe:animate-pulse"
      />
      <span aria-hidden="true">📷</span>
    </span>
  )
}
