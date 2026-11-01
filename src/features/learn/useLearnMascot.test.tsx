import { act, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { setLearnVoiceOn } from './voice'
import { useLearnMascot } from './useLearnMascot'

describe('useLearnMascot', () => {
  it('keeps `say` the same while the voice turns on and speaks (no saying loop)', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MemoryRouter>{children}</MemoryRouter>
    )
    const { result, rerender } = renderHook(() => useLearnMascot(), { wrapper })
    const first = result.current.say
    act(() => setLearnVoiceOn(true))
    rerender()
    expect(result.current.say).toBe(first)
    act(() => setLearnVoiceOn(false))
  })
})
