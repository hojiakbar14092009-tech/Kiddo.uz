# Yong‘oq (nuts): one currency for children (Phase 39)

Children had five things to count: coins, stars, crystals, parts and scrolls.
Since Phase 39 they count two:

- **Yong‘oq (nuts)**: the one currency. It is the reward ledger's coins
  (`grantReward` / `spendCoins`, the balance in `progressStore.coins`), so the
  shop, the PRO gift, the birthday gift and the parent's take-away all work as
  before, under a new name and a hazelnut picture (`CoinIcon`, `ResourceIcon`
  'nut').
- **Stars**: a measure (1–3 per run, never spent), unchanged.

Seeds and keys stay items of the connected world.

## The rate

`src/domain/universe/nuts.ts`: crystal = 10 nuts, part = 5, scroll = 5.

- What used to pay a crystal, a part or a scroll pays nuts instead, in the same
  place (`record()` in `domain/universe/store.ts`, the one choke point): reason
  `quest` for quests and journeys, `learn` otherwise; ref
  `<resource>|<reason>|<ref>`, so every old once-only rule stays once-only.
- A building level costs its `building_costs` at the same rate: 10 / 20 / 30,
  workshops (two parts more per level) 15 / 30 / 45. It is paid with
  `spendCoins`, ref `upgrade|<building>|<level>`.
- What a child already held is converted once (`convertToNuts`, run by
  `app/NutConversion` when a child opens): the resources are spent with reason
  `conversion`, ref `conversion|v1`, then the nuts are granted with reward
  reason `conversion`, the same ref.

## The server (migration 0017)

- `record_resource` accepts the conversion's spends (crystal, part, scroll;
  negative; ref `conversion|v1`), clamped to what the server holds.
- `record_reward` accepts `conversion` (at most the converted resources' worth,
  once, not capped daily) and checks a `purchase` of `upgrade|b|l` against
  `building_nut_price(b, l)`.
- `record_building_level` accepts a level paid either way: in nuts (the
  purchase row) or, as before, in resources.
- The Mars seed's rule needs the rocket's upgrade: a rocket paid in nuts counts.
- Old devices that still send crystals keep working: every earlier rule stays.

A first sync of an account replays each nut-paid level's payment right before
the level, and the opening balance includes those nuts (they are taken again by
the replayed payments).

Known limit: the reward history keeps the newest 1000 entries, so on a very
old device an early upgrade payment may be trimmed before the first sync; that
level is then refused by the server (`not_paid`) and stays only on the device.
