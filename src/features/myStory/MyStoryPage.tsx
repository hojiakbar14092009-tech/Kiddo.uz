import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useNarration, type NarrationProblem } from '@/features/stories/useNarration'
import { tDynamic } from '@/lib/tDynamic'
import { useChildKey } from '@/store/progressStore'
import {
  CHOICE_PICTURE,
  STEP_OPTIONS,
  STEP_PROMPT,
  STORY_STEPS,
  storyCards,
  type StoryChoices,
} from './content'
import { useMyStoryStore, type SavedStory } from './store'
import { StoryStage } from './StoryStage'
import { FitWords } from '@/components/ui/FitWords'

const NO_STORIES: readonly SavedStory[] = []
const TINTS = ['bg-sky-soft', 'bg-coin-soft', 'bg-lilac-soft', 'bg-primary-soft'] as const

/**
 * «O‘z ertagim» (Phase 49): four picture steps make a story, which then
 * plays as picture cards. "Read to me" (PRO) reads each card from its
 * recordings with the stories' own narration (useNarration); the last three
 * stories of this child stay for another look.
 */
export function MyStoryPage() {
  const [story, setStory] = useState<StoryChoices | null>(null)
  // every story played (or built) starts fresh
  const [run, setRun] = useState(0)
  if (story) {
    return (
      <StoryPlay
        key={run}
        choices={story}
        onAgain={() => {
          setStory(null)
          setRun((value) => value + 1)
        }}
      />
    )
  }
  return (
    <StoryBuilder
      key={run}
      onDone={(choices) => {
        setStory(choices)
        setRun((value) => value + 1)
      }}
    />
  )
}

function StoryBuilder({ onDone }: { onDone: (choices: StoryChoices) => void }) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const save = useMyStoryStore((state) => state.save)
  const recent = useMyStoryStore((state) => state.byChild[childKey] ?? NO_STORIES)
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<Partial<StoryChoices>>({})
  const current = STORY_STEPS[step]!
  const prompt = tDynamic(t, STEP_PROMPT[current])

  const pick = (id: string) => {
    const next = { ...picked, [current]: id }
    if (step + 1 < STORY_STEPS.length) {
      setPicked(next)
      setStep(step + 1)
      return
    }
    const choices = next as StoryChoices
    save(childKey, choices)
    onDone(choices)
  }

  return (
    <LearnShell
      title={t('myStory.title')}
      step={{ current: step, total: STORY_STEPS.length }}
      speak={[prompt]}
    >
      <section
        data-testid="my-story-builder"
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 sm:gap-5"
      >
        <p className="text-sm font-semibold text-ink-soft">
          {t('myStory.step', { current: step + 1, total: STORY_STEPS.length })}
        </p>
        <h2
          data-testid="my-story-prompt"
          className="text-center font-display text-2xl leading-tight font-extrabold sm:text-3xl"
        >
          {prompt}
        </h2>
        <ul className="grid w-full grid-cols-2 gap-3 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-4">
          {STEP_OPTIONS[current].map((id, index) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => pick(id)}
                data-testid={`my-story-choice-${id}`}
                className="flex h-full min-h-32 w-full flex-col items-center justify-center gap-1.5 rounded-3xl bg-surface p-2 shadow-[0_6px_0_var(--color-line)] transition-transform active:translate-y-1 sm:min-h-40 sm:gap-2 sm:p-3"
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    'flex size-20 items-center justify-center rounded-2xl sm:size-24',
                    TINTS[index % TINTS.length],
                  )}
                >
                  <Img3D name={CHOICE_PICTURE[current][id]!} className="size-[78%]" eager />
                </span>
                <FitWords
                  text={tDynamic(t, `myStory.names.${current}.${id}`)}
                  className="text-center font-display text-base leading-tight font-bold sm:text-lg"
                />
              </button>
            </li>
          ))}
        </ul>
        {step > 0 && (
          <Button
            variant="soft"
            size="md"
            onClick={() => setStep(step - 1)}
            icon={<ChevronLeftIcon size={24} />}
            data-testid="my-story-step-back"
          >
            {t('myStory.prev')}
          </Button>
        )}
        {step === 0 && recent.length > 0 && (
          <div className="flex w-full flex-col gap-2" data-testid="my-story-recent">
            <h3 className="font-display text-xl font-bold">{t('myStory.recent')}</h3>
            <ul className="flex flex-wrap gap-2">
              {recent.map((item) => {
                const hero = tDynamic(t, `myStory.names.hero.${item.hero}`)
                const place = tDynamic(t, `myStory.names.place.${item.place}`)
                return (
                  <li key={item.at}>
                    <button
                      type="button"
                      onClick={() => onDone(item)}
                      aria-label={t('myStory.replay', { hero, place })}
                      className="flex min-h-12 items-center gap-2 rounded-full bg-surface py-1 pr-4 pl-1 font-bold shadow-press-sm"
                    >
                      <Img3D name={CHOICE_PICTURE.hero[item.hero]!} className="size-10" />
                      <Img3D name={CHOICE_PICTURE.place[item.place]!} className="size-10" />
                      <span>
                        {hero}, {place}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>
    </LearnShell>
  )
}

/** The calm note under "Read to me" when the card could not be heard. */
function problemKey(problem: NarrationProblem | undefined) {
  if (problem === 'locked') return 'learn.voiceLocked' as const
  if (problem === 'muted') return 'learn.voiceMuted' as const
  if (problem === 'error') return 'learn.voiceError' as const
  return null
}

function StoryPlay({ choices, onAgain }: { choices: StoryChoices; onAgain: () => void }) {
  const { t } = useTranslation()
  const { say } = useLearnMascot()
  const [cards] = useState(() => storyCards(choices))
  const [index, setIndex] = useState(0)
  const card = cards[index]!
  const lines = card.lines.map((key) => tDynamic(t, key))
  const last = index === cards.length - 1
  const narration = useNarration({
    lines,
    pageKey: `${card.id}-${index}`,
    canTurn: !last,
    onTurn: () => setIndex((value) => Math.min(value + 1, cards.length - 1)),
  })
  const noteKey = narration.state === 'problem' ? problemKey(narration.problem) : null
  const note = noteKey ? t(noteKey) : null

  useEffect(() => {
    say('celebrate', { text: t('myStory.say.ready'), emoji: '📖' })
    // once, when the story starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <LearnShell
      title={t('myStory.title')}
      step={{ current: index, total: cards.length }}
      voice={false}
    >
      <section
        data-testid="my-story-play"
        data-card={card.id}
        className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4"
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-[28px] shadow-[0_7px_0_var(--color-line)]">
          <StoryStage card={card} label={t('myStory.pictureLabel')} />
        </div>
        <div
          data-testid="my-story-text"
          className="flex w-full flex-col gap-1 rounded-[28px] bg-surface p-4 text-center font-display text-xl leading-snug font-bold sm:text-2xl"
        >
          {lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <Button
          variant={narration.on ? 'primary' : 'soft'}
          size="md"
          onClick={narration.toggle}
          aria-pressed={narration.on}
          icon={<SpeakerIcon size={24} />}
          data-testid="my-story-narrate"
          data-state={narration.state}
        >
          {narration.on ? t('myStory.stopReading') : t('myStory.readToMe')}
        </Button>
        {/* always there, so screen readers hear a new note */}
        <p role="status" data-testid="my-story-note" className="text-center text-ink-soft">
          {note ?? ''}
        </p>
        <div className="flex w-full items-center justify-between gap-3">
          <Button
            variant="soft"
            size="md"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
            icon={<ChevronLeftIcon size={24} />}
            data-testid="my-story-prev"
          >
            {t('myStory.prev')}
          </Button>
          {last ? (
            <Button size="md" onClick={onAgain} data-testid="my-story-again">
              {t('myStory.again')}
            </Button>
          ) : (
            <Button
              size="md"
              onClick={() => setIndex(index + 1)}
              icon={<ChevronRightIcon size={24} />}
              iconPosition="end"
              data-testid="my-story-next"
            >
              {t('myStory.next')}
            </Button>
          )}
        </div>
      </section>
    </LearnShell>
  )
}
