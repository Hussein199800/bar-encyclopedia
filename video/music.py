"""A quiet, slow ambient pad for the narration bed: python3 music.py SECONDS OUT.wav

Generated, not sampled: four soft chords (A minor, F, C, G — 8 s each) of sine
partials with long attacks, slight stereo detune and a gentle shimmer.
"""
import sys
import wave

import numpy as np

SR = 48000
seconds = float(sys.argv[1])
out = sys.argv[2]
n = int(SR * seconds)
t = np.arange(n) / SR

def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)

CHORDS = [[45, 57, 60, 64], [41, 53, 57, 60], [48, 55, 60, 64], [43, 55, 59, 62]]
SPAN = 8.0
left = np.zeros(n)
right = np.zeros(n)
k = 0
while k * SPAN < seconds:
    chord = CHORDS[k % len(CHORDS)]
    start = k * SPAN - 2.0
    a = max(0, int(start * SR))
    b = min(n, int((start + SPAN + 4.0) * SR))
    if b > a:
        tt = t[a:b] - start
        env = np.clip(tt / 3.0, 0, 1) * np.clip((SPAN + 4.0 - tt) / 3.0, 0, 1)
        env = env * env * (3 - 2 * env)
        for i, note in enumerate(chord):
            f = hz(note)
            amp = 0.16 if i == 0 else 0.1
            for side, detune in ((left, 0.998), (right, 1.002)):
                tone = np.sin(2 * np.pi * f * detune * tt) + 0.18 * np.sin(2 * np.pi * 2 * f * detune * tt)
                side[a:b] += amp * env * tone
    k += 1

shimmer = 0.85 + 0.15 * np.sin(2 * np.pi * 0.07 * t)
mix = np.stack([left, right], axis=1) * shimmer[:, None]
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.5
pcm = (mix * 32767).astype("<i2")
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
