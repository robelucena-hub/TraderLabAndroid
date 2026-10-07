"""Transcreve a fala com Parakeet TDT v3 (timestamps por token) e Whisper Turbo (texto PT-BR)."""
import sys, json, wave
import numpy as np
import sherpa_onnx

wav_path, models_dir, out_json = sys.argv[1], sys.argv[2], sys.argv[3]
with wave.open(wav_path) as w:
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0

p = f"{models_dir}/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8"
rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=f"{p}/encoder.int8.onnx", decoder=f"{p}/decoder.int8.onnx",
    joiner=f"{p}/joiner.int8.onnx", tokens=f"{p}/tokens.txt",
    model_type="nemo_transducer", num_threads=4)
s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s)
r = s.result
out = {"parakeet": {"text": r.text, "tokens": list(r.tokens), "timestamps": list(r.timestamps),
                    "durations": list(getattr(r, "durations", []) or [])}}
print("PARAKEET:", r.text)

w = f"{models_dir}/sherpa-onnx-whisper-turbo"
rec2 = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{w}/turbo-encoder.int8.onnx", decoder=f"{w}/turbo-decoder.int8.onnx",
    tokens=f"{w}/turbo-tokens.txt", language="pt", task="transcribe", num_threads=4,
    tail_paddings=1000)
# Whisper processa no máximo 30 s por vez: divide em dois blocos com sobreposição
texts = []
for a, b in [(0, 21.0), (19.0, len(x) / sr)]:
    s2 = rec2.create_stream(); s2.accept_waveform(sr, x[int(a*sr):int(b*sr)]); rec2.decode_stream(s2)
    texts.append({"start": a, "end": b, "text": s2.result.text})
    print(f"WHISPER [{a}-{b}]:", s2.result.text)
out["whisper"] = texts
json.dump(out, open(out_json, "w"), ensure_ascii=False, indent=1)
