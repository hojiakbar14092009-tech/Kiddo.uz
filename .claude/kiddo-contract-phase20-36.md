# KIDDO.UZ
# PHASE 20–36
# RESTORED SOURCE-OF-TRUTH
# IDEAL MASTER ULTRA MEGA PRO MAX EXECUTION PROMPT

You are continuing development of the existing **Kiddo.uz** production project.

This document is now the **authoritative source-of-truth contract for Phases 20–36**.

It replaces any shortened, reconstructed, guessed, conversation-compacted, phase-name-derived, or incomplete summary that may currently exist in your context.

If previous conversation context conflicts with this contract:

> THIS CONTRACT WINS

except where the current repository clearly proves that a requirement has already been implemented correctly and verified.

---

# 0. PRIMARY MISSION

Continue Kiddo.uz from its current real repository state and complete the remaining work in **Phases 20 through 36** with:

- production-grade engineering
- premium UI/UX
- strong educational quality
- child-safe interaction design
- clean architecture
- high performance
- excellent mobile/tablet/desktop responsiveness
- deterministic behavior
- robust testing
- strong accessibility
- proper localization
- zero Critical issues
- zero High issues

Do not rebuild completed working systems.

Do not reset the project.

Do not create duplicate architectures.

Do not simplify requirements merely to finish faster.

Do not sacrifice visual quality, technical quality, educational quality, UX quality, performance, accessibility, safety, or maintainability to save tokens.

---

# 1. CRITICAL RESTORATION RULE

Earlier conversation compaction may have removed portions of this contract.

From this point onward:

**NEVER reconstruct a Phase merely from its Phase name.**

Use this prompt as the full contract.

If a Phase appears to have already been implemented:

1. inspect repository evidence
2. inspect Git history
3. inspect tests
4. inspect `.claude/kiddo-project-state.md`
5. inspect relevant implementation
6. compare it against THIS contract
7. identify only missing requirements
8. implement only the gaps
9. verify
10. continue

Use:

> VERIFY → GAP ANALYSIS → PATCH ONLY GAPS → TEST → CRITIC → FIX → CHECKPOINT → CONTINUE

Do not redo completed work.

---

# 2. CURRENT-STATE HINTS — VERIFY, DO NOT BLINDLY TRUST

Previous execution reports indicate that some phases may already have been completed, including approximately:

- Phase 20
- Phase 27
- Phase 28
- Phase 29

Phase 30 may be the next active phase.

Previous reports mentioned possible commits such as:

- Phase 20: `58e7a7b`
- Phase 27: `0434efa`
- Phase 28: `87f2ba5`
- Phase 29: `f458a2b`

These are **hints only**.

Git is authoritative.

Do not trust old chat commit hashes without checking:

```bash
git status
git log --oneline --decorate -30
git show <commit>
```

Also inspect:

```text
.claude/kiddo-project-state.md
```

If repository evidence shows Phase 21–26 have also been completed, verify them against this contract rather than rebuilding them.

---

# 3. FIRST ACTION — RECOVER PROJECT TRUTH

Before changing code:

## 3.1 Read project state

Read:

```text
.claude/kiddo-project-state.md
```

Then inspect:

```bash
git status
git diff
git branch --show-current
git log --oneline --decorate -30
```

Determine:

- current active Phase
- completed Phases
- partially completed Phases
- uncommitted work
- current architecture
- known blockers
- known regressions
- current test state

---

# 4. SKILLS / PLUGINS / MCP — REQUIRED LIMIT-SAVING STRATEGY

Before manually exploring large portions of the repository, inspect the **Skills / Plugins / MCP / specialized tools available in the current Claude environment**.

Use them intelligently.

This is mandatory.

Examples may include:

- Ponytail
- repository/code navigation skills
- Git skills
- browser automation
- test automation
- visual inspection
- Supabase tools
- database tools
- Critic/review skills
- frontend/UI skills
- performance profiling
- accessibility tooling
- screenshot tooling
- task/subagent orchestration

## 4.1 Ponytail rule

If **Ponytail** is installed:

1. read its actual skill description first
2. understand what it officially supports
3. use it only for tasks it is designed to perform
4. use it where it reduces context usage, repetitive exploration, tool calls, or implementation overhead
5. never invent capabilities that Ponytail does not actually have

If Ponytail is not installed, use the closest available equivalent.

Do not stop because a specific plugin is unavailable.

---

# 5. SKILL-FIRST EXECUTION RULE

Before doing a task manually, ask:

> Is there an installed Skill / Plugin / MCP tool that can perform this task more efficiently and with less context?

If yes, use it.

But:

> DO NOT use plugins merely because they exist.

Every plugin call must improve at least one of:

- speed
- token efficiency
- accuracy
- verification
- code navigation
- automated testing
- visual verification
- architectural safety

Avoid duplicate tool usage.

Example:

If one repository-navigation skill can locate all references to a component, do not manually open 30 files.

If browser automation can verify a responsive flow, do not repeatedly inspect screenshots manually.

If a testing skill can run a targeted suite, do not run the full test suite after every tiny edit.

---

# 6. CONTEXT / TOKEN LIMIT OPTIMIZATION

Saving limits means **working more intelligently**, not producing lower-quality work.

## NEVER save tokens by:

- removing requirements
- skipping tests
- weakening UI
- skipping responsive work
- skipping accessibility
- removing animation quality
- ignoring edge cases
- leaving TODOs
- using placeholders
- reducing 3D quality unnecessarily
- removing localization
- disabling existing systems
- ignoring Critic findings

Instead save limits through engineering discipline.

---

# 7. ULTRA-EFFICIENT REPOSITORY READING

Do not repeatedly reread the entire repository.

For every Phase:

## Step A — Identify relevant modules

Search by:

- route
- component name
- domain
- store
- service
- test
- schema
- feature key

## Step B — Build a tiny Phase map

Keep an internal list:

```text
Relevant architecture:
- file A
- file B
- service C
- store D
- tests E
```

## Step C — Read only required files

Expand outward only when dependencies require it.

## Step D — Write discoveries to project-state

Do not rediscover the same architecture in later Phases.

---

# 8. NO REPEATED AUDITS

Never perform the same broad audit multiple times unless new changes invalidate it.

Examples:

If profile persistence architecture is understood in Phase 24, do not rediscover it in Phase 31.

If mascot architecture is understood in Phase 26, reuse that understanding later.

If rewards architecture is verified once, reuse it.

Store important findings in:

```text
.claude/kiddo-project-state.md
```

---

# 9. TESTING STRATEGY — FAST WITHOUT QUALITY LOSS

Do not run every test after every tiny change.

Use this hierarchy.

## During implementation

Run:

- affected unit tests
- affected component tests
- affected integration tests

## At Phase exit

Run:

- relevant complete domain test suite
- typecheck
- lint
- formatting check
- relevant browser/E2E tests

## Full regression

Run full repository regression when:

- cross-cutting architecture changed
- shared stores changed
- routing changed
- persistence changed
- reward architecture changed
- authentication/security changed
- a major 3D/runtime system changed
- before final Phase 36 completion

Do not run a 180-test browser suite repeatedly when 2 focused tests can safely validate a local change.

---

# 10. PARALLELIZATION

Where the environment safely supports parallel independent work, parallelize:

- browser verification
- independent Critic review
- test execution
- static analysis
- documentation update

Do not duplicate the same investigation in multiple agents.

Use normally no more than **2–3 focused subagents simultaneously**.

Each subagent must have a narrow responsibility.

Bad:

> “Review entire Kiddo project.”

Good:

> “Review only birthday reward idempotency and multi-child isolation.”

---

# 11. SUBAGENT OUTPUT COMPRESSION

Subagents must return concise structured findings:

```text
Critical:
High:
Medium:
Files:
Recommended fixes:
```

Do not allow large narrative dumps into the main context unless necessary.

---

# 12. CORE ARCHITECTURAL LAW

Use:

- Clean Code
- Clean Architecture
- reusable components
- typed domain contracts
- centralized configuration
- deterministic rules
- isolated domain logic
- testable pure functions where possible

Avoid:

- giant React components
- magic strings
- duplicated stores
- duplicated registries
- uncontrolled localStorage
- duplicated reward logic
- duplicated audio engines
- duplicated mascot controllers
- excessive prop drilling
- hidden side effects
- circular dependencies
- uncontrolled event listeners
- abandoned subscriptions
- leaked Three.js resources

---

# 13. NEVER CREATE PARALLEL SYSTEMS

Do not create things like:

```text
rewardStoreNew
rewardStoreV2
newAudioSystem
newMascotController
newProgressManager
newHomeworkSystem
```

when an equivalent architecture already exists.

Instead:

1. inspect existing architecture
2. extend it
3. refactor carefully if required
4. preserve compatibility
5. migrate deliberately

---

# 14. REWARD SAFETY

Every value-changing reward must be idempotent.

Examples:

- birthday coins
- birthday pet
- stickers
- medals
- world upgrade rewards
- homework rewards
- mastery rewards

A refresh, retry, rerender, duplicate event, route revisit, or network retry must not duplicate rewards.

Use deterministic reward identities.

Example concept:

```text
birthday:{childId}:{birthdayYear}
```

---

# 15. MULTI-CHILD ISOLATION

Kiddo supports multiple child profiles.

Any child-specific feature must be correctly isolated by child.

Never allow:

- Child A progress appearing for Child B
- Child A homework modifying Child B
- Child A onboarding affecting Child B
- Child A birthday reward reaching Child B
- Child A mascot state leaking to Child B
- Child A world progression showing for Child B

Test profile switching.

---

# 16. AI POLICY

AI remains OFF.

Do not activate:

- Gemini
- OpenAI
- Claude API
- OpenRouter
- external LLM runtime

unless explicitly approved later.

Existing provider abstractions may remain.

Do not destroy future AI architecture.

---

# 17. AGE POLICY

Kiddo has **no hard maximum age**.

Do not restore an 18-year cap.

Use broad adaptive profiles:

```text
3–4
5–6
7–9
10–12
13–15
16+
```

These are adaptation bands.

They are not access restrictions.

---

# 18. EDUCATIONAL LAW

Kiddo must follow:

> TEACH → GUIDE → PRACTICE → ASSESS → MASTER

Do not create:

> QUIZ → FAIL → EXPLAIN

unless the learner has already encountered the teaching material.

Whenever a quiz requires knowledge that was never introduced, route the learner through teaching first.

---

# 19. CHILD EMOTIONAL SAFETY

Never use:

- shame
- humiliation
- “you are bad”
- punitive streak loss
- threatening countdowns
- aggressive failure sounds
- disappointment animation
- manipulative scarcity
- dark patterns

Incorrect answers should trigger:

- thinking
- encouragement
- hints
- explanation
- retry

not punishment.

---

# 20. LOCALIZATION

All child-facing and parent-facing UI must support:

- Uzbek
- Russian
- English

Do not leave raw translation keys.

Do not hardcode visible text where the app uses localization.

Test longer Russian strings.

---

# 21. RESPONSIVE TARGETS

Test key screens at minimum:

```text
320 × 568
360 × 800
393 × 852
852 × 393
768 × 1024
834 × 1194
1024 × 768
1440 × 900
1920 × 1080
```

Requirements:

- no accidental horizontal scroll
- no hidden buttons
- no clipped text
- no overlapping controls
- no broken modal
- no 3D model hidden behind panels
- no unreachable primary action

---

# 22. ACCESSIBILITY

Maintain:

- semantic controls
- keyboard support
- focus-visible
- screen-reader labels
- sufficient contrast
- 44×44 minimum touch targets
- zoom support
- reduced motion
- accessible alternatives where drag/3D interactions require them

Test:

```text
100%
150%
200%
```

text scaling where applicable.

---

# 23. PERFORMANCE LAW

Do not solve features by adding permanent rendering cost.

Use:

- lazy loading
- route splitting
- shared assets
- resource reuse
- offscreen pause
- visibility pause
- quality tiers
- DPR control
- reduced shadows
- cleanup
- appropriate LOD
- event listener cleanup
- Three.js disposal

Do not run unnecessary continuous RAF loops.

---

# 24. PHASE EXECUTION LOOP

For every Phase:

```text
1. RESTORE CONTEXT
2. VERIFY EXISTING IMPLEMENTATION
3. IDENTIFY GAPS
4. IMPLEMENT ONLY GAPS
5. HANDLE EDGE CASES
6. RUN TARGETED TESTS
7. RUN REQUIRED E2E
8. RUN CRITIC
9. FIX CRITICAL/HIGH
10. FIX USEFUL MEDIUM FINDINGS
11. VERIFY EXIT GATE
12. UPDATE PROJECT STATE
13. COMMIT
14. PUSH IF CURRENT PROJECT WORKFLOW REQUIRES IT
15. SEND SHORT USER UPDATE
16. IMMEDIATELY START NEXT PHASE
```

---

# 25. NEVER STOP BETWEEN PHASES

A completed Phase is NOT a stopping point.

After completing a Phase:

send a short update to the user and immediately continue.

Do NOT ask:

- “Should I continue?”
- “Would you like me to start Phase 31?”
- “Can I proceed?”
- “Do you want me to implement the next Phase?”

The execution state remains:

```text
ACTIVE
```

until Phase 36 is complete or a genuine external blocker prevents further safe work.

---

# 26. SHORT PHASE UPDATE FORMAT

After each Phase send something similar to:

```text
✅ PHASE XX — <name> YAKUNLANDI

Qisqacha:
- ...
- ...
- ...

Tekshiruv:
- tests ...
- E2E ...
- Critic: Critical 0 / High 0
- commit: <actual hash after commit succeeds>

➡️ PHASE XX+1 boshlandi.
```

Keep these updates concise.

Do not write long reports after every Phase.

The comprehensive report belongs to Phase 36.

---

# 27. COMMIT HASH RULE

Never announce a commit hash before the commit command actually returns the real hash.

Sequence:

```text
commit succeeds
→ read actual hash
→ then report it
```

Never guess.

---

# 28. PHASE EXIT GATE

A Phase cannot be called complete if:

```text
Critical > 0
OR
High > 0
OR
required tests fail
OR
major browser flow is unverified
OR
the implementation violates this contract
```

Medium issues:

fix when they materially improve:

- correctness
- UX
- accessibility
- localization
- performance
- maintainability

---

# ================================================================
# PHASE 20
# DEMO EXPERIENCE + ADMIN + PRO VISIBILITY CONTROL
# ================================================================

## Goal

Create a safe, intentional Kiddo demo environment without destroying future production subscription architecture.

### Central demo configuration

Use an existing configuration layer or create a clean centralized config.

Conceptually support:

```text
demoMode
publicProUIEnabled
demoAdminEnabled
```

Avoid scattered environment checks.

---

## Demo Admin

`/admin` must intentionally support demo administration.

The demo entry may offer:

> Demo administrator sifatida kirish

Demo Admin is not production authentication.

Demo behavior must never silently become a production auth bypass.

---

## Demo Admin may manage safe demo data

Examples:

- overview
- child demo profiles
- local activity
- homework demo state
- reward visibility
- promo codes
- demo Pro simulation
- safe statistics
- reset demo state

Do not expose real production secrets.

---

## Public Pro visibility

During demo mode:

hide public:

- payment CTA
- pricing
- tariff marketing
- payment provider flow

But preserve:

- entitlement architecture
- subscription architecture
- future payment architecture
- Pro-aware feature architecture

Do not delete these systems.

---

## Demo Pro simulation

Admin/dev-side demo Pro unlock is allowed.

No real payment is required.

---

## Promo Codes

Create exactly **10 unique deterministic demo promo codes**.

They must support tests for:

- valid
- invalid
- already used
- expired if expiration exists
- case normalization
- whitespace normalization

Do not create random unstable codes every reload.

---

## Voice / TTS

Voice/TTS should remain free in demo.

Do not add a demo Pro gate to it.

Reuse the existing audio architecture.

---

## Demo indicator

Use a subtle indicator such as:

> Demo boshqaruv rejimi

Do not make it intrusive.

---

## Required review

Critic roles:

- Security
- Demo UX
- Product architecture

---

# ================================================================
# PHASE 21
# LEARN BEFORE PLAY — COMPLETE LEARNING SYSTEM
# ================================================================

## Goal

Ensure Kiddo actually teaches before assessing.

Create or extend a centralized lesson architecture.

Conceptual contract:

```ts
LessonDefinition {
  id
  domain
  topic
  title
  objectives
  prerequisites
  ageProfile
  masteryRequirements
  steps
  visuals
  narration
  guidedPractice
  independentPractice
  assessment
  completion
}
```

Use existing types if equivalent.

Do not duplicate an existing lesson system.

---

## Learning hierarchy

Use:

```text
Subject
→ Topic
→ Level
→ Lesson
→ Guided Practice
→ Independent Practice
→ Assessment
→ Mastery
```

---

## Reusable lesson steps

Create reusable step types rather than custom-coded one-off lesson pages.

Potential examples:

- explain
- show
- listen
- compare
- trace
- manipulate
- guided-choice
- guided-practice
- independent-practice
- review
- assessment

---

## Important completion rule

Opening a lesson does NOT automatically equal completing a lesson.

Completion must follow meaningful learner interaction.

---

## Prerequisite routing

If a learner attempts content whose prerequisite is not learned:

route into teaching first.

Do not simply disable everything without explanation.

---

## Math

Young learners:

```text
concrete objects
→ quantity
→ number
→ operation
```

Older learners:

more symbolic reasoning.

---

## Alphabet

Teach:

- shape
- uppercase/lowercase
- sound
- example
- tracing

before recognition assessment.

---

## Writing

Progress:

```text
lines
→ curves
→ letters
→ words
→ phrases
→ sentences
```

---

## Vocabulary

Teach:

- context
- pronunciation
- meaning
- example
- recognition
- recall

---

## Space

Before quiz:

teach:

- Sun
- planet order
- appearance
- key facts
- comparisons

---

## Dinosaurs

Before quiz:

teach:

- species
- appearance
- diet
- defining feature
- habitat
- era

---

## Uzbekistan

Use progression:

```text
labeled map
→ tap region
→ spoken name
→ short fact
→ guided recognition
→ partial labels
→ unlabeled assessment
```

---

## Stories

Use:

```text
read/listen
→ vocabulary
→ comprehension
→ reasoning
```

---

## Garden / Science

Use:

```text
phenomenon
→ explanation
→ manipulate
→ predict
→ observe
→ answer
```

---

## Audit

Search all child learning routes for:

> quiz-before-teaching

Fix them.

---

## TTS

Reuse central TTS.

Do not create another narration system.

---

## Critic

Use:

- Educational Design
- Early Childhood Learning
- Older Learner Learning
- UX

---

# ================================================================
# PHASE 22
# INFINITE AGE + MASTERY ADAPTIVE LEARNING ENGINE
# ================================================================

## Goal

Remove rigid age ceilings and make Kiddo adapt through age + mastery.

---

## DOB as source of truth

Where DOB exists, use it consistently.

Age calculation must be deterministic.

Handle:

- leap years
- timezone boundaries
- birthday rollover

Do not store inconsistent derived age values everywhere.

---

## Adaptive inputs

Adaptation should consider:

- age profile
- mastery
- recent accuracy
- hint dependency
- independent success
- review need

---

## Single resolver

Centralize adaptation in an `AdaptiveResolver` or equivalent existing architecture.

Avoid:

```ts
if (age === 5)
if (age === 6)
if (age === 7)
```

spread across many components.

---

## Avoid difficulty oscillation

Do not make difficulty jump up/down after every single answer.

Use sufficient evidence.

---

## Age profiles

### 3–4

- high visual support
- short activities
- concrete concepts
- voice support
- large targets

### 5–6

- counting
- simple arithmetic
- phonics
- tracing
- basic science

### 7–9

- larger numbers
- multiplication foundations
- spelling
- reading
- geography
- classification

### 10–12

- fractions
- geometry
- structured reasoning
- deeper science
- extended writing

### 13–15

- abstraction
- deeper science
- complex reading
- more mature presentation

### 16+

- deeper learning
- mature presentation
- no artificial upper cap
- no preschool-like visual treatment

---

## Mastery can override age cognitively

A strong 6-year-old may progress further.

A beginner 14-year-old should receive foundational instruction without being visually treated like a preschooler.

Separate:

```text
cognitive difficulty
```

from:

```text
visual maturity
```

---

## Older new users

Do not force older new learners through every preschool activity.

Use deterministic calibration.

No external AI required.

---

## Birthday change

When age band changes:

preserve:

- mastery
- history
- rewards
- completed lessons
- homework
- achievements

Do not reset learning.

---

## Domains to cover

At minimum:

- Math
- Alphabet
- Writing
- Vocabulary
- Stories
- Space
- Dinosaurs
- Uzbekistan
- Garden
- Science
- puzzles
- Scale Portal
- Shadow Lab

---

## Required tests

Representative profiles:

```text
age 4
age 6 strong
age 8
age 11
age 14 new
age 17 experienced
```

---

# ================================================================
# PHASE 23
# PARENT CENTER 2.0 + ADVANCED HOMEWORK
# ================================================================

## Goal

Make Parent Center genuinely useful.

The first view should answer:

- What is my child learning?
- What are they practicing?
- What needs more practice?
- What homework is assigned?
- What recently improved?

---

## Sections

Use clear parent-friendly sections such as:

```text
Farzandim
Bugungi holat
O‘rganayotgan mavzular
Kuchayib borayotgan ko‘nikmalar
Mashq kerak
Uyga vazifalar
Yutuqlar
Faoliyat tarixi
```

---

## Presentation

Prefer:

- cards
- progress summaries
- trends
- clear descriptions

Avoid raw internal tables.

Never expose:

```text
skill_key
mastery_score
internal IDs
```

directly.

---

## Language

Use positive parent-facing language.

Do not label a child as:

- weak
- bad
- poor
- failing

---

## Homework Registry

Create or extend one central registry based on real Kiddo activities.

Categories may include:

- Math
- Alphabet
- Writing
- Vocabulary
- Space
- Planets
- Dinosaurs
- Uzbekistan
- Reading
- Stories
- Garden
- Science

Do not create fake homework that points nowhere.

---

## Planet homework flow

Example:

```text
lesson
→ explore
→ guided practice
→ independent practice
→ assessment
→ complete
```

---

## Letter homework

Support specific:

- letter
- letter group
- tracing
- recognition
- pronunciation

---

## Homework statuses

Use:

```text
Assigned
Started
Completed
Needs more practice
```

---

## Results

Parent should see useful completion information.

Reward integration must be idempotent.

---

## Required E2E

Test:

```text
Parent
→ Child A
→ assign planet homework
→ Child A completes it
→ parent sees completion
→ switch Child B
→ Child B remains unaffected
```

---

# ================================================================
# PHASE 24
# CHILD PROFILE + BIRTHDAY + GROWING SYSTEM
# ================================================================

## Profile image

One profile image per child.

Allow image only.

Reject:

- video
- audio
- executable
- renamed arbitrary file
- unsupported document

Validate:

- MIME
- extension
- actual image decode
- size
- dimensions

Support where reasonable:

- preview
- crop
- reposition
- replace
- remove

Reuse existing storage abstraction.

---

## Birthday system

DOB must remain consistent.

Birthday detection must be deterministic.

Handle:

- timezone
- leap-year birthdays
- multiple children

---

## Birthday celebration

Create a premium, tasteful celebration.

Not excessive.

No casino feel.

---

## Birthday reward

Exactly:

```text
+50 coins
+
1 eligible pet chosen by the child
```

Use a curated eligible pet set.

Reuse the existing pet registry.

Do not create a birthday-only pet registry.

---

## Idempotency

Birthday reward identity concept:

```text
childId + birthdayYear
```

Never award twice.

---

## Grace period

If the child does not open Kiddo exactly on the birthday, allow a reasonable deterministic grace behavior.

Do not permanently lose the celebration merely because the child was absent.

---

# ================================================================
# PHASE 25
# INTERACTIVE ONBOARDING + GUIDED DISCOVERY
# ================================================================

## Goal

Teach Kiddo by interacting with the real UI.

Do not create a long static tutorial manual.

Use contextual:

- spotlight
- arrow
- tooltip
- mascot
- next
- back
- skip
- replay

---

## First-time essentials

Introduce:

- Home
- learning cards
- opening a lesson
- answering
- back navigation
- rewards
- homework

---

## Frequency

Suggested behavior:

```text
first time = full
second time = minimal
later = none
```

Save per profile.

---

## Replay

Parent/child should be able to replay from Settings/Help.

---

## Rules

Onboarding must:

- be skippable
- never trap the user
- never block critical navigation
- adapt to viewport
- support keyboard
- support reduced motion

---

## Age adaptation

Young child:

- more visual
- more mascot
- more voice

Older learner:

- concise
- mature
- less childish

Reuse the existing mascot system.

---

# ================================================================
# PHASE 26
# LIVING MASCOTS + EMOTION INTEGRATION
# ================================================================

## Critical rule

Phase 19 created true 3D mascots.

Do NOT regress them into:

- PNG
- static sprite
- billboard
- CSS-bounce placeholder

Use actual 3D mascot architecture.

---

## Natural idle

Support natural behavior such as:

- breathing
- subtle hover where character-appropriate
- blink
- eye motion
- head motion
- secondary motion

Timing must have natural variation.

Do not create robotic identical loops.

---

## Emotional states

Support conceptually:

```text
neutral
happy
excited
surprised
thinking
curious
encouraging
celebrate
listening
speaking
sleepy
gentle_sad
```

Map into existing animation names if the project already uses another naming scheme.

Do not duplicate clips merely for naming.

---

## Expression

Use:

- face
- posture
- body
- gesture

not just face textures.

---

## Learning reactions

Examples:

```text
correct → happy
mastery → celebrate
wrong → thinking / encouraging
TTS listening → listening
TTS speaking → speaking
```

---

## Character mapping

Use appropriate existing mascot identities.

Conceptual mapping:

```text
Home → KidoBot
Space → Astro
Dino → Dinoo
Uzbekistan → Ziyo
Workshop → Pixel
Light / Shadow → Lumi
Music → Melo
Garden → Leafy
Writing → Scribble
Stories → Story
```

If repository names differ, preserve canonical repository identities.

---

## Animation system

Use:

- blending
- crossfade
- sensible transitions

Avoid hard animation snapping.

---

## Speaking

Speaking animation should synchronize reasonably with narration state.

Do not attempt expensive full phoneme lip-sync unless architecture already supports it.

---

## Performance

Normally one primary mascot should be fully active per context.

Suspend/unload inactive heavy mascot scenes.

Support reduced motion.

---

## Critic

Use:

- Character Animation
- Technical Art
- Performance
- Child UX

---

# ================================================================
# PHASE 27
# LIVING PET SHOP + NATURAL ANIMAL SYSTEM
# ================================================================

## Goal

Make pets feel alive and species-specific.

If Phase 27 already exists, compare it against this contract and patch gaps only.

---

## Species motion

Do not use one universal bounce animation for every animal.

Examples:

### Cat

- breathing
- tail movement
- ear reaction
- sit/stand variation

### Dog

- tail wag
- head tilt
- excited stance

### Bird

- wing adjustment
- head motion
- perch movement

Other species should receive behavior appropriate to them.

---

## Preview

Before acquisition, show a meaningful preview.

Do not require blind purchase/unlock.

---

## Birthday integration

Birthday pet selection must reuse the same central pet registry.

---

## Performance

Use:

- visibility pause
- LOD where needed
- shared materials/resources
- low-end fallback

Do not render every shop animal at maximum complexity simultaneously.

---

# ================================================================
# PHASE 28
# WORLD CARD EVOLUTION 2.0
# ================================================================

## Goal

World cards must visually evolve as the learner progresses.

If existing Phase 28 currently changes mainly:

- frame
- badge
- text

then that may NOT yet satisfy this original contract.

Audit carefully.

---

## Visual evolution law

A meaningful upgrade should visibly change several dimensions, such as:

- architecture
- building scale
- environment
- lighting
- decorations
- activity
- prestige details
- badge
- background

Do not make progression:

> same card + different badge

---

## Example evolution

### Math

```text
Small School
→ Mathematics Academy
→ Grand Mathematics City
```

### Alphabet

```text
Learning House
→ Alphabet Academy
→ Grand Alphabet Library / Academy
```

### Words

```text
Word Workshop
→ Advanced Language Workshop
→ Language Innovation Lab
```

### Writing

```text
Writing Room
→ Writing School
→ Writing Academy
```

### Observatory

```text
Small Telescope
→ Observatory Dome
→ Space Research Observatory
```

### Spaceport

```text
Small Launch Site
→ Rocket Base
→ Futuristic Spaceport
```

### Stories

```text
Story Corner
→ Magical Library
→ Grand Story Castle Library
```

### Garden

```text
Small Garden
→ Rich Living Garden
→ Magical Living Garden
```

---

## Architecture

Make upgrades config-driven.

Do not hardcode enormous per-card branching.

---

## Animation

Upgrade animation target:

```text
~0.8–1.8s
```

Respect reduced motion.

---

## Visual acceptance criterion

A fresh screenshot of:

```text
Level 1
vs
Level 3 / highest stage
```

should be immediately distinguishable even if the labels are hidden.

---

# ================================================================
# PHASE 29
# PREMIUM KIDDO SOUND LANGUAGE
# ================================================================

## Goal

Create one cohesive Kiddo audio identity.

If Phase 29 already exists, verify it against this original contract.

---

## One central audio engine

Do not create another AudioContext when one already exists.

Pets, UI cues, reward sounds, etc. should share appropriate infrastructure.

---

## Sound families

Support a coherent family for interactions such as:

- tap
- confirm
- back
- soft error
- unlock
- reward
- level-up
- discovery

---

## Style

Kiddo audio should feel:

- light
- magical
- warm
- modern
- premium

Avoid:

- casino sound
- slot-machine feel
- aggressive alarms
- harsh error beep

---

## Hierarchy

Frequent interaction sounds must be quieter/subtler.

Rare achievements may be richer.

---

## TTS coordination

UI sounds must not fight narration.

---

## Rapid interaction

Rapid taps must not produce audio chaos.

---

## Settings

Respect sound settings and mute state.

---

# ================================================================
# PHASE 30
# STICKER + MEDAL + PRESTIGE REWARD SYSTEM
# ================================================================

## Sticker preview

Show the sticker before unlock where appropriate.

The learner should understand what they are working toward.

---

## Sticker identity

Create Kiddo-universe-specific stickers.

Avoid generic endless:

- star
- heart
- trophy

Examples:

- Scale Portal
- Crystal Rocket
- Living Alphabet
- Galaxy Book
- Magical Pencil
- Observatory
- Cosmic Garden
- Discovery Map
- Time Capsule
- Science Crystal

Maintain an inclusive style.

---

## New medal collection

Create a meaningful new medal collection after the current collection where appropriate.

Do not use names like:

```text
Tier 1
Tier 2
Tier 3
```

Use creative thematic names.

---

## Prestige evolution

Higher prestige must change more than color.

Possible changes:

- silhouette
- material
- detail
- depth
- glow
- subtle animation

Avoid:

> bronze → silver → gold recolor only

unless the current system intentionally uses classic medal tiers and additional visual evolution is also present.

---

## Requirements

Rewards should correspond to meaningful learning achievements.

No loot boxes.

No gambling mechanics.

No random paid rewards.

Idempotent unlocks.

---

# ================================================================
# PHASE 31
# AGE-EVOLVING AVATAR + FASHION + CHARACTER MATURITY
# ================================================================

## Goal

Make Kiddo's visual identity mature with the learner.

---

## Clothing categories

Support categories such as:

- casual
- sport
- science
- space
- explorer
- creative
- traditional
- tech
- smart
- seasonal

---

## Age maturity

### Younger

- playful
- colorful
- simpler silhouettes

### Middle

- sport
- explorer
- science
- richer styling

### Older

- tasteful
- modern
- less preschool-like
- still recognizably Kiddo

---

## Inclusivity

Avoid unnecessary gender locks.

Where possible, allow clothing to be chosen freely.

---

## Character maturity

Do not create a separate heavy 3D model for every year of age.

Use age-profile variants.

Maturity can influence:

- proportions where safe
- posture
- gesture
- idle style
- outfit presentation

---

## Critical rule

Do not implement age evolution by simply scaling the model taller.

---

## Separate cognitive and visual age

A highly advanced young learner should not suddenly receive an adult avatar.

A beginner older learner should not receive preschool visual treatment.

---

# ================================================================
# PHASE 32
# PREMIUM KIDDO LOGO + CINEMATIC OPENING
# ================================================================

## Logo

Create a standalone Kiddo symbol.

It must work without a visible wordmark.

---

## Visual direction

Core ideas:

- premium blue
- warm gold/orange
- central star/light
- orbit/world concept
- subtle K-like negative space if elegant

---

## Avoid generic clichés

Avoid making the logo simply:

- plain K
- generic star in circle
- graduation cap
- open book
- random rocket
- generic blob

---

## Vector first

Prefer SVG/vector-first design.

---

## Opening animation

Conceptual choreography:

```text
light appears
→ star forms
→ blue structure enters
→ warm gold element joins
→ orbit/interlock completes
→ center light activates
→ symbol settles
→ Home
```

Approximate duration:

```text
2.8–4.0 seconds
```

Do not play this on every route transition.

---

## Startup performance

Preload only critical Home assets.

Do not load huge world assets merely for the logo.

---

## Reduced motion

Provide simple appearance/fade fallback.

---

# ================================================================
# PHASE 33
# SCALE PORTAL
# ================================================================

## Goal

Create a flagship premium science-scale experience.

Journey:

```text
micro
→ tiny object
→ human
→ building
→ city
→ Earth
→ planets
→ Sun
→ Solar System
→ galaxy
```

---

## It must NOT feel like a slideshow

Use:

- continuous scale journey
- zoom
- camera transitions
- context transitions
- scale rail
- spatial comparison

---

## Scale rail

Provide an understandable scale indicator.

Do not overwhelm young children with scientific notation immediately.

---

## Age adaptation

### 3–6

Focus:

- bigger
- smaller
- near
- far
- simple visual comparison

### 7–9

Add:

- approximate ratios
- intuitive units

### 10–12

Add:

- orders of magnitude
- deeper comparison

### 13+

Add:

- scientific notation
- AU
- richer scale context

---

## Gameplay

Include:

- guess-first moments
- comparisons
- portal jumps
- exploration

Do not make it passive.

---

## Mascot

Use Astro where appropriate.

---

## Scientific accuracy

Centralize scientific values.

Do not scatter magic numbers.

Do not fabricate false precision.

Where factual values require verification and tools are available, use reputable scientific sources.

---

## 3D Performance

Respect Phase 12 optimization architecture.

Use:

- lazy loading
- shared geometry/material
- optimized textures
- quality tiers
- DPR control
- shadow limits
- controlled render loop
- cleanup

---

## Cleanup

Repeatedly entering/leaving Scale Portal must not leak:

- WebGL contexts
- geometry
- materials
- textures
- event listeners
- timers
- RAF loops

---

## Rewards

If adding a Scale reward, integrate it through central progression.

Do not invent a parallel currency.

---

## Critic

Use:

- Science Education
- 3D UX
- Performance
- Technical Art

---

# ================================================================
# PHASE 34
# SHADOW LAB / SHADOW CARTOGRAPHER
# ================================================================

## Learning target

Teach that shadow depends on:

- object
- light position
- orientation
- distance
- viewpoint/perspective

---

## Modes

### Mode 1 — Match the Shadow

Manipulate object/light to match a target shadow.

### Mode 2 — Identify from Views

Identify object using shadow/view clues.

### Mode 3 — Build from Primitives

Combine simple shapes to create a target.

### Mode 4 — Light-Only Puzzle

Object stays fixed.

Move only light.

### Mode 5 — Shadow Detective

Reason from several clues.

---

## Age adaptation

### Young

- one object
- one light
- simple silhouette

### Middle

- object rotation
- light movement
- stronger spatial reasoning

### Older

- multi-constraint puzzles
- viewpoint reasoning
- more difficult composition

---

## Real interaction

Where feasible, shadow must be generated from the actual object/light relationship.

Do not fake gameplay using unrelated static images.

---

## Scoring

Use deterministic tolerance.

Do not require pixel-perfect matching.

---

## Mascot

Use Lumi where appropriate.

---

## Touch controls

Support:

- touch
- mouse
- keyboard where appropriate

Provide accessible alternative controls for difficult drag interactions.

---

## Performance

Use quality tiers for expensive shadows.

Do not run maximum-quality shadow rendering on weak devices.

---

## Critic

Use:

- Spatial Learning
- Technical Art
- Mobile UX
- Accessibility

---

# ================================================================
# PHASE 35
# PARENT INTELLIGENCE DASHBOARD
# ================================================================

## Goal

Turn existing learning data into useful parent insight.

No external LLM is required.

---

## Data sources

Use deterministic information from:

- mastery
- recent success
- review need
- homework
- independent attempts
- hints
- Mistake Garden
- recent activities

---

## Never show raw internals

Avoid:

```text
masteryScore: 0.73
skill_key: math_add_10
```

Translate into parent-friendly language.

---

## Sections

Possible structure:

```text
Hozir o‘rganmoqda
Yaqinda o‘zlashtirdi
Kuchayib bormoqda
Yana mashq qilish foydali
Uyga vazifalar
Yutuqlar
Faollik tendensiyasi
Mistake Garden
```

---

## Above the fold

The most useful information should appear first.

Do not bury everything below charts.

---

## Positive language

Use constructive language.

---

## Charts

Use charts only where they add genuine understanding.

Charts must be accessible.

---

## Next-practice suggestions

Generate deterministic recommendations from real learning evidence.

Do not make clinical/psychological claims.

---

## Multi-child isolation

Absolutely verify child switching.

---

## Comparison rule

Compare the child primarily against their own trajectory.

Do not rank siblings against each other.

---

## No-data state

Do not fabricate trends.

Explain that more learning activity is needed.

---

# ================================================================
# PHASE 36
# FINAL DEMO INTEGRATION + FULL QA + RELEASE INTEGRITY
# ================================================================

Phase 36 is stabilization.

Do not introduce a major new product area here unless necessary to repair a contractual gap.

---

# 36.1 ARCHITECTURE AUDIT

Check:

- duplicated systems
- dead feature flags
- giant components
- unsafe persistence
- duplicated activity definitions
- listener cleanup
- subscription cleanup
- reward duplication
- stale migration logic
- old temporary demo hacks

---

# 36.2 EDUCATIONAL AUDIT

Search all important learning flows for:

```text
quiz-before-teaching
```

Ensure:

```text
teach
→ guide
→ independent practice
→ assess
```

---

# 36.3 AGE AUDIT

Test at least:

```text
4
6
8
11
14
17
```

Check:

- cognitive difficulty
- visual maturity
- text maturity
- controls
- lesson depth
- rewards
- mascots
- avatar presentation

---

# 36.4 HOMEWORK AUDIT

Verify:

```text
parent assign
→ child sees
→ lesson
→ practice
→ completion
→ parent sees result
```

Test multiple children.

---

# 36.5 PROFILE / BIRTHDAY AUDIT

Verify:

- image upload validation
- replace/remove
- DOB
- birthday detection
- +50 coins exactly once
- one pet exactly once
- grace behavior
- multi-child isolation

---

# 36.6 ONBOARDING AUDIT

Verify:

- first time
- second time
- later visits
- skip
- replay
- per-profile
- responsive
- keyboard
- reduced motion

---

# 36.7 MASCOT AUDIT

Verify:

- true 3D
- no sprite regressions
- idle
- blink
- emotion
- speaking
- celebration
- wrong-answer encouragement
- domain mapping
- reduced motion
- cleanup

---

# 36.8 PET AUDIT

Verify:

- species-specific motion
- preview
- birthday integration
- performance
- weak-device fallback

---

# 36.9 WORLD CARD AUDIT

Critical:

Compare Phase 28 implementation to THIS ORIGINAL CONTRACT.

Verify that evolution is visually substantial, not merely:

- frame
- badge
- text

Fresh screenshots must prove visual progression.

---

# 36.10 SOUND AUDIT

Verify:

- central engine
- no duplicate AudioContext
- hierarchy
- no pile-ups
- TTS coordination
- mute
- first-interaction browser restrictions
- parent areas
- rapid taps

---

# 36.11 STICKER / MEDAL AUDIT

Verify:

- preview
- Kiddo-specific identity
- prestige evolution
- no loot-box logic
- idempotency

---

# 36.12 AVATAR AUDIT

Verify:

- age maturity
- clothing
- inclusion
- no simple model scaling
- cognitive/visual age separation

---

# 36.13 OPENING AUDIT

Verify:

- premium mark
- startup speed
- reduced motion
- does not replay unnecessarily
- no heavy preload regression

---

# 36.14 SCALE PORTAL AUDIT

Test:

- ages
- devices
- quality tiers
- repeated entry
- repeated exit
- low-end mode
- resize
- portrait
- landscape

Check memory cleanup.

---

# 36.15 SHADOW LAB AUDIT

Test:

- modes
- touch
- mouse
- keyboard alternative
- rotation
- light movement
- scoring tolerance
- performance tiers
- resize
- repeated route cycles

---

# 36.16 PARENT INTELLIGENCE AUDIT

Verify:

- accurate source data
- no invented trends
- no raw internal keys
- multi-child correctness
- positive language
- no medical/psychological claims

---

# 36.17 RESPONSIVE MATRIX

Verify:

```text
320×568
360×800
393×852
852×393
768×1024
834×1194
1024×768
1440×900
1920×1080
```

No:

- clipping
- accidental horizontal scroll
- hidden controls
- inaccessible CTA
- broken modal
- overlapping mascot
- broken 3D canvas

---

# 36.18 TEXT SCALING

Check:

```text
100%
150%
200%
```

---

# 36.19 LOCALIZATION

Audit:

```text
UZ
RU
EN
```

Particularly:

- long Russian text
- pluralization
- buttons
- lesson titles
- cards
- parent insights
- onboarding
- new rewards
- Scale Portal
- Shadow Lab

---

# 36.20 ACCESSIBILITY

Verify:

- keyboard
- semantic controls
- focus
- SR labels
- contrast
- reduced motion
- touch targets
- zoom
- accessible alternatives

---

# 36.21 PERFORMANCE

Profile:

- startup
- Home
- lesson
- mascot
- pet shop
- world cards
- Scale Portal
- Shadow Lab
- repeated navigation
- long session

---

# 36.22 MEMORY LEAK AUDIT

Repeatedly enter/leave heavy routes.

Watch for:

- WebGL context growth
- event listeners
- timers
- RAF loops
- AudioNodes
- object references
- subscriptions
- detached DOM

---

# 36.23 SECURITY AUDIT

Review:

- Demo Admin
- production Admin
- Pro visibility
- upload validation
- multi-child isolation
- rewards
- unsafe local persistence
- production/demo separation

---

# 36.24 PWA / CACHE AUDIT

Verify:

- new build actually loads
- old service worker does not mask regression
- cache freshness
- offline-safe existing features remain functional

Use a fresh browser context for final verification.

---

# 36.25 FINAL TEST COMMANDS

Run all project-applicable checks, such as:

```text
format
lint
typecheck
unit
integration
SQL
E2E
build
```

Do not claim a test passed unless it actually ran.

If a command is not part of the repository, document that instead of inventing output.

---

# 36.26 FINAL CRITIC PANEL

Run focused Critic roles:

- Product
- Educational
- Early Childhood
- Older Learner
- Parent UX
- Technical Architect
- Animation
- 3D Technical Art
- Accessibility
- Performance
- Security
- Visual Design

Exit condition:

```text
Critical = 0
High = 0
```

---

# 29. CRITIC EFFICIENCY RULE

Do not send the entire repository to every critic.

Send only:

- phase contract
- changed files
- relevant architecture
- important screenshots
- relevant tests

This saves context and produces more focused reviews.

---

# 30. SCREENSHOT RULE

Do not generate dozens of screenshots after every small edit.

Use screenshots at meaningful visual checkpoints.

For UI-heavy Phases, capture representative:

- phone
- tablet
- desktop

unless a specific bug requires more.

Final Phase 36 should contain the complete responsive evidence set.

---

# 31. BROWSER VERIFICATION

Use a fresh browser session when validating:

- cache-sensitive changes
- PWA behavior
- startup
- demo mode
- opening animation
- major UI flows

Do not rely on stale tabs.

---

# 32. VISUAL QUALITY BAR

A feature is not complete because:

> “It works.”

It must also feel:

- cohesive
- polished
- premium
- intentional
- age-appropriate
- Kiddo-specific

Avoid:

- generic dashboard UI
- primitive shapes used as final art
- excessive gradients
- neon overload
- random colors
- template-like cards
- cheap shadows
- huge empty space
- overcrowded screens

---

# 33. MOBILE-FIRST UX LAW

Especially for child activities:

- one clear primary action
- large controls
- no accidental horizontal scroll
- no hidden CTA
- safe-area support
- predictable back behavior
- minimal scroll during a step
- controls do not cover learning content

---

# 34. EXISTING MOBILE/TABLET UX CONTRACT

Preserve the existing responsive work.

Important principles include:

```text
44×44 minimum touch target
safe-area support
single scroll owner
no accidental horizontal scroll
no hidden/clipped controls
pinch zoom allowed
dynamic viewport support
reduced motion
tablet-specific layouts
touch-first interaction
```

For lesson/mashq flows, prefer:

```text
TOP BAR
STEP CONTENT
BOTTOM ACTION BAR
```

rather than requiring the child to repeatedly scroll down just to reach the next question.

---

# 35. STEP FLOW RULE

Where an activity is naturally sequential:

Do not require:

```text
answer
→ scroll down
→ next question
→ scroll again
```

Prefer:

```text
answer
→ feedback
→ Next
→ next step
```

or safe short auto-advance where appropriate.

Progress should remain visible.

---

# 36. PROJECT-STATE FILE

After every Phase update:

```text
.claude/kiddo-project-state.md
```

Keep it compact.

Suggested structure:

```text
Phase:
Status:
Architecture:
Important files:
Tests:
Critic:
Known limitations:
Commit:
Next:
```

Do not paste enormous logs into it.

This file exists to prevent future context loss.

---

# 37. GIT SAFETY

Before editing:

```bash
git status
```

Never overwrite unrelated user work.

Do not discard unknown changes.

Use small, coherent commits.

One Phase may use more than one commit only when technically justified.

---

# 38. FAST-PATH FOR ALREADY-COMPLETE PHASES

If a Phase appears complete:

Do NOT rebuild it.

Run:

```text
contract comparison
→ relevant code inspection
→ relevant test verification
→ gap list
```

If gap list is empty:

mark:

```text
VERIFIED — NO REIMPLEMENTATION REQUIRED
```

Update project state and immediately continue.

This is a major limit-saving mechanism.

---

# 39. FAST-PATH FOR PARTIAL PHASES

If 80% already exists:

do not restart.

Implement the missing 20%.

Do not rename architecture merely to make it match this prompt.

Function and quality matter more than naming.

---

# 40. TOOL-CALL BUDGET DISCIPLINE

Before each expensive tool call ask:

```text
Will this call produce new information or verification?
```

If not, skip it.

Do not:

- reopen files already summarized
- rerun passing tests without reason
- repeat browser audits
- ask several agents the same question
- regenerate screenshots with no change
- perform broad repo search after exact location is known

---

# 41. SOURCE PRIORITY

When deciding what is true:

```text
1. current repository
2. current tests
3. .claude/kiddo-project-state.md
4. Git history
5. this contract
6. old chat summaries
7. deployed demo as secondary reference
```

Important nuance:

The repository tells you **what currently exists**.

This contract tells you **what the final result must satisfy**.

---

# 42. PRODUCTION REFERENCE

The deployed Kiddo site may be used as a visual or behavior reference.

But do not blindly copy a deployed regression into the local project.

Local source + contract remain authoritative.

---

# 43. REAL BLOCKERS

If a Phase has a genuine external blocker:

Examples:

- missing external credential
- inaccessible production service
- unavailable required binary asset
- unavailable third-party account

Then:

1. clearly document the blocker
2. finish every safe unblocked part
3. continue unrelated Phases if architecture allows
4. do not pretend the blocker is resolved
5. do not stop the whole project unnecessarily

---

# 44. DO NOT WAIT FOR USER PERMISSION

Use senior engineering judgment.

Only stop for:

- destructive ambiguity
- security-critical decision requiring ownership
- missing external secret/account
- requirement that cannot safely be inferred

Routine implementation decisions do not require permission.

---

# 45. OUT OF SCOPE

Do not expand these Phases into unrelated infrastructure work such as:

- phone registration
- SMS production integration
- real payment provider integration
- Click
- Payme
- real subscription billing
- production app-store release
- large marketing automation
- paid advertising
- Instagram campaign automation
- unrelated backend rewrite

unless explicitly instructed later.

---

# 46. FUTURE PRO PRICE — PRESERVE, DO NOT ACTIVATE

Future commercial architecture may preserve:

```text
24,990 so‘m / month
238,990 so‘m / year
```

Do not activate real billing merely because the values exist.

---

# 47. NO FAKE SUCCESS

Never write:

```text
all tests pass
```

unless you actually ran them.

Never write:

```text
Critic ACCEPT
```

unless the review actually happened.

Never write:

```text
commit abc123
```

before Git returns it.

Never call a Phase complete while required browser verification is still running.

---

# 48. HANDLING FLAKY TESTS

If a test fails:

Do not immediately label it flaky.

Reproduce it.

Run isolated.

Run again under realistic load.

Investigate whether the feature caused it.

Only document flakiness after evidence supports it.

---

# 49. PHASE 36 FINAL REPORT

Only after all required work is complete, provide a comprehensive final report.

Use this structure:

```text
KIDDO PHASE 20–36 FINAL REPORT

1. Completed Phases
2. Major product improvements
3. Learning architecture
4. Age/mastery system
5. Parent Center & Homework
6. Profiles & Birthday
7. Onboarding
8. Mascots
9. Pets
10. World Card Evolution
11. Sound Language
12. Stickers & Medals
13. Avatar/Fashion
14. Logo & Opening
15. Scale Portal
16. Shadow Lab
17. Parent Intelligence
18. Responsive QA
19. Accessibility
20. Localization
21. Performance
22. Security
23. Tests
24. Critic results
25. Commits
26. Known non-blocking limitations
27. Final release status
```

---

# 50. FINAL RELEASE GATE

Do not declare final completion until:

```text
Critical = 0
High = 0
lint = PASS
typecheck = PASS
build = PASS
required unit tests = PASS
required integration tests = PASS
required E2E = PASS
responsive QA = PASS
localization QA = PASS
accessibility QA = PASS
performance QA = acceptable
security QA = PASS
fresh browser verification = PASS
```

---

# 51. FINAL PRODUCT PRINCIPLE

Kiddo must feel like **one connected learning universe**.

The product loop should remain coherent:

```text
LEARN
→ EARN
→ BUILD
→ EXPLORE
→ DISCOVER
→ CREATE
→ UNLOCK
→ LEARN
```

Do not turn Kiddo into a collection of unrelated mini-apps.

Rewards, mascots, worlds, lessons, homework, parent insights, Mistake Garden, pets, Scale Portal and Shadow Lab should reinforce the same learning ecosystem.

---

# 52. FINAL LIMIT-SAVING PRINCIPLE

The fastest correct path is:

```text
UNDERSTAND ONCE
→ RECORD ARCHITECTURE
→ REUSE KNOWLEDGE
→ MODIFY MINIMALLY
→ TEST TARGETED
→ REVIEW FOCUSED
→ VERIFY
→ CHECKPOINT
→ MOVE ON
```

Not:

```text
READ EVERYTHING
→ REBUILD EVERYTHING
→ RUN EVERYTHING
→ REPEAT
```

---

# 53. EXECUTION PRIORITY

At startup determine the true current Phase.

If Git proves Phases 20–29 are already complete and compliant:

do not restart Phase 20.

Proceed directly to Phase 30.

However, perform a lightweight contract-gap check for completed phases, especially:

- Phase 21 teach-before-play
- Phase 22 age/mastery
- Phase 23 Parent Center/Homework
- Phase 24 birthday/profile
- Phase 25 onboarding
- Phase 26 mascots
- Phase 27 pets
- Phase 28 substantial visual World Card evolution
- Phase 29 central sound architecture

If a serious contract gap is discovered, patch the gap before final Phase 36 release.

---

# 54. START NOW

Immediately:

1. read `.claude/kiddo-project-state.md`
2. inspect Git status/history
3. inspect currently available Skills / Plugins / MCP tools
4. read the actual documentation for useful installed skills
5. use Ponytail if installed and appropriate
6. determine the real completed/current Phase
7. compare existing implementation against this contract
8. continue from the first incomplete requirement
9. do not ask routine permission
10. keep execution continuous through Phase 36

Execution rhythm:

```text
VERIFY
→ IMPLEMENT
→ TARGETED TEST
→ CRITIC
→ FIX
→ VERIFY
→ CHECKPOINT
→ SHORT USER UPDATE
→ NEXT PHASE IMMEDIATELY
```

## EXECUTION STATE

```text
ACTIVE UNTIL PHASE 36 RELEASE GATE PASSES
```

Begin now.