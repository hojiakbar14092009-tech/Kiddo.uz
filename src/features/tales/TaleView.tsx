import clsx from 'clsx'
import { useReducedMotion } from 'framer-motion'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon, SpeakerIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import type { Language } from '@/content/languages'
import { LearnShell } from '@/features/learn/LearnShell'
import { useLearnStore } from '@/features/learn/learnStore'
import { useLearnVoice } from '@/features/learn/voice'
import type { SpeakOutcome } from '@/services/audio/audioManager'
import { useMascot } from '@/features/mascot/useMascot'
import { canRender3D } from '@/features/mascot/webgl'
import { useChildKey } from '@/store/progressStore'
import { sceneSpeech, taleText, type SceneSpec, type TaleSpec } from './content'
import { SceneTask } from './SceneTask'
import { StaticScene } from './StaticScene'
import { checkLength } from './logic'
import { TaleCheck } from './TaleCheck'
import { TALES_UI, type TalesUi } from './ui'
import { useReader } from './useReader'

const TaleScene3D = lazy(() => import('./three/TaleScene3D'))

function SceneStage({
  scene,
  sceneKey,
  label,
}: {
  scene: SceneSpec
  sceneKey: string
  label: string
}) {
  const reduceMotion = useReducedMotion() ?? false
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  const flat = <StaticScene scene={scene} label={label} />
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[32px] bg-sky-soft shadow-[0_8px_0_var(--color-line)] sm:aspect-[16/10] landscape:max-h-[64dvh]">
      {failed || !canRender3D() ? (
        flat
      ) : (
        <Suspense fallback={flat}>
          <TaleScene3D
            scene={scene}
            sceneKey={sceneKey}
            label={label}
            reducedMotion={reduceMotion}
            onFail={onFail}
          />
        </Suspense>
      )}
    </div>
  )
}

function ReadControls({
  reader,
  ui,
  isPro,
  onLocked,
}: {
  reader: ReturnType<typeof useReader>
  ui: TalesUi
  isPro: boolean
  onLocked: () => void
}) {
  const { t } = useTranslation()
  if (!isPro) {
    return (
      <div className="flex justify-center">
        <span className="relative inline-flex">
          <Button
            variant="soft"
            size="md"
            onClick={onLocked}
            icon={<SpeakerIcon size={24} />}
            aria-label={`${ui.readAloud} (${t('tier.proFeature')})`}
            data-testid="tale-read-locked"
          >
            {ui.readAloud}
          </Button>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-2 -right-2 inline-flex items-center gap-0.5 rounded-full bg-coin px-1.5 py-0.5 font-display text-xs font-bold text-ink shadow-[0_2px_0_var(--color-coin-shadow)]"
          >
            <CrownIcon size={12} />
            {t('tier.proFeature')}
          </span>
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-wrap justify-center gap-3">
      {reader.status === 'idle' && (
        <Button variant="primary" size="md" onClick={reader.start} icon={<SpeakerIcon size={24} />}>
          {ui.readAloud}
        </Button>
      )}
      {reader.status === 'reading' && (
        <Button
          variant="coin"
          size="md"
          onClick={reader.pause}
          icon={<span aria-hidden="true">⏸</span>}
        >
          {ui.pause}
        </Button>
      )}
      {reader.status === 'paused' && (
        <Button
          variant="primary"
          size="md"
          onClick={reader.resume}
          icon={<span aria-hidden="true">▶</span>}
        >
          {ui.resume}
        </Button>
      )}
      {reader.status !== 'idle' && (
        <Button
          variant="soft"
          size="md"
          onClick={reader.replay}
          icon={<span aria-hidden="true">↺</span>}
        >
          {ui.replay}
        </Button>
      )}
    </div>
  )
}

type Phase = 'story' | 'check'

export function TaleView({ tale, language }: { tale: TaleSpec; language: Language }) {
  const { t } = useTranslation()
  const ui = TALES_UI[language]
  const text = taleText(language, tale.id)
  const { react, reset } = useMascot()
  const voice = useLearnVoice()
  const childKey = useChildKey()
  const markStage = useLearnStore((state) => state.markStage)
  const [phase, setPhase] = useState<Phase>('story')
  const [sceneIndex, setSceneIndex] = useState(0)
  const [solved, setSolved] = useState<ReadonlySet<number>>(() => new Set())
  const [round, setRound] = useState(0)
  const [checkStep, setCheckStep] = useState({ current: 0, total: checkLength(tale) })

  const scene = tale.scenes[sceneIndex]!
  const sceneText = text.scenes[sceneIndex]!
  const lines = sceneSpeech(sceneText)
  const sceneKey = `${tale.id}-${sceneIndex}-${round}`
  const noRecording = ui.noRecording
  const mutedNote = t('learn.voiceMuted')
  const errorNote = t('learn.voiceError')
  const onProblem = useCallback(
    (outcome: SpeakOutcome | 'off') => {
      const note = outcome === 'muted' ? mutedNote : outcome === 'missing' ? noRecording : errorNote
      react('instruct', { text: note, emoji: outcome === 'muted' ? '🔇' : '🎙️' }, { speak: false })
    },
    [errorNote, mutedNote, noRecording, react],
  )
  const reader = useReader(lines, sceneKey, onProblem)
  const last = sceneIndex === tale.scenes.length - 1
  const taskPending = Boolean(scene.task) && !solved.has(sceneIndex)

  // each scene starts with an empty bubble: the story card below is the text to read
  // (repeating its first line in the bubble only took space); notes such as
  // "PRO only" or "no recording" still appear in the bubble when they happen
  useEffect(() => {
    if (phase !== 'story') return
    reset()
  }, [phase, reset, sceneKey])

  const go = (next: number) => setSceneIndex(Math.max(0, Math.min(tale.scenes.length - 1, next)))
  const toCheck = () => {
    markStage(childKey, 'tales', language, tale.id)
    setPhase('check')
  }
  const again = () => {
    setRound((r) => r + 1)
    setSolved(new Set())
    setSceneIndex(0)
    setPhase('story')
  }
  const onStep = useCallback(
    (current: number, total: number) => setCheckStep({ current, total }),
    [],
  )

  return (
    <LearnShell
      title={text.title}
      step={
        phase === 'story'
          ? { current: sceneIndex, total: tale.scenes.length }
          : { current: checkStep.current, total: checkStep.total }
      }
      // the story has its own reader (read / pause / continue); the check uses the shared speaker
      voice={phase === 'check'}
    >
      {phase === 'check' ? (
        <TaleCheck
          key={round}
          tale={tale}
          language={language}
          ui={ui}
          onStep={onStep}
          onAgain={again}
        />
      ) : (
        <div className="grid gap-4 sm:gap-6 landscape:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] landscape:items-start">
          <SceneStage scene={scene} sceneKey={sceneKey} label={ui.sceneLabel(text.title)} />
          <div className="flex flex-col gap-4">
            <p className="text-center text-sm font-bold text-ink-soft" aria-live="polite">
              {ui.scene(sceneIndex + 1, tale.scenes.length)}
            </p>
            <article
              className="flex flex-col gap-2 rounded-[28px] bg-surface p-4 text-lg leading-snug shadow-[0_6px_0_var(--color-line)] sm:p-5 sm:text-xl"
              data-testid="tale-text"
            >
              {sceneText.lines.map((line, index) => (
                <p
                  key={index}
                  className={clsx(
                    'rounded-xl px-2 py-1 transition-colors',
                    reader.line === index && 'bg-coin-soft',
                  )}
                >
                  {line}
                </p>
              ))}
            </article>
            <ReadControls
              reader={reader}
              ui={ui}
              isPro={voice.isPro}
              onLocked={() => react('locked', { text: ui.proOnly, emoji: '👑' }, { speak: false })}
            />
            {scene.task && sceneText.task && (
              <SceneTask
                key={sceneKey}
                task={scene.task}
                prompt={sceneText.task.prompt}
                labels={sceneText.task.options}
                done={solved.has(sceneIndex)}
                onDone={() => setSolved((current) => new Set(current).add(sceneIndex))}
                ui={ui}
              />
            )}
            <nav className="flex items-center justify-between gap-3" aria-label={text.title}>
              <Button
                variant="soft"
                size="md"
                onClick={() => go(sceneIndex - 1)}
                disabled={sceneIndex === 0}
                aria-label={ui.prev}
                icon={<ChevronLeftIcon size={26} />}
              />
              {taskPending && (
                <p className="text-center text-sm font-semibold text-ink-soft">{ui.taskFirst}</p>
              )}
              {last ? (
                <Button
                  variant="coin"
                  size="md"
                  onClick={toCheck}
                  disabled={taskPending}
                  data-testid="tale-to-check"
                >
                  {ui.toQuestions}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => go(sceneIndex + 1)}
                  disabled={taskPending}
                  aria-label={ui.next}
                  icon={<ChevronRightIcon size={26} />}
                  data-testid="tale-next"
                />
              )}
            </nav>
            <Link
              to="/learn/tales"
              className="self-center text-base font-bold text-primary-ink underline"
            >
              {ui.backToList}
            </Link>
          </div>
        </div>
      )}
    </LearnShell>
  )
}
