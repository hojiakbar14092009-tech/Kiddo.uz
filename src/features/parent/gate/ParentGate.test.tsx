import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useSettingsStore } from '@/store/settingsStore'
import { LOCKOUT_SECONDS, ParentGate } from './ParentGate'

/** With Math.random() = 0 the gate always asks 3 × 3. */
describe('ParentGate', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useSettingsStore.setState({ language: 'uz' })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  function renderGate() {
    const onPass = vi.fn()
    const onCancel = vi.fn()
    render(<ParentGate onPass={onPass} onCancel={onCancel} />)
    const dialog = screen.getByRole('dialog', { name: 'Faqat kattalar uchun' })
    return { onPass, onCancel, dialog }
  }

  it('starts with focus inside and takes typed digits and Enter', () => {
    const { dialog, onPass } = renderGate()
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog.contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: '9' })
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onPass).toHaveBeenCalledTimes(1)
  })

  it('is not cancelled by a tap outside, only by Escape or “Back”', () => {
    const { dialog, onCancel } = renderGate()
    fireEvent.pointerDown(dialog.parentElement!)
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Orqaga' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('locks the keypad after three wrong answers, keeps focus inside, then opens again', () => {
    vi.useFakeTimers()
    const { dialog, onPass } = renderGate()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    }
    expect(screen.getByRole('button', { name: '9' })).toBeDisabled()
    expect(dialog.contains(document.activeElement)).toBe(true)
    // typing does nothing while locked
    fireEvent.keyDown(document.activeElement!, { key: '9' })
    fireEvent.keyDown(document.activeElement!, { key: 'Enter' })
    expect(onPass).not.toHaveBeenCalled()

    for (let second = 0; second < LOCKOUT_SECONDS; second += 1) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(screen.getByRole('button', { name: '9' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '9' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    expect(onPass).toHaveBeenCalledTimes(1)
  })
})
