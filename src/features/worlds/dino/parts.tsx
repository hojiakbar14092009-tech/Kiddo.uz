import clsx from 'clsx'
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { Img3D } from '@/components/ui/Img3D'
import { StepDots } from '@/components/ui/Progress'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { useLearnVoice } from '@/features/learn/voice'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascotStore } from '@/features/mascot/mascotStore'
import { dinoStill, type Diet, type DinoId } from './content'
import { useDinoText } from './text'

/** A still picture of one of our dinosaur models. */
export function DinoPicture({
  id,
  alt = '',
  className,
  eager = false,
}: {
  id: DinoId
  alt?: string
  className?: string
  eager?: boolean
}) {
  return (
    <img
      src={dinoStill(id)}
      alt={alt}
      draggable={false}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={clsx('pointer-events-none object-contain select-none', className)}
    />
  )
}

/**
 * An animal's name on an answer card. It wraps only between words, never
 * inside one ("Pteranodo / n"): the font shrinks with the card (a container
 * query) so the longest word of the name fits on its line, in every language.
 */
export function ChoiceName({ name }: { name: string }) {
  const longest = Math.max(...name.split(/\s+/).map((word) => word.length))
  // a bold display letter is at most ~0.64 em wide (measured, Cyrillic widest), plus a margin
  const fit = `${(100 / (Math.max(longest, 6) * 0.66)).toFixed(2)}cqi`
  return (
    <span className="@container w-full">
      <span
        style={{ '--fit': fit } as CSSProperties}
        className="block w-full text-center font-display text-[length:min(0.75rem,var(--fit))] leading-tight font-extrabold [overflow-wrap:normal] [word-break:normal] hyphens-none min-[380px]:text-[length:min(0.875rem,var(--fit))] sm:text-[length:min(1.125rem,var(--fit))] short:text-[length:min(0.875rem,var(--fit))]"
      >
        {name}
      </span>
    </span>
  )
}

/** Plants, meat or fish as a picture. */
export function DietPicture({ diet, className }: { diet: Diet; className?: string }) {
  if (diet === 'plant') return <Img3D name="herb" className={className} />
  if (diet === 'fish') return <Img3D name="fish" className={className} />
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <ellipse cx="40" cy="42" rx="30" ry="24" fill="#c8553d" transform="rotate(-35 40 42)" />
      <ellipse cx="34" cy="36" rx="16" ry="10" fill="#e07a5f" transform="rotate(-35 34 36)" />
      <rect
        x="56"
        y="55"
        width="26"
        height="11"
        rx="5"
        fill="#f3ead2"
        transform="rotate(40 62 60)"
      />
      <circle cx="80" cy="76" r="8" fill="#f3ead2" />
      <circle cx="86" cy="70" r="7" fill="#f3ead2" />
    </svg>
  )
}

const BONE = {
  fill: '#f3ead2',
  stroke: '#a8916a',
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
}
const HOLE = '#8a7350'

/** The bone hidden in the sand: a simple shape that shows whose it is. */
export function BoneShape({ dino, className }: { dino: DinoId; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      {dino === 'trex' && (
        <g>
          <path
            {...BONE}
            d="M12 50 C12 28 34 20 56 22 C76 24 90 34 91 46 L90 56 L60 58 C72 62 84 64 88 68 C82 76 60 80 40 78 C22 76 12 66 12 50 Z"
          />
          <path {...BONE} d="M60 57 L64 66 L68 57 L72 66 L76 57 L80 65 L84 57" fill="#fffaf0" />
          <circle cx="40" cy="42" r="8" fill={HOLE} />
          <ellipse cx="74" cy="38" rx="6" ry="4" fill={HOLE} />
        </g>
      )}
      {dino === 'triceratops' && (
        <g>
          <circle {...BONE} cx="32" cy="48" r="26" />
          <path {...BONE} d="M40 36 C56 30 74 40 90 66 L70 72 C56 70 44 64 40 56 Z" />
          <path {...BONE} d="M52 38 L80 10 L60 42 Z" />
          <path {...BONE} d="M44 40 L66 8 L52 42 Z" />
          <path {...BONE} d="M76 52 L84 36 L82 56 Z" />
          <circle cx="58" cy="50" r="5" fill={HOLE} />
          <circle cx="32" cy="48" r="9" fill={HOLE} />
        </g>
      )}
      {dino === 'stegosaurus' && (
        <g>
          <path
            {...BONE}
            d="M50 6 C62 22 80 40 82 54 C80 70 62 86 50 94 C38 86 20 70 18 54 C20 40 38 22 50 6 Z"
          />
          <path
            d="M50 20 V84 M50 40 L36 52 M50 40 L64 52 M50 60 L38 70 M50 60 L62 70"
            stroke={HOLE}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </g>
      )}
      {dino === 'brachiosaurus' && (
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i} transform={`translate(${14 + i * 15} ${78 - i * 15}) rotate(-45)`}>
              <rect {...BONE} x="-9" y="-6" width="18" height="12" rx="5" />
              <path {...BONE} d="M-3 -6 L0 -14 L3 -6 Z" />
            </g>
          ))}
        </g>
      )}
      {dino === 'pteranodon' && (
        <g>
          <path {...BONE} d="M40 44 L6 18 L34 56 Z" />
          <path {...BONE} d="M50 46 L96 56 L50 62 Z" />
          <circle {...BONE} cx="42" cy="54" r="13" />
          <circle cx="44" cy="52" r="5" fill={HOLE} />
        </g>
      )}
      {dino === 'ankylosaurus' && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} {...BONE} x={6 + i * 13} y="45" width="12" height="11" rx="4" />
          ))}
          <ellipse {...BONE} cx="74" cy="50" rx="20" ry="17" />
          <circle {...BONE} cx="66" cy="36" r="7" />
          <circle {...BONE} cx="66" cy="64" r="7" />
          <circle {...BONE} cx="90" cy="50" r="6" />
        </g>
      )}
    </svg>
  )
}

/** The screen of the Dinosaur world: top bar, robot with its bubble, speaker button. */
export function DinoFrame({
  title,
  back,
  speak,
  step,
  extra,
  hideMascotShort = false,
  children,
}: {
  title?: string
  back: string
  speak: readonly string[]
  step?: { current: number; total: number; label: string }
  extra?: ReactNode
  /** A phone held sideways: no robot (the screen says the same in big letters). */
  hideMascotShort?: boolean
  children: ReactNode
}) {
  const text = useDinoText()
  const voice = useLearnVoice()
  const resetMascot = useMascotStore((state) => state.reset)
  const heading = title ?? text.title
  useSpeakable(speak, SPEAK_PRIORITY.page)

  // leaving the world: the bubble clears and any voice stops
  useEffect(
    () => () => {
      resetMascot()
      voice.stop()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  return (
    <Screen
      header={<TitleTopBar title={heading} back={back} extra={extra} />}
      className={clsx('gap-3 px-4 py-3 sm:gap-5 sm:px-8 sm:py-5', SHORT_SCREEN.page)}
    >
      <div
        className={clsx('mx-auto flex w-full max-w-5xl items-center gap-3', SHORT_SCREEN.mascotRow)}
      >
        <Mascot
          robotClassName={clsx('w-14 sm:w-24', SHORT_SCREEN.robot)}
          className={clsx('min-w-0 flex-1', hideMascotShort && 'short:hidden')}
          speaking={voice.speaking}
          talkOnlyWhileSpeaking
        />
        {step && step.total > 1 && (
          <StepDots
            current={step.current}
            total={step.total}
            label={step.label}
            className="max-sm:hidden short:flex"
          />
        )}
        <div className={clsx('ml-auto flex shrink-0 items-center gap-2', SHORT_SCREEN.actions)}>
          <SpeakButton fallback={[heading]} />
        </div>
      </div>
      {step && step.total > 1 && (
        <div className="-mt-1 flex justify-center sm:hidden short:hidden">
          <StepDots current={step.current} total={step.total} label={step.label} />
        </div>
      )}
      {children}
    </Screen>
  )
}

/** The big start card of the dig and the quiz. */
export function StartCard({
  picture,
  title,
  text,
  action,
}: {
  picture: ReactNode
  title: string
  text: string
  action: ReactNode
}) {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-panel bg-surface p-5 text-center shadow-press-lg sm:p-8 short:max-w-3xl short:flex-row short:gap-5 short:p-4 short:text-left">
      <div className="flex items-end justify-center" aria-hidden="true">
        {picture}
      </div>
      <div className="flex w-full min-w-0 flex-col items-center gap-3 short:items-start short:gap-2">
        <p className="font-display text-2xl font-extrabold break-words min-[380px]:text-3xl sm:text-4xl short:text-2xl">
          {title}
        </p>
        <p className="text-lg text-ink-soft short:text-base">{text}</p>
        {action}
      </div>
    </section>
  )
}
