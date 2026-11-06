import type { TFunction } from 'i18next'
import type { Language } from '@/content/languages'
import { BIRTHDAY_COINS } from '@/features/birthday/birthday'
import { FEELING_TEXT, SCENES, SITUATIONS } from '@/features/feelings/content'
import { KIND_DEEDS } from '@/features/feelings/feelingsLessonPlan'
import { LAB_OBJECTS, LEVEL_PLAN, makeQuestion } from '@/features/mathLab/generators'
import { helpText, promptText } from '@/features/mathLab/text'
import { solutionText } from '@/features/mathLab/tutor'
import { SCI_RULES } from '@/features/sciGames/lessons'
import { DINO_IDS, DINOS } from '@/features/worlds/dino/content'
import { DIG_LEVELS } from '@/features/worlds/dino/dig'
import { QUIZ_LEVELS } from '@/features/worlds/dino/quiz'
import { DINO_TEXT } from '@/features/worlds/dino/text'
import {
  CITIES,
  CITY_IDS,
  EXPLORE,
  FOOD_IDS,
  FOODS,
  joinList,
  MOTIF_IDS,
  MOTIF_NAMES,
  OTHER_IDS,
  OTHERS,
  TABLE_TEXT,
} from '@/features/worlds/uzbekistan/content'
import { en } from '@/i18n/locales/en'
import { ru } from '@/i18n/locales/ru'
import { uz } from '@/i18n/locales/uz'
import { seededRandom } from '@/lib/random'
import { templatePieces } from './pieces'

/*
 * The real values of the spoken templates (a city, a dinosaur, a noun, a
 * number), so each filled-in sentence can be listed and recorded. Keys are
 * i18n keys; `worlds.dino.` keys are the dinosaur world's own texts (DINO_TEXT).
 * An empty list: the line is only said inside another one (learnFirst.dinoLength).
 * A key without an entry is screen-only (counters, aria-labels) or the child's name.
 */

export type Params = Record<string, string | number>

const TREES = { uz, ru, en } as unknown as Record<Language, Record<string, unknown>>

export function fillTemplate(template: string, params: Params = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

function lookup(language: Language, key: string): string {
  const value = key
    .split('.')
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], TREES[language])
  return typeof value === 'string' ? value : key
}

/** Every Math Lab question of levels 1–5, via the real generators, with each object. */
function mathLabFills(language: Language, add: (key: string, params: Params) => void) {
  const t = ((key: string, params?: Params) => {
    if (params && Object.keys(params).length > 0) add(key, params)
    return fillTemplate(lookup(language, key), params)
  }) as unknown as TFunction
  // shortcut: the mastery steps above level 5 (numbers up to 99 999) are left out:
  // too many to record; their prompts and help lines have no numbers, the tutor's
  // "Mana yechimi: …" for them stays with the device voice
  for (const level of [1, 2, 3, 4, 5] as const) {
    LEVEL_PLAN[level].forEach((_, index) => {
      // `used` makes the generator pick a new item each time, so every item comes up
      const used = new Set<string>()
      for (let seed = 1, repeats = 0; repeats < 40; seed += 1) {
        const made = makeQuestion(
          level,
          index,
          seededRandom(seed * 7919 + level * 31 + index),
          used,
        )
        if (used.has(made.id)) repeats += 1
        else repeats = 0
        used.add(made.id)
        for (const object of LAB_OBJECTS) {
          const q = { ...made, object }
          promptText(t, language, q)
          helpText(t, q)
          // the tutor's own words (MathLabPage localHint, steps 3 and 4)
          const target = q.scene.type === 'basket' ? q.scene.target : 0
          if (q.kind === 'drag') {
            t('tutor.partialDrag', { target })
            t('tutor.solutionDrag', { target })
          } else t('tutor.solution', { solution: solutionText(t, language, q) })
        }
      }
    })
  }
}

const cache = new Map<Language, ReadonlyMap<string, Params[]>>()

export function fillsFor(language: Language): ReadonlyMap<string, Params[]> {
  const known = cache.get(language)
  if (known) return known
  const fills = new Map<string, Map<string, Params>>()
  const add = (key: string, params: Params) => {
    if (!fills.has(key)) fills.set(key, new Map())
    fills.get(key)!.set(JSON.stringify(params), params)
  }
  const dino = DINO_TEXT[language]
  const t = (key: string, params?: Params) => fillTemplate(lookup(language, key), params)

  add('birthday.text', { coins: BIRTHDAY_COINS })
  add('birthday.textAllPets', { coins: BIRTHDAY_COINS })

  // The lesson check asks for the deck's first card, or the one its check names
  // (LessonDeck). A feelings deck starts with any feeling not seen yet.
  const titles = [
    ...Object.values(FEELING_TEXT).map((feeling) => feeling.label[language]),
    t(`feelings.lesson.kindness.${KIND_DEEDS[0].id}.title`),
    t('learnFirst.lab.water.title'),
    ...Object.entries(SCI_RULES).map(([game, rules]) =>
      t(`learnFirst.sci.${game}.${rules.check.ask}.title`),
    ),
    dino.dinos[DINO_IDS[0]].name,
    // UzLesson: map and patterns name their check, the table starts with its first food
    CITIES[CITY_IDS[0]].name[language],
    MOTIF_NAMES[MOTIF_IDS[0]][language],
    FOODS[FOOD_IDS[0]].label[language],
  ]
  titles.forEach((title) => add('learnFirst.check', { title }))

  // the dinosaur lesson (DinoLesson)
  for (const id of DINO_IDS) {
    const animal = dino.dinos[id]
    add('learnFirst.dinoDiet', { diet: dino.diet[DINOS[id].diet] })
    const spots = Object.values(animal.spots as Record<string, { label: string }>)
    add('learnFirst.dinoParts', { parts: spots.map((spot) => spot.label).join(', ') })
    add('learnFirst.dinoBone', { bone: animal.bone })
    add('worlds.dino.explore.found', { name: animal.name })
    add('worlds.dino.quiz.eat', { name: animal.name })
    add('worlds.dino.dig.hint', { part: animal.bone })
  }
  const measured = DINO_IDS.filter((id) => DINOS[id].lengthM > 0).sort(
    (a, b) => DINOS[b].lengthM - DINOS[a].lengthM,
  )
  const list = measured
    .map((id) => t('learnFirst.dinoLength', { name: dino.dinos[id].name, m: DINOS[id].lengthM }))
    .join(', ')
  add('learnFirst.dinoLengthLine', { list })
  fills.set('learnFirst.dinoLength', new Map())
  // the dinosaur result: first tries out of a quiz's questions or a dig's bones
  const totals = new Set([
    ...Object.values(QUIZ_LEVELS).map((plan) => plan.kinds.length),
    ...Object.values(DIG_LEVELS).map((plan) => plan.bones),
  ])
  for (const total of totals)
    for (let correct = 0; correct <= total; correct += 1)
      add('worlds.dino.result.score', { correct, total })

  add('learnFirst.patternLine', {
    a: MOTIF_NAMES[MOTIF_IDS[0]][language],
    b: MOTIF_NAMES[MOTIF_IDS[1]][language],
  })
  for (const id of MOTIF_IDS) add('learnFirst.motifLine', { name: MOTIF_NAMES[id][language] })
  for (const id of CITY_IDS) {
    add('uzbekistan.map.right', { city: CITIES[id].name[language] })
    add('uzbekistan.map.wrong', { city: CITIES[id].name[language] })
  }
  for (const scene of SCENES) add('feelings.askScene', { name: scene.name[language] })

  // the shop's pets: {{name}} there is the pet, said by the robot (PetsPanel); the
  // dialog titles and the friendship toast only show it
  const pets = Object.values((TREES[language].shop as { pets: Record<string, string> }).pets)
  for (const name of pets) {
    add('shop.petPreview', { name })
    add('shop.petBought', { name })
  }
  for (const shown of ['shop.petConfirm', 'shop.confirm', 'shop.petBondUp']) {
    fills.set(shown, new Map())
  }

  mathLabFills(language, add)

  const out = new Map([...fills].map(([key, values]) => [key, [...values.values()]]))
  cache.set(language, out)
  return out
}

/** The localized texts ({uz, ru, en}) anywhere inside a content object. */
function texts(node: unknown, language: Language): string[] {
  if (typeof node !== 'object' || node === null) return []
  const value = (node as Record<string, unknown>)[language]
  if (typeof value === 'string') return /\{\{/.test(value) ? [] : [value]
  return Object.values(node).flatMap((child) => texts(child, language))
}

/** What the Emotions section says from its content file (FeelingsRun, FeelingsLesson). */
export function feelingsSpoken(language: Language): string[] {
  const why = lookup(language, 'feelings.why')
  return [
    ...texts([FEELING_TEXT, SCENES, SITUATIONS], language),
    // "Why? …" before the reason of a right answer
    ...Object.values(FEELING_TEXT).map((feeling) => `${why} ${feeling.clue[language]}`),
    ...SCENES.map((scene) => `${why} ${scene.why[language]}`),
  ]
}

/** What the Uzbekistan world says from its content file (explore cards, games, lessons). */
export function uzbekistanSpoken(language: Language): string[] {
  const lines = texts([EXPLORE, CITIES, FOODS, OTHERS, TABLE_TEXT, MOTIF_NAMES], language)
  // the lesson's "not food" card names the things in one line
  lines.push(OTHER_IDS.map((id) => OTHERS[id].label[language]).join(', '))
  // a table round names 3 or 4 foods: said from pieces ("dasturxonga", each food, "va", "qo‘y")
  const foods = joinList(
    FOOD_IDS.map((food) => FOODS[food].inList[language]),
    language,
  )
  return [...lines, ...templatePieces(TABLE_TEXT.named[language], [foods], language)]
}
