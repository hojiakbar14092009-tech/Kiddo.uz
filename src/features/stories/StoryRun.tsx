import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SpeakerIcon } from '@/components/icons'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { ProBadge } from '@/components/ui/ProLock'
import { ProgressBar } from '@/components/ui/Progress'
import { useProLabel } from '@/components/ui/useProLabel'
import type { Language } from '@/content/languages'
import { useSpeechStatus } from '@/services/audio/useSpeechStatus'
import { storyText } from './content'
import {
  choose,
  currentPage,
  goBack,
  goNext,
  readingProgress,
  startReading,
  type ReaderState,
} from './engine'
import { STORIES_ROOT } from './StoryLibrary'
import { StoryPicture } from './StoryPicture'
import { StoryQuestions } from './StoryQuestions'
import type { StorySpec, StoryText } from './types'
import { useStoriesUi, useStoryLanguage, type StoriesUi } from './ui'
import { useNarration, type NarrationProblem } from './useNarration'

function problemNote(ui: StoriesUi, problem: NarrationProblem): string {
  if (problem === 'missing') return ui.noRecording
  if (problem === 'muted') return ui.narrationMuted
  if (problem === 'locked') return ui.proNarration
  return ui.narrationError
}

/** "Read to me": PRO toggles the page narration; Free shows the PRO chip and a calm note. */
function NarrationControls({
  narration,
  ui,
  onLocked,
}: {
  narration: ReturnType<typeof useNarration>
  ui: StoriesUi
  onLocked: () => void
}) {
  const proLabel = useProLabel()
  const status = useSpeechStatus()
  if (!narration.allowed) {
    return (
      <span className="relative inline-flex">
        <Button
          variant="soft"
          size="md"
          onClick={onLocked}
          icon={<SpeakerIcon size={24} />}
          aria-label={proLabel(ui.readToMe)}
          data-testid="story-narrate"
          data-state="locked"
          className="short:min-h-12 short:px-3"
        >
          <span className="max-[379px]:sr-only">{ui.readToMe}</span>
        </Button>
        <ProBadge size="sm" />
      </span>
    )
  }
  const problem = narration.state === 'problem'
  const busy = narration.on && !problem && (status === 'loading' || status === 'speaking')
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        variant={narration.on ? (problem ? 'soft' : 'primary') : 'soft'}
        size="md"
        onClick={narration.toggle}
        aria-pressed={narration.on}
        aria-busy={narration.on && status === 'loading'}
        icon={<SpeakerIcon size={24} />}
        data-testid="story-narrate"
        data-state={narration.state}
        className={clsx(
          'short:min-h-12 short:px-3',
          problem && 'bg-oops-soft! text-oops-ink! shadow-[0_5px_0_var(--color-oops-shadow)]!',
          busy && 'learn-speak',
        )}
      >
        <span className="max-[379px]:sr-only">{narration.on ? ui.stopReading : ui.readToMe}</span>
      </Button>
      {narration.on && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-3 text-sm font-bold shadow-press-sm">
          <input
            type="checkbox"
            className="size-5 accent-[var(--color-primary)]"
            checked={narration.autoTurn}
            onChange={(event) => narration.setAutoTurn(event.target.checked)}
            data-testid="story-auto-turn"
          />
          {ui.autoTurn}
        </label>
      )}
    </div>
  )
}

/** The pages of one story: picture, 1–3 sentences, choices, back / next, "Read to me". */
function StoryReader({
  story,
  text,
  ui,
  onFinished,
}: {
  story: StorySpec
  text: StoryText
  ui: StoriesUi
  onFinished: (endingId: string) => void
}) {
  const [state, setState] = useState<ReaderState>(() => startReading(story))
  // a note belongs to the page it was shown on (a new page starts without it)
  const [noteFor, setNoteFor] = useState<{ key: string; text: string } | null>(null)
  const page = currentPage(story, state)
  const language = useStoryLanguage()
  const textRef = useRef<HTMLElement>(null)
  const noteRef = useRef<HTMLParagraphElement>(null)
  const firstPage = useRef(true)
  const lines = useMemo(() => text.pages[page.id] ?? [], [page.id, text.pages])
  const progress = readingProgress(story, state)
  const pageKey = `${page.id}-${state.history.length}`
  const next = useCallback(() => setState((current) => goNext(story, current)), [story])
  const narration = useNarration({
    lines,
    pageKey,
    canTurn: page.next !== undefined,
    onTurn: next,
  })
  const note = noteFor?.key === pageKey ? noteFor.text : null
  const shownNote = narration.problem !== undefined ? problemNote(ui, narration.problem) : note

  // a new page starts at the top, and focus moves to its words (not on the first page)
  useEffect(() => {
    window.scrollTo?.({ top: 0 })
    if (firstPage.current) {
      firstPage.current = false
      return
    }
    textRef.current?.focus({ preventScroll: true })
  }, [pageKey])

  // a note under the buttons is scrolled into view (a short or narrow screen hides it otherwise)
  useEffect(() => {
    if (shownNote) noteRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [shownNote])

  return (
    <div
      className="mx-auto grid w-full max-w-5xl gap-2 min-[380px]:gap-3 sm:gap-5 landscape:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] landscape:items-start lg:max-w-7xl lg:landscape:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)] short:gap-3"
      data-testid="story-reader"
      data-page={page.id}
    >
      <div className="aspect-[16/10] w-full overflow-hidden rounded-card bg-sky-soft shadow-press-lg max-[379px]:aspect-[2/1] short:aspect-auto short:h-[calc(100dvh-6.5rem)]">
        <StoryPicture key={pageKey} picture={page.picture} label={ui.pictureLabel(text.title)} />
      </div>
      <div className="flex min-w-0 flex-col gap-2 min-[380px]:gap-3 short:gap-2">
        <div className="flex items-center gap-3">
          <ProgressBar
            value={progress.current}
            max={progress.total}
            label={ui.progress(progress.current, progress.total)}
            className="flex-1"
          />
          <span className="shrink-0 text-sm font-bold text-ink-soft" aria-hidden="true">
            {progress.current} / {progress.total}
          </span>
        </div>
        <article
          ref={textRef}
          tabIndex={-1}
          className="flex flex-col gap-1.5 rounded-card bg-surface p-3 text-lg leading-snug shadow-press outline-none focus-visible:ring-4 focus-visible:ring-primary/40 min-[380px]:p-4 min-[380px]:text-xl sm:p-5 sm:text-2xl short:p-3 short:text-lg"
          data-testid="story-text"
        >
          {lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </article>

        {page.choices && (
          <div role="group" aria-label={ui.choose} className="grid grid-cols-2 gap-3 short:gap-2">
            {page.choices.map((choice) => (
              <button
                key={choice.textKey}
                type="button"
                onClick={() => setState((current) => choose(story, current, choice.textKey))}
                data-testid={`story-choice-${choice.textKey}`}
                className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-card bg-coin-soft p-2 text-center font-display text-base leading-tight font-extrabold shadow-press transition-transform active:translate-y-1 sm:flex-row sm:gap-3 sm:p-3 sm:text-left sm:text-lg short:flex-row short:p-1.5 short:text-left short:text-sm"
              >
                <Img3D
                  name={choice.picture}
                  className="size-10 shrink-0 min-[380px]:size-12 sm:size-14 short:size-10"
                  eager
                />
                <span>{text.choices[choice.textKey]}</span>
              </button>
            ))}
          </div>
        )}

        {page.ending && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <p className="flex items-center gap-2 font-display text-2xl font-extrabold text-primary-ink short:text-xl">
              <Img3D name="glowing-star" className="size-10 short:size-8" eager />
              {ui.theEnd}
            </p>
            <Button
              variant="coin"
              size="md"
              onClick={() => onFinished(page.id)}
              data-testid="story-to-questions"
              className="short:min-h-12"
            >
              {ui.toQuestions}
            </Button>
          </div>
        )}

        <nav className="flex items-center justify-between gap-2" aria-label={text.title}>
          <Button
            variant="soft"
            size="md"
            onClick={() => setState(goBack)}
            disabled={state.history.length <= 1}
            aria-label={ui.prev}
            icon={<ChevronLeftIcon size={26} />}
            data-testid="story-back"
            className="short:min-h-12"
          />
          <NarrationControls
            narration={narration}
            ui={ui}
            onLocked={() => setNoteFor({ key: pageKey, text: ui.proNarration })}
          />
          {page.ending || page.choices ? (
            <span className="w-14" aria-hidden="true" />
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={next}
              aria-label={ui.next}
              icon={<ChevronRightIcon size={26} />}
              data-testid="story-next"
              className="short:min-h-12"
            />
          )}
        </nav>
        {language === 'uz' && (
          <p
            data-testid="story-voice-note"
            className="text-center text-sm leading-snug text-ink-soft short:text-xs"
          >
            {ui.syntheticVoice}
          </p>
        )}
        {shownNote && (
          <p
            ref={noteRef}
            role="status"
            data-testid="story-note"
            className="rounded-card bg-cream px-4 py-2 text-center text-base font-semibold text-ink-soft"
          >
            {shownNote}
          </p>
        )}
      </div>
    </div>
  )
}

type Phase = { kind: 'reading' } | { kind: 'questions'; ending: string }

/** One story from its first page to the questions and the reward. */
export function StoryRun({ story, language }: { story: StorySpec; language: Language }) {
  const ui = useStoriesUi()
  const text = storyText(language, story.id)
  const [round, setRound] = useState(0)
  // where the question rotation starts, so even the first reading is not always the same
  const [firstReading] = useState(() => Math.floor(Math.random() * 12))
  const [phase, setPhase] = useState<Phase>({ kind: 'reading' })

  if (phase.kind === 'questions') {
    return (
      <StoryQuestions
        key={round}
        story={story}
        text={text}
        ui={ui}
        reading={firstReading + round}
        onAgain={() => {
          setRound((r) => r + 1)
          setPhase({ kind: 'reading' })
        }}
      />
    )
  }
  return (
    <Screen
      header={<TitleTopBar title={text.title} back={STORIES_ROOT} wrap />}
      className="px-4 py-3 sm:px-8 sm:py-5 short:py-2"
    >
      <StoryReader
        key={round}
        story={story}
        text={text}
        ui={ui}
        onFinished={(ending) => setPhase({ kind: 'questions', ending })}
      />
    </Screen>
  )
}
