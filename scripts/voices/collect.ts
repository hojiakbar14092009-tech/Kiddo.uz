/**
 * Lists every sentence the app can say, per language, for the voice recorder
 * (generate.py). Run: npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json
 *
 * With --parts a,b,c only those interface parts (the children's voices record
 * praise and instructions first: kid_voices.py), and with --except a,b the keys
 * under those parts that are never said aloud (labels, buttons).
 */
import { childPhrases, phrasesOfParts } from '../../src/services/audio/childPhrases'

const list = (name: string) => {
  const flag = process.argv.indexOf(name)
  return flag >= 0 ? (process.argv[flag + 1] ?? '').split(',').filter(Boolean) : null
}
const parts = list('--parts')
process.stdout.write(
  JSON.stringify(parts ? phrasesOfParts(parts, list('--except') ?? []) : childPhrases(), null, 1),
)
