import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { birthDateForAge } from '@/features/age/ageLevel'
import { uz } from '@/i18n/locales/uz'
import { dayKey } from '@/features/tasks/rules'
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
    expect(screen.getByRole('link', { name: 'Alifbo uyi' })).toHaveAttribute('href', '/alphabet')
  })

  it('opens the numbers tab from the home card', async () => {
    const { router, user } = await renderRoute('/home')
    await user.click(screen.getByRole('link', { name: 'Sonlar' }))
    expect(router.state.location.pathname).toBe('/alphabet')
    expect(router.state.location.search).toBe('?tab=numbers')
  })

  it('shows the active child and their own progress', async () => {
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useFamilyStore.getState().setActiveChild(ali.id)
    finish('find-picture', ali.id)
    await renderRoute('/home')
    expect(screen.getByRole('heading', { name: 'Salom, Ali!' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bolani almashtirish' })).toHaveTextContent('Ali')
    expect(screen.getByText('1 / 3 vazifa bajarildi')).toBeInTheDocument()
  })

  it('only suggests by age: every game and the big test open at four (Phase 22)', async () => {
    const lola = useFamilyStore
      .getState()
      .addChild({ name: 'Lola', birthDate: birthDateForAge(4, dayKey()), gender: 'girl' })
    // this year's birthday present was already given (birthday.test.tsx has the party)
    useFamilyStore
      .getState()
      .updateChild(lola.id, { birthdayGifts: [Number(dayKey().slice(0, 4))] })
    useFamilyStore.getState().setActiveChild(lola.id)
    const { router, user } = await renderRoute('/home')
    expect(screen.getByText('0 / 2 vazifa bajarildi')).toBeInTheDocument()
    // games suggested for older children are playable links with a calm note
    expect(screen.getByRole('link', { name: /Harfni top/ })).toHaveAttribute(
      'href',
      '/tasks/find-letter',
    )
    expect(screen.getByRole('link', { name: /Harfni top/ })).toHaveTextContent('5 yoshdan tavsiya')
    expect(screen.getByText('6 yoshdan tavsiya')).toBeInTheDocument()
    // the big test is open too: it waits for the letters, not a birthday
    expect(screen.getByRole('link', { name: /Katta sinov/ })).toHaveAttribute('href', '/exam')
    expect(screen.getByRole('link', { name: /Katta sinov/ })).not.toHaveTextContent('🔒')
    expect(screen.queryByText(/yoshda ochiladi/)).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // the addresses work at four as well: a game, a number past 5, an older tale
    for (const path of ['/tasks/trace', '/alphabet/num-9', '/learn/tales/seed-sunflower']) {
      await act(() => router.navigate(path))
      expect(router.state.location.pathname).toBe(path)
    }
    await act(() => router.navigate('/alphabet?tab=numbers'))
    expect(await screen.findByRole('button', { name: /^10 — / })).toBeInTheDocument()
    await act(() => router.navigate('/home'))

    // A year later the child is five: the celebration shows the new suggestions.
    useFamilyStore.getState().updateChild(lola.id, { celebratedLevel: 4 })
    useFamilyStore.setState((state) => ({
      children: state.children.map((child) => ({
        ...child,
        birthDate: birthDateForAge(5, dayKey()),
      })),
    }))
    const dialog = await screen.findByRole('dialog', { name: /Endi 5 yoshdasan/ })
    expect(dialog).toHaveTextContent('Harfni top')
    // a birthday suggests; it never says something "opened"
    expect(dialog).toHaveTextContent('tavsiya qilamiz')
    expect(dialog).not.toHaveTextContent(/ochildi|Katta sinov/)
    // the PRO party keeps its own words
    expect(uz.pro.celebrateText).toMatch(/robot gapiradi/)
    await user.click(screen.getByRole('button', { name: 'Zo‘r, o‘ynaymiz!' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(useFamilyStore.getState().children[0]?.celebratedLevel).toBe(5)
  })
})

describe('Child select', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
  })

  it('lets a child pick their profile and go home', async () => {
    const family = useFamilyStore.getState()
    family.addChild({ name: 'Lola', birthDate: birthDateForAge(4, dayKey()), gender: 'girl' })
    const ali = family.addChild({
      name: 'Ali',
      birthDate: birthDateForAge(6, dayKey()),
      gender: 'boy',
    })

    const { router, user } = await renderRoute('/child-select')
    expect(screen.getByRole('heading', { name: 'Kim o‘ynaydi?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ali/ }))

    expect(useFamilyStore.getState().activeChildId).toBe(ali.id)
    expect(router.state.location.pathname).toBe('/home')
  })

  it('asks a parent before switching away from a child who has already played today', async () => {
    const family = useFamilyStore.getState()
    const ali = family.addChild({
      name: 'Ali',
      birthDate: birthDateForAge(6, dayKey()),
      gender: 'boy',
    })
    family.addChild({ name: 'Lola', birthDate: birthDateForAge(4, dayKey()), gender: 'girl' })
    family.setActiveChild(ali.id)
    useProgressStore.getState().addMinutes(ali.id, 5)

    const { router, user } = await renderRoute('/child-select')
    await user.click(screen.getByRole('button', { name: /Lola/ }))
    expect(screen.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeInTheDocument()
    expect(useFamilyStore.getState().activeChildId).toBe(ali.id)

    await user.click(screen.getByRole('button', { name: 'Orqaga' }))
    expect(router.state.location.pathname).toBe('/child-select')
  })

  it('offers guest play when there are no profiles', async () => {
    const { router, user } = await renderRoute('/child-select')
    expect(screen.getByText(/ota-ona bo‘limida profil/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Mehmon/ }))
    expect(useFamilyStore.getState().activeChildId).toBeNull()
    expect(router.state.location.pathname).toBe('/home')
  })

  it('goes to child select after choosing a language when profiles exist', async () => {
    useFamilyStore
      .getState()
      .addChild({ name: 'Lola', birthDate: birthDateForAge(4, dayKey()), gender: 'girl' })
    // the welcome tour was seen (WelcomePage.test.tsx has it)
    useSettingsStore.setState({ onboarded: true })
    const { router, user } = await renderRoute('/')
    await user.click(screen.getByRole('button', { name: /Русский/ }))
    expect(router.state.location.pathname).toBe('/child-select')
  })
})
