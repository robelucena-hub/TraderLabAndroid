# Declip bake-off verdict (Matheus Neris, ITCONT 2026)

**Winner: `classic`** (Janssen/LSAR AR declipper): `../classic/run.py`, already rendered at `../classic/out/real_out.wav`.
Ranking: **classic > spade > neural (≈ identity)**.

## 1. Harness numbers (re-read from each score.json)

| approach | hard_mild dSI-SDR / clip / LSD | hard_strong | soft_strong | avg dSI-SDR_clip | avg LSD_clip | real WER | ceiling | lag | len |
|---|---|---|---|---|---|---|---|---|---|
| identity | 0 / 0 / 9.50 | 0 / 0 / 11.93 | 0 / 0 / 14.77 | 0.000 | 12.066 | 0.0652 | 0.791 | 0 | ok |
| **classic** | **+0.384 / +0.755 / 8.027** | **+1.905 / +2.058 / 9.884** | +1.559 / +1.650 / **13.956** | **+1.488** | **10.622** | **0.0435** | 0.555 | 0 | ok |
| spade | +0.262 / +0.505 / 8.505 | +1.212 / +1.245 / 10.624 | **+2.352 / +2.100** / 14.521 | +1.283 | 11.217 | 0.0543 | **0.542** | 0 | ok |
| neural | +0.035 / +0.051 / 9.340 | +0.055 / +0.066 / 11.669 | +0.016 / +0.054 / 14.279 | +0.057 | 11.763 | 0.0435 | 0.777 | 0 | ok |

- classic wins hard_mild, which is the case closest to the real file, on all three metrics. It also wins hard_strong and has the best average LSD and average dSI-SDR_clip. spade is better only on soft_strong (tanh), and the real file is hard-clipped.
- Every approach passes the gates: real WER ≤ 0.0652, lag 0, length preserved. Treat the WER differences as ASR jitter. neural gets 0.0435 while barely touching the signal.
- neural reports `worked=false`, honestly: no pretrained declipper could be reached, and its output is effectively the input (−38 dB difference energy).

## 2. Artifact inspection on the REAL output (`real_checks.json`, `cmp_*.png`, `zoom_*.png`, `zoom_click_and_sim.png`)

| check | classic | spade | neural |
|---|---|---|---|
| samples changed | 0.215 % (361 regions) | 0.185 % (279) | 15.1 % (HF gain) |
| max abs diff outside ±10 ms of \|x\|≥0.8 | **0.0 (bit-identical)** | **0.0** | 0.022 |
| silence frames (< −50 dBFS) max diff | 0.0 | 0.0 | 4.7e-5 |
| max sample step in → out | 1.095 → **1.095** | 1.095 → **1.263** (new largest step) | 1.095 → 1.083 |
| largest step increase at an edit edge | 0.143 | 0.220 | 0.0004 |
| LPC-residual click detector (out/in residual peak, changed frames) | median 1.00, **max 1.07**, 0 frames > 1.5× | median 1.00, p95 1.69, **max 2.90 (28.66 s), 23 frames > 1.5×** | max 1.01 |
| new energy above 17 kHz (input is band-limited at 16.5 kHz by AAC) | −77.3 dBFS overall (input −78.3), 27 frames | **−70.8 dBFS, 222 frames** (visible broadband stripes at 2.17 s, 12.42 s, 35.2–35.8 s) | none |
| frame-level change (active, 20 ms) max / p99 | 0.27 / 0.10 dB | 0.39 / 0.14 dB | 0.17 / 0.12 dB |
| peak out | 1.29 | 1.297 | 1.167 |

What the plots show:
- **2.0–3.2 s (worst clipping):** classic and spade both round off the smeared plateaus, and the diff traces are confined to the loud glottal peaks. There is no smearing in the spectrogram, and the silences are unchanged.
- **34.8–36.2 s:** at 35.681 s spade boosts a sibilant near-Nyquist oscillation (0.947→1.175, −0.959→−1.172), which makes the harsh /s/ louder. classic leaves it almost unchanged (0.955 / −0.975). At 34.153 s classic turns a smeared AAC plateau (0.959, 0.944, 0.944, 0.92, …) into a smooth peak up to 1.23, which is the desired behaviour.
- **12.0–13.0 s (sibilance):** classic changes almost nothing there. spade adds a broadband >16.5 kHz stripe around 12.42 s.
- **Simulated hard_strong (`zoom_click_and_sim.png`):** classic gets back most of the lost peak at 140.4 ms (reference 1.92, classic ≈ 1.75, input 1.0).
- None of the three adds musical noise, pumping or hiss. Outside the clipped neighbourhoods classic and spade are bit-identical to the input.

Conclusion: spade's extra impulsive residual and >17 kHz stripes indicate small step and crackle artifacts at block and mask edges. classic shows none of them on any objective check, and it scores better on the cases that match the real file. **Winner: classic.**

## 3. Post chain for the voice (after classic, before any compression, loudness normalisation or limiter)

Measurements on `classic/out/real_out.wav` (`spec_analysis.py`, `spectrum_analysis.png`):
- Sibilance is centred at 6.7 kHz (centroid 7.1 kHz). The LTAS has local peaks of +5.9 dB at 6.9 kHz and +7 dB at 8.6 kHz above the octave trend.
- There is a proximity bump around 160–300 Hz (+5 dB at 164 Hz).
- Residual clipping fizz in the simulated clipped frames sits at **12–16 kHz** (classic still +0.9 / +3.3 dB over the reference; the bands below 12 kHz are within ±0.5 dB).
- The "LF bursts" (3.83, 13.43, 15.18, 15.33, 25.39 s) are F0 energy (117–234 Hz), not plosive pops: the energy below 50 Hz is 10+ dB lower. A highpass at 80 Hz is enough, and a dynamic plosive stage is not needed.

**Recommended chain (S)**, saved in `post_chain.txt`:
```
highpass=f=80,equalizer=f=280:t=q:w=1.1:g=-2,equalizer=f=6900:t=q:w=1.4:g=-1.5,equalizer=f=13500:t=h:w=0.7:g=-3,acrossover=split=4500:order=4th[lo][hi];[hi]acompressor=threshold=0.1:ratio=3:attack=2:release=80:knee=4:detection=rms[hc];[lo][hc]amix=inputs=2:normalize=0
```
Its parts:
- an 80 Hz highpass for rumble and handling noise;
- −2 dB at 280 Hz for proximity mud (the house pattern);
- −1.5 dB static at 6.9 kHz for the sibilant resonance;
- a −3 dB high shelf at 13.5 kHz for the clipping fizz;
- a split-band de-esser: an LR4 crossover at 4.5 kHz, with only the high band compressed (smooth gain, rms detection, attack 2 ms, release 80 ms).

Measured on the real winner output (`post_eval.py`; Parakeet WER through the harness functions):

| chain | WER | lag | sibilant 4–10 kHz mean / p95 | voiced 300–3k | voiced 4–10k | clipped-frame 12–16k | >17 kHz splatter |
|---|---|---|---|---|---|---|---|
| none (classic) | 0.0435 | 0 | 0 / 0 | 0 | 0 | 0 | −77.3 dBFS |
| **S (recommended)** | **0.0435** | 4 smp* | **−6.2 / −7.7 dB** | −0.56 dB | −1.95 dB | −6.1 dB | −78.9 dBFS (clean) |
| W (zero-lag alternative) | 0.0543 | 0 | −7.2 / −9.1 dB | −0.68 dB | −2.05 dB | −6.1 dB | −78.8 dBFS |
| A: static EQ + `deesser=i=0.3` | 0.0435 | 0 | −4.8 / −6.6 dB | −0.59 dB | −1.79 dB | −4.6 dB | **−58.3 dBFS, 5 ms frames up to −31 dBFS (distortion)** |
| static EQ + `deesser=i=0.35` | **0.087 (> wer_in)** | 0 | −8.1 dB | | | | |
| static EQ + `deesser=i=0.45` (B) | 0.0652 | 0 | −13.4 dB (lisping) | | | | |

\*The 4 samples (0.08 ms) are not latency. They are the low-frequency group delay of the LR4 crossover's all-pass sum (2/(Q·ω0) ≈ 0.1 ms). There is no bulk delay, it is far below any A/V-sync or audibility threshold, and the xcorr lag compensation in `proj/audio.py` would absorb it anyway. If a strict lag of exactly 0 is required, use **W**:
```
highpass=f=80,equalizer=f=280:t=q:w=1.1:g=-2,equalizer=f=6900:t=q:w=1.4:g=-1.5,equalizer=f=13500:t=h:w=0.7:g=-3,asplit=2[m][s];[s]highpass=f=4500,highpass=f=4500[sc];[m][sc]sidechaincompress=threshold=0.1:ratio=3:attack=2:release=80:knee=4:detection=rms
```
W is a wideband sidechain de-esser. It ducks 8.3 % of active frames by more than 3 dB, by up to 9.6 dB, so there is some risk of audible level dips next to /s/. That is why S is preferred.

Rejected:
- **ffmpeg `deesser` (the house `deesser=i=0.25`).** It modulates gain at audio rate and adds broadband distortion: energy above 17 kHz rises by about 19 dB at i=0.3. It is also very steep: i=0.30 gives −4.8 dB and i=0.35 gives −8.1 dB, and at i=0.35 the ASR loses /s/ ("tecnológica contábil" → "tecnológicos", "UEFS" → "UEF").
- **`adynamicequalizer` in ffmpeg 6.1.** Its threshold and range behave non-monotonically in tone tests (range does not limit the cut, and quieter input gets more cut), so it is unsafe.
- **Parallel "x − (1−g)·HP" dynamic shelf (P).** The highpass phase stops the cancellation, giving +0.3 dB instead of a cut.

## 4. Notes and risks for the mix
- For this voice, **do not use the house VOICE_FX presence boosts** (`equalizer=f=3400 g=+2`, `equalizer=f=9000:t=h g=+1`) or its `deesser`. They push up exactly the bands where the clipping residue and the sibilance sit. Replace the EQ and de-ess part with S. afftdn and agate are not needed either, because the phone already gated the silences (and afftdn adds 25 ms).
- Apply S at the declipped signal's native level (peak ≈ 1.29 float), *before* any gain or compression. The de-esser threshold (0.1 ≈ −20 dBFS rms on the >4.5 kHz band) was calibrated at this level: the high band's 10 ms RMS is p50 −41, p90 −23, p97 −14 and p99 −11 dBFS. Process in float, because the peaks exceed 1.0 after declipping and S raises the peak to 1.36. Leave the limiting and loudness normalisation for the final mix, as planned.
- Declipping only partly removes the AAC-smeared distortion. The loudest syllables (2.0–3.2 s, 34.8–36.0 s) are less harsh but not perfectly clean, and the S chain's 13.5 kHz shelf and HF compression hide most of what is left.
- No human listening test was done. All of the evidence is objective: the harness, step and LPC-residual click checks, >17 kHz splatter, band-level deltas, and visual inspection of the waveforms and spectrograms.

Files: `inspect_outputs.py`, `real_checks.json`, `click_check.py`, `hf_check.py`, `spec_analysis.py`, `post_eval.py` and `post_eval_batch{1..6}.json` (all chain results and ASR text), `post_chain.txt`, `cmp_*.png`, `zoom_*.png`, `post_chain_A_spectrograms.png` (shows the `deesser` splatter), `spectrum_analysis.png`. matplotlib was pip-installed into `judge/pylib` and is used only for plotting.
