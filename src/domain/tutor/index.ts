export {
  AI_TIMEOUT_MS,
  AI_TUTOR_ENABLED,
  aiAvailability,
  askTutorAI,
  pullAiConsent,
  readReply,
  resetAiClientForTests,
  saveAiConsent,
  TUTOR_POLICY_VERSION,
  useAiAvailability,
  useAiConsentStore,
  type AiAvailability,
} from './aiClient'
export { buildTutorRequest, memorySlice } from './context'
export { aiWorthAsking, bandForLevel, hintForMisses, nextHint } from './ladder'
export type {
  Band,
  Intent,
  Persona,
  TutorHintLevel,
  TutorItem,
  TutorMemorySlice,
  TutorReply,
  TutorRequest,
  TutorSource,
} from './types'
