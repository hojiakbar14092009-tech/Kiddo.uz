import clsx from 'clsx'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckIcon, ChevronRightIcon, LockIcon } from '@/components/icons'
import { Img3D } from '@/components/ui/Img3D'
import { ProBadge } from '@/components/ui/ProLock'
import { useProLabel } from '@/components/ui/useProLabel'
import { canUse, useCanUse } from '@/domain/entitlements'
import { useUniverseStore } from '@/domain/universe'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { useChildKey } from '@/store/progressStore'
import { STORIES, storyText } from './content'
import { storyActivityName } from './engine'
import { StoryFrame } from './StoryFrame'
import type { StorySpec } from './types'
import { useStoriesUi, useStoryLanguage } from './ui'

export const STORIES_ROOT = '/stories'

const CARD =
  'relative flex h-full w-full items-center gap-3 rounded-card bg-surface p-3 text-left shadow-press transition-transform active:translate-y-1 min-[480px]:flex-col min-[480px]:items-stretch min-[480px]:text-center sm:p-4 short:flex-row! short:items-center! short:p-2 short:text-left!'

/** `/stories`: the six stories (free and PRO side by side) and the way to the classic tales. */
export function StoryLibrary() {
  const ui = useStoriesUi()
  const language = useStoryLanguage()
  const navigate = useNavigate()
  const premium = useCanUse('premiumStories')
  const proLabel = useProLabel()
  const { say } = useLearnMascot()
  const childKey = useChildKey()
  const best = useUniverseStore((s) => s.byChild[childKey]?.best)

  useEffect(() => {
    say('greet', { text: ui.intro, emoji: '📚' })
  }, [say, ui.intro])

  /** A PRO story is asked again right before opening; without PRO the robot explains. */
  const open = (story: StorySpec) => {
    if (!story.free && !canUse('premiumStories')) {
      say('locked', { text: ui.locked, emoji: '👑' })
      window.scrollTo?.({ top: 0, behavior: 'smooth' })
      return
    }
    navigate(`${STORIES_ROOT}/${story.id}`)
  }

  return (
    <StoryFrame title={ui.title} back="/home" speak={[ui.intro]}>
      <h2 className="sr-only">{ui.intro}</h2>
      <ul className="mx-auto grid w-full max-w-5xl gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3 short:grid-cols-3 short:gap-2">
        {STORIES.map((story) => {
          const text = storyText(language, story.id)
          const locked = !story.free && !premium
          const read = (best?.[storyActivityName(story.id)] ?? 0) > 0
          return (
            <li key={story.id} className="relative">
              <button
                type="button"
                onClick={() => open(story)}
                aria-label={locked ? proLabel(text.title) : text.title}
                data-testid={`story-card-${story.id}`}
                data-locked={locked ? 'true' : 'false'}
                className={clsx(CARD, locked && 'bg-cream')}
              >
                <span
                  aria-hidden="true"
                  className="relative flex size-[min(5rem,22vw)] shrink-0 items-center justify-center rounded-tile bg-sky-soft p-2 min-[480px]:h-28 min-[480px]:w-full sm:h-32 short:size-14! short:p-1"
                >
                  <Img3D
                    name={story.cover}
                    className={clsx('size-full', locked && 'opacity-60 grayscale-[40%]')}
                    eager
                  />
                  {locked && (
                    <span className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full bg-surface text-ink shadow-press-sm">
                      <LockIcon size={18} />
                    </span>
                  )}
                  {read && !locked && (
                    <span
                      className="absolute right-1 bottom-1 flex size-8 items-center justify-center rounded-full bg-primary text-white"
                      title={ui.finished}
                    >
                      <CheckIcon size={18} />
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-display text-xl leading-tight font-extrabold [overflow-wrap:anywhere] hyphens-auto sm:text-2xl short:text-base">
                    {text.title}
                  </span>
                  <span className="text-sm leading-snug text-ink-soft sm:text-base short:hidden">
                    {text.blurb}
                  </span>
                  <span className="mt-auto flex flex-wrap items-center gap-1.5 min-[480px]:justify-center short:justify-start!">
                    <span className="rounded-full bg-sky-soft px-2.5 py-0.5 text-sm font-bold">
                      {ui.minutes(story.minutes)}
                    </span>
                    {read && (
                      <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-sm font-bold text-primary-ink short:hidden">
                        {ui.finished}
                      </span>
                    )}
                  </span>
                </span>
              </button>
              {locked && <ProBadge size="sm" />}
            </li>
          )
        })}
      </ul>
      <Link
        to="/learn/tales"
        data-testid="stories-classic-tales"
        className="mx-auto flex w-full max-w-5xl items-center gap-3 rounded-card bg-lilac-soft p-3 shadow-press transition-transform active:translate-y-1 sm:p-4 short:p-2"
      >
        <span
          aria-hidden="true"
          className="flex size-16 shrink-0 items-center justify-center rounded-tile bg-surface p-2 short:size-12"
        >
          <Img3D name="rabbit" className="size-full" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="font-display text-xl font-extrabold short:text-base">{ui.classic}</span>
          <span className="text-sm text-ink-soft sm:text-base short:hidden">{ui.classicText}</span>
        </span>
        <ChevronRightIcon size={28} className="ml-auto shrink-0 text-ink-soft" />
      </Link>
    </StoryFrame>
  )
}
