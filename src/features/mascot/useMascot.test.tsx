import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { audioManager } from '@/services/audio/audioManager'
import { useSettingsStore } from '@/store/settingsStore'
import { useFamilyStore } from '@/store/familyStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { Mascot } from './Mascot'
import { useMascotStore } from './mascotStore'
import { resetMascotPhrases, useMascot } from './useMascot'

describe('useMascot', () => {
  beforeEach(() => {
    resetMascotPhrases()
    useSettingsStore.setState({ language: 'uz' })
    useMascotStore.getState().reset()
    useSubscriptionStore.getState().cancel()
    vi.spyOn(audioManager, 'play').mockImplementation(() => undefined)
    vi.spyOn(audioManager, 'speak').mockImplementation(async () => audioManager.canSpeak())
  })

  afterEach(() => vi.restoreAllMocks())

  it('on Free: thinks silently in a bubble and plays only the effect', () => {
    render(<Mascot />)
    const { result } = renderHook(() => useMascot())

    act(() => result.current.react('correct'))

    expect(screen.getByText('Yahoooo! Barakalla!')).toBeInTheDocument()
    expect(audioManager.play).toHaveBeenCalledWith('success')
    expect(audioManager.canSpeak()).toBe(false)
  })

  it('on PRO: says “Yahoooo!” and then praises in the child’s language', async () => {
    useSubscriptionStore.getState().setDemoPro(true)
    useFamilyStore.setState({ activeChildId: 'ali' })
    const { result } = renderHook(() => useMascot())

    await act(async () => result.current.react('correct'))

    expect(audioManager.speak).toHaveBeenNthCalledWith(
      1,
      [{ text: 'Yahoooo!' }],
      expect.objectContaining({ locale: 'en-US' }),
    )
    expect(audioManager.speak).toHaveBeenNthCalledWith(
      2,
      [expect.objectContaining({ text: 'Barakalla!' })],
      { language: 'uz' },
    )
  })

  it('announces a locked PRO feature without speaking', async () => {
    render(<Mascot />)
    const { result } = renderHook(() => useMascot())

    await act(async () => result.current.react('locked'))

    expect(screen.getByText('Ovozli o‘rganish PRO versiyada!')).toBeInTheDocument()
    expect(audioManager.speak).not.toHaveBeenCalled()
  })
})
