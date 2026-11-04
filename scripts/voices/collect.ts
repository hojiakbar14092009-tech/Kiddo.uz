/**
 * Lists every sentence the app can say, per language, for the voice recorder
 * (generate.py). Run: npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json
 *
 * With --parts a,b,c only those interface parts (the children's voices record
 * praise and instructions first: kid_voices.py).
 */
import { childPhrases, phrasesOfParts } from '../../src/services/audio/childPhrases'

const flag = process.argv.indexOf('--parts')
const parts = flag >= 0 ? (process.argv[flag + 1] ?? '').split(',').filter(Boolean) : null
process.stdout.write(JSON.stringify(parts ? phrasesOfParts(parts) : childPhrases(), null, 1))
