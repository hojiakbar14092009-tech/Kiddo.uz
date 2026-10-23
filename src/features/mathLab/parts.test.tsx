import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { seeded } from '@/features/learn/random'
import { planSession } from './generators'
import { SceneView, WORD_PICTURE_MAX } from './parts'

/** The objects drawn in the picture (the row inside it, not the basket). */
const objectsIn = (el: HTMLElement) => el.querySelector(':scope > [data-count]')!.children.length

describe('Math Lab word problem picture', () => {
  it('shows exactly the `a` objects of the story when a ≤ 10', () => {
    for (const a of [2, 7, WORD_PICTURE_MAX]) {
      const { unmount } = render(<SceneView scene={{ type: 'word', a }} object="apple" />)
      const picture = screen.getByTestId('lab-word-picture')
      expect(picture).toHaveAttribute('data-count', String(a))
      expect(objectsIn(picture)).toBe(a)
      unmount()
    }
  })

  it('shows no object picture when a > 10', () => {
    const { container } = render(<SceneView scene={{ type: 'word', a: 13 }} object="apple" />)
    expect(screen.queryByTestId('lab-word-picture')).not.toBeInTheDocument()
    expect(container).toBeEmptyDOMElement()
  })

  it('matches the text of every generated word problem', () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      for (const q of planSession(5, seeded(seed)).filter((x) => x.kind === 'word')) {
        if (q.scene.type !== 'word') continue
        const a = q.prompt.params.a as number
        expect(q.scene.a).toBe(a)
        const { unmount } = render(<SceneView scene={q.scene} object={q.object} />)
        const picture = screen.queryByTestId('lab-word-picture')
        if (a <= WORD_PICTURE_MAX) expect(objectsIn(picture!)).toBe(a)
        else expect(picture).toBeNull()
        unmount()
      }
    }
  })
})
