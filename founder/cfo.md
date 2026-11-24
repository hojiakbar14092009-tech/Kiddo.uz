# CFO note (read first)

All amounts are in so'm. The `$` sign below is the tool's label. Revenue is shown before tax; whether VAT applies to digital subscriptions in Uzbekistan **was not checked**. An accountant should check the tax, the legal form (self-employed or company) and how payments are received before any money moves. This is not financial, tax or legal advice.

- **Margin:** each subscriber-month leaves **24,490** (98%). The founder's answers set fixed costs and startup spend to **0** (free tiers, no salary, no launch budget), so break-even is 0, and the "98% margin" and "no red flags" are **true only on that premise**.
- **The line to watch: volume, meaning the ramp.** The ramp is an **ESTIMATE**: 0 → 300 paying subscribers by month 12 (10 payments a day). Basis: the simulated panel bought at 5% (v1) and 25% (v2, an upper bound), but nobody knows how many families will be *reached*. With the volume halved, year-1 profit falls from 24.7M to **12.4M** (tool, `--volume 0.5`). With it doubled, profit rises to **49.5M**. Volume moves the result more than price does: at 14,990 the year is **14.6M**.
- **Cash needed:** **0** on these inputs. The real hidden costs, none of them in the file:
  - the founder's unpaid time;
  - the Apple developer account if iOS is published (a yearly fee, amount not checked here);
  - a lawyer for the privacy, guarantee and terms text (HUMAN_TODO);
  - store billing at 15–30% instead of Payme/Click. At 15% the contribution drops from 24,490 to ≈21,240 (24,990 × 0.85; not from the tool).
- **Three ways to improve the result (tool what-ifs):**
  1. Reach more families (a kindergarten/teacher channel). Each doubling of volume adds about 24.7M a year (`--volume 2`).
  2. Keep payments on Payme/Click rather than store billing (protects ~3,250 per subscriber-month, by arithmetic).
  3. Push the yearly plan: one payment of 238,990 locks 12 months and cuts the "tries then drops" churn. Its effect on churn is **not modelled** (no churn data).
- **Board's money conditions (`board.md`):**
  - Cost of the first 100 paying families: ❌ unknown; CAC is not in the inputs.
  - Payment path chosen: ⚠ proposed (Payme/Click), not decided.
  - Guarantee affordable: ⚠ not modelled (needs a refund rate).

# Unit economics: Kiddo PRO (subscription; one unit = one paid subscriber-month)

Every number below comes from the input file. Nothing is looked up or guessed.

## One subscriber-month

| line | per subscriber-month |
| --- | ---: |
| Price | $24,990.00 |
| Payme/Click acquiring fee, ESTIMATE ~2% | -$500.00 |
| Hosting/voice delivery per subscriber, ESTIMATE (free tiers today) | -$0.00 |
| **Contribution** (what each subscriber-month leaves to pay the fixed costs) | **$24,490.00** (98%) |

## The margin that matters

Fixed costs: $0 a month (none given).

- **Break-even: 0 subscriber-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (10 a day): **98%** of every sale, after every cost.

## Year 1, month by month

| month | subscriber-months a day | revenue | profit | cumulative (after $0 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 0 | $0 | $0 | $0 |
| 2 | 0 | $127,449 | $124,899 | $124,899 |
| 3 | 0 | $247,401 | $242,451 | $367,350 |
| 4 | 1 | $502,299 | $492,249 | $859,599 |
| 5 | 1 | $749,700 | $734,700 | $1,594,299 |
| 6 | 2 | $1,124,550 | $1,102,050 | $2,696,349 |
| 7 | 2 | $1,499,400 | $1,469,400 | $4,165,749 |
| 8 | 3 | $2,001,699 | $1,961,649 | $6,127,398 |
| 9 | 4 | $2,751,399 | $2,696,349 | $8,823,747 |
| 10 | 5 | $3,748,500 | $3,673,500 | $12,497,247 |
| 11 | 7 | $5,000,499 | $4,900,449 | $17,397,696 |
| 12 | 10 | $7,497,000 | $7,347,000 | $24,744,696 |

- **Year 1 operating profit: $24,744,696** on $25,249,896 of revenue.
- After the $0 startup spend: $24,744,696.
- Startup money earned back: month 1.
- Cash you need before it pays for itself: **$0**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 98% | 0 | $24,744,696 |
| Price -10% | 98% | 0 | $22,219,706 |
| Volume -20% | 98% | 0 | $19,795,757 |
| Unit costs +15% | 98% | 0 | $24,668,916 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
