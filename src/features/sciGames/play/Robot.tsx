import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { Img3D } from '@/components/ui/Img3D'
import { tDynamic } from '@/lib/tDynamic'
import { useLater, useLine, type Finish } from './hooks'
import { Line } from './kit'
import {
  MAX_PROGRAM,
  MOVES,
  ROBOT_LEVELS,
  runProgram,
  type Cell,
  type Move,
  type RunResult,
} from './robotRules'

const ARROW: Record<Move, string> = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' }
/** How long the robot takes for one step. */
const STEP_MS = 520

/**
 * The robot programmer (Phase 65): lay out arrows, press Go, and watch the robot
 * follow them to its battery. A bump into a rock or the edge keeps the program,
 * so the child fixes just the wrong arrow. A level counts as first-try when the
 * first Go solves it.
 */
export function RobotProgrammer({ onDone }: { onDone: Finish }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion() ?? false
  const { line, say } = useLine()
  const later = useLater()
  const [levelIndex, setLevelIndex] = useState(0)
  const [program, setProgram] = useState<Move[]>([])
  const [position, setPosition] = useState<Cell>(ROBOT_LEVELS[0]!.start)
  const [running, setRunning] = useState(false)
  const [bump, setBump] = useState(0)
  const [tries, setTries] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [won, setWon] = useState(false)
  const busy = useRef(false)
  const level = ROBOT_LEVELS[levelIndex]!

  useEffect(() => {
    say(t('sciGames.robot.say.start'))
  }, [levelIndex, say, t])

  const finishRun = (result: RunResult) => {
    busy.current = false
    setRunning(false)
    if (result.outcome === 'win') {
      setWon(true)
      const score = firstTry + (tries === 0 ? 1 : 0)
      setFirstTry(score)
      say(t('sciGames.robot.say.win'))
      later(() => {
        if (levelIndex + 1 < ROBOT_LEVELS.length) {
          const next = ROBOT_LEVELS[levelIndex + 1]!
          setLevelIndex(levelIndex + 1)
          setProgram([])
          setPosition(next.start)
          setTries(0)
          setWon(false)
        } else {
          say(t('sciGames.robot.say.done'))
          later(() => onDone(ROBOT_LEVELS.length, score), 1400)
        }
      }, 1800)
      return
    }
    setTries((count) => count + 1)
    if (result.outcome === 'bump') {
      setBump((count) => count + 1)
      say(t('sciGames.robot.say.bump'))
    } else say(t('sciGames.robot.say.short'))
    // back to the start, the program stays to be fixed
    later(() => setPosition(level.start), 900)
  }

  const go = () => {
    if (busy.current || program.length === 0 || won) return
    busy.current = true
    setRunning(true)
    const result = runProgram(level, program)
    const stepMs = reduceMotion ? 220 : STEP_MS
    result.path.slice(1).forEach((cell, index) => {
      later(() => setPosition(cell), (index + 1) * stepMs)
    })
    later(() => finishRun(result), result.path.length * stepMs + 150)
  }

  const add = (move: Move) => {
    if (running || won || program.length >= MAX_PROGRAM) return
    setProgram([...program, move])
  }
  const undo = () => {
    if (running || won) return
    setProgram(program.slice(0, -1))
  }

  const cells = Array.from({ length: level.size * level.size }, (_, i) => ({
    x: i % level.size,
    y: Math.floor(i / level.size),
  }))
  const isRock = (cell: Cell) => level.rocks.some((rock) => rock.x === cell.x && rock.y === cell.y)
  // a cell's place on the board (the grid's gap is 0.375rem)
  const cellSize = `((100% - ${level.size - 1} * 0.375rem) / ${level.size})`
  const at = (cell: Cell) => ({
    left: `calc(${cell.x} * (${cellSize} + 0.375rem))`,
    top: `calc(${cell.y} * (${cellSize} + 0.375rem))`,
  })
  const size = { width: `calc(${cellSize})`, height: `calc(${cellSize})` }

  return (
    <section className="flex w-full max-w-md flex-col items-center gap-3" data-testid="sci-robot">
      <p className="text-base font-semibold text-ink-soft tabular-nums">
        {t('sciGames.robot.level', { n: levelIndex + 1, total: ROBOT_LEVELS.length })}
      </p>

      {/* the board */}
      <div
        className="relative aspect-square w-full max-w-[min(100%,22rem)] rounded-[1.75rem] bg-lilac-soft p-2 shadow-[0_6px_0_var(--color-line)] short:max-w-[14rem]"
        data-testid="robot-board"
      >
        <div className="relative size-full">
          <div
            className="grid size-full gap-1.5"
            // equal rows and columns whatever is in a cell (a rock's picture never makes its row
            // taller, so the robot and the battery sit exactly on their cells)
            style={{
              gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${level.size}, minmax(0, 1fr))`,
            }}
          >
            {cells.map((cell) => (
              <div
                key={`${cell.x}-${cell.y}`}
                data-testid={`robot-cell-${cell.x}-${cell.y}`}
                className={clsx(
                  'flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-xl',
                  (cell.x + cell.y) % 2 === 0 ? 'bg-surface' : 'bg-surface/70',
                )}
              >
                {isRock(cell) && <Img3D name="rock" className="size-[78%] object-contain" eager />}
              </div>
            ))}
          </div>
          {/* the battery glows until the robot reaches it */}
          <motion.span
            data-testid="robot-battery"
            data-x={level.battery.x}
            data-y={level.battery.y}
            aria-hidden="true"
            className="pointer-events-none absolute flex items-center justify-center text-[length:min(9vw,2.5rem)]"
            style={{ ...at(level.battery), ...size }}
            animate={won || reduceMotion ? { scale: 1 } : { scale: [1, 1.12, 1] }}
            transition={{ duration: 1.2, repeat: won ? 0 : Infinity }}
          >
            🔋
          </motion.span>
          {/* the robot */}
          <motion.img
            key={bump}
            src="/mascots/posters/kidobot.webp"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute object-contain drop-shadow-[0_6px_6px_rgb(40_30_70/0.25)]"
            style={size}
            initial={false}
            animate={{
              ...at(position),
              x: bump > 0 && !reduceMotion ? [0, -6, 6, -4, 0] : 0,
              scale: won ? 1.2 : 1,
            }}
            transition={{
              left: { type: 'spring', stiffness: 180, damping: 18 },
              top: { type: 'spring', stiffness: 180, damping: 18 },
              x: { duration: 0.4 },
            }}
            data-testid="robot"
            data-x={position.x}
            data-y={position.y}
          />
        </div>
      </div>

      {/* the program */}
      <ol
        aria-label={t('sciGames.robot.program')}
        className="flex min-h-14 w-full flex-wrap items-center justify-center gap-1.5 rounded-2xl bg-surface/80 p-2"
        data-testid="robot-program"
      >
        <AnimatePresence initial={false}>
          {program.map((move, index) => (
            <motion.li
              key={`${index}-${move}`}
              initial={reduceMotion ? false : { scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              className="flex size-10 items-center justify-center rounded-xl bg-lilac-soft text-2xl"
              aria-label={tDynamic(t, `sciGames.robot.dir.${move}`)}
            >
              {ARROW[move]}
            </motion.li>
          ))}
        </AnimatePresence>
        {program.length === 0 && (
          <li className="text-base font-semibold text-ink-soft">{t('sciGames.robot.empty')}</li>
        )}
      </ol>

      {/* the arrow pad and the buttons */}
      <div className="flex w-full flex-wrap items-center justify-center gap-2">
        {MOVES.map((move) => (
          <button
            key={move}
            type="button"
            onClick={() => add(move)}
            disabled={running || won}
            aria-label={tDynamic(t, `sciGames.robot.dir.${move}`)}
            data-testid={`robot-${move}`}
            className="flex size-14 items-center justify-center rounded-2xl bg-surface text-3xl shadow-[0_5px_0_var(--color-line)] transition-transform active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            {ARROW[move]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          size="md"
          onClick={go}
          disabled={running || won || program.length === 0}
          data-testid="robot-go"
        >
          ▶ {t('sciGames.robot.run')}
        </Button>
        <Button
          size="md"
          variant="soft"
          onClick={undo}
          disabled={running || won || program.length === 0}
        >
          ⌫ {t('sciGames.robot.undo')}
        </Button>
      </div>
      <Line text={line} />
    </section>
  )
}
