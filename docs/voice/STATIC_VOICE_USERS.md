# Eski statik ovozdan foydalanadigan joylar (B2 natijasi, B3 uchun)

Sana: 2026-11-24. Hech narsa o'chirilmagan. `public/audio/voice` dagi 15 979 mp3 (214.8 MB) joyida, endi ular "issiq kesh" (version 0).

## Qanday ishlaydi (B2 dan keyin)
Hamma nutq bitta yo'ldan o'tadi: `audioManager.say()` → `voiceLibrary.planSpeech()`:
1. yozilgan klip (`/audio/voice/...`, rolning `version` = 0 bo'lsa),
2. klip yo'q yoki yuklanmadi → jonli ovoz `GET /api/tts` (faqat ilova gaplari, bola ismisiz; xato bo'lsa 60 s tinch),
3. → qurilma ovozi (`speechSynthesis`, `clipsOnly` bo'lmasa),
4. → ovozsiz (matn ekranda), `say()` doim resolve.
Rol versiyasi oshirilsa (`voiceConfig.json`), shu rolning statik fayllari ishlatilmay qoladi.

## Statik klipni bevosita ishlatadigan kod (B3 da tekshirish)
| fayl | nima | B3 |
|---|---|---|
| `src/services/audio/voiceLibrary.ts` | narrator `/audio/voice/<lang>/<key>.mp3`, bola ovozi `/audio/voice/kid/<girl|boy>/<lang>/<key>.mp3` | yagona tanlash nuqtasi |
| `src/services/audio/voicePaths.ts`, `kidVoices.ts` | URL (`VITE_VOICE_BASE` bilan) | — |
| `src/services/audio/voiceSource.ts` | private rejim (`voice-url`, Supabase, PRO) | Pro yashirishda tekshirish |
| `src/features/admin/VoicesSection.tsx:81`, `adminVoices.ts` | admin klipni `new Audio(publicClipUrl)` bilan tinglaydi, `voiceManifest.json` | admin, o'zgarishsiz |
| `src/main.tsx` | `dropPublicVoiceCache` (private build) | — |
| `scripts/voices/generate.py`, `inventory.ts`, `upload-private.mjs`, `kid_voices*.py` | yaratish/inventar | `generate.py` endi `voiceConfig.json` dan o'qiydi |

## `say/speak/useSpeaker/speakable` chaqiruvchilari (rol tanlash B3 da)
Ular hozir rol bermaydi: narrator yoki bola jinsiga qarab Mini/Piku (`kidVoiceOf`). B3 da har joy uchun "qaysi maskot gapiradi" belgilanadi.

- `src/features/age/UnlockCelebration.tsx`
- `src/features/alphabet/LetterCheck.tsx`
- `src/features/alphabet/LetterPage.tsx`
- `src/features/alphabet/NumberPage.tsx`
- `src/features/attention/AttentionHelper.tsx`
- `src/features/birthday/BirthdayCelebration.tsx`
- `src/features/feelings/CalmCorner.tsx`
- `src/features/feelings/FeelingsPage.tsx`
- `src/features/feelings/FeelingsRun.tsx`
- `src/features/home/HomePage.tsx`
- `src/features/learn/LearnResult.tsx`
- `src/features/learn/LearnShell.tsx`
- `src/features/learn/LessonDeck.tsx`
- `src/features/learn/SpeakButton.tsx`
- `src/features/learn/speakable.ts`
- `src/features/learn/useLearnMascot.ts`
- `src/features/learn/voice.ts`
- `src/features/mascot/PeekingMascot.tsx`
- `src/features/mascot/useMascot.ts`
- `src/features/mathLab/MathLabPage.tsx`
- `src/features/onboarding/CoachMarks.tsx`
- `src/features/onboarding/WelcomePage.tsx`
- `src/features/pro/ProCelebration.tsx`
- `src/features/sciGames/SciGamePage.tsx`
- `src/features/sciGames/play/hooks.ts`
- `src/features/shorts/ShortQuiz.tsx`
- `src/features/shorts/ShortsPage.tsx`
- `src/features/space/Lesson.tsx`
- `src/features/space/OrderGame.tsx`
- `src/features/space/QuestionBoard.tsx`
- `src/features/stories/StoryFrame.tsx`
- `src/features/stories/StoryQuestions.tsx`
- `src/features/stories/useNarration.ts`
- `src/features/tasks/ChoiceGame.tsx`
- `src/features/tasks/MemoryGame.tsx`
- `src/features/tasks/TaskHint.tsx`
- `src/features/tasks/TraceGame.tsx`
- `src/features/threeWords/ThreeWordsPage.tsx`
- `src/features/tutor/TutorPanel.tsx`
- `src/features/worlds/dino/parts.tsx`
- `src/features/worlds/uzbekistan/ExploreView.tsx`
- `src/features/worlds/uzbekistan/LockedView.tsx`
- `src/features/worlds/uzbekistan/MapRun.tsx`
- `src/features/worlds/uzbekistan/PatternRun.tsx`
- `src/features/worlds/uzbekistan/TableRun.tsx`
- `src/features/worlds/uzbekistan/UzHub.tsx`
- `src/features/worlds/uzbekistan/run.tsx`
