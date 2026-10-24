# Smart Quest & connected journey (Phase 18)

Kiddo's progression has one authority: the **progression engine** (Phase 14,
`domain/universe/progression`). Phase 18 adds a quest layer on top of it, not a second
engine and not a new store.

```text
Learning / exploration → domain event (activity.completed, building.upgraded…)
→ progression engine (pure `advance`) → world progress (stored once per child)
→ Smart Quest (pure `smartQuests`) → Home / Adventure Map / closed places
```

## Pieces

| Piece                      | File                                           | Role                                                                                                             |
| -------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Journey (main quest chain) | `progression/content.ts` `FIRST_FLIGHT`        | data: steps, conditions, route, icon, one reward                                                                 |
| Engine                     | `progression/engine.ts`                        | pure: conditions, steps in order, unlocks, growth, completion                                                    |
| World state                | `quests.ts` `worldState`                       | named lasting facts (rocket built, Mars open, seed found/planted, flower, lab, journey) from the stored progress |
| Quest state                | `quests.ts` `smartQuests`                      | derived: main quest = journey's current step; up to 2 optional practice quests                                   |
| Needs                      | `quests.ts` `conditionNeeds`, `useUnlockNeeds` | "2 more crystals" from the server price list, instead of "locked"                                                |
| Validation                 | `progression/validate.ts`                      | unknown refs, impossible stages/levels, invalid rewards, dependency cycles (tests)                               |
| Typed events               | `service.ts` `subscribeDomainEvents`           | typed listening for sound / Phase 19 mascots; listeners never change progression                                 |

World state (unlocked, discoveries, plots) and quest state (steps, completed) are kept apart:
quests are derived each time from the stored world; nothing permanent comes from a quest object.

## Smart Quest rules (deterministic, no AI)

- Main: the first journey step not yet done (engine order). Done journey → no main quest.
- Optional (≤ 2, never blocking): growing Mistake Garden plants, youngest stage first, one per
  learning area first, garden order otherwise — "Help your plant grow: <skill>" → the skill's
  practice route (registry). Same state → same quests (no reshuffling).
- Text by age band: 4–6 see the short title and what is missing; 7+ also the how-to line.

## Resources and rewards

Active resources stay those with a real journey use: star, crystal (3-star maths, daily quest,
journey reward), part (rocket), seed (Mars). No new currency. Every grant and spend goes through
the idempotent universe ledger (`resource|reason|refId`); the journey reward is paid once
(`journey|first-flight`); a double tap on "build" spends once. Server side (cloud mode): migration
0011 `world_rules` + `record_resource` check the same refs and prerequisites. Scale Crystal /
Shadow Prism are not added (future portals add a resource id and rules as data).

## Offline / server

Device mode (production today, Supabase not configured): everything works locally; the world
progress is per child in `kiddo.universe`; guests are never saved. Cloud mode: ledger entries are
queued and sent oldest-first; the server refuses duplicates and missing prerequisites; balances
derive from the ledger (0009), so a reconnect cannot pay twice. No schema change in Phase 18.

## Home

Order: homework (parent-assigned) → the main quest (journey card) → today's plan → daily quest
claim → "You can also" with at most two extras in all (a learning-section review, then garden
practice). Closed places (Mars, Science Lab) show what is still missing or how far the flower is.

## Not done in Phase 18 (honest gaps)

- "Reach Mars" and "Discover the seed" stay one journey step (the Mars page is where both happen).
- No visual rocket-building stages (the rocket is one upgrade level with its price shown).
- No new quest celebration or sound: existing rewards/toasts are used; `subscribeDomainEvents` is the
  hook for Phase 19 mascots and sound.
- No offline e2e test: everything is device-local today; cloud sync idempotency is covered by unit
  and SQL tests (ledger keys, server prerequisites).
- Quest history = the journey's `completed` map and journey step times (bounded by design: one
  entry per step). Replay of the journey is not offered; practice quests are always replayable and
  never pay anything.
- Daily quest unchanged (age plan, no streak, yesterday stays claimable).
