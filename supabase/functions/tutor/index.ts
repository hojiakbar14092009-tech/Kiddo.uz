// POST /functions/v1/tutor – one short, checked tutor reply from a free AI
// provider, or 503 (the app then uses Kiddo's own hints). PRO and parent
// consent are checked on the server. Contract: docs/architecture/ai-tutor.md.
// Logic: ../_shared/ai/handler.ts.
import { handleTutor } from '../_shared/ai/handler.ts'
import { tutorDeps } from '../_shared/ai/tutorDeps.ts'

const deps = tutorDeps((name) => Deno.env.get(name))

Deno.serve((request) => handleTutor(request, deps))
