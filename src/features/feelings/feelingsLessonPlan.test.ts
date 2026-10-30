import { describe, expect, it } from 'vitest'
import { feelingsLessonId, feelingsToTeach } from './feelingsLessonPlan'

describe('feelings lessons per level', () => {
  it('each level has its own lesson; kindness one lesson', () => {
    expect(feelingsLessonId('faces', 2)).toBe('feelings.faces.basic')
    expect(feelingsLessonId('faces', 3)).toBe('feelings.faces.mid')
    expect(feelingsLessonId('scenes', 5)).toBe('feelings.faces.full')
    expect(feelingsLessonId('kindness', 4)).toBe('feelings.kindness')
  })

  it('teaches the new feelings of a level, and everything to a child who missed earlier lessons', () => {
    expect(feelingsToTeach(2)).toEqual(['happy', 'sad', 'angry', 'scared'])
    const basicDone = (id: string) => id === 'feelings.faces.basic'
    expect(feelingsToTeach(3, basicDone)).toEqual(['surprised', 'calm'])
    expect(feelingsToTeach(3)).toHaveLength(6)
    const both = (id: string) => id === 'feelings.faces.basic' || id === 'feelings.faces.mid'
    expect(feelingsToTeach(4, both)).toEqual(['proud', 'shy', 'worried', 'disappointed'])
    expect(feelingsToTeach(4)).toHaveLength(10)
  })
})
