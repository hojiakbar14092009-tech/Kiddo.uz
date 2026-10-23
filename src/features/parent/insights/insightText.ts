import type { TFunction } from 'i18next'
import { LANGUAGE_INFO } from '@/content/languages'
import type { Strand } from '@/domain/universe/types'
import { tDynamic } from '@/lib/tDynamic'
import { activityName } from './activityNames'
import { strandLevelWord, type PlayedRun } from './insights'

/*
 * Texts of the insight panels. Helpers take `TFunction` (not
 * `ReturnType<typeof useTranslation>['t']`, which is too deep for tsc: TS2589).
 */

/** A quiet outlined link in the parent area's style (not the child's chunky buttons). */
export const QUIET_LINK =
  'inline-flex min-h-12 items-center gap-1 rounded-full border-2 border-line-strong bg-surface px-4 font-semibold text-ink'

export function strandName(t: TFunction, strand: Strand): string {
  return tDynamic(t, `parent.insights.strands.${strand}`)
}

export function levelWord(t: TFunction, level: number): string {
  return tDynamic(t, `parent.insights.levels.${strandLevelWord(level)}`)
}

export function runName(t: TFunction, run: Pick<PlayedRun, 'activity'>): string {
  const name = activityName(run.activity)
  if (name.storyId) {
    return t('parent.insights.storyNamed', {
      title: tDynamic(t, `parent.insights.stories.${name.storyId}`),
    })
  }
  const base = tDynamic(t, `parent.insights.names.${name.key}`)
  return name.language ? `${base} (${LANGUAGE_INFO[name.language].shortLabel})` : base
}
