"""Metrics for the separated voice: alignment (xcorr lag), RMS in music-only / speech regions."""
import sys, os, json
import numpy as np, soundfile as sf
from scipy.signal import resample_poly, fftconvolve

here = os.path.dirname(os.path.abspath(__file__))
voc_p = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "vocals_48k.wav")
res_p = sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "music_residual_48k.wav")
orig, sr0 = sf.read(os.path.join(here, "..", "work", "audio_orig.wav"), always_2d=True, dtype="float64")
words = json.load(open(os.path.join(here, "..", "work", "words_parakeet.json")))
v, sr = sf.read(voc_p, dtype="float64")
r, _ = sf.read(res_p, dtype="float64")
o = resample_poly(orig.mean(1), 160, 147)[:len(v)]
print(f"vocals: {len(v)} samples @ {sr} = {len(v) / sr:.4f} s ; orig {orig.shape[0] / sr0:.4f} s ; residual {len(r)}")

# alignment: cross-correlation peak within +-2000 samples
cc = fftconvolve(o, v[::-1], mode="full")
mid = len(v) - 1
win = cc[mid - 2000:mid + 2001]
lag = int(np.argmax(win)) - 2000
print(f"xcorr lag (orig vs vocals): {lag} samples")
cc2 = fftconvolve(o, r[::-1], mode="full")[mid - 2000:mid + 2001]
print(f"xcorr lag (orig vs residual): {int(np.argmax(cc2)) - 2000} samples")

db = lambda x: 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12)
S = lambda x, a, b: x[int(a * sr):int(b * sr)]
print(f"music-only 23.1-25.6 s : orig {db(S(o, 23.1, 25.6)):6.1f} dB | vocals {db(S(v, 23.1, 25.6)):6.1f} dB | "
      f"residual {db(S(r, 23.1, 25.6)):6.1f} dB  -> suppression {db(S(o, 23.1, 25.6)) - db(S(v, 23.1, 25.6)):.1f} dB")
print(f"speech 0-22.96 s       : orig {db(S(o, 0, 22.96)):6.1f} dB | vocals {db(S(v, 0, 22.96)):6.1f} dB | residual {db(S(r, 0, 22.96)):6.1f} dB")
mask = np.zeros(len(v), bool)
for w in words:
    mask[int(w["s"] * sr):int(w["e"] * sr)] = True
mask[int(22.96 * sr):] = False
gaps = ~mask.copy(); gaps[int(22.96 * sr):] = False
print(f"inside words           : orig {db(o[mask]):6.1f} dB | vocals {db(v[mask]):6.1f} dB | residual {db(r[mask]):6.1f} dB")
# word gaps longer than 120 ms (pauses between words) -> residual music bleed in the vocal stem
gl = []
for a, b in zip(words[:-1], words[1:]):
    if b["s"] - a["e"] > 0.12:
        gl.append((a["e"] + 0.03, b["s"] - 0.03))
if gl:
    gi = np.concatenate([S(v, a, b) for a, b in gl]); go = np.concatenate([S(o, a, b) for a, b in gl])
    print(f"pauses between words ({len(gl)}, {sum(b - a for a, b in gl):.2f} s): orig {db(go):6.1f} dB | vocals {db(gi):6.1f} dB")
print(f"peak vocals {np.abs(v).max():.3f}  peak orig {np.abs(o).max():.3f}")

# low band (40-150 Hz: kick/bass of the music, below her F0) during speech -> music bleed under the voice
from scipy.signal import butter, sosfiltfilt
sos = butter(4, [40 / (sr / 2), 150 / (sr / 2)], "band", output="sos")
lo_o, lo_v = sosfiltfilt(sos, S(o, 0, 22.96)), sosfiltfilt(sos, S(v, 0, 22.96))
print(f"40-150 Hz band, 0-22.96 s: orig {db(lo_o):6.1f} dB | vocals {db(lo_v):6.1f} dB  -> {db(lo_o) - db(lo_v):.1f} dB removed")
# voice leaking into the residual: normalised correlation of residual vs vocals over speech
a_, b_ = S(r, 0, 22.96), S(v, 0, 22.96)
print(f"corr(residual, vocals) over speech: {np.dot(a_, b_) / np.sqrt(np.dot(a_, a_) * np.dot(b_, b_)):.3f}")
print(f"first 60 ms RMS: orig {db(S(o, 0, 0.06)):.1f} dB | vocals {db(S(v, 0, 0.06)):.1f} dB ; 22.4-22.96 s: orig {db(S(o, 22.4, 22.96)):.1f} | vocals {db(S(v, 22.4, 22.96)):.1f}")
