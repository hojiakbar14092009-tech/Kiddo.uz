import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { rewardHistory, useRewardStore } from '@/domain/rewards'
import { emitActivity, grantResource, useUniverseStore } from '@/domain/universe'
import { EMPTY_UNIVERSE_CHILD } from '@/domain/universe/store'
import { useFamilyStore } from '@/store/familyStore'
import { GUEST_KEY, useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { renderRoute } from '@/test/renderRoute'

beforeEach(() => {
  useSettingsStore.setState({ language: 'uz' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useRewardStore.setState({ byChild: {} })
})

describe('Collection', () => {
  it('is kindly empty at first, and still explains every treasure and medal', async () => {
    await renderRoute('/collection')
    const empty = screen.getByTestId('collection-empty')
    expect(empty).toHaveTextContent('Kolleksiya hali bo‘sh')
    expect(within(empty).getByRole('link', { name: 'O‘ynashni boshlash' })).toHaveAttribute(
      'href',
      '/home',
    )
    // two treasures only: stars (a measure) and yong‘oq (the one currency)
    expect(screen.getAllByTestId(/^treasure-/).map((item) => item.dataset.testid)).toEqual([
      'treasure-star',
      'treasure-nut',
    ])
    expect(screen.getByTestId('treasure-nut')).toHaveTextContent(
      'Do‘konda kiyim va uy hayvonlari olish, shahardagi binolarni kattalashtirish uchun.',
    )
    expect(screen.queryByTestId('treasure-crystal')).not.toBeInTheDocument()
    expect(screen.getByTestId('medal-first-steps')).toHaveTextContent('Hali medal yo‘q')
    expect(screen.getByTestId('medal-first-steps')).toHaveTextContent('Keyingi medalgacha: 0 / 3')
    expect(screen.getByRole('heading', { name: /Mening stikerlarim/ })).toBeInTheDocument()
  })

  it('shows counts and medal tiers once something is earned', async () => {
    for (let index = 0; index < 3; index++) {
      emitActivity({
        id: `run-${index}`,
        childKey: GUEST_KEY,
        activity: `words:${index}`,
        strand: 'reading',
        correct: 4,
        total: 4,
        independent: 4,
      })
    }
    grantResource({ childKey: GUEST_KEY, resource: 'part', amount: 2, reason: 'test', refId: 'p' })
    await renderRoute('/collection')

    expect(screen.queryByTestId('collection-empty')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Yulduzlar: 9' })).toBeInTheDocument()
    // three first 3-star runs (10 nuts each), 2 parts given (5 each) and the medals' coins
    const medalCoins = rewardHistory(GUEST_KEY)
      .filter((entry) => entry.reason === 'achievement')
      .reduce((sum, entry) => sum + entry.coins, 0)
    const nuts = 3 * 10 + 2 * 5 + medalCoins
    expect(useProgressStore.getState().byChild[GUEST_KEY]?.coins).toBe(nuts)
    expect(screen.getByRole('heading', { name: `Yong‘oqlar: ${nuts}` })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Kristallar|Detallar/ })).not.toBeInTheDocument()

    const firstSteps = screen.getByTestId('medal-first-steps')
    expect(firstSteps).toHaveTextContent('Bronza')
    expect(firstSteps).toHaveTextContent('Keyingi medalgacha: 3 / 25')
    expect(within(firstSteps).getByRole('progressbar')).toHaveAttribute('aria-valuemax', '25')
    expect(screen.getByTestId('medal-crystal-keeper')).toHaveTextContent('Bronza')
    expect(screen.getByTestId('medal-artist')).toHaveTextContent('Hali medal yo‘q')
  })

  it('shows the Star Paths and previews every Universe sticker before it opens', async () => {
    await renderRoute('/collection')
    const paths = screen.getByTestId('medals-stars')
    expect(within(paths).getByRole('heading', { name: 'Yulduz yo‘llari' })).toBeInTheDocument()
    expect(screen.getByTestId('medal-number-path')).toHaveTextContent('Yo‘l hali boshlanmagan')
    expect(screen.getByTestId('medal-number-path')).toHaveTextContent('Keyingi bosqichgacha: 0 / 4')
    const map = screen.getByTestId('ustick-discovery-map')
    expect(map).toHaveAttribute('data-unlocked', 'false')
    expect(map).toHaveTextContent('Kashfiyot xaritasi')
    expect(map).toHaveTextContent('«Birinchi qadamlar»: Kumush')
    expect(screen.getByTestId('universe-stickers-count')).toHaveTextContent('Ochilgan: 0 / 12')
  })

  it('a Star Path step changes the medal itself and opens its sticker', async () => {
    useUniverseStore.setState({
      byChild: {
        [GUEST_KEY]: {
          ...EMPTY_UNIVERSE_CHILD,
          achievements: { 'number-path': 'gold', 'first-steps': 'silver' },
        },
      },
    })
    await renderRoute('/collection')
    const medal = screen.getByTestId('medal-number-path')
    expect(medal).toHaveAttribute('data-tier', 'gold')
    expect(medal).toHaveTextContent('Yulduz turkumi')
    expect(medal).toHaveTextContent('Butun yulduz turkumi yondi!')
    expect(medal.querySelector('[data-medal-tier="gold"] .medal-glow')).not.toBeNull()
    // a lower step has a different shape, not only another colour
    expect(screen.getByTestId('medal-first-steps').querySelector('.medal-glow')).toBeNull()
    expect(screen.getByTestId('ustick-discovery-map')).toHaveAttribute('data-unlocked', 'true')
    expect(screen.getByTestId('ustick-discovery-map')).toHaveTextContent('Ochilgan')
    expect(screen.getByTestId('universe-stickers-count')).toHaveTextContent('Ochilgan: 1 / 12')
  })
})
