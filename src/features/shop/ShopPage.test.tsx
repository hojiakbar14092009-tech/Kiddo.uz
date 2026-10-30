import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { birthDateForAge } from '@/features/age/ageLevel'
import { STICKERS } from '@/features/stickers/stickers'
import { tashkentDay } from '@/lib/dates'
import { useFamilyStore } from '@/store/familyStore'
import { OUTFITS } from './outfits'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

function guest() {
  return useProgressStore.getState().byChild[GUEST_KEY] ?? EMPTY_PROGRESS
}

describe('Shop', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({
      byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, coins: 20, stickers: [STICKERS[0]!.id] } },
    })
  })

  it('asks before spending coins, then puts the item on', async () => {
    const { user } = await renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Kepka — 15 coin' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Kepka olamizmi?' })
    expect(guest().coins).toBe(20)
    await user.click(within(dialog).getByRole('button', { name: 'Ha, olaman' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(guest().coins).toBe(5)
    expect(guest().wearing).toEqual({ head: 'cap' })
    expect(screen.getByRole('button', { name: 'Kepka — Kiyilgan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Yahoooo! Yangi kiyim!')).toBeInTheDocument()
  })

  it('spends nothing when the child says no', async () => {
    const { user } = await renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Gul — 10 coin' }))
    await user.click(screen.getByRole('button', { name: 'Yo‘q' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(guest().coins).toBe(20)
    expect(guest().outfits).toEqual([])
  })

  it('encourages instead of buying when coins are short', async () => {
    const { user } = await renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Toj — Yana 20 coin' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Yana 20 coin yig‘amiz! Vazifa bajar!')).toBeInTheDocument()
    expect(guest().coins).toBe(20)
  })

  it('shows the sticker album with empty slots', async () => {
    const { user } = await renderRoute('/shop')
    await user.click(screen.getByRole('tab', { name: /Stikerlar/ }))
    expect(screen.getByText(`1 / ${STICKERS.length}`)).toBeInTheDocument()
    expect(document.querySelectorAll('li img')).toHaveLength(1)
    expect(screen.getAllByLabelText('Bo‘sh joy')).toHaveLength(STICKERS.length - 1)
  })

  it('lets a child try a pet next to the robot before buying it', async () => {
    useProgressStore.setState({ byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, coins: 20 } } })
    const { user } = await renderRoute('/shop?tab=pets')
    // with only 20 coins the kitten can still be tried, for free
    await user.click(screen.getByRole('button', { name: 'Mushuk — Yana 55 coin' }))
    expect(screen.getByText('👀 Sinab ko‘rilyapti: Mushuk')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mushuk' })).toBeInTheDocument() // at the robot's feet
    expect(screen.getByText('Mushuk yonimda mana shunday turadi! Yoqdimi?')).toBeInTheDocument()
    expect(guest().coins).toBe(20)
    expect(guest().pets ?? []).toEqual([])

    // adopting it still needs the coins
    await user.click(screen.getByRole('button', { name: /Olish · 75/ }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('Yana 55 coin yig‘amiz! Vazifa bajar!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Qaytarish' }))
    expect(screen.queryByRole('button', { name: 'Mushuk' })).not.toBeInTheDocument()
  })

  it('buys a tried pet after a second tap, showing the robot and pet together', async () => {
    useProgressStore.setState({ byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, coins: 80 } } })
    const { user } = await renderRoute('/shop?tab=pets')
    await user.click(screen.getByRole('button', { name: 'Quyoncha — 75 coin' }))
    expect(guest().coins).toBe(80)
    await user.click(screen.getByRole('button', { name: /^Quyoncha — Sinab ko‘rilyapti/ }))
    const dialog = screen.getByRole('alertdialog', { name: 'Quyonchani olamizmi?' })
    await user.click(within(dialog).getByRole('button', { name: 'Ha, olaman' }))
    expect(guest().coins).toBe(5)
    expect(guest().pets).toEqual(['bunny'])
    expect(screen.queryByText(/Sinab ko‘rilyapti/)).not.toBeInTheDocument()
  })

  it('shows the friendship hearts of an owned pet and how many days are left', async () => {
    useProgressStore.setState({
      byChild: {
        [GUEST_KEY]: {
          ...EMPTY_PROGRESS,
          pets: ['cat'],
          pet: 'cat',
          petBond: { cat: { days: 4, last: '2026-10-01' } },
        },
      },
    })
    await renderRoute('/shop?tab=pets')
    const cat = screen.getByRole('button', {
      name: 'Mushuk — Yonimda. Do‘stlik: 2 / 5. Yangi yurakchagacha: 3 kun',
    })
    expect(within(cat).getByTestId('pet-bond')).toHaveAttribute('data-level', '2')
    expect(within(cat).getByText('Yangi yurakchagacha: 3 kun')).toBeInTheDocument()
    // pets not owned have no hearts
    expect(screen.getAllByTestId('pet-bond')).toHaveLength(1)
    expect(screen.getByText(/Har kuni birga o‘ynasang/)).toBeInTheDocument()
  })

  it("shows every item with its own picture, the stage's categories first, and filters by kind", async () => {
    const { user } = await renderRoute('/shop')
    const wardrobe = screen.getByTestId('wardrobe')
    // a guest is young: bright colours, creative first
    expect(wardrobe).toHaveAttribute('data-stage', 'young')
    expect(within(wardrobe).getAllByRole('listitem')).toHaveLength(OUTFITS.length)
    expect(within(wardrobe).getAllByRole('listitem')[0]).toHaveAttribute(
      'data-category',
      'creative',
    )
    expect(document.querySelector('[data-outfit-preview="doppi"]')).toHaveAttribute(
      'data-tone',
      'bright',
    )
    await user.click(screen.getByRole('button', { name: 'Milliy' }))
    expect(screen.getByRole('button', { name: 'Milliy' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(wardrobe).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Do‘ppi — Yana 5 coin' })).toBeInTheDocument()
  })

  it('a 14-year-old sees the same wardrobe in calm colours, smart and tech first', async () => {
    const today = tashkentDay()
    useFamilyStore.setState({
      children: [
        {
          id: 'teen',
          name: 'Teen',
          birthDate: birthDateForAge(14, today),
          celebratedLevel: 6,
          gender: 'boy',
          mascot: 'boy',
          dailyLimitMinutes: 60,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      activeChildId: 'teen',
    })
    useProgressStore.setState({ byChild: { teen: { ...EMPTY_PROGRESS, coins: 20 } } })
    await renderRoute('/shop')
    const wardrobe = screen.getByTestId('wardrobe')
    expect(wardrobe).toHaveAttribute('data-stage', 'older')
    expect(within(wardrobe).getAllByRole('listitem')).toHaveLength(OUTFITS.length)
    expect(within(wardrobe).getAllByRole('listitem')[0]).toHaveAttribute('data-category', 'smart')
    // nothing is locked by gender or age: the flower and the crown are there too
    expect(screen.getByRole('button', { name: 'Gul — 10 coin' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Toj — Yana 20 coin' })).toBeEnabled()
    expect(document.querySelector('[data-outfit-preview="cap"]')).toHaveAttribute(
      'data-tone',
      'muted',
    )
    expect(document.querySelector('svg[data-stage]')).toHaveAttribute('data-stage', 'older')
  })
})
