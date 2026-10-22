import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRightIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { shuffle } from '@/features/learn/random'
import type { useLearnSession } from '@/features/learn/useLearnSession'
import { useSpeakable } from '@/features/learn/speakable'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import type { Lesson, PlanetId } from './content'
import { orderSequence } from './questions'
import { useSpaceText } from './useSpaceText'
import { SpacePicture } from './views'

type Session = ReturnType<typeof useLearnSession>

/**
 * Age 6: tap the planets one by one in their order from the Sun. Each right
 * tap moves the planet into the row; a wrong one just shakes.
 */
export function OrderGame({
  lesson,
  session,
  onWrong,
  onDone,
}: {
  lesson: Lesson
  session: Session
  onWrong: () => void
  onDone: () => void
}) {
  const { t } = useTranslation()
  const text = useSpaceText()
  const { say } = useLearnMascot()
  const sequence = useMemo(() => orderSequence(lesson), [lesson])
  const [cards] = useState(() => {
    let mixed = shuffle(sequence)
    // never already in the right order
    for (let i = 0; i < 6 && mixed.join() === sequence.join(); i += 1) mixed = shuffle(sequence)
    return mixed
  })
  const [placed, setPlaced] = useState<PlanetId[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const inner = sequence[0] === 'mercury'
  const prompt = inner ? text.say.orderInner : text.say.orderOuter
  const question = useMemo(
    () => ({ id: `order-${lesson.stage}`, skill: inner ? 'order:inner' : 'order:outer' }),
    [inner, lesson.stage],
  )
  const done = placed.length === sequence.length
  const missed = useRef(false)

  useSpeakable([prompt])

  const choose = (id: string) => {
    if (done || placed.includes(id as PlanetId)) return
    const expected = sequence[placed.length]
    if (id !== expected) {
      if (!missed.current) session.answer(question, id, false, `order-picked:${id}`)
      missed.current = true
      setWrong(id)
      onWrong()
      say('wrong', { text: text.say.wrong, emoji: '💪' })
      return
    }
    setWrong(null)
    const next = [...placed, expected]
    setPlaced(next)
    if (next.length === sequence.length) {
      session.answer(question, 'all-in-order', true)
      session.close(question)
      say('correct', { text: text.say.orderDone, emoji: '🌟' })
    }
  }

  const statuses: Partial<Record<string, ChoiceStatus>> = Object.fromEntries(
    cards.map((id) => [id, placed.includes(id) ? 'correct' : id === wrong ? 'wrong' : 'idle']),
  )

  return (
    <section aria-labelledby="order-title" className="flex flex-col items-center gap-5">
      <h2 id="order-title" className="space-prompt">
        {prompt}
      </h2>
      <ol className="space-order-row" aria-label={text.ui.orderTitle}>
        <li className="space-order-start">
          <SpacePicture id={inner ? 'sun' : 'mars'} className="size-12 sm:size-16" />
          <span>{text.objects[inner ? 'sun' : 'mars'].name}</span>
        </li>
        {sequence.map((planet, index) => {
          const here = placed[index]
          return (
            <li key={planet} className="space-order-slot" data-filled={here ? 'yes' : 'no'}>
              {here ? (
                <>
                  <SpacePicture id={here} className="size-12 sm:size-16" />
                  <span>{text.objects[here].name}</span>
                </>
              ) : (
                <span className="space-order-empty" aria-hidden="true">
                  ?
                </span>
              )}
            </li>
          )
        })}
      </ol>
      <ChoiceGrid
        choices={cards.map((id) => ({
          id,
          label: text.objects[id].name,
          content: (
            <>
              <span className="space-porthole size-[70%]">
                <SpacePicture id={id} eager className="size-[84%]" />
              </span>
              <span className="font-display text-base font-extrabold sm:text-xl">
                {text.objects[id].name}
              </span>
            </>
          ),
        }))}
        statuses={statuses}
        onChoose={choose}
        disabled={done}
        cardClassName="space-choice"
      />
      {done && (
        <Button size="lg" icon={<ChevronRightIcon size={28} />} iconPosition="end" onClick={onDone}>
          {t('learn.next')}
        </Button>
      )}
    </section>
  )
}
