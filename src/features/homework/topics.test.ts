import { describe, expect, it } from 'vitest'
import { countsFor, focusStage, homeworkActivity, homeworkRoute } from './activityHomework'
import { topicLabel, topicsFor } from './topics'

describe('planet homework (a topic of an activity)', () => {
  it('Space offers its lessons as topics, named as the child sees them', () => {
    const topics = topicsFor('space').map((topic) => topic.id)
    expect(topics).toContain('5-1')
    expect(topicLabel('space', '5-1', 'uz')).toBe('Yer, Mars, Saturn')
    expect(topicsFor('mathLab')).toEqual([])
  })

  it('opens the lesson first', () => {
    expect(homeworkRoute(homeworkActivity('space')!, '5-1')).toBe('/learn/space?lesson=5-1')
    expect(homeworkRoute(homeworkActivity('space')!)).toBe('/learn/space')
  })

  it('only the check of that very lesson counts', () => {
    expect(countsFor('space', `space:${focusStage('5-1')}`, '5-1')).toBe(true)
    expect(countsFor('space', 'space:test-5', '5-1')).toBe(false)
    expect(countsFor('space', `space:${focusStage('5-2')}`, '5-1')).toBe(false)
    // without a topic every Space check counts, as before
    expect(countsFor('space', 'space:test-5')).toBe(true)
  })
})
