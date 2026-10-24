import { describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from './familyStore'

describe('family store migration', () => {
  it('turns the one homework of v2 into a list', async () => {
    const migrate = useFamilyStore.persist.getOptions().migrate!
    const homework = {
      id: 'h1',
      language: 'uz',
      game: 'find-letter',
      letterIds: ['ch'],
      assignedAt: '2026-10-01T00:00:00.000Z',
      completedAt: null,
      mistakes: null,
    }
    const state = (await migrate(
      {
        children: [
          { id: 'a', name: 'Ali', birthDate: '2021-01-01', homework },
          { id: 'b', name: 'Lola', birthDate: '2021-01-01', homework: null },
        ],
        activeChildId: null,
      },
      2,
    )) as unknown as { children: Record<string, unknown>[] }
    expect(state.children[0]).toMatchObject({ homeworks: [homework] })
    expect(state.children[0]).not.toHaveProperty('homework')
    expect(state.children[1]).toMatchObject({ homeworks: [] })
  })
})

describe('removing a child', () => {
  it('also forgets its activity events, extra screen time and AI-helper choice', async () => {
    const { useActivityStore } = await import('./activityStore')
    const { useScreenTimeStore } = await import('./screenTimeStore')
    const { useAiConsentStore } = await import('@/domain/tutor/aiClient')
    const family = useFamilyStore.getState()
    const kept = family.addChild({ name: 'Kept', birthDate: '2020-05-01', gender: 'boy' })
    const gone = family.addChild({ name: 'Gone', birthDate: '2020-05-01', gender: 'girl' })
    useActivityStore.getState().record(gone.id, 'left')
    useActivityStore.getState().record(kept.id, 'left')
    useScreenTimeStore.getState().grantExtra(gone.id, '2026-10-24', 10)
    useScreenTimeStore.getState().grantExtra(kept.id, '2026-10-24', 5)
    useAiConsentStore.getState().set(gone.id, true)

    useFamilyStore.getState().removeChild(gone.id)

    expect(useActivityStore.getState().events.map((event) => event.childId)).toEqual([kept.id])
    expect(Object.keys(useScreenTimeStore.getState().extraMinutes)).toEqual([
      `${kept.id}|2026-10-24`,
    ])
    await vi.waitFor(() => expect(useAiConsentStore.getState().byChild[gone.id]).toBeUndefined())
  })
})
