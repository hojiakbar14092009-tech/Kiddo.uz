import { describe, expect, it } from 'vitest'
import { inChildArea, isLearningScreen } from './routes'

describe('attention routes', () => {
  it('watches touch and gaze only while learning or playing', () => {
    for (const path of [
      '/alphabet/uz-a',
      '/tasks/memory',
      '/learn/tales',
      '/math-lab',
      '/sci/magnet',
    ])
      expect(isLearningScreen(path)).toBe(true)
    for (const path of ['/home', '/learn', '/reward', '/rest', '/shorts', '/shop', '/alphabet'])
      expect(isLearningScreen(path)).toBe(false)
  })

  it('stays out of the grown-ups’ screens', () => {
    for (const path of ['/parent', '/parent/dashboard', '/admin', '/', '/rest'])
      expect(inChildArea(path)).toBe(false)
    expect(inChildArea('/home')).toBe(true)
    expect(inChildArea('/shorts')).toBe(true)
  })
})
