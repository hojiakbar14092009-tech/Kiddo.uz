import { useEffect } from 'react'
import { BackToGarden } from '@/features/mistakeGarden/BackToGarden'
import { HomeIcon } from '@/components/icons'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { useChallengeLevel, type ChallengeLevel } from '@/domain/learner'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { DinoFrame } from './parts'
import type { DinoFinished } from './session'
import { fill, useDinoText } from './text'

/** The end of a dig or a quiz: the score, what the universe gave, play again. */
export function DinoResult({
  title,
  back,
  level,
  finished,
  onAgain,
}: {
  title: string
  back: string
  level: ChallengeLevel
  finished: DinoFinished
  onAgain: () => void
}) {
  const text = useDinoText()
  const { say } = useLearnMascot()
  const nextLevel = useChallengeLevel('science')
  const { score, award } = finished
  const allFirst = score.firstTry === score.total
  const scoreText = fill(text.result.score, { correct: score.firstTry, total: score.total })
  // only a step up is told; a step down happens quietly
  const levelUp = nextLevel > level ? text.result.levelUp : null

  useEffect(() => {
    say('celebrate', { text: text.result.title, emoji: allFirst ? '🏆' : '🌟' })
  }, [allFirst, say, text.result.title])

  useEffect(() => {
    window.scrollTo?.({ top: 0 })
  }, [])

  return (
    <DinoFrame
      title={title}
      back={back}
      speak={[text.result.title, scoreText, levelUp ?? '']}
      hideMascotShort
    >
      <section
        aria-labelledby="dino-result-title"
        data-testid="dino-result"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:grid short:max-w-3xl short:grid-cols-[auto_1fr] short:items-center short:gap-x-4 short:gap-y-2 short:p-3"
      >
        <div className="flex flex-col items-center gap-3 short:gap-1">
          <h2
            id="dino-result-title"
            className="flex items-center gap-2 font-display text-3xl font-extrabold short:text-2xl"
          >
            <Img3D
              name={allFirst ? 'trophy' : 'glowing-star'}
              className="size-14 short:size-10"
              eager
            />
            {text.result.title}
          </h2>
          <p
            className="font-display text-2xl font-bold text-primary-ink short:text-xl"
            data-testid="dino-score"
          >
            {scoreText}
          </p>
          {levelUp && <p className="text-lg font-bold short:text-base">{levelUp}</p>}
        </div>
        <div className="flex flex-col items-center gap-3 short:gap-1">
          <ActivityReward stars={award.stars} crystals={award.crystals} />
        </div>
        <div className="flex flex-wrap justify-center gap-3 short:col-span-2">
          <BackToGarden />
          <Button variant="coin" size="md" onClick={onAgain} data-testid="dino-again">
            {text.result.again}
          </Button>
          <LinkButton to={back} variant="soft" size="md" icon={<HomeIcon size={24} />}>
            {text.result.toWorld}
          </LinkButton>
        </div>
      </section>
    </DinoFrame>
  )
}
