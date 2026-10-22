import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useParentGateStore, useParentStore } from '@/store/parentStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { birthDateForAge } from '@/features/age/ageLevel'
import { dayKey } from '@/features/tasks/rules'
import { renderRoute } from '@/test/renderRoute'

type User = Awaited<ReturnType<typeof renderRoute>>['user']

/** With Math.random() = 0 the gate always asks 3 × 3. */
async function solveGate(user: User, answer = '9') {
  for (const digit of answer) await user.click(screen.getByRole('button', { name: digit }))
  await user.click(screen.getByRole('button', { name: 'Tekshirish' }))
}

describe('Parent gate', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    useSettingsStore.setState({ language: 'uz' })
    useParentGateStore.setState({ openedAt: null })
    useParentStore.setState({ session: null })
  })
  afterEach(() => vi.restoreAllMocks())

  it('keeps the parent area closed until the sum is solved', async () => {
    const { router, user } = await renderRoute('/parent/dashboard')
    expect(screen.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeInTheDocument()
    expect(screen.getByText('3 ko‘paytirish 3 nechaga teng?')).toBeInTheDocument()

    await solveGate(user, '8')
    expect(screen.getByText('Noto‘g‘ri. Mana yangi misol.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await solveGate(user)
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent/login'))
  })

  it('rests the keypad after three wrong answers in a row', async () => {
    const { user } = await renderRoute('/parent')
    for (let attempt = 0; attempt < 3; attempt += 1) await solveGate(user, '1')
    expect(screen.getByText(/30 soniyadan keyin/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9' })).toBeDisabled()
  })

  it('goes back to the child area on cancel', async () => {
    const { router, user } = await renderRoute('/parent')
    await user.click(screen.getByRole('button', { name: 'Orqaga' }))
    expect(router.state.location.pathname).toBe('/home')
  })

  it('is reached from the home screen', async () => {
    const { router, user } = await renderRoute('/home')
    await user.click(screen.getByRole('link', { name: 'Ota-ona bo‘limi' }))
    expect(router.state.location.pathname).toBe('/parent')
    expect(screen.getByRole('dialog', { name: 'Faqat kattalar uchun' })).toBeInTheDocument()
  })
})

describe('Parent dashboard', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useParentGateStore.setState({ openedAt: Date.now() })
    useParentStore.setState({ session: null })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
  })

  it('enters demo mode and starts by adding a child', async () => {
    const { router, user } = await renderRoute('/parent/login')
    await user.click(screen.getByRole('button', { name: 'Demo rejimda kirish' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/parent/dashboard'))

    await user.type(await screen.findByRole('textbox', { name: 'Ismi' }), 'Ali')
    const birthday = screen.getByLabelText(/^Tug‘ilgan kuni/)
    // Too young for Kiddo: the form refuses it.
    fireEvent.change(birthday, { target: { value: birthDateForAge(2, dayKey()) } })
    await user.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(screen.getByText(/bola 4 yoshdan 6 yoshgacha/)).toBeInTheDocument()
    expect(useFamilyStore.getState().children).toHaveLength(0)
    fireEvent.change(birthday, { target: { value: birthDateForAge(4, dayKey()) } })
    await user.click(screen.getByRole('radio', { name: 'O‘g‘il' }))
    await user.click(screen.getByRole('radio', { name: '45 daqiqa' }))
    await user.click(screen.getByRole('button', { name: 'Saqlash' }))

    const [child] = useFamilyStore.getState().children
    expect(child).toMatchObject({
      name: 'Ali',
      birthDate: birthDateForAge(4, dayKey()),
      gender: 'boy',
      mascot: 'boy',
    })
    expect(child?.dailyLimitMinutes).toBe(45)
  })

  it('does not save a profile without a name', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    const { user } = await renderRoute('/parent/dashboard')
    await user.click(screen.getByRole('button', { name: 'Saqlash' }))
    expect(screen.getByText('Ismni yozing.')).toBeInTheDocument()
    expect(useFamilyStore.getState().children).toHaveLength(0)
  })

  it('reports today’s work and which letters get mixed up', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useProgressStore.getState().completeTask(ali.id, {
      type: 'find-letter',
      language: 'uz',
      letterIds: ['ch', 'a'],
      mistakeDetails: [{ targetId: 'ch', chosenId: 'sh' }],
    })

    await renderRoute('/parent/dashboard')
    const today = screen.getByRole('heading', { name: 'Bugun' }).closest('section')!
    expect(within(today).getByText('Vazifalar').nextSibling).toHaveTextContent('1')
    expect(within(today).getByText('Coinlar').nextSibling).toHaveTextContent('5')
    expect(screen.getByText('Ch o‘rniga Sh')).toBeInTheDocument()
  })

  it('asks before deleting a profile', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    const { user } = await renderRoute('/parent/dashboard?tab=profiles')
    await user.click(screen.getByRole('button', { name: 'Ali profilini o‘chirish' }))
    expect(useFamilyStore.getState().children).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Ha, o‘chirish' }))
    expect(useFamilyStore.getState().children).toHaveLength(0)
  })

  it('sends homework that the child sees first and that its game practises', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useFamilyStore.getState().setActiveChild(ali.id)

    const parent = await renderRoute('/parent/dashboard?tab=homework')
    await parent.user.click(screen.getByRole('button', { name: 'Ch' }))
    await parent.user.click(screen.getByRole('button', { name: 'Aliga berish' }))
    expect(screen.getByRole('status')).toHaveTextContent('Qo‘shildi!')
    // as many as the parent likes: a second and a third one
    await parent.user.click(screen.getByRole('button', { name: 'Sh' }))
    await parent.user.click(screen.getByRole('button', { name: 'Aliga berish' }))
    await parent.user.click(screen.getByRole('button', { name: 'B' }))
    await parent.user.click(screen.getByRole('button', { name: 'Aliga berish' }))
    const homeworks = useFamilyStore.getState().children[0]?.homeworks ?? []
    expect(homeworks.map((h) => h.letterIds)).toEqual([['ch'], ['sh'], ['b']])
    expect(homeworks[0]).toMatchObject({ language: 'uz', game: 'find-letter' })
    expect(screen.getByText('3 ta kutilmoqda, 0 ta bajarilgan')).toBeInTheDocument()
    // one can be taken back
    await parent.user.click(screen.getAllByRole('button', { name: 'Bekor qilish' })[2]!)
    expect(useFamilyStore.getState().children[0]?.homeworks).toHaveLength(2)
    parent.unmount()

    const homework = homeworks[0]
    const child = await renderRoute('/home')
    expect(screen.getByRole('link', { name: /Uy vazifasi: Sh/ })).toBeInTheDocument()
    await child.user.click(screen.getByRole('link', { name: /Uy vazifasi: Ch/ }))
    expect(child.router.state.location.search).toBe(`?homework=${homework!.id}`)
    // The homework letter is practised in the game.
    await child.user.click(screen.getByRole('button', { name: 'Ch harfi' }))
    expect(screen.getByText(/^(Yahoooo|Wow|Hooray|Yay|Woohoo)! /)).toBeInTheDocument()
  })

  it('lets a parent take coins away, only after confirming', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useProgressStore.getState().grantCoins(ali.id, 30)
    const { user } = await renderRoute('/parent/dashboard?tab=homework')
    await user.type(screen.getByLabelText('Necha coin ayiriladi'), '12')
    await user.click(screen.getByRole('button', { name: 'Coin ayirish' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Alidan 12 coin ayirilsinmi?')
    await user.click(within(dialog).getByRole('button', { name: 'Ha, ayirish' }))
    expect(useProgressStore.getState().byChild[ali.id]?.coins).toBe(18)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Alidan 12 coin ayirildi.')).toHaveAttribute('role', 'status')
  })

  it('keeps the coins when the take-away question is cancelled with Escape', async () => {
    useParentStore.setState({ session: { mode: 'demo' } })
    const ali = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: birthDateForAge(5, dayKey()), gender: 'boy' })
    useProgressStore.getState().grantCoins(ali.id, 30)
    const { user } = await renderRoute('/parent/dashboard?tab=homework')
    await user.type(screen.getByLabelText('Necha coin ayiriladi'), '12')
    await user.click(screen.getByRole('button', { name: 'Coin ayirish' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Alidan 12 coin ayirilsinmi?' })
    // the safe answer is focused, a tap outside does nothing
    expect(within(dialog).getByRole('button', { name: 'Bekor qilish' })).toHaveFocus()
    fireEvent.pointerDown(dialog.parentElement!)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(useProgressStore.getState().byChild[ali.id]?.coins).toBe(30)
  })
})
