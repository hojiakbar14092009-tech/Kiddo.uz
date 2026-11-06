import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { audioManager, type SpeechStatus } from './audioManager'
import { afterVoice, LOADING_MAX_MS, QUIET_MS, whenVoiceDone } from './afterVoice'

/*
 * Moving on by itself: after an answer the praise is said, and the next question
 * comes only once Kiddo's voice has been quiet for a moment (QUIET_MS).
 */

let status: SpeechStatus = 'idle'
const listeners = new Set<(status: SpeechStatus) => void>()
const setStatus = (next: SpeechStatus) => {
  status = next
  listeners.forEach((listener) => listener(next))
}

beforeEach(() => {
  vi.useFakeTimers()
  status = 'idle'
  listeners.clear()
  vi.spyOn(audioManager, 'getStatus').mockImplementation(() => status)
  vi.spyOn(audioManager, 'subscribe').mockImplementation((listener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('moving on after the voice', () => {
  it('waits for the praise to end, then a quiet moment', async () => {
    setStatus('speaking')
    const run = vi.fn()
    whenVoiceDone(run, 500)
    await vi.advanceTimersByTimeAsync(3000)
    expect(run).not.toHaveBeenCalled()
    setStatus('idle')
    await vi.advanceTimersByTimeAsync(QUIET_MS - 50)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(100)
    expect(run).toHaveBeenCalledOnce()
  })

  it('a sentence starting in the quiet moment restarts the wait', async () => {
    const done = vi.fn()
    void afterVoice().then(done)
    await vi.advanceTimersByTimeAsync(QUIET_MS / 2)
    setStatus('loading')
    await vi.advanceTimersByTimeAsync(QUIET_MS)
    expect(done).not.toHaveBeenCalled()
    setStatus('idle')
    await vi.advanceTimersByTimeAsync(QUIET_MS + 10)
    expect(done).toHaveBeenCalledWith(true)
  })

  it('without a voice it goes on after the shortest wait', async () => {
    const run = vi.fn()
    whenVoiceDone(run, 2500)
    await vi.advanceTimersByTimeAsync(2500 + QUIET_MS - 10)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(20)
    expect(run).toHaveBeenCalledOnce()
  })

  it('a clip that never starts loading is not waited for long', async () => {
    setStatus('loading')
    const run = vi.fn()
    whenVoiceDone(run, 1000)
    await vi.advanceTimersByTimeAsync(LOADING_MAX_MS + QUIET_MS - 10)
    expect(run).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(20)
    expect(run).toHaveBeenCalledOnce()
  })

  it('a voice that is talking is heard to its end, however long', async () => {
    setStatus('loading')
    const run = vi.fn()
    whenVoiceDone(run)
    await vi.advanceTimersByTimeAsync(1000)
    setStatus('speaking')
    await vi.advanceTimersByTimeAsync(10_000)
    expect(run).not.toHaveBeenCalled()
    setStatus('idle')
    await vi.advanceTimersByTimeAsync(QUIET_MS + 10)
    expect(run).toHaveBeenCalledOnce()
  })

  it('a child pressing "Next" first cancels it', async () => {
    const run = vi.fn()
    const cancel = whenVoiceDone(run, 100)
    cancel()
    await vi.advanceTimersByTimeAsync(5000)
    expect(run).not.toHaveBeenCalled()
  })
})
