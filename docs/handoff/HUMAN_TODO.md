# HUMAN_TODO (faqat Hojiakbar bajaradi)

Holat belgilari: [ ] qilinmagan, [x] qilingan. Codemagic UI nomlari `codemagic.yaml` dagilar bilan bir xil bo'lsin.

## Akkauntlar va kalitlar
- [ ] Apple Developer Program (yillik to'lov). O'zbekistondan ro'yxatdan o'tish va to'lov mumkinligini birinchi tekshiring.
- [ ] Google Play Console (bir martalik to'lov).
- [ ] Codemagic: SHAXSIY (Team emas) akkaunt, repo ulash. Bepul daqiqalar faqat shaxsiy akkauntda.
- [ ] Android upload keystore: `keytool -genkey -v -keystore kiddo-upload.jks -alias kiddo -keyalg RSA -keysize 2048 -validity 10000`. Codemagic > Code signing > reference `kiddo_upload`. Zaxira nusxani repo tashqarisida saqlang (yo'qolsa yangilanish chiqarib bo'lmaydi).
- [ ] Google Cloud service account JSON (Play Console'da ruxsat) > Codemagic env group `google_play`, o'zgaruvchi `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`.
- [ ] App Store Connect: `uz.kiddo.app` ilova yozuvi; API kaliti (App Manager) > Codemagic integration `kiddo_asc`. `.p8` faqat bir marta yuklanadi.
- [ ] `codemagic.yaml` dagi `APP_STORE_APPLE_ID: 0` ni ilovaning raqamli Apple ID'si bilan almashtirish.
- [ ] Birinchi AAB'ni Play Console'ga qo'lda yuklash (tasdiqlanmagan, lekin odatda talab qilinadi).
- [ ] **B2: jonli ovoz kaliti (Azure Speech, bepul F0).** portal.azure.com > Create resource > "Speech" > Pricing tier **Free F0** (karta so'ralsa to'xtang, F0 pul yechmaydi, limitdan oshsa so'rov rad etiladi). Region: `westeurope` yoki eng yaqini. Keys and Endpoint > KEY 1 va Location. Vercel > Project > Settings > Environment Variables: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` (Production + Preview), lokal uchun `.env.local`. Kalitsiz `/api/tts` 503 beradi, ilova yozilgan mp3 + qurilma ovozi bilan ishlayveradi.
- [ ] Ixtiyoriy: Gemini API kaliti (ZEHN usuli, `GEMINI_API_KEY`) faqat `.env.local` va Vercel'ga. Kalitsiz ham B2 ishlaydi (edge-tts).

## Tasdiqlash
- [ ] Bundle ID / applicationId `uz.kiddo.app` ni tasdiqlash. Birinchi yuklashdan keyin o'zgarmaydi.
- [ ] Google Play yopiq sinov: testerlar soni va kunlarini `docs/handoff/STORE_STATUS.md` dagi rasmiy raqam bo'yicha rejalashtirish.
- [ ] Native kirish: B7 da `@capgo/capacitor-social-login` + Sign in with Apple qo'shiladi (9-bo'lim 3-band). Google Cloud'da har imzo sertifikati (debug, upload, Play App Signing) SHA-1 bilan Android OAuth client yaratish kerak bo'ladi.

## Ovoz va matn
- [ ] **B2 pilot tayyor:** `%USERPROFILE%\voice-test\v3\edge_*.mp3` (21 fayl) ni `docs/voice/LISTEN.md` bo'yicha eshitib jadvalni to'ldirish: imlo (ʻ / ’ / '), tezlik 90/80/70%, Mini/Piku/narrator ovozi. Kirill varianti Edge'da umuman ishlamadi (audio yo'q). Tanlov keyin `voiceConfig.json` (rol `version` +1), `normalize_uz.py` `DEFAULT`, `server/tts.ts` `UZ_APOSTROPHE` ga yoziladi.
- [ ] uz va ru matnlarni o'qib tekshirish (B3/B4).
- [ ] B3 dan keyin: ishlatilmay qolgan eski mp3 ro'yxatini ko'rib, o'chirishga ruxsat berish (hozir 15 979 ta, 214.8 MB, `public/audio/voice`).

## Sinov va chiqarish
- [ ] Haqiqiy iPhone'da TestFlight orqali sinash.
- [ ] Haqiqiy arzon Android telefonda APK sinovi (`chrome://inspect` bilan).
- [ ] "push qil" buyrug'i (branch `feat/capacitor-codemagic`).
