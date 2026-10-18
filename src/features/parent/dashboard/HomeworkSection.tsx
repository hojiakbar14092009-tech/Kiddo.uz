import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { findLetter } from '@/content/alphabet'
import { LANGUAGE_INFO, LANGUAGES, type Language } from '@/content/languages'
import { GAME_META } from '@/features/tasks/gameMeta'
import { GAME_TYPES, type GameType } from '@/features/tasks/games'
import { playableLetters } from '@/features/tasks/playableLetters'
import { MAX_HOMEWORK_LETTERS, useFamilyStore, type ChildProfile } from '@/store/familyStore'
import { useLanguage } from '@/store/settingsStore'
import { formatDayMonth } from '@/lib/dates'
import { ChoiceChips } from './ChoiceChips'
import { Panel } from './Panel'

/** The parent picks up to five letters and a game; the child sees it first on the home screen. */
export function HomeworkSection({ child }: { child: ChildProfile }) {
  const { t } = useTranslation()
  const assignHomework = useFamilyStore((state) => state.assignHomework)
  const clearHomework = useFamilyStore((state) => state.clearHomework)
  const childLanguage = useLanguage()
  const [language, setLanguage] = useState<Language>(childLanguage)
  const [game, setGame] = useState<GameType>('find-letter')
  const [letters, setLetters] = useState<string[]>([])
  const homework = child.homework

  const toggle = (id: string) =>
    setLetters((current) =>
      current.includes(id)
        ? current.filter((letter) => letter !== id)
        : current.length < MAX_HOMEWORK_LETTERS
          ? [...current, id]
          : current,
    )

  const assign = () => {
    assignHomework(child.id, { language, game, letterIds: letters })
    setLetters([])
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <Panel title={t('parent.homework.current')}>
        {homework ? (
          <div className="flex flex-col gap-3">
            <p className="font-display text-3xl font-extrabold tracking-wide">
              {homework.letterIds
                .map((id) => findLetter(homework.language, id)?.upper ?? id)
                .join(' ')}
            </p>
            <p>
              {GAME_META[homework.game].emoji} {t(GAME_META[homework.game].titleKey)} ·{' '}
              {LANGUAGE_INFO[homework.language].nativeName}
            </p>
            <p
              className={clsx(
                'self-start rounded-full px-3 py-1 font-semibold',
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
            </p>
            <Button
              variant="soft"
              size="md"
              className="self-start"
              onClick={() => clearHomework(child.id)}
            >
              {homework.completedAt ? t('parent.homework.clear') : t('parent.homework.cancel')}
            </Button>
          </div>
        ) : (
          <p className="text-ink-soft">{t('parent.homework.none', { name: child.name })}</p>
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
          }}
        />
        <ChoiceChips
          label={t('parent.homework.game')}
          options={GAME_TYPES.map((value) => ({
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
      </Panel>
    </div>
  )
}
