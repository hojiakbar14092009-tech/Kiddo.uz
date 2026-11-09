"""Adds the seven new lessons to dialogue.json (the one place their words live).

    python marketing/shorts/gen_dialogue.py

Each line: (who, scene, uz, ru, en, what the picture shows). Mini = M, Piku = P.
Each lesson: title, one-line note for the grown-up, and the closing question (2-3 pictures).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
M, P = 'mini', 'piku'

LESSONS = {
    'crossing': {
        'title': ('Ko‘chani qanday kesib o‘tamiz?', 'Как переходить улицу?', 'How do we cross the street?'),
        'parent': (
            'Yo‘ldan o‘tishni kattalar bilan birga mashq qiling: har safar «to‘xta, qara, tingla».',
            'Тренируйтесь переходить дорогу вместе со взрослым: каждый раз «стой, смотри, слушай».',
            'Practise crossing together with a grown-up: every time, “stop, look, listen”.',
        ),
        'quiz': (
            ('Qizil chiroq yonsa nima qilamiz?', 'Что делаем, когда горит красный?', 'What do we do at a red light?'),
            [('✋', 'to‘xtaymiz', True), ('🏃', 'yuguramiz', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, ko‘chadan xavfsiz qanday o‘tamiz?', 'Пику, как безопасно перейти улицу?', 'Piku, how do we cross the street safely?', 'street, a car drives past'),
            (P, 'rules', 'Uch qoidani eslab qol: to‘xta, qara, tingla!', 'Запомни три правила: стой, смотри, слушай!', 'Remember three rules: stop, look, listen!', 'three icons pop: hand, eyes, ear'),
            (M, 'stop', 'Birinchi qoida: yo‘l chetida to‘xta.', 'Первое правило: остановись у края дороги.', 'Rule one: stop at the edge of the road.', 'kerb, big stop hand'),
            (P, 'hold', 'Yugurma. Kattaning qo‘lidan ushla.', 'Не бегай. Держись за руку взрослого.', 'Do not run. Hold a grown-up’s hand.', 'a hand to hold, a ball stays still'),
            (M, 'look', 'Ikkinchi qoida: chapga, o‘ngga, yana chapga qara.', 'Второе правило: посмотри налево, направо и снова налево.', 'Rule two: look left, right, then left again.', 'eyes look left, then right'),
            (P, 'car', 'Mashina kelyaptimi? Yaxshilab qara.', 'Едет ли машина? Хорошенько посмотри.', 'Is a car coming? Look carefully.', 'a car passes, then the road is clear'),
            (M, 'listen', 'Uchinchi qoida: diqqat bilan tingla.', 'Третье правило: внимательно слушай.', 'Rule three: listen carefully.', 'big ear, sound waves'),
            (P, 'sound', 'Mashina ovozi eshitilyaptimi?', 'Слышен ли звук машины?', 'Can you hear a car?', 'ear, a distant car'),
            (M, 'red', 'Mana svetofor. Qizil odamcha — to‘xta!', 'Вот светофор. Красный человечек — стой!', 'Here is the traffic light. Red figure — stop!', 'traffic light turns red'),
            (P, 'green', 'Yashil odamcha — o‘tish mumkin.', 'Зелёный человечек — можно идти.', 'Green figure — you may cross.', 'traffic light turns green'),
            (M, 'again', 'Lekin avval yana chapga, o‘ngga, chapga qara.', 'Но сначала снова посмотри налево, направо и налево.', 'But first look left, right and left again.', 'eyes look both ways'),
            (P, 'zebra', 'Zebra chiziqdan o‘tamiz. Shoshilmaymiz.', 'Идём по зебре. Не спешим.', 'We cross on the zebra. No rushing.', 'zebra crossing, calm walking'),
            (M, 'repeat', 'To‘xta, qara, tingla — keyin yur!', 'Стой, смотри, слушай — потом иди!', 'Stop, look, listen — then walk!', 'the three icons again, then go'),
            (P, 'quiz', 'Endi savol: qizil chiroqda nima qilamiz?', 'Теперь вопрос: что делаем на красный?', 'Now a question: what do we do at red?', 'red light, a question mark'),
        ],
    },
    'bread': {
        'title': ('Non qayerdan keladi?', 'Откуда берётся хлеб?', 'Where does bread come from?'),
        'parent': (
            'Nonni birga sindiring va «bu bug‘doydan boshlangan» deb ayting: mehnatni qadrlash shundan boshlanadi.',
            'Ломая хлеб вместе, скажите: «он начался с пшеницы». Так начинается уважение к труду.',
            'Break bread together and say “it started as wheat”: respect for work begins there.',
        ),
        'quiz': (
            ('Non nimadan boshlanadi?', 'С чего начинается хлеб?', 'What does bread start from?'),
            [('🌾', 'bug‘doy', True), ('🍎', 'olma', False), ('🥛', 'sut', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, non qayerdan keladi?', 'Пику, откуда берётся хлеб?', 'Piku, where does bread come from?', 'a round Uzbek tandoor bread, a question mark'),
            (P, 'wheat', 'Keling, bug‘doy donidan boshlaymiz!', 'Давай начнём с пшеничного зерна!', 'Let’s start with a grain of wheat!', 'a wheat ear grows'),
            (M, 'field', 'Dalada bug‘doy o‘sadi. Quyosh va yomg‘ir kerak.', 'В поле растёт пшеница. Ей нужны солнце и дождь.', 'Wheat grows in the field. It needs sun and rain.', 'field, sun, rain'),
            (P, 'harvest', 'Bug‘doy pishadi. Dehqon uni yig‘ib oladi.', 'Пшеница созревает. Фермер её убирает.', 'The wheat ripens. The farmer harvests it.', 'a combine harvester in the field'),
            (M, 'mill', 'Donlar tegirmonga boradi.', 'Зёрна едут на мельницу.', 'The grains go to the mill.', 'grain goes to a mill'),
            (P, 'flour', 'Tegirmon donni mayda un qiladi.', 'Мельница делает из зерна мелкую муку.', 'The mill turns grain into fine flour.', 'grain becomes flour'),
            (M, 'flour2', 'Un — bug‘doydan tayyorlanadi!', 'Мука делается из пшеницы!', 'Flour is made from wheat!', 'wheat and flour side by side'),
            (P, 'dough', 'Nonvoy un va suvdan xamir qoradi.', 'Пекарь замешивает тесто из муки и воды.', 'The baker mixes dough from flour and water.', 'flour and water make dough'),
            (M, 'shape', 'Xamir yumshoq bo‘ladi. Uni shaklga solamiz.', 'Тесто мягкое. Мы придаём ему форму.', 'The dough is soft. We shape it.', 'round dough is shaped'),
            (P, 'tandoor', 'Nonvoy xamirni issiq tandirga yopadi.', 'Пекарь лепит тесто на стенку горячего тандыра.', 'The baker sticks the dough on the hot tandoor wall.', 'tandoor with fire'),
            (M, 'bake', 'Issiq tandirda non pishadi!', 'В горячем тандыре хлеб печётся!', 'The bread bakes in the hot tandoor!', 'bread turns golden'),
            (P, 'chain', 'Bug‘doy, un, xamir, non!', 'Пшеница, мука, тесто, хлеб!', 'Wheat, flour, dough, bread!', 'the four steps in a row'),
            (M, 'work', 'Non juda ko‘p mehnatdan keladi.', 'Хлеб — это много труда.', 'Bread comes from a lot of work.', 'bread, sparkles'),
            (P, 'quiz', 'Endi savol: non nimadan boshlanadi?', 'Теперь вопрос: с чего начинается хлеб?', 'Now a question: what does bread start from?', 'bread, a question mark'),
        ],
    },
    'tree': {
        'title': ('Urug‘dan daraxtgacha', 'От семечка до дерева', 'From a seed to a tree'),
        'parent': (
            'Birga urug‘ ekib, har kuni suv quying: bola o‘sishni o‘z ko‘zi bilan ko‘radi.',
            'Посадите семечко вместе и поливайте каждый день: ребёнок увидит рост своими глазами.',
            'Plant a seed together and water it daily: your child will watch it grow.',
        ),
        'quiz': (
            ('Urug‘ o‘sishi uchun nima kerak?', 'Что нужно семечку, чтобы расти?', 'What does a seed need to grow?'),
            [('💧', 'suv, quyosh va tuproq', True), ('🍭', 'shirinlik', False), ('🧸', 'o‘yinchoq', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, katta daraxt qanday paydo bo‘ladi?', 'Пику, как появляется большое дерево?', 'Piku, how does a big tree appear?', 'a big tree, a question mark'),
            (P, 'seed', 'U juda kichkina urug‘dan boshlanadi!', 'Оно начинается с крошечного семечка!', 'It starts from a tiny seed!', 'a tiny seed'),
            (M, 'plant', 'Urug‘ni yerga ekamiz.', 'Мы сажаем семечко в землю.', 'We plant the seed in the ground.', 'seed goes into soil'),
            (P, 'needs', 'Unga suv, quyosh va tuproq kerak.', 'Ему нужны вода, солнце и почва.', 'It needs water, sun and soil.', 'sun and rain over the soil'),
            (M, 'root', 'Avval ildiz pastga o‘sadi.', 'Сначала корень растёт вниз.', 'First the root grows down.', 'a root grows under the ground'),
            (P, 'drink', 'Ildiz yerdan suv ichadi.', 'Корень пьёт воду из земли.', 'The root drinks water from the soil.', 'water goes up the root'),
            (M, 'sprout', 'Keyin kichik nihol chiqadi.', 'Потом появляется маленький росток.', 'Then a small sprout comes up.', 'a sprout appears'),
            (P, 'sun', 'Nihol quyoshga qarab o‘sadi.', 'Росток тянется к солнцу.', 'The sprout reaches for the sun.', 'sprout grows toward the sun'),
            (M, 'years', 'Yillar o‘tadi. Nihol kattalashadi.', 'Идут годы. Росток вырастает.', 'Years pass. The sprout gets bigger.', 'seasons pass, it grows'),
            (P, 'tree', 'Endi u baland daraxt!', 'Теперь это высокое дерево!', 'Now it is a tall tree!', 'a tall tree'),
            (M, 'home', 'Daraxt soya beradi, qushlarga uy bo‘ladi.', 'Дерево даёт тень, в нём живут птицы.', 'The tree gives shade and a home for birds.', 'bird, nest, shade'),
            (P, 'fruit', 'Ko‘p daraxtlarda meva va urug‘ pishadi.', 'На многих деревьях зреют плоды и семена.', 'On many trees, fruit and seeds ripen.', 'fruit, seeds fall'),
            (M, 'chain', 'Urug‘, ildiz, nihol, daraxt!', 'Семечко, корень, росток, дерево!', 'Seed, root, sprout, tree!', 'the four steps in a row'),
            (P, 'quiz', 'Endi savol: urug‘ o‘sishi uchun nima kerak?', 'Теперь вопрос: что нужно семечку, чтобы расти?', 'Now a question: what does a seed need to grow?', 'seed, a question mark'),
        ],
    },
    'rainbow': {
        'title': ('Kamalak qanday paydo bo‘ladi?', 'Как появляется радуга?', 'How does a rainbow appear?'),
        'parent': (
            'Yomg‘irdan keyin birga osmonga qarang. Uyda esa suv to‘ldirilgan stakan va quyosh nuri bilan mayda kamalak qilish mumkin.',
            'После дождя посмотрите на небо вместе. Дома можно получить маленькую радугу стаканом воды на солнце.',
            'After rain, look at the sky together. At home, a glass of water in the sun can make a small rainbow.',
        ),
        'quiz': (
            ('Kamalakning ranglari nechta?', 'Сколько цветов у радуги?', 'How many colours does a rainbow have?'),
            [('5️⃣', 'beshta', False), ('7️⃣', 'yettita', True)],
        ),
        'lines': [
            (M, 'hook', 'Piku, kamalak qanday paydo bo‘ladi?', 'Пику, как появляется радуга?', 'Piku, how does a rainbow appear?', 'a rainbow, a question mark'),
            (P, 'after', 'U yomg‘irdan keyin osmonda paydo bo‘ladi.', 'Она появляется на небе после дождя.', 'It shows up in the sky after rain.', 'rain ends, the sun comes out'),
            (M, 'white', 'Quyosh nuri oq ko‘rinadi.', 'Солнечный свет кажется белым.', 'Sunlight looks white.', 'a white ray from the sun'),
            (P, 'hidden', 'Lekin unda ko‘p ranglar yashiringan!', 'Но в нём спрятано много цветов!', 'But many colours hide inside it!', 'sparkles, colours peek out'),
            (M, 'drops', 'Tomchi nurning yo‘lini o‘zgartiradi.', 'Капля меняет путь света.', 'The drop changes the light’s path.', 'ray hits a drop'),
            (P, 'split', 'Nur tomchida ranglarga ajraladi.', 'Свет в капле разделяется на цвета.', 'In the drop, the light splits into colours.', 'ray splits into colours'),
            (M, 'colors1', 'Qizil, to‘q sariq, sariq, yashil...', 'Красный, оранжевый, жёлтый, зелёный...', 'Red, orange, yellow, green...', 'four stripes appear'),
            (P, 'colors2', '...havorang, ko‘k va binafsha!', '...голубой, синий и фиолетовый!', '...light blue, blue and violet!', 'three more stripes, a full rainbow'),
            (M, 'need', 'Kamalak uchun quyosh va yomg‘ir kerak.', 'Для радуги нужны солнце и дождь.', 'A rainbow needs sun and rain.', 'sun and rain together'),
            (P, 'back', 'Quyosh orqangda turadi. Unga qarama!', 'Солнце за твоей спиной. На него не смотри!', 'The sun is behind you. Do not look at it!', 'sun behind, rain ahead'),
            (M, 'front', 'Tomchilar esa oldingda bo‘ladi.', 'А капли — перед тобой.', 'And the drops are in front of you.', 'drops in front'),
            (P, 'chain', 'Quyosh nuri, tomchilar — kamalak!', 'Солнечный свет, капли — радуга!', 'Sunlight, drops — a rainbow!', 'sun plus drops make a rainbow'),
            (M, 'pretty', 'Rang-barang kamalak juda chiroyli!', 'Разноцветная радуга очень красивая!', 'The colourful rainbow is so pretty!', 'rainbow, sparkles'),
            (P, 'quiz', 'Endi savol: kamalakning ranglari nechta?', 'Теперь вопрос: сколько цветов у радуги?', 'Now a question: how many colours does a rainbow have?', 'rainbow, a question mark'),
        ],
    },
    'dayCycle': {
        'title': ('Nega kun va tun almashadi?', 'Почему день сменяется ночью?', 'Why do day and night change?'),
        'parent': (
            'Chiroq va koptok bilan tajriba qiling: koptokni sekin aylantiring, chiroq yoqqan tomoni yorug‘ bo‘ladi.',
            'Сделайте опыт с лампой и мячом: медленно вращайте мяч, освещённая сторона — это день.',
            'Try a lamp and a ball: turn the ball slowly, the lit side is daytime.',
        ),
        'quiz': (
            ('Kun va tunni nima almashtiradi?', 'Что меняет день и ночь?', 'What changes day into night?'),
            [('🌍', 'Yer aylanadi', True), ('☁️', 'bulut', False), ('🌙', 'oy', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, nega kechasi qorong‘i bo‘ladi?', 'Пику, почему ночью темно?', 'Piku, why is it dark at night?', 'a night sky, a question mark'),
            (P, 'spin', 'Chunki Yer aylanib turadi!', 'Потому что Земля вращается!', 'Because the Earth keeps turning!', 'Earth turns'),
            (M, 'earth', 'Yer — bu bizning katta sayyoramiz.', 'Земля — наша большая планета.', 'The Earth is our big planet.', 'Earth with a tiny house'),
            (P, 'slow', 'U o‘z atrofida sekin aylanadi.', 'Она медленно вращается вокруг себя.', 'It turns slowly around itself.', 'Earth turns with an arrow'),
            (M, 'sun', 'Quyosh doim yorug‘lik beradi.', 'Солнце всегда даёт свет.', 'The Sun always gives light.', 'sun shines'),
            (P, 'lit', 'Yerning quyosh tomoni yorug‘ bo‘ladi.', 'Сторона Земли к Солнцу освещена.', 'The side of Earth facing the Sun is bright.', 'half the Earth lit'),
            (M, 'day', 'U yerda kun. Biz o‘ynaymiz!', 'Там день. Мы играем!', 'It is day there. We play!', 'children play in daylight'),
            (P, 'dark', 'Boshqa tomonga quyosh nuri tushmaydi.', 'На другую сторону свет Солнца не попадает.', 'No sunlight reaches the other side.', 'the dark half'),
            (M, 'night', 'U yerda tun. Ko‘pchilik uxlaydi.', 'Там ночь. Многие спят.', 'It is night there. Many people sleep.', 'moon, stars, sleeping house'),
            (P, 'change', 'Yer aylanadi, kun tunga almashadi.', 'Земля вращается, день сменяется ночью.', 'The Earth turns, day becomes night.', 'day and night swap'),
            (M, 'hours', 'Bir kecha-kunduz — yigirma to‘rt soat.', 'Одни сутки — двадцать четыре часа.', 'One day and night is twenty-four hours.', 'a clock goes round'),
            (P, 'notsun', 'Quyosh aylanmaydi. Yer aylanadi!', 'Солнце не кружит. Земля вращается!', 'The Sun does not circle. The Earth turns!', 'Earth turns, sun stays'),
            (M, 'chain', 'Kun, tun, yana kun!', 'День, ночь, снова день!', 'Day, night, day again!', 'sun, moon, sun'),
            (P, 'quiz', 'Endi savol: kun va tunni nima almashtiradi?', 'Теперь вопрос: что меняет день и ночь?', 'Now a question: what changes day into night?', 'Earth, a question mark'),
        ],
    },
    'calm': {
        'title': ('Jahlim chiqsa nima qilaman?', 'Что делать, если я злюсь?', 'What do I do when I am angry?'),
        'parent': (
            'Shar nafasini jahl chiqmagan paytda ham birga mashq qiling: bola kerak paytda o‘zi eslaydi.',
            'Тренируйте «дыхание шарика» и в спокойные минуты: тогда ребёнок вспомнит его в нужный момент.',
            'Practise “balloon breathing” in calm moments too: your child will remember it when needed.',
        ),
        'quiz': (
            ('Jahl chiqsa nima qilamiz?', 'Что делаем, когда злимся?', 'What do we do when we are angry?'),
            [('🎈', 'shar nafasi', True), ('📢', 'baqiramiz', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, jahlim chiqsa nima qilaman?', 'Пику, что делать, если я злюсь?', 'Piku, what do I do when I am angry?', 'a cross face, a question mark'),
            (P, 'normal', 'Jahl — oddiy his. Hammada bo‘ladi.', 'Злость — обычное чувство. Оно бывает у всех.', 'Anger is a normal feeling. Everyone has it.', 'friendly faces, a heart'),
            (M, 'body', 'Yuzim qizaradi, yuragim tez uradi.', 'Лицо краснеет, сердце бьётся быстро.', 'My face gets red, my heart beats fast.', 'red face, fast heart'),
            (P, 'balloon', 'Keling, shar nafasini o‘rganamiz!', 'Давай научимся дыханию шарика!', 'Let’s learn balloon breathing!', 'a balloon appears'),
            (M, 'hand', 'Qo‘lingni qorningga qo‘y.', 'Положи руку на живот.', 'Put your hand on your tummy.', 'a hand on the tummy'),
            (P, 'in', 'Burun bilan sekin nafas ol.', 'Медленно вдохни носом.', 'Breathe in slowly through your nose.', 'balloon grows'),
            (M, 'big', 'Qorning katta shardek shishadi.', 'Живот надувается, как большой шар.', 'Your tummy puffs up like a big balloon.', 'balloon is big'),
            (P, 'out', 'Endi og‘iz bilan sekin chiqar.', 'Теперь медленно выдохни ртом.', 'Now breathe out slowly through your mouth.', 'balloon shrinks'),
            (M, 'small', 'Shar asta-sekin kichrayadi.', 'Шарик понемногу уменьшается.', 'The balloon slowly gets smaller.', 'balloon is small'),
            (P, 'again', 'Yana bir marta: nafas ol...', 'Ещё раз: вдохни...', 'Once more: breathe in...', 'balloon grows again'),
            (M, 'three', '...va sekin chiqar. Uch marta!', '...и медленно выдохни. Три раза!', '...and breathe out slowly. Three times!', 'three balloons'),
            (P, 'calm', 'Tinchlandingmi? Juda yaxshi!', 'Успокоился? Очень хорошо!', 'Feeling calmer? Very good!', 'smiling faces, sparkles'),
            (M, 'tell', 'Keyin kattaga ayt: jahlim chiqdi.', 'Потом скажи взрослому: я разозлился.', 'Then tell a grown-up: I felt angry.', 'a child talks to a grown-up'),
            (P, 'quiz', 'Endi savol: jahl chiqsa nima qilamiz?', 'Теперь вопрос: что делаем, когда злимся?', 'Now a question: what do we do when angry?', 'balloon, a question mark'),
        ],
    },
    'teeth': {
        'title': ('Tishimni nega yuvaman?', 'Зачем чистить зубы?', 'Why do I brush my teeth?'),
        'parent': (
            'Ertalab va kechqurun ikki daqiqa, mayda no‘xat kattaligida pasta bilan; kichik bolaga kattalar yordam bersin.',
            'Утром и вечером по две минуты, пастой размером с горошину; маленькому ребёнку помогает взрослый.',
            'Two minutes morning and evening, with a pea-sized dab of toothpaste; a grown-up helps little ones.',
        ),
        'quiz': (
            ('Tishni necha daqiqa yuvamiz?', 'Сколько минут чистим зубы?', 'How many minutes do we brush?'),
            [('1️⃣', 'bir daqiqa', False), ('2️⃣', 'ikki daqiqa', True), ('5️⃣', 'besh daqiqa', False)],
        ),
        'lines': [
            (M, 'hook', 'Piku, tishni nega yuvaman?', 'Пику, зачем чистить зубы?', 'Piku, why do I brush my teeth?', 'a big smile with teeth'),
            (P, 'chew', 'Tishlar ovqatni chaynaydi. Ular kuchli bo‘lsin.', 'Зубы жуют еду. Пусть они будут крепкими.', 'Teeth chew food. They should stay strong.', 'teeth chew an apple'),
            (M, 'left', 'Ovqatdan keyin tishda qoldiqlar qoladi.', 'После еды на зубах остаются крошки.', 'After eating, bits of food stay on teeth.', 'crumbs on a tooth'),
            (P, 'germs', 'Mikroblar shirinlikni yaxshi ko‘radi!', 'Микробы любят сладкое!', 'Germs love sweet things!', 'tiny germs near a candy'),
            (M, 'hurt', 'Ular tishni sekin-asta buzadi.', 'Они понемногу портят зуб.', 'They slowly spoil the tooth.', 'a tooth gets a spot'),
            (P, 'brush', 'Tish cho‘tkasi mikroblarni ketkazadi.', 'Зубная щётка прогоняет микробов.', 'A toothbrush chases the germs away.', 'brush and germs flee'),
            (M, 'paste', 'Cho‘tkaga mayda no‘xatdek pasta ol.', 'Возьми на щётку пасту размером с горошину.', 'Take a pea-sized dab of paste on the brush.', 'a small dab of paste'),
            (P, 'round', 'Hamma tishni aylantirib tozala.', 'Почисти все зубы круговыми движениями.', 'Clean every tooth in small circles.', 'brush moves in circles'),
            (M, 'two', 'Ikki daqiqa yuvamiz: sanaymiz!', 'Чистим две минуты: считаем!', 'We brush for two minutes: let us count!', 'a clock counts to two'),
            (P, 'twice', 'Ertalab va kechqurun yuvamiz.', 'Чистим утром и вечером.', 'We brush in the morning and at night.', 'sun and moon'),
            (M, 'spit', 'Pastani yutma, tupurib tashla.', 'Пасту не глотай, сплюнь.', 'Do not swallow the paste, spit it out.', 'spit into the sink'),
            (P, 'clean', 'Toza tish — kuchli tish!', 'Чистые зубы — крепкие зубы!', 'Clean teeth — strong teeth!', 'a shiny smile'),
            (M, 'dentist', 'Vrach tishingni muntazam tekshiradi.', 'Врач регулярно проверяет зубы.', 'A dentist checks your teeth regularly.', 'a friendly dentist'),
            (P, 'quiz', 'Endi savol: tishni necha daqiqa yuvamiz?', 'Теперь вопрос: сколько минут чистим зубы?', 'Now a question: how many minutes do we brush?', 'a clock, a question mark'),
        ],
    },
}


# silent pauses (seconds) after a line, so the child can breathe along while the balloon moves
PAUSES = {'calm': {'in': 3.5, 'out': 3.5, 'again': 3.5, 'three': 3.5}}


def write_doc(data: dict) -> None:
    """docs/shorts/scripts.md: every lesson's words (uz first, ru/en), who speaks, the picture, the length."""
    out = ['# Shorts: the new lessons (scripts)', '',
           'Generated by `marketing/shorts/gen_dialogue.py` from `dialogue.json`; edit the generator, not this file.',
           'Mini = girl (Lumi), Piku = boy (KidoBot). One sentence per line, one voice per sentence, 5-8 words.',
           'Length: spoken estimate (about 11 letters a second) plus a 0.67 s pause per line plus 2.7 s opening/ending.', '']
    for sid, story in data.items():
        if 'title' not in story:
            continue
        secs = sum(max(1.8, len(x['uz']) / 11 + 0.5) + x.get('pause', 0) for x in story['lines']) + len(story['lines']) * 0.67 + 2.7
        pauses = ''.join(f", silent pause {x['pause']} s after line {i}" for i, x in enumerate(story['lines'], 1) if x.get('pause'))
        out += [f"## {sid}: {story['title']['uz']}", '',
                f"- ru: {story['title']['ru']} / en: {story['title']['en']}",
                f"- Length: about {secs:.0f} s, {len(story['lines'])} lines{pauses}; the idea comes back in the middle, near the end and in the question.",
                f"- For the grown-up (uz): {story['parent']['uz']}",
                f"- Question (uz): {story['quiz']['q']['uz']} " + ' / '.join(('**' if o['ok'] else '') + o['pic'] + ' ' + o['uz'] + ('**' if o['ok'] else '') for o in story['quiz']['options']),
                '', '| # | Who | Uzbek | Russian | English | Picture |', '|---|---|---|---|---|---|']
        for i, x in enumerate(story['lines'], 1):
            out.append(f"| {i} | {x['who']} | {x['uz']} | {x['ru']} | {x['en']} | {x['visual']} |")
        out.append('')
    out += ['## Fact check', '',
            'Claims were checked with web searches (secondary sources: children’s hospitals, Aramco World/Wikipedia for tandyr nan, Physics Classroom and Harvard CfA for rainbows, NASA StarChild for day and night, ADA fluoride guidance as reported by dental and news sites). First-party NASA/ADA/WHO pages were not opened, and root water uptake, phototropism and the two-minute brushing time rest on general knowledge. Changes made after the check:',
            '', '- crossing: look left, right, then left again (right-hand traffic).',
            '- bread: the baker puts the dough on the tandoor wall, the child never does; the farmer gathers the harvest with a combine; the picture is the round Uzbek tandoor bread.',
            '- tree: "many trees" bear fruit and seeds, not all; the seed needs water, sun and soil.',
            '- rainbow: "the sun is behind you, do not look at it"; "the drop changes the light’s path"; the question asks how many colours (seven is the school convention; a rainbow is really continuous).',
            '- dayCycle: "no sunlight reaches the other side"; "the Sun does not circle, the Earth turns"; "many people sleep" at night. This lesson overlaps the older cartoon `dayNight`; it is told with the Earth turning.',
            '- teeth: "a dentist checks regularly"; a pea-sized dab of paste, spit it out, two minutes twice a day, a grown-up helps little ones.',
            '- calm: four silent pauses of 3.5 s (after lines 6, 8, 10, 11) so the child breathes along while the balloon grows or shrinks; balloon breathing is common clinical practice (nose in, mouth out, hand on the tummy), not a formal guideline; the lesson ends by telling a grown-up.', '']
    doc = HERE.parent.parent / 'docs' / 'shorts'
    doc.mkdir(parents=True, exist_ok=True)
    (doc / 'scripts.md').write_text(chr(10).join(out), encoding='utf-8')


def main() -> None:
    path = HERE / 'dialogue.json'
    data = json.loads(path.read_text(encoding='utf-8'))
    for sid, lesson in LESSONS.items():
        data[sid] = {
            'voice': False,
            'title': dict(zip(('uz', 'ru', 'en'), lesson['title'])),
            'parent': dict(zip(('uz', 'ru', 'en'), lesson['parent'])),
            'quiz': {
                'q': dict(zip(('uz', 'ru', 'en'), lesson['quiz'][0])),
                'options': [{'pic': pic, 'uz': uz, 'ok': ok} for pic, uz, ok in lesson['quiz'][1]],
            },
            'lines': [
                {'who': who, 'scene': scene, 'uz': uz, 'ru': ru, 'en': en, 'visual': visual,
                 **({'pause': PAUSES[sid][scene]} if scene in PAUSES.get(sid, {}) else {})}
                for who, scene, uz, ru, en, visual in lesson['lines']
            ],
        }
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    write_doc(data)
    print('lessons:', ', '.join(LESSONS), '| lines:', sum(len(x['lines']) for x in LESSONS.values()))


if __name__ == '__main__':
    main()
