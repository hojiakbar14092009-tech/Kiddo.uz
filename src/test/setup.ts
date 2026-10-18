import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom has no matchMedia; Framer Motion uses it for prefers-reduced-motion.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList,
  })
}

// Howler needs real audio hardware; tests only care that sounds are requested.
vi.mock('howler', () => {
  class Howl {
    static instances: Howl[] = []
    options: Record<string, unknown>
    constructor(options: Record<string, unknown>) {
      this.options = options
      Howl.instances.push(this)
    }
    play() {
      const onend = this.options.onend
      if (typeof onend === 'function') queueMicrotask(() => onend())
      return 1
    }
    volume() {
      return this
    }
  }
  return { Howl, Howler: { volume: () => undefined } }
})
