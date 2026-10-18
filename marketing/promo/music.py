"""Music bed and sound effects for the 30 s Kiddo promo.

Bright kids-pop at 109.09 BPM (one bar = 2.2 s, every scene is two bars):
marimba arpeggios, glockenspiel hook, plucked bass, claps and shakers, with
whooshes into each scene and the on-screen sounds (coin drop, correct-answer
ding, coins, notification, final hit) placed on the clip's timeline.

python3 marketing/promo/music.py out.wav
"""

import sys
import wave

import numpy as np

SR = 44100
DUR = 31.0
BEAT = 0.55
BAR = BEAT * 4
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / decay)


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    lg = gain * np.sqrt(0.5 * (1 - pan))
    rg = gain * np.sqrt(0.5 * (1 + pan))
    L[i : i + len(sig)] += sig * lg
    R[i : i + len(sig)] += sig * rg


def tone(freq, length, partials, attack=0.003, decay=0.3):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for mult, amp, dec in partials:
        s += amp * np.sin(2 * np.pi * freq * mult * t) * np.exp(-t / (decay * dec))
    return s * np.clip(t / attack, 0, 1)


def marimba(freq, length=0.5):
    return tone(freq, length, [(1, 1, 1), (4, 0.25, 0.25), (10, 0.06, 0.08)], decay=0.22)


def glock(freq, length=1.2):
    return tone(freq, length, [(1, 1, 1), (2.76, 0.4, 0.4), (5.4, 0.2, 0.2), (8.9, 0.08, 0.1)], decay=0.55)


def pluck_bass(freq, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    saw = 2 * ((freq * t) % 1) - 1
    # one-pole low-pass that closes over time
    cutoff = 300 + 1800 * np.exp(-t / 0.08)
    out = np.zeros(n)
    y = 0.0
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    for k in range(n):
        y += alpha[k] * (saw[k] - y)
        out[k] = y
    return out * env(n, 0.004, 0.35) * 0.9 + 0.5 * np.sin(2 * np.pi * freq * t) * env(n, 0.004, 0.5)


def pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.12):
            ph = 2 * np.pi * f * (1 + det / 100) * t
            s += 0.5 * (2 * ((f * (1 + det / 100) * t) % 1) - 1) * 0.3 + 0.2 * np.sin(ph)
    a = np.clip(t / 0.25, 0, 1) * np.clip((length - t) / 0.3, 0, 1)
    # gentle low-pass via moving average
    k = 24
    s = np.convolve(s, np.ones(k) / k, mode="same")
    return s * a / len(freqs)


def kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.12) * 1.2 + 0.3 * rng.standard_normal(n) * np.exp(-t / 0.004)


def clap():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(6) / 6, mode="same")  # high-pass-ish
    e = np.exp(-t / 0.06)
    for d in (0.0, 0.011, 0.022):
        e += 0.6 * np.exp(-np.clip(t - d, 0, None) / 0.008) * (t >= d)
    return noise * e * 0.35


def hat(length=0.06):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = noise - np.convolve(noise, np.ones(3) / 3, mode="same")
    return noise * np.exp(-t / (length / 3)) * 0.25


def whoosh(length=0.7, up=True):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    y = 0.0
    for k in range(n):
        x = k / n
        cut = (0.02 + 0.5 * x**2) if up else (0.5 - 0.48 * x)
        y += cut * (noise[k] - y)
        out[k] = y
    shape = np.sin(np.pi * t / length) ** 2 if not up else (t / length) ** 2
    return out * shape * 0.9


def sparkle(at, base=84, count=6, gain=0.25):
    for i in range(count):
        add(glock(note_hz(base + [0, 4, 7, 12, 16, 19][i % 6])), at + i * 0.045, gain * (1 - i * 0.08), pan=(i % 2) * 0.6 - 0.3)


def coin(at, gain=0.3):
    add(tone(note_hz(95), 0.18, [(1, 1, 1), (2.4, 0.3, 0.5)], decay=0.08), at, gain)
    add(tone(note_hz(100), 0.35, [(1, 1, 1), (2.4, 0.3, 0.5)], decay=0.15), at + 0.07, gain)


def pop(at, gain=0.35, pitch=1.0):
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    f = (900 - 500 * t / 0.12) * pitch
    add(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.03), at, gain)


def impact(at, gain=0.9):
    add(kick() * 1.2, at, gain)
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    noise = np.convolve(rng.standard_normal(n), np.ones(40) / 40, mode="same")
    add(noise * np.exp(-t / 0.35) * 2.2, at, gain * 0.5)


# chords per bar: C  G  Am F | C G F G ... (I V vi IV)
PROG = [
    (48, [60, 64, 67, 72]),  # C
    (43, [59, 62, 67, 71]),  # G
    (45, [57, 60, 64, 69]),  # Am
    (41, [57, 60, 65, 69]),  # F
]

bars = int(DUR / BAR) + 1
for b in range(bars):
    t0 = b * BAR
    if t0 > 30.2:
        break
    root, chord = PROG[b % 4]
    intro = b == 0
    outro = t0 >= 26.4
    # pad under everything
    add(pad([note_hz(n) for n in chord[:3]], BAR + 0.05), t0, 0.22 if not intro else 0.16, pan=0)
    # marimba 16th arpeggio
    pattern = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 3, 2, 3, 1, 2]
    for s16 in range(16):
        tt = t0 + s16 * BEAT / 4
        if intro and s16 < 8:
            continue
        n = chord[pattern[s16]] + (12 if s16 % 8 == 7 else 0)
        add(marimba(note_hz(n)), tt, 0.16 if s16 % 4 == 0 else 0.11, pan=0.35 if s16 % 2 else -0.35)
    if intro:
        continue
    # bass: root on 1 and the and of 2, octave on 3, fifth on 4
    for beat_off, interval, length in [(0, 0, 0.4), (1.5, 0, 0.25), (2, 12, 0.35), (3, 7, 0.4)]:
        add(pluck_bass(note_hz(root + interval), length), t0 + beat_off * BEAT, 0.38)
    # drums
    for beat in range(4):
        add(kick(), t0 + beat * BEAT, 0.55)
        if beat in (1, 3):
            add(clap(), t0 + beat * BEAT, 0.55, pan=0.05)
        for e in range(2):
            add(hat(), t0 + beat * BEAT + e * BEAT / 2 + (BEAT / 4 if e else 0) * 0, 0.4 if e else 0.25, pan=0.4)
            add(hat(0.03), t0 + beat * BEAT + BEAT / 4 + e * BEAT / 2, 0.18, pan=-0.4)

# glockenspiel hook (two-bar phrase) on the bright scenes
HOOK = [(0, 76), (0.5, 79), (1, 84), (1.5, 83), (2, 79), (3, 76), (3.5, 74), (4, 72), (5, 74), (5.5, 76), (6, 79)]
for phrase_start in (2 * BAR, 6 * BAR, 8 * BAR, 12 * BAR):
    for beat, n in HOOK:
        add(glock(note_hz(n)), phrase_start + beat * BEAT, 0.16, pan=0.2)

# ---------------------------------------------------------- sound effects
SCENES = [0, 4.4, 8.8, 13.2, 17.6, 22.0, 26.4]
for s in SCENES[1:]:
    add(whoosh(0.55, up=True), s - 0.5, 0.5, pan=-0.3)
    add(whoosh(0.5, up=False), s, 0.4, pan=0.3)

# 1. logo: strokes draw (soft pops), coin drops, robots jump, glyphs fly in
for i in range(9):
    pop(0.15 + i * 0.16, 0.12, 1 + i * 0.06)
coin(0.15 + 3 * 0.16 + 0.55, 0.32)
sparkle(0.75, 84, 8, 0.12)
pop(1.25, 0.3, 0.8)
pop(1.4, 0.3, 1.0)
sparkle(1.9, 79, 6, 0.15)
impact(2.2, 0.6)

# 2. letters: card flips and number pops
for i in range(3):
    add(whoosh(0.3, up=False), 4.4 + 0.6 + i * 0.28, 0.3)
for i in range(5):
    pop(4.4 + 2.0 + i * 0.12, 0.25, 1 + i * 0.12)

# 3. ages: landing thumps and unlock sparkles
for i, at in enumerate([0.95, 1.85, 2.75]):
    pop(8.8 + at, 0.35, 0.6)
    sparkle(8.8 + at + 0.03, 79 + i * 2, 5, 0.14)
sparkle(8.8 + 2.9, 84, 8, 0.16)

# 4. cheer: tap + correct-answer ding + confetti
pop(13.2 + 1.72, 0.3, 1.3)
for i, n in enumerate([84, 88, 91, 96]):
    add(glock(note_hz(n), 1.4), 13.2 + 1.75 + i * 0.07, 0.3)
pop(13.2 + 1.9, 0.25, 1.1)
pop(13.2 + 2.25, 0.25, 1.2)

# 5. shop: coins pour in, outfits land, pet appears
for i in range(12):
    coin(17.6 + 0.55 + i * 0.1 + 0.5, 0.12)
coin(17.6 + 1.9, 0.35)
for at in (2.45, 2.9, 3.35):
    pop(17.6 + at, 0.3, 1.0)
sparkle(17.6 + 3.35, 86, 7, 0.16)

# 6. parents: bars grow, notification ding
for i in range(7):
    pop(22.0 + 1.0 + i * 0.09, 0.08, 1.4 + i * 0.05)
add(tone(note_hz(88), 0.8, [(1, 1, 1), (2, 0.3, 0.5)], decay=0.3), 22.0 + 2.4, 0.3)
add(tone(note_hz(93), 0.9, [(1, 1, 1), (2, 0.3, 0.5)], decay=0.35), 22.0 + 2.55, 0.3)

# 7. CTA: big hit, sparkles, button pop, final chord ringing out
impact(26.4, 0.8)
sparkle(26.5, 84, 8, 0.14)
pop(26.4 + 1.6, 0.4, 0.9)
sparkle(26.4 + 1.65, 88, 6, 0.15)
for n in [48, 60, 64, 67, 72, 76]:
    add(glock(note_hz(n + 12), 2.5) if n > 60 else pluck_bass(note_hz(n), 1.5), 29.15, 0.2)

# ------------------------------------------------------------- master
mix = np.stack([L, R], axis=1)
# soft saturation + fade at the very end
mix = np.tanh(mix * 1.1)
fade = np.ones(N)
end = int(30.0 * SR)
fade[end - int(0.6 * SR) : end] = np.linspace(1, 0, int(0.6 * SR))
fade[end:] = 0
mix *= fade[:, None]
peak = np.max(np.abs(mix))
mix = mix / peak * 0.89
out = (mix[: int(30.0 * SR)] * 32767).astype(np.int16)
with wave.open(sys.argv[1], "wb") as f:
    f.setnchannels(2)
    f.setsampwidth(2)
    f.setframerate(SR)
    f.writeframes(out.tobytes())
print("wrote", sys.argv[1])
