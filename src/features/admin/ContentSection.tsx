import { useMemo, useState } from 'react'
import { getAlphabet } from '@/content/alphabet'
import { NUMBERS } from '@/content/numbers'
import { PICTURE_FILES } from '@/content/pictures'
import { STORIES } from '@/features/stories/content'
import { TALES } from '@/features/tales/content'
import { activeSeason, SEASON_SETTINGS, type SeasonSetting } from '@/features/seasons/seasons'
import { Panel } from './AdminSections'
import type { AdminData } from './adminData'

const SEASON_NAMES: Record<SeasonSetting, string> = {
  auto: 'Taqvim bo‘yicha (avtomatik)',
  off: 'O‘chirilgan',
  navruz: 'Navro‘z (hozir)',
  newYear: 'Yangi yil (hozir)',
  independence: 'Mustaqillik kuni (hozir)',
  knowledge: 'Bilimlar kuni (hozir)',
}

const SEASON_LABELS: Record<string, string> = {
  navruz: 'Navro‘z',
  newYear: 'Yangi yil',
  independence: 'Mustaqillik kuni',
  knowledge: 'Bilimlar kuni',
}

/**
 * Kontent va mavsumlar (Phase 45): how much the app holds, and the holiday greeting the robot
 * gives on Home (by the calendar, off, or one holiday now for every family).
 */
export function ContentSection({ data }: { data: AdminData }) {
  const [season, setSeason] = useState<SeasonSetting>(data.settings.season)
  const [saved, setSaved] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [today] = useState(() => new Date())

  const counts = useMemo(
    () => [
      { label: 'O‘zbek alifbosi', value: getAlphabet('uz').letters.length, unit: 'harf' },
      { label: 'Rus alifbosi', value: getAlphabet('ru').letters.length, unit: 'harf' },
      { label: 'Ingliz alifbosi', value: getAlphabet('en').letters.length, unit: 'harf' },
      { label: 'Sonlar', value: NUMBERS.length, unit: 'ta' },
      { label: 'Hikoyalar', value: STORIES.length, unit: 'ta' },
      { label: 'Ertaklar', value: TALES.length, unit: 'ta' },
      { label: 'Rasmlar', value: Object.keys(PICTURE_FILES).length, unit: 'ta' },
    ],
    [],
  )

  const now = activeSeason(season, today)

  const save = async () => {
    setProblem(null)
    try {
      await data.actions.saveSettings({ ...data.settings, season })
      setSaved(true)
    } catch (reason) {
      setProblem((reason as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="Kontent">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="content-counts">
          {counts.map((item) => (
            <div
              key={item.label}
              className="flex flex-col gap-1 rounded-xl bg-[var(--a-raise)] p-3"
            >
              <span className="text-xs text-[var(--a-ink-soft)]">{item.label}</span>
              <span className="kd-num font-display text-2xl font-semibold">
                {item.value}
                <span className="ml-1 text-sm font-normal text-[var(--a-ink-faint)]">
                  {item.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-[var(--a-ink-soft)]">
          Yangi kontent ilova bilan birga chiqadi (kodda). Ovozlar holatini «Ovozlar» bo‘limida
          ko‘ring.
        </p>
      </Panel>

      <Panel title="Mavsumlar">
        <p className="text-sm text-[var(--a-ink-soft)]">
          Bayram kunlari robot bosh sahifada bolani bayram bilan tabriklaydi.
        </p>
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Mavsum</legend>
          {SEASON_SETTINGS.map((value) => (
            <label key={value} className="flex min-h-11 items-center gap-3">
              <input
                type="radio"
                name="season"
                value={value}
                checked={season === value}
                onChange={() => {
                  setSeason(value)
                  setSaved(false)
                }}
                className="size-5 accent-[var(--a-accent)]"
              />
              {SEASON_NAMES[value]}
            </label>
          ))}
        </fieldset>
        <p className="text-sm" role="status" data-testid="season-now">
          Hozir: {now ? SEASON_LABELS[now] : 'bayram yo‘q – oddiy salomlashuv'}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => void save()}
            className="h-11 rounded-full bg-[var(--a-accent)] px-6 text-sm font-bold text-[var(--a-accent-ink)]"
          >
            Saqlash
          </button>
          {saved && <span className="text-sm font-bold text-[var(--a-online)]">Saqlandi.</span>}
          {problem && (
            <span role="alert" className="text-sm font-bold text-[var(--a-coral)]">
              {problem}
            </span>
          )}
        </div>
      </Panel>
    </div>
  )
}
