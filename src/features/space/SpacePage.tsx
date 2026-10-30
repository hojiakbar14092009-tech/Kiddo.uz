import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckIcon, ChevronLeftIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { LearnShell } from '@/features/learn/LearnShell'
import { stagesTaught, useLearnChild } from '@/features/learn/learnStore'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useContentTier } from '@/domain/adaptive'
import { SECTION_STRAND } from '@/domain/universe/wiring'
import { exhibitFor, LESSONS, lessonsFor, type AgeLevel, type BodyId } from './content'
import { ObjectCard, SpaceLesson } from './Lesson'
import { testCount } from './questions'
import { SpaceTest } from './SpaceTest'
import { useSpaceLanguage, useSpaceText } from './useSpaceText'
import { SpacePicture } from './views'
import './space.css'

type View =
  | { name: 'menu' }
  | { name: 'lesson'; stage: string }
  /** `focus`: a homework's own lesson — its check asks only about that lesson. */
  | { name: 'test'; focus?: string }
  | { name: 'object'; id: BodyId }

/** The Koinot section: lessons by age, a short check and the solar system up close. */
export function SpacePage() {
  const level = useContentTier(SECTION_STRAND.space) as AgeLevel
  // the questions are written in one language: a new language starts the screen again in it
  const language = useSpaceLanguage()
  // a homework link (?lesson=5-1) opens that lesson first: teach, then the check
  const [params] = useSearchParams()
  const [view, setView] = useState<View>(() => {
    const stage = params.get('lesson')
    return stage && LESSONS.some((item) => item.stage === stage)
      ? { name: 'lesson', stage }
      : { name: 'menu' }
  })
  const [focus] = useState(() => params.get('lesson'))
  // a fresh run every time (new questions, a new session)
  const [run, setRun] = useState(0)
  const open = (next: View) => {
    setRun((count) => count + 1)
    setView(next)
    window.scrollTo?.({ top: 0 })
  }
  const toMenu = () => open({ name: 'menu' })

  if (view.name === 'lesson') {
    const lesson = LESSONS.find((item) => item.stage === view.stage)
    if (lesson) {
      return (
        <SpaceLesson
          key={`${run}-${language}`}
          lesson={lesson}
          onExit={toMenu}
          onTest={() =>
            open({ name: 'test', focus: focus === lesson.stage ? lesson.stage : undefined })
          }
        />
      )
    }
  }
  if (view.name === 'test') {
    return (
      <SpaceTest
        key={`${run}-${language}`}
        level={level}
        focus={view.focus}
        onAgain={() => open({ name: 'test', focus: view.focus })}
        onExit={toMenu}
      />
    )
  }
  if (view.name === 'object') return <ObjectScreen id={view.id} onBack={toMenu} />
  return <SpaceMenu level={level} onOpen={open} />
}

function SpaceMenu({ level, onOpen }: { level: AgeLevel; onOpen: (view: View) => void }) {
  const { t } = useTranslation()
  const language = useSpaceLanguage()
  const text = useSpaceText()
  const { say } = useLearnMascot()
  const learn = useLearnChild()
  const stages = stagesTaught(learn, 'space', language)
  const lessons = lessonsFor(level)
  const canTest = testCount(level, stages) > 0
  const exhibit = exhibitFor(level)

  // hello once when the section opens (say() changes identity with the voice state)
  const greeted = useRef(false)
  useEffect(() => {
    if (greeted.current) return
    greeted.current = true
    say('greet', { text: text.say.hello, emoji: '🚀' })
  }, [say, text.say.hello])

  return (
    <LearnShell
      title={t('learn.sections.space')}
      themeClassName="learn-space"
      speak={[text.say.hello]}
    >
      <section className="space-panel space-hero">
        <SpacePicture id="saturn" eager className="space-hero-planet" />
        <div className="min-w-0">
          {/* on phones the page title above already says it */}
          <h2 className="hidden font-display text-4xl font-extrabold sm:block">{text.ui.title}</h2>
          <p className="text-lg sm:mt-1 sm:text-xl">{text.ui.intro}</p>
        </div>
      </section>

      <section aria-labelledby="space-lessons" className="flex flex-col gap-3">
        <h2 id="space-lessons" className="space-heading">
          {t('learn.learnMode')}
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, index) => {
            const done = stages.includes(lesson.stage)
            return (
              <li key={lesson.stage}>
                <button
                  type="button"
                  className="space-lesson"
                  onClick={() => onOpen({ name: 'lesson', stage: lesson.stage })}
                >
                  <span className="space-lesson-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="space-lesson-pictures" aria-hidden="true">
                    {lesson.cards.slice(0, 4).map((id) => (
                      <SpacePicture key={id} id={id} className="size-12 sm:size-14" />
                    ))}
                  </span>
                  <span className="font-display text-xl font-extrabold">
                    {text.ui.lessonTitles[lesson.stage]}
                  </span>
                  {done && (
                    <span className="space-done">
                      <CheckIcon size={18} />
                      {text.ui.taught}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-panel flex flex-col items-center gap-3 p-5 text-center sm:flex-row sm:text-left">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-extrabold">{t('learn.testMode')}</h2>
          {!canTest && <p className="text-base opacity-90">{text.ui.learnFirst}</p>}
        </div>
        <Button
          variant="coin"
          size="lg"
          disabled={!canTest}
          aria-disabled={!canTest}
          className={clsx(!canTest && 'cursor-not-allowed opacity-60')}
          onClick={() => canTest && onOpen({ name: 'test' })}
        >
          {t('learn.startTest')}
        </Button>
      </section>

      {/* Phase 33: the flagship scale journey with Astro */}
      <Link
        to="/scale-portal"
        className="space-panel flex items-center gap-4 p-5 text-left"
        data-testid="scale-portal-link"
      >
        <SpacePicture id="saturn" className="size-16 shrink-0" />
        <span className="min-w-0">
          <span className="block font-display text-2xl font-extrabold">
            {t('scalePortal.card')}
          </span>
          <span className="block text-base opacity-90">{t('scalePortal.cardText')}</span>
        </span>
      </Link>

      {/* Phase 34: Lumi's shadow puzzles (light, objects and where shadows fall) */}
      <Link
        to="/shadow-lab"
        className="space-panel flex items-center gap-4 p-5 text-left"
        data-testid="shadow-lab-link"
      >
        <SpacePicture id="sun" className="size-16 shrink-0" />
        <span className="min-w-0">
          <span className="block font-display text-2xl font-extrabold">{t('shadowLab.title')}</span>
          <span className="block text-base opacity-90">{t('shadowLab.cardText')}</span>
        </span>
      </Link>

      <section
        aria-labelledby="space-exhibit"
        className="space-panel flex flex-col gap-3 p-4 sm:p-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="space-exhibit" className="font-display text-2xl font-extrabold">
            {text.ui.exhibit}
          </h2>
          <p className="space-note">{text.ui.exhibitNote}</p>
        </div>
        <p className="text-base opacity-90">{text.ui.exhibitTap}</p>
        <ol className="space-exhibit">
          {exhibit.map((id) => (
            <li key={id} data-body={id}>
              <button
                type="button"
                className="space-exhibit-item"
                onClick={() => onOpen({ name: 'object', id })}
              >
                <SpacePicture id={id} className="space-exhibit-picture" />
                <span>{text.objects[id].name}</span>
              </button>
            </li>
          ))}
        </ol>
      </section>
    </LearnShell>
  )
}

/** One object up close: the 3D model to turn, its name and facts. */
function ObjectScreen({ id, onBack }: { id: BodyId; onBack: () => void }) {
  const text = useSpaceText()
  return (
    <LearnShell title={text.objects[id].name} themeClassName="learn-space">
      <div className="flex flex-col items-center gap-5">
        <ObjectCard id={id} lines={text.objects[id].facts} />
        <Button
          variant="soft"
          size="md"
          data-sound="back"
          icon={<ChevronLeftIcon size={24} />}
          onClick={onBack}
        >
          {text.ui.exhibit}
        </Button>
      </div>
    </LearnShell>
  )
}
