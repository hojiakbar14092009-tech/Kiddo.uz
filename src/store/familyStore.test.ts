import { describe, expect, it } from 'vitest'
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
