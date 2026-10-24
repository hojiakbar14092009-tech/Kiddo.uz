import { afterEach, describe, expect, it, vi } from 'vitest'
import { onIdle } from './onIdle'

describe('onIdle', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('uses requestIdleCallback with a deadline when the browser has it', () => {
    const request = vi.fn(() => 7)
    const cancel = vi.fn()
    vi.stubGlobal('requestIdleCallback', request)
    vi.stubGlobal('cancelIdleCallback', cancel)
    const task = vi.fn()
    const stop = onIdle(task, 900)
    expect(request).toHaveBeenCalledWith(task, { timeout: 900 })
    stop()
    expect(cancel).toHaveBeenCalledWith(7)
  })

  it('falls back to a short timer, which can be cancelled', () => {
    vi.useFakeTimers()
    vi.stubGlobal('requestIdleCallback', undefined)
    const task = vi.fn()
    onIdle(task)
    vi.advanceTimersByTime(250)
    expect(task).toHaveBeenCalledOnce()
    const other = vi.fn()
    const stop = onIdle(other)
    stop()
    vi.advanceTimersByTime(500)
    expect(other).not.toHaveBeenCalled()
  })
})
