// POST /functions/v1/tts – a generated sentence as a signed URL (PRO only;
// 503 when there is no real voice for the language).
// Contract: docs/architecture/audio-security.md. Logic: ../_shared/handlers.ts.
import { handleTts } from '../_shared/handlers.ts'
import { supabaseDeps } from '../_shared/supabaseDeps.ts'

const deps = supabaseDeps((name) => Deno.env.get(name))

Deno.serve((request) => handleTts(request, deps))
