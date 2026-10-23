import type { Language } from '@/content/languages'
import type { ChallengeLevel } from '@/domain/learner'
import type { ActivityCompleted } from '@/domain/universe'
import { STORY_PREFIX } from '@/domain/universe/rules'
import type { QuestionKind, QuestionSpec, StoryPage, StorySpec, StoryText } from './types'

/*
 * The Story Engine: pure functions over a StorySpec (no React, no stores),
 * so every rule is unit-tested and every story is validated at test time.
 */

export { STORY_PREFIX }
export const MIN_MINUTES = 2
export const MAX_MINUTES = 5

// ------------------------------------------------------------------ pages

export function pageById(story: StorySpec, id: string): StoryPage | undefined {
  return story.pages.find((page) => page.id === id)
}

export function startPage(story: StorySpec): StoryPage {
  const first = story.pages[0]
  if (!first) throw new Error(`story ${story.id} has no pages`)
  return first
}

/** Where a page can go next (none for an ending). */
export function targetsOf(page: StoryPage): string[] {
  if (page.ending) return []
  if (page.choices) return page.choices.map((choice) => choice.to)
  return [page.next]
}

export function isEnding(page: StoryPage): boolean {
  return page.ending === true
}

/**
 * Every path from the first page to an ending, as page ids. A path that
 * comes back to a page it already passed is cut there (the validator
 * reports it as a loop), so this always ends.
 */
export function allPaths(story: StorySpec): string[][] {
  const out: string[][] = []
  const walk = (id: string, path: string[]) => {
    const page = pageById(story, id)
    if (!page || path.includes(id)) return
    const next = [...path, id]
    if (isEnding(page)) {
      out.push(next)
      return
    }
    for (const to of targetsOf(page)) walk(to, next)
  }
  walk(startPage(story).id, [])
  return out
}

/** The most pages still to read from this page to an ending (the page itself included). */
export function pagesLeft(story: StorySpec, id: string, seen: readonly string[] = []): number {
  const page = pageById(story, id)
  if (!page || seen.includes(id)) return 0
  if (isEnding(page)) return 1
  return 1 + Math.max(0, ...targetsOf(page).map((to) => pagesLeft(story, to, [...seen, id])))
}

// ------------------------------------------------------------------ reading

/** A reader's place: the pages read so far, the current one last. */
export interface ReaderState {
  history: readonly string[]
}

export function startReading(story: StorySpec): ReaderState {
  return { history: [startPage(story).id] }
}

export function currentPage(story: StorySpec, state: ReaderState): StoryPage {
  const id = state.history[state.history.length - 1]
  return (id !== undefined ? pageById(story, id) : undefined) ?? startPage(story)
}

/** Turns to the next page (not on a choice page or an ending: nothing happens). */
export function goNext(story: StorySpec, state: ReaderState): ReaderState {
  const page = currentPage(story, state)
  if (page.ending || page.choices) return state
  return { history: [...state.history, page.next] }
}

/** Follows one of the current page's choices (an unknown key changes nothing). */
export function choose(story: StorySpec, state: ReaderState, textKey: string): ReaderState {
  const page = currentPage(story, state)
  const choice = page.choices?.find((item) => item.textKey === textKey)
  if (!choice) return state
  return { history: [...state.history, choice.to] }
}

/** One page back (a choice can then be made again); the first page stays. */
export function goBack(state: ReaderState): ReaderState {
  if (state.history.length <= 1) return state
  return { history: state.history.slice(0, -1) }
}

/** How far along: pages read and the most pages a path from here can still have. */
export function readingProgress(
  story: StorySpec,
  state: ReaderState,
): { current: number; total: number } {
  const current = state.history.length
  const page = currentPage(story, state)
  return { current, total: current - 1 + pagesLeft(story, page.id) }
}

// ------------------------------------------------------------------ reading time

/** Words a grown-up reads aloud to a small child per minute, with pauses to look. */
export const READ_ALOUD_WPM = 75
/** Seconds to look at a page's picture and turn it; a choice takes longer. */
export const PAGE_SECONDS = 7
export const CHOICE_SECONDS = 8

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}

/** Estimated minutes to read one path aloud in one language. */
export function pathMinutes(story: StorySpec, text: StoryText, path: readonly string[]): number {
  let seconds = 0
  for (const id of path) {
    const page = pageById(story, id)
    const words = (text.pages[id] ?? []).reduce((sum, line) => sum + wordCount(line), 0)
    seconds += (words / READ_ALOUD_WPM) * 60 + PAGE_SECONDS
    if (page?.choices) {
      seconds += CHOICE_SECONDS
      for (const choice of page.choices) {
        seconds += (wordCount(text.choices[choice.textKey] ?? '') / READ_ALOUD_WPM) * 60
      }
    }
  }
  return seconds / 60
}

/** Shortest and longest estimated reading time over every path. */
export function readingMinutes(story: StorySpec, text: StoryText): { min: number; max: number } {
  const times = allPaths(story).map((path) => pathMinutes(story, text, path))
  return { min: Math.min(...times), max: Math.max(...times) }
}

// ------------------------------------------------------------------ questions

const LITERAL: readonly QuestionKind[] = ['who', 'what']
const INFERENCE: readonly QuestionKind[] = ['why', 'feelings', 'predict']

/** Which kinds a level asks, in order (2–4 questions). */
export function questionPlan(level: ChallengeLevel): QuestionKind[][] {
  switch (level) {
    case 1:
      return [[...LITERAL], [...LITERAL]]
    case 2:
      return [[...LITERAL], [...LITERAL], [...LITERAL]]
    case 3:
      return [[...LITERAL], ['sequence'], [...LITERAL]]
    case 4:
      return [['sequence'], ['why'], ['feelings']]
    default:
      return [['sequence'], ['why'], ['feelings'], ['predict']]
  }
}

/** Answers shown: two at level 1, three from level 2. */
export function optionCount(level: ChallengeLevel): number {
  return level <= 1 ? 2 : 3
}

export interface PickedQuestion {
  id: string
  kind: QuestionKind
  /** The answers to show, first right, already cut to the level's count (mixed when shown). */
  options: QuestionSpec['options']
}

/** `items` turned round by `by` places (a rotation, so every item gets its turn). */
function rotate<T>(items: readonly T[], by: number): T[] {
  if (items.length === 0) return []
  const shift = ((Math.trunc(by) % items.length) + items.length) % items.length
  return [...items.slice(shift), ...items.slice(0, shift)]
}

/**
 * The questions for a level: the plan's kinds in order, each from the
 * story's pool (never the same question twice). `reading` (0, 1, 2 …: the
 * how-many-th reading) turns the pool round, so reading again asks other
 * questions where the pool has more than the level needs, and a level with
 * fewer answers than the spec shows another wrong answer each time. Pure;
 * the screen mixes the answers.
 */
export function pickQuestions(
  story: StorySpec,
  level: ChallengeLevel,
  reading = 0,
): PickedQuestion[] {
  const used = new Set<string>()
  const out: PickedQuestion[] = []
  const pool = rotate(story.questions, reading)
  const count = optionCount(level)
  for (const kinds of questionPlan(level)) {
    const question = pool.find((q) => kinds.includes(q.kind) && !used.has(q.id))
    if (!question) continue
    used.add(question.id)
    const [right, ...wrong] = question.options
    const options =
      right === undefined ? [] : [right, ...rotate(wrong, reading).slice(0, count - 1)]
    out.push({ id: question.id, kind: question.kind, options })
  }
  return out
}

// ------------------------------------------------------------------ universe

export function storyActivityName(id: string): string {
  return `${STORY_PREFIX}${id}`
}

/**
 * What a finished story (with its questions) reports to the universe, once
 * per reading; only the day's first reading of a story counts for the
 * achievements and the child's 'language' level (`oncePerDay`).
 */
export function storyActivity(
  runId: string,
  childKey: string,
  storyId: string,
  level: ChallengeLevel,
  score: { total: number; firstTry: number },
): ActivityCompleted {
  const firstTry = Math.max(0, Math.min(score.total, score.firstTry))
  return {
    id: runId,
    childKey,
    activity: storyActivityName(storyId),
    strand: 'language',
    correct: firstTry,
    total: score.total,
    independent: firstTry,
    level,
    // reading a story again is welcome, but it counts once a day
    oncePerDay: true,
  }
}

// ------------------------------------------------------------------ validation

const SENTENCE_END = /[.!?…»"”)]$/

/**
 * Every problem of a story and its words, as readable lines (empty: valid).
 * Checked for each story at test time.
 */
export function validateStory(
  story: StorySpec,
  texts: Readonly<Record<Language, StoryText | undefined>>,
): string[] {
  const errors: string[] = []
  const err = (message: string) => errors.push(`${story.id}: ${message}`)
  const ids = story.pages.map((page) => page.id)

  if (!story.id || story.id.includes(':')) err('bad id')
  if (!(story.minutes >= MIN_MINUTES && story.minutes <= MAX_MINUTES)) err('minutes not 2–5')
  if (story.strand !== 'language') err('strand must be language')
  if (story.pages.length === 0) {
    err('no pages')
    return errors
  }
  if (new Set(ids).size !== ids.length) err('page ids repeat')

  // links
  for (const page of story.pages) {
    const kinds = [page.next !== undefined, page.choices !== undefined, page.ending === true]
    if (kinds.filter(Boolean).length !== 1)
      err(`page ${page.id}: needs exactly one of next / choices / ending`)
    if (page.choices) {
      if (page.choices.length < 2 || page.choices.length > 3) err(`page ${page.id}: 2–3 choices`)
      const keys = page.choices.map((choice) => choice.textKey)
      if (new Set(keys).size !== keys.length) err(`page ${page.id}: choice keys repeat`)
      for (const choice of page.choices) {
        if (!choice.picture) err(`page ${page.id}: choice ${choice.textKey} has no picture`)
      }
    }
    for (const to of targetsOf(page)) {
      if (!ids.includes(to)) err(`page ${page.id}: goes to missing page ${to}`)
      if (to === page.id) err(`page ${page.id}: goes to itself`)
    }
    if (page.picture.actors.length === 0) err(`page ${page.id}: picture has no characters`)
  }

  // reachability, loops, endings
  const reachable = new Set<string>()
  const visit = (id: string) => {
    if (reachable.has(id) || !ids.includes(id)) return
    reachable.add(id)
    const page = pageById(story, id)
    if (page) targetsOf(page).forEach(visit)
  }
  visit(startPage(story).id)
  for (const id of ids) if (!reachable.has(id)) err(`page ${id}: unreachable`)

  const onStack = new Set<string>()
  const done = new Set<string>()
  const reachesEnding = new Map<string, boolean>()
  const dfs = (id: string): boolean => {
    if (onStack.has(id)) {
      err(`loop through page ${id}`)
      return false
    }
    if (done.has(id)) return reachesEnding.get(id) ?? false
    const page = pageById(story, id)
    if (!page) return false
    onStack.add(id)
    const targets = targetsOf(page)
    const results = targets.map(dfs)
    onStack.delete(id)
    done.add(id)
    // every way out must lead to an ending (no dead ends anywhere)
    const ok = isEnding(page) || (targets.length > 0 && results.every(Boolean))
    if (!isEnding(page) && targets.length === 0) err(`page ${id}: dead end`)
    reachesEnding.set(id, ok)
    return ok
  }
  if (!dfs(startPage(story).id)) err('not every path reaches an ending')
  if (!story.pages.some(isEnding)) err('no ending')

  const choicePages = story.pages.filter((page) => page.choices).length
  if (choicePages < 1 || choicePages > 2) err('needs 1–2 choice pages')

  const paths = errors.length === 0 ? allPaths(story) : []
  const onEveryPath = new Set(
    ids.filter((id) => paths.length > 0 && paths.every((path) => path.includes(id))),
  )

  // questions
  const qids = story.questions.map((q) => q.id)
  if (new Set(qids).size !== qids.length) err('question ids repeat')
  const count = (kinds: readonly QuestionKind[]) =>
    story.questions.filter((q) => kinds.includes(q.kind)).length
  if (count(LITERAL) < 3) err('needs 3 who/what questions')
  for (const kind of ['sequence', ...INFERENCE] as const) {
    if (count([kind]) < 1) err(`needs a ${kind} question`)
  }
  for (const q of story.questions) {
    if (q.options.length !== 3) err(`question ${q.id}: needs 3 answers`)
    if (new Set(q.options).size !== q.options.length) err(`question ${q.id}: answers repeat`)
    if (!ids.includes(q.page)) err(`question ${q.id}: missing page ${q.page}`)
    else if (paths.length > 0 && !onEveryPath.has(q.page)) {
      err(`question ${q.id}: page ${q.page} is not read on every path`)
    }
  }
  for (const level of [1, 2, 3, 4, 5] as const) {
    const n = pickQuestions(story, level).length
    if (n < 2 || n > 4) err(`level ${level}: ${n} questions (needs 2–4)`)
  }

  // words in every language
  const structureOk = errors.length === 0
  for (const language of ['uz', 'ru', 'en'] as const) {
    const text = texts[language]
    const lerr = (message: string) => err(`[${language}] ${message}`)
    if (!text) {
      lerr('no text')
      continue
    }
    if (!text.title.trim()) lerr('no title')
    if (!text.blurb.trim()) lerr('no blurb')
    for (const page of story.pages) {
      const lines = text.pages[page.id]
      if (!lines || lines.length < 1 || lines.length > 3) {
        lerr(`page ${page.id}: needs 1–3 sentences`)
        continue
      }
      for (const line of lines) {
        if (!line.trim()) lerr(`page ${page.id}: empty sentence`)
        else if (!SENTENCE_END.test(line.trim()))
          lerr(`page ${page.id}: "${line}" does not end a sentence`)
      }
    }
    for (const extra of Object.keys(text.pages)) {
      if (!ids.includes(extra)) lerr(`text for unknown page ${extra}`)
    }
    const choiceKeys = story.pages.flatMap((page) => page.choices?.map((c) => c.textKey) ?? [])
    for (const key of choiceKeys) {
      if (!text.choices[key]?.trim()) lerr(`choice ${key}: no words`)
    }
    for (const extra of Object.keys(text.choices)) {
      if (!choiceKeys.includes(extra)) lerr(`text for unknown choice ${extra}`)
    }
    for (const q of story.questions) {
      const words = text.questions[q.id]
      if (!words?.prompt.trim()) lerr(`question ${q.id}: no prompt`)
      else if (words.options.length !== q.options.length || words.options.some((o) => !o.trim())) {
        lerr(`question ${q.id}: answer labels do not match`)
      }
    }
    for (const extra of Object.keys(text.questions)) {
      if (!qids.includes(extra)) lerr(`text for unknown question ${extra}`)
    }
    const all = [
      text.title,
      text.blurb,
      ...Object.values(text.pages).flat(),
      ...Object.values(text.choices),
      ...Object.values(text.questions).flatMap((q) => [q.prompt, ...q.options]),
    ].join(' ')
    if (language === 'uz') {
      // Uzbek Latin as the app writes it: o‘ g‘ with ‘ and the tutuq belgisi ’
      if (/[Ѐ-ӿ]/.test(all)) lerr('Cyrillic letters in Uzbek text')
      if (/[ʻʼ'`]/.test(all)) lerr('use ‘ (o‘, g‘) and ’ instead of other apostrophes')
      if (/[og]’/i.test(all)) lerr('o‘ / g‘ written with ’ instead of ‘')
    } else if (language === 'ru') {
      if (/[A-Za-z]/.test(all)) lerr('Latin letters in Russian text')
    } else if (/[Ѐ-ӿ]/.test(all)) {
      lerr('Cyrillic letters in English text')
    }
    if (structureOk) {
      const { min, max } = readingMinutes(story, text)
      if (min < MIN_MINUTES || max > MAX_MINUTES) {
        lerr(`reading time ${min.toFixed(1)}–${max.toFixed(1)} min is outside 2–5`)
      }
      if (story.minutes < Math.floor(min) || story.minutes > Math.ceil(max)) {
        lerr(`says ${story.minutes} min, reads in ${min.toFixed(1)}–${max.toFixed(1)}`)
      }
    }
  }
  return errors
}
