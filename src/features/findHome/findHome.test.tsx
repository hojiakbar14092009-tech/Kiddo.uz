import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import { useUniverseStore } from '@/domain/universe/store'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import { BANNED_WORDS, FIND_PROMPTS, praiseKeyFor, promptsForDay } from './prompts'
import {
  FIND_HOME_NUTS,
  FIND_HOME_PAID_PER_DAY,
  findHomeRef,
  foundToday,
  paidFindsOn,
  rewardFound,
} from './reward'

const LOCALES = { uz, ru, en } as const

/** Words of each clause of a sentence (as the voice test counts them). */
const clauseWords = (text: string) =>
  text
    .split(/[.!?…:;—–]+/)
    .map((part) => part.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)))

const coins = (key: string) => useProgressStore.getState().byChild[key]?.coins ?? 0

function child(id: string, gender: 'girl' | 'boy' = 'boy') {
  return {
    id,
    name: id === 'kid' ? 'Ali' : 'Lola',
    birthDate: birthDateForAge(5, dayKey()),
    celebratedLevel: 5 as const,
    gender,
    mascot: gender,
    dailyLimitMinutes: 60,
    createdAt: new Date().toISOString(),
  }
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [child('kid'), child('sis', 'girl')], activeChildId: 'kid' })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
})

describe('find-at-home prompts', () => {
  it('has about twenty unique prompts, each said in all three languages', () => {
    expect(FIND_PROMPTS.length).toBe(20)
    expect(new Set(FIND_PROMPTS.map((prompt) => prompt.id)).size).toBe(FIND_PROMPTS.length)
    for (const [, locale] of Object.entries(LOCALES)) {
      const prompts = locale.findHome.say.prompts as Record<string, string>
      expect(Object.keys(prompts).sort()).toEqual(FIND_PROMPTS.map((p) => p.id).sort())
    }
  })

  it('asks only for safe things inside the home', () => {
    for (const prompt of FIND_PROMPTS) {
      const texts = [
        prompt.id,
        prompt.picture ?? '',
        prompt.drawing ?? '',
        ...Object.values(LOCALES).map(
          (locale) => (locale.findHome.say.prompts as Record<string, string>)[prompt.id]!,
        ),
      ].map((text) => text.toLowerCase())
      for (const banned of BANNED_WORDS) {
        for (const text of texts) expect(text, `${prompt.id}: ${banned}`).not.toContain(banned)
      }
    }
  })

  it('asks the child to show a thing, never to bring it', () => {
    expect(uz.findHome.say.safe).toBe('Ko‘rsatib ber, ko‘tarma!')
    expect(ru.findHome.say.safe).toBe('Просто покажи пальчиком!')
    expect(en.findHome.say.safe).toBe('Just point to it!')
    const show = { uz: /ko‘rsat/i, ru: /покажи/i, en: /show me|point to/i } as const
    for (const [language, locale] of Object.entries(LOCALES)) {
      for (const text of Object.values(locale.findHome.say.prompts as Record<string, string>)) {
        expect(text).toMatch(show[language as keyof typeof show])
        expect(text.toLowerCase()).not.toMatch(/\btop!|найди|\bfind\b|bring|olib kel|принеси/)
      }
    }
    // breakable, ticking or round-anything prompts were replaced
    const ids = FIND_PROMPTS.map((prompt) => prompt.id)
    for (const gone of ['cup', 'clock', 'round']) expect(ids).not.toContain(gone)
    for (const added of ['pillow', 'slipper', 'blanket']) expect(ids).toContain(added)
  })

  it('draws every thing from an existing picture or as SVG', () => {
    for (const prompt of FIND_PROMPTS) {
      if (prompt.kind === 'colour') expect(prompt.colour).toMatch(/^#[0-9A-F]{6}$/i)
      else if (prompt.kind === 'shape') expect(prompt.shape).toBeTruthy()
      else if (prompt.drawing) expect(['pillow', 'slipper', 'blanket']).toContain(prompt.drawing)
      else expect(existsSync(join(process.cwd(), 'public/3d', `${prompt.picture}.webp`))).toBe(true)
    }
  })

  it('says short sentences (at most 8 words) to the child', () => {
    for (const locale of Object.values(LOCALES)) {
      const say = locale.findHome.say
      const lines = [
        say.intro,
        say.safe,
        say.praise1,
        say.praise2,
        say.praise3,
        ...Object.values(say.prompts),
      ]
      for (const line of lines) {
        for (const words of clauseWords(line)) expect(words.length, line).toBeLessThanOrEqual(8)
        expect(line).not.toMatch(/\{\{/)
      }
    }
  })

  it('starts each day at its own place, the same all day, with every prompt in it', () => {
    const today = promptsForDay('2026-11-02')
    expect(today.map((p) => p.id).sort()).toEqual(FIND_PROMPTS.map((p) => p.id).sort())
    expect(promptsForDay('2026-11-02')).toEqual(today)
    const starts = new Set(
      ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map((d) => promptsForDay(d)[0]!.id),
    )
    expect(starts.size).toBeGreaterThan(1)
    expect(praiseKeyFor(FIND_PROMPTS[0]!)).toBe('findHome.say.praise1')
  })
})

describe('find-at-home nuts', () => {
  it('pays each prompt once a day per child, through the reward ledger', () => {
    const day = '2026-11-02'
    expect(rewardFound('kid', 'spoon', day)).toEqual({ outcome: 'paid', nuts: FIND_HOME_NUTS })
    expect(rewardFound('kid', 'spoon', day)).toEqual({ outcome: 'again', nuts: 0 })
    expect(coins('kid')).toBe(FIND_HOME_NUTS)
    expect(foundToday('kid', 'spoon', day)).toBe(true)
    // another prompt, another day and another child are paid on their own
    expect(rewardFound('kid', 'book', day).nuts).toBe(FIND_HOME_NUTS)
    expect(rewardFound('kid', 'spoon', '2026-11-03').nuts).toBe(FIND_HOME_NUTS)
    expect(foundToday('sis', 'spoon', day)).toBe(false)
    expect(rewardFound('sis', 'spoon', day).nuts).toBe(FIND_HOME_NUTS)
    expect(coins('kid')).toBe(FIND_HOME_NUTS * 3)
    expect(coins('sis')).toBe(FIND_HOME_NUTS)
    const entry = rewardHistory('kid').find((item) => item.refId === findHomeRef('spoon', day))
    expect(entry).toMatchObject({ reason: 'learn', coins: FIND_HOME_NUTS })
  })

  it('pays only the first three finds of a day per child: then praise only', () => {
    const day = '2026-11-02'
    const ids = FIND_PROMPTS.map((prompt) => prompt.id)
    const results = ids.map((id) => rewardFound('kid', id, day))
    expect(results.filter((r) => r.outcome === 'paid')).toHaveLength(FIND_HOME_PAID_PER_DAY)
    expect(results.slice(FIND_HOME_PAID_PER_DAY).every((r) => r.outcome === 'capped')).toBe(true)
    expect(coins('kid')).toBe(FIND_HOME_NUTS * FIND_HOME_PAID_PER_DAY)
    expect(paidFindsOn('kid', day)).toBe(FIND_HOME_PAID_PER_DAY)
    // a paid prompt pressed again is still "again", not "capped"
    expect(rewardFound('kid', ids[0]!, day).outcome).toBe('again')
    // the next day and another child start fresh
    expect(rewardFound('kid', ids[5]!, '2026-11-03').outcome).toBe('paid')
    expect(rewardFound('sis', ids[5]!, day).outcome).toBe('paid')
  })
})

describe('the find-at-home page', () => {
  it('asks to show a thing, praises "Topdim!" and pays only the first press', async () => {
    const { user } = await renderRoute('/explore/find-home')
    const first = promptsForDay(dayKey())[0]!
    expect(screen.getByTestId('find-prompt')).toHaveTextContent(
      (uz.findHome.say.prompts as Record<string, string>)[first.id]!,
    )
    expect(screen.getByTestId('find-safe')).toHaveTextContent(uz.findHome.say.safe)
    // the live region is there from the start, empty
    const status = screen.getByTestId('find-result')
    expect(status).toHaveAttribute('role', 'status')
    expect(status).toBeEmptyDOMElement()
    expect(screen.getByTestId('find-progress')).toHaveTextContent('0 / 3')
    await user.click(screen.getByRole('button', { name: 'Topdim!' }))
    expect(screen.getByTestId('find-result')).toHaveTextContent(`+${FIND_HOME_NUTS} yong‘oq`)
    expect(screen.getByTestId('find-progress')).toHaveTextContent('1 / 3')
    await user.click(screen.getByRole('button', { name: 'Topdim!' }))
    expect(screen.getByTestId('find-result')).toHaveTextContent(uz.findHome.already)
    expect(coins('kid')).toBe(FIND_HOME_NUTS)
    // the next prompt is a new one; the same status element is emptied
    await user.click(screen.getByTestId('find-next'))
    expect(screen.getByTestId('find-result')).toBe(status)
    expect(status).toBeEmptyDOMElement()
    expect(screen.getByTestId('find-prompt')).not.toHaveTextContent(
      (uz.findHome.say.prompts as Record<string, string>)[first.id]!,
    )
  })

  it('after three paid finds says calmly that today’s nuts are collected', async () => {
    const { user } = await renderRoute('/explore/find-home')
    for (let i = 0; i < FIND_HOME_PAID_PER_DAY; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Topdim!' }))
      await user.click(screen.getByTestId('find-next'))
    }
    await user.click(screen.getByRole('button', { name: 'Topdim!' }))
    expect(screen.getByTestId('find-result')).toHaveTextContent(uz.findHome.capped)
    expect(coins('kid')).toBe(FIND_HOME_NUTS * FIND_HOME_PAID_PER_DAY)
  })

  it('a result shown to one child is not shown to the next', async () => {
    const { user } = await renderRoute('/explore/find-home')
    await user.click(screen.getByRole('button', { name: 'Topdim!' }))
    expect(screen.getByTestId('find-result')).not.toBeEmptyDOMElement()
    act(() => useFamilyStore.setState({ activeChildId: 'sis' }))
    expect(screen.getByTestId('find-result')).toBeEmptyDOMElement()
    expect(screen.getByTestId('find-progress')).toHaveTextContent('0 / 3')
  })

  it('says "Нашла!" to a girl in Russian', async () => {
    useSettingsStore.setState({ language: 'ru' })
    useFamilyStore.setState({ activeChildId: 'sis' })
    await renderRoute('/explore/find-home')
    expect(screen.getByRole('button', { name: 'Нашла!' })).toBeInTheDocument()
  })

  it('has its tile in Kashf et', async () => {
    await renderRoute('/explore')
    expect(screen.getByRole('link', { name: 'Uyda top' })).toHaveAttribute(
      'href',
      '/explore/find-home',
    )
  })

  it('one round is ten things, then a finish with "play again" (never an endless list)', async () => {
    const { user } = await renderRoute('/explore/find-home')
    expect(screen.getByTestId('find-step')).toHaveTextContent('1 / 10')
    for (let i = 0; i < 10; i += 1) await user.click(screen.getByTestId('find-next'))
    expect(screen.getByTestId('find-done')).toHaveTextContent('10 ta narsani')
    await user.click(screen.getByTestId('find-again'))
    expect(screen.getByTestId('find-step')).toHaveTextContent('1 / 10')
  })
})
