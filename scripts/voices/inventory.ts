/**
 * Every spoken clip of the app as one table (docs/voice/inventory.tsv): language, part, voice, key, text, file.
 * Run: npx tsx --tsconfig tsconfig.app.json scripts/voices/inventory.ts > docs/voice/inventory.tsv
 * The voice job (2nd stage) works from this list; the summary is docs/voice/INVENTORY.md.
 */
import { CONTENT_PARTS, SPOKEN_PARTS, childPhrases, phrasesOfParts } from '../../src/services/audio/childPhrases'
import { phraseKey } from '../../src/services/audio/phrases'
import kid from '../../src/services/audio/kidVoiceManifest.json'

type Lang = 'uz' | 'ru' | 'en'
const all = childPhrases()
const partOf = new Map<string, string>()
for (const part of [...Object.keys(CONTENT_PARTS), ...SPOKEN_PARTS]) {
  const byLang = phrasesOfParts([part])
  for (const lang of Object.keys(byLang) as Lang[])
    for (const text of byLang[lang]) if (!partOf.has(`${lang}\0${text}`)) partOf.set(`${lang}\0${text}`, part)
}
const kidKeys = { mini: kid.girl, piku: kid.boy } as Record<'mini' | 'piku', Record<Lang, string[]>>
const kidSets = Object.fromEntries(
  Object.entries(kidKeys).map(([who, langs]) => [who, new Set(Object.values(langs).flat())]),
) as Record<'mini' | 'piku', Set<string>>
const rows = ['lang\tpart\tvoice\tkey\ttext\tfile']
for (const lang of Object.keys(all) as Lang[]) {
  for (const text of all[lang]) {
    const key = phraseKey(lang, text)
    const part = partOf.get(`${lang}\0${text}`) ?? 'other'
    const clean = text.replace(/\s+/g, ' ')
    rows.push([lang, part, 'narrator', key, clean, `public/audio/voice/${lang}/${key}.mp3`].join('\t'))
    for (const who of ['mini', 'piku'] as const)
      if (kidSets[who].has(key))
        rows.push([lang, part, who, key, clean, `public/audio/voice/kid/${who === 'mini' ? 'girl' : 'boy'}/${lang}/${key}.mp3`].join('\t'))
  }
}
process.stdout.write(rows.join('\n') + '\n')
