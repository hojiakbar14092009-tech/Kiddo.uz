import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import * as legacy from '@/store/subscriptionStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { canUse, getEntitlement, useCanUse, useEntitlement, useProTier, type ProFeature } from '.'

const FEATURES: ProFeature[] = ['audio', 'premiumStories', 'aiFriend', 'offlinePacks']
const DAY = 24 * 60 * 60 * 1000

function signInChild() {
  const child = useFamilyStore
    .getState()
    .addChild({ name: 'Ali', birthDate: '2021-01-01', gender: 'boy' })
  useFamilyStore.getState().setActiveChild(child.id)
}

describe('entitlements', () => {
  beforeEach(() => {
    useSubscriptionStore.getState().cancel()
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('a guest gets no PRO feature, even when the family has PRO', () => {
    useSubscriptionStore.getState().activatePlan('lifetime', 'payment')
    for (const feature of FEATURES) {
      expect(canUse(feature)).toBe(false)
      expect(getEntitlement(feature)).toEqual({ allowed: false, reason: 'guest' })
    }
  })

  it('a child on Free is asked for PRO', () => {
    signInChild()
    expect(getEntitlement('audio')).toEqual({ allowed: false, reason: 'pro' })
  })

  it('a child with an active plan may use every PRO feature', () => {
    signInChild()
    useSubscriptionStore.getState().activatePlan('monthly', 'payment')
    for (const feature of FEATURES) {
      expect(getEntitlement(feature)).toEqual({ allowed: true, reason: 'ok' })
    }
  })

  it('an expired plan allows nothing', () => {
    signInChild()
    useSubscriptionStore
      .getState()
      .activatePlan('monthly', 'payment', new Date(Date.now() - 31 * DAY))
    expect(canUse('audio')).toBe(false)
    expect(getEntitlement('aiFriend').reason).toBe('pro')
  })

  it('the hooks follow PRO and the active child', () => {
    const { result } = renderHook(() => ({
      entitlement: useEntitlement('audio'),
      can: useCanUse('audio'),
      tier: useProTier(),
    }))
    expect(result.current).toEqual({
      entitlement: { allowed: false, reason: 'guest' },
      can: false,
      tier: 'free',
    })
    act(() => {
      signInChild()
      useSubscriptionStore.getState().activatePlan('yearly', 'payment')
    })
    expect(result.current).toEqual({
      entitlement: { allowed: true, reason: 'ok' },
      can: true,
      tier: 'pro',
    })
  })

  it('old imports from subscriptionStore give the same answer', () => {
    signInChild()
    useSubscriptionStore.getState().setDemoPro(true)
    expect(legacy.canUse('audio')).toBe(true)
    expect(legacy.getIsPro()).toBe(true)
  })
})
