"""Downloads Kiddo's 3D illustrations and saves them as small WebP files.

The pictures are Microsoft's Fluent Emoji in their "3D" style (MIT licence,
https://github.com/microsoft/fluentui-emoji): rounded, softly lit, clearly
outlined objects that match the 3D robots. Planets are rendered by
scripts/render-planets.mjs from Kiddo's own 3D models instead.

Usage: python3 scripts/fetch-3d.py            (only missing files)
       python3 scripts/fetch-3d.py --force
"""
import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / '3d'
SIZE = 256
BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets'


def file_name(display: str) -> str:
    return display.lower().replace(' ', '_').replace('-', '_') + '_3d.png'


def main() -> None:
    force = '--force' in sys.argv
    names = json.loads((ROOT / 'scripts' / 'assets3d.json').read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    missing = []
    for name, display in names.items():
        target = OUT / f'{name}.webp'
        if target.exists() and not force:
            continue
        url = f'{BASE}/{urllib.parse.quote(display)}/3D/{file_name(display)}'
        try:
            data = urllib.request.urlopen(url, timeout=30).read()
        except Exception as error:  # noqa: BLE001
            missing.append(f'{name} ({display}): {error}')
            continue
        image = Image.open(io.BytesIO(data)).convert('RGBA')
        image.thumbnail((SIZE, SIZE), Image.LANCZOS)
        image.save(target, 'WEBP', quality=86, method=6)
        print('saved', target.name)
    if missing:
        print('NOT FOUND:\n  ' + '\n  '.join(missing))
        sys.exit(1)


if __name__ == '__main__':
    main()
