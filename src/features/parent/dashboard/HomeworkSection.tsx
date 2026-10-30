import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { findLetter } from '@/content/alphabet'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { isGameSuggested } from '@/features/age/ageLevel'
import { GAME_META } from '@/features/tasks/gameMeta'
import { GAME_TYPES, type GameType } from '@/features/tasks/games'
import { playableLetters } from '@/features/tasks/playableLetters'
import { dayKey } from '@/features/tasks/rules'
import { isOverdue } from '@/features/homework/activityHomework'
import { homeworkStatus, type HomeworkStatus } from '@/features/homework/status'
import { topicLabel } from '@/features/homework/topics'
import { letterGroup } from '@/features/homework/letterGroups'
import { strugglingLetters } from '../report'
import { useProgress } from '@/store/progressStore'
import { useUniverseStore } from '@/domain/universe'
import { tDynamic } from '@/lib/tDynamic'
import {
  isActivityHomework,
  levelOfChild,
  MAX_HOMEWORK_LETTERS,
  useFamilyStore,
  type ActivityHomework,
  type ChildProfile,
} from '@/store/familyStore'
import { ActivityHomeworkPanel } from './ActivityHomeworkPanel'
import { useLanguage } from '@/store/settingsStore'
import { formatDayMonth } from '@/lib/dates'
import { ChoiceChips } from './ChoiceChips'
import { CoinPenaltyPanel } from './CoinPenaltyPanel'
import { Panel } from './Panel'

/**
 * The parent sets as much homework as they like – each one up to five letters
 * and a game. The child sees every unfinished one first on the home screen.
 */
export function HomeworkSection({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const assignHomework = useFamilyStore((state) => state.assignHomework)
  const removeHomework = useFamilyStore((state) => state.removeHomework)
  const clearDoneHomework = useFamilyStore((state) => state.clearDoneHomework)
  const [added, setAdded] = useState(false)
  const childLanguage = useLanguage()
  const [language, setLanguage] = useState<Language>(childLanguage)
  // Every game can be set; the ones suggested for the child’s age come first.
  const level = levelOfChild(child)
  const games = [...GAME_TYPES].sort(
    (a, b) => Number(!isGameSuggested(a, level)) - Number(!isGameSuggested(b, level)),
  )
  const [game, setGame] = useState<GameType>(games[0]!)
  const [letters, setLetters] = useState<string[]>([])
  const homeworks = child.homeworks ?? []
  const progress = useProgress(child.id)
  const today = dayKey()
  // how the counted runs went (for "more practice will help")
  const recent = useUniverseStore((state) => state.byChild[child.id]?.recent)
  // unfinished first (oldest first), then the finished ones (newest first)
  const pending = homeworks.filter((homework) => !homework.completedAt)
  const done = homeworks
    .filter((homework) => homework.completedAt)
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))

  const toggle = (id: string) => {
    setAdded(false)
    setLetters((current) =>
      current.includes(id)
        ? current.filter((letter) => letter !== id)
        : current.length < MAX_HOMEWORK_LETTERS
          ? [...current, id]
          : current,
    )
  }

  const assign = () => {
    assignHomework(child.id, { language, game, letterIds: letters })
    setLetters([])
    setAdded(true)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <Panel title={t('parent.homework.current')}>
        {homeworks.length === 0 ? (
          <p className="text-ink-soft">{t('parent.homework.none', { name: child.name })}</p>
        ) : (
          <>
            <p className="font-semibold text-ink-soft">
              {t('parent.homework.summary', { pending: pending.length, done: done.length })}
            </p>
            <ul className="flex flex-col gap-3" aria-label={t('parent.homework.current')}>
              {[...pending, ...done].map((homework) => (
                <li
                  key={homework.id}
                  data-testid="hw-item"
                  data-kind={homework.kind ?? 'letters'}
                  className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-cream p-3"
                >
                  {isActivityHomework(homework) ? (
                    <ActivityHomeworkLine homework={homework} today={today} />
                  ) : (
                    <>
                      <p
                        className="font-display text-2xl font-extrabold tracking-wide"
                        lang={homework.language}
                      >
                        {homework.letterIds
                          .map((id) => findLetter(homework.language, id)?.upper ?? id)
                          .join(' ')}
                      </p>
                      <p>
                        {GAME_META[homework.game].emoji} {t(GAME_META[homework.game].titleKey)} ·{' '}
                        {LANGUAGE_INFO[homework.language].nativeName}
                      </p>
                    </>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={homeworkStatus(homework, recent)} />
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-sm font-semibold',
                        homework.completedAt ? 'bg-primary-soft text-primary-ink' : 'bg-coin-soft',
                      )}
                    >
                      {homework.completedAt
                        ? isActivityHomework(homework)
                          ? t('parent.homework.activity.doneOn', {
                              date: formatDayMonth(new Date(homework.completedAt)),
                            })
                          : t('parent.homework.done', {
                              date: formatDayMonth(new Date(homework.completedAt)),
                              count: homework.mistakes ?? 0,
                            })
                        : t('parent.homework.waiting', {
                            date: formatDayMonth(new Date(homework.assignedAt)),
                          })}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHomework(child.id, homework.id)}
                      className="ml-auto min-h-11 rounded-full px-3 py-1 text-sm font-bold text-oops-ink underline"
                    >
                      {homework.completedAt
                        ? t('parent.homework.clear')
                        : t('parent.homework.cancel')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {done.length > 0 && (
              <Button
                variant="soft"
                size="md"
                className="self-start"
                onClick={() => clearDoneHomework(child.id)}
              >
                {t('parent.homework.clearDone')}
              </Button>
            )}
          </>
        )}
      </Panel>

      <Panel title={t('parent.homework.new')}>
        <ChoiceChips
          label={t('parent.homework.language')}
          options={LANGUAGES.map((value) => ({ value, label: LANGUAGE_INFO[value].nativeName }))}
          value={language}
          onChange={(next) => {
            setLanguage(next)
            setLetters([])
            setAdded(false)
          }}
        />
        <ChoiceChips
          label={t('parent.homework.game')}
          options={games.map((value) => ({
            value,
            label: `${GAME_META[value].emoji} ${t(GAME_META[value].titleKey)}`,
          }))}
          value={game}
          onChange={(next) => {
            setGame(next)
            // Keep only letters the new game can actually ask about.
            setLetters((current) =>
              current.filter((id) => playableLetters(language, next).some((l) => l.id === id)),
            )
          }}
        />
        <div className="flex flex-col gap-2" data-testid="hw-groups">
          <span className="font-semibold">{t('parent.homework.groups.title')}</span>
          <div className="flex flex-wrap gap-2">
            {(['next', 'practice', 'vowels'] as const).map((group) => {
              const ids = letterGroup(group, {
                language,
                playable: playableLetters(language, game),
                learned: progress.learned[language] ?? [],
                struggling: strugglingLetters(progress, language).map((entry) => entry.letterId),
                max: MAX_HOMEWORK_LETTERS,
              })
              return (
                <button
                  key={group}
                  type="button"
                  disabled={ids.length === 0}
                  onClick={() => {
                    setLetters(ids)
                    setAdded(false)
                  }}
                  data-testid={`hw-group-${group}`}
                  className="min-h-11 rounded-full border-2 border-line-strong bg-surface px-4 font-semibold disabled:opacity-40"
                >
                  {t(`parent.homework.groups.${group}`)}
                </button>
              )
            })}
          </div>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-semibold">
            {t('parent.homework.letters', { count: letters.length, max: MAX_HOMEWORK_LETTERS })}
          </legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(52px,1fr))] gap-2">
            {playableLetters(language, game).map((letter) => {
              const selected = letters.includes(letter.id)
              return (
                <button
                  key={letter.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && letters.length >= MAX_HOMEWORK_LETTERS}
                  onClick={() => toggle(letter.id)}
                  lang={language}
                  className={clsx(
                    'h-12 rounded-2xl border-2 font-display text-xl font-bold disabled:opacity-40',
                    selected
                      ? 'border-primary bg-primary text-white'
                      : 'border-line-strong bg-surface',
                  )}
                >
                  {letter.upper}
                </button>
              )
            })}
          </div>
        </fieldset>
        <Button size="md" className="self-start" disabled={letters.length === 0} onClick={assign}>
          {t('parent.homework.assign', { name: child.name })}
        </Button>
        <p
          role={added ? 'status' : undefined}
          className={clsx('text-sm', added ? 'font-semibold text-primary-ink' : 'text-ink-soft')}
        >
          {added ? t('parent.homework.added') : t('parent.homework.unlimited')}
        </p>
      </Panel>
      <ActivityHomeworkPanel child={child} />
      <CoinPenaltyPanel child={child} />
    </div>
  )
}

const STATUS_TONE: Record<HomeworkStatus, string> = {
  assigned: 'bg-surface text-ink-soft border-2 border-line-strong',
  started: 'bg-sky-soft text-ink',
  completed: 'bg-primary-soft text-primary-ink',
  practice: 'bg-lilac-soft text-ink',
}

/** Assigned → Started → Completed, or a kind "more practice will help". */
function StatusChip({ status }: { status: HomeworkStatus }) {
  const { t } = useTranslation()
  return (
    <span
      data-testid="hw-status"
      data-status={status}
      className={clsx('rounded-full px-3 py-1 text-sm font-bold', STATUS_TONE[status])}
    >
      {t(`parent.homework.status.${status}`)}
    </span>
  )
}

/** One activity homework in the parent's list: what, how far, by when, the note. */
function ActivityHomeworkLine({ homework, today }: { homework: ActivityHomework; today: string }) {
  const { t } = useTranslation()
  const language = useLanguage()
  const overdue = isOverdue(homework, today)
  return (
    <>
      <p className="font-display text-xl font-extrabold">
        {tDynamic(t, `parent.insights.names.${homework.target}`)}
        {homework.topic && `: ${topicLabel(homework.target, homework.topic, language)}`}
      </p>
      <p data-testid="hw-progress">
        {t('parent.homework.activity.progress', {
          done: Math.min(homework.runs.length, homework.times),
          total: homework.times,
        })}
        {homework.dueDay &&
          ` · ${t('parent.homework.activity.by', {
            date: formatDayMonth(new Date(`${homework.dueDay}T12:00:00`)),
          })}`}
      </p>
      {overdue && (
        <p className="text-sm font-semibold text-oops-ink">{t('parent.homework.activity.late')}</p>
      )}
      {homework.note && <p className="text-ink-soft italic">“{homework.note}”</p>}
    </>
  )
}
