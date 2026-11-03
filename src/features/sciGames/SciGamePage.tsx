import clsx from 'clsx'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { newId } from '@/lib/id'
import { tDynamic } from '@/lib/tDynamic'
import { useSpeaker } from '@/services/audio/useSpeaker'
import { useChildKey } from '@/store/progressStore'
import { useLessonSeen } from '@/features/learn/learnStore'
import { LessonDeck } from '@/features/learn/LessonDeck'
import { sciGame, type SciGame } from './games'
import { SCI_RULES, sciLessonCards } from './lessons'
import { sciRun } from './rules'
import type { Finish } from './play/hooks'
import { MagicMagnet } from './play/Magnet'
import { FloatOrSink } from './play/Float'
import { RobotProgrammer } from './play/Robot'
import { MagicScale } from './play/Scale'
import { LittleShop } from './play/Shop'
import { WordTrain } from './play/Train'
import { ShapeBuilder } from './play/Shapes'
import { SortGame } from './play/Sort'
import { HABITATS, PLATE } from './play/sortRules'
import { WaterTrip } from './play/Water'

type Phase =
  { kind: 'intro' } | { kind: 'play'; run: string } | { kind: 'done'; award: AwardSummary }

const TONE: Record<SciGame['tone'], string> = {
  sky: 'from-sky-soft to-surface',
  coral: 'from-oops-soft to-surface',
  mint: 'from-primary-soft to-surface',
  coin: 'from-coin-soft to-surface',
  lilac: 'from-lilac-soft to-surface',
}

/**
 * The science games (Phase 59): a droplet's trip (the water cycle), the magic
 * magnet (only iron sticks) and float-or-sink (light and heavy). Each one is a
 * couple of minutes of taps, said aloud on PRO, with a reward once a day.
 */
export function SciGamePage() {
  const { id } = useParams()
  const game = sciGame(id)
  if (!game) return <Navigate to="/games" replace />
  return <SciGameScreen key={game.id} game={game} />
}

function SciGameScreen({ game }: { game: SciGame }) {
  const { t } = useTranslation()
  const childKey = useChildKey()
  const { sayText } = useSpeaker()
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const title = tDynamic(t, `sciGames.${game.id}.title`)
  const intro = tDynamic(t, `sciGames.${game.id}.intro`)
  // the rules come first (and again on request); only then the game
  const rules = SCI_RULES[game.id]
  const seen = useLessonSeen(rules.lessonId)
  const [review, setReview] = useState(false)
  const showRules = phase.kind === 'intro' && (!seen || review)

  useEffect(() => {
    if (phase.kind === 'intro' && !showRules) void sayText(intro)
  }, [intro, phase.kind, sayText, showRules])

  const start = () => setPhase({ kind: 'play', run: newId() })
  const openRules = () => {
    setReview(true)
    setPhase({ kind: 'intro' })
  }
  const finish =
    (run: string): Finish =>
    (total, firstTry) => {
      void sayText(t('sciGames.done'))
      setPhase({ kind: 'done', award: emitActivity(sciRun(game, run, childKey, total, firstTry)) })
    }

  return (
    <Screen
      header={<TitleTopBar title={title} back="/games" />}
      className={clsx(
        'items-center gap-5 bg-gradient-to-b px-4 py-6 text-center short:gap-3 short:py-3',
        TONE[game.tone],
      )}
    >
      {showRules && (
        <LessonDeck
          lessonId={rules.lessonId}
          cards={sciLessonCards(t, game.id)}
          check={rules.check}
          onDone={() => {
            setReview(false)
            start()
          }}
        />
      )}

      {phase.kind === 'intro' && !showRules && (
        <>
          <motion.span
            aria-hidden="true"
            initial={{ scale: 0.6, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 11 }}
            className="flex size-40 items-center justify-center rounded-full bg-surface text-8xl shadow-[0_8px_0_var(--color-line)] short:size-28 short:text-6xl"
          >
            {game.emoji}
          </motion.span>
          <p className="max-w-md font-display text-2xl font-extrabold text-balance">{intro}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={start} data-testid="sci-start">
              {t('sciGames.play')}
            </Button>
            <Button variant="soft" size="md" onClick={openRules} data-testid="lesson-review">
              {t('sciGames.rules')}
            </Button>
          </div>
        </>
      )}

      {/* the rules again, any time during a game (a phone's top bar has no room for it) */}
      {phase.kind === 'play' && (
        <div className="-mb-2 flex w-full max-w-xl justify-end short:-mb-1">
          <button
            type="button"
            onClick={openRules}
            aria-label={t('sciGames.rules')}
            data-testid="sci-rules"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface font-display text-2xl font-extrabold text-primary-ink shadow-[0_3px_0_var(--color-line)]"
          >
            ?
          </button>
        </div>
      )}
      {phase.kind === 'play' && game.id === 'water' && <WaterTrip onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'magnet' && <MagicMagnet onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'float' && <FloatOrSink onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'scale' && <MagicScale onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'robot' && (
        <RobotProgrammer onDone={finish(phase.run)} />
      )}
      {phase.kind === 'play' && game.id === 'train' && <WordTrain onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'shop' && <LittleShop onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'shapes' && <ShapeBuilder onDone={finish(phase.run)} />}
      {phase.kind === 'play' && game.id === 'habitats' && (
        <SortGame set={HABITATS} game="habitats" onDone={finish(phase.run)} />
      )}
      {phase.kind === 'play' && game.id === 'plate' && (
        <SortGame set={PLATE} game="plate" onDone={finish(phase.run)} />
      )}

      {phase.kind === 'done' && (
        <>
          <p className="font-display text-2xl font-extrabold" data-testid="sci-finished">
            {t('sciGames.done')}
          </p>
          <ActivityReward stars={phase.award.stars} nuts={phase.award.nuts} />
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="soft" onClick={start}>
              {t('sciGames.again')}
            </Button>
            <LinkButton to="/games" data-sound="back">
              {t('sciGames.back')}
            </LinkButton>
          </div>
        </>
      )}
    </Screen>
  )
}
