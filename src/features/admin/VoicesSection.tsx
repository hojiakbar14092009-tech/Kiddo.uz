import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Language } from '@/content/languages'
import { publicClipUrl } from '@/services/audio/voicePaths'
import { Panel, Segmented } from './AdminSections'
import {
  useAdminVoices,
  useVoiceLines,
  VOICE_LANGUAGES,
  waitingList,
  type ReviewStatus,
  type VoiceLine,
} from './adminVoices'

type Filter = 'all' | 'waiting' | 'recorded' | 'approved' | 'rejected'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Hammasi' },
  { value: 'waiting', label: 'Yozilmagan' },
  { value: 'recorded', label: 'Yozilgan' },
  { value: 'approved', label: 'Tasdiqlangan' },
  { value: 'rejected', label: 'Qaytarilgan' },
]

const LANGUAGE_NAMES: Record<Language, string> = { uz: 'O‘zbek', ru: 'Rus', en: 'Ingliz' }
const PAGE = 60

function matches(line: VoiceLine, filter: Filter): boolean {
  switch (filter) {
    case 'waiting':
      return !line.recorded
    case 'recorded':
      return line.recorded
    case 'approved':
      return line.review?.status === 'approved'
    case 'rejected':
      return line.review?.status === 'rejected'
    default:
      return true
  }
}

/**
 * Ovozlar (Phase 45): how much of what children hear is recorded, per language; the waiting
 * list for the voice actor; listening to a recording and approving or returning it.
 */
export function VoicesSection({ source }: { source: 'device' | 'cloud' }) {
  const [language, setLanguage] = useState<Language>('uz')
  const [filter, setFilter] = useState<Filter>('waiting')
  const [query, setQuery] = useState('')
  const [shown, setShown] = useState(PAGE)
  const voices = useAdminVoices(source)
  const lines = useVoiceLines(language, voices.reviews)
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  // leaving the section stops the clip
  useEffect(() => () => audio.current?.pause(), [])

  const counts = useMemo(() => {
    const recorded = lines.filter((line) => line.recorded).length
    const approved = lines.filter((line) => line.review?.status === 'approved').length
    const rejected = lines.filter((line) => line.review?.status === 'rejected').length
    return { total: lines.length, recorded, waiting: lines.length - recorded, approved, rejected }
  }, [lines])

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return lines.filter(
      (line) =>
        matches(line, filter) && (!needle || line.text.toLocaleLowerCase().includes(needle)),
    )
  }, [lines, filter, query])

  const listen = (line: VoiceLine) => {
    audio.current?.pause()
    if (playing === line.key) {
      setPlaying(null)
      return
    }
    const clip = new Audio(publicClipUrl(language, line.key))
    clip.onended = () => setPlaying(null)
    clip.onerror = () => setPlaying(null)
    audio.current = clip
    setPlaying(line.key)
    void clip.play().catch(() => setPlaying(null))
  }

  const download = () => {
    const blob = new Blob([waitingList(lines)], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `kiddo-ovozlar-${language}.txt`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const percent = counts.total ? Math.round((counts.recorded / counts.total) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Ovozlar"
        action={
          <Segmented
            label="Til"
            value={language}
            onChange={(value) => {
              setLanguage(value)
              setShown(PAGE)
            }}
            options={VOICE_LANGUAGES.map((value) => ({ value, label: LANGUAGE_NAMES[value] }))}
          />
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="voice-counts">
          {[
            ['Jami gaplar', counts.total],
            ['Yozilgan', counts.recorded],
            ['Yozilmagan', counts.waiting],
            ['Tasdiqlangan', counts.approved],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--a-raise)] flex flex-col gap-1 rounded-xl p-3">
              <span className="text-xs text-[var(--a-ink-soft)]">{label}</span>
              <span className="kd-num font-display text-2xl font-semibold">{value}</span>
            </div>
          ))}
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--a-raise)]"
          role="progressbar"
          aria-label="Yozilgan ulushi"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <div className="h-full bg-[var(--a-accent)]" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={download}
            disabled={counts.waiting === 0}
            className="h-11 rounded-full border border-[var(--a-line)] px-4 text-sm font-bold disabled:opacity-40"
          >
            Yozilmaganlar ro‘yxatini yuklab olish ({counts.waiting})
          </button>
          {voices.error && (
            <p role="alert" className="text-sm font-bold text-[var(--a-coral)]">
              {voices.error}
            </p>
          )}
        </div>
      </Panel>

      <Panel title="Gaplar">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Holat"
            value={filter}
            onChange={(value) => {
              setFilter(value)
              setShown(PAGE)
            }}
            options={FILTERS}
          />
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm text-[var(--a-ink-soft)]">
            Qidirish
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setShown(PAGE)
              }}
              className="h-11 rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 text-base text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]"
            />
          </label>
        </div>
        <p className="text-sm text-[var(--a-ink-soft)]" role="status">
          {visible.length} ta gap
        </p>
        <ul className="flex flex-col divide-y divide-[var(--a-line)]" data-testid="voice-lines">
          {visible.slice(0, shown).map((line) => (
            <VoiceRow
              // a review arriving from the cloud (or saved) starts the row afresh with its note
              key={`${line.key}|${line.review?.at ?? ''}`}
              line={line}
              playing={playing === line.key}
              onListen={() => listen(line)}
              onReview={(status, note) => void voices.review(language, line.key, status, note)}
            />
          ))}
        </ul>
        {visible.length > shown && (
          <button
            type="button"
            onClick={() => setShown((count) => count + PAGE)}
            className="h-11 self-center rounded-full border border-[var(--a-line)] px-5 text-sm font-bold"
          >
            Yana ko‘rsatish
          </button>
        )}
      </Panel>
    </div>
  )
}

function VoiceRow({
  line,
  playing,
  onListen,
  onReview,
}: {
  line: VoiceLine
  playing: boolean
  onListen: () => void
  onReview: (status: ReviewStatus | null, note?: string) => void
}) {
  const [note, setNote] = useState(line.review?.note ?? '')
  const status = line.review?.status
  return (
    <li className="flex flex-col gap-2 py-3" data-voice-key={line.key}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 break-words">{line.text}</p>
        <span
          className={clsx(
            'rounded-full px-2.5 py-1 text-xs font-bold',
            status === 'approved'
              ? 'bg-[var(--a-accent-soft)] text-[var(--a-online)]'
              : status === 'rejected'
                ? 'bg-[var(--a-coral-soft)] text-[var(--a-coral)]'
                : line.recorded
                  ? 'bg-[var(--a-gold-soft)] text-[var(--a-ink)]'
                  : 'bg-[var(--a-raise)] text-[var(--a-ink-soft)]',
          )}
        >
          {status === 'approved'
            ? 'Tasdiqlangan'
            : status === 'rejected'
              ? 'Qaytarilgan'
              : line.recorded
                ? 'Yozilgan'
                : 'Yozilmagan'}
        </span>
      </div>
      {line.recorded && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onListen}
            className="h-11 rounded-full border border-[var(--a-line)] px-4 text-sm font-bold"
          >
            {playing ? 'To‘xtatish' : 'Tinglash'}
          </button>
          <button
            type="button"
            onClick={() => onReview(status === 'approved' ? null : 'approved', note)}
            aria-pressed={status === 'approved'}
            className="h-11 rounded-full bg-[var(--a-accent-soft)] px-4 text-sm font-bold"
          >
            Tasdiqlash
          </button>
          <button
            type="button"
            onClick={() => onReview(status === 'rejected' ? null : 'rejected', note)}
            aria-pressed={status === 'rejected'}
            className="h-11 rounded-full bg-[var(--a-coral-soft)] px-4 text-sm font-bold"
          >
            Qaytarish
          </button>
          <label className="flex min-w-40 flex-1 items-center gap-2 text-sm text-[var(--a-ink-soft)]">
            <span className="sr-only">Izoh</span>
            <input
              value={note}
              maxLength={200}
              placeholder="Izoh (masalan: urg‘u noto‘g‘ri)"
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => status && note !== (line.review?.note ?? '') && onReview(status, note)}
              className="h-11 w-full rounded-lg border border-[var(--a-line)] bg-[var(--a-raise)] px-3 text-sm text-[var(--a-ink)] outline-none focus:border-[var(--a-accent)]"
            />
          </label>
        </div>
      )}
    </li>
  )
}
