import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
 * The attention helper (Phase 58, docs/architecture/attention.md): a grown-up is
 * asked once on this device whether the robot may notice when the child looks away
 * or leaves, and remind them. The answer is kept here; a parent changes it later in
 * Settings. Nothing about what the camera sees is ever stored.
 */

export type AttentionConsent = 'unasked' | 'granted' | 'denied'

interface AttentionState {
  consent: AttentionConsent
  /** When the grown-up answered (ISO), for the parent's settings line. */
  answeredAt: string | null
  /** The camera may be used too (only with consent; off when the browser refused it). */
  camera: boolean
  answer: (granted: boolean, camera: boolean, now?: Date) => void
  setCamera: (on: boolean) => void
}

export const useAttentionStore = create<AttentionState>()(
  persist(
    (set) => ({
      consent: 'unasked',
      answeredAt: null,
      camera: false,
      answer: (granted, camera, now = new Date()) =>
        set({
          consent: granted ? 'granted' : 'denied',
          camera: granted && camera,
          answeredAt: now.toISOString(),
        }),
      setCamera: (on) => set((state) => ({ camera: state.consent === 'granted' && on })),
    }),
    { name: 'kiddo.attention', version: 1 },
  ),
)

/** The helper runs only after a grown-up said yes. */
export function attentionOn(state: Pick<AttentionState, 'consent'>): boolean {
  return state.consent === 'granted'
}
