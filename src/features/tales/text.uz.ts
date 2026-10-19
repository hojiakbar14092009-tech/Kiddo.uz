import type { TaleText } from './content'

/** Ertaklar o‘zbek tilida (sahnalar va savollar content.ts bilan bir xil tartibda). */
export const TALE_TEXT_UZ: Record<string, TaleText> = {
  'rabbit-carrot': {
    title: 'Quyoncha va sabzi',
    scenes: [
      {
        lines: [
          'Bir bor ekan, bir yo‘q ekan, yashil o‘tloqda kichkina Quyoncha yashar ekan.',
          'Bir kuni ertalab Quyonchaning qorni ochibdi.',
        ],
      },
      {
        lines: [
          'Quyoncha bog‘ga boribdi va u yerda Tipratikan bilan uchrashibdi.',
          '– Men shirin sabzi qidiryapman, – debdi Quyoncha.',
        ],
        task: { prompt: 'Sabzini top!', options: ['Sabzi', 'Olma', 'Qo‘ziqorin'] },
      },
      {
        lines: [
          'Quyoncha katta sabzini topibdi! U sabzini do‘sti Tipratikan bilan bo‘lishibdi.',
          'Ikkalasi ham juda xursand bo‘libdi.',
        ],
      },
      {
        lines: [
          'Kechqurun do‘stlar katta daraxt tagida shirin uxlab qolishibdi.',
          'Oy esa ularga osmondan jilmayib turibdi.',
        ],
      },
    ],
    checks: [
      { prompt: 'Sabzini kim qidirdi?', options: ['Quyoncha', 'Mushuk', 'O‘rdak'] },
      { prompt: 'Quyoncha nimani topdi?', options: ['Sabzi', 'Koptok', 'Olma'] },
      { prompt: 'Quyoncha kim bilan bo‘lishdi?', options: ['Tipratikan', 'Sigir', 'Baliq'] },
      {
        prompt: 'Do‘stlar qayerda uxlab qolishdi?',
        options: ['Daraxt tagida', 'Mashinada', 'Qayiqda'],
      },
    ],
  },
  'chick-ball': {
    title: 'Jo‘janing koptogi',
    scenes: [
      {
        lines: [
          'Sariq Jo‘ja hovlida koptok o‘ynabdi.',
          'Koptok dumalab-dumalab uzoqqa ketib qolibdi.',
        ],
      },
      {
        lines: [
          'Jo‘ja koptokni qidira-qidira hovuz bo‘yiga kelibdi.',
          'U yerda O‘rdakcha suzib yurgan ekan.',
        ],
      },
      {
        lines: [
          '– Koptogim qayerda? – deb so‘rabdi Jo‘ja.',
          '– Mana, gullar orasida! – debdi O‘rdakcha.',
        ],
        task: { prompt: 'Koptokni top!', options: ['Koptok', 'Gul', 'Olma'] },
      },
      {
        lines: [
          'Jo‘ja va O‘rdakcha kechgacha birga koptok o‘ynashibdi.',
          'Do‘st bilan o‘ynash qanday maroqli!',
        ],
      },
    ],
    checks: [
      { prompt: 'Koptokni kim yo‘qotdi?', options: ['Jo‘ja', 'Quyoncha', 'Sigir'] },
      { prompt: 'Jo‘ja nimani qidirdi?', options: ['Koptok', 'Varrak', 'Ayiqcha'] },
      { prompt: 'Jo‘jaga kim yordam berdi?', options: ['O‘rdakcha', 'Mushuk', 'Ot'] },
      { prompt: 'Koptok qayerda edi?', options: ['Gullar orasida', 'Mashinada', 'Uyda'] },
    ],
  },
  'kitten-stars': {
    title: 'Mushukcha va yulduzlar',
    scenes: [
      {
        lines: ['Kechasi kichkina Mushukcha uxlay olmabdi.', 'U derazadan osmonga qarabdi.'],
      },
      {
        lines: [
          'Daraxtda dono Boyo‘g‘li o‘tirgan ekan.',
          '– Osmonga qara, – debdi Boyo‘g‘li mehribonlik bilan.',
        ],
      },
      {
        lines: ['Osmonda yorug‘ Oy va charaqlab turgan yulduzlar bor ekan.'],
        task: { prompt: 'Yulduzni top!', options: ['Yulduz', 'Koptok', 'Olma'] },
      },
      {
        lines: [
          'Mushukcha yulduzlarga «Xayrli tun!» debdi.',
          'Keyin ayiqchasini quchoqlab, shirin uxlab qolibdi.',
        ],
      },
    ],
    checks: [
      { prompt: 'Kim uxlay olmadi?', options: ['Mushukcha', 'Kuchukcha', 'Cho‘chqacha'] },
      { prompt: 'Mushukchaga kim yordam berdi?', options: ['Boyo‘g‘li', 'Qurbaqa', 'Sigir'] },
      { prompt: 'Osmonda nima bor edi?', options: ['Oy', 'Mashina', 'Sabzi'] },
      { prompt: 'Mushukcha nimani quchoqlab uxladi?', options: ['Ayiqcha', 'Baraban', 'Soyabon'] },
    ],
  },
  'chipmunk-autumn': {
    title: 'Burunduqchaning kuzgi g‘amlamasi',
    scenes: [
      {
        lines: [
          'Kuz kelibdi. Daraxtlardan sariq barglar to‘kila boshlabdi.',
          'Burunduqcha qishga tayyorlanishga kirishibdi.',
        ],
      },
      {
        lines: ['Avval u o‘rmondan kashtan teribdi.', 'Kashtanlarni savatchasiga solibdi.'],
        task: { prompt: 'Burunduqcha nimani terdi?', options: ['Kashtan', 'Koptok', 'Baliq'] },
      },
      {
        lines: [
          'Keyin u yo‘lda Tipratikanni uchratibdi. Tipratikan og‘ir olmalarni ko‘tarib ketayotgan ekan.',
          'Burunduqcha unga olmalarni uyigacha olib borishga yordam beribdi.',
        ],
      },
      {
        lines: [
          'Shundan so‘ng Burunduqcha hamma kashtanlarni daraxt kovagidagi uychasiga yashiribdi.',
        ],
      },
      {
        lines: [
          'Qish kelibdi, hamma yoqni oppoq qor qoplabdi.',
          'Burunduqchaning uychasi issiq, kashtanlari esa butun qishga yetarli ekan.',
        ],
      },
    ],
    checks: [
      {
        prompt: 'Burunduqcha avval nima qildi?',
        options: ['Kashtan terdi', 'Qor o‘ynadi', 'Baliq tutdi'],
      },
      {
        prompt: 'Burunduqcha yo‘lda kimni uchratdi?',
        options: ['Tipratikanni', 'Boyo‘g‘lini', 'Qurbaqani'],
      },
      {
        prompt: 'Burunduqcha Tipratikanga qanday yordam berdi?',
        options: ['Olmalarni olib bordi', 'Koptok berdi', 'Soyabon berdi'],
      },
      {
        prompt: 'Kashtanlarni qayerga yashirdi?',
        options: ['Daraxt kovagiga', 'Chelakka', 'Mashinaga'],
      },
      { prompt: 'Oxirida nima bo‘ldi?', options: ['Qish keldi', 'Gullar ochildi', 'Yoz keldi'] },
    ],
  },
  'turtle-pond': {
    title: 'Toshbaqachaning sayohati',
    scenes: [
      {
        lines: [
          'Kichkina Toshbaqacha hovuzga borib, baliqchalar bilan tanishmoqchi bo‘libdi.',
          'U sekin-sekin yo‘lga chiqibdi.',
        ],
      },
      {
        lines: [
          'Yo‘lda u Shilliqqurtni uchratibdi.',
          '– Shoshmasdan yurish ham yaxshi, – debdi Shilliqqurt va unga yo‘l ko‘rsatibdi.',
        ],
      },
      {
        lines: [
          'Keyin o‘tlar orasidan Qurbaqa sakrab chiqibdi.',
          '– Hovuz mana shu yerda! – debdi u.',
        ],
        task: { prompt: 'Qurbaqani top!', options: ['Qurbaqa', 'Baliq', 'Ari'] },
      },
      {
        lines: [
          'Toshbaqacha suvga sho‘ng‘ibdi va rang-barang baliqchalar bilan tanishibdi.',
          'Ular birga suzib, o‘ynashibdi.',
        ],
      },
      {
        lines: [
          'Kechqurun Toshbaqacha uyiga qaytibdi.',
          'U yangi do‘stlarini eslab, jilmayib uxlab qolibdi.',
        ],
      },
    ],
    checks: [
      { prompt: 'Toshbaqacha qayerga bordi?', options: ['Hovuzga', 'Toqqa', 'Qasrga'] },
      {
        prompt: 'Yo‘lda birinchi kimni uchratdi?',
        options: ['Shilliqqurtni', 'Qurbaqani', 'Baliqchani'],
      },
      {
        prompt: 'Toshbaqachaga hovuzni kim ko‘rsatdi?',
        options: ['Qurbaqa', 'Sigir', 'Boyo‘g‘li'],
      },
      {
        prompt: 'Toshbaqacha hovuzda kimlar bilan tanishdi?',
        options: ['Baliqchalar bilan', 'Otlar bilan', 'Arilar bilan'],
      },
      {
        prompt: 'Toshbaqacha qanday yurdi?',
        options: ['Sekin-sekin', 'Raketadek tez', 'Samolyotda uchib'],
      },
    ],
  },
  'duck-rain': {
    title: 'Yomg‘ir va kamalak',
    scenes: [
      { lines: ['Quyoshli kunda O‘rdakcha o‘tloqda sayr qilib yurgan ekan.'] },
      {
        lines: [
          'To‘satdan osmonni bulut qoplabdi va yomg‘ir yog‘a boshlabdi.',
          'O‘rdakcha katta soyabonini ochibdi.',
        ],
      },
      {
        lines: [
          'Quyoncha bilan Sichqoncha yomg‘irda ho‘l bo‘lib qolishibdi.',
          '– Soyabonim ostiga kelinglar! – deb chaqiribdi O‘rdakcha.',
        ],
        task: {
          prompt: 'O‘rdakcha nima qildi?',
          options: ['Soyabonini bo‘lishdi', 'Koptok o‘ynadi', 'Uxlab qoldi'],
        },
      },
      {
        lines: [
          'Yomg‘ir to‘xtabdi, quyosh chiqibdi.',
          'Osmonda rang-barang kamalak paydo bo‘libdi!',
        ],
      },
      {
        lines: [
          'Do‘stlar ko‘lmaklarda sakrab, kulib o‘ynashibdi.',
          '– Rahmat, O‘rdakcha! – deyishibdi ular.',
        ],
      },
    ],
    checks: [
      {
        prompt: 'Avvaliga havo qanday edi?',
        options: ['Quyoshli edi', 'Qor yog‘ayotgan edi', 'Kechasi edi'],
      },
      { prompt: 'Keyin nima bo‘ldi?', options: ['Yomg‘ir yog‘di', 'Qor yog‘di', 'Kamalak chiqdi'] },
      { prompt: 'O‘rdakcha nimani ochdi?', options: ['Soyabonni', 'Qutini', 'Kitobni'] },
      {
        prompt: 'Soyabon ostiga kimlar keldi?',
        options: ['Quyoncha va Sichqoncha', 'Sigir', 'Baliq'],
      },
      { prompt: 'Yomg‘irdan keyin osmonda nima chiqdi?', options: ['Kamalak', 'Raketa', 'Varrak'] },
    ],
  },
  'seed-sunflower': {
    title: 'Kungaboqar qanday o‘sdi',
    scenes: [
      {
        lines: [
          'Bahorda Quyoncha bog‘ga kichkina urug‘ ekibdi.',
          '– Sen katta bo‘lib o‘sasan, – debdi u.',
        ],
      },
      {
        lines: ['Quyoncha har kuni urug‘ni sug‘oribdi, quyosh esa uni isitibdi.'],
        task: {
          prompt: 'Urug‘ o‘sishi uchun nima kerak?',
          options: ['Suv va quyosh', 'Konfet', 'O‘yinchoq'],
        },
      },
      {
        lines: [
          'Bir kuni yerdan yashil nihol chiqibdi!',
          'Quyoncha xursand bo‘lib sakrab ketibdi.',
        ],
      },
      {
        lines: ['Nihol kundan-kunga o‘sib boribdi.'],
        task: {
          prompt: 'Sencha, keyin nima bo‘ladi?',
          options: ['Katta gul ochiladi', 'Raketa uchadi', 'Qordan odam paydo bo‘ladi'],
        },
      },
      {
        lines: [
          'Yozda katta, sariq kungaboqar ochilibdi!',
          'Unga arilar uchib kelibdi, Quyoncha esa faxr bilan jilmayibdi.',
        ],
        task: {
          prompt: 'Rasmlarni tartib bilan qo‘y: avval, keyin, oxirida.',
          options: ['Urug‘ni sug‘ordi', 'Nihol chiqdi', 'Gul ochildi'],
        },
      },
    ],
    checks: [
      {
        prompt: 'Nega urug‘ o‘sdi?',
        options: ['Uni sug‘orishdi, quyosh isitdi', 'Yonida koptok o‘ynashdi', 'Oy chiqdi'],
      },
      { prompt: 'Yerdan avval nima chiqdi?', options: ['Yashil nihol', 'Katta gul', 'Olma'] },
      { prompt: 'Kungaboqarga kimlar uchib keldi?', options: ['Arilar', 'Baliqlar', 'Sigirlar'] },
      {
        prompt: 'Quyoncha har kuni nima qildi?',
        options: ['Urug‘ni sug‘ordi', 'Uxladi', 'Mashina haydadi'],
      },
      { prompt: 'Kungaboqar qachon ochildi?', options: ['Yozda', 'Qishda', 'Kuzda'] },
      { prompt: 'Kungaboqar qanday rangda edi?', options: ['Sariq', 'Qizil', 'Ko‘k'] },
    ],
  },
  'fox-kite': {
    title: 'Tulkivoy va varrak',
    scenes: [
      {
        lines: [
          'Tulkivoy yangi varrak yasabdi.',
          'U varrakni o‘tloqqa olib chiqibdi, lekin havo jimjit, shamol yo‘q ekan.',
        ],
      },
      {
        lines: ['Tulkivoy kutibdi, kutibdi.', 'Birdan shamol esa boshlabdi!'],
        task: {
          prompt: 'Sencha, endi varrakka nima bo‘ladi?',
          options: ['Varrak uchib ketadi', 'Varrak uxlab qoladi', 'Varrak suzib ketadi'],
        },
      },
      {
        lines: [
          'Shamol varrakni ilib olib, baland-baland ko‘taribdi.',
          'Tulkivoy ipni mahkam ushlab, quvonib yugura boshlabdi.',
        ],
      },
      {
        lines: [
          'Shamol tingach, varrak pastga tushib, daraxt shoxiga ilinib qolibdi.',
          '– Endi nima qilaman? – debdi Tulkivoy.',
        ],
        task: {
          prompt: 'Tulkivoyga kim yordam bera oladi?',
          options: ['Qushcha', 'Baliq', 'Shilliqqurt'],
        },
      },
      {
        lines: [
          'Qushcha uchib borib, varrakni shoxdan ehtiyotlab bo‘shatibdi.',
          'Endi do‘stlar varrakni navbatma-navbat uchirishadi.',
        ],
        task: {
          prompt: 'Rasmlarni tartib bilan qo‘y: avval, keyin, oxirida.',
          options: ['Varrak uchdi', 'Daraxtga ilindi', 'Qushcha yordam berdi'],
        },
      },
    ],
    checks: [
      {
        prompt: 'Nega avvaliga varrak uchmadi?',
        options: ['Shamol yo‘q edi', 'Yomg‘ir yog‘ayotgan edi', 'Kechasi edi'],
      },
      {
        prompt: 'Varrak nega osmonga ko‘tarildi?',
        options: ['Shamol esdi', 'Raketa itarib yubordi', 'Yomg‘ir yog‘di'],
      },
      {
        prompt: 'Shamol tinganda nima bo‘ldi?',
        options: ['Varrak daraxtga ilindi', 'Kamalak chiqdi', 'Varrak uyga uchib ketdi'],
      },
      { prompt: 'Tulkivoyga kim yordam berdi?', options: ['Qushcha', 'Baliq', 'Shilliqqurt'] },
      {
        prompt: 'Nega aynan Qushcha yordam bera oldi?',
        options: ['U ucha oladi', 'U sekin yuradi', 'U suza oladi'],
      },
      {
        prompt: 'Oxirida do‘stlar nima qilishdi?',
        options: ['Varrakni navbat bilan uchirishdi', 'Uxlab qolishdi', 'Baliq tutishdi'],
      },
    ],
  },
  'egg-chick': {
    title: 'Tuxumdan kim chiqdi?',
    scenes: [
      {
        lines: [
          'Tovuqona uyachasida oppoq tuxum ustida o‘tiribdi.',
          'U tuxumni qanotlari bilan isitibdi.',
        ],
      },
      {
        lines: [
          '– Nega tuxumni isityapsan? – deb so‘rabdi Echkicha.',
          '– Ichida kichkintoy o‘syapti, unga issiqlik kerak, – debdi Tovuqona.',
        ],
        task: {
          prompt: 'Tovuqona nega tuxumni isitdi?',
          options: ['Ichida jo‘ja o‘syapti', 'Uni koptok deb o‘yladi', 'U charchagan edi'],
        },
      },
      {
        lines: ['Bir kuni tuxum qimirlay boshlabdi. Tiq-tiq-tiq!'],
        task: {
          prompt: 'Sencha, keyin nima bo‘ladi?',
          options: ['Jo‘ja chiqadi', 'Mushukcha chiqadi', 'Tuxum uchib ketadi'],
        },
      },
      {
        lines: ['Po‘choq yorilibdi va undan kichkina Jo‘ja chiqibdi!', '– Chiy-chiy! – debdi u.'],
      },
      {
        lines: [
          'Tovuqona Jo‘jani bag‘riga bosibdi, Echkicha esa quvonib sakrabdi.',
          'Endi hovlida yangi do‘st bor!',
        ],
        task: {
          prompt: 'Rasmlarni tartib bilan qo‘y: avval, keyin, oxirida.',
          options: ['Tuxum', 'Tuxum yorildi', 'Jo‘ja yuribdi'],
        },
      },
    ],
    checks: [
      {
        prompt: 'Tovuqona uyada nima ustida o‘tirdi?',
        options: ['Tuxum ustida', 'Koptok ustida', 'Olma ustida'],
      },
      {
        prompt: 'Nega Tovuqona tuxumni isitdi?',
        options: ['Ichida jo‘ja o‘sayotgan edi', 'Uni koptok deb o‘yladi', 'Qish edi'],
      },
      {
        prompt: 'Tuxum qimirlaganda nima bo‘ldi?',
        options: ['Jo‘ja chiqdi', 'Kamalak chiqdi', 'Mushukcha chiqdi'],
      },
      { prompt: 'Tovuqona bilan kim gaplashdi?', options: ['Echkicha', 'Pingvin', 'Kit'] },
      {
        prompt: 'Oxirida hovlida kim paydo bo‘ldi?',
        options: ['Kichkina jo‘ja', 'Kuchukcha', 'Otcha'],
      },
      {
        prompt: 'Avval nima bo‘ldi?',
        options: ['Tovuqona tuxumni isitdi', 'Tuxum yorildi', 'Jo‘ja sayr qildi'],
      },
    ],
  },
}
