"""Vocal isolation with MDX-Net ONNX models (UVR public models), CPU onnxruntime.

Standard UVR/MDX inference re-implemented in numpy:
  * 44.1 kHz stereo, chunk = hop*(dim_t-1) samples, torch-compatible STFT
    (periodic Hann, center=True reflect padding), model input [B,4,dim_f,dim_t]
    with channels [L_re, L_im, R_re, R_im]; bins >= dim_f zeroed, lowest 3 bins zeroed.
  * optional 'denoise' (UVR): 0.5*model(S) - 0.5*model(-S)  (cancels model noise floor)
  * overlapping chunks, Hann cross-fade, overlap-add / window-sum normalisation,
    trim = n_fft//2 at chunk edges, 'compensate' gain per model.

Usage:
  python3 -I sep.py run  <model.onnx> <n_fft> <compensate> <out.npy> [--overlap 0.75] [--denoise] [--in wav]
  python3 -I sep.py final <out_dir> <stem1.npy> [stem2.npy ...]   (average, LP 16 kHz -> 48 kHz mono + residual)

Delivered with:
  sep.py run ../mdx_models/Kim_Vocal_2.onnx        7680 1.009 stems/kim2_7680_dn.npy  --overlap 0.75 --denoise
  sep.py run ../mdx_models/UVR-MDX-NET-Voc_FT.onnx 7680 1.021 stems/vocft_7680_dn.npy --overlap 0.75 --denoise
  sep.py final . stems/kim2_7680_dn.npy stems/vocft_7680_dn.npy
"""
import sys, os, argparse, time
import numpy as np, soundfile as sf
from scipy.signal import get_window, resample_poly

SR = 44100


def stft(x, n_fft, hop, win):
    """x [B, L] -> complex [B, F, T]; mirrors torch.stft(center=True, pad_mode='reflect')."""
    pad = n_fft // 2
    xp = np.pad(x, ((0, 0), (pad, pad)), mode="reflect")
    nfr = 1 + x.shape[1] // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(nfr)[:, None]
    fr = xp[:, idx] * win
    return np.fft.rfft(fr, axis=-1).transpose(0, 2, 1)


def istft(X, n_fft, hop, win, length):
    """X [B, F, T] -> [B, length]; mirrors torch.istft(center=True, length=length)."""
    fr = np.fft.irfft(X.transpose(0, 2, 1), n=n_fft, axis=-1) * win
    B, T, _ = fr.shape
    out = np.zeros((B, n_fft + hop * (T - 1)))
    ws = np.zeros(n_fft + hop * (T - 1))
    w2 = win ** 2
    for t in range(T):
        out[:, t * hop:t * hop + n_fft] += fr[:, t]
        ws[t * hop:t * hop + n_fft] += w2
    pad = n_fft // 2
    return out[:, pad:pad + length] / np.maximum(ws[pad:pad + length], 1e-8)


class MDX:
    def __init__(self, path, n_fft, threads=2):
        import onnxruntime as ort
        so = ort.SessionOptions()
        so.intra_op_num_threads = threads
        so.inter_op_num_threads = 1
        self.sess = ort.InferenceSession(path, so, providers=["CPUExecutionProvider"])
        inp = self.sess.get_inputs()[0]
        self.iname = inp.name
        _, c, self.dim_f, self.dim_t = inp.shape
        assert c == 4
        self.n_fft, self.hop = n_fft, 1024
        self.n_bins = n_fft // 2 + 1
        self.chunk = self.hop * (self.dim_t - 1)
        self.win = get_window("hann", n_fft).astype(np.float64)  # periodic

    def spec(self, w):  # w [B, 2, chunk] -> [B, 4, dim_f, dim_t]
        B = w.shape[0]
        X = stft(w.reshape(B * 2, -1), self.n_fft, self.hop, self.win)  # [B*2, F, T]
        X = X.reshape(B, 2, self.n_bins, self.dim_t)[:, :, :self.dim_f]
        S = np.stack([X.real, X.imag], 2).reshape(B, 4, self.dim_f, self.dim_t)
        S[:, :, :3, :] = 0
        return S.astype(np.float32)

    def wave(self, S):  # [B, 4, dim_f, dim_t] -> [B, 2, chunk]
        B = S.shape[0]
        S = S.reshape(B, 2, 2, self.dim_f, self.dim_t).astype(np.float64)
        X = np.zeros((B, 2, self.n_bins, self.dim_t), np.complex128)
        X[:, :, :self.dim_f] = S[:, :, 0] + 1j * S[:, :, 1]
        y = istft(X.reshape(B * 2, self.n_bins, self.dim_t), self.n_fft, self.hop, self.win, self.chunk)
        return y.reshape(B, 2, self.chunk)

    def run(self, S):
        return self.sess.run(None, {self.iname: S})[0]

    def demix(self, mix, overlap=0.75, denoise=False, batch=1):
        """mix [2, N] float -> vocals [2, N]."""
        N = mix.shape[1]
        chunk, trim = self.chunk, self.n_fft // 2
        step = int((1 - overlap) * chunk)
        lead = chunk - step + trim  # every real sample is covered by the full set of overlapping chunks
        total = lead + N + chunk
        total += (-total) % step
        mixture = np.zeros((2, total + chunk))
        mixture[:, lead:lead + N] = mix
        out = np.zeros_like(mixture)
        div = np.zeros(mixture.shape[1])
        # cross-fade window: Hann over the usable part, zero over the trimmed edges
        fade = np.zeros(chunk)
        fade[trim:chunk - trim] = np.hanning(chunk - 2 * trim)
        starts = list(range(0, lead + N + trim, step))
        for k in range(0, len(starts), batch):
            ss = starts[k:k + batch]
            w = np.stack([mixture[:, s:s + chunk] for s in ss])
            S = self.spec(w)
            P = 0.5 * self.run(S) - 0.5 * self.run(-S) if denoise else self.run(S)
            y = self.wave(P)
            for j, s in enumerate(ss):
                out[:, s:s + chunk] += y[j] * fade
                div[s:s + chunk] += fade
        return (out / np.maximum(div, 1e-8))[:, lead:lead + N]


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12)


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("run")
    r.add_argument("model"); r.add_argument("n_fft", type=int); r.add_argument("compensate", type=float)
    r.add_argument("out")
    r.add_argument("--overlap", type=float, default=0.75)
    r.add_argument("--denoise", action="store_true")
    r.add_argument("--threads", type=int, default=2)
    r.add_argument("--in", dest="inp", default=None)
    f = sub.add_parser("final")
    f.add_argument("out_dir"); f.add_argument("stems", nargs="+")
    f.add_argument("--in", dest="inp", default=None)
    a = ap.parse_args()
    here = os.path.dirname(os.path.abspath(__file__))
    inp = a.inp or os.path.join(here, "..", "work", "audio_orig.wav")
    x, sr = sf.read(inp, always_2d=True, dtype="float64")
    assert sr == SR and x.shape[1] == 2
    mix = x.T

    if a.cmd == "run":
        m = MDX(a.model, a.n_fft, a.threads)
        t0 = time.time()
        v = m.demix(mix, a.overlap, a.denoise) * a.compensate
        np.save(a.out, v.astype(np.float32))
        vm, om = v.mean(0), mix.mean(0)
        seg = lambda s, t0_, t1_: s[int(t0_ * SR):int(t1_ * SR)]
        g = float(np.dot(seg(om, 0, 22.96), seg(vm, 0, 22.96)) / np.dot(seg(vm, 0, 22.96), seg(vm, 0, 22.96)))
        print(f"{os.path.basename(a.model)} nfft={a.n_fft} comp={a.compensate} ov={a.overlap} dn={a.denoise} "
              f"t={time.time() - t0:.0f}s | music-only orig {rms_db(seg(om, 23.1, 25.6)):.1f} voc {rms_db(seg(vm, 23.1, 25.6)):.1f} dB"
              f" | speech orig {rms_db(seg(om, 0, 22.96)):.1f} voc {rms_db(seg(vm, 0, 22.96)):.1f} | LS gain {g:.3f}")
        return

    # final: average stems, mono, 48 kHz, residual
    v = np.mean([np.load(p).astype(np.float64) for p in a.stems], 0)
    # the source (AAC) is band-limited at ~15.5 kHz; the models synthesise a faint (~-108 dBFS) floor
    # between 15.5 and 17.6 kHz -> remove it with a zero-phase low-pass (no delay, alignment preserved)
    from scipy.signal import butter, sosfiltfilt
    v = sosfiltfilt(butter(8, 16000 / (SR / 2), "low", output="sos"), v, axis=-1)
    vm, om = v.mean(0), mix.mean(0)
    v48 = resample_poly(vm, 160, 147)
    o48 = resample_poly(om, 160, 147)
    n48 = int(round(len(om) * 48000 / SR))
    v48, o48 = v48[:n48], o48[:n48]
    os.makedirs(a.out_dir, exist_ok=True)
    sf.write(os.path.join(a.out_dir, "vocals_48k.wav"), v48.astype(np.float32), 48000, subtype="FLOAT")
    sf.write(os.path.join(a.out_dir, "music_residual_48k.wav"), (o48 - v48).astype(np.float32), 48000, subtype="FLOAT")
    print("wrote", n48, "samples", n48 / 48000, "s")


if __name__ == "__main__":
    main()
