import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { emitActivity, useUniverseStore } from '@/domain/universe'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useSubscriptionStore } from '@/store/subscriptionStore'
import { renderRoute } from '@/test/renderRoute'
import { CITIES, CITY_IDS, FOOD_IDS, FOODS, type CityId } from './content'

vi.mock('@/domain/universe', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/domain/universe')>()
  return { ...original, emitActivity: vi.fn(original.emitActivity) }
})

beforeEach(() => {
  useSettingsStore.setState({ language: 'en' })
  useFamilyStore.setState({ children: [], activeChildId: null })
  useProgressStore.setState({ byChild: {} })
  useUniverseStore.setState({ byChild: {} })
  useSubscriptionStore.getState().cancel()
  vi.mocked(emitActivity).mockClear()
})

function askedCity(): CityId {
  const prompt = screen.getByTestId('uz-map-prompt').textContent
  const city = CITY_IDS.find((id) => CITIES[id].find.en === prompt)
  if (!city) throw new Error(`unknown prompt ${prompt}`)
  return city
}

describe('My Uzbekistan', () => {
  it('shows free games and landmarks as links and PRO ones as locked, with a calm note', async () => {
    const { user, router } = await renderRoute('/worlds/uzbekistan')
    // the hub's own lazy part may still be loading on a busy machine
    expect(await screen.findByRole('heading', { name: 'My Uzbekistan' })).toBeInTheDocument()
    expect(screen.getByTestId('uz-game-map')).toHaveAttribute('href', '/worlds/uzbekistan/map')
    expect(screen.getByTestId('uz-game-table')).toHaveAttribute('href', '/worlds/uzbekistan/table')
    expect(screen.getByTestId('uz-explore-registan')).toHaveAttribute(
      'href',
      '/worlds/uzbekistan/explore/registan',
    )
    const patterns = screen.getByRole('button', { name: 'Patterns (PRO)' })
    expect(patterns).toHaveAttribute('data-locked', 'true')
    expect(screen.getByRole('button', { name: 'The Ark fortress (PRO)' })).toBeInTheDocument()
    await user.click(patterns)
    // the robot explains; nothing opens
    expect(await screen.findByText(/This trip is part of PRO/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/worlds/uzbekistan')
  })

  it('never renders premium content without PRO, even from a link', async () => {
    await renderRoute('/worlds/uzbekistan/explore/doppi')
    expect(screen.getByTestId('uz-locked')).toBeInTheDocument()
    expect(screen.queryByTestId('uz-facts')).not.toBeInTheDocument()
  })

  it('opens premium items with PRO', async () => {
    const child = useFamilyStore
      .getState()
      .addChild({ name: 'Ali', birthDate: '2020-01-01', gender: 'boy' })
    useFamilyStore.getState().setActiveChild(child.id)
    useSubscriptionStore.getState().activatePlan('monthly', 'payment')
    const { user, router } = await renderRoute('/worlds/uzbekistan')
    await user.click(screen.getByRole('button', { name: 'The Ark fortress' }))
    expect(router.state.location.pathname).toBe('/worlds/uzbekistan/explore/ark')
    expect(
      await screen.findByText('The Ark is a very old fortress in Bukhara.'),
    ).toBeInTheDocument()
  })

  it('shows three facts and a point’s sentence on a free landmark', async () => {
    const { user } = await renderRoute('/worlds/uzbekistan/explore/registan')
    expect(within(screen.getByTestId('uz-facts')).getAllByRole('listitem')).toHaveLength(3)
    await user.click(screen.getByTestId('hotspot-dome'))
    expect(screen.getByTestId('uz-point-text')).toHaveTextContent(
      'A dome is the round roof of a madrasa.',
    )
  })

  it('plays the map game to the reward and reports the run once, with its level', async () => {
    const { user } = await renderRoute('/worlds/uzbekistan/map')
    // a guest starts at level 2: three cities on the map, four rounds
    for (let round = 0; round < 4; round += 1) {
      expect(screen.getAllByTestId('uz-city')).toHaveLength(3)
      const answer = askedCity()
      // one wrong tap first in the first round
      if (round === 0) {
        const wrong = screen.getAllByTestId('uz-city').find((b) => b.dataset.city !== answer)!
        await user.click(wrong)
        expect(screen.getByTestId('uz-feedback')).toHaveTextContent(/Let’s look again/)
      }
      await user.click(screen.getByRole('button', { name: CITIES[answer].name.en }))
      expect(screen.getByTestId('uz-feedback')).toHaveTextContent(
        `This is ${CITIES[answer].name.en}`,
      )
      await user.click(screen.getByRole('button', { name: round < 3 ? 'Next' : 'Finish' }))
    }
    expect(await screen.findByTestId('activity-reward')).toBeInTheDocument()
    expect(emitActivity).toHaveBeenCalledTimes(1)
    expect(vi.mocked(emitActivity).mock.calls[0]![0]).toMatchObject({
      activity: 'uzbekistan:map:basic',
      strand: 'language',
      level: 2,
      correct: 4,
      total: 4,
      independent: 3,
    })
    // "play again" starts a new run without paying the old one twice
    await user.click(screen.getByRole('button', { name: 'Play again' }))
    expect(emitActivity).toHaveBeenCalledTimes(1)
  })

  it('sets the dasturxon with taps; a toy comes back with a kind word', async () => {
    const { user } = await renderRoute('/worlds/uzbekistan/table')
    for (let round = 0; round < 3; round += 1) {
      const items = screen.getAllByTestId('uz-table-item')
      const toy = items.find((b) => !(FOOD_IDS as readonly string[]).includes(b.dataset.item!))!
      if (round === 0) {
        await user.click(toy)
        expect(screen.getByTestId('uz-feedback').textContent).not.toBe('')
        expect(screen.getByTestId('uz-cloth')).toHaveAttribute('data-count', '0')
      }
      for (const item of items) {
        const id = item.dataset.item as (typeof FOOD_IDS)[number]
        if (FOOD_IDS.includes(id)) {
          await user.click(
            screen.getByRole('button', { name: `${FOODS[id].label.en}: put on the dasturxon` }),
          )
        }
      }
      expect(screen.getByTestId('uz-feedback')).toHaveTextContent('The dasturxon is ready!')
      await user.click(screen.getByRole('button', { name: round < 2 ? 'Next' : 'Finish' }))
    }
    expect(await screen.findByTestId('activity-reward')).toBeInTheDocument()
    expect(emitActivity).toHaveBeenCalledTimes(1)
    expect(vi.mocked(emitActivity).mock.calls[0]![0]).toMatchObject({
      activity: 'uzbekistan:table:basic',
      level: 2,
      total: 3,
      independent: 2,
    })
  })
})
