import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { enAlphabet } from '@/content/alphabet/en'
import { ruAlphabet } from '@/content/alphabet/ru'
import { uzAlphabet } from '@/content/alphabet/uz'
import { MATERIAL, wordText } from '@/features/firstWords/content'
import { audioManager } from '@/services/audio/audioManager'
import { childPhrases } from '@/services/audio/childPhrases'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { renderRoute } from '@/test/renderRoute'
import { TRI_LANGUAGES, TRI_WORDS } from './content'

vi.mock('@/config/demo', () => ({
  DEMO: { demoMode: false, publicProUIEnabled: true, demoAdminEnabled: false },
}))

const ALPHABETS = { uz: uzAlphabet, ru: ruAlphabet, en: enAlphabet } as const

/** The words Kiddo already teaches in a language (alphabet words and first words), small letters. */
function knownWords(language: 'uz' | 'ru' | 'en'): Set<string> {
  const material = MATERIAL[language]
  return new Set([
    ...ALPHABETS[language].letters.map((letter) => letter.word),
    ...[...material.initial, ...material.build, ...material.read].map((word) =>
      wordText(word).toLocaleLowerCase(language),
    ),
    ...material.sentences.map((sentence) => sentence.focus.toLocaleLowerCase(language)),
  ])
}

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  // PRO voice belongs to a child's profile
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
  useSubscriptionStore.getState().cancel()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('three-language words', () => {
  it('has 30 words with a picture and all three languages', () => {
    expect(TRI_WORDS).toHaveLength(30)
    expect(new Set(TRI_WORDS.map((item) => item.id)).size).toBe(30)
    for (const item of TRI_WORDS) {
      expect(existsSync(join(process.cwd(), 'public/3d', `${item.picture}.webp`))).toBe(true)
      for (const language of TRI_LANGUAGES) expect(item.words[language].trim()).not.toBe('')
      // Uzbek is written with the alphabet's ʻ, never a quote mark
      expect(item.words.uz).not.toMatch(/[‘’'`]/)
    }
  })

  it('takes most words from what Kiddo already teaches in each language', () => {
    for (const language of TRI_LANGUAGES) {
      const known = knownWords(language)
      const reused = TRI_WORDS.filter((item) => known.has(item.words[language]))
      expect(reused.length, language).toBeGreaterThanOrEqual(20)
    }
  })

  it('gives every word to the voice recorder in its own language', () => {
    const phrases = childPhrases()
    for (const item of TRI_WORDS) {
      for (const language of TRI_LANGUAGES) {
        expect(phrases[language]).toContain(item.words[language])
      }
    }
  })
})

describe('the three-language card', () => {
  it('shows the three words in their own languages, the rest in the child’s language', async () => {
    await renderRoute('/learn/three-words')
    expect(screen.getByRole('heading', { level: 1, name: 'Uch tilli so‘z' })).toBeInTheDocument()
    const first = TRI_WORDS[0]!
    // the name is the visible content, so the word keeps its own lang (no aria-label)
    expect(screen.getByTestId('tri-word-uz')).toHaveAccessibleName('O‘zbekcha: Olma')
    expect(screen.getByTestId('tri-word-ru')).toHaveAccessibleName('Ruscha: Яблоко')
    expect(screen.getByTestId('tri-word-en')).not.toHaveAttribute('aria-label')
    for (const language of TRI_LANGUAGES) {
      const label = screen.getByTestId(`tri-word-${language}`).querySelector('[lang]')
      expect(label).toHaveAttribute('lang', language)
      expect(label?.textContent?.toLocaleLowerCase(language)).toBe(first.words[language])
    }
    expect(screen.getByTestId('tri-counter')).toHaveTextContent('1 / 30')
  })

  it('says each word in that word’s language (PRO)', async () => {
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    const say = vi.spyOn(audioManager, 'say').mockResolvedValue('done')
    const { user } = await renderRoute('/learn/three-words')
    await user.click(screen.getByTestId('tri-next'))
    const second = TRI_WORDS[1]!
    for (const language of ['ru', 'en', 'uz'] as const) {
      await user.click(screen.getByTestId(`tri-word-${language}`))
      await waitFor(() =>
        expect(say).toHaveBeenLastCalledWith(
          [{ text: second.words[language] }],
          { language },
          { requirePro: true, quiet: false },
        ),
      )
    }
  })

  it('stops the word being said when the card changes', async () => {
    const stop = vi.spyOn(audioManager, 'stopSpeech')
    const { user } = await renderRoute('/learn/three-words')
    const before = stop.mock.calls.length
    await user.click(screen.getByTestId('tri-next'))
    expect(stop.mock.calls.length).toBeGreaterThan(before)
    await user.click(screen.getByTestId('tri-prev'))
    expect(screen.getByTestId('tri-counter')).toHaveTextContent('1 / 30')
  })

  it('on Free plays nothing and the robot says the voice is PRO', async () => {
    const say = vi.spyOn(audioManager, 'say')
    const { user } = await renderRoute('/learn/three-words')
    await user.click(screen.getByTestId('tri-word-en'))
    expect(say).not.toHaveBeenCalled()
  })

  it('has its tile in O‘rgan', async () => {
    await renderRoute('/learn')
    expect(screen.getByRole('link', { name: 'Uch tilli so‘z' })).toHaveAttribute(
      'href',
      '/learn/three-words',
    )
    expect(screen.getByRole('link', { name: 'O‘z ertagim' })).toHaveAttribute(
      'href',
      '/learn/my-story',
    )
  })
})
