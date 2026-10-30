# Stickers, medals and prestige (Phase 30)

- **Two medal collections**, one engine (`src/domain/universe/achievements.ts`, recorded by
  `checkAchievements`, coins once through the rewards ledger, `achievement.reached` event):
  - _Effort medals_ (`collection: 'classic'`): runs, stars, crystals, tales, days, runs per strand.
  - _Star Paths_ (`collection: 'stars'`): how far learning climbed. `pathValue` =
    `StrandState.climbed`: the height (level, plus mastery steps at level 5) a counted run promoted
    the strand to, only above `peak` (the highest height it ever held, the age prior or placement
    start included), so a start, or dropping on purpose and climbing back, pays nothing. Spark =
    level 4, Star = level 5, Constellation = two mastery steps; "Many paths" counts strands climbed
    to level 4. Easy practice never passes level 3 (evidence policy), so only assessment earns them.
    Tiers stay when a strand later drops; old saves have no `climbed`, so there is no backfill burst.
- **Prestige** (`features/collection/MedalBadge.tsx`): every tier has its own silhouette and
  detail — classic: disc → scalloped medal with ribbons → star-burst with laurels, gems, glow and
  shimmer; Star Paths: night tile → tile with an orbit → constellation with glow and twinkle.
  Animation stops under `prefers-reduced-motion`.
- **Kiddo Universe stickers** (`domain/universe/stickers.ts`): 12 drawn stickers
  (`features/collection/stickerDrawings.tsx`), each opened by one medal tier. Derived from the
  recorded tiers: no state, no randomness, nothing to buy, idempotent and per child. The
  Collection previews locked ones as a silhouette with the medal step that opens them; the result
  screen announces a sticker opened by a new medal (`AwardLines`).
- The parent's task-sticker album (`features/stickers`, one per finished task) is unchanged.
