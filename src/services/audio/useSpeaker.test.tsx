import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uzAlphabet } from '@/content/alphabet/uz'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { audioManager } from './audioManager'
import { letterPauseMs } from './pace'
import { useSpeaker } from './useSpeaker'

describe('sayLetter (Phase 41)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz', slowVoice: false })
    useFamilyStore.setState({ children: [], activeChildId: null })
    vi.spyOn(audioManager, 'canSpeak').mockReturnValue(true)
  })
  afterEach(() => vi.restoreAllMocks())

  it('says the letter, waits, then says its word; slower when a parent asks', async () => {
    const speak = vi.spyOn(audioManager, 'speak').mockResolvedValue(true)
    const letter = uzAlphabet.letters[1]!
    const { result, rerender } = renderHook(() => useSpeaker())
    await act(() => result.current.sayLetter(letter))
    const [items] = speak.mock.calls[0]!
    expect(items.map((item) => item.text)).toEqual([letter.spoken, letter.word])
    // a guest is treated as the default age level
    const normal = items[0]!.pauseAfterMs!
    expect(normal).toBeGreaterThanOrEqual(letterPauseMs(6, false))
    act(() => useSettingsStore.setState({ slowVoice: true }))
    rerender()
    await act(() => result.current.sayLetter(letter))
    expect(speak.mock.calls[1]![0][0]!.pauseAfterMs).toBe(Math.round(normal * 1.6))
  })
})
