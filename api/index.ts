// The only Vercel Function: every /api/* route is rewritten here (vercel.json) and dispatched
// by server/router.ts. Web-standard Request/Response handlers (Node.js runtime).
import { handle } from '../server/router.js'

export const GET = handle
export const POST = handle
export const PUT = handle
export const DELETE = handle
