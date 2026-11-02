# Admin panel (Phase 45)

`/admin` — the owner's control room (Uzbek, its own design). A device admin (PIN, demo) works on
this device's data; a cloud admin (Supabase account in `admins`) works on everyone's.

| Section                     | What it does                                                                                                                                                             | Where the data lives                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Umumiy                      | revenue KPIs, chart, online children, **new installs / day-2 / day-7 returns (30 days)**                                                                                 | payments; `admin_retention` (0019) or this device's analytics                                                         |
| Bildirishnomalar, Analitika | as before (Phase 37)                                                                                                                                                     |                                                                                                                       |
| Bolalar, To‘lovlar          | families, PRO, payments — no child photos, answers or results                                                                                                            |                                                                                                                       |
| Promokodlar                 | one code or **up to 200 at once** (prefix + letters without 0/O/1/I), **usage limit, expiry, note**, used count (`admin_promo_usage`), on/off, delete                    | `promo_codes` (0019 checks every path that gives PRO: inactive → `invalid`, expired → `expired`, used up → `used_up`) |
| Reklamalar                  | upload / link, preview, on/off, views and completions, **schedule** (starts/ends)                                                                                        | `ads.starts_at/ends_at`; parents see only live ads (`ad_is_live`)                                                     |
| Ovozlar                     | every sentence a child hears per language: recorded or waiting (voice manifest), the waiting list as a file for the voice actor, **listen, approve, return with a note** | `voice_reviews` (0019) or this device                                                                                 |
| Kontent                     | how much content there is; **seasons**: the robot greets on holidays (Navro‘z, Yangi yil, Mustaqillik, Bilimlar kuni) by the calendar, off, or one now                   | `app_settings.season`                                                                                                 |
| Adminlar                    | admins list, add by e-mail, remove (not yourself, not the last); **audit log** of every change to promo codes, ads, settings, admins, voice reviews (last 100)           | `admin_list/add/remove`, `admin_audit` (trigger-written only)                                                         |
| Sozlamalar                  | PRO price, nut gift, **rest hours** (18–23 → 4–9: the robot dozes and says it is time to rest), Telegram status                                                          | `app_settings.restHours`                                                                                              |

Limits, expiry, schedules, the team and the audit log need the server (0019): a device admin is
told so instead of being shown a success. Owner: apply `0019_admin.sql`.

Known limits (backlog): the code list and the ad view counts read at most 1000 rows (the API's
page size) — counts in SQL and paging come when there are that many; the database still lets an
admin account read children's results (`task_results`, `child_learn`; the panel never shows them,
the policies from 0003/0005 should be narrowed); deleting an admin's own account skips the
last-admin rule; times are the admin device's time zone.
