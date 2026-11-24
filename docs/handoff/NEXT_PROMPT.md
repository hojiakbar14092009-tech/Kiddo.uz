# Handoff: Capacitor 8 + Codemagic (MASTER_PROMPT_V3)

## Bajarildi
- `@capacitor/core|android|ios` 8.6.2, `@capacitor/cli` (dev). `capacitor.config.ts`: appId `uz.kiddo.app`, webDir `dist`.
- Native ilovada service worker yoqilmaydi (`src/app/registerServiceWorker.ts`).
- `codemagic.yaml`: `android` (AAB -> Play internal, draft) va `ios` (IPA -> TestFlight), ikkalasi `mac_mini_m2`, iOS SPM (pod install yo'q).

- `android/` (SDK 24/36/36) va `ios/` (iOS 15, SPM) yaratildi; web fayllari ularda gitignore'da, CI `cap sync` bilan qo'yadi.
- `android/app/build.gradle`: `-PversionCode` va `CM_KEYSTORE_*` bilan release imzolash.
- Tekshirildi: `npm run build`, `tsc -b`, oxlint, YAML parse. **Tekshirilmadi**: gradle/xcode build (lokal SDK/Java yo'q) — birinchi Codemagic run sinaydi.

## Qolgan (kod)
1. Native'da kirish (Google/email) ishlamaydi: `/api` nisbiy, cookie same-origin, Google OAuth WebView'da bloklanadi.
   Store build'ning birinchi versiyasida "Ota-onalar" bo'limidagi kirishni yashirish yoki `@capgo/capacitor-social-login` + Sign in with Apple qo'shish kerak (egasi tanlaydi).

## Faqat ega (Codemagic UI nomlari `codemagic.yaml` dagilar bilan bir xil bo'lsin)
- Shaxsiy (Team emas) Codemagic akkaunti, repo ulash.
- Android: `keytool` bilan upload keystore -> Codemagic "Code signing" -> reference `kiddo_upload` (zaxira nusxa saqlang).
  Google Cloud service account JSON -> env group `google_play`, o'zgaruvchi `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`.
  Birinchi AAB'ni Play Console'ga qo'lda yuklash kerak bo'lishi mumkin.
- iOS: Apple Developer Program, App Store Connect'da `uz.kiddo.app` ilova yozuvi, API kaliti (App Manager) -> Codemagic integration `kiddo_asc`.
  `codemagic.yaml` dagi `APP_STORE_APPLE_ID: 0` ni ilovaning raqamli Apple ID'si bilan almashtiring.
- appId `uz.kiddo.app` birinchi yuklashdan keyin o'zgarmaydi: boshqasi kerak bo'lsa hozir ayting.
