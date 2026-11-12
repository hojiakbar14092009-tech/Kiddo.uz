import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSingleFlight } from './useSingleFlight'

function Pay({ action }: { action: () => Promise<unknown> }) {
  const [run, pending] = useSingleFlight(action)
  return (
    <button type="button" aria-busy={pending} onClick={() => void run()}>
      Pay
    </button>
  )
}

describe('useSingleFlight (second tap protection)', () => {
  it('runs the action once for a double tap, and again after it finished', async () => {
    let finish = () => {}
    const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    render(<Pay action={action} />)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(action).toHaveBeenCalledTimes(1)
    expect(button).toHaveAttribute('aria-busy', 'true')
    await act(async () => finish())
    expect(button).toHaveAttribute('aria-busy', 'false')
    fireEvent.click(button)
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('a failed action frees the button again', async () => {
    const action = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    // the screen shows its own message for a failure (the caller catches it)
    render(<Pay action={() => action().catch(() => undefined)} />)
    await act(async () => fireEvent.click(screen.getByRole('button')))
    await act(async () => fireEvent.click(screen.getByRole('button')))
    expect(action).toHaveBeenCalledTimes(2)
  })
})
