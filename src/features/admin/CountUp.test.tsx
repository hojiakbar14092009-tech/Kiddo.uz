import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COUNT_UP_MS, CountUp } from './CountUp'
import { countUpConfig } from './countUpConfig'

/** An observer that reports the element as visible as soon as it is watched. */
class VisibleObserver {
  readonly callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
  }
  observe(target: Element) {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
  disconnect() {}
  unobserve() {}
  takeRecords() {
    return []
  }
}

/** What a sighted person sees: the moving frame, or the plain number at rest. */
function shownText() {
  const element = screen.getByTestId('n')
  return (element.querySelector('[aria-hidden="true"]') ?? element).textContent
}

function setReducedMotion(reduce: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: reduce && query.includes('reduce'),
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  )
}

// the test setup switches counting off everywhere else
beforeEach(() => {
  countUpConfig.skip = false
})

afterEach(() => {
  countUpConfig.skip = true
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CountUp (Phase 54)', () => {
  it('counts from 0 to the value within the set time', async () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    setReducedMotion(false)
    expect(COUNT_UP_MS).toBeGreaterThanOrEqual(600)
    expect(COUNT_UP_MS).toBeLessThanOrEqual(800)
    render(<CountUp value={1250} testId="n" />)
    expect(shownText()).toBe('0')
    // screen readers always get the real number, never the frames
    expect(screen.getByTestId('n').querySelector('.sr-only')!.textContent).toBe('1250')
    // at rest: one plain number, nothing doubled for copy and paste
    await waitFor(() => expect(screen.getByTestId('n').textContent).toBe('1250'), {
      timeout: COUNT_UP_MS + 1000,
    })
  })

  it('shows the real number at once with reduced motion', () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    setReducedMotion(true)
    render(<CountUp value={42} testId="n" />)
    expect(shownText()).toBe('42')
  })

  it('shows the real number at once when switched off (tests)', () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    setReducedMotion(false)
    countUpConfig.skip = true
    render(<CountUp value={5} testId="n" />)
    expect(screen.getByTestId('n').textContent).toBe('5')
  })

  it('never shows NaN', () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    setReducedMotion(true)
    render(<CountUp value={Number.NaN} testId="n" />)
    expect(screen.getByTestId('n').textContent).toBe('0')
  })

  it('starts anyway when the tile never reports being on screen', async () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
        takeRecords() {
          return []
        }
      },
    )
    setReducedMotion(false)
    render(<CountUp value={9} testId="n" />)
    expect(shownText()).toBe('0')
    await waitFor(() => expect(shownText()).toBe('9'), { timeout: 1500 + COUNT_UP_MS + 1000 })
  })

  it('shows the real number at once where nothing can watch it', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    setReducedMotion(false)
    render(<CountUp value={7} testId="n" format={(n) => `${Math.round(n)}%`} />)
    expect(shownText()).toBe('7%')
  })

  it('moves from the old value to a new one', async () => {
    vi.stubGlobal('IntersectionObserver', VisibleObserver)
    setReducedMotion(false)
    const { rerender } = render(<CountUp value={10} testId="n" />)
    await waitFor(() => expect(shownText()).toBe('10'), { timeout: COUNT_UP_MS + 1000 })
    act(() => rerender(<CountUp value={20} testId="n" />))
    expect(Number(shownText())).toBeLessThan(20)
    await waitFor(() => expect(shownText()).toBe('20'), { timeout: COUNT_UP_MS + 1000 })
  })
})
