import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { canUse, useCanUse } from '@/domain/entitlements'
import { isSupabaseConfigured } from '@/services/supabase/config'
import { useParentStore } from '@/store/parentStore'
import type { TutorReply, TutorRequest } from './types'

/*
 * The browser's side of the AI tutor (docs/architecture/ai-tutor.md §3). It
 * never talks to an AI provider and holds no key: it asks Kiddo's `tutor`
 * Edge Function, which checks sign-in, PRO and the parent's consent, calls a
 * free provider and validates the reply. Anything but a valid reply means
 * "no AI this time" (null) and the activity keeps Kiddo's own hint.
 *
 * Availability, in order: a Kiddo server exists (cloud build) → the AI helper
 * is enabled in this build (VITE_AI_TUTOR, owner blocker B5) → a parent is
 * signed in with a cloud account → PRO (`aiFriend`) → the parent switched the
 * tutor on for this child → the server is not resting after a used-up quota.
 */

/** Must match KIDDO_TUTOR_PROMPT_VERSION on the server: consent is given for this policy. */
export const TUTOR_POLICY_VERSION = '1'
/** Above the server's provider budget (8 s) plus its database checks, so a paid-for reply is not dropped. */
export const AI_TIMEOUT_MS = 12_000
const REST_DEFAULT_MS = 5 * 60_000
const REST_RATE_LIMITED_MS = 2 * 60_000

export type AiAvailability =
  'no-server' | 'disabled' | 'no-account' | 'not-pro' | 'off' | 'resting' | 'ready'

/**
 * The AI helper exists in this build only with `VITE_AI_TUTOR=true`, set by
 * the owner once a provider may legally be used for children (blocker B5)
 * and is configured on the server. Off by default: no switch is offered, and
 * the app never asks the server.
 */
export const AI_TUTOR_ENABLED = import.meta.env.VITE_AI_TUTOR === 'true'

interface ConsentState {
  /** The parent's choice per child, as the server last confirmed it. */
  byChild: Record<string, { granted: boolean; version: string }>
  set: (childId: string, granted: boolean) => void
  forget: (childId: string) => void
}

export const useAiConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      byChild: {},
      set: (childId, granted) =>
        set((state) => ({
          byChild: { ...state.byChild, [childId]: { granted, version: TUTOR_POLICY_VERSION } },
        })),
      forget: (childId) =>
        set((state) => {
          const byChild = { ...state.byChild }
          delete byChild[childId]
          return { byChild }
        }),
    }),
    { name: 'kiddo.ai-tutor', version: 1 },
  ),
)

/**
 * The tutor rests (quota used up, rate limit, server error) until `until`;
 * memory only. `resting` flips back by itself, so screens need no clock.
 */
const useRestStore = create<{ until: number; resting: boolean }>()(() => ({
  until: 0,
  resting: false,
}))
let restTimer: ReturnType<typeof setTimeout> | undefined

function restUntil(until: number, now: number): void {
  useRestStore.setState({ until, resting: true })
  clearTimeout(restTimer)
  restTimer = setTimeout(() => useRestStore.setState({ resting: false }), Math.max(0, until - now))
}

export function resetAiClientForTests(): void {
  clearTimeout(restTimer)
  useRestStore.setState({ until: 0, resting: false })
}

function consentGiven(childId: string): boolean {
  const entry = useAiConsentStore.getState().byChild[childId]
  return entry?.granted === true && entry.version === TUTOR_POLICY_VERSION
}

function cloudSession(): boolean {
  return useParentStore.getState().session?.mode === 'cloud'
}

export function aiAvailability(childId: string, now: number = Date.now()): AiAvailability {
  if (!isSupabaseConfigured) return 'no-server'
  if (!AI_TUTOR_ENABLED) return 'disabled'
  if (!cloudSession()) return 'no-account'
  if (!canUse('aiFriend')) return 'not-pro'
  if (!consentGiven(childId)) return 'off'
  if (now < useRestStore.getState().until) return 'resting'
  return 'ready'
}

/** The same, for React (re-renders when the consent, the session or PRO changes). */
export function useAiAvailability(childId: string): AiAvailability {
  const isPro = useCanUse('aiFriend')
  const cloud = useParentStore((state) => state.session?.mode === 'cloud')
  const consent = useAiConsentStore((state) => state.byChild[childId])
  const resting = useRestStore((state) => state.resting)
  if (!isSupabaseConfigured) return 'no-server'
  if (!AI_TUTOR_ENABLED) return 'disabled'
  if (!cloud) return 'no-account'
  if (!isPro) return 'not-pro'
  if (!(consent?.granted && consent.version === TUTOR_POLICY_VERSION)) return 'off'
  return resting ? 'resting' : 'ready'
}

const CODES = new Set(['encouraging', 'calm', 'curious', 'proud'])
const ACTIONS = new Set(['retry', 'look', 'count', 'next'])

/** The server validated it; the browser checks the shape again before showing it. */
export function readReply(body: unknown, request: TutorRequest): TutorReply | null {
  const reply = (body as { reply?: unknown } | null)?.reply as Partial<TutorReply> | undefined
  if (!reply || typeof reply.message !== 'string') return null
  const message = reply.message.trim()
  if (message.length === 0 || message.length > 280) return null
  // never the answer before the last step (also checked on the server)
  if (request.hintLevel < 4 && /^\d+$/.test(request.item.answer)) {
    const numbers: string[] = message.match(/(?<!\d|\d\.)\d{1,3}(?!\d|\.\d)/g) ?? []
    const inTask: string[] = request.item.expression.match(/\d+/g) ?? []
    if (numbers.includes(request.item.answer) && !inTask.includes(request.item.answer)) return null
  }
  return {
    message,
    emotion: CODES.has(String(reply.emotion))
      ? (reply.emotion as TutorReply['emotion'])
      : 'encouraging',
    hintLevel: request.hintLevel,
    recommendedAction: ACTIONS.has(String(reply.recommendedAction))
      ? (reply.recommendedAction as TutorReply['recommendedAction'])
      : 'retry',
  }
}

type Caller = (name: string, payload: unknown) => Promise<{ status: number; body: unknown } | null>

async function defaultCaller(name: string, payload: unknown) {
  const { callEdgeFunction } = await import('@/services/audio/edgeFunctions')
  return callEdgeFunction(name, payload)
}

/**
 * One tutor reply from Kiddo's server, or null (not available, timed out,
 * refused, invalid). Never throws; never retries by itself (the server
 * retries a transient provider error once).
 */
export async function askTutorAI(
  request: TutorRequest,
  options: { timeoutMs?: number; call?: Caller; now?: () => number } = {},
): Promise<TutorReply | null> {
  const now = options.now ?? Date.now
  if (aiAvailability(request.childId, now()) !== 'ready') return null
  const call = options.call ?? defaultCaller
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), options.timeoutMs ?? AI_TIMEOUT_MS)
    })
    const answer = await Promise.race([call('tutor', request), timeout])
    if (!answer) return null
    if (answer.status === 200) return readReply(answer.body, request)
    const error = (answer.body as { error?: unknown } | null)?.error
    const retryAfter = Number((answer.body as { retryAfter?: unknown } | null)?.retryAfter)
    if (answer.status === 503) {
      const rest =
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : REST_DEFAULT_MS
      restUntil(now() + rest, now())
    } else if (answer.status === 429) {
      restUntil(now() + REST_RATE_LIMITED_MS, now())
    } else if (error === 'no_consent') {
      // the server is the truth: the switch shows "off" until the parent turns it on again
      useAiConsentStore.getState().set(request.childId, false)
    } else if (answer.status >= 500) {
      restUntil(now() + REST_DEFAULT_MS, now())
    }
    return null
  } catch {
    restUntil(now() + REST_DEFAULT_MS, now())
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The parent switches the tutor on or off for a child: the server records it
 * (set_ai_consent, migration 0008), then this device remembers it. Throws
 * when the server refused or cannot be reached (the switch stays as it was).
 */
export async function saveAiConsent(childId: string, granted: boolean): Promise<void> {
  if (!isSupabaseConfigured || !cloudSession()) throw new Error('no cloud account')
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) throw new Error('no cloud account')
  const { error } = await supabase.rpc('set_ai_consent', {
    p_child: childId,
    p_granted: granted,
    p_version: TUTOR_POLICY_VERSION,
  })
  if (error) throw new Error(error.message)
  useAiConsentStore.getState().set(childId, granted)
}

/** Reads the parent's consents from the server (another device may have changed them). */
export async function pullAiConsent(): Promise<void> {
  if (!isSupabaseConfigured || !cloudSession()) return
  const { getSupabase } = await import('@/services/supabase/client')
  const supabase = getSupabase()
  if (!supabase) return
  const { data, error } = await supabase
    .from('ai_consent')
    .select('child_id, granted, policy_version')
  if (error || !Array.isArray(data)) return
  const store = useAiConsentStore.getState()
  for (const row of data as { child_id: string; granted: boolean; policy_version: string }[]) {
    store.set(row.child_id, row.granted === true && row.policy_version === TUTOR_POLICY_VERSION)
  }
}
