"""The cartoons' music bed, made from numbers (no samples): python3 marketing/shorts/music.py"""
# A soft, curious 96 BPM bed: marimba plucks on I–vi–IV–V in C, a warm pad and bass, a gentle shaker; no kick, so the story leads.
import numpy as np, wave, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent
(HERE / 'public').mkdir(exist_ok=True)
SR = 48000; BPM = 96; beat = 60 / BPM; DUR = 62.0
n = int(SR * DUR); L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)
def note(f): return 440 * 2 ** ((f - 69) / 12)
def add(sig, t, pan=0.0, gain=1.0):
    i = int(t * SR); j = min(n, i + len(sig))
    if i >= n: return
    s = sig[: j - i] * gain
    L[i:j] += s * (1 - max(0, pan)); R[i:j] += s * (1 + min(0, pan))
def marimba(m, d=0.6):
    t = np.arange(int(d * SR)) / SR; f = note(m)
    env = np.exp(-t * 7)
    return (np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*4*t)*np.exp(-t*25) + 0.15*np.sin(2*np.pi*f*10*t)*np.exp(-t*60)) * env * np.minimum(1, t*400)
def bass(m, d):
    t = np.arange(int(d * SR)) / SR; f = note(m)
    env = np.minimum(1, t*80) * np.exp(-t*1.8)
    return (np.sin(2*np.pi*f*t) + 0.2*np.sin(2*np.pi*2*f*t)) * env
def kick():
    t = np.arange(int(0.25*SR))/SR; f = 110*np.exp(-t*30)+45
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*14)
def shaker():
    t = np.arange(int(0.08*SR))/SR; s = rng.standard_normal(len(t))
    s = np.diff(np.concatenate([[0], s]))  # brighten
    return s*np.exp(-t*60)*0.5
def pad(ms, d):
    t = np.arange(int(d*SR))/SR; env = np.minimum(1, t/0.4)*np.minimum(1, (d-t)/0.4)
    return sum(np.sin(2*np.pi*note(m)*t + 0.3*np.sin(2*np.pi*0.3*t)) for m in ms) * env / len(ms)
chords = [(60, [60,64,67], 48), (57, [57,60,64], 45), (53, [53,57,60], 41), (55, [55,59,62], 43)]
pent = {60:[72,74,76,79,81], 57:[69,72,74,76,81], 53:[69,72,77,79,81], 55:[67,71,74,76,79]}
patt = [0,2,4,2, 1,3,2,4]
bar = 4*beat; t0 = 0.0; k = 0
while t0 < DUR:
    root, tri, b = chords[k % 4]
    add(pad(tri, bar), t0, 0, 0.10)
    add(bass(b, beat*1.9), t0, 0, 0.32); add(bass(b, beat*1.9), t0+2*beat, 0, 0.28)
    for e in range(8):
        tt = t0 + e*beat/2
        if t0 >= 2*bar or e % 2 == 0:  # thinner intro
            m = pent[root][patt[(e + k) % 8]]
            add(marimba(m), tt, (-0.3 if e % 2 else 0.3), 0.20)
        add(shaker(), tt + beat/4, 0.4, 0.05 if t0 >= bar else 0.0)
    t0 += bar; k += 1
mix = np.stack([L, R], 1)
fade = np.ones(n); fo = int(1.5*SR); fade[-fo:] = np.linspace(1, 0, fo); fade[:int(0.05*SR)] = np.linspace(0,1,int(0.05*SR))
mix *= fade[:, None]; mix /= np.abs(mix).max() * 1.1
pcm = (mix * 32767).astype(np.int16)
with wave.open(str(HERE / 'music-raw.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(HERE / 'music-raw.wav'),'-af','aecho=0.6:0.4:60|120:0.2|0.12,loudnorm=I=-24:TP=-3','-ar','48000',str(HERE / 'public' / 'music.wav')], check=True)
print('ok')
