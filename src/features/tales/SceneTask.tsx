import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { ChoiceGrid, type ChoiceStatus } from '@/features/learn/ChoiceGrid'
import { Img3D } from '@/features/learn/Img3D'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import type { TaskSpec } from './content'
import { mixedOrder } from './logic'
import type { TalesUi } from './ui'

interface TaskProps {
  task: TaskSpec
  prompt: string
  labels: readonly string[]
  done: boolean
  onDone: () => void
  ui: TalesUi
}

/** The little task of a scene: find / choose a picture, or put three pictures in order. */
export function SceneTask(props: TaskProps) {
  return props.task.kind === 'order' ? <OrderTask {...props} /> : <PickTask {...props} />
}

function PickTask({ task, prompt, labels, done, onDone }: TaskProps) {
  const { say } = useLearnMascot()
  const [order] = useState(() => mixedOrder(task.options.map((asset, index) => ({ asset, index }))))
  const [statuses, setStatuses] = useState<Record<string, ChoiceStatus>>(() =>
    done ? { [task.options[0]!]: 'correct' } : {},
  )

  const choose = (id: string) => {
    if (done) return
    if (id === task.options[0]) {
      setStatuses((current) => ({ ...current, [id]: 'correct' }))
      say('correct')
      onDone()
    } else {
      setStatuses((current) => ({ ...current, [id]: 'wrong' }))
      say('wrong')
    }
  }

  return (
    <section aria-label={prompt} className="flex flex-col gap-3">
      <p className="text-center font-display text-2xl font-bold">{prompt}</p>
      <ChoiceGrid
        choices={order.map(({ asset, index }) => ({
          id: asset,
          label: labels[index] ?? asset,
          content: (
            <>
              <Img3D name={asset} className="size-[70%]" />
              <span className="text-base font-bold sm:text-lg">{labels[index]}</span>
            </>
          ),
        }))}
        statuses={statuses}
        onChoose={choose}
        disabled={done}
        className="max-w-xl"
      />
    </section>
  )
}

function OrderTask({ task, prompt, labels, done, onDone, ui }: TaskProps) {
  const { say } = useLearnMascot()
  const [shown] = useState(() => mixedOrder(task.options.map((asset, index) => ({ asset, index }))))
  const [placed, setPlaced] = useState<number[]>(() => (done ? task.options.map((_, i) => i) : []))
  const [wrong, setWrong] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const tap = (id: string) => {
    const index = shown.find((item) => item.asset === id)?.index
    if (index === undefined || placed.includes(index) || done) return
    if (index === placed.length) {
      const next = [...placed, index]
      setPlaced(next)
      if (next.length === task.options.length) {
        say('correct')
        onDone()
      }
    } else {
      setWrong(id)
      say('wrong')
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setWrong(null), 900)
    }
  }

  const statuses: Record<string, ChoiceStatus> = {}
  for (const item of shown) {
    if (placed.includes(item.index)) statuses[item.asset] = 'correct'
    else if (wrong === item.asset) statuses[item.asset] = 'wrong'
  }

  return (
    <section aria-label={prompt} className="flex flex-col gap-3">
      <p className="text-center font-display text-2xl font-bold">{prompt}</p>
      <p className="text-center text-ink-soft">{ui.orderHint}</p>
      <ol className="mx-auto flex w-full max-w-xl justify-center gap-3" aria-live="polite">
        {task.options.map((_, slot) => {
          const filled = placed[slot]
          return (
            <li
              key={slot}
              aria-label={filled === undefined ? ui.orderSlot(slot + 1) : labels[filled]}
              className={clsx(
                'flex aspect-square w-1/4 max-w-24 flex-col items-center justify-center rounded-3xl border-4 border-dashed',
                filled === undefined
                  ? 'border-line-strong bg-surface/60'
                  : 'border-primary bg-primary-soft',
              )}
            >
              {filled === undefined ? (
                <span className="font-display text-3xl font-extrabold text-ink-soft">
                  {slot + 1}
                </span>
              ) : (
                <Img3D name={task.options[filled]!} className="size-[80%]" />
              )}
            </li>
          )
        })}
      </ol>
      <ChoiceGrid
        choices={shown.map(({ asset, index }) => ({
          id: asset,
          label: labels[index] ?? asset,
          content: (
            <>
              <Img3D name={asset} className="size-[64%]" />
              <span className="text-sm font-bold sm:text-base">{labels[index]}</span>
              {placed.includes(index) && (
                <span className="absolute top-2 left-3 font-display text-2xl font-extrabold text-primary-ink">
                  {placed.indexOf(index) + 1}
                </span>
              )}
            </>
          ),
        }))}
        statuses={statuses}
        onChoose={tap}
        disabled={done}
        className="max-w-xl"
      />
    </section>
  )
}
