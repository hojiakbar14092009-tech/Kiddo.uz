# Kiddo · Business plan

**Verdict: Profitable**

- ✓ Each subscriber-month earns $24490.00 before fixed costs (98% contribution).
- ✓ Year 1 operating profit: $24,744,696.
- ✓ 5 of 20 simulated buyers buy (25%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $24990.00 a subscriber-month |
| Profit margin at plan | 98% per subscriber-month |
| Break-even | 0 subscriber-months a day |
| Year 1 operating profit | $24,744,696 |
| Startup spend | $0 |
| Cash needed before it pays for itself | $0 |
| Startup money earned back | month 1 |
| Buyer panel | 5 buy · 15 pass |

## The idea

- What it is: a learning app for young children (alphabet, numbers, counting, short lessons and games) with recorded voice, a 3D mascot companion and a parent area; web app (PWA) plus Android/iOS builds.
- Who it is for: parents in Uzbekistan of children aged 4–6, buying for a child who learns in Uzbek, Russian or English (all three alphabets are in the app).
- What it sells, at what price: free core app; a PRO subscription at 24,990 so'm / month or 238,990 so'm / year (the founder's planned price, not yet live; live prices are set by the admin).
- Where and how: Uzbekistan, online; delivered as a web app and through Google Play and the App Store (Capacitor wrapper, store builds in progress). How customers find it: not decided yet.
- Budget and constraints: solo founder (Hojiakbar) building with AI coding help on one low-RAM Windows laptop; a rule of no paid services enabled so far; money budget not stated. Already built: ~1,900 automated tests, 3 languages with ~16,000 recorded voice clips (~215 MB), offline-capable web shell. Children's-app store rules apply (no ad IDs, no third-party analytics, parental consent; a lawyer review of privacy text is still pending).

## Summary

**Kiddo "Ready for First Grade"** is a 10-minutes-a-day letters-and-numbers app in Uzbek, Russian and English with a real recorded voice. Every week the parent sees what the child now knows. It is for parents in Uzbekistan whose child starts first grade within a year, starting with Tashkent families who already pay for school preparation.

**Verdict (computed by `compile.py`): Profitable.** It rests on three numbers:
- **Margin:** 24,490 so'm left from each 24,990 subscriber-month (98%), with Payme/Click fees estimated at 2%.
- **Break-even:** 0 a day, because the founder's fixed costs and startup spend are 0.
- **Year 1:** 24.7M so'm operating profit on an **estimated** ramp to 300 subscribers.

**Read this before trusting the verdict:**
- The buy rate is **exactly at the 25% bar**, and it comes from 20 *simulated* buyers, so treat it as an upper bound.
- The zero costs exclude the founder's time and store fees, and possibly a paid hosting plan once there is revenue (`ops.md`).
- The ramp is a guess. Halving it halves the profit (12.4M).

This is not financial, legal or tax advice.

**Where the board and the panel agreed:** PRO needed to be a programme with visible results, not just a price. Once it was (`offer.md`), buyers went from 1/20 to 5/20.

**Where they disagreed:** the board saw 16,000 voice clips as a moat (Product lens) or as copyable content (Monopoly lens). The panel did not mention the voice as a reason to buy; it cared about proof and recommendations.

**Biggest risk: reach and trust.** "Never paid for an app" (7) and "nobody recommended it" (4) did not move with the better offer. Uzbek-medium regional families bought 0 in both runs. What we do about it: kindergarten teachers and parents' groups first (`marketing.md`), then a real founding-family test.

**What it takes to start:** 0 so'm in cash on the founder's inputs, but registration, a lawyer for the terms and guarantee, and a Payme/Click merchant contract are needed before taking money (`launch.md` critical path).

**This week:** choose the legal form, start the Payme/Click merchant contract, and decide the Free/PRO split, so that the founding-family test can start on 2026-12-07.

## What the board said

### Vote
3 × FUND IF, 0 × PASS. Average score **4.7 / 10** (Offers 5, Monopoly 4, Product 5).
Memos: `board/offers.md`, `board/monopoly.md`, `board/product.md`.

### Risks raised by more than one member
1. **PRO is a price, not an offer** (all three). Nobody can say what the paywall holds, so the free/PRO choice turns into a price question. If free already does everything, PRO has no reason to exist.
2. **No distribution** (Offers, Monopoly). "How customers find it: not decided." The market size, how many families pay for apps, and the cost of the first 100 paying families are all unknown.
3. **No single promise** (Product, Monopoly). Too many features (3 alphabets, math, space, games, shop, studio, shorts, collection, homework, camera helper) dilute both the pitch and the moat.
4. **No proof the child learns** (Offers, Product). There has been no pilot, no families observed, no before/after result.

### Conditions (checklist for the rest of the pack)
- [ ] One-sentence promise built around one outcome (for example "ready for school in letters and numbers"), with the feature set cut to serve it and the rest hidden. *(Product, Monopoly, Offers)*
- [ ] A written PRO definition: what is behind it, and the moment the parent sees the price. *(all; /founder-offer)*
- [ ] A visible parent progress report and a first-week result. *(Offers)*
- [ ] A simple guarantee the CFO can afford. *(Offers; /founder-offer, /founder-cfo)*
- [ ] A competitor map showing nobody already owns Uzbek-first early learning, with rivals' prices. *(Monopoly, Offers; /founder-competitors)*
- [ ] Market size, the share of families willing to pay, and which language segment leads. *(Offers, Monopoly; /founder-consumer)*
- [ ] A named distribution channel, with the measured cost of the first 100 paying families. *(Monopoly, Offers; /founder-cfo, /founder-marketing)*
- [ ] One defensible advantage the founder commits to deepening (kindergarten/school partnerships, a mascot brand, parent–teacher homework links). *(Monopoly)*
- [ ] A pilot: at least five real families watched without coaching, with what broke and their results/quotes written down. *(Product, Offers; /founder-launch)*
- [ ] The first-five-minutes flow mapped from store page to first lesson, including the download size on mobile data (215 MB of voice). *(Product)*
- [ ] Payment path chosen (Payme / Click / store billing). *(Product, Offers; /founder-ops)*
- [ ] Consent and privacy text reviewed by a lawyer before launch. *(Product)*

### Where the members disagree
- **What is defensible.** The Product lens calls the 16,000 voice clips "the hardest part to copy". The Monopoly lens says the content "anyone can rebuild" and that a funded global app or a telecom bundle could match it in months. Voice is a head start, not a moat.
- **The feature list.** The Offers lens sees the many features as a free "stack" that adds value. Product and Monopoly see the same list as dilution. Either way, the offer and the product must be built around one outcome.

### The strongest version the board can see
This differs from the pitch. Kiddo is not "a kids' app with lots of things in it". It is a **school-readiness programme for Uzbek-speaking 4–6-year-olds**: the child hears every letter and number in a real voice, and every week the parent sees what the child can now do. The product shrinks to letters, numbers and the progress report. PRO becomes the programme (the full path, the report, the parent's homework, perhaps a guarantee) and is not just unlocked content. Distribution comes from where these parents already gather and trust (kindergartens and teachers, or a payment- or telecom-app partner), which also creates the moat that the content alone lacks. The built craft (offline use, ~1 s screens, child-safe design) stays as the quiet reason parents trust it. The board saw no data that it works or sells. That is what the next skills must find.

## The competition

Source date: 2026-11-24. Public sources only. Currency conversions use the Central Bank of Uzbekistan rates for 24.11.2026 (https://cbu.uz/uz/arkhiv-kursov-valyut/json/): USD 12,002.93, EUR 13,156.41, RUB 146.74 so'm. Raw data: `founder/competitors.csv`.

**Research limits.** Google Play pages could not be read in full (the fetch tool got only the page title), so Play ratings, installs and reviews are "not found" for the Uzbek apps. The App Store reviews quoted below come from the US storefront, not from parents in Uzbekistan. No Uzbek-language kids' app had enough App Store ratings to show any.

### 1. The table (most direct first)

| # | Name | Type | Channel | Comparable price | Positioning (their words) | Rating |
|---|---|---|---|---|---|---|
| 1 | [Minni Kids](https://play.google.com/store/apps/details?id=uz.minnikids.app) | direct | Google Play | not found | "5–8 yoshli bolalar uchun o'zbek tilidagi o'yinli ta'lim ilovasi" | not found |
| 2 | [Mohir Panda](https://apps.apple.com/app/mohir-panda/id6450392470) | direct | App Store | $4.99 one-time "All subjects" (≈59,895 so'm) | "Bolalar tarbiyaviy o'yini!" | too few ratings |
| 3 | [Olim bola](https://apps.apple.com/cy/app/olim-bola/id1499617206) | direct | App Store | €0.99 one-time "Full edition" (≈13,025 so'm) | "«Olim bola 4» – bolajonlar uchun qiziqarli bilimlar olami" | too few ratings |
| 4 | [Ajoyib ALIFBO](https://community.kodular.io/t/free-no-ads-ajoyib-alifbo-a-memory-game-for-kids-to-learn-the-uzbek-alphabet/68572) | direct | Google Play (2020 post; current listing not verified) | free, no ads | "It's a Memory game to learn the Uzbek Alphabet. This game is for kids." | not found |
| 5 | [Учим Буквы (GoKids!)](https://apps.apple.com/ru/app/%D1%83%D1%87%D0%B8%D0%BC-%D0%B1%D1%83%D0%BA%D0%B2%D1%8B-%D1%80%D0%B0%D0%B7%D0%B2%D0%B8%D0%B2%D0%B0%D1%8E%D1%89%D0%B8%D0%B5-%D0%B8%D0%B3%D1%80%D1%8B/id6443582174) | indirect (Russian) | App Store | 229 ₽/month (≈33,603 so'm); 1,390 ₽/year (≈203,969) | "Английский язык: азбука игра 1" | 4.3 (251) |
| 6 | [Lingokids](https://apps.apple.com/us/app/lingokids-play-and-learn/id1002043426) | indirect (global) | App Store | IAP $9.99–$59.99 (≈119,909–720,056 so'm); plan lengths not stated | "Everything kids love!" | 4.2 (691K) |
| 7 | [Khan Academy Kids](https://apps.apple.com/us/app/khan-academy-kids/id1378467217) | indirect (global, English only) | App Store | free, no ads, no subscriptions | "Reading & Math Learning Games" | 4.8 (134K) |
| 8 | [Duolingo ABC](https://apps.apple.com/us/app/duolingo-abc-learn-to-read/id1440502568) | indirect (global, English only) | App Store | free, no IAP | "Interactive Stories for Kids" | 4.3 (3.9K) |
| 9 | [Чудо малыш. Сказки](https://russkiymir.ru/news/324662/) | indirect (Russian for Uzbek kids) | Play + App Store | free | not found | not found |
| 10 | [O'zbek Bolalar Qo'shiqlari](https://vidiq.com/youtube-stats/channel/UCkfLMWYx2kpgqlH-VHN1jfg) | substitute | YouTube | free | not found | 1.24M subscribers (vidIQ, June 2025) |
| 11 | [Uzum preschool workbooks (wunderkind7)](https://uzum.uz/uz/shop/wunderkind7) | substitute | Uzum | 11,000–13,000 so'm per workbook | "Maktabgacha yoshdagi bolalar uchun o'zbek tilidagi husnixat - harflar, yozuv va o'rganish" | shop 5 (2 reviews) |
| 12 | [Private kindergarten, Tashkent](https://anhor.uz/uzl/ichkaridan-nazar/toshkentda-yashashga-qancha-pul-kerak) | substitute | offline | 3,793,859 so'm/month average (year of article not shown) | n/a | n/a |
| 13 | Private tutor / school-prep course | substitute | offline | not found | n/a | n/a |

Context: Khan Academy's Uzbek localisation covers the main platform, not Kids. A community answer says Kids was "only available in English" ([Khan Academy blog](https://blog.khanacademy.org/?p=658); the answer is undated). Preparing one child for school in Tashkent costs "taxminan 3,5 mln so'm" in uniforms and supplies, not lessons ([Kun.uz, 2026-08-17](https://kun.uz/news/2026/08/17/2026-yilda-toshkentda-bolani-maktabga-tayyorlash-qanchaga-tushadi)).

### 2. Price range (comparable item: a kids' learning app's paid unlock or monthly plan)

Apps with a known price (rows 2–8; Minni Kids not found; the free apps count as 0):
- **Lowest:** 0 so'm (Ajoyib ALIFBO, Khan Academy Kids, Duolingo ABC, Чудо малыш)
- **Median, all 8 apps:** ≈6,513 so'm. **Median, the 4 paid apps only:** ≈46,749 so'm
- **Highest:** ≈720,056 so'm (Lingokids' top IAP); its lowest IAP is ≈119,909 so'm
- **Only monthly plan found:** GoKids at ≈33,603 so'm/month

Kiddo's planned 24,990 so'm/month is ~26% below GoKids' Russian monthly plan and below Lingokids' cheapest IAP. It is far above the one-time unlocks of the Uzbek apps (≈13,025 and ≈59,895 so'm, once). Substitutes span 0 (YouTube) to 11–13k so'm (a workbook) to ≈3.8M so'm/month (private kindergarten).

### 3. Positioning map (text)

Axes: **Uzbek-first content** (left = foreign language only, right = Uzbek-first) × **depth/polish** (bottom = single game or thin content, top = full programme with mass usage).

```
                    deep / polished
   Khan Kids, Lingokids       |
   Duolingo ABC               |
                              |
   GoKids (RU)                |      [empty: Uzbek-first + deep + parent progress]
   Чудо малыш (RU)            |
foreign ----------------------+---------------------- Uzbek-first
                              |  Olim bola, Mohir Panda, Minni Kids
                              |  Ajoyib ALIFBO
                              |  Uzum workbooks, YouTube songs
                    thin / single-purpose
```

Price runs along a third line: free (Khan, Duolingo, YouTube) → one-time cheap unlock (Olim bola, Mohir Panda) → subscription (GoKids, Lingokids) → offline (≈3.8M so'm/month kindergarten).

### 4. Complaints, ranked

Uzbek apps: **no public reviews found** (App Store says there are not enough ratings; Play reviews could not be read). So every theme below comes from global apps, US storefront, and is a proxy, not Uzbek-parent evidence.

1. **Price/subscription feels too high (Lingokids), 3 reviews.**
   - "it's too much money for a yearly trial" ([Lingokids reviews](https://apps.apple.com/us/app/lingokids-play-and-learn/id1002043426?see-all=reviews))
   - "why do you even have to pay for everything trust me it is not worth it" (same link)
   - "Do not bother getting this and their subscription." (same link)
2. **Weak parent controls (Lingokids, Khan Kids), 3 reviews.**
   - "Parents have no option to remove an activity" (title, [Lingokids reviews](https://apps.apple.com/us/app/lingokids-play-and-learn/id1002043426?see-all=reviews))
   - "little is done to restrict a child from playing an activity over and over and over." ([Khan Kids reviews](https://apps.apple.com/us/app/khan-academy-kids/id1378467217?see-all=reviews))
   - "More parental restrictions please" (title, same Khan link)
3. **Tests rather than teaches; no starting-level check (Khan Kids), 1 review. Thin.**
   - "This is not a platform that you would use to TEACH a child skills." ([Khan Kids reviews](https://apps.apple.com/us/app/khan-academy-kids/id1378467217?see-all=reviews))
4. **Lag or slow loading from servers (Lingokids, Khan Kids), 2 reviews. Thin.**
   - "the problem is that most activities are loaded from their servers" ([Khan Kids reviews](https://apps.apple.com/us/app/khan-academy-kids/id1378467217?see-all=reviews))
   - "it's always making me lag" ([Lingokids reviews](https://apps.apple.com/us/app/lingokids-play-and-learn/id1002043426?see-all=reviews))
5. **Repetitive content bores the child (Khan Kids), 1 review. Thin.**
   - "my son begins to lose interest and gets visibly frustrated" ([Khan Kids reviews](https://apps.apple.com/us/app/khan-academy-kids/id1378467217?see-all=reviews))

### 5. The gap

Nobody found offers an **Uzbek-first, voiced school-readiness programme for ages 4–6 with a visible parent progress report**. The evidence:
- The strong, polished apps (Khan Academy Kids 4.8/134K, Duolingo ABC) are free but English only.
- The Uzbek apps (Olim bola, Mohir Panda, Minni Kids, Ajoyib ALIFBO) have no visible ratings, one-time unlocks of €0.99–$4.99, and no stated parent progress report.
- The offline substitute costs ≈3.8M so'm/month.

The global apps' complaints (weak parent controls, "quizzing, not learning", server lag) line up with what Kiddo already has (offline shell, parent area) and with the board's "weekly result" idea.

**Caveat:** the gap is in Uzbek *content plus a programme*, not in "a kids' app". Free English-only Khan Kids sets the bar for quality at 0 so'm. Minni Kids (Uzbek, ages 5–8) could not be checked. Before treating the gap as real, read its Play listing and reviews by hand.

### 6. The threat

- **Fastest copier: Minni Kids or Mohir Panda.** Both already make Uzbek-language kids' content with a mascot (robot Minni, a panda). To match Kiddo's pitch they would only need a parent report and a subscription, which is weeks of work. Adding Russian/English voice would take them longer.
- **Biggest long-run threat: Khan Academy Kids adding Uzbek.** Khan already runs an Uzbek localisation of its main platform through the non-profit "Bilim Onlayn" ([Kun.uz, 2019](https://kun.uz/news/2019/05/04/xan-akademiyasi-har-kim-har-yerda-bepul-talim-olishi-mumkin-endi-bu-imkoniyat-ozbekistonda-ham-mavjud)). A free Uzbek Khan Kids would undercut a paid PRO at once. That expansion is not announced. It is a risk, not a fact.
- **Free substitutes:** YouTube (O'zbek Bolalar Qo'shiqlari, 1.24M subscribers) costs nothing and already holds the child's attention.

## The buyer panel

**5 buy · 15 pass** (25% buy) out of 20 simulated buyers. Seed 716158, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Family preparing the child for English or a private school | 3 | 67%  (thin) |
| Russian-medium family, Tashkent | 4 | 50%  (thin) |
| Uzbek-medium family, regional city | 8 | 12% |
| Uzbek-medium family, Tashkent | 5 | 0%  (thin) |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Payme/Click subscriber | 2 | 100%  (thin) |
| School-readiness planner | 3 | 67%  (thin) |
| Screen-time worrier | 3 | 33%  (thin) |
| Free only | 5 | 0%  (thin) |
| Tries then drops | 2 | 0%  (thin) |
| Grandparent buyer | 1 | 0%  (thin) |
| Asks other mothers | 4 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $160,477,000 and up | 7 | 43%  (thin) |
| under $100,974,000 | 6 | 17%  (thin) |
| $100,974,000 to $160,477,000 | 7 | 14%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| habit | 7 | "I've never paid for an app and I'm not starting now. The kindergarten already does letters and numbers, so I'd download the free version and let my child use one language, plus YouTube, and that's enough." (P002) · "I have never paid for an app and I'm not starting now. I'd download it, use the free letters and numbers in Uzbek, and maybe press the free PRO trial because it needs no card, but when the 14 days end I'd just keep the free part and YouTube." (P004) |
| trust | 4 | "Nobody in my kindergarten chat or Telegram group has mentioned Kiddo yet, so at most I would download the free version and see whether my child even likes it. I would not pay for another phone app on an ad I saw myself, and the free letters and numbers might be enough anyway." (P011) · "Nobody in my Telegram mom group or at the kindergarten has mentioned Kiddo yet, and I don't pay for an app nobody I know has tried. At most I would download the free version on Wi-Fi and see if my child even opens it while the grandparents watch him." (P013) |
| price | 2 | "I would install the free version, since no ads and a time limit I set myself is exactly what I want instead of cartoons in the evening. But the free letters and numbers in Russian are enough for us, and I am not paying 24,990 every month for an app when I can sit with her and a workbook." (P006) · "I would download it and maybe take the free 14 days since no card is needed, but 24,990 every month for a phone app feels like a lot when I am already planning to pay a real English tutor for school prep. The free letters and numbers in one language is probably enough for my child at 4-5." (P019) |
| convenience | 1 | "I would download the free version on Wi-Fi and see if my child even sticks with it, but I would not pay this month. In our family it is my mother who pays for the child's learning, and she would rather pay for a real teacher or a course she can see than a subscription on my phone." (P009) |
| need | 1 | "My child already goes to a tutor for school preparation, so letters and numbers are covered. I would download the free version and maybe start the 14-day trial, but I don't see why I should pay 24,990 every month on top of the tutor." (P016) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 5 | "I already pay a tutor for first-grade prep, and 25 thousand a month is nothing next to that. If 10 minutes of letters in Russian replaces the cartoons the grandparents put on anyway, and the weekly report shows me real progress, I'll pay for the monthly plan after the trial." (P001) · "I set the time limit, there are no ads and it's only 10 minutes, so it's one of the few phone things I'd allow, and 24,990 a month is nothing next to what we spend on school prep. I'd use the free trial, check the weekly report, and pay for a month if the report shows she's actually learning letters." (P003) |

### What would flip a no

- If the kindergarten teacher or several mothers in our parents' Telegram group said their child really learned to read with it and that it's worth paying for.
- If after the free trial I saw with my own eyes that my child could read and say letters she didn't know before, and her kindergarten teacher or other mothers said it helped, I might pay for one month before school starts.
- If the kindergarten teacher or a lot of parents in our Telegram group said it really got their kids ready for first grade, and it was a small one-time payment instead of a monthly subscription.
- If after the trial the weekly report showed me she really learned new letters and she asked for it herself, and there was a one-time or much cheaper price, around 100,000 for the year.
- If the kindergarten teacher told me my child is behind and recommended this app specifically, I might pay for a month or two before first grade.
- If after the two free weeks he still asks for it by himself and I can see in the report that he really learned new letters, then I'd pay for one month.
- If the download size was stated and small, and I could give a one-year access as a gift card or code that grandma pays for once, maybe after other parents in our kindergarten Telegram group say their child really learned letters with it.
- A few mothers in my kindergarten group saying their child actually learned the letters with it and that the time limit really stops the app, so the child does not cry for more.
- If the kindergarten teacher or several mothers in our Telegram group said their kids really learned to read with it before first grade, I might pay for one month before school starts.
- A few mothers in my Telegram group or the kindergarten teacher saying their child really learned letters with it.
- Two or three mothers from our kindergarten Telegram group, or the teacher, saying their child learned the Uzbek letters with it before first grade.
- If other parents in our kindergarten Telegram group or the tutor showed that the weekly report really tracks progress and saves tutor hours, I would pay the yearly price.

Buyers say they would buy **1.0 times** in the first month on average.

20 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

All prices are in so'm. The `$` sign in `pricing-curve.md` comes from the tool's label; the values are so'm.

### 1. The price: keep 24,990 so'm / month, and lead with the year

- **Panel (20 simulated buyers, `pricing-curve.md`):** the acceptable range is **6,851–30,129**. OPP is 7,095, IPP is 15,139, and PME is 30,129. 24,990 is **inside** the range, but it sits on the median "getting expensive" answer (25,000) and close to PME. Price is a barrier, but a smaller one than trust and need: only 2 of 19 passed on price (`panel/results.md`).
- **Competitors (`competitors.md`):** the only monthly plan found is GoKids at ≈33,603/month, so 24,990 is ~26% below it. The Uzbek apps are one-time unlocks of ≈13,025 and ≈59,895. Global apps are free (Khan Kids) or expensive (Lingokids, ≥119,909). 24,990 is therefore credible for a *programme*. For "an app" it is high, because the Uzbek rivals charge once.
- **Margin: not computed yet.** `founder/numbers.json` does not exist, because the CFO runs after pricing in this pack. The variable cost per subscriber is mostly the payment or store fee and hosting; the CFO must enter these, and none are guessed here. If the CFO shows a thin margin through store billing, that strengthens the case for Payme/Click (see §4).
- **Decision:** don't cut the price before the offer is fixed. Every flip in the panel came from proof (a progress report, a recommendation), not from a lower price. Lowering the price without the proof would just lose revenue.

### 2. The ladder

| rung | price | reason to step up |
| --- | --- | --- |
| Free | 0 | Letters and numbers in one language, the voice, no ads, offline. Enough to *show* that the child learns. |
| PRO month | 24,990 / month | The full school-readiness programme (all three languages, the full path, the weekly parent report, homework, daily time limit). |
| PRO year | 238,990 / year (= 19,916 / month, ~20% less) | For parents who already saw progress; it covers the whole year before first grade. |
| Gift year (proposal) | 238,990, paid once via Payme/Click, no auto-renewal | The panel named a grandparent paying as a gift ("one-time yearly card ... give grandma"). |

What exactly goes into PRO versus Free is decided in `/founder-offer`. The ladder above is a placeholder until then.

### 3. Opening offer

- **14 days of PRO free**, so the parent sees the first weekly report before paying. No card is needed to start. This targets the top flip ("if after a few weeks ... the parent area showed real progress").
- **Founding families:** the first year at **199,990** for anyone who buys before a fixed date (60 days after the store launch; the date is written in `/founder-launch`). After that date the price returns to 238,990 and is never offered again. This is not a fake "was" price: 238,990 is the real list price.

### 4. What to test with real buyers

Two prices inside the range, on the same landing page or store listing with only the price changed:
- **A: 24,990 / month** (current; the year at 238,990)
- **B: 14,990 / month** (near IPP 15,139; the year at 149,990)

How to test: a pre-sale or waitlist (Telegram parent groups, two links, the same text) with a real Payme/Click payment or deposit. Compare paid conversions, not clicks. Pick B only if its conversion is **more than 1.67×** A's (24,990 / 14,990), since that is the point where revenue breaks even.

Also test the payment path: store billing versus Payme/Click. Two panel buyers named store billing alone as the blocker.

### 5. The panel's price objections (verbatim, simulated, not testimonials)

1. "But 24,990 every month for an app, when I do not even know what PRO adds beyond the free part, I will not pay in the first month." (P006)
2. "But 24,990 so'm every month for an app is a lot when the free part already teaches letters and numbers." (P019)
3. "I have never paid for an app; YouTube is free and my child is happy with cartoons. I might download the free part and see, but paying 25 thousand every month for something on my phone is not what I do." (P004)

## The offer

The method is the Offers lens (`board/offers.md`). Sources: the panel (`_panel-v2-pitch-v1/results.md` before, `panel/results.md` after), competitors (`competitors.md`) and the board's conditions (`board.md`). `numbers.json` does not exist yet, so the cost column comes from what is **already built in the code**, not from money figures. The CFO puts the money in.

### 1. Problem list (in the buyer's words; P = panel, C = competitor reviews)

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

### 2. Solutions, scored (value 1–5 / cost 1–5, where cost 1 = already built)

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

### 3. The stack

- **Core:** "Ready for First Grade": 10 minutes a day of letters and numbers in Uzbek, Russian or English, with a real voice. The parent sets the time limit and gets a weekly report of what the child now knows.
- **Free tier:** letters and numbers in one language. *(This is a product change: today it is not defined what is free and what is PRO. To be built.)*
- **Bonus 1 (doubt about learning):** 14 days of PRO free, no card, so the first weekly report arrives before any payment.
- **Bonus 2 (card and billing doubt):** pay with Payme or Click.
- **Guarantee:** money back within 14 days of the first payment, no questions asked.
- **Urgency:** only the founding-family year price from `pricing.md`, with a real date. No countdowns.
- **Name:** Kiddo "Ready for First Grade".

### 4. Value equation (1–10, before → after)

| element | before | after | what moved it |
|---|---:|---:|---|
| Dream outcome | 5 | 8 | The programme name and outcome (ready for first grade) |
| Perceived likelihood | 3 | 6 | Weekly report, trial before paying, guarantee |
| Time to result | 4 | 6 | "10 minutes a day", a first report in 7 days |
| Effort and sacrifice | 5 | 7 | Parent-set limit (less screen guilt), Payme/Click, no card for the trial |

### 5. Re-test (same 20 cards, seed 716158, `--quick`)

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

### Rules check

- Every claim in `pitch.md` is something the code has or a stated product change. "Learns" was softened to "practises", so the pitch makes no result guarantee.
- No fake reviews, scarcity or discounts. The guarantee and the trial must be written into the store and terms text. A lawyer should read them together with the privacy text, which is already on the HUMAN_TODO list. This is not legal advice.

## The numbers

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

## Unit economics: Kiddo PRO (subscription; one unit = one paid subscriber-month)

Every number below comes from the input file. Nothing is looked up or guessed.

### One subscriber-month

| line | per subscriber-month |
| --- | ---: |
| Price | $24,990.00 |
| Payme/Click acquiring fee, ESTIMATE ~2% | -$500.00 |
| Hosting/voice delivery per subscriber, ESTIMATE (free tiers today) | -$0.00 |
| **Contribution** (what each subscriber-month leaves to pay the fixed costs) | **$24,490.00** (98%) |

### The margin that matters

Fixed costs: $0 a month (none given).

- **Break-even: 0 subscriber-months a day.** Below that you lose money every month.
- **Profit margin at your plan** (10 a day): **98%** of every sale, after every cost.

### Year 1, month by month

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

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 98% | 0 | $24,744,696 |
| Price -10% | 98% | 0 | $22,219,706 |
| Volume -20% | 98% | 0 | $19,795,757 |
| Unit costs +15% | 98% | 0 | $24,668,916 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

Evidence: `panel/results.md` (v2 offer, 5/20 buy), `_panel-v2-pitch-v1/results.md` (v1, 1/20), `competitors.md`, `offer.md`, `pricing.md`, `numbers.json`. All simulated buyers: the audience and messages below are **hypotheses to test**, not proof.

### 1. Who first

From the panel, buyers were: Russian-medium families in Tashkent, families preparing for a private/English school, higher income, already paying for subscriptions via Payme/Click, already paying a tutor. Uzbek-medium regional families (40% of the profile) bought 0 in both runs; their blockers were "never paid for an app" and "nobody recommended it".

**First audience:** Tashkent parents of 5–6-year-olds one year before first grade who already spend on preparation (tutor, courses) and pay subscriptions by card.
**Second audience (built via trust, not ads):** Uzbek-medium families, reached through kindergarten teachers and mothers' groups.

### 2. Positioning

1. **(Recommended)** For Tashkent parents a year before first grade, who worry "will my child learn, or just play?", Kiddo "Ready for First Grade" is the 10-minutes-a-day letters-and-numbers programme that shows every week what the child now knows, unlike cartoons and YouTube that show nothing.
   *Evidence:* "learn or just play" was the most repeated doubt; the weekly report + limit cut "need" passes 5 → 1 (`offer.md`).
2. For Uzbek-speaking families, Kiddo is the only voiced Uzbek-first school-readiness app, unlike English-only Khan Kids / Lingokids. *Evidence:* the competitor gap (`competitors.md`); but this segment bought 0 in the panel, so it is a second step.
3. For parents worried about screen time, Kiddo is the kids' app with a parent-set daily limit and no ads. *Evidence:* "values" passes 1 → 0; screen-time worry appeared in many answers, but as a hygiene factor, not the reason to buy.

### 3. Channels (budget is 0 so'm: `numbers.json` startup = 0)

| channel | why it fits | cost | it worked if |
|---|---|---|---|
| **Kindergarten teachers / private kindergartens** (pick 3–5 in Tashkent) | the #1 "what would flip a no" across both panels ("if the teacher recommended it") | time; free PRO for the teacher's group during the pilot | ≥1 teacher sends it to a parents' chat; trials from that chat |
| **Parents' Telegram groups** (kindergarten chats, Tashkent mums' channels) | where "trust" and "habit" buyers ask each other | time; no paid posts at budget 0 | trials with a per-group link (UTM/promo code) |
| **Instagram / TikTok short videos** (founder's own account) | shows the voice + the weekly report in 15 s | time | profile link clicks → trials |

**Not doing now:** paid ads (budget 0, CAC unknown), influencers (paid, and disclosures needed), Google Ads (low intent for "alifbo" queries is unverified), regional push (segment did not buy).

### 4. Ten hooks (each answers one panel objection)

1. "In 10 minutes a day — and every Sunday you see which letters your child learned." (learn or play)
2. "Free for 14 days. No card. See the first weekly report before you pay a so'm." (never paid for an app)
3. "You set the time limit. When it ends, the app stops." (screen time)
4. "Pay with Payme or Click — no foreign card." (card/billing)
5. "Not cartoons: a letters-and-numbers path for the year before first grade." (YouTube is free)
6. "Works with the tutor, not instead: the report shows what's sticking." (already pay a tutor)
7. "Uzbek, Russian, English — a real recorded voice for every letter." (quality of voice)
8. "Doesn't need the internet once it's downloaded on Wi-Fi." (slow internet — **web only until B2 shrinks the native download**)
9. "Not happy in 14 days after paying? Money back." (if it fails, I lose money)
10. "Ask your child's teacher — the kindergarten group can try it free." (nobody recommended it)

No panel quotes are used as testimonials; no "X parents trust us" until real numbers exist.

### 5. 30-day calendar (L = launch day, set in `/founder-launch`)

| day | channel | what goes out |
|---|---|---|
| L-14 | teachers | Visit/message 5 kindergartens: free PRO for their group during the pilot, ask for honest feedback |
| L-12 | Instagram/TikTok | Account up; first video: hook 7 (the voice) |
| L-10 | Telegram | Founder's intro post in 2–3 parents' groups (with admin's permission): what it is, hook 2 |
| L-8 | video | Hook 3 (time limit) — screen recording of the parent area |
| L-7 | teachers | Follow-up; 1–2 groups start using it |
| L-5 | video | Behind the scenes: recording the voice clips |
| L-3 | video | Hook 1 — a sample weekly report (demo child, labelled demo) |
| L-1 | Telegram | "Tomorrow on Google Play" + founding-family year price and its end date |
| L | all | Launch: store link, hook 2, founding-family price (ends L+60 per `pricing.md`) |
| L+1 | video | Hook 4 (Payme/Click) |
| L+3 | Telegram | Answer questions in groups; hook 6 for tutor-parents |
| L+5 | video | Hook 5 (not cartoons) |
| L+7 | teachers | First pilot report to the teachers; ask whether they'd mention it to parents |
| L+8 | video | The making of: how the weekly report is built |
| L+10 | Telegram | Hook 9 (money-back) |
| L+12 | video | Hook 8 (offline) |
| L+14 | all | First trials end: remind of the report; hook 1 |
| L+16 | review | Read the three numbers below; keep/kill channels |

Quiet days: a short clip of one letter's voice in each language, a behind-the-scenes of building a feature.

### 6. Budget and the numbers

- **Budget:** 0 so'm (founder's answer). All three channels are time-only. If money appears, test Telegram channel posts first, capped by the CAC below.
- **Most you can pay to win a customer:** contribution per subscriber-month **24,490** × panel first-month purchases **1.0** = **≈24,490 so'm** if you want payback in month 1. A yearly buyer is worth up to 238,990 − fees, but the share of yearly buyers is unknown (panel buyers chose monthly first) — so cap at ~24,000 until real retention is seen.
- **Watch weekly:**
  1. Trials started per channel — change something if a channel gives < 5 trials/week after 2 weeks.
  2. Trial → paid — if < 10% at L+30, the offer/report is not convincing; revisit `/founder-offer`.
  3. Week-2 activity (children still opening it on day 8–14) — if < 40%, the "tries then drops" problem is in the product, not the marketing.

### Rules check
No fake reviews, counts or "as seen on". Demo reports are labelled. Teacher partnerships: any free access given is disclosed if they post about it. Claims avoid promising results ("practises", not "will read"). Not legal advice.

## Brand

**Recommendation up front: keep the name Kiddo.** The app, the mascots, the ~16,000 voice clips ("Kiddo" is spoken in them), the store builds and the domain project already carry it; renaming has a large real cost and no evidence of benefit. The name work below is done as the skill requires, mainly to surface the **risk** in "Kiddo": it is a common English word, likely used by other apps — the trademark check matters more than the shortlist.

### 1. Name candidates

| name | style | says | out loud / on an icon | risk |
|---|---|---|---|---|
| **Kiddo** (current) | evocative EN | friendly, small child | easy in uz/ru/en; short on an icon | common word → crowded trademarks/handles |
| Kiddo Alifbo | descriptive | Kiddo + "alphabet" | clear to Uzbek parents | narrows to letters (numbers too) |
| Birinchi sinf | descriptive uz | "first grade" | strong for the offer | generic, not ownable |
| Harfcha | invented uz | "little letter" | cute, uz-only | hard for ru/en parents |
| Bukvochka | descriptive ru | "little letter" | ru-only | close to Russian "азбука" apps |
| Zehnli | evocative uz | "bright/clever" | nice sound | close to the founder's ZEHN project (confusion) |
| Tayyor | descriptive uz | "ready" | ties to "Ready for First Grade" | generic word |
| Alla | evocative | lullaby | warm | off-message (sleep) |
| Hojiakbar Kids | founder's name | personal | long | personal-brand dependence |
| Toshkent Kids | place | local | clear | excludes regions |

**Shortlist:** Kiddo (keep), Kiddo Alifbo (store-listing title variant), Tayyor (offer name only).
**No conflict** with names in `competitors.md` (Minni Kids, Mohir Panda, Olim bola, Ajoyib ALIFBO, GoKids, Lingokids, Khan Academy Kids, Duolingo ABC, Чудо малыш) — "Kiddo" vs "GoKids/Minni Kids" share "kid" but are distinct.

#### Checks you must run (I did not run them; public searches only, a trademark lawyer confirms; nothing is registered until you register it)
- **Uzbekistan:** Intellectual Property Agency (ima.uz) trademark database — classes **9** (downloadable software/apps), **41** (education), **42** (SaaS).
- **International (if stores abroad later):** WIPO Global Brand Database (branddb.wipo.int), EUIPO eSearch, USPTO search — same classes.
- **Domain:** check `kiddo.uz` (the project name suggests it is yours — confirm ownership/renewal date) and `.com` alternatives (`kiddo.app`, `getkiddo.uz`).
- **Handles:** Instagram, TikTok, Telegram, YouTube for `kiddo.uz` / `kiddo_uz`; "kiddo" alone is very likely taken.
- **Store search:** search "Kiddo" on Google Play and the App Store for same-category apps.

### 2. Promise, taglines, voice

**Promise:** *10 minutes a day, and every week you see what your child has learned.*

Taglines:
1. "Har kuni 10 daqiqa. Har hafta natija." (Every day 10 minutes. Every week a result.) — **recommended**
2. "Birinchi sinfga tayyor." (Ready for first grade.)
3. "Harflar ovoz bilan." (Letters with a voice.)

Voice:
| adjective | do | don't |
|---|---|---|
| Warm | talk to the parent like a kind kindergarten teacher | baby talk, exclamation storms |
| Clear | one claim per sentence, numbers where true ("10 minutes", "14 days") | vague "revolutionary learning" |
| Honest | say what's free, what's PRO, what it costs | promise reading/results; fake urgency |

Before (`pitch-v1.md`): "Kiddo — an app where a child aged 4-6 learns letters and numbers in Uzbek, Russian or English with a real recorded voice and a friendly mascot."
After: "10 minutes a day of letters and numbers — in Uzbek, Russian or English, in a real voice. Every Sunday you see what your child now knows."

### 3. The look (brief — based on the tokens already in `src/styles/index.css`, not new ones)

| colour | hex | job | contrast (computed) |
|---|---|---|---|
| Teal (primary) | `#13917e` | buttons, brand mark | white text on it **3.9:1 — passes AA only for large text (≥24px / 19px bold)**; for normal text use `#0c6b5d` (6.41:1) |
| Ink | `#3a2e4d` | text | on cream `#FFF8EC` **11.85:1** (AAA) |
| Nut gold (coin) | `#ffc93c` | rewards, highlights | ink on it **8.15:1** |
| Cream (background) | `#FFF8EC` | app/background, store art | teal-ink `#0f6e5f` text on it 5.82:1 |

(The app has other per-theme primaries — orange `#f2603c`, blue `#2f6fdb`; keep teal as the *brand* colour outside the app.)

**Type:** display "Kiddo Okina Display" / body "Kiddo Okina" (the app's own faces; **confirm their licence/source before using them in ads or print**), fallbacks Rubik and Nunito — both SIL Open Font License, Google Fonts.

**Logo brief:** the word "Kiddo" in the rounded display face + the mascot's head; must read at a **32px app icon** (mascot head alone), on a Telegram avatar (circle crop), on a printed kindergarten flyer. Avoid: letters-of-alphabet clichés (ABC blocks), anything resembling competitors' pandas/owls, gradients that fail at small sizes. I can draft concepts with an image tool if you want — they would be concepts, not a finished logo.

### 4. First five touchpoints
1. **Store listing / web home:** headline = tagline 1; first screenshot = a weekly report (demo, labelled); second = the time-limit setting; price and "14 days free, no card" visible, not hidden.
2. **"Packaging" = first launch:** the mascot greets in the chosen language; the parent sets the time limit before the child starts.
3. **Confirmation (trial start / payment via Payme/Click):** "Your 14 days started. The first report comes on <date>. You can cancel any time in the parent area." No surprise renewal.
4. **First social post:** the voice of one letter in three languages (hook 7).
5. **Reply to the first complaint:** thank, own it, say what changes and when; refund without argument within the 14-day guarantee.

Not legal advice on trademarks.

## Operations

No prices below were checked live in this run. Each one is marked **confirm**, with the official page where it can be checked. `numbers.json` was **not changed** because no real quote replaced an estimate. Once the Payme/Click contract rate and the store fees are confirmed, update `numbers.json` and re-run `/founder-cfo`.

### 1. The daily cycle (👁 = the customer sees it)

1. Morning: check the payment and trial dashboard (new trials, renewals, failed payments).
2. 👁 Answer parents' messages (Telegram/e-mail/store reviews), within the same day.
3. Check errors: crash/error log, failed voice loads, payment webhooks (`server/pay.ts`).
4. 👁 Weekly (Sunday): reports reach parents (`parent/weekly/weeklyReport.ts`). Spot-check that they were generated.
5. Content or product work (the B-stages in `docs/handoff/PLAN.md`).
6. 👁 Marketing slot (calendar in `marketing.md`): one post or one video.
7. Evening: the refunds queue (14-day guarantee) and cancellations.

### 2. Suppliers (they replace "variable" and hidden costs)

| input | options | price / how to get it | note |
|---|---|---|---|
| Payment acquiring | **Payme Business** (business.payme.uz), **Click** (click.uz, merchant) | Rate only by contract: **confirm** | Already integrated in `server/pay.ts`. The rate replaces the 2% ESTIMATE in `numbers.json`. |
| Store billing (if required) | Google Play Billing, Apple IAP | Service fee: **confirm** on play.google.com/console/about/programs and developer.apple.com/app-store/small-business-program | Store rules on outside payment links differ by store and country. **Check before relying on Payme/Click inside native apps.** |
| Store accounts | Google Play Console, Apple Developer Program | One-time Play fee; yearly Apple fee: **confirm** on the official pages | The founder said startup = 0, but these fees are unavoidable for store listing. |
| Hosting / API | current setup (Vercel per the project docs), plus Supabase code kept | Free tier today | ⚠ **Vercel's Hobby plan terms restrict commercial use. Check vercel.com/legal/fair-use and pricing before taking money.** That would add a fixed monthly cost. |
| Voice delivery | bundled in the app / CDN | 0 today | The native package carries ~215 MB (B2 will shrink it). |
| Lawyer | a local IT/privacy lawyer | quote only | privacy, terms, guarantee text (HUMAN_TODO) |

### 3. People

- **Now (slow first month):** the founder alone, ~1–2 h/day on support, payments and marketing, plus product work. No wage (founder's answer, so `fixed_monthly` = 0).
- **At ~300 subscribers (plan, `numbers.json`):** support becomes ~1 h/day. Consider a part-time moderator or teacher for the parents' groups. Wage: from the founder (not set). Payroll taxes need the accountant.

### 4. Routines (one page each)

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

### 5. Tools (the smallest stack)

- **Payments:** Payme + Click (already in code).
- **Store:** Google Play first (Codemagic builds ready), App Store second.
- **Support:** Telegram (a bot is planned, phases 56–57) plus e-mail.
- **Bookkeeping:** a spreadsheet until it is worth paying for software. The accountant sets the format.
- **Analytics:** **none from third parties.** The children's-store rules and the project's own decision ("no AD_ID, no third-party analytics") apply. Use only the in-house admin analytics.

### 6. Licences and compliance checklist (confirm each; rules change; not legal advice)

- [ ] Business registration: self-employed / individual entrepreneur / LLC. Option: IT Park residency (it-park.uz). Confirm which form allows receiving Payme/Click merchant payments.
- [ ] Tax registration and the treatment of digital subscriptions (soliq.uz).
- [ ] **Personal data:** Uzbekistan's personal-data law (lex.uz) includes **data-localization requirements for citizens' data**. Check where parents' and children's data is stored (Vercel/Supabase regions) before launch.
- [ ] Children's privacy and parental consent: Google Play Families policy and Apple Kids category (both already in `docs/reference/TADQIQOT.md`).
- [ ] Consumer terms: the trial, auto-renewal (if any), the refund guarantee.
- [ ] Trademark filing for "Kiddo" (`brand.md`).

### 7. Risk register

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

## Launch plan

**Target date: not given.** The plan uses **L = 2027-02-01** as a *placeholder*: the earliest date that leaves 9–10 weeks for the critical path below (the product stages B2–B9 in `docs/handoff/PLAN.md`, the lawyer, store review). Change it and shift every date with it.

### 1. Test before you spend: founding families (now, web only)

- **What:** a founding-family pre-sale on the existing web app (PWA). The first year costs **199,990 so'm** through Payme/Click, in place of the 238,990 list price (`pricing.md`). A **free 14-day trial** comes first, and the money-back guarantee applies.
- **Where:** the 3–5 kindergartens and 2–3 parents' Telegram groups from `marketing.md`, each with its own link.
- **When:** 2026-12-07 → 2026-12-20 (2 weeks).
- **Success line (written before the test):** **≥ 40 trials and ≥ 8 paid founding families** in 2 weeks, i.e. ≥ 20% trial → paid.
  - The panel said 25% (v2, an upper bound).
  - Below 10% means trust the real buyers: go back to `/founder-offer` (is the report convincing?) or `/founder-pricing` (test 14,990).
  - Fewer than 40 trials means the problem is reach, not the offer: `/founder-marketing`.
- **Needs first:** a working Payme/Click path on the web, a Free/PRO split, and the guarantee and terms text. ⚠ **Do not take money before the business registration and the lawyer-reviewed terms (critical path weeks 1–2).** If that can't be done by 12-07, run the test as a **waitlist with a stated price** (no money) and accept that the signal is weaker.

### 2. Countdown (owner: H = Hojiakbar, L = lawyer, A = accountant)

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

### 3. Launch-day run sheet (L = 2027-02-01, founder alone)

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

### 4. The first 30 days

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

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
