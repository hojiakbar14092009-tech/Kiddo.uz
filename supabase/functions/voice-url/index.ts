// POST /functions/v1/voice-url – signed URLs for recorded clips (PRO only).
// Contract: docs/architecture/audio-security.md. Logic: ../_shared/handlers.ts.
import { handleVoiceUrl } from '../_shared/handlers.ts'
import { supabaseDeps } from '../_shared/supabaseDeps.ts'

const deps = supabaseDeps((name) => Deno.env.get(name))

Deno.serve((request) => handleVoiceUrl(request, deps))
