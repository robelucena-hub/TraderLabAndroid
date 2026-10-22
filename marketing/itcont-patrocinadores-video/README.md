# ITCONT UEFS — Vídeo dos patrocinadores (motion graphics)

Duas versões, 30 fps, ~32 s, sem áudio:
- **Vertical 1080 × 1920** — Reels/Stories (adicione a música direto no Instagram).
- **Horizontal 1920 × 1080 (16:9)** — datashow/telão em tela cheia.

| Arquivo | Conteúdo |
| --- | --- |
| `itcont-patrocinadores.mp4` | Vídeo vertical (H.264), pronto para Reels/Stories |
| `itcont-patrocinadores-16x9.mp4` | Vídeo horizontal (H.264), para datashow em tela cheia |
| `capa.png` / `capa-16x9.png` | Quadro do mural completo de cada versão |
| `index.html` | Fonte editável da animação (HTML/CSS + GSAP). Abra no navegador para pré-visualizar em loop; acrescente `?format=16x9` para a versão horizontal |
| `sponsors.js` | Lista e ordem dos patrocinadores (gerada por `prep_logos.py`) |
| `prep_logos.py` | Prepara os logos: recorta, padroniza tamanho e mantém a cor de fundo original |
| `render-video.mjs` | Exporta o MP4 quadro a quadro com Playwright + ffmpeg |
| `assets/sponsors/originais/` | Arquivos originais recebidos |
| `assets/sponsors/tiles/` | Logos já padronizados usados no vídeo |

## Roteiro
1. **0–4 s · Abertura:** feixe de luz abre a placa com o logo do ITCONT; entra o título "NOSSOS PATROCINADORES".
2. **4–23 s · Vitrine:** carrossel 3D apresenta um patrocinador por vez (≈1,75 s cada), com indicadores de progresso.
3. **23–27,5 s · Mural:** todos os 11 logos juntos.
4. **27,5–32 s · Encerramento:** "OBRIGADO PELO APOIO!" com os logos do ITCONT e do Contador do Amanhã.

## Como alterar
- **Adicionar, remover ou reordenar patrocinadores:** coloque o arquivo em `assets/sponsors/originais/`, ajuste a lista `SPONSORS` em `prep_logos.py` e rode `python3 prep_logos.py`. O vídeo se ajusta sozinho (indicadores, mural e duração).
- **Textos:** no `index.html`, procure `NOSSOS`, `PATROCINADORES`, `OBRIGADO` e `PELO APOIO!`.
- **Tempo de cada logo:** constantes `HOLD` (parado) e `MOVE` (transição) no `index.html`.

## Como exportar
```bash
python3 prep_logos.py          # só se mudar os logos
node render-video.mjs          # gera itcont-patrocinadores.mp4 e capa.png
node render-video.mjs --format 16x9   # gera itcont-patrocinadores-16x9.mp4 e capa-16x9.png
node render-video.mjs --stills 5,12.5,26   # quadros avulsos para conferência (pasta stills/)
```
Requer Node com Playwright (Chromium) e ffmpeg com libx264.

## No datashow
Abra `itcont-patrocinadores-16x9.mp4` no VLC, Windows Media Player ou PowerPoint em tela cheia.
Para repetir sem parar: no VLC, ative "Repetir" (tecla **L**); no PowerPoint, insira o vídeo no slide
e marque **Reproduzir em tela inteira** + **Repetir até parar**.
