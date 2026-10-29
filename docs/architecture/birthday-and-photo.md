# Child profile: photo and birthday present (Phase 24)

## Photo (`features/profiles/photo.ts`)

- Optional, set in the parent's child form. Accepted only when the file says PNG, JPEG or WebP, is 1 byte–5 MB,
  starts with that format's own bytes (a renamed file is refused) and decodes as a picture.
- Made on the device into a 256 × 256 JPEG (centre crop) and stored in the profile (`ChildProfile.photo`). It is
  never synced (`childRow` lists its fields) and only our own `data:image/jpeg` URLs are ever shown
  (`isStoredPhoto`). `ChildAvatar` shows it instead of the robot.

## Birthday present (`features/birthday/birthday.ts`)

- In the birthday week (the birthday and the six days after; 29 February is the 28th in other years; a late
  December birthday reaches into January) the child gets **exactly 50 coins** and chooses **one pet** they do not
  have yet, once a year.
- One ledger entry carries the whole gift: `grantReward` reason `birthday`, ref `birthday|<year>|<pet>` (or
  `birthday|<year>` when every pet is owned). The party is due only when neither the profile
  (`ChildProfile.birthdayGifts`) nor the ledger has that year, so a lost profile write never brings a second gift
  or pet; `giftPet` adds the pet from the ledger (no coins, never twice). Other children are never touched.
- The week is counted in Tashkent time (`tashkentDay`), like the server.
- The party (`BirthdayCelebration`, on Home) waits for the new-age unlock party; the present button stays off
  until a pet is chosen (when every pet is owned, only the coins).
- Server: migration `0014_birthday_no_age_ceiling.sql` lets `record_reward` take reason `birthday` only as
  exactly 50 coins, for the parent's own child, from a day before to thirteen days after the birthday (Tashkent
  time; a claim made offline syncs later), a pet only if the shop has it, and one row a year whatever pet is
  asked again; `owns_item` counts that pet as owned, so `child_state` keeps it (SQL tests in
  `supabase/tests/rls_test.sql`).
- Known limit: `birthdayGifts` lives on the device. A second device of the same family offers the party again;
  its claim adds the coins and the pet only on that device, and the server keeps the year's first gift. The same migration removes the old maximum age (25)
  of synced profiles (Phase 22: no maximum age). The owner applies it; nothing is applied to production here.

Tests: `features/birthday/birthday.test.tsx`, `features/profiles/photo.test.ts`, `e2e/birthday.spec.ts`.
E2E profiles of other specs are born a month before today, so the party does not cover their screens.
