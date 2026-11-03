#!/usr/bin/env node
/*
 * The owner-task workflow's steps (Phase 57). Commands:
 *
 *   prompt plan|work            the prompt for a Claude run (env TASK; work: env PLAN_FILE)
 *   schema plan|work            the JSON schema for that run's answer
 *   check <claude.json>         exit 1 if a Claude run did not end well (prints reason=…)
 *   pages <plan.json>           the pages to photograph, one per line
 *   review                      the staged change: exit 1 on a forbidden path, else
 *                               writes what the owner must know to REVIEW_FILE
 *   notify plan|report|nochange|failure
 *   preview <sha>               the commit's Vercel preview URL ('' if none in time)
 *
 * The commands that hold a token (notify, preview) run only in the publish and
 * report jobs, from a fresh checkout of the base branch. Inputs come from env,
 * never from the task text on a command line, so a task cannot reach the shell.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  cleanPages,
  failureMessage,
  gatesFrom,
  nameStatus,
  noChangeMessage,
  planMessage,
  planPrompt,
  PLAN_SCHEMA,
  previewFrom,
  readClaude,
  reasonText,
  reportMessage,
  reviewChanges,
  reviewWarnings,
  workPrompt,
  WORK_SCHEMA,
} from './lib.mjs'

const env = (name, fallback = '') => process.env[name] || fallback
const read = (file) => {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return ''
  }
}
const claudeFile = (file) => readClaude(read(file))

// ---------- Telegram ----------

async function telegram(method, body) {
  const token = env('OWNER_BOT_TOKEN')
  const chat = env('OWNER_TELEGRAM_ID')
  if (!token || !chat) {
    console.log(`telegram: not set up, ${method} skipped`)
    return
  }
  const isForm = body instanceof FormData
  if (isForm) body.set('chat_id', chat)
  let response
  try {
    response = await fetch(
      `${env('TELEGRAM_API', 'https://api.telegram.org')}/bot${token}/${method}`,
      {
        method: 'POST',
        headers: isForm ? undefined : { 'Content-Type': 'application/json' },
        body: isForm ? body : JSON.stringify({ chat_id: chat, ...body }),
        signal: AbortSignal.timeout(30_000),
      },
    )
  } catch {
    // the URL holds the token: never print the error itself
    console.log(`telegram: ${method} network error`)
    return
  }
  if (!response.ok) console.log(`telegram: ${method} ${response.status}`)
}

const sendMessage = ({ text, buttons }) =>
  telegram('sendMessage', {
    text,
    disable_web_page_preview: true,
    ...(buttons.length > 0 ? { reply_markup: { inline_keyboard: buttons } } : {}),
  })

const photo = (file) => new Blob([readFileSync(file)], { type: 'image/png' })

/** Sends photos as one album (2–10), or one photo alone, the caption on the first. */
async function sendAlbum(files, caption) {
  if (files.length === 0) return
  const form = new FormData()
  if (files.length === 1) {
    form.set('photo', photo(files[0]), path.basename(files[0]))
    form.set('caption', caption)
    await telegram('sendPhoto', form)
    return
  }
  const media = files.slice(0, 10).map((file, index) => {
    form.set(`f${index}`, photo(file), path.basename(file))
    return { type: 'photo', media: `attach://f${index}`, ...(index === 0 ? { caption } : {}) }
  })
  form.set('media', JSON.stringify(media))
  await telegram('sendMediaGroup', form)
}

const shotsIn = (dir) => {
  try {
    return readdirSync(dir)
      .filter((f) => /^[0-9]+-[A-Za-z0-9-]+-[0-9a-z]+\.png$/.test(f))
      .sort()
      .map((f) => path.join(dir, f))
  } catch {
    return []
  }
}

// ---------- GitHub ----------

async function githubJson(url) {
  const response = await fetch(`https://api.github.com${url}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env('GH_TOKEN')}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`github ${response.status}`)
  return response.json()
}

async function preview(sha) {
  if (!/^[0-9a-f]{40}$/.test(sha)) return ''
  const repo = env('GITHUB_REPOSITORY')
  const until = Date.now() + Number(env('PREVIEW_WAIT_SECONDS', '480')) * 1000
  while (Date.now() < until) {
    try {
      const deployments = await githubJson(`/repos/${repo}/deployments?sha=${sha}&per_page=20`)
      const statuses = {}
      for (const d of deployments) {
        statuses[d.id] = await githubJson(`/repos/${repo}/deployments/${d.id}/statuses?per_page=20`)
      }
      const url = previewFrom(deployments, statuses)
      if (url) return url
    } catch (error) {
      console.error(String(error instanceof Error ? error.message : error))
    }
    await new Promise((resolve) => setTimeout(resolve, 20_000))
  }
  return ''
}

// ---------- commands ----------

const project = env('PROJECT')
const runUrl = env('RUN_URL')
const [command, arg] = process.argv.slice(2)

switch (command) {
  case 'prompt':
    process.stdout.write(
      arg === 'plan'
        ? planPrompt(env('TASK'))
        : workPrompt(env('TASK'), String(claudeFile(env('PLAN_FILE')).answer?.plan ?? '')),
    )
    break
  case 'schema':
    process.stdout.write(JSON.stringify(arg === 'plan' ? PLAN_SCHEMA : WORK_SCHEMA))
    break
  case 'check': {
    const result = claudeFile(arg)
    console.log(`claude: ${result.reason}, ${result.turns} turns, $${result.cost.toFixed(2)}`)
    if (!result.ok) {
      console.log(`reason=${reasonText(result.reason)}`)
      process.exit(1)
    }
    break
  }
  case 'pages':
    process.stdout.write(`${cleanPages(claudeFile(arg).answer?.pages).join('\n')}\n`)
    break
  case 'review': {
    const status = execFileSync('git', ['diff', '--cached', '--name-status', '-z', '-M'], {
      encoding: 'utf8',
    })
    const diff = execFileSync('git', ['diff', '--cached', '--no-ext-diff'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    const review = reviewChanges(nameStatus(status), diff)
    if (review.forbidden.length > 0) {
      console.log(`reason=taqiqlangan fayllar o‘zgardi: ${review.forbidden.join(', ')}`)
      process.exit(1)
    }
    writeFileSync(env('REVIEW_FILE'), JSON.stringify(review))
    console.log(JSON.stringify(review))
    break
  }
  case 'preview':
    process.stdout.write(await preview(arg))
    break
  case 'notify': {
    const plan = claudeFile(env('PLAN_FILE'))
    const work = claudeFile(env('WORK_FILE'))
    const cost = plan.cost + work.cost
    if (arg === 'plan') {
      await sendMessage(
        planMessage({
          project,
          plan: String(plan.answer?.plan ?? ''),
          pages: cleanPages(plan.answer?.pages),
          runId: env('GITHUB_RUN_ID'),
          runUrl,
          budget: env('BUDGET_USD'),
          minutes: env('WORK_MINUTES'),
        }),
      )
    } else if (arg === 'report') {
      const shots = env('SHOTS_DIR')
      await sendAlbum(shotsIn(path.join(shots, 'before')), 'Oldin')
      await sendAlbum(shotsIn(path.join(shots, 'after')), 'Keyin')
      let review = { forbidden: [], checks: [], deletedTests: [], skippedTests: [], migrations: [] }
      try {
        review = { ...review, ...JSON.parse(read(env('REVIEW_FILE'))) }
      } catch {
        // no review: nothing to warn about
      }
      const { warnings, blocked } = reviewWarnings(review)
      if (shotsIn(path.join(shots, 'after')).length === 0) warnings.push('Skrinshotlar olinmadi.')
      await sendMessage(
        reportMessage({
          project,
          summary: String(work.answer?.summary ?? ''),
          gates: gatesFrom({
            format: env('GATE_FORMAT'),
            lint: env('GATE_LINT'),
            types: env('GATE_TYPES'),
            unit: env('GATE_UNIT'),
            build: env('GATE_BUILD'),
          }),
          pr: Number(env('PR_NUMBER')),
          prUrl: env('PR_URL'),
          sha: env('HEAD_SHA'),
          previewUrl: env('PREVIEW_URL'),
          cost,
          minutes: Math.max(
            0,
            Math.round((Date.now() / 1000 - Number(env('STARTED_AT', '0'))) / 60),
          ),
          warnings,
          blocked,
        }),
      )
    } else if (arg === 'nochange') {
      await sendMessage(
        noChangeMessage({ project, summary: String(work.answer?.summary ?? ''), cost }),
      )
    } else {
      await sendMessage(
        failureMessage({
          project,
          reason: env('FAIL_REASON'),
          runUrl,
          status: env('JOB_STATUS'),
          pr: env('PR_NUMBER'),
        }),
      )
    }
    break
  }
  default:
    console.error(`unknown command: ${command}`)
    process.exit(2)
}
