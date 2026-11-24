# Kiddo

- What it is: a learning app for young children (alphabet, numbers, counting, short lessons and games) with recorded voice, a 3D mascot companion and a parent area; web app (PWA) plus Android/iOS builds.
- Who it is for: parents in Uzbekistan of children aged 4–6, buying for a child who learns in Uzbek, Russian or English (all three alphabets are in the app).
- What it sells, at what price: free core app; a PRO subscription at 24,990 so'm / month or 238,990 so'm / year (the founder's planned price, not yet live; live prices are set by the admin).
- Where and how: Uzbekistan, online; delivered as a web app and through Google Play and the App Store (Capacitor wrapper, store builds in progress). How customers find it: not decided yet.
- Budget and constraints: solo founder (Hojiakbar) building with AI coding help on one low-RAM Windows laptop; a rule of no paid services enabled so far; money budget not stated. Already built: ~1,900 automated tests, 3 languages with ~16,000 recorded voice clips (~215 MB), offline-capable web shell. Children's-app store rules apply (no ad IDs, no third-party analytics, parental consent; a lawyer review of privacy text is still pending).

## Extra context a stranger needs
- Product state: working web app on a feature branch; store builds (Codemagic) prepared but not yet published. Planned next stages: shrinking the 215 MB of voice in the native package, native sign-in, load-time work, store submission.
- Measured load on a slowed phone: each screen ready in about 0.7–1.2 s.
- Content: Uzbek, Russian and English alphabets and numbers; math and "space" lessons, games, shop with in-app "nuts" (coins, earned not bought), studio (drawing), shorts (short videos), collection, homework from parents, an attention helper using the camera only if a parent turns it on.
- PRO: what exactly sits behind PRO is not documented in this brief; prices above are the planned ones.
- Unknowns (do not assume): market size, number of target families, competitor prices, cost to acquire a customer, conversion from free to PRO, payment method (Payme/Click/store billing), marketing budget.
