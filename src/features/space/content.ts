import type { Language } from '@/content/languages'

/*
 * Everything the Koinot section says or shows, written separately for each
 * language (never translated word by word at runtime). Facts are kept short
 * and true: the Sun is a star (never a planet), the Earth is the planet we
 * live on, the Moon is the Earth's natural satellite, and the eight planets go
 * Mercury → Neptune.
 */

export const PLANETS = [
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
] as const
export type PlanetId = (typeof PLANETS)[number]

/** Objects that have their own 3D model. */
export const BODIES = ['sun', ...PLANETS, 'moon'] as const
export type BodyId = (typeof BODIES)[number]

/** Everything a child can meet here: the bodies plus the stars of the night sky. */
export type SpaceId = BodyId | 'stars'
export const SPACE_IDS: readonly SpaceId[] = [...BODIES, 'stars']

export type Kind = 'star' | 'planet' | 'moon'

export const KIND: Record<SpaceId, Kind> = {
  sun: 'star',
  stars: 'star',
  moon: 'moon',
  mercury: 'planet',
  venus: 'planet',
  earth: 'planet',
  mars: 'planet',
  jupiter: 'planet',
  saturn: 'planet',
  uranus: 'planet',
  neptune: 'planet',
}

export const isPlanet = (id: SpaceId): id is PlanetId => KIND[id] === 'planet'

/** Place from the Sun (1 = Mercury … 8 = Neptune). */
export function orderOfPlanet(id: PlanetId): number {
  return PLANETS.indexOf(id) + 1
}

/** The picture of an object: our own planet renders, or the 3D star for the night sky. */
export function pictureOf(id: SpaceId): string {
  return id === 'stars' ? 'glowing-star' : `space/${id}`
}

interface ObjectText {
  name: string
  /** One or two short facts for the card. */
  facts: readonly [string, string]
  /** What it looks like – the help hint. */
  look: string
  /** "Find …" task. */
  find: string
  /** A question about what you can see (planets only). */
  feature?: string
  /** "Which planet comes after …?" (Mercury … Uranus). */
  after?: string
}

interface LanguagePack {
  objects: Record<SpaceId, ObjectText>
  kind: Record<Kind, string>
  ui: {
    title: string
    intro: string
    lessons: string
    lessonDone: string
    lessonDoneText: string
    learnFirst: string
    exhibit: string
    exhibitNote: string
    exhibitTap: string
    dragHint: string
    keysHint: string
    pictureOnly: string
    close: string
    listen: string
    start: string
    practice: string
    meet: string
    taught: string
    orderTitle: string
    orderPlaced: string
    lessonTitles: Record<string, string>
  }
  /** Sentences said by the mascot or read aloud. */
  say: {
    hello: string
    correct: readonly string[]
    wrong: string
    orderInner: string
    orderOuter: string
    orderDone: string
    firstPlanet: string
    whichPlanet: string
    whichStar: string
    whichMoon: string
    whichIsPlanet: string
    kindHelp: string
    orderHelp: string
    kindsCards: readonly [string, string, string]
    lessonDone: string
  }
}

const UZ: LanguagePack = {
  objects: {
    sun: {
      name: 'Quyosh',
      facts: ['Quyosh — yulduz. U sayyora emas.', 'Quyosh bizga yorug‘lik va issiqlik beradi.'],
      look: 'Quyosh — katta, sariq va porlab turadi.',
      find: 'Quyosh qani?',
    },
    stars: {
      name: 'Yulduzlar',
      facts: [
        'Yulduzlar kechasi osmonda porlaydi.',
        'Quyosh ham yulduz. U bizga eng yaqin yulduz.',
      ],
      look: 'Yulduzlar osmonda miltillab turadi.',
      find: 'Yulduzni top!',
    },
    moon: {
      name: 'Oy',
      facts: ['Oy — Yerning tabiiy yo‘ldoshi.', 'Oy Yer atrofida aylanadi.'],
      look: 'Oy — kulrang, unda chuqurchalar ko‘p.',
      find: 'Oyni top!',
    },
    mercury: {
      name: 'Merkuriy',
      facts: ['Merkuriy — Quyoshga eng yaqin sayyora.', 'U eng kichik sayyora.'],
      look: 'Merkuriy — kichkina va kulrang, chuqurchalari bor.',
      find: 'Merkuriyni top!',
      feature: 'Quyoshga eng yaqin sayyora qaysi?',
      after: 'Merkuriydan keyin qaysi sayyora keladi?',
    },
    venus: {
      name: 'Venera',
      facts: ['Venera — eng issiq sayyora.', 'U Quyoshdan ikkinchi sayyora.'],
      look: 'Venera — sarg‘ish bulutlar bilan o‘ralgan.',
      find: 'Venerani top!',
      feature: 'Qaysi sayyora sarg‘ish bulutlar bilan o‘ralgan?',
      after: 'Veneradan keyin qaysi sayyora keladi?',
    },
    earth: {
      name: 'Yer',
      facts: ['Yer — biz yashaydigan sayyora.', 'Yerda suv, havo va o‘simliklar bor.'],
      look: 'Yer — ko‘k dengizlar va yashil quruqliklar.',
      find: 'Yerni top!',
      feature: 'Biz qaysi sayyorada yashaymiz?',
      after: 'Yerdan keyin qaysi sayyora keladi?',
    },
    mars: {
      name: 'Mars',
      facts: ['Mars — qizil sayyora.', 'Mars Yerdan keyin keladi.'],
      look: 'Mars — qizil rangda.',
      find: 'Marsni top!',
      feature: 'Qaysi sayyora qizil rangda?',
      after: 'Marsdan keyin qaysi sayyora keladi?',
    },
    jupiter: {
      name: 'Yupiter',
      facts: ['Yupiter — eng katta sayyora.', 'Unda katta qizil dog‘ bor.'],
      look: 'Yupiter — chiziq-chiziq, katta qizil dog‘i bor.',
      find: 'Yupiterni top!',
      feature: 'Qaysi sayyorada katta qizil dog‘ bor?',
      after: 'Yupiterdan keyin qaysi sayyora keladi?',
    },
    saturn: {
      name: 'Saturn',
      facts: ['Saturnning halqalari aniq ko‘rinadi.', 'Halqalar muz va toshlardan iborat.'],
      look: 'Saturn atrofida keng halqalar bor.',
      find: 'Saturnni top!',
      feature: 'Qaysi sayyoraning halqalari aniq ko‘rinib turibdi?',
      after: 'Saturndan keyin qaysi sayyora keladi?',
    },
    uranus: {
      name: 'Uran',
      facts: ['Uran — och havorang sayyora.', 'U yonboshlab aylanadi.'],
      look: 'Uran — och havorang, nozik halqasi bor.',
      find: 'Uranni top!',
      feature: 'Qaysi sayyora och havorang?',
      after: 'Urandan keyin qaysi sayyora keladi?',
    },
    neptune: {
      name: 'Neptun',
      facts: ['Neptun — to‘q ko‘k sayyora.', 'U Quyoshdan eng uzoq sayyora.'],
      look: 'Neptun — to‘q ko‘k rangda.',
      find: 'Neptunni top!',
      feature: 'Qaysi sayyora to‘q ko‘k rangda?',
    },
  },
  kind: { star: 'Yulduz', planet: 'Sayyora', moon: 'Yerning yo‘ldoshi' },
  ui: {
    title: 'Koinot',
    intro: 'Quyosh, sayyoralar va yulduzlar bilan tanishamiz.',
    lessons: 'Darslar',
    lessonDone: 'Dars tugadi!',
    lessonDoneText: 'Endi qisqa tekshiruvni ham bajarsa bo‘ladi.',
    learnFirst: 'Tekshiruvdan oldin bitta darsni o‘tamiz.',
    exhibit: 'Quyosh tizimi',
    exhibitNote: 'O‘lcham va masofalar shartli',
    exhibitTap: 'Bittasini bos va yaqindan ko‘r.',
    dragHint: 'Barmog‘ing bilan sur – aylantir!',
    keysHint: 'Strelka tugmalari bilan ham aylantirsa bo‘ladi.',
    pictureOnly: 'Bu qurilmada 3D ochilmadi, rasmini ko‘ramiz.',
    close: 'Yopish',
    listen: 'Tinglash',
    start: 'Boshlash',
    practice: 'Mashq',
    meet: 'Tanishamiz',
    taught: 'O‘tildi',
    orderTitle: 'Tartib bilan',
    orderPlaced: 'Joylashtirildi',
    lessonTitles: {
      '4': 'Quyosh, Yer, Oy va yulduzlar',
      '5-1': 'Yer, Mars, Saturn',
      '5-2': 'Merkuriy, Venera, Yupiter',
      '5-3': 'Uran va Neptun',
      '6-1': 'Birinchi to‘rtta sayyora',
      '6-2': 'Keyingi to‘rtta sayyora',
      '6-3': 'Yulduz, sayyora va yo‘ldosh',
    },
  },
  say: {
    hello: 'Koinotga xush kelibsan! Qaysi darsdan boshlaymiz?',
    correct: ['To‘g‘ri! Barakalla!', 'Zo‘r, topding!', 'Ajoyib!'],
    wrong: 'Yana bir urinib ko‘r!',
    orderInner: 'Sayyoralarni Quyoshdan boshlab tartib bilan bos.',
    orderOuter: 'Marsdan keyingi sayyoralarni tartib bilan bos.',
    orderDone: 'Hammasi o‘z joyida! Barakalla!',
    firstPlanet: 'Quyoshdan boshlab birinchi sayyora qaysi?',
    whichPlanet: 'Bu qaysi sayyora?',
    whichStar: 'Qaysi biri yulduz?',
    whichMoon: 'Qaysi biri Yerning tabiiy yo‘ldoshi?',
    whichIsPlanet: 'Qaysi biri sayyora?',
    kindHelp: 'Quyosh — yulduz. Oy — Yerning yo‘ldoshi. Yer, Mars va boshqalar — sayyoralar.',
    orderHelp: 'Tartib: Merkuriy, Venera, Yer, Mars, Yupiter, Saturn, Uran, Neptun.',
    kindsCards: [
      'Yulduz o‘zi porlaydi va issiqlik beradi. Quyosh — yulduz.',
      'Sayyora o‘zi porlamaydi. U Quyosh atrofida aylanadi.',
      'Oy — Yerning tabiiy yo‘ldoshi. U Yer atrofida aylanadi.',
    ],
    lessonDone: 'Dars tugadi! Sen ko‘p narsani bilib olding!',
  },
}

const RU: LanguagePack = {
  objects: {
    sun: {
      name: 'Солнце',
      facts: ['Солнце — это звезда, а не планета.', 'Солнце дарит нам свет и тепло.'],
      look: 'Солнце большое, жёлтое и светится.',
      find: 'Где Солнце?',
    },
    stars: {
      name: 'Звёзды',
      facts: ['Звёзды светят ночью на небе.', 'Солнце — тоже звезда, самая близкая к нам.'],
      look: 'Звёзды мерцают на небе.',
      find: 'Найди звезду!',
    },
    moon: {
      name: 'Луна',
      facts: ['Луна — естественный спутник Земли.', 'Луна летает вокруг Земли.'],
      look: 'Луна серая, на ней много ямок-кратеров.',
      find: 'Найди Луну!',
    },
    mercury: {
      name: 'Меркурий',
      facts: ['Меркурий — самая близкая к Солнцу планета.', 'Это самая маленькая планета.'],
      look: 'Меркурий маленький и серый, весь в кратерах.',
      find: 'Найди Меркурий!',
      feature: 'Какая планета ближе всех к Солнцу?',
      after: 'Какая планета идёт после Меркурия?',
    },
    venus: {
      name: 'Венера',
      facts: ['Венера — самая горячая планета.', 'Это вторая планета от Солнца.'],
      look: 'Венера укрыта желтоватыми облаками.',
      find: 'Найди Венеру!',
      feature: 'Какая планета укрыта желтоватыми облаками?',
      after: 'Какая планета идёт после Венеры?',
    },
    earth: {
      name: 'Земля',
      facts: ['Земля — планета, на которой мы живём.', 'На Земле есть вода, воздух и растения.'],
      look: 'Земля — синие моря и зелёная суша.',
      find: 'Найди Землю!',
      feature: 'На какой планете мы живём?',
      after: 'Какая планета идёт после Земли?',
    },
    mars: {
      name: 'Марс',
      facts: ['Марс — красная планета.', 'Марс идёт сразу после Земли.'],
      look: 'Марс красного цвета.',
      find: 'Найди Марс!',
      feature: 'Какая планета красного цвета?',
      after: 'Какая планета идёт после Марса?',
    },
    jupiter: {
      name: 'Юпитер',
      facts: ['Юпитер — самая большая планета.', 'На нём есть большое красное пятно.'],
      look: 'Юпитер полосатый, у него большое красное пятно.',
      find: 'Найди Юпитер!',
      feature: 'На какой планете есть большое красное пятно?',
      after: 'Какая планета идёт после Юпитера?',
    },
    saturn: {
      name: 'Сатурн',
      facts: ['У Сатурна хорошо видны кольца.', 'Кольца состоят изо льда и камней.'],
      look: 'Вокруг Сатурна широкие кольца.',
      find: 'Найди Сатурн!',
      feature: 'У какой планеты хорошо видны кольца?',
      after: 'Какая планета идёт после Сатурна?',
    },
    uranus: {
      name: 'Уран',
      facts: ['Уран — светло-голубая планета.', 'Он вращается, будто лёжа на боку.'],
      look: 'Уран светло-голубой, у него тонкое колечко.',
      find: 'Найди Уран!',
      feature: 'Какая планета светло-голубая?',
      after: 'Какая планета идёт после Урана?',
    },
    neptune: {
      name: 'Нептун',
      facts: ['Нептун — тёмно-синяя планета.', 'Это самая далёкая от Солнца планета.'],
      look: 'Нептун тёмно-синего цвета.',
      find: 'Найди Нептун!',
      feature: 'Какая планета тёмно-синего цвета?',
    },
  },
  kind: { star: 'Звезда', planet: 'Планета', moon: 'Спутник Земли' },
  ui: {
    title: 'Космос',
    intro: 'Знакомимся с Солнцем, планетами и звёздами.',
    lessons: 'Уроки',
    lessonDone: 'Урок пройден!',
    lessonDoneText: 'Теперь можно пройти короткую проверку.',
    learnFirst: 'Перед проверкой пройдём хотя бы один урок.',
    exhibit: 'Солнечная система',
    exhibitNote: 'Размеры и расстояния условные',
    exhibitTap: 'Нажми на любую и рассмотри поближе.',
    dragHint: 'Проведи пальцем – и поверни!',
    keysHint: 'Поворачивать можно и стрелками.',
    pictureOnly: 'На этом устройстве 3D не открылось, смотрим картинку.',
    close: 'Закрыть',
    listen: 'Слушать',
    start: 'Начать',
    practice: 'Упражнение',
    meet: 'Знакомимся',
    taught: 'Пройдено',
    orderTitle: 'По порядку',
    orderPlaced: 'На месте',
    lessonTitles: {
      '4': 'Солнце, Земля, Луна и звёзды',
      '5-1': 'Земля, Марс, Сатурн',
      '5-2': 'Меркурий, Венера, Юпитер',
      '5-3': 'Уран и Нептун',
      '6-1': 'Первые четыре планеты',
      '6-2': 'Следующие четыре планеты',
      '6-3': 'Звезда, планета и спутник',
    },
  },
  say: {
    hello: 'Добро пожаловать в космос! С какого урока начнём?',
    correct: ['Верно! Молодец!', 'Здорово, нашёл!', 'Отлично!'],
    wrong: 'Попробуй ещё раз!',
    orderInner: 'Нажимай на планеты по порядку, начиная от Солнца.',
    orderOuter: 'Нажимай по порядку на планеты, которые идут после Марса.',
    orderDone: 'Все на своих местах! Молодец!',
    firstPlanet: 'Какая планета первая от Солнца?',
    whichPlanet: 'Что это за планета?',
    whichStar: 'Что из этого звезда?',
    whichMoon: 'Что из этого — естественный спутник Земли?',
    whichIsPlanet: 'Что из этого планета?',
    kindHelp: 'Солнце — звезда. Луна — спутник Земли. Земля, Марс и другие — планеты.',
    orderHelp: 'Порядок: Меркурий, Венера, Земля, Марс, Юпитер, Сатурн, Уран, Нептун.',
    kindsCards: [
      'Звезда светится сама и даёт тепло. Солнце — звезда.',
      'Планета сама не светится. Она летает вокруг Солнца.',
      'Луна — естественный спутник Земли. Она летает вокруг Земли.',
    ],
    lessonDone: 'Урок пройден! Ты узнал много нового!',
  },
}

const EN: LanguagePack = {
  objects: {
    sun: {
      name: 'The Sun',
      facts: ['The Sun is a star, not a planet.', 'The Sun gives us light and warmth.'],
      look: 'The Sun is big, yellow and glowing.',
      find: 'Where is the Sun?',
    },
    stars: {
      name: 'Stars',
      facts: ['Stars shine in the sky at night.', 'The Sun is a star too – the closest one to us.'],
      look: 'Stars twinkle in the sky.',
      find: 'Find a star!',
    },
    moon: {
      name: 'The Moon',
      facts: ['The Moon is Earth’s natural satellite.', 'The Moon goes around the Earth.'],
      look: 'The Moon is grey, with lots of craters.',
      find: 'Find the Moon!',
    },
    mercury: {
      name: 'Mercury',
      facts: ['Mercury is the planet closest to the Sun.', 'It is the smallest planet.'],
      look: 'Mercury is small and grey, with craters.',
      find: 'Find Mercury!',
      feature: 'Which planet is closest to the Sun?',
      after: 'Which planet comes after Mercury?',
    },
    venus: {
      name: 'Venus',
      facts: ['Venus is the hottest planet.', 'It is the second planet from the Sun.'],
      look: 'Venus is wrapped in yellowish clouds.',
      find: 'Find Venus!',
      feature: 'Which planet is wrapped in yellowish clouds?',
      after: 'Which planet comes after Venus?',
    },
    earth: {
      name: 'The Earth',
      facts: ['The Earth is the planet we live on.', 'It has water, air and plants.'],
      look: 'The Earth has blue seas and green land.',
      find: 'Find the Earth!',
      feature: 'Which planet do we live on?',
      after: 'Which planet comes after the Earth?',
    },
    mars: {
      name: 'Mars',
      facts: ['Mars is the red planet.', 'Mars comes right after the Earth.'],
      look: 'Mars is red.',
      find: 'Find Mars!',
      feature: 'Which planet is red?',
      after: 'Which planet comes after Mars?',
    },
    jupiter: {
      name: 'Jupiter',
      facts: ['Jupiter is the biggest planet.', 'It has a big red spot.'],
      look: 'Jupiter is stripy and has a big red spot.',
      find: 'Find Jupiter!',
      feature: 'Which planet has a big red spot?',
      after: 'Which planet comes after Jupiter?',
    },
    saturn: {
      name: 'Saturn',
      facts: ['Saturn has rings you can clearly see.', 'The rings are made of ice and rocks.'],
      look: 'Saturn has wide rings around it.',
      find: 'Find Saturn!',
      feature: 'Which planet has rings you can clearly see?',
      after: 'Which planet comes after Saturn?',
    },
    uranus: {
      name: 'Uranus',
      facts: ['Uranus is a pale blue planet.', 'It spins lying on its side.'],
      look: 'Uranus is pale blue, with a thin ring.',
      find: 'Find Uranus!',
      feature: 'Which planet is pale blue?',
      after: 'Which planet comes after Uranus?',
    },
    neptune: {
      name: 'Neptune',
      facts: ['Neptune is a deep blue planet.', 'It is the planet farthest from the Sun.'],
      look: 'Neptune is deep blue.',
      find: 'Find Neptune!',
      feature: 'Which planet is deep blue?',
    },
  },
  kind: { star: 'Star', planet: 'Planet', moon: 'Earth’s satellite' },
  ui: {
    title: 'Space',
    intro: 'Let’s meet the Sun, the planets and the stars.',
    lessons: 'Lessons',
    lessonDone: 'Lesson done!',
    lessonDoneText: 'Now you can try the short check too.',
    learnFirst: 'Let’s do one lesson before the check.',
    exhibit: 'The Solar System',
    exhibitNote: 'Sizes and distances are not to scale',
    exhibitTap: 'Tap one to look closer.',
    dragHint: 'Swipe with your finger to turn it!',
    keysHint: 'You can turn it with the arrow keys too.',
    pictureOnly: '3D did not open on this device, so here is a picture.',
    close: 'Close',
    listen: 'Listen',
    start: 'Start',
    practice: 'Practice',
    meet: 'Let’s meet',
    taught: 'Done',
    orderTitle: 'In order',
    orderPlaced: 'In place',
    lessonTitles: {
      '4': 'The Sun, the Earth, the Moon and stars',
      '5-1': 'Earth, Mars, Saturn',
      '5-2': 'Mercury, Venus, Jupiter',
      '5-3': 'Uranus and Neptune',
      '6-1': 'The first four planets',
      '6-2': 'The next four planets',
      '6-3': 'Star, planet and satellite',
    },
  },
  say: {
    hello: 'Welcome to space! Which lesson shall we start with?',
    correct: ['Right! Well done!', 'Great, you found it!', 'Wonderful!'],
    wrong: 'Try once more!',
    orderInner: 'Tap the planets in order, starting from the Sun.',
    orderOuter: 'Tap the planets after Mars in order.',
    orderDone: 'Everything is in its place! Well done!',
    firstPlanet: 'Which planet is first from the Sun?',
    whichPlanet: 'Which planet is this?',
    whichStar: 'Which one is a star?',
    whichMoon: 'Which one is Earth’s natural satellite?',
    whichIsPlanet: 'Which one is a planet?',
    kindHelp:
      'The Sun is a star. The Moon is Earth’s satellite. Earth, Mars and the others are planets.',
    orderHelp: 'The order: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune.',
    kindsCards: [
      'A star shines by itself and gives warmth. The Sun is a star.',
      'A planet does not shine by itself. It goes around the Sun.',
      'The Moon is Earth’s natural satellite. It goes around the Earth.',
    ],
    lessonDone: 'Lesson done! You learned a lot!',
  },
}

export const TEXT: Record<Language, LanguagePack> = { uz: UZ, ru: RU, en: EN }

export type AgeLevel = 4 | 5 | 6

export type LessonKind = 'meet' | 'order' | 'kinds'

export interface Lesson {
  /** Saved with markStage; also the key of the lesson title. */
  stage: string
  level: AgeLevel
  kind: LessonKind
  /** Cards shown first, in this order. */
  cards: readonly SpaceId[]
  /** Objects a test may ask about once this lesson is done. */
  teaches: readonly SpaceId[]
}

export const LESSONS: readonly Lesson[] = [
  {
    stage: '4',
    level: 4,
    kind: 'meet',
    cards: ['sun', 'earth', 'moon', 'stars'],
    teaches: ['sun', 'earth', 'moon', 'stars'],
  },
  {
    stage: '5-1',
    level: 5,
    kind: 'meet',
    cards: ['earth', 'mars', 'saturn'],
    teaches: ['earth', 'mars', 'saturn'],
  },
  {
    stage: '5-2',
    level: 5,
    kind: 'meet',
    cards: ['mercury', 'venus', 'jupiter'],
    teaches: ['mercury', 'venus', 'jupiter'],
  },
  {
    stage: '5-3',
    level: 5,
    kind: 'meet',
    cards: ['uranus', 'neptune'],
    teaches: ['uranus', 'neptune'],
  },
  {
    stage: '6-1',
    level: 6,
    kind: 'order',
    cards: ['mercury', 'venus', 'earth', 'mars'],
    teaches: ['mercury', 'venus', 'earth', 'mars'],
  },
  {
    stage: '6-2',
    level: 6,
    kind: 'order',
    cards: ['jupiter', 'saturn', 'uranus', 'neptune'],
    teaches: ['jupiter', 'saturn', 'uranus', 'neptune'],
  },
  {
    stage: '6-3',
    level: 6,
    kind: 'kinds',
    cards: ['sun', 'earth', 'moon'],
    teaches: ['sun', 'earth', 'moon'],
  },
]

export const lessonsFor = (level: AgeLevel) => LESSONS.filter((lesson) => lesson.level === level)

/** What the solar-system exhibit shows at each age. */
export function exhibitFor(level: AgeLevel): readonly BodyId[] {
  return level === 4 ? ['sun', 'earth', 'moon'] : ['sun', ...PLANETS]
}
