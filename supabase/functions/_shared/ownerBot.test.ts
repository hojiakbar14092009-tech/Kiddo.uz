import { describe, expect, it, vi } from 'vitest'
import {
  BRANCH_PREFIX,
  handleOwnerBot,
  promptProject,
  readOwnerId,
  readProjects,
  TASK_MAX,
  TEXT,
  type OwnerBotDeps,
} from './ownerBot.ts'

const SECRET = 's'.repeat(40)
const OWNER = 555
const REPO = 'me/Kiddo.uz'
const PROJECTS = JSON.stringify([
  { name: 'Kiddo', repo: REPO },
  { name: 'BarakaLi', repo: 'me/barakali', branch: 'master' },
  { name: 'UstaGo', repo: 'me/ustago' },
])
const SHA = 'abcdef1234567890abcdef1234567890abcdef12'

interface Call {
  method: string
  url: string
  body: unknown
  auth: string | null
}

type Route = { status: number; body?: unknown }

function setup(routes: Record<string, Route> = {}, env: Record<string, string> = {}) {
  const calls: Call[] = []
  const fetchFn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const headers = new Headers(init?.headers)
    calls.push({
      method,
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers.get('Authorization'),
    })
    if (url.startsWith('https://api.telegram.org/')) return new Response('{"ok":true}')
    const path = url.replace('https://api.github.com', '')
    const route = routes[`${method} ${path}`]
    if (!route) {
      // nothing running and no PR open, unless a test says so
      if (path.endsWith('/runs?per_page=10')) {
        return Response.json({ workflow_runs: [{ status: 'completed' }] })
      }
      if (path.endsWith('/pulls?state=open&per_page=100')) return Response.json([])
      return new Response('not found', { status: 404 })
    }
    return route.body === undefined
      ? new Response(null, { status: route.status })
      : Response.json(route.body, { status: route.status })
  })
  const values: Record<string, string> = {
    OWNER_BOT_WEBHOOK_SECRET: SECRET,
    OWNER_TELEGRAM_ID: String(OWNER),
    OWNER_GITHUB_TOKEN: 'ghp_secret_token',
    OWNER_BOT_TOKEN: '123:bot-token',
    OWNER_PROJECTS: PROJECTS,
    ...env,
  }
  const log = vi.fn()
  const deps: OwnerBotDeps = {
    env: (name) => values[name],
    fetch: fetchFn as unknown as typeof fetch,
    now: () => 1_700_000_000_000,
    log,
  }
  const github = () => calls.filter((c) => c.url.startsWith('https://api.github.com'))
  return { deps, calls, github, log }
}

function post(update: unknown, secret = SECRET) {
  return new Request('https://x/functions/v1/owner-bot', {
    method: 'POST',
    headers: { 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: JSON.stringify(update),
  })
}

const text = (value: string, extra: Record<string, unknown> = {}, from = OWNER) => ({
  message: {
    chat: { id: from, type: 'private' },
    from: { id: from, is_bot: false },
    text: value,
    ...extra,
  },
})

const answerTo = (prompt: string, value: string) =>
  text(value, { reply_to_message: { text: prompt, from: { is_bot: true } } })

const button = (data: string, from = OWNER) => ({
  callback_query: {
    id: 'q1',
    from: { id: from },
    data,
    message: { message_id: 42, chat: { id: from, type: 'private' } },
  },
})

async function body(response: Response) {
  return (await response.json()) as {
    method: string
    chat_id: number
    text: string
    reply_markup?: {
      inline_keyboard?: { text: string; callback_data: string }[][]
      force_reply?: boolean
    }
  }
}

const pull = (over: Record<string, unknown> = {}) => ({
  number: 12,
  state: 'open',
  merged: false,
  head: { ref: `${BRANCH_PREFIX}mabc`, sha: SHA, repo: { full_name: REPO } },
  base: { ref: 'main' },
  ...over,
})

describe('owner bot config (Phase 57)', () => {
  it('reads the project list and refuses a wrong one', () => {
    expect(readProjects(PROJECTS)).toEqual([
      { name: 'Kiddo', repo: REPO, branch: 'main' },
      { name: 'BarakaLi', repo: 'me/barakali', branch: 'master' },
      { name: 'UstaGo', repo: 'me/ustago', branch: 'main' },
    ])
    expect(readProjects(undefined)).toBeNull()
    expect(readProjects('[]')).toBeNull()
    expect(readProjects('{')).toBeNull()
    expect(readProjects('[{"name":"a b","repo":"me/x"}]')).toBeNull()
    expect(readProjects('[{"name":"A","repo":"../x"}]')).toBeNull()
    expect(readProjects('[{"name":"A","repo":"me/.."}]')).toBeNull()
    expect(readProjects('[{"name":"A","repo":"me/x","branch":"../x"}]')).toBeNull()
    expect(readProjects('[{"name":"A","repo":"me/x","branch":"a b"}]')).toBeNull()
    expect(readProjects('[{"name":"A","repo":"me/x"},{"name":"a","repo":"me/y"}]')).toBeNull()
    expect(readOwnerId('555')).toBe(555)
    expect(readOwnerId('-5')).toBeNull()
    expect(readOwnerId('abc')).toBeNull()
    expect(readOwnerId(undefined)).toBeNull()
    expect(promptProject(TEXT.ask('Kiddo'))).toBe('Kiddo')
    expect(promptProject('Kiddo')).toBeNull()
  })
})

describe('owner bot webhook (Phase 57)', () => {
  it('needs its secrets and the webhook secret', async () => {
    const missing = setup({}, { OWNER_GITHUB_TOKEN: '' })
    expect((await handleOwnerBot(post(text('/start')), missing.deps)).status).toBe(503)
    const short = setup({}, { OWNER_BOT_WEBHOOK_SECRET: 'short' })
    expect((await handleOwnerBot(post(text('/start')), short.deps)).status).toBe(503)
    const { deps } = setup()
    expect((await handleOwnerBot(post(text('/start'), 'x'.repeat(40)), deps)).status).toBe(401)
    const get = new Request('https://x', { method: 'GET' })
    expect((await handleOwnerBot(get, deps)).status).toBe(405)
  })

  it('is silent to anyone but the owner, and outside the private chat', async () => {
    const { deps, calls } = setup()
    const stranger = await handleOwnerBot(post(text('/start', {}, 777)), deps)
    expect(await stranger.text()).toBe('ok')
    // the owner writing in a group
    const group = {
      message: {
        chat: { id: -100, type: 'group' },
        from: { id: OWNER, is_bot: false },
        text: '/start',
      },
    }
    expect(await (await handleOwnerBot(post(group), deps)).text()).toBe('ok')
    // a stranger pressing a button of a forwarded message
    expect(await (await handleOwnerBot(post(button('m:Kiddo:12:abc', 777)), deps)).text()).toBe(
      'ok',
    )
    expect(calls).toHaveLength(0)
  })

  it('shows the projects as buttons, then asks for the task with a reply prompt', async () => {
    const { deps } = setup()
    const start = await body(await handleOwnerBot(post(text('/start')), deps))
    expect(start.text).toBe(TEXT.pick)
    expect(start.reply_markup?.inline_keyboard).toEqual([
      [
        { text: 'Kiddo', callback_data: 'p:Kiddo' },
        { text: 'BarakaLi', callback_data: 'p:BarakaLi' },
      ],
      [{ text: 'UstaGo', callback_data: 'p:UstaGo' }],
    ])
    const pick = await body(await handleOwnerBot(post(button('p:Kiddo')), deps))
    expect(pick.text).toBe(TEXT.ask('Kiddo'))
    expect(pick.reply_markup?.force_reply).toBe(true)
    const help = await body(await handleOwnerBot(post(text('/help')), deps))
    expect(help.text).toBe(TEXT.help)
  })

  it('starts the workflow on the project’s main branch with the task', async () => {
    const dispatch = `POST /repos/${REPO}/actions/workflows/owner-task.yml/dispatches`
    const { deps, github } = setup({ [dispatch]: { status: 204 } })
    const task = '  Bosh ekrandagi tugmalarni kattalashtir  '
    const res = await body(await handleOwnerBot(post(answerTo(TEXT.ask('Kiddo'), task)), deps))
    expect(res.text).toBe(TEXT.started('Kiddo'))
    const sent = github().find((c) => c.method === 'POST')
    expect(sent?.body).toEqual({
      ref: 'main',
      inputs: {
        task: 'Bosh ekrandagi tugmalarni kattalashtir',
        task_id: (1_700_000_000_000).toString(36),
        project: 'Kiddo',
      },
    })
    expect(sent?.auth).toBe('Bearer ghp_secret_token')
  })

  it('refuses a task too short or too long, or for a project not in the list', async () => {
    const { deps, github } = setup()
    const ask = TEXT.ask('Kiddo')
    expect((await body(await handleOwnerBot(post(answerTo(ask, 'ok')), deps))).text).toBe(
      TEXT.tooShort,
    )
    const long = 'a'.repeat(TASK_MAX + 1)
    expect((await body(await handleOwnerBot(post(answerTo(ask, long)), deps))).text).toBe(
      TEXT.tooLong,
    )
    const other = await body(
      await handleOwnerBot(post(answerTo(TEXT.ask('Portfolio'), 'tugmani katta qil')), deps),
    )
    expect(other.text).toBe(TEXT.unknownProject)
    expect(github()).toHaveLength(0)
  })

  it('one task per project: a running task or a PR waiting for an answer blocks a new one', async () => {
    const ask = answerTo(TEXT.ask('Kiddo'), 'Tugmalarni kattalashtir')
    const running = setup({
      [`GET /repos/${REPO}/actions/workflows/owner-task.yml/runs?per_page=10`]: {
        status: 200,
        body: { workflow_runs: [{ status: 'completed' }, { status: 'queued' }] },
      },
    })
    expect((await body(await handleOwnerBot(post(ask), running.deps))).text).toBe(
      TEXT.busyRun('Kiddo'),
    )
    expect(running.github().some((c) => c.method === 'POST')).toBe(false)

    const waiting = setup({
      [`GET /repos/${REPO}/pulls?state=open&per_page=100`]: {
        status: 200,
        body: [
          pull({ number: 3, head: { ref: 'feature/x', sha: SHA, repo: { full_name: REPO } } }),
          pull({ number: 9 }),
        ],
      },
    })
    expect((await body(await handleOwnerBot(post(ask), waiting.deps))).text).toBe(
      TEXT.busyPr('Kiddo', 9),
    )
  })

  it('says so when GitHub refuses or does not answer, without leaking the token', async () => {
    const refused = setup({
      [`POST /repos/${REPO}/actions/workflows/owner-task.yml/dispatches`]: { status: 403 },
    })
    const ask = answerTo(TEXT.ask('Kiddo'), 'Tugmalarni kattalashtir')
    expect((await body(await handleOwnerBot(post(ask), refused.deps))).text).toBe(
      TEXT.dispatchFailed,
    )
    const down = setup()
    down.deps.fetch = (async () => {
      throw new Error('connect https://api.github.com failed')
    }) as unknown as typeof fetch
    expect((await body(await handleOwnerBot(post(ask), down.deps))).text).toBe(TEXT.githubDown)
    const logged = JSON.stringify(down.log.mock.calls)
    expect(logged).not.toContain('ghp_secret_token')
  })

  it('/status lists each project', async () => {
    const { deps } = setup({
      [`GET /repos/me/barakali/actions/workflows/owner-task.yml/runs?per_page=10`]: {
        status: 200,
        body: { workflow_runs: [{ status: 'in_progress' }] },
      },
      [`GET /repos/me/ustago/pulls?state=open&per_page=100`]: {
        status: 200,
        body: [
          pull({
            number: 4,
            head: { ref: `${BRANCH_PREFIX}x`, sha: SHA, repo: { full_name: 'me/ustago' } },
          }),
        ],
      },
    })
    const res = await body(await handleOwnerBot(post(text('/status')), deps))
    expect(res.text).toBe(
      [
        TEXT.statusTitle,
        `Kiddo: ✅ ${TEXT.statusIdle}`,
        `BarakaLi: ⏳ ${TEXT.statusRun}`,
        `UstaGo: 🟡 ${TEXT.statusPr(4)}`,
      ].join('\n'),
    )
    // a waiting PR can be cancelled from here, even if its report was lost
    expect(res.reply_markup?.inline_keyboard).toEqual([
      [{ text: TEXT.cancelButton('UstaGo', 4), callback_data: 'c:UstaGo:4' }],
    ])
  })

  it('“Asosiyga qo‘shish” squash-merges the task PR at the reported commit, then deletes its branch', async () => {
    const { deps, calls, github } = setup({
      [`GET /repos/${REPO}/pulls/12`]: { status: 200, body: pull() },
      [`PUT /repos/${REPO}/pulls/12/merge`]: { status: 200, body: { merged: true } },
      [`DELETE /repos/${REPO}/git/refs/heads/owner-task/mabc`]: { status: 204 },
    })
    const res = await body(
      await handleOwnerBot(post(button(`m:Kiddo:12:${SHA.slice(0, 12)}`)), deps),
    )
    expect(res.text).toBe(TEXT.merged('Kiddo', 12))
    const merge = github().find((c) => c.method === 'PUT')
    expect(merge?.body).toEqual({ merge_method: 'squash', sha: SHA })
    expect(github().some((c) => c.method === 'DELETE')).toBe(true)
    // the button is answered and taken off the report
    const methods = calls.filter((c) => c.url.includes('api.telegram.org')).map((c) => c.url)
    expect(methods.some((u) => u.endsWith('/answerCallbackQuery'))).toBe(true)
    expect(methods.some((u) => u.endsWith('/editMessageReplyMarkup'))).toBe(true)
  })

  it('never merges a PR changed after the report, one not from the task workflow, or a closed one', async () => {
    const changed = setup({ [`GET /repos/${REPO}/pulls/12`]: { status: 200, body: pull() } })
    const other = await body(
      await handleOwnerBot(post(button('m:Kiddo:12:000000000000')), changed.deps),
    )
    expect(other.text).toBe(TEXT.changed(12))
    expect(changed.github().some((c) => c.method === 'PUT')).toBe(false)

    const notOurs = [
      pull({ head: { ref: 'feature/x', sha: SHA, repo: { full_name: REPO } } }),
      pull({ head: { ref: `${BRANCH_PREFIX}x`, sha: SHA, repo: { full_name: 'evil/fork' } } }),
      pull({ base: { ref: 'release' } }),
      pull({ state: 'closed' }),
    ]
    for (const item of notOurs) {
      const s = setup({ [`GET /repos/${REPO}/pulls/12`]: { status: 200, body: item } })
      const res = await body(
        await handleOwnerBot(post(button(`m:Kiddo:12:${SHA.slice(0, 12)}`)), s.deps),
      )
      expect(res.text).toBe(TEXT.notTask)
      expect(s.github().some((c) => c.method === 'PUT')).toBe(false)
    }

    const conflict = setup({
      [`GET /repos/${REPO}/pulls/12`]: { status: 200, body: pull() },
      [`PUT /repos/${REPO}/pulls/12/merge`]: { status: 405, body: { message: 'not mergeable' } },
    })
    const refused = await body(
      await handleOwnerBot(post(button(`m:Kiddo:12:${SHA.slice(0, 12)}`)), conflict.deps),
    )
    expect(refused.text).toBe(TEXT.mergeRefused(12))
    expect(conflict.github().some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('ignores a malformed button', async () => {
    const { deps, github } = setup()
    for (const data of ['m:Kiddo:12', 'm:Kiddo:x:abc', 'm:Kiddo:12:ABCDEF123456', 'z:Kiddo:1']) {
      expect(await (await handleOwnerBot(post(button(data)), deps)).text()).toBe('ok')
    }
    expect((await body(await handleOwnerBot(post(button('m:Nope:1:abc')), deps))).text).toBe(
      TEXT.unknownProject,
    )
    expect(github()).toHaveLength(0)
  })

  it('“Bekor qilish” closes the task PR and deletes its branch', async () => {
    const { deps, github } = setup({
      [`GET /repos/${REPO}/pulls/12`]: { status: 200, body: pull() },
      [`PATCH /repos/${REPO}/pulls/12`]: { status: 200, body: pull({ state: 'closed' }) },
      [`DELETE /repos/${REPO}/git/refs/heads/owner-task/mabc`]: { status: 204 },
    })
    const res = await body(await handleOwnerBot(post(button('c:Kiddo:12')), deps))
    expect(res.text).toBe(TEXT.cancelled('Kiddo', 12))
    expect(github().find((c) => c.method === 'PATCH')?.body).toEqual({ state: 'closed' })
    expect(github().some((c) => c.method === 'DELETE')).toBe(true)
  })

  it('“To‘xtatish” stops only a running task-workflow run', async () => {
    const run = (over: Record<string, unknown> = {}) => ({
      path: '.github/workflows/owner-task.yml',
      status: 'in_progress',
      ...over,
    })
    const stop = setup({
      [`GET /repos/${REPO}/actions/runs/99`]: { status: 200, body: run() },
      [`POST /repos/${REPO}/actions/runs/99/cancel`]: { status: 202, body: {} },
    })
    expect((await body(await handleOwnerBot(post(button('x:Kiddo:99')), stop.deps))).text).toBe(
      TEXT.stopped('Kiddo'),
    )
    const otherWorkflow = setup({
      [`GET /repos/${REPO}/actions/runs/99`]: {
        status: 200,
        body: run({ path: '.github/workflows/deploy.yml' }),
      },
    })
    expect(
      (await body(await handleOwnerBot(post(button('x:Kiddo:99')), otherWorkflow.deps))).text,
    ).toBe(TEXT.notRunning)
    expect(otherWorkflow.github().some((c) => c.method === 'POST')).toBe(false)
    const done = setup({
      [`GET /repos/${REPO}/actions/runs/99`]: { status: 200, body: run({ status: 'completed' }) },
    })
    expect((await body(await handleOwnerBot(post(button('x:Kiddo:99')), done.deps))).text).toBe(
      TEXT.notRunning,
    )
  })

  it('answers a wrong project list with a setup hint, not a crash', async () => {
    const { deps } = setup({}, { OWNER_PROJECTS: 'nope' })
    expect((await body(await handleOwnerBot(post(text('/start')), deps))).text).toBe(
      TEXT.misconfigured,
    )
  })
})
