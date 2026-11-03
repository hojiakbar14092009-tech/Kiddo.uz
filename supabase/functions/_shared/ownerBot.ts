/*
 * The owner's work bot (Phase 57): the owner gives Claude a task from Telegram.
 * Plain TypeScript (no Deno APIs): vitest tests it. Edge Function: `owner-bot`.
 *
 * The bot writes no code. It starts the project's `owner-task.yml` GitHub
 * workflow, where Claude Code works on its own branch. That workflow sends the
 * report back (scripts/owner-task). Here the owner can then:
 *   * add the work to the main branch (squash merge of the task's PR), or
 *   * cancel it (the PR is closed and its branch deleted), or
 *   * stop a task still running.
 *
 * Safety:
 *   * Only the owner's Telegram id, in a private chat, gets an answer.
 *     Anyone else gets nothing back.
 *   * The webhook also needs the secret given to setWebhook.
 *   * One task per project at a time: a running task or a PR still waiting for
 *     the owner's answer blocks a new one.
 *   * A merge only takes a PR made by the workflow (owner-task/ branch) into
 *     the project's main branch, and only at the commit the report showed.
 *   * The GitHub token and the bot token live only in Supabase secrets;
 *     no error or log line carries them.
 */

import { sameSecret } from './worker.ts'
import type { Env } from './tts.ts'

export const WORKFLOW = 'owner-task.yml'
export const BRANCH_PREFIX = 'owner-task/'
/** A task is a short request in plain words, not a document. */
export const TASK_MIN = 5
export const TASK_MAX = 1500
export const MAX_PROJECTS = 8
/** Telegram's own limit for a webhook body is far below this. */
export const MAX_UPDATE_BYTES = 64 * 1024
/** The GitHub and Telegram calls give up after this long. */
export const CALL_TIMEOUT_MS = 10_000

export interface Project {
  name: string
  repo: string
  branch: string
}

const NAME = /^[A-Za-z0-9_-]{1,20}$/
/** owner/name as GitHub allows them; never "." or ".." (they would change the API path) */
const REPO = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/(?!\.\.?$)[A-Za-z0-9_.-]{1,100}$/
const BRANCH = /^(?!.*\.\.)[A-Za-z0-9._-][A-Za-z0-9._/-]{0,59}$/

/** OWNER_PROJECTS: [{"name":"Kiddo","repo":"me/Kiddo.uz","branch":"main"}]. Null if wrong. */
export function readProjects(raw: string | undefined): Project[] | null {
  if (!raw) return null
  let list: unknown
  try {
    list = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_PROJECTS) return null
  const projects: Project[] = []
  for (const item of list) {
    if (typeof item !== 'object' || item === null) return null
    const { name, repo, branch = 'main' } = item as Record<string, unknown>
    if (typeof name !== 'string' || !NAME.test(name)) return null
    if (typeof repo !== 'string' || !REPO.test(repo)) return null
    if (typeof branch !== 'string' || !BRANCH.test(branch)) return null
    if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) return null
    projects.push({ name, repo, branch })
  }
  return projects
}

/** The owner's Telegram user id, or null. */
export function readOwnerId(raw: string | undefined): number | null {
  if (!raw || !/^[1-9][0-9]{0,15}$/.test(raw.trim())) return null
  const id = Number(raw.trim())
  return Number.isSafeInteger(id) ? id : null
}

export interface OwnerBotDeps {
  env: Env
  fetch: typeof fetch
  now(): number
  log?(message: string, error?: unknown): void
}

// ---------- texts (the owner's bot speaks Uzbek, like the admin panel) ----------

export const TEXT = {
  pick: 'Qaysi loyiha ustida ishlaymiz?',
  ask: (name: string) => `📁 ${name}\nNima o‘zgarsin? Oddiy so‘z bilan yozing.`,
  placeholder: 'Masalan: bosh ekrandagi tugmalarni kattalashtir',
  tooShort: `Vazifa juda qisqa. Kamida ${TASK_MIN} ta belgi yozing.`,
  tooLong: `Vazifa juda uzun. Ko‘pi bilan ${TASK_MAX} ta belgi yozing.`,
  unknownProject: 'Bu loyiha ro‘yxatda yo‘q. /start bosing.',
  started: (name: string) =>
    `⏳ Ish boshlandi: ${name}.\nClaude alohida tarmoqda ishlaydi. Reja bir necha daqiqada keladi.`,
  busyRun: (name: string) => `${name}: oldingi vazifa hali ishlayapti. U tugashini kuting.`,
  busyPr: (name: string, pr: number) =>
    `${name}: oldingi vazifa javobingizni kutyapti (PR #${pr}). Avval uni qo‘shing yoki bekor qiling.`,
  dispatchFailed:
    'Vazifani boshlab bo‘lmadi: GitHub rad etdi. Workflow va token ruxsatlarini tekshiring.',
  githubDown: 'GitHub javob bermadi. Birozdan keyin qayta urinib ko‘ring.',
  merged: (name: string, pr: number) =>
    `✅ ${name}: PR #${pr} asosiy tarmoqqa qo‘shildi. Vercel asosiy saytni yangilaydi.`,
  mergeRefused: (pr: number) =>
    `PR #${pr} ni qo‘shib bo‘lmadi: u qo‘shishga tayyor emas yoki ziddiyat bor.`,
  changed: (pr: number) =>
    `PR #${pr} hisobotdan keyin o‘zgargan. Yangi hisobotni kuting yoki bekor qiling.`,
  notTask: 'Bu vazifa PR’i emas yoki allaqachon yopilgan.',
  cancelled: (name: string, pr: number) => `🗑 ${name}: PR #${pr} bekor qilindi, tarmoq o‘chirildi.`,
  stopped: (name: string) => `⏹ ${name}: vazifa to‘xtatildi.`,
  notRunning: 'Bu vazifa allaqachon tugagan.',
  statusTitle: 'Loyihalar holati:',
  statusIdle: 'bo‘sh',
  statusRun: 'ishlayapti',
  statusPr: (pr: number) => `javobingizni kutyapti (PR #${pr})`,
  cancelButton: (name: string, pr: number) => `🗑 ${name}: PR #${pr} ni bekor qilish`,
  help:
    'Buyruqlar:\n/start yoki /new — yangi vazifa\n/status — loyihalar holati\n/help — yordam\n\n' +
    'Vazifa alohida tarmoqda bajariladi. Asosiy saytga faqat siz «Asosiyga qo‘shish» ni bossangiz chiqadi.',
  misconfigured: 'Bot sozlanmagan: OWNER_PROJECTS noto‘g‘ri.',
}

// ---------- Telegram ----------

interface InlineButton {
  text: string
  callback_data: string
}

type Markup =
  { inline_keyboard: InlineButton[][] } | { force_reply: true; input_field_placeholder: string }

function reply(chatId: number, text: string, markup?: Markup): Response {
  return new Response(
    JSON.stringify({
      method: 'sendMessage',
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
      ...(markup ? { reply_markup: markup } : {}),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

const ok = () => new Response('ok', { status: 200 })

export function projectKeyboard(projects: Project[]): Markup {
  const rows: InlineButton[][] = []
  for (let index = 0; index < projects.length; index += 2) {
    rows.push(
      projects.slice(index, index + 2).map((p) => ({ text: p.name, callback_data: `p:${p.name}` })),
    )
  }
  return { inline_keyboard: rows }
}

/** Calls a Bot API method; a failure is only logged (the answer is best effort). */
async function telegram(deps: OwnerBotDeps, method: string, body: Record<string, unknown>) {
  const token = deps.env('OWNER_BOT_TOKEN') ?? ''
  if (!token) return
  try {
    await deps.fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
  } catch {
    // the URL holds the token: only the method name is logged
    deps.log?.(`[owner-bot] telegram ${method} failed`)
  }
}

// ---------- GitHub ----------

export class GitHubError extends Error {
  constructor(readonly status: number) {
    // the token is never part of the message
    super(`github: ${status}`)
  }
}

async function github(
  deps: OwnerBotDeps,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const token = deps.env('OWNER_GITHUB_TOKEN') ?? ''
  let response: Response
  try {
    response = await deps.fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'kiddo-owner-bot',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    })
  } catch {
    throw new GitHubError(0)
  }
  let data: unknown = null
  try {
    data = await response.json()
  } catch {
    // 204 and the like have no body
  }
  return { status: response.status, data }
}

const repoPath = (project: Project) => `/repos/${project.repo}`

interface PullInfo {
  number: number
  state: string
  merged: boolean
  headRef: string
  headSha: string
  headRepo: string
  baseRef: string
}

function readPull(data: unknown): PullInfo | null {
  if (typeof data !== 'object' || data === null) return null
  const pr = data as {
    number?: unknown
    state?: unknown
    merged?: unknown
    head?: { ref?: unknown; sha?: unknown; repo?: { full_name?: unknown } | null }
    base?: { ref?: unknown }
  }
  if (typeof pr.number !== 'number' || typeof pr.head?.ref !== 'string') return null
  return {
    number: pr.number,
    state: String(pr.state ?? ''),
    merged: pr.merged === true,
    headRef: pr.head.ref,
    headSha: String(pr.head.sha ?? ''),
    headRepo: String(pr.head.repo?.full_name ?? ''),
    baseRef: String(pr.base?.ref ?? ''),
  }
}

/** A PR made by the workflow, from the project itself, into its main branch. */
export function isTaskPull(pull: PullInfo, project: Project): boolean {
  return (
    pull.headRef.startsWith(BRANCH_PREFIX) &&
    pull.headRepo.toLowerCase() === project.repo.toLowerCase() &&
    pull.baseRef === project.branch
  )
}

export type Busy = { kind: 'idle' } | { kind: 'run' } | { kind: 'pr'; pr: number }

/** What blocks a new task: a run still going, or a task PR still open. */
export async function projectBusy(deps: OwnerBotDeps, project: Project): Promise<Busy> {
  // one call: the latest runs of the task workflow, any not completed blocks
  const runs = await github(
    deps,
    'GET',
    `${repoPath(project)}/actions/workflows/${WORKFLOW}/runs?per_page=10`,
  )
  if (runs.status !== 200) throw new GitHubError(runs.status)
  const list = (runs.data as { workflow_runs?: unknown } | null)?.workflow_runs
  if (
    Array.isArray(list) &&
    list.some((run) => (run as { status?: unknown } | null)?.status !== 'completed')
  ) {
    return { kind: 'run' }
  }
  const { status: code, data } = await github(
    deps,
    'GET',
    `${repoPath(project)}/pulls?state=open&per_page=100`,
  )
  if (code !== 200) throw new GitHubError(code)
  for (const item of Array.isArray(data) ? data : []) {
    const pull = readPull(item)
    if (pull && isTaskPull(pull, project)) return { kind: 'pr', pr: pull.number }
  }
  return { kind: 'idle' }
}

// ---------- updates ----------

interface Incoming {
  chatId: number
  fromId: number
  text: string
  replyTo: string | null
}

interface Callback {
  id: string
  chatId: number
  fromId: number
  messageId: number
  data: string
}

function readIncoming(update: unknown): Incoming | null {
  const message = (update as { message?: unknown } | null)?.message
  if (typeof message !== 'object' || message === null) return null
  const m = message as {
    chat?: { id?: unknown; type?: unknown }
    from?: { id?: unknown; is_bot?: unknown }
    text?: unknown
    reply_to_message?: { text?: unknown; from?: { is_bot?: unknown } }
  }
  if (m.chat?.type !== 'private' || typeof m.chat.id !== 'number') return null
  if (typeof m.from?.id !== 'number' || m.from.is_bot === true) return null
  if (typeof m.text !== 'string') return null
  const replyTo =
    m.reply_to_message?.from?.is_bot === true && typeof m.reply_to_message.text === 'string'
      ? m.reply_to_message.text
      : null
  return { chatId: m.chat.id, fromId: m.from.id, text: m.text, replyTo }
}

function readCallback(update: unknown): Callback | null {
  const query = (update as { callback_query?: unknown } | null)?.callback_query
  if (typeof query !== 'object' || query === null) return null
  const q = query as {
    id?: unknown
    from?: { id?: unknown }
    data?: unknown
    message?: { message_id?: unknown; chat?: { id?: unknown; type?: unknown } }
  }
  if (typeof q.id !== 'string' || typeof q.from?.id !== 'number' || typeof q.data !== 'string')
    return null
  if (q.message?.chat?.type !== 'private') return null
  if (typeof q.message.chat.id !== 'number' || typeof q.message.message_id !== 'number') return null
  return {
    id: q.id,
    chatId: q.message.chat.id,
    fromId: q.from.id,
    messageId: q.message.message_id,
    data: q.data,
  }
}

const findProject = (projects: Project[], name: string) =>
  projects.find((p) => p.name.toLowerCase() === name.toLowerCase())

/** The project a ForceReply prompt asked about ("📁 Kiddo\n…"). */
export function promptProject(text: string): string | null {
  return /^📁 ([A-Za-z0-9_-]{1,20})\n/.exec(text)?.[1] ?? null
}

/** A task id: short, sortable, safe in a branch name. */
export const taskId = (now: number) => now.toString(36)

async function startTask(
  deps: OwnerBotDeps,
  chatId: number,
  project: Project,
  task: string,
): Promise<Response> {
  const busy = await projectBusy(deps, project)
  if (busy.kind === 'run') return reply(chatId, TEXT.busyRun(project.name))
  if (busy.kind === 'pr') return reply(chatId, TEXT.busyPr(project.name, busy.pr))
  const { status } = await github(
    deps,
    'POST',
    `${repoPath(project)}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      ref: project.branch,
      inputs: { task, task_id: taskId(deps.now()), project: project.name },
    },
  )
  if (status < 200 || status >= 300) {
    deps.log?.(`[owner-bot] dispatch refused: ${status}`)
    return reply(chatId, TEXT.dispatchFailed)
  }
  return reply(chatId, TEXT.started(project.name))
}

async function status(deps: OwnerBotDeps, chatId: number, projects: Project[]) {
  const lines = [TEXT.statusTitle]
  const buttons: InlineButton[][] = []
  for (const project of projects) {
    const busy = await projectBusy(deps, project)
    const state =
      busy.kind === 'run'
        ? `⏳ ${TEXT.statusRun}`
        : busy.kind === 'pr'
          ? `🟡 ${TEXT.statusPr(busy.pr)}`
          : `✅ ${TEXT.statusIdle}`
    lines.push(`${project.name}: ${state}`)
    // a PR whose report was lost can still be cancelled from here
    if (busy.kind === 'pr') {
      buttons.push([
        {
          text: TEXT.cancelButton(project.name, busy.pr),
          callback_data: `c:${project.name}:${busy.pr}`,
        },
      ])
    }
  }
  return reply(
    chatId,
    lines.join('\n'),
    buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
  )
}

async function onMessage(deps: OwnerBotDeps, message: Incoming, projects: Project[]) {
  const { chatId } = message
  const wanted = message.replyTo ? promptProject(message.replyTo) : null
  if (wanted) {
    const project = findProject(projects, wanted)
    if (!project) return reply(chatId, TEXT.unknownProject)
    const task = message.text.trim()
    if (task.length < TASK_MIN) return reply(chatId, TEXT.tooShort)
    if (task.length > TASK_MAX) return reply(chatId, TEXT.tooLong)
    return startTask(deps, chatId, project, task)
  }
  const command = /^\/([a-z]+)(?:@[A-Za-z0-9_]+)?\b/.exec(message.text.trim())?.[1]
  if (command === 'status') return status(deps, chatId, projects)
  if (command === 'help') return reply(chatId, TEXT.help)
  return reply(chatId, TEXT.pick, projectKeyboard(projects))
}

async function getTaskPull(deps: OwnerBotDeps, project: Project, pr: number) {
  const { status: code, data } = await github(deps, 'GET', `${repoPath(project)}/pulls/${pr}`)
  if (code === 404) return null
  if (code !== 200) throw new GitHubError(code)
  const pull = readPull(data)
  if (!pull || pull.state !== 'open' || pull.merged || !isTaskPull(pull, project)) return null
  return pull
}

async function deleteBranch(deps: OwnerBotDeps, project: Project, ref: string) {
  // GitHub keeps the "/" of the branch name in this path
  const { status: code } = await github(
    deps,
    'DELETE',
    `${repoPath(project)}/git/refs/heads/${ref.split('/').map(encodeURIComponent).join('/')}`,
  )
  if (code !== 204 && code !== 422) deps.log?.(`[owner-bot] branch delete: ${code}`)
}

/** Takes the buttons off a message whose question is answered. */
const clearButtons = (deps: OwnerBotDeps, chatId: number, messageId: number) =>
  telegram(deps, 'editMessageReplyMarkup', {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  })

async function onCallback(deps: OwnerBotDeps, query: Callback, projects: Project[]) {
  const { chatId } = query
  await telegram(deps, 'answerCallbackQuery', { callback_query_id: query.id })
  const [kind, name = '', first = '', second = ''] = query.data.split(':')
  const project = findProject(projects, name)
  if (!project) return reply(chatId, TEXT.unknownProject)

  if (kind === 'p') {
    return reply(chatId, TEXT.ask(project.name), {
      force_reply: true,
      input_field_placeholder: TEXT.placeholder,
    })
  }

  if (!/^[1-9][0-9]{0,11}$/.test(first)) return ok()
  const number = Number(first)

  if (kind === 'm') {
    if (!/^[0-9a-f]{12}$/.test(second)) return ok()
    const pull = await getTaskPull(deps, project, number)
    if (!pull) return reply(chatId, TEXT.notTask)
    if (!pull.headSha.startsWith(second)) return reply(chatId, TEXT.changed(number))
    const { status: code } = await github(
      deps,
      'PUT',
      `${repoPath(project)}/pulls/${number}/merge`,
      { merge_method: 'squash', sha: pull.headSha },
    )
    if (code === 409) return reply(chatId, TEXT.changed(number))
    if (code !== 200) return reply(chatId, TEXT.mergeRefused(number))
    await deleteBranch(deps, project, pull.headRef)
    await clearButtons(deps, chatId, query.messageId)
    return reply(chatId, TEXT.merged(project.name, number))
  }

  if (kind === 'c') {
    const pull = await getTaskPull(deps, project, number)
    if (!pull) return reply(chatId, TEXT.notTask)
    const { status: code } = await github(deps, 'PATCH', `${repoPath(project)}/pulls/${number}`, {
      state: 'closed',
    })
    if (code !== 200) throw new GitHubError(code)
    await deleteBranch(deps, project, pull.headRef)
    await clearButtons(deps, chatId, query.messageId)
    return reply(chatId, TEXT.cancelled(project.name, number))
  }

  if (kind === 'x') {
    const { status: code, data } = await github(
      deps,
      'GET',
      `${repoPath(project)}/actions/runs/${number}`,
    )
    const run = (data ?? {}) as { path?: unknown; status?: unknown }
    // only a run of the task workflow can be stopped from here
    if (code !== 200 || run.path !== `.github/workflows/${WORKFLOW}`) {
      return reply(chatId, TEXT.notRunning)
    }
    if (run.status === 'completed') return reply(chatId, TEXT.notRunning)
    const { status: cancel } = await github(
      deps,
      'POST',
      `${repoPath(project)}/actions/runs/${number}/cancel`,
    )
    if (cancel !== 202 && cancel !== 409) throw new GitHubError(cancel)
    await clearButtons(deps, chatId, query.messageId)
    return reply(chatId, cancel === 409 ? TEXT.notRunning : TEXT.stopped(project.name))
  }
  return ok()
}

export async function handleOwnerBot(request: Request, deps: OwnerBotDeps): Promise<Response> {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
  const secret = deps.env('OWNER_BOT_WEBHOOK_SECRET') ?? ''
  const owner = readOwnerId(deps.env('OWNER_TELEGRAM_ID'))
  if (secret.length < 32 || owner === null || !deps.env('OWNER_GITHUB_TOKEN')) {
    deps.log?.('[owner-bot] secrets are missing (webhook secret, owner id or GitHub token)')
    return new Response('unavailable', { status: 503 })
  }
  const given = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
  if (!sameSecret(given, secret)) return new Response('forbidden', { status: 401 })
  const body = await request.text()
  if (body.length > MAX_UPDATE_BYTES) return ok()
  let update: unknown
  try {
    update = JSON.parse(body)
  } catch {
    return ok()
  }
  const message = readIncoming(update)
  const query = message ? null : readCallback(update)
  const chatId = message?.chatId ?? query?.chatId
  // anyone but the owner, in the owner's own private chat, is not answered at all
  const fromId = message?.fromId ?? query?.fromId
  if (chatId === undefined || fromId !== owner || chatId !== owner) return ok()

  const projects = readProjects(deps.env('OWNER_PROJECTS'))
  if (!projects) return reply(chatId, TEXT.misconfigured)
  try {
    if (message) return await onMessage(deps, message, projects)
    if (query) return await onCallback(deps, query, projects)
    return ok()
  } catch (error) {
    // Telegram retries a failed webhook: a retry must not start a second task
    deps.log?.('[owner-bot] update failed', error)
    return reply(chatId, TEXT.githubDown)
  }
}
