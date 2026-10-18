import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { STICKERS } from '@/features/stickers/stickers'
import { EMPTY_PROGRESS, GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

function guest() {
  return useProgressStore.getState().byChild[GUEST_KEY] ?? EMPTY_PROGRESS
}

describe('Shop', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useProgressStore.setState({
      byChild: { [GUEST_KEY]: { ...EMPTY_PROGRESS, coins: 20, stickers: [STICKERS[0]!.id] } },
    })
  })

  it('asks before spending coins, then puts the item on', async () => {
    const { user } = renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Kepka — 15 coin' }))

    const dialog = screen.getByRole('dialog', { name: 'Kepka olamizmi?' })
    expect(guest().coins).toBe(20)
    await user.click(within(dialog).getByRole('button', { name: 'Ha, olaman' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(guest().coins).toBe(5)
    expect(guest().wearing).toEqual({ head: 'cap' })
    expect(screen.getByRole('button', { name: 'Kepka — Kiyilgan' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Yahoooo! Yangi kiyim!')).toBeInTheDocument()
  })

  it('spends nothing when the child says no', async () => {
    const { user } = renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Gul — 10 coin' }))
    await user.click(screen.getByRole('button', { name: 'Yo‘q' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(guest().coins).toBe(20)
    expect(guest().outfits).toEqual([])
  })

  it('encourages instead of buying when coins are short', async () => {
    const { user } = renderRoute('/shop')
    await user.click(screen.getByRole('button', { name: 'Toj — Yana 20 coin' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Yana 20 coin yig‘amiz! Vazifa bajar!')).toBeInTheDocument()
    expect(guest().coins).toBe(20)
  })

  it('shows the sticker album with empty slots', async () => {
    const { user } = renderRoute('/shop')
    await user.click(screen.getByRole('tab', { name: /Stikerlar/ }))
    expect(screen.getByText(`1 / ${STICKERS.length}`)).toBeInTheDocument()
    expect(screen.getByText(STICKERS[0]!.emoji)).toBeInTheDocument()
    expect(screen.getAllByLabelText('Bo‘sh joy')).toHaveLength(STICKERS.length - 1)
  })
})
