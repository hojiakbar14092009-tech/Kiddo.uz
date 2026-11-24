# Offer: Kiddo "Ready for First Grade"

The method is the Offers lens (`board/offers.md`). Sources: the panel (`_panel-v2-pitch-v1/results.md` before, `panel/results.md` after), competitors (`competitors.md`) and the board's conditions (`board.md`). `numbers.json` does not exist yet, so the cost column comes from what is **already built in the code**, not from money figures. The CFO puts the money in.

## 1. Problem list (in the buyer's words; P = panel, C = competitor reviews)

Before buying:
1. "I don't know what PRO adds beyond the free part" (P, the most common)
2. "Will my child actually learn, or just play?" (P)
3. "YouTube is free and my child is happy with cartoons" (P)
4. "I've never paid for an app" (P)
5. "No mother in my Telegram group has mentioned Kiddo" (P)
6. "My card doesn't work with Google Play / App Store billing" (P)
7. "24,990 every month for an app is a lot" (P)
8. "The kindergarten already teaches letters and numbers" (P)
9. "We already pay a tutor; this repeats it" (P)
10. "The app is big and our internet is slow / limited" (P)
11. "I'm afraid of paying monthly and forgetting to cancel" (P: one-time payment / no auto-renew)

During use:
12. "I don't want my child glued to the phone" (P)
13. "The grandparents will just hand the child the phone" (P)
14. "Parents have no option to remove an activity" (C, Lingokids)
15. "Tests rather than teaches" (C, Khan Kids)
16. "Lag, loads from servers" (C)
17. "The child gets bored after a week" (P, C)

After:
18. "I don't trust a report the app writes about itself" (P, after)
19. "Will it match what first grade tests?" (P)
20. "If it doesn't work, I've lost money" (P)

## 2. Solutions, scored (value 1–5 / cost 1–5, where cost 1 = already built)

| # | solution | value | cost | in? |
|---|---|---:|---:|---|
| 1, 2 | Name PRO as a programme with one outcome: "Ready for First Grade" | 5 | 1 | ✔ core |
| 2, 18 | Weekly report: which letters and numbers the child now knows (`parent/weekly/weeklyReport.ts` exists) | 5 | 2 | ✔ core |
| 12, 13 | A daily time limit the parent sets (`dailyLimitMinutes` exists), "10 minutes a day" | 5 | 1 | ✔ core |
| 6 | Payme / Click, no foreign card (`server/pay.ts` has the providers) | 4 | 2 | ✔ |
| 2, 4, 7 | 14-day PRO trial, no card needed | 5 | 2 | ✔ bonus |
| 20 | Money back within 14 days of the first payment | 4 | 2* | ✔ guarantee |
| 10, 16 | "Works offline after one download on Wi-Fi" (the shell is offline-capable) | 3 | 3** | ✔ |
| 11 | Gift year (paid once, no auto-renew) for grandparents | 3 | 2 | later (pricing ladder) |
| 5, 8 | Kindergarten / teacher channel | 5 | 4 | → `/founder-marketing` |
| 19 | Align the path with the first-grade curriculum | 4 | 4 | to verify (a content task) |
| 14 | Hide an activity from the parent area | 2 | 3 | no (low value) |

\* The guarantee's cost depends on the refund rate and on how the payment fees are handled on a refund. The CFO must model it (not done here).
\*\* "One download" is true on the web/PWA. The native package ships ~215 MB of voice (handoff B2). **Until B2 shrinks it, the pitch must not promise a small download.**

## 3. The stack

- **Core:** "Ready for First Grade": 10 minutes a day of letters and numbers in Uzbek, Russian or English, with a real voice. The parent sets the time limit and gets a weekly report of what the child now knows.
- **Free tier:** letters and numbers in one language. *(This is a product change: today it is not defined what is free and what is PRO. To be built.)*
- **Bonus 1 (doubt about learning):** 14 days of PRO free, no card, so the first weekly report arrives before any payment.
- **Bonus 2 (card and billing doubt):** pay with Payme or Click.
- **Guarantee:** money back within 14 days of the first payment, no questions asked.
- **Urgency:** only the founding-family year price from `pricing.md`, with a real date. No countdowns.
- **Name:** Kiddo "Ready for First Grade".

## 4. Value equation (1–10, before → after)

| element | before | after | what moved it |
|---|---:|---:|---|
| Dream outcome | 5 | 8 | The programme name and outcome (ready for first grade) |
| Perceived likelihood | 3 | 6 | Weekly report, trial before paying, guarantee |
| Time to result | 4 | 6 | "10 minutes a day", a first report in 7 days |
| Effort and sacrifice | 5 | 7 | Parent-set limit (less screen guilt), Payme/Click, no card for the trial |

## 5. Re-test (same 20 cards, seed 716158, `--quick`)

| | v1 pitch | v2 offer |
|---|---:|---:|
| Buy | **1 / 20 (5%)** | **5 / 20 (25%)** |
| need ("what does PRO add") | 5 | 1 |
| values (screen time) | 1 | 0 |
| habit ("never paid for an app") | 6 | 7 |
| trust ("nobody recommended it") | 4 | 4 |
| price | 2 | 2 |
| convenience | 1 | 1 |

**What dropped:** "need" and "values", because the programme name, the report and the time limit answered them. **What did not move:** "habit" and "trust". These are market and distribution problems, not offer problems: no offer fixes "nobody I know uses it". The answer is the kindergarten and teacher channel and the mothers' groups (`/founder-marketing`), and proof from a real pilot.

The buyers (5) are Russian-medium, private-school and higher-income families, plus a Payme subscriber. The Uzbek-medium regional segment (40% of the profile) still did not buy. Simulated buyers lean agreeable, so treat 25% as an upper bound.

## Rules check

- Every claim in `pitch.md` is something the code has or a stated product change. "Learns" was softened to "practises", so the pitch makes no result guarantee.
- No fake reviews, scarcity or discounts. The guarantee and the trial must be written into the store and terms text. A lawyer should read them together with the privacy text, which is already on the HUMAN_TODO list. This is not legal advice.
