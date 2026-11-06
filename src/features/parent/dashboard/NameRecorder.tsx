import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { loadNameVoice, NAME_MAX_MS, saveNameVoice } from '@/features/attention/nameVoice'

type State = 'idle' | 'recording' | 'noMic'

/**
 * The parent says the child's name once into the microphone (up to three seconds), can
 * listen to it and record it again. The recording stays on this device (nameVoice.ts):
 * the attention helper's robot plays it when it calls the child.
 */
export function NameRecorder({ childId }: { childId: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [state, setState] = useState<State>('idle')
  const [left, setLeft] = useState(0)
  const stopRef = useRef<(() => void) | null>(null)
  const supported =
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder === 'function' &&
    Boolean(navigator.mediaDevices?.getUserMedia)

  // the previous URL is let go by the effect below
  const show = (blob: Blob) =>
    setUrl(typeof URL.createObjectURL === 'function' ? URL.createObjectURL(blob) : null)

  useEffect(() => {
    let cancelled = false
    void loadNameVoice(childId).then((blob) => {
      if (!cancelled && blob) show(blob)
    })
    return () => {
      cancelled = true
      stopRef.current?.()
    }
  }, [childId])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  const record = async () => {
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setState('noMic')
      return
    }
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    const timers: ReturnType<typeof setTimeout>[] = []
    const stop = () => {
      timers.forEach(clearTimeout)
      stopRef.current = null
      if (recorder.state !== 'inactive') recorder.stop()
      stream.getTracks().forEach((track) => track.stop())
    }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type || 'audio/webm' })
      setState('idle')
      if (blob.size === 0) return
      show(blob)
      void saveNameVoice(childId, blob)
    }
    stopRef.current = stop
    recorder.start()
    setState('recording')
    const seconds = Math.round(NAME_MAX_MS / 1000)
    setLeft(seconds)
    for (let second = 1; second < seconds; second += 1) {
      timers.push(setTimeout(() => setLeft(seconds - second), second * 1000))
    }
    timers.push(setTimeout(stop, NAME_MAX_MS))
  }

  const listen = () => {
    if (!url) return
    const audio = new Audio(url)
    void audio.play().catch(() => undefined)
  }

  if (!supported) return null

  return (
    <section
      className="flex flex-col gap-2 rounded-3xl bg-cream p-4"
      aria-labelledby="name-voice-title"
      data-testid="name-voice"
    >
      <h3 id="name-voice-title" className="font-display text-lg font-extrabold">
        {t('parent.profiles.nameVoice.title')}
      </h3>
      <p className="text-ink-soft">{t('parent.profiles.nameVoice.hint')}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          size="md"
          variant={url ? 'soft' : 'primary'}
          disabled={state === 'recording'}
          onClick={() => void record()}
        >
          {state === 'recording'
            ? t('parent.profiles.nameVoice.recording', { seconds: left })
            : url
              ? t('parent.profiles.nameVoice.again')
              : t('parent.profiles.nameVoice.record')}
        </Button>
        {url && state !== 'recording' && (
          <Button size="md" variant="soft" onClick={listen}>
            {t('parent.profiles.nameVoice.listen')}
          </Button>
        )}
      </div>
      <p role="status" className="text-ink-soft">
        {state === 'noMic'
          ? t('parent.profiles.nameVoice.noMic')
          : url && state === 'idle'
            ? t('parent.profiles.nameVoice.saved')
            : ''}
      </p>
    </section>
  )
}
