/*
 * Admin preview (Phase 51, docs/architecture/admin-preview-51.md): the admin
 * opens the child app in a new tab (`/home?kiddoPreview=1`) to look at it as a
 * child would. That tab is a sandbox:
 *
 * - its `window.localStorage` is an in-memory Storage seeded with one throwaway
 *   child ("Mehmon"), installed before any store module is evaluated, so the
 *   real family's data on this device is never read or written. This module
 *   installs it itself, on evaluation (bottom of the file), and is the first
 *   import of main.tsx. It must be a module of its own and not a call in
 *   main.tsx or a file inlined into the entry chunk: the bundler runs the
 *   entry chunk's own code only after every chunk it imports (the stores,
 *   which hydrate on import), while a module's own chunk runs in import order.
 *   main.tsx checks it worked before the first render (fail closed);
 * - it never reaches the server: `isAdminPreview()` switches off the Supabase
 *   client, cloud sync, analytics sending, Edge Functions and the AI tutor.
 *
 * The flag is remembered in sessionStorage, which is per tab (and not copied
 * into a tab opened with `noopener`), so reloads and in-app navigation stay in
 * the sandbox while every other tab keeps the real app.
 *
 * The query flag needs no protection: anyone who types it only gets an empty
 * sandbox with nothing saved and nothing sent. The button that opens it exists
 * only inside the signed-in admin panel.
 *
 * Kept tiny and free of imports: it is on the first-screen path of every visit.
 */

/** `?kiddoPreview=1` opens the sandbox. */
export const PREVIEW_PARAM = 'kiddoPreview'
/** sessionStorage key: this tab is the sandbox (per tab, gone with the tab). */
export const PREVIEW_FLAG = 'kiddo.adminPreview'
/** The throwaway child's id; never a real profile. */
export const PREVIEW_CHILD_ID = 'admin-preview'

/** A Storage that lives in memory only: everything is gone with the page. */
export class MemoryStorage implements Storage {
  [name: string]: unknown
  readonly #items = new Map<string, string>()

  get length(): number {
    return this.#items.size
  }

  clear(): void {
    this.#items.clear()
  }

  getItem(key: string): string | null {
    return this.#items.get(String(key)) ?? null
  }

  key(index: number): string | null {
    return [...this.#items.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.#items.delete(String(key))
  }

  setItem(key: string, value: string): void {
    this.#items.set(String(key), String(value))
  }
}

let active: boolean | null = null

function readFlag(): boolean {
  try {
    return typeof window !== 'undefined' && window.sessionStorage.getItem(PREVIEW_FLAG) === '1'
  } catch {
    return false
  }
}

/** True in the admin's sandbox tab: nothing may be sent to the server or kept. */
export function isAdminPreview(): boolean {
  active ??= readFlag()
  return active
}

/**
 * The sandbox child: six years old, playing in Uzbek, onboarded, the welcome
 * tours off (the same seed the browser tests use, e2e/phase49.spec.ts).
 */
export function seedSandbox(storage: Storage, now: Date): void {
  const put = (key: string, state: unknown, version: number) =>
    storage.setItem(key, JSON.stringify({ state, version }))
  storage.setItem('kiddo.e2e.tours', 'off')
  put('kiddo.settings', { language: 'uz', volume: 0.8, onboarded: true }, 2)
  const born = new Date(now)
  born.setFullYear(born.getFullYear() - 6)
  // a month past the birthday: no birthday party on the first screen
  born.setDate(born.getDate() - 30)
  put(
    'kiddo.family',
    {
      children: [
        {
          id: PREVIEW_CHILD_ID,
          name: 'Mehmon',
          birthDate: born.toISOString().slice(0, 10),
          celebratedLevel: 6,
          gender: 'boy',
          mascot: 'boy',
          dailyLimitMinutes: 600,
          createdAt: now.toISOString(),
          homeworks: [],
        },
      ],
      activeChildId: PREVIEW_CHILD_ID,
    },
    3,
  )
}

/**
 * Turns this tab into the sandbox when it was opened with the flag (or was
 * already the sandbox before a reload). Returns whether it did. Throws when
 * the in-memory storage could not be put in place, so the app never starts on
 * the real data in a tab that should be the sandbox (fail closed).
 */
export function installAdminPreview(win: Window = window, now: Date = new Date()): boolean {
  const url = new URL(win.location.href)
  const asked = url.searchParams.get(PREVIEW_PARAM) === '1'
  let remembered = false
  try {
    remembered = win.sessionStorage.getItem(PREVIEW_FLAG) === '1'
  } catch {
    remembered = false
  }
  if (!asked && !remembered) {
    active = false
    return false
  }

  const memory = new MemoryStorage()
  seedSandbox(memory, now)
  Object.defineProperty(win, 'localStorage', {
    value: memory,
    configurable: true,
    enumerable: true,
    writable: false,
  })
  if (win.localStorage !== memory) {
    throw new Error('[kiddo preview] the sandbox storage could not be installed')
  }
  active = true
  win.document.documentElement.dataset.kiddoPreview = '1'

  if (asked) {
    try {
      win.sessionStorage.setItem(PREVIEW_FLAG, '1')
      // remembered for this tab: the address no longer needs the flag
      url.searchParams.delete(PREVIEW_PARAM)
      win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`)
    } catch {
      // sessionStorage refused: the flag stays in the address, so a reload is still the sandbox
    }
  }
  return true
}

/**
 * "Chiqish": closes the sandbox tab. A browser that refuses to let a script
 * close the tab gets the admin panel instead, as a full page load without the
 * sandbox flag (the in-memory child is dropped with the page).
 */
export function exitAdminPreview(win: Window = window): void {
  try {
    win.sessionStorage.removeItem(PREVIEW_FLAG)
  } catch {
    // nothing remembered: the reload below is a normal page anyway
  }
  win.close()
  if (!win.closed) win.location.replace('/admin')
}

/** The admin panel's "Ilovani ochish": a new tab, without access to this one. */
export function openAdminPreview(win: Window = window): void {
  win.open(`/home?${PREVIEW_PARAM}=1`, '_blank', 'noopener')
}

/** Tests only. */
export function resetAdminPreviewForTests(value: boolean | null = null): void {
  active = value
}

// On evaluation, before any store module: see the comment at the top.
if (typeof window !== 'undefined') installAdminPreview()
