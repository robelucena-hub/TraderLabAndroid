"""Áudio: tratamento da voz, montagem pela EDL, trilha eletrônica original (sintetizada aqui,
sem samples de terceiros) e efeitos sonoros sintetizados; mixagem com ducking e normalização."""
import sys, os, json, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

src, build = sys.argv[1], sys.argv[2]
proj = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(f"{build}/timeline.json")); E = json.load(open(f"{proj}/edit.json"))
SR = 48000; DUR = T["duration"]; N = int(round(DUR * SR))
rng = np.random.default_rng(7)

# ---------- 1. voz: tratamento moderado ----------
VOICE_FX = ("pan=mono|c0=0.5*c0+0.5*c1,highpass=f=80,"
            "afftdn=nr=10:nf=-42:tn=1,"                                   # ruído de fundo
            "agate=threshold=0.018:ratio=1.6:range=0.55:attack=4:release=160,"  # reduz cauda de reverberação
            "equalizer=f=280:t=q:w=1.1:g=-2.5,equalizer=f=3400:t=q:w=1.0:g=2,"
            "equalizer=f=9000:t=h:w=0.7:g=1,"
            "acompressor=threshold=-24dB:ratio=2.8:attack=6:release=140:makeup=2,"
            "deesser=i=0.25")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", VOICE_FX, "-ar", str(SR),
                "-c:a", "pcm_f32le", f"{build}/voice_proc.wav"], check=True)
v, _ = sf.read(f"{build}/voice_proc.wav")
voice = np.zeros(N)
FADE = int(0.008 * SR)
for s in T["segments"]:
    a = int(round(s["src0"] * SR))
    b = int(round(s.get("audio_out_s", s["src1"]) * SR))
    o = int(round(s["t0"] * SR))
    chunk = v[a:b].copy()
    fo = int(0.025 * SR) if "audio_out_s" in s else FADE
    chunk[:FADE] *= np.linspace(0, 1, FADE); chunk[-fo:] *= np.linspace(1, 0, fo) ** 1.5
    voice[o:o + len(chunk)] += chunk[: N - o]

# ---------- utilidades de síntese ----------
def lp(x, f, order=2):  return sosfilt(butter(order, f / (SR / 2), "low", output="sos"), x)
def hp(x, f, order=2):  return sosfilt(butter(order, f / (SR / 2), "high", output="sos"), x)
def bp(x, lo, hi):      return sosfilt(butter(2, [lo / (SR / 2), hi / (SR / 2)], "band", output="sos"), x)
def env_adsr(n, a, d, s, r):
    e = np.ones(n) * s; A, D, R = int(a * SR), int(d * SR), int(r * SR)
    e[:A] = np.linspace(0, 1, A); e[A:A + D] = np.linspace(1, s, len(e[A:A + D]))
    if R: e[-R:] *= np.linspace(1, 0, R)
    return e
def saw(f, n, phase=0):
    t = np.arange(n) / SR; return 2 * ((t * f + phase) % 1) - 1
def reverb(x, secs=1.6, mix=0.25):
    n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, 6000); ir /= np.sqrt(np.sum(ir ** 2))
    return x * (1 - mix) + fftconvolve(x, ir)[: len(x)] * mix
def place(buf, x, t, g=1.0):
    o = int(t * SR)
    if o >= len(buf): return
    if o < 0: x = x[-o:]; o = 0
    m = min(len(x), len(buf) - o); buf[o:o + m] += x[:m] * g
midi = lambda m: 440 * 2 ** ((m - 69) / 12)

# ---------- 2. trilha (120 BPM, Lá menor: Am - F - C - G) ----------
BPM = 120; beat = 60 / BPM; bar = 4 * beat
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]   # Am F C G
roots = [45, 41, 48, 43]
L, R = np.zeros(N), np.zeros(N)
cue = T["cues"]; t_close = T["closing"]["t0"]; t_itc = cue["itcont"]
nbars = int(DUR / bar) + 2
for b in range(nbars):
    t0 = b * bar; ch = chords[(b // 1) % 4]; n = int(bar * SR)
    # pad: serras desafinadas, filtradas
    pad = np.zeros(n)
    for m in ch:
        for det in (-0.08, 0, 0.07):
            pad += saw(midi(m + 12) * 2 ** (det / 12), n, rng.random())
    pad = lp(pad, 1400) * env_adsr(n, 0.35, 0.3, 0.8, 0.4) * 0.05
    place(L, pad, t0, 1.0); place(R, np.roll(pad, 220), t0, 1.0)
    # baixo sub em colcheias com "pump"
    for k in range(8):
        nn = int(beat / 2 * SR); tt = np.arange(nn) / SR
        bass = np.sin(2 * np.pi * midi(roots[b % 4]) * tt) * np.exp(-tt * 5) * 0.11
        place(L, bass, t0 + k * beat / 2); place(R, bass, t0 + k * beat / 2)
    # arpejo em semicolcheias (pluck)
    seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24, ch[2] + 12, ch[0] + 24, ch[1] + 12, ch[2] + 24]
    for k in range(16):
        nn = int(0.22 * SR); tt = np.arange(nn) / SR
        f = midi(seq[k % 8]); x = (np.sign(np.sin(2 * np.pi * f * tt)) * 0.3 + np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 18)
        x = lp(x, 3500) * 0.05
        pan = 0.5 + 0.35 * np.sin(k * 0.8)
        place(L, x, t0 + k * beat / 4, 1 - pan); place(R, x, t0 + k * beat / 4, pan)
L, R = reverb(L, 1.8, 0.3), reverb(R, 1.9, 0.3)
# bateria: kick, hi-hat, clap — entra mais forte após o ITCONT
def kick():
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 45 + 80 * np.exp(-tt * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-tt * 9) * 0.5
def hat(open_=False):
    n = int((0.18 if open_ else 0.05) * SR); return hp(rng.standard_normal(n), 7000) * np.exp(-np.arange(n) / SR * (18 if open_ else 70)) * 0.06
def clap():
    n = int(0.25 * SR); x = bp(rng.standard_normal(n), 900, 3000) * np.exp(-np.arange(n) / SR * 22) * 0.12
    return x
D = np.zeros(N)
for b in range(nbars):
    for k in range(4):
        t = b * bar + k * beat
        if t > DUR: break
        dens = 0.35 if t < t_itc else 1.0
        if t < 1.733 or t >= t_itc - 0.01: place(D, kick(), t, 0.9 if t >= t_itc else 0.7)
        elif k in (0, 2): place(D, kick(), t, 0.45)
        place(D, hat(), t + beat / 2, dens + 0.3)
        if t >= t_itc and k in (1, 3): place(D, clap(), t, 0.8)
L += D; R += D
music = np.stack([hp(L, 38), hp(R, 38)], 1)

# ---------- 3. efeitos sonoros ----------
def sfx_whoosh(d=0.5):
    n = int(d * SR); x = rng.standard_normal(n); out = np.zeros(n); tt = np.linspace(0, 1, n)
    for i in range(0, n, 2048):
        fc = 300 + 4000 * tt[i] ** 1.5
        out[i:i + 2048] = bp(x[i:i + 2048] if i + 2048 <= n else x[i:], fc * 0.6, min(fc * 1.6, 20000))[: len(out[i:i + 2048])]
    e = np.sin(np.pi * tt) ** 1.5
    return reverb(out * e * 0.35, 0.8, 0.25)
def sfx_pop():
    n = int(0.09 * SR); tt = np.arange(n) / SR
    f = 900 + 900 * (tt / tt[-1]); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 45) * 0.25
    return reverb(x, 0.5, 0.2)
def sfx_tick():
    n = int(0.05 * SR); tt = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 90) * 0.18 + hp(rng.standard_normal(n), 5000) * np.exp(-tt * 200) * 0.05
    return x
def sfx_riser(d=1.0):
    n = int(d * SR); tt = np.linspace(0, 1, n)
    x = hp(rng.standard_normal(n), 2000) * tt ** 2 * 0.08
    f = 200 + 900 * tt ** 2; x += np.sin(2 * np.pi * np.cumsum(f) / SR) * tt ** 2 * 0.06
    return reverb(x, 1.0, 0.3)
def sfx_impact():
    n = int(1.4 * SR); tt = np.arange(n) / SR
    f = 30 + 70 * np.exp(-tt * 8); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.5) * 0.5
    x += lp(rng.standard_normal(n), 1200) * np.exp(-tt * 18) * 0.12
    return reverb(x, 1.6, 0.35)
def sfx_hit():
    n = int(0.6 * SR); tt = np.arange(n) / SR
    return reverb(lp(rng.standard_normal(n), 4000) * np.exp(-tt * 20) * 0.25 + np.sin(2*np.pi*55*tt) * np.exp(-tt*8) * 0.3, 1.0, 0.3)
FX = np.zeros(N)
for kind, t, g in T["sfx"]:
    x = {"whoosh": lambda: sfx_whoosh(0.5), "pop": sfx_pop, "tick": sfx_tick, "riser": lambda: sfx_riser(1.0),
         "impact": sfx_impact, "hit": sfx_hit}[kind]()
    lead = {"whoosh": 0.12, "riser": 0.0}.get(kind, 0.0)
    place(FX, x, t - lead, g)

# ---------- 4. mixagem: ducking da trilha sob a voz ----------
win = int(0.02 * SR)
venv = np.sqrt(np.convolve(voice ** 2, np.ones(win) / win, "same"))
active = (20 * np.log10(venv + 1e-9) > -42).astype(float)
k = int(0.35 * SR); active = np.convolve(active, np.ones(k) / k, "same") > 0.02
duck = active.astype(float)
a_s = int(0.06 * SR); r_s = int(0.45 * SR)       # suavização assimétrica
sm = np.zeros(N); y = 0.0
for i in range(0, N, 240):
    tgt = duck[i]; c = 240 / (a_s if tgt > y else r_s); y += (tgt - y) * min(1, c); sm[i:i + 240] = y
t_ax = np.arange(N) / SR
base = np.full(N, 10 ** (-13 / 20))                        # trilha sem voz
base = np.where(t_ax >= t_close - 0.3, 10 ** (-6 / 20), base)  # encerramento: trilha sobe
music_gain = base * (1 - sm * (1 - 10 ** (-10.5 / 20)))   # -10,5 dB sob a voz
fade_out = np.clip((DUR - t_ax) / 0.6, 0, 1)
music *= (music_gain * fade_out)[:, None]
mix = music + (voice * 1.0)[:, None] + FX[:, None] * 0.9
sf.write(f"{build}/mix_pre.wav", mix.astype(np.float32), SR, subtype="FLOAT")
sf.write(f"{build}/voice_edit.wav", voice.astype(np.float32), SR, subtype="FLOAT")
sf.write(f"{build}/music_only.wav", music.astype(np.float32), SR, subtype="FLOAT")
# normalização final: -14 LUFS, pico real -1 dBTP (duas passagens)
meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", f"{build}/mix_pre.wav", "-af",
                       "loudnorm=I=-14:TP=-1.2:LRA=9:print_format=json", "-f", "null", "-"],
                      capture_output=True, text=True).stderr
js = json.loads(meas[meas.rfind("{"):meas.rfind("}") + 1])
ln = (f"loudnorm=I=-14:TP=-1.2:LRA=9:measured_I={js['input_i']}:measured_TP={js['input_tp']}:"
      f"measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"{build}/mix_pre.wav", "-af", ln, "-ar", "48000",
                "-c:a", "pcm_s24le", f"{build}/mix_final.wav"], check=True)
print("loudness in:", js["input_i"], "LUFS ->", "-14")
