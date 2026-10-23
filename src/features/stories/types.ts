import type { Actor } from '@/features/tales/content'
import type { FeelingId } from '@/features/feelings/content'
import type { StoryBackdrop } from './backdrops'

/*
 * The Story Engine's data (Phase 8): longer picture stories (2–5 minutes)
 * with 1–2 choices, every branch ending kindly. A story is pure data; the
 * words live per language in text.uz / text.ru / text.en (written for each
 * language, not word for word), keyed by the ids used here.
 */

/** The picture of a page: a place and its characters (public/3d pictures), as in the tales. */
export interface PagePicture {
  backdrop: StoryBackdrop
  actors: readonly Actor[]
}

/** One way a choice page can go. `textKey` names its words in the story text. */
export interface StoryChoice {
  textKey: string
  /** public/3d picture on the choice button. */
  picture: string
  to: string
}

interface PageBase {
  /** Also the key of the page's words in the story text. */
  id: string
  picture: PagePicture
}

export type StoryPage =
  | (PageBase & { next: string; choices?: never; ending?: never })
  | (PageBase & { choices: readonly StoryChoice[]; next?: never; ending?: never })
  | (PageBase & { ending: true; next?: never; choices?: never })

/**
 * What a comprehension question asks:
 * literal (who / what) for levels 1–2, sequence for 3, and why / feelings /
 * predict for 4–5.
 */
export type QuestionKind = 'who' | 'what' | 'sequence' | 'why' | 'feelings' | 'predict'

/** A picture answer: a public/3d picture, or `face:<feeling>` (the Feelings faces). */
export type AnswerPicture = string | `face:${FeelingId}`

export interface QuestionSpec {
  id: string
  kind: QuestionKind
  /** The page it is about: it must be on every path, so every child has read it. */
  page: string
  /** Picture answers; the first one is right (shown in a mixed order). */
  options: readonly AnswerPicture[]
}

export interface StorySpec {
  id: string
  /** Reading time the library shows (2–5); the validator checks it against the text. */
  minutes: number
  free: boolean
  strand: 'language'
  /** Challenge levels it suits (questions adapt to the child's level anyway). */
  levels: readonly number[]
  /** public/3d picture of the library card. */
  cover: string
  /** pages[0] is where the story starts. */
  pages: readonly StoryPage[]
  questions: readonly QuestionSpec[]
}

export type { StoryText } from './storyText'
