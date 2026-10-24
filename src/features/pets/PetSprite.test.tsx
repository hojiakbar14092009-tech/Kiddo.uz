import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PetSprite } from './PetSprite'

const sources = (container: HTMLElement) =>
  [...container.querySelectorAll('img')].map((img) => img.getAttribute('src'))

describe('PetSprite loads only the poses it can show', () => {
  it('a fixed pose loads one picture, not all six', () => {
    const { container } = render(<PetSprite pet="cat" emotion="happy" />)
    expect(sources(container)).toEqual(['/pets/cat/happy.webp'])
  })

  it('the idle loop loads its three poses up front', () => {
    const { container } = render(<PetSprite pet="bunny" />)
    expect(sources(container)).toHaveLength(3)
    expect(sources(container)).not.toContain('/pets/bunny/angry.webp')
  })

  it('a new pose shows only once its picture has loaded; until then the old one stays', () => {
    const { container, rerender } = render(<PetSprite pet="parrot" emotion="happy" />)
    const happy = container.querySelector('img')!
    fireEvent.load(happy)
    rerender(<PetSprite pet="parrot" emotion="sad" />)
    expect(sources(container)).toEqual(['/pets/parrot/happy.webp', '/pets/parrot/sad.webp'])
    // the sad picture is still on its way (slow network): the happy one stays visible
    const visible = () => container.querySelector('img.opacity-100')?.getAttribute('src')
    expect(visible()).toBe('/pets/parrot/happy.webp')
    fireEvent.load(container.querySelector('img[src$="sad.webp"]')!)
    expect(visible()).toBe('/pets/parrot/sad.webp')
    // back to happy: already loaded, so at once
    rerender(<PetSprite pet="parrot" emotion="happy" />)
    expect(visible()).toBe('/pets/parrot/happy.webp')
  })

  it('a companion warms all six poses once the page is idle', async () => {
    const { container } = render(<PetSprite pet="cat" emotion="happy" warm />)
    expect(sources(container)).toHaveLength(1)
    await vi.waitFor(() => expect(sources(container)).toHaveLength(6))
  })

  it('without motion it loads only the pose on screen', () => {
    const { container } = render(<PetSprite pet="hamster" lively={false} />)
    expect(sources(container)).toEqual(['/pets/hamster/happy.webp'])
  })
})
