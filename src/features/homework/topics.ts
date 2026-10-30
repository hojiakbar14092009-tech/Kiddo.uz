import type { Language } from '@/content/languages'
import { LESSONS, TEXT } from '@/features/space/content'
import type { ActivityNameKey } from '@/features/parent/insights/activityNames'

/*
 * Homework topics (Phase 23 planet homework): activities whose single
 * lessons a parent can give — today the Space lessons (planets). A topic
 * homework takes the child to that lesson first, then its own short check.
 */

export interface HomeworkTopic {
  id: string
  /** The age level the lesson belongs to (4, 5 or 6). */
  level: number
}

export function topicsFor(target: ActivityNameKey): readonly HomeworkTopic[] {
  if (target !== 'space') return []
  return LESSONS.map((lesson) => ({ id: lesson.stage, level: lesson.level }))
}

/** The topic's name for parent and child (the lesson's own title). */
export function topicLabel(target: ActivityNameKey, topic: string, language: Language): string {
  if (target === 'space') return TEXT[language].ui.lessonTitles[topic] ?? topic
  return topic
}
