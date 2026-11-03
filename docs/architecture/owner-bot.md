# The owner's work bot (Phase 57)

The owner sends a task from Telegram. Claude Code changes the code on its own branch,
runs the checks, and sends back before/after screenshots and a Vercel test link. Nothing
reaches the main site until the owner presses **Asosiyga qo‘shish**.

The bot writes no code itself. It starts a GitHub Actions run in the project's repository,
and Claude works there.

## The flow

1. `/start` (or `/new`). The bot answers **only the owner's Telegram id**, and only in
   the owner's private chat. To anyone else it says nothing at all.
2. The bot shows the projects as buttons (the `OWNER_PROJECTS` list).
3. After a project is picked, the bot asks for the task with a reply prompt. The owner
   answers in plain words, for example: "Bosh ekrandagi tugmalarni kattalashtir".
4. The bot checks that the project is free, then starts `owner-task.yml` and answers
   "Ish boshlandi". A project is busy while a task run is going, or while a task PR is
   still waiting for the owner's answer.
5. The workflow runs as separate jobs:
   1. **claude** holds the Anthropic key.
      1. Claude makes a short plan with read-only tools.
      2. The plan reaches Telegram with a **⏹ To‘xtatish** button.
      3. Claude edits files. It can only read and write files: it runs no commands.
      4. The change is saved as a patch.

      Nothing from the repo or from the change runs in this job.

   2. **checks**, **build** and **unit** each run on a fresh runner with no secrets.
      Each applies the patch and runs its part:
      - checks: prettier, lint and tsc;
      - build: the build, plus the before and after screenshots (at most 3 pages, phone
        and tablet);
      - unit: vitest.
   3. **publish** runs on a fresh runner with a fresh checkout of the base branch.
      1. It copies its own scripts before applying the patch, and runs only that copy.
      2. It refuses forbidden paths.
      3. It pushes branch `owner-task/<id>` and opens a PR.
      4. It waits up to 8 minutes for the Vercel preview.
6. The report has the before and after photos and a short summary in Uzbek. It also gives
   each check's result, the test link, the PR, the time and the cost. It ends with two
   buttons:
   - **✅ Asosiyga qo‘shish** squash-merges the PR, then deletes the branch. It is shown
     only when every check passed and the task did not change how the checks run (see
     below). It merges only the commit the report showed: if anything was pushed after
     the report, the bot refuses.
   - **🗑 Bekor qilish** closes the PR and deletes the branch.
7. If the run fails, hits a limit or is stopped, Telegram says so, with the reason.
   Nothing reaches the main site. If the PR was already open, the message has a
   **Bekor qilish** button. `/status` also gives one for every PR still waiting.

| Command   | What it does                                                   |
| --------- | -------------------------------------------------------------- |
| `/start`  | Shows the project buttons for a new task (`/new` also works)   |
| `/status` | Shows each project as free, running or waiting for your answer |
| `/help`   | Shows the commands                                             |

## Safety

The change's code is treated as untrusted. It never runs on a runner that holds a key or
a token that can change the repository.

- **Only the owner.** The webhook needs the secret given to setWebhook. It answers only
  when both the sender and the chat are `OWNER_TELEGRAM_ID`; anyone else is ignored.
  Every button is checked the same way.
- **One task per project.**
  - The bot refuses a new task while a run is going or a task PR is open.
  - The workflow checks again at its start. This catches two tasks sent seconds apart.
  - Its `concurrency` group keeps runs from overlapping.
- **Limits** for each task:
  - Turns: 60, set by repo variable `OWNER_TASK_MAX_TURNS`.
  - Dollars: $5, set by `OWNER_TASK_BUDGET_USD`. The plan step has its own $1 limit.
  - Time: 30 minutes for Claude's work, 45 minutes for the claude job.
- **Keys only where they are needed.**
  - The bot's GitHub token and bot token are Supabase secrets.
  - The workflow's keys are GitHub secrets, and each job gets only the ones it uses:
    - claude: the Anthropic key and the bot token;
    - publish: write access and the bot token;
    - checks, build and unit: none.
  - The claude job installs nothing from the repo and runs nothing from it.
  - Claude cannot read `/proc`, `/sys`, `/etc` or the runner's temp files, where its own
    key could be seen.
  - Claude can write only inside the project (`--permission-mode acceptEdits`, with no
    blanket Edit/Write rule), and not in `.git`, `.claude` or `.mcp.json`. Deny rules also
    cover its home folder, the runner's actions, tools and temp files, and the system
    folders. So it cannot plant a git setting, a shell file, a hook or changed action code
    that would run later in this job.
  - Before Claude starts, everything that runs after it in this job is made read-only:
    the actions, the Claude Code install, the copied scripts and the git copy. Claude has no shell
    to undo that.
  - Watch the first real run once: check in its log that Claude's edits stayed inside
    the project.
  - Claude Code loads no project settings or MCP servers from the repo
    (`--setting-sources user --strict-mcp-config`).
  - The patch is taken from a copy of the base's git data, made before Claude started,
    with no user or system git config and no external diff tools.
  - The scripts the job runs after Claude are checked against a hash taken before Claude
    started.
  - The publish job refuses a change that contains the key.
  - Errors and logs never print a token.
- **Claude never pushes to main.**
  - Claude cannot push, commit or use the network; it only edits files.
  - The publish job pushes only to `owner-task/<id>`. It does not install or run anything
    from the change, runs only its own copy of the scripts, and turns off git hooks.
  - Only the owner's button merges.
- **A task cannot fake its checks.**
  - Each check's pass/fail is that step's own outcome, which the runner records.
  - The build and the unit tests run on separate runners, so one cannot change the
    other.
  - A change to any of these stops the run:
    - `.github/` or `scripts/owner-task/`;
    - an `.env` file;
    - files that would run code on the owner's computer or steer Claude: `.git`,
      `.claude/`, `.mcp.json`, `.husky/`, `.githooks/`, `.vscode/`, `.devcontainer/`. `git apply` also refuses paths outside the repo and paths through
      symlinks.
  - These remove the merge button, and the report says why:
    - a change to a file that decides how the checks run: package files, configs (vite,
      vitest, tsconfig, prettier, oxlint, playwright), `src/test/` and the files
      `vite.config.ts` imports, and `CLAUDE.md` / `AGENTS.md` (they steer later tasks);
    - a deleted test;
    - an added `.skip`, `.only` or `.todo` (the common forms; a test changed in other
      ways is not caught, so the diff is still worth a look).

    The owner can still read the diff and merge on GitHub.

  - The "after" screenshots come from the change's own build. They show the result; they
    are not a check.
- **Migrations.** A new migration adds a warning line. The run never applies one.
- **The task text** reaches the shell only as an env variable. Claude's prompt marks it
  as data.

Branches and PRs pushed with the workflow's own token do not start other workflows.
If `main` is protected with required status checks, merges from the bot are refused.
Protect `main` without required checks, or merge such a PR on GitHub.

The full e2e suite (about an hour) is not part of a task run. The report lists the checks
it did run.

## Moving parts

| Part                                      | What it does                                                          |
| ----------------------------------------- | --------------------------------------------------------------------- |
| `supabase/functions/owner-bot`            | The webhook: owner check, project buttons, start, merge, cancel, stop |
| `supabase/functions/_shared/ownerBot.ts`  | Its logic, tested with vitest                                         |
| `.github/workflows/owner-task.yml`        | The run: claude, checks, build, unit, publish (and nochange, failed)  |
| `scripts/owner-task/lib.mjs`              | Messages, buttons, change review and prompts, tested with vitest      |
| `scripts/owner-task/run.mjs`, `shots.mjs` | The workflow's steps: Telegram, preview link, screenshots             |

## Owner setup

1. **Make a second bot** with @BotFather (`/newbot`), separate from the parents' bot. Keep
   its token.
2. **Find your Telegram id.** Message @userinfobot; it answers with your numeric id.
3. **Make a GitHub token.** Use a fine-grained personal access token limited to the
   project repositories, with these permissions:
   - Actions: read and write;
   - Contents: read and write;
   - Pull requests: read and write.
4. **Set the Supabase secrets** (the Kiddo project hosts the webhook):

   ```sh
   supabase secrets set OWNER_BOT_TOKEN=<token from BotFather>
   supabase secrets set OWNER_BOT_WEBHOOK_SECRET=$(openssl rand -hex 32)
   supabase secrets set OWNER_TELEGRAM_ID=<your numeric id>
   supabase secrets set OWNER_GITHUB_TOKEN=<fine-grained token>
   supabase secrets set OWNER_PROJECTS='[{"name":"Kiddo","repo":"hojiakbar14092009-tech/Kiddo.uz","branch":"main"}]'
   supabase functions deploy owner-bot
   ```

   Add BarakaLi, UstaGo and Portfolio to `OWNER_PROJECTS` once their repositories have the
   workflow (step 7).

5. **Point the bot at the webhook**, using the same secret as in step 4:

   ```sh
   curl -s "https://api.telegram.org/bot<token>/setWebhook" \
     -d url="https://<project-ref>.supabase.co/functions/v1/owner-bot" \
     -d secret_token="<OWNER_BOT_WEBHOOK_SECRET>" \
     -d allowed_updates='["message","callback_query"]'
   ```

6. **Set up each repository on GitHub**:
   - Secrets: `OWNER_BOT_TOKEN`, `OWNER_TELEGRAM_ID`, and either `ANTHROPIC_API_KEY` or
     `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`, for a Claude subscription).
   - Settings → Actions → General → Workflow permissions: turn on **Allow GitHub Actions
     to create and approve pull requests**.
   - Optional variables: `OWNER_TASK_BUDGET_USD` and `OWNER_TASK_MAX_TURNS`.
   - Vercel's GitHub integration makes the preview of each branch (on by default).
   - Recommended: protect `main` so only PRs can change it, without required status checks
     (see Safety).
7. **Add the other projects.** Copy `.github/workflows/owner-task.yml` and
   `scripts/owner-task/` into each repository. The checks and screenshot steps are written
   for a Vite app (`npm run build`, `vite preview`), so adapt those lines to that project's
   commands.
8. Optional: give the bot its commands with BotFather `/setcommands`: `start`, `status`,
   `help`.
