import { GUEST_KEY } from '@/domain/childKey'
import { subscribeDomainEvents } from '@/domain/universe/progression'
import { useFamilyStore } from '@/store/familyStore'
import type { Signal } from './reactions'

/*
 * MascotEventBridge: the one place the mascots hear about the world. Phase 18
 * domain events of the child who is playing reach every mascot on screen as
 * signals; the reaction resolver turns them into performances. The bridge
 * listens to the universe only while a mascot is shown, and it never writes:
 * mascots react to progression, they are never its authority.
 */

type Listener = (signal: Signal) => void

const listeners = new Set<Listener>()
let stopDomain: (() => void) | null = null

function playingChild(): string {
  return useFamilyStore.getState().activeChildId ?? GUEST_KEY
}

export function onMascotSignal(listener: Listener): () => void {
  listeners.add(listener)
  stopDomain ??= subscribeDomainEvents((event) => {
    if (event.childKey !== playingChild()) return
    emitMascotSignal({ kind: 'domain', event })
  })
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && stopDomain) {
      stopDomain()
      stopDomain = null
    }
  }
}

export function emitMascotSignal(signal: Signal): void {
  for (const listener of [...listeners]) listener(signal)
}

/** For tests: how many mascots are listening (0 when none is shown). */
export function mascotListeners(): number {
  return listeners.size
}
