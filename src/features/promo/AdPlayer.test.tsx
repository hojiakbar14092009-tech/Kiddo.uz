import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'
import { AdPlayer } from './AdPlayer'
import type { PlayableAd } from './promoBackend'

const AD: PlayableAd = {
  id: 'ad1',
  title: 'Kuzgi chegirma',
  duration: 10,
  src: 'blob:ad',
  release: () => undefined,
}

describe('AdPlayer', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  function renderPlayer() {
    const onComplete = vi.fn()
    const onCancel = vi.fn()
    render(<AdPlayer ad={AD} onComplete={onComplete} onCancel={onCancel} onError={vi.fn()} />)
    return { onComplete, onCancel, dialog: screen.getByRole('dialog', { name: 'Reklama' }) }
  }

  it('cannot be closed by Escape or a tap: Escape only asks, and “keep watching” goes on', () => {
    const { dialog, onCancel } = renderPlayer()
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.pointerDown(dialog.parentElement!)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    const ask = screen.getByRole('alertdialog')
    expect(onCancel).not.toHaveBeenCalled()
    // Escape on the question means “keep watching”, not “leave”
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(ask).not.toBeInTheDocument()
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'Reklama' })).toBeInTheDocument()
  })

  it('leaves without a code only after the explicit second answer', () => {
    const { onCancel, onComplete } = renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Yopish' }))
    screen.getByRole('alertdialog', { name: 'Hozir yopsangiz, promokod berilmaydi. Yopasizmi?' })
    // the safe answer has focus
    expect(screen.getByRole('button', { name: 'Ko‘rishda davom etish' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Ha, yopish' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onComplete).not.toHaveBeenCalled()
  })
})
