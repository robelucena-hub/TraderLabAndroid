"""QC: transcreve um WAV (ou trechos) para conferir se os cortes preservam as palavras."""
import sys, wave, subprocess, numpy as np, sherpa_onnx, os
M = sys.argv[1]; fn = sys.argv[2]; wins = [tuple(map(float, w.split(':'))) for w in sys.argv[3:]]
tmp = fn + '.16k.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', fn, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', tmp], check=True)
p = f'{M}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8'
r = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f'{p}/encoder.int8.onnx', decoder=f'{p}/decoder.int8.onnx',
    joiner=f'{p}/joiner.int8.onnx', tokens=f'{p}/tokens.txt', model_type='nemo_transducer', num_threads=4)
with wave.open(tmp) as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
for a, b in (wins or [(0, len(x) / sr)]):
    s = r.create_stream(); s.accept_waveform(sr, x[int(a * sr):int(b * sr)]); r.decode_stream(s)
    print(f'{os.path.basename(fn)} {a:5.2f}-{b:5.2f}: {s.result.text}')
os.remove(tmp)
