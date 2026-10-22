# ITCONT UEFS — Retrospectiva do evento (motion graphics)

Vídeo-resumo da I Imersão Tecnológica Contábil com fotos e vídeos do evento, em duas versões (30 fps, ~50 s, sem áudio):
- **Vertical 1080 × 1920** — Reels/Stories (`itcont-retrospectiva.mp4`)
- **Horizontal 1920 × 1080** — datashow/telão (`itcont-retrospectiva-16x9.mp4`)

> **Privacidade:** as fotos/vídeos do evento (pessoas identificáveis) e os MP4 gerados **não** são versionados —
> a pasta `media/` e os arquivos `*.mp4`/`capa*.png` estão no `.gitignore`, porque este repositório é público.
> Para renderizar de novo, coloque os arquivos originais em `media/originais/` com os nomes listados em `prep_media.py`.

## Roteiro
1. **Abertura** — feixe de luz abre a placa do ITCONT, com "RETROSPECTIVA".
2. **Lema** — INOVAÇÃO · PRÁTICA · CONEXÕES — para o futuro da contabilidade.
3. **Conhecimento** — palco, mesa e palestrantes.
4. **Participação** — auditório, com contagem até **336 inscritos** e o detalhamento 276 discentes · 19 docentes · 41 profissionais contábeis.
5. **Conexões** — fotos de grupo.
6. **Encerramento** — "Obrigado por fazer parte dessa transformação!" com os logos do ITCONT e do Contador do Amanhã.

## Arquivos
| Arquivo | Conteúdo |
| --- | --- |
| `index.html` | Animação editável (HTML/CSS + GSAP). O roteiro fica no bloco `CHAPTERS`; `?format=16x9` mostra a versão horizontal |
| `prep_media.py` | Recorta fotos (remove a marca "Galaxy S23 FE"), converte HEIC e extrai os trechos de vídeo em quadros |
| `render-video.mjs` | Exporta o MP4 quadro a quadro (Playwright + ffmpeg, em paralelo) |

## Como alterar e exportar
- **Trocar a ordem, o tempo ou os textos:** edite `CHAPTERS` no `index.html` (`dur` = segundos na tela, `speed` < 1 = câmera lenta).
- **Trocar o trecho de um vídeo ou o recorte de uma foto:** edite `CLIPS`/`PHOTOS` em `prep_media.py` e rode-o de novo.

```bash
python3 prep_media.py                  # requer pillow e pillow-heif (fotos HEIC do iPhone)
node render-video.mjs                  # vertical  -> itcont-retrospectiva.mp4 + capa.png
node render-video.mjs --format 16x9    # datashow  -> itcont-retrospectiva-16x9.mp4 + capa-16x9.png
node render-video.mjs --stills 10,25   # quadros avulsos para conferência
```
