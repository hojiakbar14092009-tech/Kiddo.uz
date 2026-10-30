import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InterfaceSounds } from './InterfaceSounds'

const play = vi.hoisted(() => vi.fn())
const cues = vi.hoisted(() => ({ playBack: vi.fn(), playConfirm: vi.fn() }))
vi.mock('@/services/audio/audioManager', () => ({ audioManager: { play } }))
vi.mock('@/services/audio/soundLanguage', () => cues)

describe('InterfaceSounds', () => {
  beforeEach(() => {
    play.mockReset()
    cues.playBack.mockReset()
    cues.playConfirm.mockReset()
  })

  it('a tap clicks once even when taps come very fast; back and confirm have their own sound', () => {
    const { getByText } = render(
      <>
        <InterfaceSounds />
        <button type="button">go</button>
        <button type="button" data-sound="back">
          back
        </button>
        <button type="button" data-sound="confirm">
          yes
        </button>
        <button type="button" disabled>
          off
        </button>
      </>,
    )
    fireEvent.pointerDown(getByText('go'))
    fireEvent.pointerDown(getByText('go'))
    fireEvent.pointerDown(getByText('go'))
    expect(play).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(getByText('back'))
    expect(cues.playBack).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(getByText('yes'))
    expect(cues.playConfirm).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(getByText('off'))
    expect(play).toHaveBeenCalledTimes(1)
  })
})
