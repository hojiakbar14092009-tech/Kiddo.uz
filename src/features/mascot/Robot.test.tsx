import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PeekingMascot } from './PeekingMascot'
import { Robot } from './Robot'

describe('Robot', () => {
  it('is announced by its label', () => {
    render(<Robot model="boy" label="O‘g‘il robot" />)
    expect(screen.getByRole('img', { name: 'O‘g‘il robot' })).toBeInTheDocument()
  })

  it('is hidden from screen readers when it is only decoration', () => {
    const { container } = render(<Robot model="girl" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it.each(['idle', 'wave', 'talk', 'happy', 'oops'] as const)('renders the %s mood', (mood) => {
    const { container } = render(<Robot model="girl" mood={mood} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('PeekingMascot', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('peeks in with its message, then hides again', () => {
    render(<PeekingMascot message="Salom!" />)
    expect(screen.queryByText('Salom!')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByText('Salom!')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(8000))
    expect(screen.getByRole('button', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })
})
