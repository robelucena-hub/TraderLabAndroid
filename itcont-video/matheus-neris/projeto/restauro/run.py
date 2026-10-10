"""classic2: Janssen/LSAR (limite inferior = |x| observado) autoregressive declipping, local to clipped regions (identity elsewhere).
usage: python3 run.py <in.wav> <out.wav>   (mono float WAV, 48 kHz; zero latency, same length)"""
import os, sys
for v in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS"): os.environ.setdefault(v, "2")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, soundfile as sf
from lsar import declip

PARAMS = dict(th_core=0.80, dil=0, p=64, ctx=1024, lb=None, n_iter=3, ridge=1e-4)

def main(inp, out):
    x, sr = sf.read(inp, dtype="float64")
    x = x if x.ndim == 1 else x.mean(1)
    y, U = declip(x, **PARAMS)
    sf.write(out, y.astype(np.float32), sr, subtype="FLOAT")

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
