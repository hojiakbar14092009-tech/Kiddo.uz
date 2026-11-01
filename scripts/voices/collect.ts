/**
 * Lists every sentence the app can say, per language, for the voice recorder
 * (generate.py). Run: npx tsx --tsconfig tsconfig.app.json scripts/voices/collect.ts > scripts/voices/phrases.json
 */
import { childPhrases } from '../../src/services/audio/childPhrases'

process.stdout.write(JSON.stringify(childPhrases(), null, 1))
