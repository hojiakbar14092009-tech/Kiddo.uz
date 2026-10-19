import type { Language } from '@/content/languages'
import { SPACE_IDS, TEXT } from './content'

/*
 * Every sentence this section can read aloud, per language (for the voice
 * recorder). These are whole sentences – no {{placeholders}} – and the page
 * never speaks anything that is not on this list.
 */

function spokenFor(language: Language): string[] {
  const pack = TEXT[language]
  const lines: string[] = []
  for (const id of SPACE_IDS) {
    const object = pack.objects[id]
    lines.push(object.name, ...object.facts, object.look, object.find)
    if (object.feature) lines.push(object.feature)
    if (object.after) lines.push(object.after)
  }
  const say = pack.say
  lines.push(
    say.hello,
    ...say.correct,
    say.wrong,
    say.orderInner,
    say.orderOuter,
    say.orderDone,
    say.firstPlanet,
    say.whichPlanet,
    say.whichStar,
    say.whichMoon,
    say.whichIsPlanet,
    say.kindHelp,
    say.orderHelp,
    ...say.kindsCards,
    say.lessonDone,
  )
  return [...new Set(lines)]
}

export const SPOKEN: Record<Language, readonly string[]> = {
  uz: spokenFor('uz'),
  ru: spokenFor('ru'),
  en: spokenFor('en'),
}
