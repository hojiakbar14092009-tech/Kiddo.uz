import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { getAlphabet, type LetterEntry } from '@/content/alphabet'
import { useMascot } from '@/features/mascot/useMascot'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useProgress, type MistakeDetail } from '@/store/progressStore'
import { useLanguage } from '@/store/settingsStore'
import { pickTargets } from './generateRounds'
import { TaskShell } from './TaskShell'
import { TraceCanvas, type TraceCanvasHandle } from './TraceCanvas'
import { AUTO_PASS, passes, type TraceScore } from './traceScoring'
import { useFinishTask } from './useFinishTask'

const LETTERS_PER_TASK = 3
const ADVANCE_DELAY_MS = 1700
/** The apostrophe-like tutuq belgisi is too small to trace with a finger. */
const TRACEABLE = (letter: LetterEntry) => letter.id !== 'tutuq'

/** “Write the letter”: trace three letters with a finger. */
export function TraceGame() {
  const { t } = useTranslation()
  const language = useLanguage()
  const progress = useProgress()
  const { react, reset } = useMascot()
  const { sayText, speaking } = useSpeaker()
  const finish = useFinishTask('trace')
  const canvas = useRef<TraceCanvasHandle>(null)

  const [letters] = useState(() =>
    pickTargets(
      getAlphabet(language).letters.filter(TRACEABLE),
      { learned: progress.learned[language] ?? [], struggles: progress.struggles[language] ?? {} },
      LETTERS_PER_TASK,
      Math.random,
    ),
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
    const timer = setTimeout(() => {
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
    return () => clearTimeout(timer)
  }, [finish, index, letters, mistakes, solved])

  if (!letter) return null

  const succeed = () => {
    setSolved(true)
    react('correct')
  }

  const onStrokeEnd = (score: TraceScore) => {
    if (!solved && passes(score, AUTO_PASS)) succeed()
  }

  const check = () => {
    if (solved || !canvas.current) return
    if (passes(canvas.current.score())) {
      succeed()
      return
    }
    setMistakes((current) => [...current, { targetId: letter.id, chosenId: letter.id }])
    react('wrong', { text: t('task.traceRetry'), emoji: '✏️' })
    canvas.current.clear()
  }

  return (
    <TaskShell
      title={t('task.traceTitle')}
      round={index}
      rounds={letters.length}
      speaking={speaking}
      onRepeat={() => void sayText(prompt(true))}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <TraceCanvas
          key={letter.id}
          ref={canvas}
          glyph={letter.upper}
          label={t('task.traceCanvas', { letter: letter.upper })}
          onStrokeEnd={onStrokeEnd}
        />
        <div className="flex gap-4">
          <Button
            variant="soft"
            size="md"
            disabled={solved}
            onClick={() => canvas.current?.clear()}
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
