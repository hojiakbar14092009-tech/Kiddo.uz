import type { TFunction } from 'i18next'
import { Img3D } from '@/components/ui/Img3D'
import { ACTIVITY_LESSONS } from '@/domain/learning'
import type { LessonCard, LessonCheck } from '@/features/learn/LessonDeck'
import { tDynamic } from '@/lib/tDynamic'
import { RULE_PICTURES } from './RulePictures'
import type { SciGameId } from './games'

/*
 * Each science game's rules (Phase 63), on the Learn Before Play deck: two or
 * three cards that show what happens and what to tap, then a short try (find the
 * first card again). Only then the game starts; "Rules" shows them again.
 */

interface Rules {
  lessonId: string
  cards: readonly {
    id: string
    /** A 3D picture, an emoji, or a picture of the game itself (RULE_PICTURES). */
    art: { img3d: string } | { emoji: string; picture?: string }
  }[]
  check: LessonCheck
}

export const SCI_RULES: Readonly<Record<SciGameId, Rules>> = {
  water: {
    lessonId: ACTIVITY_LESSONS.sciWater,
    cards: [
      { id: 'sun', art: { img3d: 'sun' } },
      { id: 'cloud', art: { img3d: 'cloud' } },
      { id: 'rain', art: { img3d: 'rain-cloud' } },
    ],
    check: { ask: 'sun', other: 'cloud' },
  },
  magnet: {
    lessonId: ACTIVITY_LESSONS.sciMagnet,
    cards: [
      { id: 'iron', art: { img3d: 'key' } },
      { id: 'notIron', art: { img3d: 'apple' } },
      { id: 'tap', art: { picture: 'magnet.tap', emoji: '🧲' } },
    ],
    check: { ask: 'iron', other: 'notIron' },
  },
  float: {
    lessonId: ACTIVITY_LESSONS.sciFloat,
    cards: [
      { id: 'light', art: { img3d: 'duck' } },
      { id: 'heavy', art: { img3d: 'rock' } },
      { id: 'guess', art: { picture: 'float.guess', emoji: '🤔' } },
    ],
    check: { ask: 'light', other: 'heavy' },
  },
  scale: {
    lessonId: ACTIVITY_LESSONS.sciScale,
    cards: [
      { id: 'apples', art: { img3d: 'apple' } },
      { id: 'blocks', art: { picture: 'scale.blocks', emoji: '🔢' } },
      { id: 'even', art: { emoji: '⚖️' } },
    ],
    check: { ask: 'apples', other: 'blocks' },
  },
  robot: {
    lessonId: ACTIVITY_LESSONS.sciRobot,
    cards: [
      { id: 'arrows', art: { picture: 'robot.arrows', emoji: '➡️' } },
      { id: 'battery', art: { emoji: '🔋' } },
      { id: 'go', art: { picture: 'robot.go', emoji: '▶️' } },
    ],
    check: { ask: 'battery', other: 'arrows' },
  },
  train: {
    lessonId: ACTIVITY_LESSONS.sciTrain,
    cards: [
      { id: 'picture', art: { img3d: 'apple' } },
      { id: 'letters', art: { picture: 'train.letters', emoji: '🔤' } },
      { id: 'wagon', art: { img3d: 'train' } },
    ],
    check: { ask: 'wagon', other: 'letters' },
  },
  shop: {
    lessonId: ACTIVITY_LESSONS.sciShop,
    cards: [
      { id: 'price', art: { picture: 'shop.price', emoji: '🏷️' } },
      { id: 'coins', art: { picture: 'shop.coins', emoji: '🪙' } },
      { id: 'change', art: { emoji: '🛍️' } },
    ],
    check: { ask: 'coins', other: 'price' },
  },
  shapes: {
    lessonId: ACTIVITY_LESSONS.sciShapes,
    cards: [
      { id: 'outline', art: { img3d: 'house' } },
      { id: 'tray', art: { picture: 'shapes.tray', emoji: '🔺' } },
      { id: 'glow', art: { picture: 'shapes.glow', emoji: '✨' } },
    ],
    check: { ask: 'tray', other: 'outline' },
  },
  habitats: {
    lessonId: ACTIVITY_LESSONS.sciHabitats,
    cards: [
      { id: 'animal', art: { img3d: 'fox' } },
      { id: 'home', art: { img3d: 'pine' } },
      { id: 'tap', art: { emoji: '👆' } },
    ],
    check: { ask: 'animal', other: 'home' },
  },
  plate: {
    lessonId: ACTIVITY_LESSONS.sciPlate,
    cards: [
      { id: 'everyday', art: { img3d: 'carrot' } },
      { id: 'sometimes', art: { img3d: 'candy' } },
      { id: 'tap', art: { emoji: '👆' } },
    ],
    check: { ask: 'everyday', other: 'sometimes' },
  },
}

export function sciLessonCards(t: TFunction, game: SciGameId): LessonCard[] {
  return SCI_RULES[game].cards.map(({ id, art }) => {
    const literal = 'picture' in art && art.picture ? RULE_PICTURES[art.picture] : undefined
    const picture = literal ? (
      literal()
    ) : 'img3d' in art ? (
      <Img3D name={art.img3d} className="size-36 sm:size-44 short:size-24" eager />
    ) : (
      <span aria-hidden="true" className="text-8xl leading-none short:text-6xl">
        {art.emoji}
      </span>
    )
    return {
      id,
      art: picture,
      title: tDynamic(t, `learnFirst.sci.${game}.${id}.title`),
      lines: [tDynamic(t, `learnFirst.sci.${game}.${id}.line`)],
    }
  })
}
