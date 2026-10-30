import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon, CrownIcon } from '@/components/icons'
import { Img3D } from '@/components/ui/Img3D'
import { LinkButton } from '@/components/ui/LinkButton'
import { ProBadge } from '@/components/ui/ProLock'
import { useCanUse } from '@/domain/entitlements'
import { useLearnMascot } from '@/features/learn/useLearnMascot'
import { storyById } from './content'
import { StoryFrame } from './StoryFrame'
import { STORIES_ROOT, StoryLibrary } from './StoryLibrary'
import { StoryRun } from './StoryRun'
import type { StorySpec } from './types'
import { useStoriesUi, useStoryLanguage } from './ui'

/**
 * A PRO story opened without PRO (e.g. a saved link): a calm note for the
 * child and a parent, with the cover only – none of the story's words or
 * pages are rendered, and there is no purchase pop-up.
 */
function StoryLocked({ story }: { story: StorySpec }) {
  const ui = useStoriesUi()
  // the note below says it all; the robot's bubble stays short
  const { say } = useLearnMascot()
  useEffect(() => {
    say('locked', { text: ui.lockedTitle, emoji: '👑' })
  }, [say, ui.lockedTitle])
  return (
    <StoryFrame title={ui.lockedTitle} back={STORIES_ROOT} speak={[ui.lockedTitle, ui.lockedText]}>
      <section
        data-testid="story-locked"
        className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 rounded-panel bg-surface p-6 text-center shadow-press-lg short:flex-row short:gap-5 short:p-4 short:text-left"
      >
        <span className="relative flex size-36 shrink-0 items-center justify-center rounded-tile bg-sky-soft p-3 short:size-24">
          <Img3D name={story.cover} className="size-full opacity-70" eager />
          <ProBadge />
        </span>
        <div className="flex flex-col items-center gap-3 short:items-start short:gap-2">
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold short:text-xl">
            <CrownIcon size={26} />
            {ui.lockedTitle}
          </h2>
          <p className="text-lg leading-snug text-ink-soft short:text-base">{ui.lockedText}</p>
          <LinkButton
            to={STORIES_ROOT}
            data-sound="back"
            variant="soft"
            size="md"
            icon={<ChevronLeftIcon size={24} />}
          >
            {ui.backToLibrary}
          </LinkButton>
        </div>
      </section>
    </StoryFrame>
  )
}

/** `/stories/:storyId`: the story, or the locked note (PRO is checked on every render). */
function StoryRoute({ id }: { id: string }) {
  const language = useStoryLanguage()
  const premium = useCanUse('premiumStories')
  const story = storyById(id)
  if (!story) return <Navigate to={STORIES_ROOT} replace />
  if (!story.free && !premium) return <StoryLocked story={story} />
  // a new language starts the story again in it
  return <StoryRun key={`${story.id}-${language}`} story={story} language={language} />
}

/** The Story Engine: the library (`/stories`) and one story (`/stories/:storyId`). */
export function StoriesPage() {
  const { storyId } = useParams()
  if (storyId === undefined) return <StoryLibrary />
  return <StoryRoute id={storyId} />
}
