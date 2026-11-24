# Store holati (Capacitor / Google Play / Apple / Codemagic)

Tekshirilgan sana: 2026-11-24. Manba: rasmiy sahifalar (WebFetch/WebSearch). O'qib bo'lmagan joy: "tasdiqlanmagan".

| fakt | bugungi holat | manba URL | tekshirilgan sana |
|---|---|---|---|
| @capacitor/core latest (npm) | 8.6.2; `next` = 9.0.0-rc.0 (taxminan 2026-11-12, npm ichki vaqt tamg'asidan; aniq sana tasdiqlanmagan) | https://registry.npmjs.org/@capacitor/core | 2026-11-24 |
| Capacitor 9 stable? | Yo'q. Faqat rc.0 (`next` tegi). Ionic 9 alpha: 2026-05-08. Stable e'loni topilmadi (tasdiqlanmagan, ammo npm `latest` hali 8.6.2) | https://ionic.io/blog/capacitor-9-starts-here | 2026-11-24 |
| Capacitor 8 talablari | Node 22+, Xcode 26.0+, Android Studio Otter 2025.2.1+, minSdk 24, compileSdk 36, targetSdk 36, iOS 15.0 | https://capacitorjs.com/docs/updating/8-0 | 2026-11-24 |
| Google Play target API (yangi ilova va yangilanish) | API 36 (Android 16) yoki yuqori, muddat 2026-08-31 (uzaytirish so'rovi: 2026-11-01 gacha). Mavjud ilovalar yangi foydalanuvchilarga ko'rinishi uchun kamida API 35 | https://support.google.com/googleplay/android-developer/answer/11926878 | 2026-11-24 |
| 16 KB page size | API 35+ ni target qiladigan barcha ilovalar 64-bit qurilmalarda 16 KB ni qo'llab-quvvatlashi shart; 2027-02-01 dan boshlab qo'llab-quvvatlamaydigan yangilanishni chiqarib bo'lmaydi. Faqat Java/Kotlin bo'lsa, allaqachon mos; native (.so) bo'lsa AGP 8.5.1+ va NDK r28+ tavsiya | https://developer.android.com/guide/practices/page-sizes | 2026-11-24 |
| Apple: minimal Xcode/SDK (App Store Connect yuklash) | Xcode 26+ va iOS 26 SDK (2026-04-28 dan) | https://developer.apple.com/news/upcoming-requirements/ | 2026-11-24 |
| Apple: iOS deployment minimum | Sahifada: yuklanadigan iOS/iPadOS ilovalar iOS 13+ ni target qilishi shart (2026-09-09 dan) | https://developer.apple.com/news/upcoming-requirements/ | 2026-11-24 |
| Apple privacy manifest | Required-reason API'lar uchun tasdiqlangan sabablar (SDK'lar ham) majburiy, 2024-05-01 dan | https://developer.apple.com/news/upcoming-requirements/ | 2026-11-24 |
| Play closed testing (yangi shaxsiy akkaunt) | Kamida 12 tester, ketma-ket 14 kun opt-in | https://support.google.com/googleplay/android-developer/answer/14151465 | 2026-11-24 (sahifada sana ko'rsatilmagan) |
| Codemagic bepul daqiqalar | Shaxsiy akkaunt: oyiga 500 daqiqa, faqat macOS M2 mashinalarda; har oyning 1-sanasida yangilanadi; Linux/Windows va Team uchun yo'q | https://docs.codemagic.io/billing/pricing/ | 2026-11-24 |
| `instance_type: mac_mini_m2` valid? | Ha, jadvalda "Apple silicon M2 Mac mini". Boshqalar: mac_mini_m4, linux_x2, linux_x4, windows_x2 (m4/linux/windows uchun billing yoqilgan bo'lishi kerak) | https://docs.codemagic.io/yaml-basic-configuration/yaml-getting-started/ | 2026-11-24 |
| @capgo/capacitor-social-login | Latest 8.7.13 (peer: @capacitor/core >=8.0.0); v8.x = Capacitor v8 (faol). Provayderlar: Google (Android Credential Manager), Apple (Android'da OAuth), Facebook, Twitter/X, Telegram, LinkedIn, TikTok, generic OAuth2. Publish sanasi tasdiqlanmagan | https://registry.npmjs.org/@capgo/capacitor-social-login/latest ; https://github.com/Cap-go/capacitor-social-login | 2026-11-24 |
| Apple 4.8 (Login Services) | Uchinchi tomon/ijtimoiy login (Google, Facebook va h.k.) asosiy akkaunt uchun ishlatilsa, ekvivalent muqobil login ham taklif qilinishi kerak: faqat ism+email yig'adi, emailni yashirishga ruxsat beradi, reklama uchun roziliksiz kuzatmaydi (Sign in with Apple shunday). Istisno: faqat o'z akkaunt tizimi, ta'lim/korxona akkaunti va h.k. | https://developer.apple.com/app-store/review/guidelines/ | 2026-11-24 (sahifada "yangilangan" sanasi o'qilmadi) |
| Apple 5.1.1(v) | Ilovada akkaunt yaratish bo'lsa, akkauntni o'chirish ilova ichida taklif etilishi shart; muhim akkauntga asoslangan funksiya bo'lmasa loginsiz foydalanishga ruxsat berilishi kerak | https://developer.apple.com/app-store/review/guidelines/ | 2026-11-24 |

## Kiddo uchun xulosa

Joriy sozlama (Capacitor 8.6.2, minSdk 24, compile/target 36, iOS 15, `mac_mini_m2`) quyidagi bo'yicha mos:

- Capacitor 8.6.2 = npm `latest`. Capacitor 9 hali stable emas (faqat rc), shuning uchun 8'da qolish to'g'ri.
- minSdk 24, compile/target 36, iOS 15.0 aynan Capacitor 8 talablariga mos. Target 36 Play'ning 2026-08-31 talabini qondiradi.
- `mac_mini_m2` valid kalit va aynan bepul 500 daqiqa/oy beriladigan mashina turi.
- Social login: @capgo 8.7.13 Capacitor 8 bilan mos; Google va Apple qo'llab-quvvatlanadi.

Tekshirish/ehtiyot bo'lish kerak:

- Xcode: Apple yuklash uchun Xcode 26+ / iOS 26 SDK talab qiladi (Capacitor 8 ham 26.0+). Codemagic `xcode:` qiymati `latest` yoki 26.x bo'lishi shart (repo'dagi codemagic.yaml bu hisobotda tekshirilmadi).
- Node 22+ Codemagic'da ham kerak (`node: 22` yoki undan yuqori; tekshirilmadi).
- 16 KB: sof web/Capacitor ilovada o'z native kodi yo'q, lekin plugin'lar (.so) bo'lsa, 2027-02-01 gacha AAB'ni tekshirish kerak (AGP 8.5.1+, `zipalign -P 16`). Hozircha tasdiqlanmagan.
- Apple 4.8: ilovada Google bilan kirish bo'lsa, Sign in with Apple (yoki ekvivalent) ham bo'lishi shart. 5.1.1(v): akkaunt yaratilsa, ilova ichida akkauntni o'chirish bo'lishi shart.
- Play: yangi shaxsiy dev akkaunt bo'lsa, production'dan oldin 12 tester x 14 kun closed test kerak.
- iOS 13 minimum talabi (sahifada 2026-09-09 dan) iOS 15 target bilan qondirilgan.
