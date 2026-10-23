import type { Language } from '@/content/languages'

/*
 * Client-side shapes of the Kiddo tutor (docs/architecture/ai-tutor.md). The
 * server has its own copy (supabase/functions/_shared/ai/types.ts); a unit
 * test runs the server's strict parser over requests built here, so the two
 * cannot drift apart unnoticed.
 */

export type Band = 'early' | 'intermediate' | 'advanced'
export type Intent = 'hint' | 'explain' | 'example' | 'why-wrong'
export type Persona = 'kidobot' | 'astro' | 'dinoo' | 'ziyo' | 'leafy' | 'scribble'
/** 1 tiny clue · 2 visual / concept clue · 3 partial solution · 4 full explanation. */
export type TutorHintLevel = 1 | 2 | 3 | 4

export interface TutorItem {
  skill: string
  task: string
  expression: string
  answer: string
  learnerAnswer?: string
  errorCode?: string
}

export interface TutorMemorySlice {
  mastery: number
  misconceptions: { code: string; count: number; status: 'observed' | 'confirmed' | 'improving' }[]
  preferredHint?: 'verbal' | 'visual' | 'partial'
}

export interface TutorRequest {
  v: 1
  childId: string
  language: Language
  band: Band
  persona: Persona
  intent: Intent
  hintLevel: TutorHintLevel
  item: TutorItem
  memory?: TutorMemorySlice
}

export interface TutorReply {
  message: string
  emotion: 'encouraging' | 'calm' | 'curious' | 'proud'
  hintLevel: TutorHintLevel
  recommendedAction: 'retry' | 'look' | 'count' | 'next'
}

/** Where the words on screen came from: Kiddo's own library, or a checked AI reply. */
export type TutorSource = 'local' | 'ai'
