import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer, loadEnv, type Plugin, type ViteDevServer } from 'vite'

/**
 * /api on the developer's machine (vite dev and vite preview, so e2e tests reach it too): the same
 * server/router.ts that Vercel runs, loaded through Vite (it understands the TypeScript sources).
 * Server settings come from .env.local (never VITE_-prefixed, so they never reach the browser bundle).
 */
export function devApi(): Plugin {
  let loader: ViteDevServer | null = null
  const load = async (own?: ViteDevServer) => {
    const vite = own ?? (loader ??= await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' }))
    return (await vite.ssrLoadModule('/server/router.ts')) as { handle: (request: Request) => Promise<Response> }
  }
  const middleware = (own?: ViteDevServer) => async (req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
    if (!req.url?.startsWith('/api/') && req.url !== '/api') return next()
    try {
      const chunks: Buffer[] = []
      if (req.method !== 'GET' && req.method !== 'HEAD') for await (const chunk of req) chunks.push(chunk as Buffer)
      const headers = new Headers()
      for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
      const request = new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers,
        body: chunks.length ? Buffer.concat(chunks) : undefined,
      })
      const response = await (await load(own)).handle(request)
      res.statusCode = response.status
      response.headers.forEach((value, name) => {
        if (name !== 'set-cookie') res.setHeader(name, value)
      })
      const cookies = response.headers.getSetCookie()
      if (cookies.length) res.setHeader('set-cookie', cookies)
      res.end(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      next(error)
    }
  }
  const useServerEnv = (mode: string) => {
    for (const [name, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
      if (!name.startsWith('VITE_') && process.env[name] === undefined) process.env[name] = value
    }
  }
  return {
    name: 'kiddo:dev-api',
    configureServer(server) {
      if (process.env.VITEST) return // unit tests set their own settings and an in-memory database
      useServerEnv(server.config.mode)
      server.middlewares.use(middleware(server))
    },
    configurePreviewServer(server) {
      useServerEnv(server.config.mode)
      server.middlewares.use(middleware())
    },
  }
}
