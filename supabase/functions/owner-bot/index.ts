// POST /functions/v1/owner-bot – the owner's work bot (Phase 57). Telegram calls it
// with the secret given to setWebhook. Logic: ../_shared/ownerBot.ts.
import { handleOwnerBot } from '../_shared/ownerBot.ts'

Deno.serve((request) =>
  handleOwnerBot(request, {
    env: (name) => Deno.env.get(name),
    fetch,
    now: () => Date.now(),
    log(message, error) {
      // never a message text or a token: only what failed
      console.error(message, error instanceof Error ? error.message : String(error ?? ''))
    },
  }),
)
