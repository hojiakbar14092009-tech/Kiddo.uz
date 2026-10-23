import { beforeEach, describe, expect, it } from 'vitest'
import { entitlementFor } from '@/domain/entitlements'
import {
  activityEffects,
  emitActivity,
  getResources,
  isStory,
  paysScroll,
  resourceHistory,
  useUniverseStore,
} from '@/domain/universe'
import { STORIES, STORY_TEXT, storyById } from './content'
import {
  allPaths,
  choose,
  currentPage,
  goBack,
  goNext,
  pagesLeft,
  pickQuestions,
  readingMinutes,
  readingProgress,
  startReading,
  storyActivity,
  validateStory,
} from './engine'
import { planSpeech } from '@/services/audio/voiceLibrary'
import { SPOKEN } from './spoken'
import type { StorySpec } from './types'

/** Every picture in public/3d (and public/3d/worlds), as `name` or `worlds/name`. */
const PICTURES = new Set(
  Object.keys(import.meta.glob(['/public/3d/*.webp', '/public/3d/worlds/*.webp'])).map((path) =>
    path.replace('/public/3d/', '').replace(/\.webp$/, ''),
  ),
)

/** Every recorded voice clip on disk, as `<lang>/<key>`. */
const CLIP_FILES = new Set(
  Object.keys(import.meta.glob('/public/audio/voice/*/*.mp3')).map((path) =>
    path.replace('/public/audio/voice/', '').replace(/\.mp3$/, ''),
  ),
)

const texts = (id: string) => ({
  uz: STORY_TEXT.uz[id],
  ru: STORY_TEXT.ru[id],
  en: STORY_TEXT.en[id],
})

/** Every picture a story uses: pages, choices and answers (faces are drawn, not files). */
function pictures(story: StorySpec): string[] {
  return [
    story.cover,
    ...story.pages.flatMap((page) => [
      ...page.picture.actors.map((actor) => actor.asset),
      ...(page.choices?.map((choice) => choice.picture) ?? []),
    ]),
    ...story.questions.flatMap((q) => q.options.filter((o) => !o.startsWith('face:'))),
  ]
}

describe('the six stories', () => {
  it('are six, two free and four PRO, all language', () => {
    expect(STORIES).toHaveLength(6)
    expect(STORIES.filter((s) => s.free)).toHaveLength(2)
    expect(new Set(STORIES.map((s) => s.id)).size).toBe(6)
    for (const story of STORIES) expect(story.strand).toBe('language')
  })

  for (const story of STORIES) {
    it(`${story.id} passes the validator in uz, ru and en`, () => {
      expect(validateStory(story, texts(story.id))).toEqual([])
    })

    it(`${story.id} uses existing public/3d pictures only`, () => {
      expect(PICTURES.size).toBeGreaterThan(100)
      const missing = pictures(story).filter((name) => !PICTURES.has(name))
      expect(missing).toEqual([])
    })

    it(`${story.id} reads in 2–5 minutes on every path and has 1–2 choices`, () => {
      for (const language of ['uz', 'ru', 'en'] as const) {
        const { min, max } = readingMinutes(story, STORY_TEXT[language][story.id]!)
        expect(min).toBeGreaterThanOrEqual(2)
        expect(max).toBeLessThanOrEqual(5)
      }
      const choicePages = story.pages.filter((p) => p.choices).length
      expect(choicePages).toBeGreaterThanOrEqual(1)
      expect(choicePages).toBeLessThanOrEqual(2)
      expect(allPaths(story).length).toBeGreaterThanOrEqual(2)
    })
  }

  for (const language of ['uz', 'ru', 'en'] as const) {
    it(`every ${language} sentence a story reads aloud has a recorded clip`, async () => {
      const missing: string[] = []
      for (const line of SPOKEN[language]) {
        const parts = await planSpeech(language, line)
        if (parts.length === 0 || parts.some((part) => part.kind !== 'clip')) missing.push(line)
        for (const part of parts) {
          // the manifest entry has its recording on disk
          if (part.kind === 'clip' && !CLIP_FILES.has(`${language}/${part.key}`))
            missing.push(`${line} (${part.key}.mp3)`)
        }
      }
      expect(missing).toEqual([])
    })
  }

  it('every sentence a story can read aloud is listed for the voice recorder', () => {
    for (const language of ['uz', 'ru', 'en'] as const) {
      const lines = new Set(SPOKEN[language])
      for (const story of STORIES) {
        const text = STORY_TEXT[language][story.id]!
        for (const page of Object.values(text.pages))
          for (const line of page) {
            expect(lines.has(line)).toBe(true)
          }
      }
    }
  })
})

// a tiny story for the validator's own rules
const tiny = (pages: StorySpec['pages'], questions: StorySpec['questions'] = []): StorySpec => ({
  id: 'tiny',
  minutes: 3,
  free: true,
  strand: 'language',
  levels: [1],
  cover: 'sheep',
  pages,
  questions,
})
const pic = { backdrop: 'meadow' as const, actors: [{ asset: 'sheep', x: 0 }] }

describe('validateStory', () => {
  it('finds a missing target, a loop, an unreachable page and a dead end', () => {
    const missing = tiny([{ id: 'a', picture: pic, next: 'nowhere' }])
    expect(validateStory(missing, { uz: undefined, ru: undefined, en: undefined }).join()).toMatch(
      /missing page nowhere/,
    )

    const loop = tiny([
      { id: 'a', picture: pic, next: 'b' },
      { id: 'b', picture: pic, next: 'a' },
    ])
    expect(validateStory(loop, { uz: undefined, ru: undefined, en: undefined }).join()).toMatch(
      /loop/,
    )

    const lost = tiny([
      { id: 'a', picture: pic, ending: true },
      { id: 'b', picture: pic, ending: true },
    ])
    expect(validateStory(lost, { uz: undefined, ru: undefined, en: undefined }).join()).toMatch(
      /page b: unreachable/,
    )

    const dead = tiny([
      {
        id: 'a',
        picture: pic,
        choices: [
          { textKey: 'x', picture: 'rock', to: 'b' },
          { textKey: 'y', picture: 'rock', to: 'c' },
        ],
      },
      { id: 'b', picture: pic, ending: true },
      { id: 'c', picture: pic, next: 'a' },
    ])
    expect(validateStory(dead, { uz: undefined, ru: undefined, en: undefined }).join()).toMatch(
      /loop/,
    )
  })

  it('needs every text in every language and questions on every path', () => {
    const story = storyById('lost-lamb')!
    const uz = STORY_TEXT.uz['lost-lamb']!
    const broken = { ...uz, pages: { ...uz.pages, p2: [] } }
    expect(validateStory(story, { ...texts(story.id), uz: broken }).join()).toMatch(
      /\[uz\] page p2: needs 1–3 sentences/,
    )
    expect(validateStory(story, { ...texts(story.id), ru: undefined }).join()).toMatch(
      /\[ru\] no text/,
    )

    // a question about a page only one branch reads
    const branchy: StorySpec = {
      ...story,
      questions: story.questions.map((q, i) => (i === 0 ? { ...q, page: 'stay1' } : q)),
    }
    expect(validateStory(branchy, texts(story.id)).join()).toMatch(/not read on every path/)
  })

  it('checks the Uzbek apostrophes and the scripts', () => {
    const story = storyById('lost-lamb')!
    const uz = STORY_TEXT.uz['lost-lamb']!
    const wrong = { ...uz, title: "Adashgan qo'zichoq" }
    expect(validateStory(story, { ...texts(story.id), uz: wrong }).join()).toMatch(/apostrophes/)
    const latinInRu = { ...STORY_TEXT.ru['lost-lamb']!, title: 'Oppoq' }
    expect(validateStory(story, { ...texts(story.id), ru: latinInRu }).join()).toMatch(/Latin/)
  })
})

describe('reading a story', () => {
  const story = storyById('lost-lamb')!

  it('turns pages, follows a choice, goes back and reaches an ending', () => {
    let state = startReading(story)
    expect(currentPage(story, state).id).toBe('p1')
    state = goNext(story, goNext(story, goNext(story, state)))
    expect(currentPage(story, state).id).toBe('p4')
    // a choice page does not turn by itself
    expect(goNext(story, state)).toBe(state)
    expect(choose(story, state, 'nope')).toBe(state)
    state = choose(story, state, 'down')
    expect(currentPage(story, state).id).toBe('down1')
    // back to the choice, which can be made again
    state = choose(story, goBack(state), 'stay')
    expect(state.history).toEqual(['p1', 'p2', 'p3', 'p4', 'stay1'])
    state = goNext(story, goNext(story, state))
    expect(currentPage(story, state).id).toBe('home')
    state = choose(story, state, 'thank')
    expect(currentPage(story, state)).toMatchObject({ id: 'end-thank', ending: true })
    expect(goNext(story, state)).toBe(state)
    expect(goBack(startReading(story))).toEqual(startReading(story))
  })

  it('shows progress against the longest way left', () => {
    expect(pagesLeft(story, 'p1')).toBe(8)
    expect(readingProgress(story, startReading(story))).toEqual({ current: 1, total: 8 })
    const end = { history: ['p1', 'p2', 'p3', 'p4', 'stay1', 'stay2', 'home', 'end-close'] }
    expect(readingProgress(story, end)).toEqual({ current: 8, total: 8 })
  })

  it('every path of every story ends kindly at an ending page', () => {
    for (const s of STORIES) {
      for (const path of allPaths(s)) {
        const last = s.pages.find((p) => p.id === path[path.length - 1])
        expect(last?.ending).toBe(true)
      }
    }
  })
})

describe('questions follow the language level', () => {
  it('asks who/what at levels 1–2, adds sequence at 3, why/feelings/predict at 4–5', () => {
    for (const story of STORIES) {
      const l1 = pickQuestions(story, 1)
      expect(l1).toHaveLength(2)
      expect(l1.every((q) => q.kind === 'who' || q.kind === 'what')).toBe(true)
      expect(l1.every((q) => q.options.length === 2)).toBe(true)

      const l2 = pickQuestions(story, 2)
      expect(l2).toHaveLength(3)
      expect(l2.every((q) => q.kind === 'who' || q.kind === 'what')).toBe(true)
      expect(l2.every((q) => q.options.length === 3)).toBe(true)

      expect(pickQuestions(story, 3).map((q) => q.kind)).toContain('sequence')

      const l4 = pickQuestions(story, 4).map((q) => q.kind)
      expect(l4).toEqual(['sequence', 'why', 'feelings'])
      expect(pickQuestions(story, 5).map((q) => q.kind)).toEqual([
        'sequence',
        'why',
        'feelings',
        'predict',
      ])
      // the right answer stays first (the screen mixes them)
      for (const level of [1, 2, 3, 4, 5] as const) {
        for (const q of pickQuestions(story, level)) {
          expect(q.options[0]).toBe(story.questions.find((item) => item.id === q.id)!.options[0])
        }
      }
    }
  })
})

describe('the universe pays one scroll per story', () => {
  const KID = 'kid-1'
  beforeEach(() => useUniverseStore.setState({ byChild: {} }))

  it('recognises story activities', () => {
    expect(isStory('story:lost-lamb')).toBe(true)
    expect(isStory('story:')).toBe(false)
    expect(isStory('stories')).toBe(false)
    expect(paysScroll('tale:fox')).toBe(true)
    expect(paysScroll('words:4')).toBe(false)
  })

  it('the rule gives a scroll only the first time a story is finished', () => {
    const run = storyActivity('r1', KID, 'lost-lamb', 3, { total: 3, firstTry: 3 })
    const ctx = { previousBest: 0, partsToday: 0, partPaidToday: false }
    expect(activityEffects(run, ctx).scrolls).toBe(1)
    expect(activityEffects(run, { ...ctx, previousBest: 2 }).scrolls).toBe(0)
  })

  it('emitActivity pays once per story, idempotent by run and by story, with reason tale', () => {
    const first = emitActivity(storyActivity('r1', KID, 'lost-lamb', 2, { total: 3, firstTry: 2 }))
    expect(first.scrolls).toBe(1)
    // the same run again: nothing
    expect(
      emitActivity(storyActivity('r1', KID, 'lost-lamb', 2, { total: 3, firstTry: 3 })),
    ).toMatchObject({
      scrolls: 0,
      stars: 0,
    })
    // the same story read again: stars may improve, but no second scroll
    const again = emitActivity(storyActivity('r2', KID, 'lost-lamb', 2, { total: 3, firstTry: 3 }))
    expect(again.scrolls).toBe(0)
    expect(again.stars).toBe(3)
    // another story: its own scroll
    expect(
      emitActivity(storyActivity('r3', KID, 'grandma-garden', 2, { total: 3, firstTry: 3 }))
        .scrolls,
    ).toBe(1)
    expect(getResources(KID).scroll).toBe(2)
    const scrolls = resourceHistory(KID).filter((entry) => entry.resource === 'scroll')
    expect(scrolls.map((entry) => [entry.reason, entry.refId])).toEqual(
      expect.arrayContaining([
        ['tale', 'story:lost-lamb'],
        ['tale', 'story:grandma-garden'],
      ]),
    )
  })

  it('reports strand language, first-try answers and the level', () => {
    expect(storyActivity('r9', KID, 'star-night', 5, { total: 4, firstTry: 9 })).toEqual({
      id: 'r9',
      childKey: KID,
      activity: 'story:star-night',
      strand: 'language',
      correct: 4,
      total: 4,
      independent: 4,
      level: 5,
      oncePerDay: true,
    })
  })
})

describe('reading again is welcome but not farmed', () => {
  const KID = 'kid-2'
  beforeEach(() => useUniverseStore.setState({ byChild: {} }))
  const child = () => useUniverseStore.getState().byChild[KID]!
  const at = (day: string) => `${day}T10:00:00`

  it('only the first reading of a story a day counts for achievements and the level', () => {
    const run = (id: string, story: string, day: string) =>
      emitActivity({
        ...storyActivity(id, KID, story, 2, { total: 3, firstTry: 3 }),
        at: at(day),
      })
    run('a1', 'lost-lamb', '2026-10-20')
    const afterFirst = child()
    expect(afterFirst.stats.activities).toBe(1)
    expect(afterFirst.stats.byStrand.language).toBe(1)
    const strandsAfterFirst = afterFirst.strands

    // the same story again that day: the run is processed, but nothing is counted twice
    run('a2', 'lost-lamb', '2026-10-20')
    run('a3', 'lost-lamb', '2026-10-20')
    expect(child().processed).toEqual(expect.arrayContaining(['a1', 'a2', 'a3']))
    expect(child().stats.activities).toBe(1)
    expect(child().stats.byStrand.language).toBe(1)
    expect(child().strands).toEqual(strandsAfterFirst)

    // another story the same day counts
    run('a4', 'grandma-garden', '2026-10-20')
    expect(child().stats.activities).toBe(2)

    // the next day the first story counts once more
    run('a5', 'lost-lamb', '2026-10-21')
    expect(child().stats.activities).toBe(3)
    run('a6', 'lost-lamb', '2026-10-21')
    expect(child().stats.activities).toBe(3)
  })

  it('other activities still count every run', () => {
    for (const id of ['w1', 'w2']) {
      emitActivity({
        id,
        childKey: KID,
        activity: 'words:4',
        strand: 'language',
        correct: 3,
        total: 3,
        independent: 3,
        at: at('2026-10-20'),
      })
    }
    expect(child().stats.activities).toBe(2)
  })

  it('rotates the questions and the wrong answers from reading to reading', () => {
    for (const story of STORIES) {
      // level 1 asks two of the three who/what questions: each reading another pair
      const pairs = new Set(
        [0, 1, 2].map((reading) =>
          pickQuestions(story, 1, reading)
            .map((q) => q.id)
            .sort()
            .join('+'),
        ),
      )
      expect(pairs.size).toBeGreaterThan(1)
      // level 1 shows one wrong answer: it changes between readings
      const first = pickQuestions(story, 1, 0)[0]!
      const wrongs = new Set(
        [0, 1, 2, 3].flatMap((reading) =>
          pickQuestions(story, 1, reading)
            .filter((q) => q.id === first.id)
            .map((q) => q.options[1]),
        ),
      )
      expect(wrongs.size).toBe(2)
      // whatever the reading: the plan's kinds, the right answer first, no repeats
      for (let reading = 0; reading < 8; reading += 1) {
        for (const level of [1, 2, 3, 4, 5] as const) {
          const picked = pickQuestions(story, level, reading)
          expect(picked.length).toBe(pickQuestions(story, level).length)
          expect(new Set(picked.map((q) => q.id)).size).toBe(picked.length)
          for (const q of picked) {
            const spec = story.questions.find((item) => item.id === q.id)!
            expect(q.options[0]).toBe(spec.options[0])
            expect(new Set(q.options).size).toBe(q.options.length)
          }
        }
      }
    }
  })
})

describe('PRO gating', () => {
  it('premium stories need PRO and a child profile', () => {
    expect(entitlementFor('premiumStories', { paid: false, child: true })).toEqual({
      allowed: false,
      reason: 'pro',
    })
    expect(entitlementFor('premiumStories', { paid: true, child: false }).allowed).toBe(false)
    expect(entitlementFor('premiumStories', { paid: true, child: true }).allowed).toBe(true)
  })
})
