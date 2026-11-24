import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CoinBadge } from './CoinBadge'

describe('CoinBadge', () => {
  it('shows how many nuts were just earned, and nothing for a spend', () => {
    // the hopping nut and the rising "+N" are siblings: equal keys made React warn
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { rerender } = render(<CoinBadge amount={10} />)
    expect(screen.queryByTestId('coin-gain')).toBeNull()
    rerender(<CoinBadge amount={15} />)
    expect(screen.getByTestId('coin-gain')).toHaveTextContent('+5')
    expect(screen.getByRole('status')).toHaveAccessibleName(/15/)
    rerender(<CoinBadge amount={5} />)
    expect(screen.queryByTestId('coin-gain')).toBeNull()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
