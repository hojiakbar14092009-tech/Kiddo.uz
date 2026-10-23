/*
 * Gemini adapter, free tier only (docs/architecture/ai-tutor.md §2).
 *
 * Settings (Edge Function secrets only, never VITE_*):
 *   AI_PROVIDER            none (default) | gemini-free
 *   GEMINI_API_KEY         a key from a Google project WITHOUT a billing account
 *   GEMINI_FREE_TIER_ONLY  must be "true": the owner confirms that the key's
 *                          project has no billing, so Google answers 429 when the
 *                          free quota is used up and never charges
 *   GEMINI_MODEL           one of GEMINI_FREE_MODELS (default gemini-3.8-flash)
 *
 * There is no paid model, no paid tier and no other provider behind this
 * adapter: a used-up quota is a `quota` failure (cool down, Kiddo's own hints).
 *
 * OWNER BLOCKER B5: the Gemini API Additional Terms (effective 2026-03-23) do
 * not allow API clients "directed towards or likely to be accessed by
 * individuals under the age of 18", and unpaid input/output may be read by
 * human reviewers. Kiddo is for 4–6 year olds, so AI_PROVIDER must stay unset
 * in production until Google allows this use in writing (or the terms change).
 */

import type { Env } from '../tts.ts'
import type { AIProvider, ProviderPrompt, ProviderResult } from './types.ts'

export const GEMINI_FREE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
] as const
export type GeminiFreeModel = (typeof GEMINI_FREE_MODELS)[number]
export const DEFAULT_GEMINI_MODEL: GeminiFreeModel = 'gemini-3.8-flash'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
/** Longest provider answer read (a tutor reply is far below this). */
const MAX_RESPONSE_BYTES = 64 * 1024
/** Models that take a thinking level (kept low: a hint needs speed, not long reasoning). */
const THINKING_LOW: ReadonlySet<GeminiFreeModel> = new Set(['gemini-3.8-flash', 'gemini-3.6-flash'])

const BLOCKED_FINISH = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'])

export function isGeminiFreeModel(value: unknown): value is GeminiFreeModel {
  return typeof value === 'string' && (GEMINI_FREE_MODELS as readonly string[]).includes(value)
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>

interface GeminiPart {
  text?: string
  thought?: boolean
}
interface GeminiAnswer {
  promptFeedback?: { blockReason?: string }
  candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[]
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

export class GeminiFreeProvider implements AIProvider {
  readonly id = 'gemini-free'
  readonly model: GeminiFreeModel
  private readonly apiKey: string
  private readonly fetchImpl: FetchLike

  constructor(options: { apiKey: string; model: GeminiFreeModel; fetch: FetchLike }) {
    this.apiKey = options.apiKey
    this.model = options.model
    this.fetchImpl = options.fetch
  }

  healthCheck(): { ok: boolean; reason?: string } {
    if (!this.apiKey) return { ok: false, reason: 'no key' }
    if (!isGeminiFreeModel(this.model)) return { ok: false, reason: 'not a free model' }
    return { ok: true }
  }

  generateHint(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult> {
    return this.generateTutorResponse(prompt, signal)
  }

  explainMistake(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult> {
    return this.generateTutorResponse(prompt, signal)
  }

  generatePracticeItem(prompt: ProviderPrompt, signal: AbortSignal): Promise<ProviderResult> {
    return this.generateTutorResponse(prompt, signal)
  }

  requestBody(prompt: ProviderPrompt): Record<string, unknown> {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.4,
      maxOutputTokens: prompt.maxOutputTokens,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          message: { type: 'STRING' },
          emotion: { type: 'STRING', enum: ['encouraging', 'calm', 'curious', 'proud'] },
          hintLevel: { type: 'INTEGER' },
          recommendedAction: { type: 'STRING', enum: ['retry', 'look', 'count', 'next'] },
        },
        required: ['message', 'emotion', 'hintLevel', 'recommendedAction'],
      },
    }
    if (THINKING_LOW.has(this.model)) generationConfig.thinkingConfig = { thinkingLevel: 'low' }
    const threshold = 'BLOCK_LOW_AND_ABOVE'
    return {
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
      generationConfig,
      safetySettings: [
        'HARM_CATEGORY_HARASSMENT',
        'HARM_CATEGORY_HATE_SPEECH',
        'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        'HARM_CATEGORY_DANGEROUS_CONTENT',
      ].map((category) => ({ category, threshold })),
    }
  }

  async generateTutorResponse(
    prompt: ProviderPrompt,
    signal: AbortSignal,
  ): Promise<ProviderResult> {
    let response: Response
    try {
      response = await this.fetchImpl(`${ENDPOINT}/${this.model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(this.requestBody(prompt)),
        signal,
      })
    } catch {
      return { ok: false, failure: 'transient' }
    }
    if (response.status === 429) return { ok: false, failure: 'quota' }
    if (response.status >= 500) return { ok: false, failure: 'transient' }
    if (!response.ok) return { ok: false, failure: 'config' }
    let answer: GeminiAnswer
    try {
      const text = await response.text()
      if (text.length > MAX_RESPONSE_BYTES) return { ok: false, failure: 'transient' }
      answer = JSON.parse(text) as GeminiAnswer
    } catch {
      return { ok: false, failure: 'transient' }
    }
    if (answer.promptFeedback?.blockReason) return { ok: false, failure: 'blocked' }
    const candidate = answer.candidates?.[0]
    if (!candidate) return { ok: false, failure: 'blocked' }
    if (candidate.finishReason && BLOCKED_FINISH.has(candidate.finishReason)) {
      return { ok: false, failure: 'blocked' }
    }
    const text = (candidate.content?.parts ?? [])
      .filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
    if (!text) return { ok: false, failure: 'blocked' }
    return {
      ok: true,
      text,
      promptTokens: answer.usageMetadata?.promptTokenCount,
      outputTokens: answer.usageMetadata?.candidatesTokenCount,
    }
  }
}

/**
 * The configured free provider, or null (AI off: Kiddo's own hints only).
 * Never returns anything that could bill: an unknown model, a missing key or
 * a missing free-tier confirmation all mean "no provider".
 */
export function selectAiProvider(env: Env, fetchImpl: FetchLike): AIProvider | null {
  if ((env('AI_PROVIDER') ?? 'none').trim() !== 'gemini-free') return null
  const apiKey = env('GEMINI_API_KEY')?.trim()
  if (!apiKey) return null
  if (env('GEMINI_FREE_TIER_ONLY')?.trim() !== 'true') return null
  const model = (env('GEMINI_MODEL') ?? DEFAULT_GEMINI_MODEL).trim()
  if (!isGeminiFreeModel(model)) return null
  return new GeminiFreeProvider({ apiKey, model, fetch: fetchImpl })
}
