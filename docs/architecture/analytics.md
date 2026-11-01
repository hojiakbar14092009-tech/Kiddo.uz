# Anonymous analytics (Phase 37)

Measures how far families get and where they leave, so every later change (Phases 38–50) is checked against
real use instead of guesses.

## What is recorded

`src/domain/analytics` — an event is `{ id, name, install, day, at, screen? }` and nothing else:

| Event               | When                                                                    | At most               |
| ------------------- | ----------------------------------------------------------------------- | --------------------- |
| `first_opened`      | the very first open of this install (the funnel's cohort)               | once ever             |
| `app_opened`        | the app starts, or comes back to the front on a new day                 | once a day            |
| `onboarding_done`   | the family has its first child profile                                  | once ever             |
| `activity_opened`   | a child place opens (`isActivityPath`: tasks, alphabet, learn, labs, …) | once a day            |
| `activity_finished` | the central progression's `activity.completed`                          | once a day            |
| `journey_done`      | Home shows the day's plan complete                                      | once a day            |
| `returned_day2`     | opened the day after the first open                                     | once ever             |
| `returned_day7`     | opened 7–13 days after the first open                                   | once ever             |
| `app_closed`        | the page is hidden; carries the coarse screen                           | each time (see below) |

- `install` is a random id of the device's install, never tied to a person. `screen` is the first two path parts
  (`screenOf`): letters, digits and dashes only, anything else becomes `/other`, so ids and names never pass.
- No child, name, age, answer, photo or account is part of an event. The owner's `/admin` is never counted.
- Days are Tashkent days (`tashkentDay`). "Once ever" keys are kept for good (`ever`); daily keys are trimmed.
- Parents can switch the statistics off ("Ma’lumotlar va maxfiylik", shown only when they would be sent):
  nothing is recorded and the waiting queue is cleared.

## Sending

- The device keeps a queue (`kiddo.analytics`, at most 300 unsent, 1000 in the local history).
- Only when Supabase is configured: `AnalyticsTracker` sends every 60 s (first after 5 s) through
  `flushAnalytics` in batches of 100 via `add_analytics_events(jsonb)`. Offline or a server error: the batch
  waits. Events older than two days are dropped (the server would skip them).
- When the page is hidden, `sendOnLeave` hands the queue to the browser with `fetch(…, { keepalive: true })`, so
  a family's last visit still arrives. The events stay queued; the next normal send repeats them and the server
  ignores the ones it has (`on conflict do nothing`).
- Without Supabase (demo, offline builds, e2e) nothing leaves the device.
- A family that already had children before analytics started is not counted as a new install
  (`first_opened` is not sent for it), so the first month's cohort is honest.
- Only the day's last `app_closed` is kept on the device (an earlier one of the same day is replaced), so frequent
  app switches never push the first steps out of the queue or the log.
- Known limits: two open tabs share one queue in localStorage, so one may overwrite the other's unsent events.
  The endpoint is anonymous, so a script with the public key can still send made-up installs (each capped at
  200 events); per-IP rate limiting would need an edge function.

## Server (`supabase/migrations/0016_analytics.sql`, the owner applies it)

- `analytics_events`: no table privileges for `anon`/`authenticated`; checks on the name list, the screen shape
  and the day.
- `add_analytics_events(p_events jsonb)` (security definer) is the only way in: at most 100 events and one
  install per call; events that do not fit (name, screen, day or time far from now) are skipped, never an error,
  so one bad event cannot lose its batch; at most 200 events per install and day; about one call in a hundred
  clears events older than 180 days.
- `admin_analytics_funnel(p_days)`: a cohort — installs with `first_opened` in the period, and how many of them
  reached each step. `admin_analytics_exits(p_days)`: the last `app_closed` of each install each day, by screen.
  Counts only, admins only.
- SQL tests in `supabase/tests/rls_test.sql` (0016 block).

## Admin

- **Analitika**: the funnel (installs per step, share of the first step, how many left since the step before)
  for 7 or 30 days, and the screens the app was last left on, in plain names (`analyticsLabels.ts`). Device
  admin: this device's events; cloud admin: everyone's counts from the server.
- **Bildirishnomalar** replaces the Navi mascot: a plain list (payments, children starting to play, the day's
  summary) with an unread count in the menu.
