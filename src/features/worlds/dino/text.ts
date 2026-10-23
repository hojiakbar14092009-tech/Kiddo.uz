import i18n from '@/i18n'
import type { Language } from '@/content/languages'
import { useSettingsStore } from '@/store/settingsStore'

/*
 * The words of the Dinosaur world, per language (like the Koinot section,
 * they live with the world and load with it). Uzbek is the source type.
 * Facts are short and checked: sizes are compared with things a child knows
 * (a bus ≈ 12 m, a car ≈ 4.5 m, a giraffe ≈ 5 m, a floor ≈ 3 m).
 */

const uz = {
  title: 'Dinozavrlar vodiysi',
  intro: 'Dinozavrlar juda qadim zamonlarda yashagan. Ularni ko‘r, suyaklarini qazib top!',
  modes: {
    explore: { title: 'Dinozavrlarni ko‘r', text: 'Aylantir va qiziq joylarini bos' },
    dig: { title: 'Qazilma qazish', text: 'Qumni tozala va suyakni top' },
    quiz: { title: 'Dino viktorina', text: 'Savollarga javob ber' },
  },
  explore: {
    choose: 'Qaysi dinozavrni ko‘ramiz?',
    facts: 'Bilasanmi?',
    tapPoints: 'Raqamli tugmalarni bosib, qiziq joylarini bilib ol.',
    found: 'Barakalla! {{name}} haqida hammasini topding!',
    foundShort: 'Hammasi topildi',
    locked: 'Bu dinozavr PRO versiyada. Ota-onang yoqib berishi mumkin.',
    lockedTitle: 'Bu dinozavr PRO versiyada',
    lockedText: 'Hozircha bepul dinozavrlarni ko‘ramiz. PRO‘ni faqat ota-ona yoqadi.',
    backToList: 'Boshqa dinozavrlar',
    notDino: 'Uchuvchi sudralib yuruvchi',
  },
  dig: {
    start: 'Qazishni boshlash',
    how: 'Qumni barmoq bilan sur yoki bos.',
    brush: 'Qumni tozalash',
    sandLeft: 'Qum: {{percent}}% qoldi',
    found: 'Suyak topildi!',
    whose: 'Bu kimning suyagi?',
    hint: 'Suyakning shakliga qara: {{part}}.',
    step: '{{current}}-suyak, jami {{total}} ta',
  },
  quiz: {
    start: 'Viktorinani boshlash',
    eat: '{{name}} nima yegan?',
    whoMeat: 'Kim go‘sht yegan?',
    whoPlant: 'Kim o‘simlik yegan?',
    biggest: 'Eng katta dinozavr qaysi?',
    flew: 'Kim ucha olgan?',
    longer: 'Qaysi biri uzunroq bo‘lgan?',
    notDino: 'Qaysi biri dinozavr emas?',
    feature: {
      horns: 'Kimning uchta shoxi bo‘lgan?',
      neck: 'Kimning bo‘yni juda uzun bo‘lgan?',
      plates: 'Kimning orqasida katta plastinkalar bo‘lgan?',
      club: 'Kimning dumida to‘qmoq bo‘lgan?',
      arms: 'Kimning qo‘llari juda kalta bo‘lgan?',
      crest: 'Kimning boshida uzun toji bo‘lgan?',
    },
    hints: {
      eat: 'Tishlariga va tumshug‘iga qara.',
      who: 'O‘tkir tishlar go‘sht uchun, tumshuq o‘simlik uchun.',
      biggest: 'Eng uzun bo‘ynini top.',
      flew: 'Qanotlari bor jonivorni top.',
      longer: 'Braxiozavr eng uzuni, ankilozavr esa kaltaroq.',
      notDino: 'Uchuvchi sudralib yuruvchi dinozavr emas.',
      feature: 'Rasmlarga diqqat bilan qara.',
    },
  },
  result: {
    title: 'Zo‘r bo‘ldi!',
    score: '{{correct}} / {{total}} birinchi urinishda',
    levelUp: 'Keyingi safar savollar biroz qiyinroq bo‘ladi!',
    again: 'Yana o‘ynash',
    toWorld: 'Vodiyga qaytish',
  },
  diet: { plant: 'O‘simlik', meat: 'Go‘sht', fish: 'Baliq' },
  dinos: {
    trex: {
      name: 'Tiranozavr',
      facts: [
        'Tiranozavr maktab avtobusidek uzun bo‘lgan.',
        'U go‘sht yegan. Eng katta tishlari bananday uzun bo‘lgan.',
        'Uning qo‘llari juda kalta, har birida ikkitadan barmog‘i bo‘lgan.',
        'U ikki kuchli oyog‘ida yurgan.',
      ],
      spots: {
        teeth: { label: 'Katta tishlar', fact: 'Go‘shtni tishlash uchun o‘tkir tishlar.' },
        arms: { label: 'Kalta qo‘llar', fact: 'Kichkina qo‘llarida ikkitadan barmoq bo‘lgan.' },
        legs: { label: 'Kuchli oyoqlar', fact: 'U ikki katta oyog‘ida yurgan.' },
      },
      bone: 'o‘tkir tishli bosh suyagi',
    },
    triceratops: {
      name: 'Triseratops',
      facts: [
        'Triseratops ikkita mashinadek uzun bo‘lgan.',
        'U o‘simlik yegan va ularni to‘tiqushnikiga o‘xshash tumshug‘i bilan uzgan.',
        'Uning uchta shoxi bo‘lgan: ikkitasi uzun, burnidagisi esa kalta.',
        'Bo‘ynini katta suyak yoqa o‘rab turgan.',
      ],
      spots: {
        horns: { label: 'Uchta shox', fact: 'Ikkita uzun shox va burnida bitta kalta shox.' },
        frill: { label: 'Suyak yoqa', fact: 'Bo‘yni atrofidagi katta suyak yoqa.' },
        beak: { label: 'Tumshuq', fact: 'O‘simliklarni uzish uchun tumshuq.' },
      },
      bone: 'shoxli bosh suyagi',
    },
    stegosaurus: {
      name: 'Stegozavr',
      facts: [
        'Stegozavr ikkita mashinadek uzun bo‘lgan.',
        'U yerga yaqin o‘sgan past o‘simliklarni yegan.',
        'Orqasida ikki qator katta plastinkalar bo‘lgan.',
        'Dumida o‘zini himoya qilish uchun to‘rtta o‘tkir tikan bo‘lgan.',
      ],
      spots: {
        plates: { label: 'Orqa plastinkalari', fact: 'Orqasida ikki qator katta plastinkalar.' },
        spikes: { label: 'Dum tikanlari', fact: 'Himoya uchun to‘rtta o‘tkir tikan.' },
        head: { label: 'Kichkina bosh', fact: 'Katta tanasiga nisbatan boshi kichkina bo‘lgan.' },
      },
      bone: 'orqa plastinkasi',
    },
    brachiosaurus: {
      name: 'Braxiozavr',
      facts: [
        'Braxiozavr to‘rt qavatli uydek baland bo‘lgan.',
        'U eng katta dinozavrlardan biri: uzunligi ikkita avtobusdek bo‘lgan.',
        'U baland daraxtlarning uchidagi barglarni yegan.',
        'Oldingi oyoqlari orqa oyoqlaridan uzunroq bo‘lgan.',
      ],
      spots: {
        neck: { label: 'Uzun bo‘yin', fact: 'Baland daraxtlarga yetish uchun uzun bo‘yin.' },
        legs: { label: 'Oldingi oyoqlar', fact: 'Oldingi oyoqlari orqadagilaridan uzun.' },
        tail: { label: 'Dum', fact: 'Uzun va kuchli dum.' },
      },
      bone: 'uzun bo‘yin suyaklari',
    },
    pteranodon: {
      name: 'Pteranodon',
      facts: [
        'Pteranodon dinozavr emas, u uchuvchi sudralib yuruvchi bo‘lgan. U dinozavrlar bilan bir davrda yashagan.',
        'Uning yoyilgan qanotlari jirafaning bo‘yidek keng bo‘lgan.',
        'U dengizdan baliq tutib yegan.',
        'Uning tishlari bo‘lmagan, lekin uzun tumshug‘i va boshida toji bo‘lgan.',
      ],
      spots: {
        wings: { label: 'Qanotlar', fact: 'Teridan bo‘lgan katta qanotlar.' },
        crest: { label: 'Toj', fact: 'Boshining orqasidagi uzun toj.' },
        beak: { label: 'Tumshuq', fact: 'Tishsiz uzun tumshuq.' },
      },
      bone: 'tojli bosh suyagi',
    },
    ankylosaurus: {
      name: 'Ankilozavr',
      facts: [
        'Ankilozavr mashinadan uzunroq bo‘lgan.',
        'U past o‘simliklarni yegan.',
        'Orqasini qalqondek qattiq suyak plastinkalar qoplagan.',
        'Dumining uchida og‘ir suyak to‘qmoq bo‘lgan.',
      ],
      spots: {
        club: { label: 'Dum to‘qmog‘i', fact: 'Himoya uchun og‘ir suyak to‘qmoq.' },
        armour: { label: 'Qalqon', fact: 'Orqasidagi qattiq suyak plastinkalar.' },
        head: { label: 'Bosh', fact: 'Boshining orqasida kichik shoxlari bo‘lgan.' },
      },
      bone: 'dum to‘qmog‘i',
    },
  },
}

export type DinoText = typeof uz

const ru: DinoText = {
  title: 'Долина динозавров',
  intro: 'Динозавры жили очень-очень давно. Рассмотри их и раскопай их кости!',
  modes: {
    explore: { title: 'Рассмотреть динозавров', text: 'Крути и нажимай на интересные места' },
    dig: { title: 'Раскопки', text: 'Смети песок и найди кость' },
    quiz: { title: 'Дино-викторина', text: 'Ответь на вопросы' },
  },
  explore: {
    choose: 'Какого динозавра рассмотрим?',
    facts: 'А ты знаешь?',
    tapPoints: 'Нажимай на кнопки с цифрами и узнавай интересное.',
    found: 'Молодец! {{name}} — всё найдено!',
    foundShort: 'Всё найдено',
    locked: 'Этот динозавр есть в PRO. Его могут включить родители.',
    lockedTitle: 'Этот динозавр есть в PRO',
    lockedText: 'Пока смотрим бесплатных динозавров. PRO включают только родители.',
    backToList: 'Другие динозавры',
    notDino: 'Летающий ящер',
  },
  dig: {
    start: 'Начать раскопки',
    how: 'Води пальцем по песку или нажимай.',
    brush: 'Смести песок',
    sandLeft: 'Песок: осталось {{percent}}%',
    found: 'Кость найдена!',
    whose: 'Чья это кость?',
    hint: 'Посмотри на форму кости: {{part}}.',
    step: 'Кость {{current}} из {{total}}',
  },
  quiz: {
    start: 'Начать викторину',
    eat: 'Что ел {{name}}?',
    whoMeat: 'Кто ел мясо?',
    whoPlant: 'Кто ел растения?',
    biggest: 'Какой динозавр самый большой?',
    flew: 'Кто умел летать?',
    longer: 'Кто был длиннее?',
    notDino: 'Кто из них не динозавр?',
    feature: {
      horns: 'У кого было три рога?',
      neck: 'У кого была очень длинная шея?',
      plates: 'У кого на спине были большие пластины?',
      club: 'У кого на хвосте была булава?',
      arms: 'У кого были очень короткие лапки?',
      crest: 'У кого на голове был длинный гребень?',
    },
    hints: {
      eat: 'Посмотри на зубы и на клюв.',
      who: 'Острые зубы — для мяса, клюв — для растений.',
      biggest: 'Найди самую длинную шею.',
      flew: 'Найди того, у кого есть крылья.',
      longer: 'Брахиозавр самый длинный, а анкилозавр короче.',
      notDino: 'Летающий ящер — не динозавр.',
      feature: 'Посмотри на картинки внимательно.',
    },
  },
  result: {
    title: 'Здорово!',
    score: '{{correct}} из {{total}} с первой попытки',
    levelUp: 'В следующий раз вопросы будут чуть сложнее!',
    again: 'Ещё раз',
    toWorld: 'В долину',
  },
  diet: { plant: 'Растения', meat: 'Мясо', fish: 'Рыба' },
  dinos: {
    trex: {
      name: 'Тираннозавр',
      facts: [
        'Тираннозавр был длиной со школьный автобус.',
        'Он ел мясо. Его самые большие зубы были длиной с банан.',
        'Его передние лапки были очень короткими, на каждой по два пальца.',
        'Он ходил на двух сильных ногах.',
      ],
      spots: {
        teeth: { label: 'Большие зубы', fact: 'Острые зубы, чтобы кусать мясо.' },
        arms: { label: 'Короткие лапки', fact: 'Маленькие лапки с двумя пальцами.' },
        legs: { label: 'Сильные ноги', fact: 'Он ходил на двух больших ногах.' },
      },
      bone: 'череп с острыми зубами',
    },
    triceratops: {
      name: 'Трицератопс',
      facts: [
        'Трицератопс был длиной примерно с две машины.',
        'Он ел растения и срывал их клювом, похожим на клюв попугая.',
        'У него было три рога: два длинных и один короткий на носу.',
        'Шею закрывал большой костяной воротник.',
      ],
      spots: {
        horns: { label: 'Три рога', fact: 'Два длинных рога и один короткий на носу.' },
        frill: { label: 'Костяной воротник', fact: 'Большой воротник вокруг шеи.' },
        beak: { label: 'Клюв', fact: 'Клюв, чтобы срывать растения.' },
      },
      bone: 'череп с рогами',
    },
    stegosaurus: {
      name: 'Стегозавр',
      facts: [
        'Стегозавр был длиной примерно с две машины.',
        'Он ел низкие растения у самой земли.',
        'На спине у него было два ряда больших пластин.',
        'На хвосте было четыре острых шипа для защиты.',
      ],
      spots: {
        plates: { label: 'Пластины на спине', fact: 'Два ряда больших пластин.' },
        spikes: { label: 'Шипы на хвосте', fact: 'Четыре острых шипа для защиты.' },
        head: {
          label: 'Маленькая голова',
          fact: 'Голова была маленькой для такого большого тела.',
        },
      },
      bone: 'пластина со спины',
    },
    brachiosaurus: {
      name: 'Брахиозавр',
      facts: [
        'Брахиозавр был высотой с четырёхэтажный дом.',
        'Он был одним из самых больших динозавров — длиной примерно с два автобуса.',
        'Он ел листья с верхушек высоких деревьев.',
        'Его передние ноги были длиннее задних.',
      ],
      spots: {
        neck: { label: 'Длинная шея', fact: 'Длинная шея, чтобы доставать до высоких деревьев.' },
        legs: { label: 'Передние ноги', fact: 'Передние ноги длиннее задних.' },
        tail: { label: 'Хвост', fact: 'Длинный сильный хвост.' },
      },
      bone: 'длинные позвонки шеи',
    },
    pteranodon: {
      name: 'Птеранодон',
      facts: [
        'Птеранодон — не динозавр, а летающий ящер. Он жил в одно время с динозаврами.',
        'Его раскрытые крылья были шириной с рост жирафа.',
        'Он ловил в море рыбу и ел её.',
        'У него не было зубов, но был длинный клюв и гребень на голове.',
      ],
      spots: {
        wings: { label: 'Крылья', fact: 'Большие крылья из кожи.' },
        crest: { label: 'Гребень', fact: 'Длинный гребень на затылке.' },
        beak: { label: 'Клюв', fact: 'Длинный клюв без зубов.' },
      },
      bone: 'череп с гребнем',
    },
    ankylosaurus: {
      name: 'Анкилозавр',
      facts: [
        'Анкилозавр был длиннее машины.',
        'Он ел низкие растения.',
        'Его спину покрывал твёрдый костяной панцирь, как щит.',
        'На конце хвоста у него была тяжёлая костяная булава.',
      ],
      spots: {
        club: { label: 'Булава на хвосте', fact: 'Тяжёлая костяная булава для защиты.' },
        armour: { label: 'Панцирь', fact: 'Твёрдые костяные пластины на спине.' },
        head: { label: 'Голова', fact: 'На затылке у него были маленькие рожки.' },
      },
      bone: 'булава с хвоста',
    },
  },
}

const en: DinoText = {
  title: 'Dinosaur Valley',
  intro: 'Dinosaurs lived a very, very long time ago. Look at them and dig up their bones!',
  modes: {
    explore: { title: 'Meet the dinosaurs', text: 'Turn them and tap the special parts' },
    dig: { title: 'Fossil dig', text: 'Brush the sand away and find a bone' },
    quiz: { title: 'Dino quiz', text: 'Answer the questions' },
  },
  explore: {
    choose: 'Which dinosaur shall we look at?',
    facts: 'Did you know?',
    tapPoints: 'Tap the numbered buttons to find out more.',
    found: 'Well done! You found everything about the {{name}}!',
    foundShort: 'All found',
    locked: 'This dinosaur is in PRO. A grown-up can turn it on.',
    lockedTitle: 'This dinosaur is in PRO',
    lockedText: 'For now we can look at the free dinosaurs. Only a grown-up can turn on PRO.',
    backToList: 'Other dinosaurs',
    notDino: 'Flying reptile',
  },
  dig: {
    start: 'Start digging',
    how: 'Rub the sand with your finger or tap it.',
    brush: 'Brush the sand',
    sandLeft: 'Sand: {{percent}}% left',
    found: 'You found a bone!',
    whose: 'Whose bone is this?',
    hint: 'Look at the shape: {{part}}.',
    step: 'Bone {{current}} of {{total}}',
  },
  quiz: {
    start: 'Start the quiz',
    eat: 'What did the {{name}} eat?',
    whoMeat: 'Who ate meat?',
    whoPlant: 'Who ate plants?',
    biggest: 'Which dinosaur was the biggest?',
    flew: 'Who could fly?',
    longer: 'Which one was longer?',
    notDino: 'Which one is not a dinosaur?',
    feature: {
      horns: 'Who had three horns?',
      neck: 'Who had a very long neck?',
      plates: 'Who had big plates on its back?',
      club: 'Who had a club on its tail?',
      arms: 'Who had very short arms?',
      crest: 'Who had a long crest on its head?',
    },
    hints: {
      eat: 'Look at the teeth and the beak.',
      who: 'Sharp teeth are for meat, a beak is for plants.',
      biggest: 'Find the longest neck.',
      flew: 'Find the one with wings.',
      longer: 'Brachiosaurus is the longest, Ankylosaurus is shorter.',
      notDino: 'The flying reptile is not a dinosaur.',
      feature: 'Look at the pictures carefully.',
    },
  },
  result: {
    title: 'Great job!',
    score: '{{correct}} of {{total}} on the first try',
    levelUp: 'Next time the questions will be a little harder!',
    again: 'Play again',
    toWorld: 'Back to the valley',
  },
  diet: { plant: 'Plants', meat: 'Meat', fish: 'Fish' },
  dinos: {
    trex: {
      name: 'Tyrannosaurus rex',
      facts: [
        'T. rex was as long as a school bus.',
        'It ate meat. Its biggest teeth were as long as a banana.',
        'Its arms were very short, with two fingers on each hand.',
        'It walked on two strong legs.',
      ],
      spots: {
        teeth: { label: 'Big teeth', fact: 'Sharp teeth for biting meat.' },
        arms: { label: 'Short arms', fact: 'Tiny arms with two fingers each.' },
        legs: { label: 'Strong legs', fact: 'It walked on two big legs.' },
      },
      bone: 'a skull with sharp teeth',
    },
    triceratops: {
      name: 'Triceratops',
      facts: [
        'Triceratops was about as long as two cars.',
        'It ate plants and bit them off with a beak like a parrot’s.',
        'It had three horns: two long ones and a short one on its nose.',
        'A big bony frill grew around its neck.',
      ],
      spots: {
        horns: { label: 'Three horns', fact: 'Two long horns and a short one on the nose.' },
        frill: { label: 'Bony frill', fact: 'A big frill around its neck.' },
        beak: { label: 'Beak', fact: 'A beak for biting off plants.' },
      },
      bone: 'a skull with horns',
    },
    stegosaurus: {
      name: 'Stegosaurus',
      facts: [
        'Stegosaurus was about as long as two cars.',
        'It ate low plants that grew near the ground.',
        'Big plates stood in two rows along its back.',
        'Its tail had four sharp spikes to keep it safe.',
      ],
      spots: {
        plates: { label: 'Back plates', fact: 'Two rows of big plates.' },
        spikes: { label: 'Tail spikes', fact: 'Four sharp spikes to keep it safe.' },
        head: { label: 'Small head', fact: 'Its head was small for such a big body.' },
      },
      bone: 'a back plate',
    },
    brachiosaurus: {
      name: 'Brachiosaurus',
      facts: [
        'Brachiosaurus was as tall as a house with four floors.',
        'It was one of the biggest dinosaurs, about as long as two buses.',
        'It ate leaves from the tops of tall trees.',
        'Its front legs were longer than its back legs.',
      ],
      spots: {
        neck: { label: 'Long neck', fact: 'A long neck to reach tall trees.' },
        legs: { label: 'Front legs', fact: 'Its front legs were longer than its back legs.' },
        tail: { label: 'Tail', fact: 'A long, strong tail.' },
      },
      bone: 'long neck bones',
    },
    pteranodon: {
      name: 'Pteranodon',
      facts: [
        'Pteranodon was not a dinosaur but a flying reptile. It lived at the same time as dinosaurs.',
        'Its open wings were as wide as a giraffe is tall.',
        'It caught fish in the sea to eat.',
        'It had no teeth, but a long beak and a crest on its head.',
      ],
      spots: {
        wings: { label: 'Wings', fact: 'Big wings made of skin.' },
        crest: { label: 'Crest', fact: 'A long crest on the back of its head.' },
        beak: { label: 'Beak', fact: 'A long beak with no teeth.' },
      },
      bone: 'a skull with a crest',
    },
    ankylosaurus: {
      name: 'Ankylosaurus',
      facts: [
        'Ankylosaurus was longer than a car.',
        'It ate low plants.',
        'Hard bony armour covered its back like a shield.',
        'Its tail ended in a heavy bony club.',
      ],
      spots: {
        club: { label: 'Tail club', fact: 'A heavy bony club to keep it safe.' },
        armour: { label: 'Armour', fact: 'Hard bony plates on its back.' },
        head: { label: 'Head', fact: 'Small horns on the back of its head.' },
      },
      bone: 'a tail club',
    },
  },
}

export const DINO_TEXT: Record<Language, DinoText> = { uz, ru, en }

/** Fills `{{name}}`-style places (the texts above are not in the typed i18n tree). */
export function fill(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}

/**
 * The hotspot labels are also i18n keys (`dinoWorld.<dino>.<spot>`), because
 * the shared 3D Explorer reads hotspot labels through i18next.
 */
export const HOTSPOT_NAMESPACE = 'dinoWorld'

function registerHotspotLabels() {
  for (const [language, text] of Object.entries(DINO_TEXT)) {
    const labels: Record<string, Record<string, string>> = {}
    for (const [dino, value] of Object.entries(text.dinos)) {
      labels[dino] = Object.fromEntries(
        Object.entries(value.spots).map(([spot, item]) => [spot, item.label]),
      )
    }
    i18n.addResourceBundle(language, 'translation', { [HOTSPOT_NAMESPACE]: labels }, true, true)
  }
}
registerHotspotLabels()

export function useDinoLanguage(): Language {
  return useSettingsStore((state) => state.language) ?? 'uz'
}

export function useDinoText(): DinoText {
  return DINO_TEXT[useDinoLanguage()]
}
