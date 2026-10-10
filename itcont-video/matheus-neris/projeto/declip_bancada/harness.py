"""Banco de testes para restauração de áudio saturado (declipping) do vídeo do Matheus Neris.

uso:
  python3 harness.py make                     # cria os sinais simulados em ../data
  python3 harness.py score <dir_abordagem>    # roda <dir>/run.py em cada entrada e imprime/grava métricas JSON

Simulação: trechos de fala do próprio arquivo com pico baixo (sem saturação) são amplificados e cortados
em 1.0 (hard clip e soft clip), depois codificados em AAC mono 66 kb/s e decodificados, como no arquivo
recebido. Referência = sinal amplificado SEM corte. Métrica principal: SI-SDR (dB) e sua melhora sobre a entrada,
no sinal todo e na vizinhança dos trechos cortados; LSD (distância log-espectral) em 1–12 kHz nos trechos cortados.
Arquivo real: WER (Parakeet) contra a transcrição de referência e índice de "teto" (picos empilhados).
"""
import sys, os, json, subprocess, time
import numpy as np, soundfile as sf
from scipy.signal import stft

HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, "..", "data")
SRC = os.path.join(HERE, "..", "..", "work", "audio_orig.wav")
MODELS = os.path.join(HERE, "..", "..", "..", "models")
SR = 48000
REF_TEXT = ("olá pessoal meu nome é matheus neris sou contador especialista em creator economy e também cofundador da cacs "
            "contabilidade uma empresa focada em afronegócios e nesse momento eu vou te fazer um convite a participar comigo "
            "da primeira imersão tecnológica contábil o primeiro itcont que acontecerá entre os dias 21 e 22 de outubro na uefs "
            "onde a gente vai bater um papo aprender um pouco mais sobre rotinas processos e principalmente automação e "
            "inteligência artificial como isso vem impactando na minha vida no meu negócio e na contabilidade espero por você")

def aac_roundtrip(x, path_base):
    sf.write(path_base + "_pre.wav", x.astype(np.float32), SR, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_base + "_pre.wav", "-c:a", "aac", "-b:a", "66k", "-ac", "1",
                    path_base + ".m4a"], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path_base + ".m4a", "-c:a", "pcm_f32le", path_base + "_dec.wav"], check=True)
    y, _ = sf.read(path_base + "_dec.wav"); os.remove(path_base + "_pre.wav"); os.remove(path_base + ".m4a"); os.remove(path_base + "_dec.wav")
    n = min(len(y), len(x)); return y[:n]

def make():
    os.makedirs(DATA, exist_ok=True)
    x, sr = sf.read(SRC); x = x if x.ndim == 1 else x[:, 0]; assert sr == SR
    # janelas de 0,4 s com fala e pico local baixo
    win = int(0.4 * SR); segs = []
    for i in range(0, len(x) - win, win):
        s = x[i:i + win]; pk = np.abs(s).max(); rms = np.sqrt(np.mean(s ** 2))
        if 0.18 < pk < 0.6 and 20 * np.log10(rms + 1e-9) > -30: segs.append(s / pk * 0.5)
    fade = np.hanning(int(0.02 * SR)); h = len(fade) // 2
    out = []
    for s in segs:
        s = s.copy(); s[:h] *= fade[:h]; s[-h:] *= fade[h:]; out += [s, np.zeros(int(0.05 * SR))]
    clean = np.concatenate(out); print(f"{len(segs)} trechos, {len(clean)/SR:.1f} s de fala limpa")
    meta = {}
    def gain_for(frac):   # ganho que deixa `frac` das amostras acima do teto
        lo, hi = 1.0, 20.0
        for _ in range(40):
            g = (lo + hi) / 2
            if np.mean(np.abs(clean * g) > 1.0) < frac: lo = g
            else: hi = g
        return (lo + hi) / 2
    for name, frac, kind in [("hard_mild", 0.003, "hard"), ("hard_strong", 0.02, "hard"), ("soft_strong", 0.02, "soft")]:
        gain = gain_for(frac); ref = clean * gain
        clip = np.clip(ref, -1, 1) if kind == "hard" else np.tanh(ref * 1.6) / np.tanh(1.6)
        clip = np.clip(clip, -1, 1) * 0.93          # teto em ~0,93, como no arquivo real
        ref = ref * 0.93
        y = aac_roundtrip(clip, os.path.join(DATA, name))
        n = min(len(y), len(ref))
        sf.write(os.path.join(DATA, f"{name}_in.wav"), y[:n].astype(np.float32), SR, subtype="FLOAT")
        sf.write(os.path.join(DATA, f"{name}_ref.wav"), ref[:n].astype(np.float32), SR, subtype="FLOAT")
        meta[name] = {"gain": round(gain, 3), "kind": kind, "clipped_frac": frac}
        print(name, f"ganho {gain:.2f}, amostras acima do teto {frac*100:.1f}%")
    json.dump(meta, open(os.path.join(DATA, "meta.json"), "w"), indent=1)

def si_sdr(est, ref, mask=None):
    n = min(len(est), len(ref)); est, ref = est[:n], ref[:n]
    if mask is not None: est, ref = est[mask[:n]], ref[mask[:n]]
    a = np.dot(est, ref) / (np.dot(ref, ref) + 1e-12); e = a * ref; r = est - e
    return float(10 * np.log10(np.dot(e, e) / (np.dot(r, r) + 1e-12)))

def align(est, ref):
    """compensa atraso fixo (até ±20 ms) do processamento"""
    n = min(len(est), len(ref)); best = (0, -1e9)
    seg = slice(SR, min(n, 6 * SR))
    for lag in range(-960, 961, 8):
        e = np.roll(est[:n], -lag); c = np.dot(e[seg], ref[:n][seg])
        if c > best[1]: best = (lag, c)
    lag = best[0]
    for l2 in range(lag - 8, lag + 9):
        e = np.roll(est[:n], -l2); c = np.dot(e[seg], ref[:n][seg])
        if c > best[1]: best = (l2, c)
    return np.roll(est[:n], -best[0]), best[0]

def lsd(est, ref, mask):
    n = min(len(est), len(ref))
    f, t, E = stft(est[:n], SR, nperseg=1024, noverlap=768); _, _, Rr = stft(ref[:n], SR, nperseg=1024, noverlap=768)
    band = (f >= 1000) & (f <= 12000)
    fr = np.clip((t * SR).astype(int), 0, n - 1); m = np.convolve(mask[:n].astype(float), np.ones(1024), "same")[fr] > 0
    if m.sum() == 0: return float("nan")
    le = 10 * np.log10(np.abs(E[band][:, m]) ** 2 + 1e-10); lr = 10 * np.log10(np.abs(Rr[band][:, m]) ** 2 + 1e-10)
    return float(np.mean(np.sqrt(np.mean((le - lr) ** 2, 0))))

def wer(hyp, ref):
    import re
    norm = lambda s: re.sub(r"[^\w\s]", " ", s.lower()).split()
    h, r = norm(hyp), norm(ref)
    d = np.zeros((len(r) + 1, len(h) + 1), int); d[:, 0] = range(len(r) + 1); d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(r), len(h)] / len(r)

_rec = None
def asr(wav48):
    global _rec
    import sherpa_onnx
    if _rec is None:
        p = f"{MODELS}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
        _rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f"{p}/encoder.int8.onnx", decoder=f"{p}/decoder.int8.onnx",
               joiner=f"{p}/joiner.int8.onnx", tokens=f"{p}/tokens.txt", model_type="nemo_transducer", num_threads=2)
    from scipy.signal import resample_poly
    x16 = resample_poly(wav48, 1, 3).astype(np.float32); x16 = x16 / max(1e-6, np.abs(x16).max()) * 0.9
    s = _rec.create_stream(); s.accept_waveform(16000, x16); _rec.decode_stream(s); return s.result.text

def ceiling_index(x):
    """diagnóstico de empilhamento de picos: N picos de ciclo >= 0,85M / N em [0,60M, 0,75M), M = p99,5 dos picos.
    Fala limpa simulada ~0,33; saturação leve ~0,9; arquivo real ~0,79. Não é monotônico para saturação forte: use só como apoio."""
    from scipy.signal import find_peaks
    pk = np.concatenate([x[find_peaks(x, distance=int(SR / 500))[0]], -x[find_peaks(-x, distance=int(SR / 500))[0]]])
    pk = pk[pk > 0.05 * np.abs(x).max()]; M = np.percentile(pk, 99.5)
    return float(np.sum(pk >= 0.85 * M) / max(1, np.sum((pk >= 0.6 * M) & (pk < 0.75 * M))))

def score(adir):
    adir = os.path.abspath(adir); res = {"approach": os.path.basename(adir)}; outd = os.path.join(adir, "out"); os.makedirs(outd, exist_ok=True)
    meta = json.load(open(os.path.join(DATA, "meta.json")))
    for name in meta:
        inp = os.path.join(DATA, f"{name}_in.wav"); out = os.path.join(outd, f"{name}_out.wav")
        t0 = time.time(); subprocess.run([sys.executable, os.path.join(adir, "run.py"), inp, out], check=True); dt = time.time() - t0
        ref, _ = sf.read(os.path.join(DATA, f"{name}_ref.wav")); xin, _ = sf.read(inp); est, _ = sf.read(out)
        est = est if est.ndim == 1 else est.mean(1); est, lag = align(est, ref)
        m = np.convolve((np.abs(ref) > 0.93).astype(float), np.ones(480), "same") > 0
        r = {"si_sdr_in": si_sdr(xin, ref), "si_sdr_out": si_sdr(est, ref), "si_sdr_clip_in": si_sdr(xin, ref, m),
             "si_sdr_clip_out": si_sdr(est, ref, m), "lsd_clip_in": lsd(xin, ref, m), "lsd_clip_out": lsd(est, ref, m),
             "lag_samples": int(lag), "seconds": round(dt, 1)}
        r["delta_si_sdr"] = r["si_sdr_out"] - r["si_sdr_in"]; r["delta_si_sdr_clip"] = r["si_sdr_clip_out"] - r["si_sdr_clip_in"]
        res[name] = {k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items()}
    # arquivo real
    real_out = os.path.join(outd, "real_out.wav")
    subprocess.run([sys.executable, os.path.join(adir, "run.py"), SRC, real_out], check=True)
    xr, _ = sf.read(SRC); yr, _ = sf.read(real_out); yr = yr if yr.ndim == 1 else yr.mean(1)
    hyp_in, hyp_out = asr(xr), asr(yr)
    res["real"] = {"wer_in": round(wer(hyp_in, REF_TEXT), 4), "wer_out": round(wer(hyp_out, REF_TEXT), 4),
                   "ceiling_in": round(ceiling_index(xr), 4), "ceiling_out": round(ceiling_index(yr), 4),
                   "asr_out": hyp_out, "peak_out": round(float(np.abs(yr).max()), 3), "len_ok": abs(len(yr) - len(xr)) < SR * 0.05}
    json.dump(res, open(os.path.join(adir, "score.json"), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))

if __name__ == "__main__":
    {"make": make, "score": lambda: score(sys.argv[2])}[sys.argv[1]]()
