import { act, fireEvent, render, screen } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { Dialog } from './Dialog'
import { EmptyState } from './EmptyState'
import { ProgressBar, StepDots } from './Progress'
import { ProBadge } from './ProLock'
import { RewardBurst } from './RewardBurst'
import { toast, useToastStore } from './toast'
import { Toaster } from './Toaster'

function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false)
  const [closed, setClosed] = useState(0)
  const yes = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <span data-testid="closed">{closed}</span>
      {open && (
        <Dialog
          title="Buy the hat?"
          description="It costs 10 coins."
          dismissible={dismissible}
          initialFocus={yes}
          onClose={() => {
            setOpen(false)
            setClosed((count) => count + 1)
          }}
        >
          <button type="button">no</button>
          <button type="button" ref={yes}>
            yes
          </button>
        </Dialog>
      )}
    </>
  )
}

describe('Dialog', () => {
  it('is a labelled modal that takes focus, traps it, and gives it back', () => {
    render(<Harness />)
    const opener = screen.getByText('open')
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole('dialog', { name: 'Buy the hat?' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('It costs 10 coins.').id).toBe(dialog.getAttribute('aria-describedby'))
    expect(document.activeElement).toBe(screen.getByText('yes'))
    expect(document.body.style.overflow).toBe('hidden')

    // Tab from the last control wraps to the first
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('no'))

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on a backdrop tap only when dismissible', () => {
    const { unmount } = render(<Harness dismissible={false} />)
    fireEvent.click(screen.getByText('open'))
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.pointerDown(backdrop)
    expect(screen.getByRole('dialog')).toBeTruthy()
    // a tap inside never closes it
    fireEvent.pointerDown(screen.getByText('no'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    unmount()

    render(<Harness />)
    fireEvent.click(screen.getByText('open'))
    const outside = screen.getByRole('dialog').parentElement!
    fireEvent.pointerDown(outside)
    fireEvent.click(outside)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('closed').textContent).toBe('1')
  })

  it('a dialog opened inside another traps Tab in the inner one only', () => {
    function Nested() {
      const [asking, setAsking] = useState(false)
      return (
        <Dialog title="ad" onClose={() => setAsking(true)} dismissible={false}>
          <button type="button" onClick={() => setAsking(true)}>
            close ad
          </button>
          {asking && (
            <Dialog title="leave?" onClose={() => setAsking(false)}>
              <button type="button">leave</button>
              <button type="button">middle</button>
              <button type="button">keep watching</button>
            </Dialog>
          )}
        </Dialog>
      )
    }
    render(<Nested />)
    fireEvent.click(screen.getByText('close ad'))
    const inner = screen.getByRole('dialog', { name: 'leave?' })
    expect(inner.contains(document.activeElement)).toBe(true)
    screen.getByText('leave').focus()
    // Tab moves on normally inside the inner dialog: nothing pulls focus back
    const moved = fireEvent.keyDown(document, { key: 'Tab' })
    expect(moved).toBe(true)
    screen.getByText('keep watching').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('leave'))
    // Escape closes only the inner one; focus goes back into the outer
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'leave?' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'ad' })).toBeTruthy()
  })

  it('closes only when the whole tap is outside (press inside, release outside stays open)', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('open'))
    const backdrop = screen.getByRole('dialog').parentElement!
    fireEvent.pointerDown(screen.getByText('no'))
    fireEvent.click(backdrop)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('with two dialogs open, Escape closes only the top one', () => {
    const outer = vi.fn()
    const inner = vi.fn()
    render(
      <>
        <Dialog title="outer" onClose={outer} />
        <Dialog title="inner" onClose={inner} />
      </>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })
})

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.setState({ toasts: [] })
  })
  afterEach(() => vi.useRealTimers())

  it('shows calm notices, at most three, that leave on their own', () => {
    render(<Toaster />)
    act(() => {
      toast('one')
      toast('two', 'success')
      toast('three')
      toast('four', 'warning')
    })
    expect(screen.queryByText('one')).toBeNull()
    expect(screen.getByText('four')).toBeTruthy()
    expect(screen.getByText('four').closest('[aria-live]')?.getAttribute('aria-live')).toBe(
      'polite',
    )
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('four')).toBeNull()
  })

  it('a tap dismisses one early', () => {
    render(<Toaster />)
    act(() => {
      toast('saved')
    })
    fireEvent.click(screen.getByText('saved'))
    expect(screen.queryByText('saved')).toBeNull()
  })
})

describe('progress and small pieces', () => {
  it('ProgressBar and StepDots tell their numbers to screen readers', () => {
    render(
      <>
        <ProgressBar value={40} max={33} label="Letters" />
        <StepDots current={1} total={4} label="Question 2 of 4" />
      </>,
    )
    const bar = screen.getByRole('progressbar', { name: 'Letters' })
    expect(bar.getAttribute('aria-valuenow')).toBe('33')
    const dots = screen.getByRole('progressbar', { name: 'Question 2 of 4' })
    expect(dots.getAttribute('aria-valuenow')).toBe('2')
    expect(dots.children).toHaveLength(4)
  })

  it('EmptyState, ProBadge and RewardBurst render their content', () => {
    render(
      <>
        <EmptyState title="No children yet" text="Add a profile." action={<button>Add</button>} />
        <span className="relative">
          <ProBadge />
        </span>
        <RewardBurst>
          <span>+5</span>
        </RewardBurst>
      </>,
    )
    expect(screen.getByText('No children yet')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add' })).toBeTruthy()
    expect(screen.getByText('PRO').closest('[aria-hidden="true"]')).toBeTruthy()
    expect(screen.getByText('+5')).toBeTruthy()
  })
})
