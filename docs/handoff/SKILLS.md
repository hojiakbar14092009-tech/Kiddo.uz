# Skill, connector va subagent inventari (B0, 2026-11-24)

Manba: sessiyadagi skill ro'yxati (faqat nom va tavsif o'qildi). Ko'pligi sababli guruh bo'yicha.

## Mavjud (guruhlar)
- Jarayon: `superpowers:*` (writing-plans, executing-plans, dispatching-parallel-agents, subagent-driven-development, systematic-debugging, test-driven-development, verification-before-completion, requesting-code-review), `ponytail:*`.
- Kod sifati: `mattpocock-skills:*` (diagnosing-bugs, code-review, tdd), `zizi-skills:*` (code-quality, security-and-hardening, database-optimization, i18n, app-store, handoff), `one-shot-prompting:*` (perf-audit, ship-check), `ecc:*` (react-review, typescript-reviewer, e2e, security-review), `code-review`, `simplify`.
- UI/UX: `vectorlab-ux-skills:*` (ux-audit, motion, loaders, errors, empty-states, viewports, reduced-motion), `design-skills:accessibility-audit`, `frontend-design`, `vercel-react-best-practices`.
- Media: `remotion:*`, `anthropic-skills:ffmpeg-media`, `hyperframes:*`.
- Connectorlar: Playwright MCP (`plugin_playwright`), Chrome DevTools MCP, Vercel MCP, Figma MCP, Firecrawl (veb). Ulanmagan: context7, prisma-local, voicestudio.
- Subagent turlari: general-purpose, Explore, Plan, ecc:* reviewerlar, ecc:e2e-runner, ecc:performance-optimizer.
- TAQIQLANGAN (5-bo'lim): `pge-god`, `pge-idontcaretokenanymore`, `evaluator-godmode` va boshqa "cheksiz" orkestratorlar.

## Bosqich: skill: nima uchun
- Hamma bosqich: `ponytail:ponytail`: kamroq kod, sifat tushmasin (majburiy, subagentlarga ham).
- Hamma bosqich: `superpowers:writing-plans`: bosqich rejasi; `superpowers:verification-before-completion`: "tayyor" deyishdan oldin dalil.
- B0: `superpowers:dispatching-parallel-agents`: ZEHN, xarita, rasmiy talablar parallel.
- B1: `superpowers:systematic-debugging`, `mattpocock-skills:diagnosing-bugs`: flaky/timeout testlarning ildiz sababi; `ecc:e2e-testing`: Playwright.
- B2: `superpowers:test-driven-development`: kesh kaliti, normalizatsiya, zaxira zanjiri; `zizi-skills:security-and-hardening`: TTS endpoint suiiste'mol himoyasi; `zizi-skills:i18n`.
- B3: `zizi-skills:i18n`, `vectorlab-ux-skills:loaders`/`errors`: ovoz yuklanishi va xato holati; `superpowers:subagent-driven-development`.
- B4: `remotion:remotion-best-practices` va `remotion:*`, `anthropic-skills:ffmpeg-media`, `design-skills:accessibility-audit` (kontrast).
- B5: `one-shot-prompting:perf-audit`, `zizi-skills:database-optimization`, `vercel-react-best-practices`.
- B6: `zizi-skills:code-quality`, `simplify`, `mattpocock-skills:code-review`.
- B7: `zizi-skills:app-store`, `vectorlab-ux-skills:viewports`, `design-skills:accessibility-audit`.
- B8: `one-shot-prompting:ship-check`, `superpowers:requesting-code-review`.
- B9: `zizi-skills:app-store`, `vectorlab-ux-skills:ux-audit`, Playwright MCP.

## B0 da haqiqatan chaqirilganlar
`ponytail:ponytail` (foydalanuvchi buyrug'i bilan), `superpowers:dispatching-parallel-agents`, `superpowers:writing-plans`, `superpowers:verification-before-completion`. Subagentlarga `ponytail:ponytail` buyurildi.
