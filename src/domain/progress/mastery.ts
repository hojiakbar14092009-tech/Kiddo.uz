import { useMemo } from 'react'
import type { Language } from '@/content/languages'
import {
  EMPTY_LEARN_CHILD,
  getLearnChild,
  stagesTaught,
  strongSkills,
  useLearnStore,
  weakSkills,
  type LearnChild,
  type LearnLanguage,
  type SectionId,
  type SkillStat,
} from '@/features/learn/learnStore'
import { dayKey } from '@/features/tasks/rules'
import {
  EMPTY_PROGRESS,
  useChildKey,
  useProgressStore,
  type ChildProgress,
} from '@/store/progressStore'

/*
 * One view of what a child knows, over the two progress models:
 * - legacy alphabet games (`progressStore`: learned letters, letter struggles,
 *   task results), and
 * - the new learning sections (`learnStore`: skills, sessions, stages).
 * Nothing moves; this only reads both.
 */

export { stagesTaught, strongSkills, weakSkills }

/** A section in either model: the six learning sections, or the alphabet games. */
export type MasterySection = SectionId | 'alphabet'

/** A skill record in either model (alphabet letters are mapped into this shape). */
export interface MasteryStat extends Omit<SkillStat, 'section'> {
  section: MasterySection
  /** `section|language|skill`, e.g. `alphabet|uz|sh`. */
  key: string
}

export interface Mastery {
  /** Skills that need practice, the most troubled first. */
  weak: MasteryStat[]
  /** Skills the child is sure of. */
  strong: MasteryStat[]
  /** Stages taught (new sections only; the alphabet has none). */
  stages: string[]
}

const fromSkill = (stat: SkillStat): MasteryStat => ({
  ...stat,
  key: `${stat.section}|${stat.language}|${stat.skill}`,
})

/**
 * Legacy letter struggles as skill records: `alphabet|<lang>|<letterId>`, with
 * the open mistake count as `wrong`. The old model has no per-answer history,
 * so attempts equal the mistakes and there is no streak.
 */
export function letterStruggleStats(progress: ChildProgress, language: Language): MasteryStat[] {
  return Object.entries(progress.struggles[language] ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([letterId, count]) => ({
      key: `alphabet|${language}|${letterId}`,
      section: 'alphabet',
      language,
      skill: letterId,
      attempts: count,
      independent: 0,
      wrong: count,
      helped: 0,
      streak: 0,
      lastCorrect: false,
      lastErrorType: null,
      lastPracticed: '',
    }))
}

/** Learned letters (answered without a mistake) as sure skills. */
export function learnedLetterStats(progress: ChildProgress, language: Language): MasteryStat[] {
  const struggling = progress.struggles[language] ?? {}
  return (progress.learned[language] ?? [])
    .filter((letterId) => !struggling[letterId])
    .map((letterId) => ({
      key: `alphabet|${language}|${letterId}`,
      section: 'alphabet',
      language,
      skill: letterId,
      attempts: 1,
      independent: 1,
      wrong: 0,
      helped: 0,
      streak: 2,
      lastCorrect: true,
      lastErrorType: null,
      lastPracticed: '',
    }))
}

export function masteryOf(
  progress: ChildProgress,
  learn: LearnChild,
  section: MasterySection,
  language: LearnLanguage,
): Mastery {
  if (section === 'alphabet') {
    if (language === 'any') return { weak: [], strong: [], stages: [] }
    return {
      weak: letterStruggleStats(progress, language),
      strong: learnedLetterStats(progress, language),
      stages: [],
    }
  }
  return {
    weak: weakSkills(learn, section, language).map(fromSkill),
    strong: strongSkills(learn, section, language).map(fromSkill),
    stages: stagesTaught(learn, section, language),
  }
}

/** What the active child knows in a section (alphabet included), for drawing the screen. */
export function useMastery(section: MasterySection, language: LearnLanguage): Mastery {
  const childKey = useChildKey()
  const progress = useProgressStore((state) => state.byChild[childKey] ?? EMPTY_PROGRESS)
  const learn = useLearnStore((state) => state.byChild[childKey] ?? EMPTY_LEARN_CHILD)
  return useMemo(
    () => masteryOf(progress, learn, section, language),
    [language, learn, progress, section],
  )
}

export interface DayActivity {
  /** Legacy alphabet games and exams finished that day. */
  tasks: number
  /** Sessions finished in the new learning sections that day. */
  sessions: number
  total: number
  /** Which kinds were played: task types and section ids, without repeats. */
  kinds: string[]
}

/**
 * Everything a child finished on a local day (YYYY-MM-DD) in both models, so a
 * daily plan or a parent report can count the new sections too.
 */
export function childActivityForDay(childKey: string, day: string): DayActivity {
  const progress = useProgressStore.getState().byChild[childKey] ?? EMPTY_PROGRESS
  const learn = getLearnChild(childKey)
  const tasks = progress.results.filter((result) => result.day === day)
  const sessions = learn.sessions.filter((session) => dayKey(new Date(session.at)) === day)
  return {
    tasks: tasks.length,
    sessions: sessions.length,
    total: tasks.length + sessions.length,
    kinds: [
      ...new Set([
        ...tasks.map((result) => result.type as string),
        ...sessions.map((s) => s.section),
      ]),
    ],
  }
}
