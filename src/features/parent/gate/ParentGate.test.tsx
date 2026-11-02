import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { useParentGateStore } from '@/store/parentStore'
import { useSettingsStore } from '@/store/settingsStore'
import { LOCKOUT_SECONDS, ParentGate } from './ParentGate'
import { createMathQuestion, MAX_ANSWER_DIGITS } from './mathQuestion'

/** With Math.random() = 0 the gate always asks 12 × 3. */
describe('ParentGate', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useSettingsStore.setState({ language: 'uz' })
    useParentGateStore.getState().unlock()
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
    fireEvent.keyDown(document.activeElement!, { key: '3' })
    fireEvent.keyDown(document.activeElement!, { key: '6' })
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
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '6' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    expect(onPass).toHaveBeenCalledTimes(1)
  })

  it('keeps the rest when the gate is closed and opened again (Phase 46)', () => {
    vi.useFakeTimers()
    renderGate()
    for (let attempt = 0; attempt < 3; attempt += 1) {
      fireEvent.click(screen.getByRole('button', { name: '1' }))
      fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    }
    cleanup()
    renderGate()
    expect(screen.getByRole('button', { name: '9' })).toBeDisabled()
    expect(screen.getByText(/30 soniyadan keyin/)).toBeInTheDocument()
    // and on a reload: the rest is on the device
    expect(JSON.parse(localStorage.getItem('kiddo.gate.lock')!).lockedUntil).toBeGreaterThan(
      Date.now(),
    )
  })

  it('counts wrong answers across openings, and a right answer starts the count again', () => {
    renderGate()
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    cleanup()
    expect(useParentGateStore.getState().wrongInRow).toBe(1)
    const { onPass } = renderGate()
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: '6' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tekshirish' }))
    expect(onPass).toHaveBeenCalledTimes(1)
    expect(useParentGateStore.getState().wrongInRow).toBe(0)
  })
})

describe('the grown-ups question', () => {
  it('has no answer that comes up more than twice in 56', () => {
    const counts = new Map<number, number>()
    for (let a = 0; a < 8; a += 1) {
      for (let b = 0; b < 7; b += 1) {
        const values = [a / 8 + 0.01, b / 7 + 0.01]
        const { answer } = createMathQuestion(() => values.shift()!)
        counts.set(answer, (counts.get(answer) ?? 0) + 1)
      }
    }
    expect([...counts.values()].reduce((sum, n) => sum + n, 0)).toBe(56)
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(2)
    expect(Math.max(...counts.keys())).toBe(171)
    expect(String(171).length).toBeLessThanOrEqual(MAX_ANSWER_DIGITS)
  })
})

describe('the open parent area', () => {
  it('stays open while the parent works, never reopens a closed one', () => {
    const store = useParentGateStore.getState()
    store.open(1_000)
    store.touch(1_000 + 9 * 60_000)
    expect(useParentGateStore.getState().openedAt).toBe(1_000 + 9 * 60_000)
    store.close()
    store.touch(2_000_000)
    expect(useParentGateStore.getState().openedAt).toBeNull()
    store.open(0)
    store.touch(11 * 60_000)
    expect(useParentGateStore.getState().openedAt).toBe(0)
  })
})
