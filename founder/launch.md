# Launch: Kiddo "Ready for First Grade"

**Target date: not given.** The plan uses **L = 2027-02-01** as a *placeholder*: the earliest date that leaves 9–10 weeks for the critical path below (the product stages B2–B9 in `docs/handoff/PLAN.md`, the lawyer, store review). Change it and shift every date with it.

## 1. Test before you spend: founding families (now, web only)

- **What:** a founding-family pre-sale on the existing web app (PWA). The first year costs **199,990 so'm** through Payme/Click, in place of the 238,990 list price (`pricing.md`). A **free 14-day trial** comes first, and the money-back guarantee applies.
- **Where:** the 3–5 kindergartens and 2–3 parents' Telegram groups from `marketing.md`, each with its own link.
- **When:** 2026-12-07 → 2026-12-20 (2 weeks).
- **Success line (written before the test):** **≥ 40 trials and ≥ 8 paid founding families** in 2 weeks, i.e. ≥ 20% trial → paid.
  - The panel said 25% (v2, an upper bound).
  - Below 10% means trust the real buyers: go back to `/founder-offer` (is the report convincing?) or `/founder-pricing` (test 14,990).
  - Fewer than 40 trials means the problem is reach, not the offer: `/founder-marketing`.
- **Needs first:** a working Payme/Click path on the web, a Free/PRO split, and the guarantee and terms text. ⚠ **Do not take money before the business registration and the lawyer-reviewed terms (critical path weeks 1–2).** If that can't be done by 12-07, run the test as a **waitlist with a stated price** (no money) and accept that the signal is weaker.

## 2. Countdown (owner: H = Hojiakbar, L = lawyer, A = accountant)

| week | dates | task | owner | critical path |
|---|---|---|---|---|
| 1 | 11-30 → 12-06 | Choose the legal form (IP / LLC / IT Park), start registration; ask a lawyer for privacy + terms + guarantee; check the Vercel commercial terms and personal-data localization (`ops.md` §6) | H, A, L | ★ |
| 1 | | Define Free vs PRO in the app (one language free); trial without a card | H | ★ |
| 2 | 12-07 → 12-13 | Founding-family test starts (§1); first teacher visits | H | |
| 2 | | Payme/Click merchant contract → real fee into `numbers.json`, re-run CFO | H | ★ |
| 3 | 12-14 → 12-20 | Test ends; read against the success line; go / fix decision | H | ★ |
| 3–6 | 12-21 → 01-17 | Product stages: B2 (shrink the 215 MB voice), B7 (native sign-in), store-required privacy settings | H | ★ |
| 4 | | Trademark search for "Kiddo" (classes 9/41/42), handles, domain renewal (`brand.md`) | H | |
| 5 | 12-28 → 01-03 | Store listing: screenshots (demo report, time limit), text from `brand.md` | H | |
| 6 | 01-11 → 01-17 | Lawyer-approved texts in the app and listing | L, H | ★ |
| 7 | 01-18 → 01-24 | Submit to Google Play (review time: allow 1–2 weeks); the marketing calendar starts at L-14 = 01-18 | H | ★ |
| 8 | 01-25 → 01-31 | Soft open: the founding families + the teachers' groups on the store build; fix what breaks | H | |
| — | **02-01** | **Public launch (Google Play + web)**; App Store when ready (not on the critical path) | H | |

**Critical path:** legal form → payments contract → Free/PRO + trial → B2 download size → lawyer texts → store review. A slip in any of these moves L.

## 3. Launch-day run sheet (L = 2027-02-01, founder alone)

| time | what |
|---|---|
| 08:00 | Check that the store listing is live; test the trial and a Payme payment on one phone |
| 09:00 | Post in the teachers' and parents' groups: store link, hook 2, founding-family price and its end date (L+60 = 2027-04-02) |
| 10:00 | Video: hook 1 (a demo weekly report, labelled demo) |
| 11:00–13:00 | Answer every message (routine B) |
| 14:00 | Check the error log and the payment webhooks (risk 7) |
| 16:00 | Video: hook 4 (Payme/Click) |
| 18:00 | Count trials per channel link |
| 21:00 | Note what broke; plan tomorrow |

If something breaks:
- A payment fails: the parent stays on the trial, and PRO is granted manually.
- The store rejects the Payme link: send people to the web payment (risk 1).
- A crash: roll back to the last build.

## 4. The first 30 days

| number | target | change something if |
|---|---|---|
| Paying subscribers, against the ramp (`numbers.json`: month 1 ≈ 0, month 2 ≈ 5) | on ramp | under half the ramp for 2 weeks |
| Trials per channel | ≥ 5 a week per channel | a channel under 5 after 2 weeks → drop it |
| Trial → paid | ≥ 10% (panel 25% is an upper bound) | < 10% at day 30 → `/founder-offer` |
| Week-2 activity | ≥ 40% | < 40% → product (lesson length, path), not marketing |
| Refunds | < 10% of payments | above that → read the reasons, fix the cause |

There is no break-even target: fixed costs are 0 (`cfo.md`). Watch the hidden costs instead (hosting terms, store fees).

Reviews:
- **Day 7:** Did trials come from teachers or from groups? What did parents ask most?
- **Day 14:** Did the first trials convert? Did children still open the app in week 2?
- **Day 30:** Real trial → paid against the panel's 25%. Keep or raise the price (`pricing.md` A/B)? Which segment actually paid: was it Tashkent, as predicted, or someone else?
