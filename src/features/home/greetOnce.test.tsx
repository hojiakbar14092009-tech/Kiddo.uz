import { cleanup } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetGreeted } from '@/features/mascot/greetOnce'
import { useFamilyStore } from '@/store/familyStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

/*
 * The robot's hello on Home is said once each time the app is opened: coming back to
 * Home ("Bugun") from a game does not say it again.
 */

const greetings = vi.hoisted(() => [] as (string | undefined)[])

vi.mock('@/features/mascot/RoamingMascot', async () => {
  const { useEffect } = await vi.importActual<typeof import('react')>('react')
  return {
    RoamingMascot: ({
      greeting,
      onGreet,
    }: {
      greeting?: string
      onGreet?: (inStage: boolean) => void
    }) => {
      useEffect(() => {
        greetings.push(greeting)
        // the robot shows its bubble: the page says the hello
        if (greeting) onGreet?.(true)
      }, [greeting, onGreet])
      return null
    },
  }
})

describe('the hello on Home', () => {
  beforeEach(() => {
    greetings.length = 0
    resetGreeted()
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('is said on the first visit after opening the app, not on coming back', async () => {
    await renderRoute('/home')
    expect(greetings[0]).toBeTruthy()
    cleanup()
    greetings.length = 0
    await renderRoute('/home')
    expect(greetings).not.toHaveLength(0)
    expect(greetings.every((greeting) => greeting === undefined)).toBe(true)
  })

  it('is said again after the app is opened anew', async () => {
    await renderRoute('/home')
    cleanup()
    resetGreeted()
    greetings.length = 0
    await renderRoute('/home')
    expect(greetings.some(Boolean)).toBe(true)
  })
})
