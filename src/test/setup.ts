import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { MotionGlobalConfig } from 'framer-motion'
import { afterEach, vi } from 'vitest'
import { registerLanguage } from '@/i18n'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { useSettingsStore } from '@/store/settingsStore'

// tests switch languages synchronously: every language is there from the start
registerLanguage('ru', ru)
registerLanguage('en', en)

// Instructions read on their own (Phase 41) are tested where they are meant to be
// (SpeakButton.test.tsx); elsewhere a test's fake clips never end, so it is off.
useSettingsStore.setState({ autoVoice: false })

afterEach(async () => {
  cleanup()
  localStorage.clear()
  useSettingsStore.setState({ autoVoice: false })
  // loaded here, not at the top: a test file's own mocks (e.g. @/config/demo)
  // must apply to these modules too
  const [{ resetAutoRead }, { setLearnVoiceOn }] = await Promise.all([
    import('@/features/learn/speakable'),
    import('@/features/learn/voice'),
  ])
  resetAutoRead()
  setLearnVoiceOn(false)
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
      const onplay = this.options.onplay
      if (typeof onplay === 'function') onplay(1)
      const onend = this.options.onend
      if (typeof onend === 'function') queueMicrotask(() => onend())
      return 1
    }
    volume() {
      return this
    }
    unload() {
      return undefined
    }
    stop() {
      const onstop = this.options.onstop
      if (typeof onstop === 'function') onstop(1)
      return this
    }
  }
  return { Howl, Howler: { volume: () => undefined } }
})

// Animations finish instantly in tests, so assertions see the end state.
MotionGlobalConfig.skipAnimations = true

// jsdom has no canvas; behave like a browser without 2D/WebGL support.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext

// jsdom has no IntersectionObserver: everything counts as on screen (framer-motion useInView)
if (typeof globalThis.IntersectionObserver === 'undefined') {
  class Visible {
    private readonly callback: IntersectionObserverCallback
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }
    observe(target: Element) {
      this.callback(
        [{ isIntersecting: true, target } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      )
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  globalThis.IntersectionObserver = Visible as unknown as typeof IntersectionObserver
}
