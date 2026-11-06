import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { whenVoiceDone } from '@/services/audio/afterVoice'
import type { MistakeDetail } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { pickTargets } from './generateRounds'
import { TaskShell } from './TaskShell'
import { letterStrokes } from '@/components/trace/letterStrokes'
import { PathTraceBoard } from '@/components/trace/PathTraceBoard'
import { letterTracePasses, type LetterPassLevel } from '@/components/trace/letterScoring'
import type { PathScore } from '@/components/trace/pathScoring'
import { TraceCanvas, type TraceCanvasHandle } from './TraceCanvas'
import { AUTO_PASS, passes, type TraceScore } from './traceScoring'
import { useFinishTask } from './useFinishTask'
import { playableLetters } from './playableLetters'
import { useLearner } from './useHomework'

const LETTERS_PER_TASK = 3
const ADVANCE_DELAY_MS = 1000

/** “Write the letter”: trace three letters with a finger. */
export function TraceGame() {
  const { t } = useTranslation()
  const language = useLanguage()
  const learner = useLearner('trace')
  const { react, reset } = useMascot()
  const { sayText, speaking } = useSpeaker()
  const finish = useFinishTask('trace')
  const canvas = useRef<TraceCanvasHandle>(null)
  const board = useRef<{ clear: () => void; score: () => PathScore; isEmpty: () => boolean }>(null)

  const [letters] = useState(() =>
    pickTargets(playableLetters(language, 'trace'), learner, LETTERS_PER_TASK, Math.random),
  )
  const [index, setIndex] = useState(0)
  const [solved, setSolved] = useState(false)
  const [mistakes, setMistakes] = useState<MistakeDetail[]>([])
  const letter = letters[index]

  const prompt = useCallback(
    (spoken: boolean) =>
      letter ? t('task.tracePrompt', { letter: spoken ? letter.spoken : letter.upper }) : '',
    [letter, t],
  )

  useEffect(() => {
    if (!letter) return
    react('instruct', { text: prompt(false), emoji: '✏️' }, { speak: false })
    void sayText(prompt(true))
  }, [letter, prompt, react, sayText])
  useEffect(() => reset, [reset])

  useEffect(() => {
    if (!solved) return undefined
    // the praise is said first; the next round comes once the voice is quiet
    return whenVoiceDone(() => {
      if (index + 1 < letters.length) {
        setIndex(index + 1)
        setSolved(false)
      } else {
        finish(
          letters.map((item) => item.id),
          mistakes,
        )
      }
    }, ADVANCE_DELAY_MS)
  }, [finish, index, letters, mistakes, solved])

  if (!letter) return null

  const succeed = () => {
    setSolved(true)
    react('correct')
  }

  // Phase 42b: a letter with stroke data is written along its strokes and checked
  // stroke by stroke (every stroke covered, the line on the letter); others keep
  // the drawing over the font's shape
  const strokes = letterStrokes(letter.upper)
  const passed = (level: LetterPassLevel) =>
    strokes
      ? board.current !== null && letterTracePasses(board.current.score(), strokes.length, level)
      : canvas.current !== null &&
        passes(canvas.current.score(), level === 'auto' ? AUTO_PASS : undefined)

  const onStrokeEnd = (score: TraceScore) => {
    if (!solved && passes(score, AUTO_PASS)) succeed()
  }
  const onPathStrokeEnd = (score: PathScore) => {
    if (!solved && strokes && letterTracePasses(score, strokes.length, 'auto')) succeed()
  }

  const check = () => {
    const surface = strokes ? board.current : canvas.current
    if (solved || !surface) return
    // “Done” before drawing anything is not a mistake – just a reminder.
    if (surface.isEmpty()) {
      react('instruct', { text: prompt(false), emoji: '✏️' }, { speak: false })
      return
    }
    if (passed('done')) {
      succeed()
      return
    }
    setMistakes((current) => [...current, { targetId: letter.id, chosenId: letter.id }])
    react('wrong', { text: t('task.traceRetry'), emoji: '✏️' })
    surface.clear()
  }

  return (
    <TaskShell
      title={t('task.traceTitle')}
      round={index}
      rounds={letters.length}
      speaking={speaking}
      onRepeat={() => void sayText(prompt(true))}
      hint={{ kind: 'write', letter }}
      struggling={mistakes.some((mistake) => mistake.targetId === letter.id)}
    >
      <div
        data-tour="answer"
        className="flex flex-1 flex-col items-center justify-center gap-5 short:flex-row"
      >
        {strokes ? (
          <div className="w-[min(22rem,80vw,calc(100dvh-21.5rem))] min-w-56 short:w-[calc(100dvh-11rem)]">
            <PathTraceBoard
              key={letter.id}
              ref={board}
              strokes={strokes}
              label={t('task.traceCanvas', { letter: letter.upper })}
              onStrokeEnd={onPathStrokeEnd}
              done={solved}
            />
          </div>
        ) : (
          <TraceCanvas
            key={letter.id}
            ref={canvas}
            glyph={letter.upper}
            label={t('task.traceCanvas', { letter: letter.upper })}
            onStrokeEnd={onStrokeEnd}
          />
        )}
        <div className="flex gap-4 short:flex-col">
          <Button
            variant="soft"
            size="md"
            disabled={solved}
            onClick={() => (strokes ? board.current?.clear() : canvas.current?.clear())}
          >
            {t('task.traceClear')}
          </Button>
          <Button size="md" icon={<CheckIcon size={24} />} disabled={solved} onClick={check}>
            {t('task.traceCheck')}
          </Button>
        </div>
      </div>
    </TaskShell>
  )
}
