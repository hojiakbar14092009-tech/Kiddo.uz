import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { Screen } from '@/components/layout/Screen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { ActivityReward } from '@/components/reward/ActivityReward'
import { Button } from '@/components/ui/Button'
import { LinkButton } from '@/components/ui/LinkButton'
import { ageProfile, type PuzzleDepth } from '@/domain/adaptive'
import { emitActivity, type AwardSummary } from '@/domain/universe'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascot } from '@/features/mascot/useMascot'
import { mascotQuality } from '@/features/mascot/webgl'
import { newId } from '@/lib/id'
import { childAge, useActiveChild } from '@/store/familyStore'
import { useChildKey } from '@/store/progressStore'
import { buildMatches, hintFor, matches, type Hint } from './check'
import { SHAPES } from './geometry'
import {
  buildShadow,
  CONTROL_RANGE,
  controlValue,
  MISSIONS,
  PIECES,
  sceneShadow,
  SHADOW_ACTIVITY,
  withControl,
  type Control,
  type PieceId,
  type Puzzle,
  type Scene,
} from './puzzles'
import { SOLID_PICTURES } from './solidPictures'
import { viewOf } from './solids'
import { SideMap, WallView } from './views'

/** After this many misses Lumi offers to show the answer (then it does not count as independent). */
const SHOW_AFTER = 3

type Phase =
  | { kind: 'intro' }
  | { kind: 'puzzle'; index: number }
  | { kind: 'done'; award: AwardSummary; solved: number }

/**
 * `/shadow-lab` (Phase 34): Lumi's Shadow Lab. Five puzzles, one per mode —
 * match the shadow, identify a solid from its views, build from pieces, move
 * only the light, and a shadow detective — built for the learner's
 * PuzzleDepth. Every shadow is projected from the light and the object
 * (geometry.ts); answers are checked with a tolerance. A finished mission goes
 * through emitActivity like every activity.
 */
export function ShadowLabPage() {
  const { t } = useTranslation()
  const child = useActiveChild()
  const depth = ageProfile(child ? childAge(child) : null).puzzleDepth
  const mission = MISSIONS[depth]
  const childKey = useChildKey()
  const { react, reset } = useMascot()
  const soft = useMemo(() => mascotQuality() === 'high', [])
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' })
  const [runId, setRunId] = useState(newId)
  const [solved, setSolved] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => reset, [reset])
  useEffect(() => {
    if (phase.kind === 'intro') react('greet', { text: t('shadowLab.intro'), emoji: '🔦' })
  }, [phase.kind, react, t])
  useEffect(() => {
    if (phase.kind !== 'intro') heading.current?.focus()
  }, [phase])

  const start = () => {
    setRunId(newId())
    setSolved(0)
    setPhase({ kind: 'puzzle', index: 0 })
  }

  const finish = (index: number, independent: boolean) => {
    const count = solved + (independent ? 1 : 0)
    setSolved(count)
    if (index + 1 < mission.length) {
      setPhase({ kind: 'puzzle', index: index + 1 })
      return
    }
    const award = emitActivity({
      id: runId,
      childKey,
      activity: SHADOW_ACTIVITY,
      strand: 'science',
      // the same mission replayed counts for the strand once a day (stars only for a better result)
      oncePerDay: true,
      correct: mission.length,
      total: mission.length,
      independent: count,
    })
    react('celebrate', { text: t('shadowLab.doneTitle'), emoji: '✨' })
    setPhase({ kind: 'done', award, solved: count })
  }

  return (
    <Screen
      header={<TitleTopBar title={t('shadowLab.title')} back="/learn/space" />}
      className="items-center gap-4 px-4 py-4 sm:py-6 short:gap-3 short:py-3"
    >
      <div
        className="flex w-full max-w-4xl flex-col gap-4"
        data-testid="shadow-lab"
        data-depth={depth}
      >
        <Mascot robotClassName="w-20 sm:w-28" className="self-start" />

        {phase.kind === 'intro' && (
          <section className="flex flex-col items-center gap-4 text-center">
            <h2 className="font-display text-2xl font-extrabold">{t('shadowLab.title')}</h2>
            <p className="max-w-prose text-lg">{t('shadowLab.learn')}</p>
            <Button onClick={start} data-testid="shadow-start">
              {t('shadowLab.start')}
            </Button>
          </section>
        )}

        {phase.kind === 'puzzle' && (
          <PuzzleRun
            key={phase.index}
            puzzle={mission[phase.index]!}
            index={phase.index}
            total={mission.length}
            depth={depth}
            soft={soft}
            heading={heading}
            onSolved={(independent) => finish(phase.index, independent)}
            onMiss={(text) => react('instruct', { text })}
            onRight={() => react('correct', { text: t('shadowLab.right') })}
          />
        )}

        {phase.kind === 'done' && (
          <section className="flex flex-col items-center gap-3 text-center">
            <h2
              ref={heading}
              tabIndex={-1}
              className="font-display text-2xl font-extrabold outline-none"
              data-testid="shadow-done"
            >
              {t('shadowLab.doneTitle')}
            </h2>
            <p className="text-lg tabular-nums">
              {t('shadowLab.doneText', { n: phase.solved, total: mission.length })}
            </p>
            <ActivityReward stars={phase.award.stars} crystals={phase.award.crystals} />
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="soft" onClick={start}>
                {t('shadowLab.again')}
              </Button>
              <LinkButton to="/learn/space" data-sound="back">
                {t('shadowLab.back')}
              </LinkButton>
            </div>
          </section>
        )}
      </div>
    </Screen>
  )
}

function PuzzleRun({
  puzzle,
  index,
  total,
  depth,
  soft,
  heading,
  onSolved,
  onMiss,
  onRight,
}: {
  puzzle: Puzzle
  index: number
  total: number
  depth: PuzzleDepth
  soft: boolean
  heading: RefObject<HTMLHeadingElement | null>
  onSolved: (independent: boolean) => void
  onMiss: (text: string) => void
  onRight: () => void
}) {
  const { t } = useTranslation()
  const [misses, setMisses] = useState(0)
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState(false)
  const [scene, setScene] = useState<Scene | null>(
    puzzle.mode === 'match' || puzzle.mode === 'light' ? puzzle.start : null,
  )
  const [pieces, setPieces] = useState<(PieceId | null)[]>(
    puzzle.mode === 'build' ? puzzle.target.map(() => null) : [],
  )
  const [wrong, setWrong] = useState<number[]>([])
  const nextButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (done) nextButton.current?.focus()
  }, [done])

  const success = () => {
    setDone(true)
    onRight()
  }
  const miss = (hint: Hint | null) => {
    setMisses((count) => count + 1)
    onMiss(
      hint
        ? t(`shadowLab.hints.${hint.control}.${hint.up ? 'up' : 'down'}`)
        : t('shadowLab.tryAgain'),
    )
  }

  const title = t(`shadowLab.modes.${puzzle.mode}.title`)
  const task = t(`shadowLab.modes.${puzzle.mode}.task`)

  return (
    <section
      aria-labelledby="shadow-title"
      className="flex flex-col gap-4"
      data-testid="shadow-puzzle"
      data-mode={puzzle.mode}
    >
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm font-semibold text-ink-soft tabular-nums">
          {t('shadowLab.progress', { n: index + 1, total })}
        </p>
        <h2
          id="shadow-title"
          ref={heading}
          tabIndex={-1}
          className="font-display text-2xl font-extrabold outline-none"
        >
          {title}
        </h2>
        <p className="text-lg">{task}</p>
      </div>

      {(puzzle.mode === 'match' || puzzle.mode === 'light') && scene && (
        <>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <WallView
              shadows={[sceneShadow(puzzle.shape, scene)]}
              target={[sceneShadow(puzzle.shape, puzzle.target)]}
              soft={soft}
              label={t('shadowLab.wallLabel')}
              className="w-full rounded-card shadow-press"
              testId="shadow-wall"
            />
            <SideMap
              scene={scene}
              shape={SHAPES[puzzle.shape]}
              label={t('shadowLab.mapLabel')}
              className="w-full rounded-card"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {puzzle.controls.map((control) => (
              <ControlRow
                key={control}
                control={control}
                value={controlValue(scene, control)}
                disabled={done}
                onChange={(value) => setScene((current) => withControl(current!, control, value))}
              />
            ))}
          </div>
          {!done && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() =>
                  matches(puzzle, scene, depth) ? success() : miss(hintFor(puzzle, scene))
                }
                data-testid="shadow-check"
              >
                {t('shadowLab.check')}
              </Button>
              {misses >= SHOW_AFTER && (
                <Button
                  variant="soft"
                  onClick={() => {
                    setShown(true)
                    setScene(puzzle.target)
                    setDone(true)
                  }}
                >
                  {t('shadowLab.show')}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {puzzle.mode === 'build' && (
        <>
          <WallView
            shadows={buildShadow(puzzle.slots, pieces)}
            target={buildShadow(puzzle.slots, puzzle.target)}
            marks={buildShadow(
              puzzle.slots,
              puzzle.slots.map(() => 'square'),
            )}
            soft={soft}
            label={t('shadowLab.wallLabel')}
            className="mx-auto w-full max-w-md rounded-card shadow-press"
            testId="shadow-wall"
          />
          {/* the places laid out as they sit on the wall (top/bottom, left/right) */}
          <ol
            className="mx-auto grid w-full max-w-sm grid-cols-3 gap-2"
            aria-label={t('shadowLab.slots')}
          >
            {puzzle.slots.map(([x, y], slot) => {
              const piece = pieces[slot] ?? null
              const nextPiece = (current: PieceId | null): PieceId | null => {
                const order: (PieceId | null)[] = [null, ...PIECES]
                return order[(order.indexOf(current) + 1) % order.length]!
              }
              const column = x < 0 ? 1 : x > 0 ? 3 : 2
              const row = y > 0 ? 1 : 2
              const where = t(
                `shadowLab.where.${row === 1 ? 'top' : 'bottom'}${column === 1 ? 'Left' : column === 3 ? 'Right' : ''}`,
              )
              return (
                <li key={slot} style={{ gridColumn: column, gridRow: row }}>
                  <button
                    type="button"
                    disabled={done}
                    data-slot={slot}
                    onClick={() =>
                      setPieces((list) => list.map((p, i) => (i === slot ? nextPiece(p) : p)))
                    }
                    aria-label={t('shadowLab.slot', {
                      where,
                      piece: piece ? t(`shadowLab.pieces.${piece}`) : t('shadowLab.pieces.none'),
                    })}
                    className="flex min-h-14 w-full min-w-0 flex-col items-center justify-center rounded-card bg-surface px-1 py-2 text-sm font-bold [overflow-wrap:anywhere] shadow-press sm:text-base"
                  >
                    <span className="text-xs text-ink-soft">{where}</span>
                    <span>{piece ? t(`shadowLab.pieces.${piece}`) : '—'}</span>
                  </button>
                </li>
              )
            })}
          </ol>
          {!done && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => (buildMatches(puzzle, pieces) ? success() : miss(null))}
                data-testid="shadow-check"
              >
                {t('shadowLab.check')}
              </Button>
              {misses >= SHOW_AFTER && (
                <Button
                  variant="soft"
                  onClick={() => {
                    setShown(true)
                    setPieces(puzzle.target)
                    setDone(true)
                  }}
                >
                  {t('shadowLab.show')}
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {puzzle.mode === 'views' && (
        <>
          <div className="flex flex-wrap justify-center gap-3">
            {puzzle.views.map((view) => (
              <figure key={view} className="flex w-36 flex-col items-center gap-1 sm:w-44">
                <WallView
                  // a view fills most of its little wall
                  shadows={[
                    viewOf(puzzle.solid, view).map(([x, y]) => [x * 1.8, y * 1.8] as const),
                  ]}
                  soft={soft}
                  label={t(`shadowLab.views.${view}`)}
                  className="w-full rounded-card shadow-press"
                />
                <figcaption className="font-semibold">{t(`shadowLab.views.${view}`)}</figcaption>
              </figure>
            ))}
          </div>
          <Choices
            options={puzzle.options.map((solid) => ({
              key: solid,
              label: t(`shadowLab.solids.${solid}`),
              picture: SOLID_PICTURES[solid],
            }))}
            answer={puzzle.options.indexOf(puzzle.solid)}
            done={done}
            wrong={wrong}
            onRight={success}
            onWrong={(choice) => {
              setWrong((list) => [...list, choice])
              miss(null)
            }}
          />
        </>
      )}

      {puzzle.mode === 'detective' && (
        <>
          <WallView
            shadows={[sceneShadow(puzzle.shape, puzzle.scenes[puzzle.answer]!)]}
            soft={soft}
            label={t('shadowLab.wallLabel')}
            className="mx-auto w-full max-w-sm rounded-card shadow-press"
            testId="shadow-wall"
          />
          <Choices
            options={puzzle.scenes.map((scene, i) => ({
              key: String(i),
              label: t('shadowLab.sceneLabel', { n: i + 1 }),
              picture: (
                // no rays and no shadow on these maps: the learner works out which set-up fits
                <SideMap
                  scene={scene}
                  shape={SHAPES[puzzle.shape]}
                  label={t('shadowLab.mapLabel')}
                  className="w-full"
                  rays={false}
                />
              ),
              wide: true,
            }))}
            answer={puzzle.answer}
            done={done}
            wrong={wrong}
            onRight={success}
            onWrong={(choice) => {
              setWrong((list) => [...list, choice])
              miss(null)
            }}
          />
        </>
      )}

      {done && (
        <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
          <p className="font-display text-xl font-extrabold" data-testid="shadow-verdict">
            {t(shown ? 'shadowLab.shown' : 'shadowLab.right')}
          </p>
          <p className="max-w-prose text-base">{t(`shadowLab.modes.${puzzle.mode}.why`)}</p>
          <Button
            ref={nextButton}
            onClick={() => onSolved(!shown && misses === 0)}
            data-testid="shadow-next"
          >
            {t('shadowLab.next')}
          </Button>
        </div>
      )}
    </section>
  )
}

function ControlRow({
  control,
  value,
  disabled,
  onChange,
}: {
  control: Control
  value: number
  disabled: boolean
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()
  const { min, max, step } = CONTROL_RANGE[control]
  const label = t(`shadowLab.controls.${control}`)
  return (
    <div
      className="flex items-center gap-2 rounded-card bg-surface p-2 shadow-press"
      data-control={control}
    >
      <Button
        variant="soft"
        size="md"
        disabled={disabled || value <= min}
        onClick={() => onChange(value - step)}
        aria-label={t('shadowLab.less', { name: label })}
        className="min-h-11 min-w-11 px-0"
      >
        −
      </Button>
      <label className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold">{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-8 w-full accent-[var(--color-primary)]"
        />
      </label>
      <Button
        variant="soft"
        size="md"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + step)}
        aria-label={t('shadowLab.more', { name: label })}
        className="min-h-11 min-w-11 px-0"
      >
        +
      </Button>
    </div>
  )
}

function Choices({
  options,
  answer,
  done,
  wrong,
  onRight,
  onWrong,
}: {
  options: { key: string; label: string; picture: ReactNode; wide?: boolean }[]
  answer: number
  done: boolean
  wrong: number[]
  onRight: () => void
  onWrong: (choice: number) => void
}) {
  return (
    <div
      className={clsx(
        'grid gap-3',
        options.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4',
      )}
      data-answer={import.meta.env.MODE === 'production' ? undefined : answer}
      data-testid="shadow-choices"
    >
      {options.map((option, index) => (
        <button
          key={option.key}
          type="button"
          disabled={done || wrong.includes(index)}
          data-choice={index}
          onClick={() => (index === answer ? onRight() : onWrong(index))}
          className={clsx(
            'flex flex-col items-center gap-1 rounded-card bg-surface p-2 font-bold shadow-press disabled:opacity-50',
            done && index === answer && 'ring-4 ring-primary disabled:opacity-100',
          )}
        >
          {option.wide ? (
            <span className="w-full">{option.picture}</span>
          ) : (
            <svg viewBox="0 0 100 100" className="size-20" aria-hidden="true">
              {option.picture}
            </svg>
          )}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}
