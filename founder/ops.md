# Operations: Kiddo (a solo-run digital subscription)

No prices below were checked live in this run. Each one is marked **confirm**, with the official page where it can be checked. `numbers.json` was **not changed** because no real quote replaced an estimate. Once the Payme/Click contract rate and the store fees are confirmed, update `numbers.json` and re-run `/founder-cfo`.

## 1. The daily cycle (👁 = the customer sees it)

1. Morning: check the payment and trial dashboard (new trials, renewals, failed payments).
2. 👁 Answer parents' messages (Telegram/e-mail/store reviews), within the same day.
3. Check errors: crash/error log, failed voice loads, payment webhooks (`server/pay.ts`).
4. 👁 Weekly (Sunday): reports reach parents (`parent/weekly/weeklyReport.ts`). Spot-check that they were generated.
5. Content or product work (the B-stages in `docs/handoff/PLAN.md`).
6. 👁 Marketing slot (calendar in `marketing.md`): one post or one video.
7. Evening: the refunds queue (14-day guarantee) and cancellations.

## 2. Suppliers (they replace "variable" and hidden costs)

| input | options | price / how to get it | note |
|---|---|---|---|
| Payment acquiring | **Payme Business** (business.payme.uz), **Click** (click.uz, merchant) | Rate only by contract: **confirm** | Already integrated in `server/pay.ts`. The rate replaces the 2% ESTIMATE in `numbers.json`. |
| Store billing (if required) | Google Play Billing, Apple IAP | Service fee: **confirm** on play.google.com/console/about/programs and developer.apple.com/app-store/small-business-program | Store rules on outside payment links differ by store and country. **Check before relying on Payme/Click inside native apps.** |
| Store accounts | Google Play Console, Apple Developer Program | One-time Play fee; yearly Apple fee: **confirm** on the official pages | The founder said startup = 0, but these fees are unavoidable for store listing. |
| Hosting / API | current setup (Vercel per the project docs), plus Supabase code kept | Free tier today | ⚠ **Vercel's Hobby plan terms restrict commercial use. Check vercel.com/legal/fair-use and pricing before taking money.** That would add a fixed monthly cost. |
| Voice delivery | bundled in the app / CDN | 0 today | The native package carries ~215 MB (B2 will shrink it). |
| Lawyer | a local IT/privacy lawyer | quote only | privacy, terms, guarantee text (HUMAN_TODO) |

## 3. People

- **Now (slow first month):** the founder alone, ~1–2 h/day on support, payments and marketing, plus product work. No wage (founder's answer, so `fixed_monthly` = 0).
- **At ~300 subscribers (plan, `numbers.json`):** support becomes ~1 h/day. Consider a part-time moderator or teacher for the parents' groups. Wage: from the founder (not set). Payroll taxes need the accountant.

## 4. Routines (one page each)

**A. Trial → paid (core fulfilment)**
1. The parent starts the trial with no card, and the app shows the first-report date.
2. On day 7 the first weekly report arrives.
3. On day 12 the app tells the parent that the trial ends in 2 days, shows the price and how to pay, and that it can be cancelled any time.
4. On day 14 there is no payment unless the parent chooses one (Payme/Click). No silent charge.
5. If the payment fails, notify once and fall back to Free. Never lock the child out mid-lesson.

**B. Complaint**
1. Reply the same day, thank them, and restate the problem in their words.
2. A bug: log it, give a date for the fix, and follow up when it ships.
3. Money: a refund within the 14-day guarantee, without argument. Note the reason.
4. Weekly: review the complaint reasons, which feed `/founder-offer`.

**C. Refund**
1. Check the payment date (≤ 14 days after the first payment).
2. Refund through the Payme/Click merchant panel.
3. Set the account to Free and confirm to the parent.
4. Log the reason.

**D. Release (instead of "closing")**
1. Green tests (vitest; e2e with workers=1, per the B1 notes).
2. Build, then a smoke check on one phone.
3. Store submission.
4. Watch errors for 24 h.

**E. Weekly review (instead of "reorder")**
Read the three marketing numbers (trials per channel, trial → paid, week-2 activity), the refunds, the payment-fee total and the hosting usage against the free-tier limits.

## 5. Tools (the smallest stack)

- **Payments:** Payme + Click (already in code).
- **Store:** Google Play first (Codemagic builds ready), App Store second.
- **Support:** Telegram (a bot is planned, phases 56–57) plus e-mail.
- **Bookkeeping:** a spreadsheet until it is worth paying for software. The accountant sets the format.
- **Analytics:** **none from third parties.** The children's-store rules and the project's own decision ("no AD_ID, no third-party analytics") apply. Use only the in-house admin analytics.

## 6. Licences and compliance checklist (confirm each; rules change; not legal advice)

- [ ] Business registration: self-employed / individual entrepreneur / LLC. Option: IT Park residency (it-park.uz). Confirm which form allows receiving Payme/Click merchant payments.
- [ ] Tax registration and the treatment of digital subscriptions (soliq.uz).
- [ ] **Personal data:** Uzbekistan's personal-data law (lex.uz) includes **data-localization requirements for citizens' data**. Check where parents' and children's data is stored (Vercel/Supabase regions) before launch.
- [ ] Children's privacy and parental consent: Google Play Families policy and Apple Kids category (both already in `docs/reference/TADQIQOT.md`).
- [ ] Consumer terms: the trial, auto-renewal (if any), the refund guarantee.
- [ ] Trademark filing for "Kiddo" (`brand.md`).

## 7. Risk register

| # | risk | likely | impact | plan |
|---|---|---|---|---|
| 1 | Store rejects Payme/Click inside the native app (store-billing rules) | med | high | Web (PWA) payment path; store billing as a fallback, priced for the fee |
| 2 | Hosting free tier or commercial-use terms are breached once there is revenue | med | med | Check the terms now; budget a paid plan once the first income arrives |
| 3 | Personal-data localization not met | med | high | Check before launch; move storage or minimise the data kept |
| 4 | Children "try then drop" within a week | high | high | Week-2 activity metric; daily 10-minute path; weekly report to the parent |
| 5 | Founder is sick or busy, so support stops | med | med | Auto-replies, FAQ, refund rule written down (routine C) |
| 6 | 215 MB native download puts families on mobile data off | high | med | B2 (shrink voice); recommend the web/PWA first |
| 7 | Payment webhook failure, so a parent pays but stays on Free | low | high | Daily check (cycle step 3); manual grant from admin |
| 8 | A bad review in a parents' group | med | med | Routine B the same day; never argue in public |
| 9 | A funded competitor adds Uzbek (`competitors.md`, threat) | low–med | high | Teacher/kindergarten relationships plus the weekly report as the moat |
| 10 | Refund rate higher than expected | unknown | med | Log the reasons; cap the guarantee to the first payment only |
