"""Small sound effects for the cartoons (Phase 72), made here so they are ours to use.

    python3 marketing/shorts/sfx.py

whoosh  – a soft air sweep as a new scene slides in
pop     – a round wooden "pop" when something appears
sparkle – a few bell notes for the happy end
All 48 kHz mono, quiet and short; the compositions set their level under the voice.
"""
from pathlib import Path
import wave

import numpy as np

RATE = 48_000
OUT = Path(__file__).resolve().parent / 'public' / 'sfx'


def save(name: str, audio: np.ndarray) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    audio = audio / max(1e-9, np.max(np.abs(audio))) * 0.7
    pcm = (audio * 32767).astype(np.int16)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(pcm.tobytes())


def envelope(n: int, attack: float, release: float) -> np.ndarray:
    t = np.arange(n) / RATE
    env = np.minimum(1, t / attack) * np.exp(-np.maximum(0, t - attack) / release)
    return env


def whoosh() -> np.ndarray:
    rng = np.random.default_rng(7)
    n = int(0.45 * RATE)
    noise = rng.standard_normal(n)
    # a band of noise whose centre sweeps up then settles: moving air
    out = np.zeros(n)
    state = 0.0
    low = 0.0
    for i in range(n):
        p = i / n
        cutoff = 300 + 2600 * np.sin(np.pi * p) ** 2
        a = 1 - np.exp(-2 * np.pi * cutoff / RATE)
        state += a * (noise[i] - state)
        low += 0.02 * (state - low)
        out[i] = state - low
    t = np.arange(n) / n
    return out * np.sin(np.pi * t) ** 1.5


def pop() -> np.ndarray:
    n = int(0.18 * RATE)
    t = np.arange(n) / RATE
    pitch = 520 * np.exp(-t * 18) + 260
    phase = 2 * np.pi * np.cumsum(pitch) / RATE
    return np.sin(phase) * envelope(n, 0.003, 0.045)


def sparkle() -> np.ndarray:
    n = int(1.1 * RATE)
    out = np.zeros(n)
    # C major pentatonic, high, like the app's own sounds
    for k, hz in enumerate([1568, 1760, 2093, 2349, 2637]):
        start = int(k * 0.09 * RATE)
        m = n - start
        t = np.arange(m) / RATE
        bell = np.sin(2 * np.pi * hz * t) + 0.3 * np.sin(2 * np.pi * hz * 2.76 * t)
        out[start:] += bell * envelope(m, 0.002, 0.25) * (0.8 - k * 0.08)
    return out


if __name__ == '__main__':
    save('whoosh', whoosh())
    save('pop', pop())
    save('sparkle', sparkle())
    print('ok')
