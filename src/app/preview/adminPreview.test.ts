import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  exitAdminPreview,
  installAdminPreview,
  isAdminPreview,
  MemoryStorage,
  openAdminPreview,
  PREVIEW_CHILD_ID,
  PREVIEW_FLAG,
  resetAdminPreviewForTests,
} from './adminPreview'

/** The page's real localStorage, put back after each test. */
const own = Object.getOwnPropertyDescriptor(window, 'localStorage')
const real = window.localStorage

function restoreStorage() {
  if (own) Object.defineProperty(window, 'localStorage', own)
  else Reflect.deleteProperty(window, 'localStorage')
}

const NOW = new Date('2026-11-02T09:00:00Z')
const AZIZ = JSON.stringify({ state: { children: [{ id: 'kid', name: 'Aziz' }] }, version: 3 })

describe('admin preview sandbox (Phase 51)', () => {
  beforeEach(() => {
    resetAdminPreviewForTests()
    sessionStorage.clear()
    real.clear()
    real.setItem('kiddo.family', AZIZ)
    window.history.replaceState(null, '', '/home')
  })

  afterEach(() => {
    restoreStorage()
    resetAdminPreviewForTests()
    sessionStorage.clear()
    delete document.documentElement.dataset.kiddoPreview
    window.history.replaceState(null, '', '/')
  })

  it('MemoryStorage behaves like Storage and keeps strings', () => {
    const memory = new MemoryStorage()
    expect(memory.length).toBe(0)
    memory.setItem('a', '1')
    memory.setItem('b', 2 as unknown as string)
    expect(memory.getItem('b')).toBe('2')
    expect(memory.length).toBe(2)
    expect(memory.key(0)).toBe('a')
    expect(memory.key(5)).toBeNull()
    memory.removeItem('a')
    expect(memory.getItem('a')).toBeNull()
    memory.clear()
    expect(memory.length).toBe(0)
  })

  it('without the flag nothing changes', () => {
    expect(installAdminPreview(window, NOW)).toBe(false)
    expect(isAdminPreview()).toBe(false)
    expect(window.localStorage).toBe(real)
    expect(sessionStorage.getItem(PREVIEW_FLAG)).toBeNull()
  })

  it('with ?kiddoPreview=1: an in-memory sandbox child, remembered for the tab', () => {
    window.history.replaceState(null, '', '/home?kiddoPreview=1&x=2#top')
    expect(installAdminPreview(window, NOW)).toBe(true)
    expect(isAdminPreview()).toBe(true)
    expect(window.localStorage).toBeInstanceOf(MemoryStorage)
    expect(window.localStorage).not.toBe(real)
    const family = JSON.parse(window.localStorage.getItem('kiddo.family') ?? 'null') as {
      state: { children: { id: string; name: string; birthDate: string }[]; activeChildId: string }
      version: number
    }
    expect(family.version).toBe(3)
    expect(family.state.activeChildId).toBe(PREVIEW_CHILD_ID)
    expect(family.state.children.map((child) => child.name)).toEqual(['Mehmon'])
    expect(family.state.children[0]?.birthDate).toBe('2020-10-03')
    expect(JSON.parse(window.localStorage.getItem('kiddo.settings') ?? 'null')).toEqual({
      state: { language: 'uz', volume: 0.8, onboarded: true },
      version: 2,
    })
    expect(window.localStorage.getItem('kiddo.e2e.tours')).toBe('off')
    // remembered per tab, and the address no longer carries the flag
    expect(sessionStorage.getItem(PREVIEW_FLAG)).toBe('1')
    expect(`${location.pathname}${location.search}${location.hash}`).toBe('/home?x=2#top')
    expect(document.documentElement.dataset.kiddoPreview).toBe('1')

    // the app writes as usual: only the sandbox changes
    window.localStorage.setItem('kiddo.family', '{"changed":true}')
    window.localStorage.setItem('kiddo.progress', '{"coins":5}')
    window.localStorage.clear()
    expect(real.getItem('kiddo.family')).toBe(AZIZ)
    expect(real.getItem('kiddo.progress')).toBeNull()
    expect(real.length).toBe(1)
  })

  it('a reload of the sandbox tab (flag only in sessionStorage) stays the sandbox', () => {
    sessionStorage.setItem(PREVIEW_FLAG, '1')
    expect(installAdminPreview(window, NOW)).toBe(true)
    expect(window.localStorage).toBeInstanceOf(MemoryStorage)
    expect(window.localStorage.getItem('kiddo.family')).toContain('Mehmon')
    expect(real.getItem('kiddo.family')).toBe(AZIZ)
  })

  it('isAdminPreview reads the tab flag when nothing was installed yet', () => {
    expect(isAdminPreview()).toBe(false)
    resetAdminPreviewForTests()
    sessionStorage.setItem(PREVIEW_FLAG, '1')
    expect(isAdminPreview()).toBe(true)
  })

  it('the admin button opens /home with the flag in a new tab, without access to the panel', () => {
    const open = vi.fn()
    openAdminPreview({ open } as unknown as Window)
    expect(open).toHaveBeenCalledWith('/home?kiddoPreview=1', '_blank', 'noopener')
  })

  it('"Chiqish" closes the tab; where the browser refuses, the admin panel without the sandbox', () => {
    const replace = vi.fn()
    const fake = (closes: boolean) => {
      const win = {
        closed: false,
        sessionStorage,
        location: { replace },
        close: () => {
          if (closes) win.closed = true
        },
      }
      return win as unknown as Window
    }
    sessionStorage.setItem(PREVIEW_FLAG, '1')
    exitAdminPreview(fake(true))
    expect(sessionStorage.getItem(PREVIEW_FLAG)).toBeNull()
    expect(replace).not.toHaveBeenCalled()

    sessionStorage.setItem(PREVIEW_FLAG, '1')
    exitAdminPreview(fake(false))
    expect(sessionStorage.getItem(PREVIEW_FLAG)).toBeNull()
    expect(replace).toHaveBeenCalledWith('/admin')
  })
})
