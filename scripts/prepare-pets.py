"""Cuts the pet sprite sheets (3 × 2 emotions each) into clean transparent frames.

    python3 scripts/prepare-pets.py SHEET.png pet-id [SHEET2 pet-id2 ...]

Each sheet has six poses: happy, surprised, sad / angry, scared, shy. Faint
noise around the animals (alpha below ~40) is removed, and small stray
specks are dropped, so every frame sits cleanly on any background.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

EMOTIONS = ['happy', 'surprised', 'sad', 'angry', 'scared', 'shy']
OUT = Path(__file__).resolve().parents[1] / 'public' / 'pets'
SIZE = 384


def clean(cell: np.ndarray) -> np.ndarray:
    alpha = cell[..., 3].astype(np.float32)
    # Soft edges stay soft; the faint haze becomes fully transparent.
    alpha = np.clip((alpha - 40) / (230 - 40), 0, 1) * 255
    mask = alpha > 100
    labels, count = ndimage.label(mask)
    if count:
        sizes = ndimage.sum(mask, labels, range(1, count + 1))
        keep = np.isin(labels, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.02])
        # Keep the soft edge pixels that touch kept parts (fur, whiskers).
        keep = ndimage.binary_dilation(keep, iterations=6)
        alpha[~keep] = 0
    out = cell.copy()
    out[..., 3] = alpha.astype(np.uint8)
    return out


def frame(cell: np.ndarray) -> Image.Image:
    image = Image.fromarray(clean(cell), 'RGBA')
    box = image.getbbox()
    if box:
        image = image.crop(box)
    side = int(max(image.size) * 1.06)
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    # Feet on the bottom, centred.
    square.paste(image, ((side - image.width) // 2, side - image.height - int(side * 0.02)))
    return square.resize((SIZE, SIZE), Image.LANCZOS)


def main(args: list[str]) -> None:
    for sheet, pet in zip(args[::2], args[1::2]):
        data = np.array(Image.open(sheet).convert('RGBA'))
        h, w = data.shape[:2]
        folder = OUT / pet
        folder.mkdir(parents=True, exist_ok=True)
        for index, emotion in enumerate(EMOTIONS):
            row, col = divmod(index, 3)
            cell = data[row * h // 2:(row + 1) * h // 2, col * w // 3:(col + 1) * w // 3]
            frame(cell).save(folder / f'{emotion}.webp', 'WEBP', quality=86, method=6)
        print(pet, 'ok')


if __name__ == '__main__':
    main(sys.argv[1:])
