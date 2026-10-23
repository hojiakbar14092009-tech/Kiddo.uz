/*
 * Shared types of the Kiddo tutor (Phase 10, docs/architecture/ai-tutor.md).
 * Plain TypeScript (no Deno APIs), so vitest tests every module under Node.
 *
 * Layers: AI provider (this interface, one adapter per provider) → tutor
 * handler (policy, context, safety, validation) → Kiddo's own learning
 * memory (client domain + migration 0008). A provider never owns memory and
 * never decides whether an answer is right: the game engine does.
 */

export const TUTOR_LANGUAGES = ['uz', 'ru', 'en'] as const
export type TutorLanguage = (typeof TUTOR_LANGUAGES)[number]

/** How deep explanations go; from the challenge level, never from age alone. */
export const BANDS = ['early', 'intermediate', 'advanced'] as const
export type Band = (typeof BANDS)[number]

/** What the learner asked for (buttons only; there is no free chat). */
export const INTENTS = ['hint', 'explain', 'example', 'why-wrong'] as const
export type Intent = (typeof INTENTS)[number]

/** The mascot presenting the reply: the voice changes, the policy does not. */
export const PERSONAS = ['kidobot', 'astro', 'dinoo', 'ziyo', 'leafy', 'scribble'] as const
export type Persona = (typeof PERSONAS)[number]

export type HintLevel = 1 | 2 | 3 | 4

export const EMOTIONS = ['encouraging', 'calm', 'curious', 'proud'] as const
export type Emotion = (typeof EMOTIONS)[number]

export const ACTIONS = ['retry', 'look', 'count', 'next'] as const
export type RecommendedAction = (typeof ACTIONS)[number]

export const MEMORY_STATUSES = ['observed', 'confirmed', 'improving'] as const

/** The exercise as the game engine knows it: numbers and codes only. */
export interface TutorItem {
  /** Engine skill key, e.g. `add:within20`. */
  skill: string
  /** Engine task kind, e.g. `add`, `missing`, `count`. */
  task: string
  /** The exercise in symbols, e.g. `8 + 7 = ?`. */
  expression: string
  /** The right answer, decided by the game engine (authoritative). */
  answer: string
  /** What the learner chose last (absent before the first answer). */
  learnerAnswer?: string
  /** The engine's error code of that choice, e.g. `off-by-one`. */
  errorCode?: string
}

/** The anonymous slice of learning memory that matters for this item. */
export interface TutorMemory {
  /** 0–1. */
  mastery: number
  misconceptions: { code: string; count: number; status: (typeof MEMORY_STATUSES)[number] }[]
  preferredHint?: 'verbal' | 'visual' | 'partial'
}

/** Client → server. No names, ids of people, ages, places or free chat history. */
export interface TutorRequest {
  v: 1
  /** Only to check the parent's consent on the server; never sent to a provider. */
  childId: string
  language: TutorLanguage
  band: Band
  persona: Persona
  intent: Intent
  hintLevel: HintLevel
  item: TutorItem
  memory?: TutorMemory
}

/** Server → client: one validated, short reply. */
export interface TutorReply {
  message: string
  emotion: Emotion
  hintLevel: HintLevel
  recommendedAction: RecommendedAction
}

/** What a provider gets: the policy, the safe context and the output shape. */
export interface ProviderPrompt {
  system: string
  /** The context as data (JSON in a fenced block), never mixed into the policy. */
  user: string
  maxOutputTokens: number
}

export type ProviderFailure =
  /** The free quota is used up or the provider says slow down: cool down, never pay. */
  | 'quota'
  /** Network, timeout, 5xx: one retry, then the local fallback. */
  | 'transient'
  /** The provider refused the content (safety block). */
  | 'blocked'
  /** Bad key, unknown model, not allowed: an owner must fix the settings. */
  | 'config'

export type ProviderResult =
  | { ok: true; text: string; promptTokens?: number; outputTokens?: number }
  | { ok: false; failure: ProviderFailure }

/**
 * One AI provider. Every adapter is free-only: there is no paid tier, no
 * billing switch and no paid fallback anywhere behind this interface.
 */
export interface AIProvider {
  readonly id: string
  readonly model: string
  /** Any tutor reply (the other methods are this with a fixed intent). */
  generateTutorResponse(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult>
  generateHint(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult>
  explainMistake(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult>
  /** A worked example whose numbers the server chose (the provider only words it). */
  generatePracticeItem(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult>
  /** Configuration only (no network call, so it never spends quota). */
  healthCheck(): { ok: boolean; reason?: string }
}
