import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { act, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRewardStore } from '@/domain/rewards'
import { useUniverseStore } from '@/domain/universe/store'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { childPhrases } from '@/services/audio/childPhrases'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'
import {
  allStoryLineKeys,
  CHOICE_PICTURE,
  ENDINGS,
  HELPERS,
  HEROES,
  PLACES,
  storyCards,
} from './content'
import { MAX_SAVED_STORIES, useMyStoryStore } from './store'

// a production (non-demo) build: PRO gates the voice there
vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

const LOCALES = { uz, ru, en } as const

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[part]
    return undefined
  }, tree)
}

const clauseWords = (text: string) =>
  text
    .split(/[.!?…:;—–]+/)
    .map((part) => part.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)))

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({
    children: [
      {
        id: 'kid',
        name: 'Ali',
        birthDate: birthDateForAge(5, dayKey()),
        celebratedLevel: 5,
        gender: 'boy',
        mascot: 'boy',
        dailyLimitMinutes: 60,
        createdAt: new Date().toISOString(),
      },
    ],
    activeChildId: 'kid',
  })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
  useMyStoryStore.setState({ byChild: {} })
})

describe('own story sentences', () => {
  it('maps each choice to its own fixed sentences, in order', () => {
    const cards = storyCards({ hero: 'cat', place: 'sea', helper: 'key', ending: 'friend' })
    expect(cards.map((card) => card.id)).toEqual(['hero', 'place', 'helper', 'ending'])
    expect(cards.map((card) => card.lines)).toEqual([
      ['myStory.say.hero.cat', 'myStory.say.heroDream'],
      ['myStory.say.place.sea.a', 'myStory.say.place.sea.b'],
      ['myStory.say.helper.key.a', 'myStory.say.helper.key.b'],
      ['myStory.say.ending.friend.a', 'myStory.say.ending.friend.b', 'myStory.say.theEnd'],
    ])
    // the place's look and the chosen pictures are in the cards
    expect(cards[1]!.picture.backdrop).toBe('pond')
    expect(cards[2]!.picture.actors.map((actor) => actor.asset)).toContain('key')
    expect(cards[3]!.picture.actors.map((actor) => actor.asset)).toContain('hedgehog')
  })

  it('every sentence exists in all three languages, complete and short (≤ 8 words)', () => {
    const keys = allStoryLineKeys()
    // 4 prompts + ready + 12 heroes + dream + 2×(12 places + 12 helpers + 12 endings) + the end
    expect(keys).toHaveLength(4 + 1 + 12 + 1 + 2 * (12 + 12 + 12) + 1)
    for (const [language, locale] of Object.entries(LOCALES)) {
      for (const key of keys) {
        const text = lookup(locale, key)
        expect(typeof text, `${language} ${key}`).toBe('string')
        expect(text as string).not.toMatch(/\{\{/)
        for (const words of clauseWords(text as string)) {
          expect(words.length, `${language} ${key}`).toBeLessThanOrEqual(8)
        }
      }
    }
  })

  it('gives every choice a name, a picture and its lines to the voice recorder', () => {
    const phrases = childPhrases()
    for (const [step, ids] of [
      ['hero', HEROES],
      ['place', PLACES],
      ['helper', HELPERS],
      ['ending', ENDINGS],
    ] as const) {
      for (const id of ids) {
        const picture = CHOICE_PICTURE[step][id]!
        expect(existsSync(join(process.cwd(), 'public/3d', `${picture}.webp`))).toBe(true)
        for (const locale of Object.values(LOCALES)) {
          expect(typeof lookup(locale, `myStory.names.${step}.${id}`)).toBe('string')
        }
      }
    }
    for (const [language, locale] of Object.entries(LOCALES)) {
      for (const key of allStoryLineKeys()) {
        expect(phrases[language as 'uz']).toContain(lookup(locale, key))
      }
    }
  })
})

describe('the child’s last stories', () => {
  it('keeps the last three per child, the newest first, and forgets a removed child', () => {
    const { save, removeChild } = useMyStoryStore.getState()
    const heroes = ['rabbit', 'cat', 'dog', 'penguin'] as const
    for (const hero of heroes) save('kid', { hero, place: 'forest', helper: 'key', ending: 'home' })
    save('sis', { hero: 'cat', place: 'sea', helper: 'umbrella', ending: 'party' })
    const kid = useMyStoryStore.getState().byChild.kid!
    expect(kid).toHaveLength(MAX_SAVED_STORIES)
    expect(kid.map((story) => story.hero)).toEqual(['penguin', 'dog', 'cat'])
    expect(useMyStoryStore.getState().byChild.sis!.map((story) => story.hero)).toEqual(['cat'])
    removeChild('kid')
    expect(useMyStoryStore.getState().byChild.kid).toBeUndefined()
    expect(useMyStoryStore.getState().byChild.sis).toHaveLength(1)
  })
})

describe('own stories leave with their child', () => {
  const story = { hero: 'dog', place: 'city', helper: 'balloon', ending: 'party' } as const

  it('removing a profile forgets its stories', async () => {
    useMyStoryStore.getState().save('kid', story)
    useFamilyStore.getState().removeChild('kid')
    await waitFor(() => expect(useMyStoryStore.getState().byChild.kid).toBeUndefined())
  })

  it('a new guest does not see the last guest’s stories', async () => {
    useMyStoryStore.getState().save(GUEST_KEY, story)
    useMyStoryStore.getState().save('kid', story)
    useProgressStore.getState().startGuest()
    await waitFor(() => expect(useMyStoryStore.getState().byChild[GUEST_KEY]).toBeUndefined())
    expect(useMyStoryStore.getState().byChild.kid).toHaveLength(1)
  })
})

describe('the own story page', () => {
  it('shows only the active child’s last stories', async () => {
    useFamilyStore.setState((state) => ({
      children: [...state.children, { ...state.children[0]!, id: 'sis', name: 'Lola' }],
    }))
    useMyStoryStore.getState().save('kid', {
      hero: 'dog',
      place: 'city',
      helper: 'balloon',
      ending: 'party',
    })
    useMyStoryStore.getState().save('sis', {
      hero: 'cat',
      place: 'sea',
      helper: 'key',
      ending: 'home',
    })
    await renderRoute('/learn/my-story')
    const recent = () => screen.getByTestId('my-story-recent')
    expect(recent()).toHaveTextContent('Puppy, City')
    expect(recent()).not.toHaveTextContent('Kitten')
    act(() => useFamilyStore.setState({ activeChildId: 'sis' }))
    expect(recent()).toHaveTextContent('Kitten, Sea')
    expect(recent()).not.toHaveTextContent('Puppy')
  })

  it('builds a story in four picture steps and plays it card by card', async () => {
    const { user } = await renderRoute('/learn/my-story')
    expect(screen.getByTestId('my-story-prompt')).toHaveTextContent(en.myStory.say.pickHero)
    await user.click(screen.getByRole('button', { name: 'Penguin' }))
    expect(screen.getByTestId('my-story-prompt')).toHaveTextContent(en.myStory.say.pickPlace)
    await user.click(screen.getByRole('button', { name: 'Space' }))
    await user.click(screen.getByRole('button', { name: 'Lantern' }))
    expect(screen.getByTestId('my-story-prompt')).toHaveTextContent(en.myStory.say.pickEnding)
    await user.click(screen.getByRole('button', { name: 'Party' }))

    const text = () => screen.getByTestId('my-story-text')
    expect(text()).toHaveTextContent(en.myStory.say.hero.penguin)
    await user.click(screen.getByTestId('my-story-next'))
    expect(text()).toHaveTextContent(en.myStory.say.place.space.a)
    expect(text()).toHaveTextContent(en.myStory.say.place.space.b)
    await user.click(screen.getByTestId('my-story-next'))
    expect(text()).toHaveTextContent(en.myStory.say.helper.lantern.b)
    await user.click(screen.getByTestId('my-story-next'))
    expect(text()).toHaveTextContent(en.myStory.say.ending.party.a)
    expect(text()).toHaveTextContent(en.myStory.say.theEnd)
    expect(screen.queryByTestId('my-story-next')).not.toBeInTheDocument()

    // kept for this child, and shown again on the first step
    expect(useMyStoryStore.getState().byChild.kid).toMatchObject([
      { hero: 'penguin', place: 'space', helper: 'lantern', ending: 'party' },
    ])
    await user.click(screen.getByTestId('my-story-again'))
    expect(screen.getByTestId('my-story-recent')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'See the story again: Penguin, Space' }))
    expect(screen.getByTestId('my-story-text')).toHaveTextContent(en.myStory.say.hero.penguin)
  })

  it('on Free, "Read to me" shows the calm PRO note', async () => {
    const { user } = await renderRoute('/learn/my-story')
    for (const id of ['rabbit', 'forest', 'umbrella', 'home']) {
      await user.click(screen.getByTestId(`my-story-choice-${id}`))
    }
    await user.click(screen.getByTestId('my-story-narrate'))
    expect(screen.getByTestId('my-story-note')).toHaveTextContent(en.learn.voiceLocked)
  })
})
