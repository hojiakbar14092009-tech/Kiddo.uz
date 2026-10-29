import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import { LessonDeck, type LessonCard } from '@/features/learn/LessonDeck'
import { DINO_IDS, DINOS } from './content'
import { DinoFrame, DinoPicture } from './parts'
import { useDinoText } from './text'

/*
 * Learn Before Play for the Dinosaur world (Phase 21): the six animals —
 * what each ate, what it is known for, the bone a dig finds — and who was
 * longest. Both the quiz and the dig ask only this.
 */
const SIZES = [
  'h-28 short:h-20',
  'h-20 short:h-16',
  'h-16 short:h-12',
  'h-16 short:h-12',
  'h-12 short:h-10',
]

export function DinoLesson({
  title,
  back,
  onDone,
}: {
  title: string
  back: string
  onDone: () => void
}) {
  const text = useDinoText()
  const { t } = useTranslation()
  const cards: LessonCard[] = useMemo(() => {
    const measured = DINO_IDS.filter((id) => DINOS[id].lengthM > 0).sort(
      (a, b) => DINOS[b].lengthM - DINOS[a].lengthM,
    )
    return [
      ...DINO_IDS.map((id) => {
        const animal = text.dinos[id]
        const parts = Object.values(animal.spots as Record<string, { label: string }>)
          .map((spot) => spot.label)
          .join(', ')
        return {
          id,
          art: <DinoPicture id={id} className="h-36 w-auto sm:h-52 short:h-28" eager />,
          title: animal.name,
          lines: [
            t('learnFirst.dinoDiet', { diet: text.diet[DINOS[id].diet] }),
            ...animal.facts,
            t('learnFirst.dinoParts', { parts }),
            t('learnFirst.dinoBone', { bone: animal.bone }),
          ],
        }
      }),
      {
        id: 'length',
        art: (
          <span className="flex items-end gap-1">
            {measured.map((id, i) => (
              // the longest is drawn biggest
              <DinoPicture key={id} id={id} eager className={`w-auto ${SIZES[i] ?? 'h-12'}`} />
            ))}
          </span>
        ),
        title: t('learnFirst.dinoLengthTitle'),
        lines: [
          t('learnFirst.dinoLengthLine', {
            list: measured
              .map((id) =>
                t('learnFirst.dinoLength', { name: text.dinos[id].name, m: DINOS[id].lengthM }),
              )
              .join(', '),
          }),
        ],
      },
    ]
  }, [text, t])

  return (
    <DinoFrame title={title} back={back} speak={[title]}>
      <LessonDeck lessonId={ACTIVITY_LESSONS.dinoAnimals} cards={cards} onDone={onDone} />
    </DinoFrame>
  )
}
