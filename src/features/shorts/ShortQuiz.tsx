import clsx from 'clsx'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { newId } from '@/lib/id'
import { tDynamic } from '@/lib/tDynamic'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useChildKey } from '@/store/progressStore'
import type { Short } from './catalog'

/**
 * The question after a lesson: two or three pictures, one is right. A wrong one only
 * shakes gently and the child tries again; the right one earns the stars and yong‘oq
 * of the Kiddo universe (once a day per lesson, like every other activity).
 */
export function ShortQuiz({ short, quiz }: { short: Short; quiz: NonNullable<Short['quiz']> }) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { sayText } = useSpeaker()
  const [tries, setTries] = useState(0)
  const [wrong, setWrong] = useState<number | null>(null)
  const [award, setAward] = useState<AwardSummary | null>(null)
  const { pics, right, strand } = quiz

  const pick = (index: number) => {
    if (award) return
    if (index !== right) {
      setWrong(index)
      setTries((n) => n + 1)
      void sayText(t('shorts.tryAgain'))
      return
    }
    setWrong(null)
    setAward(
      emitActivity({
        id: newId(),
        childKey,
        activity: `short:${short.id}`,
        strand,
        correct: 1,
        total: 1,
        independent: tries === 0 ? 1 : 0,
        oncePerDay: true,
      }),
    )
  }

  return (
    <div
      className="flex w-full flex-col items-center gap-3 rounded-3xl bg-night/80 p-4 text-center text-white"
      data-testid="short-quiz"
    >
      <p className="font-display text-xl leading-tight font-extrabold">
        {tDynamic(t, `shorts.items.${short.id}.quiz.q`)}
      </p>
      {award ? (
        <div className="text-ink" data-testid="short-quiz-won">
          <ActivityReward stars={award.stars} nuts={award.nuts} />
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {pics.map((pic, index) => (
            <button
              key={pic}
              type="button"
              onClick={() => pick(index)}
              data-testid={`short-quiz-${index}`}
              aria-label={tDynamic(t, `shorts.items.${short.id}.quiz.a${index}`)}
              className={clsx(
                'flex min-w-24 flex-col items-center gap-1 rounded-2xl bg-white px-3 py-2 text-ink shadow-[0_4px_0_rgb(0_0_0/0.25)] active:translate-y-0.5',
                wrong === index && 'bg-oops-soft',
              )}
            >
              <span aria-hidden="true" className="text-5xl">
                {pic}
              </span>
              <span className="font-display text-base font-bold">
                {tDynamic(t, `shorts.items.${short.id}.quiz.a${index}`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
