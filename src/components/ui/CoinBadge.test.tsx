import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CoinBadge } from './CoinBadge'

describe('CoinBadge', () => {
  it('shows how many nuts were just earned, and nothing for a spend', () => {
    const { rerender } = render(<CoinBadge amount={10} />)
    expect(screen.queryByTestId('coin-gain')).toBeNull()
    rerender(<CoinBadge amount={15} />)
    expect(screen.getByTestId('coin-gain')).toHaveTextContent('+5')
    expect(screen.getByRole('status')).toHaveAccessibleName(/15/)
    rerender(<CoinBadge amount={5} />)
    expect(screen.queryByTestId('coin-gain')).toBeNull()
  })
})
