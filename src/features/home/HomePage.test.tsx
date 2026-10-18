import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

function finish(type: 'find-letter' | 'find-picture' | 'trace', childKey = GUEST_KEY) {
  useProgressStore
    .getState()
    .completeTask(childKey, { type, language: 'uz', letterIds: ['a'], mistakeDetails: [] })
}

describe('Home', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
  })

  it('shows today’s plan with the first game up next', async () => {
    await renderRoute('/home')
    expect(screen.getByText('0 / 3 vazifa bajarildi')).toBeInTheDocument()
    const next = screen.getByRole('link', { name: '1. Harfni top — Navbatdagi' })
    expect(next).toHaveAttribute('aria-current', 'step')
    expect(next).toHaveAttribute('href', '/tasks/find-letter')
  })

  it('ticks off finished games and moves “next” along', async () => {
    finish('find-letter')
    await renderRoute('/home')
    expect(screen.getByText('1 / 3 vazifa bajarildi')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1. Harfni top — Bajarildi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2. Rasmni top — Navbatdagi' })).toBeInTheDocument()
  })

  it('suggests a rest once the plan is done, without locking anything', async () => {
    finish('find-letter')
    finish('find-picture')
    finish('trace')
    await renderRoute('/home')
    expect(screen.getByText('Bugungi reja bajarildi!')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Alifbo' })).toHaveAttribute('href', '/alphabet')
  })

  it('opens the numbers tab from the home card', async () => {
    const { router, user } = await renderRoute('/home')
    await user.click(screen.getByRole('link', { name: 'Sonlar' }))
    expect(router.state.location.pathname).toBe('/alphabet')
    expect(router.state.location.search).toBe('?tab=numbers')
  })

  it('shows the active child and their own progress', async () => {
    const ali = useFamilyStore.getState().addChild({ name: 'Ali', age: 5, gender: 'boy' })
    useFamilyStore.getState().setActiveChild(ali.id)
    finish('trace', ali.id)
    await renderRoute('/home')
    expect(screen.getByRole('heading', { name: 'Salom, Ali!' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bolani almashtirish' })).toHaveTextContent('Ali')
    expect(screen.getByText('1 / 3 vazifa bajarildi')).toBeInTheDocument()
  })
})

describe('Child select', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('lets a child pick their profile and go home', async () => {
    const family = useFamilyStore.getState()
    family.addChild({ name: 'Lola', age: 4, gender: 'girl' })
    const ali = family.addChild({ name: 'Ali', age: 6, gender: 'boy' })

    const { router, user } = await renderRoute('/child-select')
    expect(screen.getByRole('heading', { name: 'Kim o‘ynaydi?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ali/ }))

    expect(useFamilyStore.getState().activeChildId).toBe(ali.id)
    expect(router.state.location.pathname).toBe('/home')
  })

  it('offers guest play when there are no profiles', async () => {
    const { router, user } = await renderRoute('/child-select')
    expect(screen.getByText(/ota-ona bo‘limida profil/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mehmon/ }))
    expect(useFamilyStore.getState().activeChildId).toBeNull()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('goes to child select after choosing a language when profiles exist', async () => {
    useFamilyStore.getState().addChild({ name: 'Lola', age: 4, gender: 'girl' })
    const { router, user } = await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /Русский/ }))
    expect(router.state.location.pathname).toBe('/child-select')
  })
})
