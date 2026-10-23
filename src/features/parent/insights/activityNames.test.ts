import { describe, expect, it } from 'vitest'
import { STRANDS } from '@/domain/universe/types'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import {
  ACTIVITY_NAME_KEYS,
  activityName,
  SKILL_FAMILIES,
  skillFamily,
  STORY_IDS,
  STRAND_ROUTES,
} from './activityNames'
import { LEVEL_WORD_KEYS } from './insights'

describe('activityName', () => {
  it.each([
    ['find-letter:uz', { key: 'findLetter', language: 'uz' }],
    ['find-picture:ru', { key: 'findPicture', language: 'ru' }],
    ['memory:en', { key: 'memory', language: 'en' }],
    ['trace:uz', { key: 'traceLetters', language: 'uz' }],
    ['exam:uz', { key: 'exam', language: 'uz' }],
    ['words:4', { key: 'words' }],
    ['math:6-over10', { key: 'math' }],
    ['space:5', { key: 'space' }],
    ['garden:4', { key: 'garden' }],
    ['help:4', { key: 'help' }],
    ['tale:fox', { key: 'tale' }],
    ['math-lab:within10:L3', { key: 'mathLab', level: 3 }],
    ['math-lab:odd', { key: 'mathLab' }],
    ['feelings:faces:1', { key: 'feelingsFaces' }],
    ['feelings:scenes:2', { key: 'feelingsScenes' }],
    ['feelings:kindness:3', { key: 'feelingsKindness' }],
    ['feelings:calm:1', { key: 'feelings' }],
    ['story:lost-lamb', { key: 'story', storyId: 'lost-lamb' }],
    ['story:someday-new', { key: 'story' }],
    ['dino:dig:L2', { key: 'dinoDig', level: 2 }],
    ['dino:quiz:L5', { key: 'dinoQuiz', level: 5 }],
    ['dino:fly:L9', { key: 'dino' }],
    ['uzbekistan:map:1', { key: 'uzMap' }],
    ['uzbekistan:table:2', { key: 'uzTable' }],
    ['uzbekistan:patterns:3', { key: 'uzPatterns' }],
    ['uzbekistan:x', { key: 'uzbekistan' }],
    ['trace:number:7', { key: 'traceNumbers' }],
    ['trace:shape:circle', { key: 'traceShapes' }],
    ['studio:creation', { key: 'studio' }],
  ])('%s', (id, expected) => {
    expect(activityName(id)).toEqual(expected)
  })

  it('gives unknown, empty or odd ids the generic name and never throws', () => {
    for (const id of [
      '',
      'unknown',
      'what:ever:else',
      ':::',
      'toString',
      '__proto__',
      'constructor:x',
    ]) {
      expect(activityName(id)).toEqual({ key: 'other' })
    }
    expect(activityName(undefined)).toEqual({ key: 'other' })
    expect(activityName(42)).toEqual({ key: 'other' })
    expect(activityName(null)).toEqual({ key: 'other' })
  })

  it('maps Math Lab skills to families', () => {
    expect(skillFamily('sub:within10')).toBe('sub')
    expect(skillFamily('two-step:within20')).toBe('two-step')
    expect(skillFamily('mystery:thing')).toBe('other')
    expect(skillFamily(undefined)).toBe('other')
  })
})

describe('insight texts', () => {
  const locales = { uz, ru, en }

  it.each(Object.entries(locales))(
    '%s has every name, story, strand, level and skill',
    (_, locale) => {
      const insights = locale.parent.insights as unknown as Record<string, Record<string, string>>
      for (const key of ACTIVITY_NAME_KEYS) expect(insights.names?.[key], key).toBeTruthy()
      for (const id of STORY_IDS) expect(insights.stories?.[id], id).toBeTruthy()
      for (const strand of STRANDS) expect(insights.strands?.[strand], strand).toBeTruthy()
      for (const word of Object.values(LEVEL_WORD_KEYS))
        expect(insights.levels?.[word], word).toBeTruthy()
      for (const family of [...SKILL_FAMILIES, 'other']) {
        expect(insights.skillNames?.[family], family).toBeTruthy()
      }
    },
  )

  it('writes Uzbek with the right apostrophes (o‘, g‘ and ’), never ASCII quotes', () => {
    const text = JSON.stringify(uz.parent.insights)
    expect(text).not.toMatch(/[oOgG]['`ʻ’]/)
    expect(text).toContain('o‘')
  })

  it('every strand has a route inside the app', () => {
    for (const strand of STRANDS) expect(STRAND_ROUTES[strand]).toMatch(/^\/[a-z]/)
  })
})
