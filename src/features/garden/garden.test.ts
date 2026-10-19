import { describe, expect, it } from 'vitest'
import { LANGUAGES } from '@/content/languages'
import { getLearnChild } from '@/features/learn/learnStore'
import { seeded } from '@/features/learn/random'
import { markHelp, newSheet, recordAnswer, summarize } from '@/features/learn/session'
import { GARDEN_ITEMS, taskPrompt, type GardenTask } from './content'
import { buildBoard, OBJECTS_BY_LEVEL, pickTasks, START, tap, taskPool } from './game'
import {
  acceptHint,
  afterMistake,
  afterWait,
  NO_HELP,
  pressHelp,
  reveals,
  showsOffer,
  wiggleKey,
} from './help'
import { SPOKEN } from './spoken'

// the 3D pictures that really exist in public/3d (file names only, nothing is loaded)
const ASSETS = new Set(
  Object.keys(import.meta.glob('/public/3d/*.webp', { query: '?url' })).map((path) =>
    path.replace('/public/3d/', '').replace('.webp', ''),
  ),
)

const task = (id: string, level: 4 | 5 | 6 = 6): GardenTask => {
  const found = taskPool(level).find((candidate) => candidate.id === id)
  if (!found) throw new Error(id)
  return found
}

describe('garden tasks', () => {
  it('asks naturally in each language', () => {
    expect(taskPrompt(task('find:apple', 4), 'uz')).toBe('Olmani top!')
    expect(taskPrompt(task('where:butterfly', 4), 'uz')).toBe('Kapalak qayerda?')
    expect(taskPrompt(task('category3:flower'), 'uz')).toBe('Uchta gulni top!')
    expect(taskPrompt(task('count2:pear', 5), 'ru')).toBe('Найди две груши!')
    expect(taskPrompt(task('count2:apple', 5), 'ru')).toBe('Найди два яблока!')
    expect(taskPrompt(task('where:butterfly', 4), 'ru')).toBe('Где бабочка?')
    expect(taskPrompt(task('category3:fruit'), 'en')).toBe('Find three fruits!')
    expect(taskPrompt(task('count3:tomato'), 'en')).toBe('Find three tomatoes!')
  })

  it('gets harder with age: more things, counting at 5, groups at 6', () => {
    expect(OBJECTS_BY_LEVEL).toEqual({ 4: 4, 5: 6, 6: 8 })
    expect(new Set(taskPool(4).map((t) => t.kind))).toEqual(new Set(['find', 'where']))
    expect(new Set(taskPool(5).map((t) => t.kind))).toEqual(new Set(['find', 'where', 'count']))
    expect(taskPool(6).some((t) => t.kind === 'category')).toBe(true)
    // counting is only asked about things, never animals
    const animals = new Set(GARDEN_ITEMS.filter((i) => i.animal).map((i) => i.asset))
    taskPool(6)
      .filter((t) => t.kind === 'count')
      .forEach((t) => expect(animals.has(t.target)).toBe(false))
  })

  it('has 3, 4 and 5 tasks in a session for ages 4, 5 and 6', () => {
    const learn = getLearnChild('nobody')
    for (const [level, length] of [
      [4, 3],
      [5, 4],
      [6, 5],
    ] as const) {
      const tasks = pickTasks(level, 'uz', learn, seeded(level))
      expect(tasks).toHaveLength(length)
      expect(new Set(tasks.map((t) => t.id)).size).toBe(length)
    }
  })

  it('lays out the right things plus different others, all present', () => {
    for (let seed = 1; seed < 30; seed += 1) {
      for (const level of [4, 5, 6] as const) {
        for (const item of taskPool(level)) {
          const board = buildBoard(item, level, seeded(seed))
          expect(board).toHaveLength(Math.max(OBJECTS_BY_LEVEL[level], item.count + 2))
          expect(new Set(board.map((o) => o.key)).size).toBe(board.length)
          const targets = board.filter((o) => o.target)
          expect(targets).toHaveLength(item.count)
          if (item.kind === 'category') {
            const group = new Set(
              GARDEN_ITEMS.filter((i) => i.category === item.category).map((i) => i.asset),
            )
            targets.forEach((o) => expect(group.has(o.asset)).toBe(true))
            board
              .filter((o) => !o.target)
              .forEach((o) => {
                expect(group.has(o.asset)).toBe(false)
                expect(['strawberry', 'mushroom']).not.toContain(o.asset)
              })
          } else {
            // the wanted thing is there exactly `count` times, nothing else looks like it
            expect(board.filter((o) => o.asset === item.target)).toHaveLength(item.count)
          }
        }
      }
    }
  })

  it('uses only pictures that exist in public/3d', () => {
    expect(ASSETS.size).toBeGreaterThan(100)
    for (const item of [
      ...GARDEN_ITEMS.map((i) => i.asset),
      'sun',
      'cloud',
      'butterfly',
      'trophy',
      'glowing-star',
    ]) {
      expect(ASSETS.has(item), item).toBe(true)
    }
  })
})

describe('counting taps', () => {
  const two = task('count2:apple', 5)
  const board = buildBoard(two, 5, seeded(7))
  const [first, second] = board.filter((o) => o.target)
  const other = board.find((o) => !o.target)!

  it('counts each wanted thing once, however often it is tapped', () => {
    let step = tap(board, START, first!.key, 2)
    expect(step.result).toBe('found')
    step = tap(board, step.state, first!.key, 2)
    expect(step.result).toBe('already')
    expect(step.state.found).toEqual([first!.key])
    step = tap(board, step.state, second!.key, 2)
    expect(step.result).toBe('done')
    expect(step.state.found).toHaveLength(2)
    // after it is done nothing more is counted
    expect(tap(board, step.state, other.key, 2).result).toBe('over')
  })

  it('counts a different thing as a mistake, not as a find', () => {
    const step = tap(board, START, other.key, 2)
    expect(step.result).toBe('wrong')
    expect(step.state).toEqual({ found: [], mistakes: 1 })
  })
})

describe('help in steps', () => {
  it('goes instruction → soft hint → wiggle, one step at a time', () => {
    const one = pressHelp(NO_HELP)
    const two = pressHelp(one)
    const three = pressHelp(two)
    expect([one.level, two.level, three.level, pressHelp(three).level]).toEqual([1, 2, 3, 3])
    expect([reveals(one.level), reveals(two.level), reveals(three.level)]).toEqual([
      false,
      true,
      true,
    ])
  })

  it('offers a soft hint after two mistakes or a long wait', () => {
    expect(afterMistake(NO_HELP, 1).offered).toBe(false)
    expect(afterMistake(NO_HELP, 2).offered).toBe(true)
    expect(afterWait(NO_HELP).offered).toBe(true)
    // accepting it goes to the soft hint, not straight to the answer
    expect(acceptHint(afterWait(NO_HELP)).level).toBe(2)
  })

  it('offers by itself only while learning; a test just lights the help button', () => {
    const stuck = afterWait(NO_HELP)
    expect(showsOffer(stuck, 'learn')).toBe(true)
    expect(showsOffer(stuck, 'test')).toBe(false)
    expect(showsOffer(acceptHint(stuck), 'learn')).toBe(false)
  })

  it('wiggles only one wanted thing that is not found yet, and only at the last step', () => {
    const three = task('category3:fruit')
    const board = buildBoard(three, 6, seeded(3))
    const targets = board.filter((o) => o.target)
    expect(wiggleKey(2, board, [])).toBeNull()
    expect(wiggleKey(3, board, [])).toBe(targets[0]!.key)
    expect(wiggleKey(3, board, [targets[0]!.key])).toBe(targets[1]!.key)
    expect(
      wiggleKey(
        3,
        board,
        targets.map((o) => o.key),
      ),
    ).toBeNull()
  })

  it('marks a test answer as helped when a revealing hint came first', () => {
    const q = { id: 'find:apple', skill: 'find' }
    const r = { id: 'find:pear', skill: 'find' }
    let sheet = newSheet('test')
    // instruction only (step 1) is not marked
    if (reveals(pressHelp(NO_HELP).level)) sheet = markHelp(sheet, q.id)
    sheet = recordAnswer(sheet, q, 'found', true)
    // soft hint (step 2) before answering → helped
    if (reveals(pressHelp(pressHelp(NO_HELP)).level)) sheet = markHelp(sheet, r.id)
    sheet = recordAnswer(sheet, r, 'found', true)
    const summary = summarize(sheet, 2)
    expect(summary).toMatchObject({ independent: 1, helped: 1, wrong: 0 })
  })
})

describe('spoken sentences', () => {
  it('lists every task and help sentence in every language', () => {
    for (const language of LANGUAGES) {
      const spoken = new Set(SPOKEN[language])
      for (const level of [4, 5, 6] as const) {
        taskPool(level).forEach((t) => expect(spoken.has(taskPrompt(t, language))).toBe(true))
      }
      expect(SPOKEN[language].every((line) => line.trim().length > 0)).toBe(true)
    }
  })
})
