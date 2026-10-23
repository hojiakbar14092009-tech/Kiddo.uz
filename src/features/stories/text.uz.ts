// with its extension and from a file without imports: the e2e tests read these words too
import type { StoryText } from './storyText.ts'

/** Hikoyalar o‘zbek tilida (sahifalar, tanlovlar va savollar content.ts dagi kalitlar bilan). */
export const STORY_TEXT_UZ: Record<string, StoryText> = {
  'lost-lamb': {
    title: 'Adashgan qo‘zichoq',
    blurb: 'Oppoq tog‘da kapalak ortidan yugurib ketadi.',
    pages: {
      p1: [
        'Baland tog‘larda, oq o‘tov yonida Oppoq ismli kichkina qo‘zichoq yashardi.',
        'Har tong u onasi va cho‘ponning iti Olapar bilan yashil yaylovga chiqardi.',
      ],
      p2: [
        'Bir kuni Oppoq rang-barang kapalakni ko‘rib qoldi.',
        'U kapalak ortidan sakrab-sakrab ketaverdi, orqasiga qarashni ham unutdi.',
      ],
      p3: [
        'Kapalak baland uchib ketdi, Oppoq esa atrofga qaradi.',
        'Na onasi, na suruv, na Olapar ko‘rinardi.',
        '– Ma-a-a, – deb sekingina chaqirdi u.',
      ],
      p4: ['Pastga tik va toshloq so‘qmoq tushib ketgan edi.', 'Oppoq nima qilsin?'],
      stay1: [
        'Oppoq hamma ko‘radigan joyda – katta tosh yonida turdi.',
        '– Ma-a-a! Men shu yerdaman! – deb bor ovozi bilan chaqirdi.',
      ],
      stay2: [
        'Pastda Olapar quloqlarini ding qildi.',
        'U dumini likillatib, tepalikka yugurib chiqdi: – Vov! Topdim seni! Bir joyda turib chaqirganing juda to‘g‘ri bo‘ldi!',
      ],
      down1: [
        'Oppoq ehtiyotlab bir qadam bosdi, tuyoqlari ostidan mayda toshlar dumalab ketdi.',
        '– To‘xta, jajjigim! – dedi cho‘ponning tanish echkisi. – Bu so‘qmoq kattalar uchun. Kel, shu yerda turib birga chaqiramiz.',
      ],
      down2: [
        '– Ma-a-a! Me-e-e! – deb ikkalasi birga chaqirdi.',
        'Ovozni Olapar eshitdi va dumini likillatib, tepaga yugurib keldi.',
      ],
      home: [
        'Quyosh botayotganda Olapar Oppoqni suruvga olib keldi.',
        'Onasi uni mehr bilan iskadi: – Seni sog‘indim, quyoshim! Adashganda bir joyda turib chaqirish – eng to‘g‘ri yo‘l.',
        'Oppoq nima desin?',
      ],
      'end-thank': [
        'Oppoq burnini Olaparning iliq juniga tekkizdi: – Meni topganing uchun rahmat!',
        'O‘sha kecha o‘tov ustida yulduzlar charaqladi, hamma tinch uxladi.',
      ],
      'end-close': [
        '– Onajon, endi doim ko‘z oldingizda yuraman, – dedi Oppoq.',
        'U onasining yonida yotdi, to‘lin oy esa uxlayotgan suruvni qo‘riqlab turdi.',
      ],
    },
    choices: {
      stay: 'Tosh yonida turib chaqirsin',
      down: 'Tik so‘qmoqdan tushib ko‘rsin',
      thank: 'Rahmat, Olapar!',
      close: 'Onajon, yoningizdan ketmayman',
    },
    questions: {
      'who-lost': {
        prompt: 'Tog‘da kim adashib qoldi?',
        options: ['Qo‘zichoq Oppoq', 'Echki', 'Sigir'],
      },
      'what-chased': {
        prompt: 'Oppoq nimaning ortidan yugurdi?',
        options: ['Kapalak', 'Qush', 'Koptok'],
      },
      'who-found': {
        prompt: 'Oppoqni suruvga kim olib keldi?',
        options: ['Olapar it', 'Burgut', 'Ot'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Oppoq kapalakni quvdi', 'Olapar uni topdi', 'Hamma uxladi'],
      },
      'why-lost': {
        prompt: 'Oppoq nega adashib qoldi?',
        options: [
          'Kapalak ortidan ketib, orqasiga qaramadi',
          'Yomg‘ir yog‘a boshladi',
          'Daraxt orqasiga yashirindi',
        ],
      },
      'mother-felt': {
        prompt: 'Oppoq qaytganda onasi o‘zini qanday his qildi?',
        options: ['Xursand bo‘ldi', 'Jahli chiqdi', 'Xafa bo‘ldi'],
      },
      'next-time': {
        prompt: 'Keyingi safar yaylovda Oppoq nima qiladi?',
        options: [
          'Suruvdan uzoqlashmaydi',
          'Har bir kapalakni quvadi',
          'Eng baland tog‘ga chiqadi',
        ],
      },
    },
  },

  'grandma-garden': {
    title: 'Buvijonning bog‘i',
    blurb: 'Tipratikan Tikon buvisiga bog‘da yordam beradi.',
    pages: {
      p1: [
        'Shanba kuni kichkina tipratikan Tikon buvisinikiga mehmonga keldi.',
        'Buvisining bog‘i qip-qizil gilos, dumaloq pomidor va baland kungaboqarlarga to‘la edi.',
      ],
      p2: [
        '– Xush kelibsan, bolajonim! – deb buvisi uni mahkam quchoqladi.',
        '– Bugun sen mening kichkina yordamchimsan.',
      ],
      p3: [
        'Kun issiq edi: ko‘chatlar suvsagan, giloslar esa pishib yetilgan edi.',
        'Tikon avval nima qilsin?',
      ],
      water1: [
        'Tikon kichkina chelakka suv to‘ldirib, ko‘chatlarni birma-bir sug‘ordi.',
        'Barglar ko‘tarilib, go‘yo «rahmat» deyotgandek bo‘ldi.',
      ],
      water2: [
        'Keyin u buvisiga gilos terishga yordam berdi.',
        'Pastki shoxlar kichkina tipratikanning bo‘yiga juda mos edi.',
      ],
      cherry1: [
        'Tikon buvisi bilan birga pishgan giloslarni terdi.',
        'Pastki shoxlar kichkina tipratikanning bo‘yiga juda mos edi.',
      ],
      cherry2: [
        'Keyin Tikon ko‘chatlarga suv tashidi.',
        '– Ichinglar, jajjilarim, – deb shivirladi u, barglar esa ko‘tarilib qoldi.',
      ],
      snail: [
        'Katta barg tagida Tikon sekin yuradigan kichkina shilliqqurtni topdi.',
        '– Buvijon, qarang! U uyini orqasida ko‘tarib yuribdi!',
        'Tikon nima qilsin?',
      ],
      watch: [
        'Tikon yerga cho‘zilib yotib, jimgina tomosha qildi.',
        'Shilliqqurt jajji shoxchalarini chiqarib, sekin yo‘lida davom etdi.',
      ],
      carry: [
        'Tikon shilliqqurtni ehtiyotlab bargga qo‘ydi va soyadagi o‘tlar orasiga olib bordi.',
        '– Bu yerda salqin va xavfsiz bo‘ladi, – dedi u.',
      ],
      tea: [
        'Kechqurun ular gilos tagida issiq non va gilos murabbosi bilan choy ichishdi.',
        '– Sen haqiqiy bog‘bonsan, – deb jilmaydi buvisi, Tikon esa juda faxrlandi.',
      ],
    },
    choices: {
      water: 'Ko‘chatlarga suv quysin',
      cherries: 'Buvisi bilan gilos tersin',
      watch: 'Jimgina tomosha qilsin',
      carry: 'Salqin o‘tlarga olib borsin',
    },
    questions: {
      'who-visit': {
        prompt: 'Tikon kimnikiga mehmonga bordi?',
        options: ['Buvisinikiga', 'Quyonnikiga', 'Boyqushnikiga'],
      },
      'what-found': {
        prompt: 'Tikon barg tagida nimani topdi?',
        options: ['Shilliqqurtni', 'Xonqizini', 'Chuvalchangni'],
      },
      'what-grew': {
        prompt: 'Buvijonning bog‘ida nima o‘sardi?',
        options: ['Gilos', 'Banan', 'Ananas'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Tikon buvisinikiga keldi', 'Shilliqqurtni topdi', 'Choy ichishdi'],
      },
      'why-water': {
        prompt: 'Ko‘chatlar nega suvsadi?',
        options: ['Kun issiq edi', 'Qor yog‘ayotgan edi', 'Yomg‘ir yog‘ayotgan edi'],
      },
      'tikon-felt': {
        prompt: 'Buvisi maqtaganda Tikon o‘zini qanday his qildi?',
        options: ['Faxrlandi', 'Jahli chiqdi', 'Qo‘rqdi'],
      },
      'next-time': {
        prompt: 'Kelasi yozda giloslar yana pishadi. Buvijonga kim yordam beradi?',
        options: ['Tikon', 'Baliq', 'Kit'],
      },
    },
  },

  'navruz-sumalak': {
    title: 'Navro‘z sumalagi',
    blurb: 'Butun mahalla tun bo‘yi birga sumalak pishiradi.',
    pages: {
      p1: [
        'Mahallaga bahor keldi: lolalar ochildi, o‘riklar gulladi.',
        '– Navro‘z kelyapti! – dedi Ona Tovuq jo‘jasi Sariqqa.',
      ],
      p2: [
        'Ona Tovuq bug‘doyni suvga ivitib, iliq joyga qo‘ydi.',
        'Bir necha kundan keyin kichkina o‘tloqdek mayin, yam-yashil maysalar unib chiqdi.',
      ],
      p3: [
        'Kechqurun qo‘shnilar olov ustidagi katta qozon atrofiga yig‘ilishdi.',
        'Sumalak tun bo‘yi pishadi, shuning uchun hamma navbat bilan kavlab, qo‘shiq aytdi.',
      ],
      sleepy: ['Kech kirdi, Sariqning ko‘zlari yumila boshladi.', 'Sariq nima qilsin?'],
      nap: [
        'Sariq onasining iliq qanoti ostiga kirib oldi.',
        'Tushida katta qozon yaltiroq yulduzlarga to‘la ekan.',
      ],
      sing1: [
        'Sariq eng yaxshi qo‘shig‘ini kuyladi: «Sumalak, sumalak, shirin sumalak!»',
        'Hamma jilmayib, qozonni yanada tezroq kavladi.',
      ],
      sing2: [
        'Taka bobo uzun kafgir bilan qozonni kavladi, Sariq esa olovdan uzoqda turib niyat qildi.',
        '– Niyating ushalsin! – deb jilmaydi Taka bobo.',
      ],
      morning: [
        'Tongda sumalak tayyor bo‘ldi – shirin va iliq, mahalla uzra esa quyosh chiqdi.',
        '– Kim bilan baham ko‘ramiz? – deb so‘radi Ona Tovuq.',
      ],
      'end-granny': [
        'Sariq kechasi tashqariga chiqolmagan O‘rdak buviga bir kosa sumalak olib bordi.',
        '– Navro‘zingiz muborak! – dedi Sariq, O‘rdak buvi esa mehr bilan jilmaydi.',
      ],
      'end-friends': [
        'Sariq gullagan daraxt tagida sumalakni hamma do‘stlari bilan baham ko‘rdi.',
        '– Navro‘z muborak! – deb kuylashdi ular, bahor quyoshi esa hammaga jilmayib turdi.',
      ],
    },
    choices: {
      nap: 'Onasi yonida mizg‘ib olsin',
      sing: 'Qozon atrofidagilarga qo‘shiq aytib bersin',
      granny: 'Qo‘shni O‘rdak buvi bilan',
      friends: 'Hamma do‘stlari bilan',
    },
    questions: {
      'who-soaked': {
        prompt: 'Bug‘doyni kim ivitdi?',
        options: ['Ona Tovuq', 'Sigir', 'Mushuk'],
      },
      'what-grew': {
        prompt: 'Bug‘doydan nima unib chiqdi?',
        options: ['Yashil maysa', 'Qo‘ziqorin', 'Kaktus'],
      },
      'what-flowers': {
        prompt: 'Bahorda qaysi gullar ochildi?',
        options: ['Lolalar', 'Kaktus', 'Qor parchalari'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Bug‘doy unib chiqdi', 'Hamma qozon kavladi', 'Quyosh chiqdi'],
      },
      'why-turns': {
        prompt: 'Qo‘shnilar nega navbat bilan kavlashdi?',
        options: ['Sumalak tun bo‘yi pishadi', 'Koptok o‘ynamoqchi edi', 'Sovitish uchun'],
      },
      'all-felt': {
        prompt: 'Sumalak tayyor bo‘lganda hamma o‘zini qanday his qildi?',
        options: ['Xursand bo‘ldi', 'Jahli chiqdi', 'Qo‘rqdi'],
      },
      'next-spring': {
        prompt: 'Kelasi bahorda Sariq nima qiladi?',
        options: ['Bug‘doy undirishga yordam beradi', 'Qordan odam yasaydi', 'Qayiqda suzadi'],
      },
    },
  },

  'bazaar-kindness': {
    title: 'Bozordagi yaxshilik',
    blurb: 'Ayiqcha bozorga borib, yordam berishning yo‘lini topadi.',
    pages: {
      p1: [
        'Yakshanba kuni Ayiqcha dadasi bilan bozorga bordi.',
        'Atrof qovun, uzum va issiq-issiq nonlarga to‘la edi!',
      ],
      p2: [
        '– Bizga olma va bitta katta qovun kerak, – dedi dadasi.',
        'Ayiqcha savatni g‘urur bilan ko‘tarib bordi.',
      ],
      p3: [
        'Birdan keksa toshbaqaning xaltasi yirtilib, qizil olmalar yerga dumalab ketdi.',
        'Toshbaqa bobo tez engasha olmasdi.',
        'Ayiqcha qanday yordam bersin?',
      ],
      pick: [
        'Ayiqcha yugurib borib, olmalarni birma-bir terdi.',
        'Uzoqqa dumalab ketganlarini terishga dadasi yordam berdi.',
      ],
      basket: [
        'Ayiqcha savatini uzatdi: – Toshbaqa bobo, mening savatimni oling!',
        'Ular birga hamma olmalarni savatga solishdi.',
      ],
      thanks: [
        '– Rahmat, mehribonim, – dedi Toshbaqa bobo.',
        '– Yaxshilik hech qachon unutilmaydi.',
      ],
      honey: [
        'Toshbaqa bobo asal sotardi, u Ayiqchaga kichkina bir banka asal berdi: – Bu sening yaxshi qalbing uchun.',
        'Ayiqcha asalni nima qilsin?',
      ],
      'end-home': [
        'Uyda butun oila asal bilan choy ichdi.',
        'Ayiqcha olmalar haqida gapirib berdi, dadasi esa: – Sen bilan faxrlanaman, – dedi.',
      ],
      'end-friend': [
        'Ayiqcha asalni yo‘talayotgan do‘sti Quyonchaga olib bordi.',
        '– Asalli iliq choy senga yordam beradi, – dedi u, Quyoncha esa jilmaydi.',
      ],
    },
    choices: {
      pick: 'Olmalarni terib bersin',
      basket: 'O‘z savatini bersin',
      home: 'Uyda oilasi bilan baham ko‘rsin',
      friend: 'Do‘sti Quyonchaga olib borsin',
    },
    questions: {
      'whose-bag': {
        prompt: 'Kimning xaltasi yirtildi?',
        options: ['Toshbaqa boboning', 'Sigirning', 'Mushukning'],
      },
      'what-rolled': {
        prompt: 'Yerga nima dumalab ketdi?',
        options: ['Olmalar', 'Koptok', 'Tuxumlar'],
      },
      'what-gift': {
        prompt: 'Toshbaqa bobo Ayiqchaga nima berdi?',
        options: ['Bir banka asal', 'Muzqaymoq', 'Konfet'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Ayiqcha savatni oldi', 'Olmalar dumalab ketdi', 'Asal oldi'],
      },
      'why-honey': {
        prompt: 'Toshbaqa bobo nega asal berdi?',
        options: [
          'Ayiqcha mehribon bo‘lgani uchun',
          'Kech bo‘lgani uchun',
          'Yomg‘ir yoqqani uchun',
        ],
      },
      'turtle-felt': {
        prompt: 'Olmalar dumalab ketganda Toshbaqa bobo o‘zini qanday his qildi?',
        options: ['Xavotirlandi', 'Xursand bo‘ldi', 'Jahli chiqdi'],
      },
      'next-time': {
        prompt: 'Ertaga kimdir biror narsasini tushirib yuborsa, Ayiqcha nima qiladi?',
        options: ['Yordam beradi', 'Uxlagani ketadi', 'Koptok o‘ynaydi'],
      },
    },
  },

  'star-night': {
    title: 'Yulduzli tun',
    blurb: 'Bo‘tajon dono Boyqush bilan osmonni kuzatadi.',
    pages: {
      p1: [
        'Keng dashtda oppoq o‘tov turardi.',
        'Uning yonida kichkina bo‘tacha Bo‘tajon onasi bilan yashardi.',
      ],
      p2: [
        'O‘sha kecha osmon yulduzlarga to‘la edi.',
        '– Ular nechta ekan? – deb hayron bo‘ldi Bo‘tajon. – Hammasini sanab chiqolmayman-ku!',
      ],
      p3: [
        'O‘tov tepasiga teleskop ko‘targan dono Boyqush qo‘ndi.',
        '– Yaqinroqdan ko‘rishni xohlaysanmi? – deb so‘radi u.',
        'Bo‘tajon avval nimaga qarasin?',
      ],
      moon: [
        'Teleskopdan Oy juda katta ko‘rindi!',
        'Uning ustida qumdagi izlarga o‘xshash dumaloq chuqurchalar – kraterlar bor ekan.',
      ],
      planet: [
        'Boyqush keng halqali sayyorani topdi.',
        '– Bu Saturn, – dedi Boyqush. – U juda-juda uzoqda.',
      ],
      shooting: [
        'Birdan osmonda yorug‘ nur uchib o‘tdi.',
        '– Uchar yulduz! – deb shivirladi Bo‘tajon, ko‘zlarini katta-katta ochib.',
      ],
      travellers: [
        '– Qadimda karvonlar tunda tuyalarda cho‘lni kesib o‘tishgan, – dedi Boyqush.',
        '– Ular yo‘lni yulduzlarga qarab topishgan.',
      ],
      sleepy: ['Bo‘tajon og‘zini katta ochib esnadi.', 'Endi u nima qilsin?'],
      'end-thank': [
        '– Rahmat, Boyqush! – dedi Bo‘tajon va onasining yoniga yotdi.',
        'Tushida halqalar, oylar va uchar yulduzlarni ko‘rdi.',
      ],
      'end-count': [
        'Bo‘tajon onasi bilan sanadi: – Bir, ikki, uch!',
        'Keyin ikkalasi katta va mehribon osmon ostida uxlab qolishdi.',
      ],
    },
    choices: {
      moon: 'Katta, dumaloq Oyga',
      planet: 'Uzoqdagi sayyoraga',
      thank: 'Rahmat aytib, uxlasin',
      count: 'Yana uchta yulduz sanasin',
    },
    questions: {
      'who-telescope': {
        prompt: 'Teleskop kimda edi?',
        options: ['Boyqushda', 'Baliqda', 'Sigirda'],
      },
      'what-flew': {
        prompt: 'Osmonda nima uchib o‘tdi?',
        options: ['Uchar yulduz', 'Varrak', 'Havo shari'],
      },
      'where-live': {
        prompt: 'Bo‘tajon qayerda yashardi?',
        options: ['O‘tov yonida', 'Qal’ada', 'Qayiqda'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Osmon yulduzlarga to‘ldi', 'Uchar yulduz uchdi', 'Bo‘tajon uxlagani yotdi'],
      },
      'why-stars': {
        prompt: 'Karvonlar nega yulduzlarga qarashgan?',
        options: ['Yo‘lni topish uchun', 'Pechenye topish uchun', 'Yomg‘irdan yashirinish uchun'],
      },
      'felt-shooting': {
        prompt: 'Uchar yulduzni ko‘rganda Bo‘tajon o‘zini qanday his qildi?',
        options: ['Hayron qoldi', 'Jahli chiqdi', 'Xafa bo‘ldi'],
      },
      tomorrow: {
        prompt: 'Ertaga kechasi Bo‘tajon nimani qidiradi?',
        options: ['Yana uchar yulduzni', 'Baliqni', 'Qordan odamni'],
      },
    },
  },

  'mahalla-hashar': {
    title: 'Mahallada hashar',
    blurb: 'Butun mahalla birga ishlaydi, mushukcha Mosh ham yordam beradi.',
    pages: {
      p1: [
        'Shanba kuni butun mahalla hasharga chiqdi.',
        'Qo‘shnilar ko‘chani toza va yam-yashil qilish uchun birga ishlashdi.',
      ],
      p2: [
        'Mushukcha Mosh kichkina chelak oldi.',
        '– Men yangi daraxtlarga suv quyaman! – dedi u.',
      ],
      p3: [
        'Bo‘ribosar bobo chuqur qazidi, qo‘shnilar esa yosh ko‘chatlar o‘tqazishdi.',
        'Mosh har biriga ehtiyotlab suv quydi.',
      ],
      nest: [
        'Keksa tut daraxti tagida Mosh ingichka «chiy-chiy» ovozini eshitdi.',
        'O‘t ustida qush uyasi yotardi!',
        'Mosh nima qilsin?',
      ],
      call: [
        'Mosh Bo‘ribosar boboning oldiga yugurdi: – Tezroq yuring, uya tushib ketdi!',
        'Bobo narvonini olib, uning ortidan shoshildi.',
      ],
      guard: [
        'Mosh uya yonida o‘tirib, katta barg bilan uni quyoshdan to‘sib turdi.',
        'Ko‘p o‘tmay Bo‘ribosar bobo narvonini ko‘tarib o‘tib qoldi.',
      ],
      ladder: [
        'Bobo narvonga chiqib, uyani mustahkam shoxga qaytarib qo‘ydi.',
        'Ona qush shod-xurram «rahmat» qo‘shig‘ini kuyladi.',
      ],
      table: [
        'Kechqurun ko‘cha yam-yashil va top-toza bo‘ldi, qo‘shnilar non, uzum va choy bilan dasturxon yozishdi.',
        '– Hashar mahallamizni baxtli uyga aylantiradi, – deb miyovladi Mosh.',
      ],
    },
    choices: {
      call: 'Bo‘ribosar boboni chaqirsin',
      guard: 'Uyani qo‘riqlab tursin',
    },
    questions: {
      'who-fixed': {
        prompt: 'Uyani joyiga kim qo‘ydi?',
        options: ['Bo‘ribosar bobo', 'Sigir', 'Baliq'],
      },
      'what-fell': {
        prompt: 'O‘t ustiga nima tushib qoldi?',
        options: ['Qush uyasi', 'Olma', 'Koptok'],
      },
      'what-carried': {
        prompt: 'Mosh nima oldi?',
        options: ['Chelak', 'Soyabon', 'Nog‘ora'],
      },
      first: {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Ko‘chat o‘tqazishdi', 'Uya joyiga qaytdi', 'Choy ichishdi'],
      },
      'why-ladder': {
        prompt: 'Boboga narvon nega kerak bo‘ldi?',
        options: [
          'Uyani baland shoxga qaytarish uchun',
          'Olma terish uchun',
          'Varrakni olish uchun',
        ],
      },
      'bird-felt': {
        prompt: 'Oxirida ona qush o‘zini qanday his qildi?',
        options: ['Xursand bo‘ldi', 'Jahli chiqdi', 'Qo‘rqdi'],
      },
      'next-hashar': {
        prompt: 'Keyingi hasharda Mosh nima qiladi?',
        options: ['Yana yordam beradi', 'Kun bo‘yi uxlaydi', 'Mashina haydaydi'],
      },
    },
  },
}
