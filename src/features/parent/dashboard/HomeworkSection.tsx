import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { findLetter } from '@/content/alphabet'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { isGameOpen } from '@/features/age/ageLevel'
import { GAME_META } from '@/features/tasks/gameMeta'
import { GAME_TYPES, type GameType } from '@/features/tasks/games'
import { playableLetters } from '@/features/tasks/playableLetters'
import {
  levelOfChild,
  MAX_HOMEWORK_LETTERS,
  useFamilyStore,
  type ChildProfile,
} from '@/store/familyStore'
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
  // Only games open for the child’s age can be set as homework.
  const openGames = GAME_TYPES.filter((type) => isGameOpen(type, levelOfChild(child)))
  const [chosenGame, setGame] = useState<GameType>(openGames[0] ?? 'find-picture')
  const game = openGames.includes(chosenGame) ? chosenGame : (openGames[0] ?? 'find-picture')
  const [letters, setLetters] = useState<string[]>([])
  const homeworks = child.homeworks ?? []
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
                  className="flex flex-col gap-2 rounded-2xl border-2 border-line bg-cream p-3"
                >
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={clsx(
                        'rounded-full px-3 py-1 text-sm font-semibold',
                        homework.completedAt ? 'bg-primary-soft text-primary-ink' : 'bg-coin-soft',
                      )}
                    >
                      {homework.completedAt
                        ? t('parent.homework.done', {
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
                      className="ml-auto rounded-full px-3 py-1 text-sm font-bold text-oops-ink underline"
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
          options={openGames.map((value) => ({
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
      <CoinPenaltyPanel child={child} />
    </div>
  )
}
