"""Recording order of the children's voices: python -m unittest scripts/voices/test_kid_voices.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from kid_voices import PARTS, counters_of, plan  # noqa: E402

NUTS = [f'Yong‘oqlar: +{n}' for n in range(41)]
STARS = [f'{n} ta yulduz' for n in range(41)]


class PlanTest(unittest.TestCase):
    def test_counters_are_number_families(self):
        found = counters_of([*NUTS, *STARS, 'Barakalla!', '3 ta olmani tanla', 'Doira bilan birga sekin nafas olamiz: 4 marta.'])
        self.assertEqual(found, {*NUTS, *STARS})
        # two numbers are not a family yet
        self.assertEqual(counters_of(['1 ta olma', '2 ta olma']), set())

    def test_part_order(self):
        self.assertEqual(PARTS[:4], ['reward', 'sciGames.done', 'attention.say', 'task'])

    def test_words_first_counters_last_nothing_lost(self):
        lists = {
            'reward': {'uz': ['Barakalla!', *NUTS[:3], 'Zo‘r!'], 'ru': ['Молодец!', 'Орешки: +1', 'Орешки: +2', 'Орешки: +3']},
            'task': {'uz': ['Harfni top.', '3 ta olmani tanla'], 'ru': ['Найди букву.']},
        }
        queue = plan(lists, ['girl', 'boy'], ['uz', 'ru'])
        texts = [text for _, _, text in queue]
        # every sentence of every part is kept, once per voice
        self.assertEqual(len(queue), 2 * sum(len(t) for part in lists.values() for t in part.values()))
        # an instruction with a number stays in its part, before every counter
        self.assertLess(texts.index('Harfni top.'), texts.index('3 ta olmani tanla'))
        self.assertLess(texts.index('3 ta olmani tanla'), texts.index('Yong‘oqlar: +0'))
        # the counters (3 uz + 3 ru, for both voices) are the last 12 clips
        self.assertEqual(set(texts[-12:]), {*NUTS[:3], 'Орешки: +1', 'Орешки: +2', 'Орешки: +3'})
        self.assertFalse(set(texts[:-12]) & set(texts[-12:]))
        self.assertLess(texts.index('Zo‘r!'), texts.index('Harfni top.'))
        # a sentence found in two parts is recorded once, where it comes first
        twice = plan({'reward': {'uz': ['Zo‘r!']}, 'task': {'uz': ['Zo‘r!', 'Harfni top.']}}, ['girl'], ['uz'])
        self.assertEqual(twice, [('girl', 'uz', 'Zo‘r!'), ('girl', 'uz', 'Harfni top.')])
        # round robin: both voices and both languages start right away
        self.assertEqual(queue[:4], [
            ('girl', 'uz', 'Barakalla!'), ('boy', 'uz', 'Barakalla!'),
            ('girl', 'ru', 'Молодец!'), ('boy', 'ru', 'Молодец!'),
        ])


if __name__ == '__main__':
    unittest.main()
