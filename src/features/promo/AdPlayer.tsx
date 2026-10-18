import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { useFocusTrap } from '@/components/ui/useFocusTrap'
import type { PlayableAd } from './promoBackend'

interface AdPlayerProps {
  ad: PlayableAd
  /** Watched to the very end. */
  onComplete: () => void
  /** Closed early: no promo code. */
  onCancel: () => void
  onError: () => void
}

/**
 * Plays the ad full screen. It cannot be skipped or fast-forwarded: only
 * seconds actually played count, seeking jumps back, and the video pauses
 * while the tab is hidden. Closing early asks first – no ad, no code.
 */
export function AdPlayer({ ad, onComplete, onCancel, onError }: AdPlayerProps) {
  const { t } = useTranslation()
  const video = useRef<HTMLVideoElement>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const last = useRef(0)
  const watchedRef = useRef(0)
  const done = useRef(false)
  const [watched, setWatched] = useState(0)
  const [length, setLength] = useState(ad.duration)
  const [blocked, setBlocked] = useState(false)
  const [asking, setAskingState] = useState(false)
  const askingRef = useRef(false)
  useFocusTrap(dialog, closeButton)

  const setAsking = (value: boolean) => {
    askingRef.current = value
    setAskingState(value)
  }

  useEffect(() => {
    const element = video.current
    const start = () =>
      element?.play().then(
        () => setBlocked(false),
        () => setBlocked(true),
      )
    void start()
    const onVisibility = () => {
      if (document.hidden) element?.pause()
      else if (!askingRef.current) void start()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const play = () => {
    video.current?.play().then(
      () => setBlocked(false),
      () => setBlocked(true),
    )
  }

  const finish = () => {
    if (done.current) return
    if (watchedRef.current >= length - 1.5) {
      done.current = true
      onComplete()
    } else {
      // something skipped ahead: go back to where the honest viewing stopped
      const element = video.current
      if (element) {
        element.currentTime = last.current
        play()
      }
    }
  }

  const remaining = Math.max(0, Math.ceil(length - watched))
  const progress = length > 0 ? Math.min(1, watched / length) : 0

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={t('pro.getPromo.ad')}
      className="fixed inset-0 z-[90] flex flex-col bg-[#120d1d] text-white"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
          {t('pro.getPromo.ad')}
        </span>
        <span className="flex-1 truncate font-semibold">{ad.title}</span>
        <span
          role="timer"
          aria-live="off"
          className="font-display text-lg font-extrabold tabular-nums"
        >
          {t('pro.getPromo.remaining', { count: remaining })}
        </span>
        <button
          ref={closeButton}
          type="button"
          onClick={() => {
            video.current?.pause()
            setAsking(true)
          }}
          className="flex size-11 items-center justify-center rounded-full bg-white/15 text-2xl leading-none"
          aria-label={t('pro.getPromo.close')}
        >
          ×
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <video
          ref={video}
          src={ad.src}
          playsInline
          autoPlay
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          className="max-h-full max-w-full"
          onLoadedMetadata={(event) => {
            const seconds = event.currentTarget.duration
            if (Number.isFinite(seconds) && seconds > 0)
              setLength(Math.min(seconds, ad.duration || seconds))
          }}
          onTimeUpdate={(event) => {
            const now = event.currentTarget.currentTime
            const delta = now - last.current
            if (delta > 0 && delta < 1.5) {
              watchedRef.current = Math.min(length, watchedRef.current + delta)
              setWatched(watchedRef.current)
            }
            last.current = now
          }}
          onSeeking={(event) => {
            if (event.currentTarget.currentTime > last.current + 1) {
              event.currentTarget.currentTime = last.current
            }
          }}
          onEnded={finish}
          onError={onError}
          onContextMenu={(event) => event.preventDefault()}
        />
        {blocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Button variant="coin" onClick={play}>
              {t('pro.getPromo.tapToPlay')}
            </Button>
          </div>
        )}
      </div>

      <div className="px-4 pt-2 pb-5">
        <p className="mb-2 text-center text-sm text-white/80">{t('pro.getPromo.keepWatching')}</p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          className="h-3 overflow-hidden rounded-full bg-white/15"
        >
          <div
            className="h-full rounded-full bg-coin transition-[width] duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {asking && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ad-leave"
            className="flex w-full max-w-sm flex-col gap-5 rounded-[28px] bg-surface p-6 text-ink"
          >
            <p id="ad-leave" className="font-display text-xl font-extrabold">
              {t('pro.getPromo.leave')}
            </p>
            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="soft" size="md" onClick={onCancel}>
                {t('pro.getPromo.leaveYes')}
              </Button>
              <Button
                size="md"
                onClick={() => {
                  setAsking(false)
                  play()
                }}
              >
                {t('pro.getPromo.leaveNo')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
