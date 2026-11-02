# Parents' Telegram bot (Phase 56)

Parents get a weekly report, an optional daily summary and a gentle reminder in Telegram.

## Linking: a one-time link, never a child's name

A child's name is not a secret, and many children share one. Linking by name would let
anyone who knows the name see a child's results. It would also block a second family with
the same name, or the second parent of the same child.

1. In the parent area (after the grown-ups' question), **Settings → Telegram → Connect Telegram**.
2. The app asks the server for a code (`telegram_link_code`). The code is 32 random hex
   characters. The server keeps only its SHA-256, and the code works **once** and for
   **10 minutes**. A parent can make at most 10 codes an hour.
3. The app shows `https://t.me/<bot>?start=<code>`. The parent opens it and presses Start.
4. The webhook claims the code (`telegram_claim`) and links that chat to the account. It
   replies with the children's first names and ages, for example "Aziz (5 yosh) va Madina
   (4 yosh) ulandi". The names only confirm the link; they are never the key.
5. Each parent links their own chat, up to 5 chats per family. If a chat is linked again
   with a code from another family, it moves to that family and its settings start fresh.
6. To unlink, send `/stop` in the bot, or press **Disconnect Telegram** in the app.

The app never sees a chat id, only the row id and its settings (`telegram_my_links`).

## What is sent

A message holds only a child's first name, age, days played, minutes, number of exercises,
letters done well (2+ stars) and letters that were hard (1 star, 2+ mistakes).
**No surname, photo, voice, answers or birth date is sent.** The SQL tests check the exact
keys a report may hold.

| Message                      | When                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Weekly report                | Sunday, at the chat's hour (default 19:00 Tashkent), on by default                          |
| Daily summary                | Every day at the chat's hour, off by default, skipped on a day with no play                 |
| Reminder                     | Once a week at most, when no child of a family that has played before has played for 3 days |
| `/report`                    | This week's report on request                                                               |
| `/pro`                       | PRO plan and end date only; there is no payment in the bot                                  |
| `/lang uz\|ru\|en`           | Message language (also set in the app)                                                      |
| `/privacy`, `/help`, `/stop` | What is sent, the commands, unlink                                                          |

Achievement messages (a new letter or world, a birthday gift) are not sent yet. The app
does not upload those events, so the server cannot see them.

## Moving parts

| Part                                              | What it does                                                                                                                                                    |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/0022_telegram.sql`           | Tables `telegram_links` and `telegram_link_codes` (no direct access); the functions; hourly pg_cron `kiddo-telegram`                                            |
| `supabase/functions/telegram`                     | The webhook. It checks `X-Telegram-Bot-Api-Secret-Token` and answers only private chats. Its reply goes in the webhook response, and it never logs message text |
| `supabase/functions/worker`                       | Runs the `telegram_send` job: builds the text, then calls sendMessage. A chat that blocked the bot is unlinked; other failures are retried                      |
| `supabase/functions/_shared/telegram*.ts`         | The webhook logic and the texts (uz/ru/en), tested with vitest                                                                                                  |
| `src/features/parent/dashboard/TelegramPanel.tsx` | Connect, per-chat settings, disconnect                                                                                                                          |

## Owner setup

1. In Telegram, create the bot with **@BotFather** (`/newbot`). Keep the token.
2. Set the Supabase secrets. The token never goes in the app or the repo:

   ```sh
   supabase secrets set TELEGRAM_BOT_TOKEN=<token from BotFather>
   supabase secrets set TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 32)
   ```

3. Apply migration `0022_telegram.sql`, then deploy the functions:
   `supabase functions deploy telegram worker`.
4. Point Telegram at the webhook, using the same secret as in step 2:

   ```sh
   curl -s "https://api.telegram.org/bot<token>/setWebhook" \
     -d url="https://<project-ref>.supabase.co/functions/v1/telegram" \
     -d secret_token="<TELEGRAM_WEBHOOK_SECRET>" \
     -d allowed_updates='["message"]'
   ```

5. Set the app's build variable to the bot's username without @, for example
   `VITE_TELEGRAM_BOT=KiddoBot` in Vercel, then redeploy. Without this variable the panel
   says the bot is not set up yet.
6. Optional: give the bot its commands with BotFather `/setcommands`:
   `report`, `pro`, `lang`, `privacy`, `help`, `stop`.

The worker and pg_cron are already set up (Phase 53: Vault `kiddo_project_url`,
`kiddo_worker_secret`).
