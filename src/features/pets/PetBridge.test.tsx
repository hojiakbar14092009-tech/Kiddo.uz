import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { publish } from '@/domain/universe/progression'
import { EMPTY_PROGRESS, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { PetBridge } from './PetBridge'

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/components/ui/toast', () => ({ toast }))

function finished(childKey: string, id: string) {
  publish({
    type: 'activity.completed',
    childKey,
    activityId: id,
    activity: 'math',
  } as Parameters<typeof publish>[0])
}

describe('PetBridge', () => {
  beforeEach(() => {
    toast.mockReset()
    useSettingsStore.setState({ language: 'uz' })
    useProgressStore.setState({
      byChild: { kid: { ...EMPTY_PROGRESS, pets: ['parrot'], pet: 'parrot' } },
    })
  })

  it('a finished activity is a day with the pet: one heart, one toast, once a day', () => {
    render(<PetBridge />)
    finished('kid', 'run-1')
    finished('kid', 'run-2')
    expect(useProgressStore.getState().byChild.kid?.petBond?.parrot?.days).toBe(1)
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith(
      'To‘tiqush bilan do‘stligingiz o‘sdi! Yurakchalar: 1 / 5',
      'success',
    )
  })

  it('stops listening when unmounted', () => {
    const { unmount } = render(<PetBridge />)
    unmount()
    finished('kid', 'run-3')
    expect(useProgressStore.getState().byChild.kid?.petBond).toBeUndefined()
  })
})
