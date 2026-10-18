import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { hashCode, sealCode, type SealedCode } from '@/features/promo/vault'

/** A promo code on this device, kept sealed (see features/promo/vault.ts). */
export interface DevicePromoCode extends SealedCode {
  days: number
  active: boolean
  createdAt: string
}

/** The one code this device got for watching an ad. */
export interface DevicePromoClaim extends Pick<SealedCode, 'sealed' | 'nonce' | 'hash'> {
  days: number
  at: string
}

/** The codes Kiddo ships with: KIDDO07 (7 days) and BOLAJON30 (30 days), sealed. */
export const BUILT_IN_CODES: DevicePromoCode[] = [
  {
    hash: '48c44103f7514330dbfbde333c8abb60ccd00164831474e89ed9079700fdf736',
    sealed: 'oVeJ5de+TQ==',
    nonce: 2718281828,
    days: 7,
    active: true,
    createdAt: '2026-10-19T00:00:00.000Z',
  },
  {
    hash: 'ddfd42d742898a461e0f28bf477130da946beed1033fed885be66852be7fd916',
    sealed: 'AayIH9Fc0PMW',
    nonce: 3141592653,
    days: 30,
    active: true,
    createdAt: '2026-10-19T00:00:00.000Z',
  },
]

interface PromoState {
  codes: DevicePromoCode[]
  claim: DevicePromoClaim | null
  /** Hashes of codes already used on this device. */
  redeemed: string[]
  addCode: (code: string, days: number) => Promise<void>
  removeCode: (hash: string) => void
  setActive: (hash: string, active: boolean) => void
  setClaim: (claim: DevicePromoClaim) => void
  markRedeemed: (hash: string) => void
  /** Days a typed code gives, or null when it is not a valid active code. */
  lookup: (code: string) => Promise<{ hash: string; days: number } | null>
}

export const usePromoStore = create<PromoState>()(
  persist(
    (set, get) => ({
      codes: BUILT_IN_CODES,
      claim: null,
      redeemed: [],
      addCode: async (code, days) => {
        const sealed = await sealCode(code)
        set((state) => ({
          codes: [
            ...state.codes.filter((item) => item.hash !== sealed.hash),
            {
              ...sealed,
              days: Math.min(365, Math.max(1, Math.round(days))),
              active: true,
              createdAt: new Date().toISOString(),
            },
          ],
        }))
      },
      removeCode: (hash) => set((state) => ({ codes: state.codes.filter((c) => c.hash !== hash) })),
      setActive: (hash, active) =>
        set((state) => ({
          codes: state.codes.map((code) => (code.hash === hash ? { ...code, active } : code)),
        })),
      setClaim: (claim) => set({ claim }),
      markRedeemed: (hash) =>
        set((state) => ({
          redeemed: state.redeemed.includes(hash) ? state.redeemed : [...state.redeemed, hash],
        })),
      lookup: async (code) => {
        const hash = await hashCode(code)
        const found = get().codes.find((item) => item.hash === hash && item.active)
        return found ? { hash, days: found.days } : null
      },
    }),
    { name: 'kiddo.promo', version: 1 },
  ),
)
