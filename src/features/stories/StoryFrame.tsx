import clsx from 'clsx'
import { useEffect, type ReactNode } from 'react'
import { Screen } from '@/components/layout/Screen'
import { SHORT_SCREEN } from '@/components/layout/shortScreen'
import { TitleTopBar } from '@/components/layout/TitleTopBar'
import { SpeakButton } from '@/features/learn/SpeakButton'
import { SPEAK_PRIORITY, useSpeakable } from '@/features/learn/speakable'
import { useLearnVoice } from '@/features/learn/voice'
import { Mascot } from '@/features/mascot/Mascot'
import { useMascotStore } from '@/features/mascot/mascotStore'

/**
 * The frame of the library, the questions and the locked note: top bar, the
 * robot with its bubble (notes such as "this is PRO" appear there) and the
 * shared speaker button, which reads `speak` (or a question registered
 * inside). The reader pages use a lighter frame to give the picture room.
 */
export function StoryFrame({
  title,
  back,
  speak,
  hideMascotShort = false,
  children,
}: {
  title: string
  back: string
  speak: readonly string[]
  hideMascotShort?: boolean
  children: ReactNode
}) {
  const voice = useLearnVoice()
  const resetMascot = useMascotStore((state) => state.reset)
  useSpeakable(speak, SPEAK_PRIORITY.page)

  // leaving: the bubble clears and any voice stops
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
      header={<TitleTopBar title={title} back={back} wrap />}
      className={clsx('gap-3 px-4 py-3 sm:gap-5 sm:px-8 sm:py-5', SHORT_SCREEN.page)}
    >
      <div
        className={clsx('mx-auto flex w-full max-w-5xl items-center gap-3', SHORT_SCREEN.mascotRow)}
      >
        <Mascot
          robotClassName={clsx('w-[56px] sm:w-24', SHORT_SCREEN.robot)}
          className={clsx('min-w-0 flex-1', hideMascotShort && 'short:hidden')}
          speaking={voice.speaking}
          talkOnlyWhileSpeaking
        />
        <div className={clsx('ml-auto flex shrink-0 items-center gap-2', SHORT_SCREEN.actions)}>
          <SpeakButton fallback={[title]} />
        </div>
      </div>
      {children}
    </Screen>
  )
}
