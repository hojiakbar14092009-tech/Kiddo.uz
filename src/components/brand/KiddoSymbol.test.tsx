import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KiddoMark } from './KiddoLogo'
import { KiddoSymbol } from './KiddoSymbol'
import { OPENING_SECONDS } from './opening'

/* Phase 32: the standalone symbol (no wordmark needed) and its opening. */

describe('KiddoSymbol', () => {
  it('is named when labelled and decorative otherwise, with every part of the story', () => {
    render(<KiddoSymbol label="Kiddo" />)
    const symbol = screen.getByRole('img', { name: 'Kiddo' })
    for (const part of ['light', 'star', 'world', 'orbit-back', 'orbit-front', 'moon']) {
      expect(symbol.querySelectorAll(`[data-part="${part}"]`)).toHaveLength(1)
    }
    // vector only, no text: it works without the name
    expect(symbol.querySelector('text, image, img')).toBeNull()
    const { container } = render(<KiddoSymbol />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('two symbols on one page keep their own gradients', () => {
    const { container } = render(
      <>
        <KiddoSymbol />
        <KiddoMark size={40} />
      </>,
    )
    const ids = [...container.querySelectorAll('linearGradient, radialGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('the opening, its pause and the exit last within the contract window', () => {
    // SplashScreen: the opening + 0.3 s on the settled symbol + a 0.35 s exit
    const total = OPENING_SECONDS + 0.3 + 0.35
    expect(total).toBeGreaterThanOrEqual(2.8)
    expect(total).toBeLessThanOrEqual(4)
  })
})
