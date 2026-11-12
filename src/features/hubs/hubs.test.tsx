import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useFamilyStore } from '@/store/familyStore'
import { useProgressStore } from '@/store/progressStore'
import { useSettingsStore } from '@/store/settingsStore'
import { useUniverseStore } from '@/domain/universe/store'
import { renderRoute } from '@/test/renderRoute'
import { BUILDINGS } from '@/domain/universe/world'
import { hubOf, sectionOf } from './sections'

describe('sections', () => {
  it('puts every child page in one of four sections, the longest prefix first', () => {
    expect(sectionOf('/home')).toBe('today')
    expect(sectionOf('/reward')).toBe('today')
    expect(sectionOf('/learn')).toBe('learn')
    expect(sectionOf('/learn/words')).toBe('learn')
    expect(sectionOf('/learn/space/mars')).toBe('explore')
    expect(sectionOf('/alphabet/a')).toBe('learn')
    expect(sectionOf('/worlds/dino')).toBe('explore')
    expect(sectionOf('/spaceport/mars')).toBe('explore')
    expect(sectionOf('/collection')).toBe('mine')
    expect(sectionOf('/studio/gallery')).toBe('mine')
    // the first screens, the parent and admin areas have no section
    expect(sectionOf('/')).toBeNull()
    expect(sectionOf('/parent/dashboard')).toBeNull()
    expect(sectionOf('/admin')).toBeNull()
    expect(sectionOf('/learning')).toBeNull()
    expect(hubOf('/math-lab')).toBe('/learn')
    expect(hubOf('/parent')).toBe('/home')
  })
})

describe('the four section pages', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'uz' })
    useFamilyStore.setState({ children: [], activeChildId: null })
    useProgressStore.setState({ byChild: {} })
    useUniverseStore.setState({ byChild: {} })
  })

  it('shows four tabs on Home, the current one marked, and sets the page’s world', async () => {
    await renderRoute('/home')
    const tabs = screen.getByRole('navigation', { name: 'Bo‘limlar' })
    const links = within(tabs).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Bugun',
      'O‘rgan',
      'Kashf et',
      'Mening dunyom',
    ])
    expect(within(tabs).getByRole('link', { name: 'Bugun' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(document.documentElement.dataset.world).toBe('today')
  })

  it('Home is simple: one big “Davom etish” to the next game, the plan, no city', async () => {
    await renderRoute('/home')
    const go = screen.getByTestId('home-continue')
    expect(go).toHaveAttribute('href', '/tasks/find-letter')
    expect(go).toHaveTextContent('Davom etish')
    expect(go).toHaveTextContent('Keyingisi: Harfni top')
    expect(screen.queryByTestId('resource-bar')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Yana nima qilamiz?' })).not.toBeInTheDocument()
  })

  it('O‘rgan lists the learning places and the small games', async () => {
    const { user } = await renderRoute('/home')
    await user.click(screen.getByRole('link', { name: 'O‘rgan' }))
    expect(screen.getByRole('heading', { level: 1, name: 'O‘rgan' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Matematika shahri' })).toHaveAttribute(
      'href',
      '/math-lab',
    )
    expect(screen.getByRole('link', { name: 'Ertaklar' })).toHaveAttribute('href', '/stories')
    expect(screen.getByRole('heading', { name: 'Harflar va so‘zlar' })).toBeInTheDocument()
    expect(document.documentElement.dataset.world).toBe('learn')
  })

  it('Kashf et has the worlds (no map, no Shadow Lab); a closed world says what opens it', async () => {
    await renderRoute('/explore')
    expect(screen.queryByRole('link', { name: 'Xarita' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Soya laboratoriyasi' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Dinozavrlar' })).toHaveAttribute(
      'href',
      '/worlds/dino',
    )
    expect(screen.getByText('Mars guli ochilganda ochiladi')).toBeInTheDocument()
    expect(document.documentElement.dataset.world).toBe('explore')
  })

  it('Mening dunyom is the child’s city with its treasures', async () => {
    await renderRoute('/my-world')
    expect(screen.getByTestId('resource-bar')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kiddo shahri' })).toBeInTheDocument()
    expect(document.documentElement.dataset.world).toBe('mine')
  })

  it("each place has one door, in its tab (MVP: no shortcut row on Home); the parents' lock stays", async () => {
    await renderRoute('/home')
    expect(screen.queryByRole('navigation', { name: 'Eng kerakli joylar' })).toBeNull()
    expect(screen.getByTestId('parent-lock')).toHaveAttribute('href', '/parent')
    const hrefsOf = async (route: string) => {
      const { unmount } = await renderRoute(route)
      const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'))
      unmount()
      return hrefs
    }
    const learn = await hrefsOf('/learn')
    for (const href of ['/games', '/stories', '/learn/my-story'])
      expect(learn, href).toContain(href)
    expect(await hrefsOf('/explore')).toContain('/shorts')
  })

  it('no place is lost: O‘rgan and Kashf et still lead to every learning building', async () => {
    const hrefs = new Set<string>()
    for (const route of ['/learn', '/explore']) {
      const { unmount } = await renderRoute(route)
      screen.getAllByRole('link').forEach((link) => hrefs.add(link.getAttribute('href') ?? ''))
      unmount()
    }
    const own = new Set(['shop', 'museum', 'art-studio'])
    for (const building of BUILDINGS.filter((item) => !own.has(item.id)))
      expect(hrefs, building.id).toContain(building.route)
  })
})
