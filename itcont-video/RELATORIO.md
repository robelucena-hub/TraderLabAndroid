# ITCONT — Vídeo-convite (Reels/Stories): relatório de edição

## Entregáveis

| Arquivo | Conteúdo |
|---|---|
| `ITCONT_convite_1080x1920.mp4` | Versão principal: 1080 × 1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, cor BT.709, 39,53 s, −14 LUFS |
| `legendas_ITCONT.srt` | Legendas revisadas em português, sincronizadas com o vídeo editado (máx. 2 linhas) |
| `transcricao.md` | Transcrição da gravação original, com tempos e momentos identificados |
| `projeto/` | Projeto editável: `edit.json` (cortes, textos, tempos) + scripts que reproduzem toda a edição (`run_all.sh`) |

## Análise prévia

- **Fala:** transcrita com dois reconhecedores locais (Parakeet v3 e Whisper Turbo) e revisada à mão. Momentos: apresentação (1,7–13,8 s), anúncio do evento (14,2–22,0 s), informações práticas — data e inscrição (22,6–34,6 s), convite final (34,7–39,2 s).
- **Referência (YouTube 61u9wOT-Cds):** não foi possível acessá-la — o domínio youtube.com está bloqueado pela política de rede deste ambiente. Segui a direção artística do briefing.
- **Logos:** só o vídeo veio anexado; as logos do ITCONT, do Contador do Amanhã e da UEFS não estavam disponíveis. Os títulos foram compostos em texto, sem brasões nem logotipos inventados.

## Conferência dos dados do evento (planejamento × gravação)

| Dado | Planejamento | O que a gravação diz | No vídeo |
|---|---|---|---|
| Data | 21 e 22 de outubro de 2026 | "nos dias 21 e 22 de outubro, desse mês" (o ano não é falado) | Card sincronizado à fala: "21 e 22 de outubro · 2026" |
| Horário | 19h às 21h30 | **não é mencionado** | Card exibido (dado do planejamento) |
| Local | Auditório III do Módulo IV — UEFS | **não é mencionado** | Card exibido (dado do planejamento) |
| Realização | Projeto de Extensão Contador do Amanhã | não é mencionado (na fala: "sou professor aqui da UEFS") | Tarja de identificação e tela final |
| Edição | — | "a **primeira** Imersão Tecnológica Contábil" | Selo "1ª edição" |
| Inscrição | — | "se inscreve lá no Even… e aqui no link na descrição" | "Inscrições: link na descrição" (sem link nem QR code) |

**Não há divergência** entre a fala e o planejamento. Mas **horário e local não aparecem na fala**: entram nos cards
porque são os dados que você passou, mas precisam ser confirmados antes de publicar. Para exibir só a data,
troque `"show_unspoken_info": true` por `false` em `projeto/edit.json` e rode a renderização de novo.
A fala diz "Even" (provavelmente a plataforma Even3, mas o "3" não é pronunciado); a legenda mantém "Even".

## Relação de cortes

Pontos de corte escolhidos em vales de energia do áudio (análise a cada 5 ms), com micro-fades de 8 ms.
O áudio editado foi transcrito de novo para confirmar que nenhuma palavra foi cortada.

| # | Tempo no vídeo final | Tempo no original | Conteúdo | Decisão |
|---|---|---|---|---|
| H | 0:00,00–0:01,73 | 37,57–39,30 | "Venha para o ITCONT!" | Gancho de abertura (flash-forward da sua frase final) + título "O futuro da contabilidade está chegando" |
| A | 0:01,73–0:14,20 | 1,50–13,97 | "Fala, galera! … doutorado também em Contabilidade." | Removido 1,5 s inicial sem fala |
| B | 0:14,20–0:21,60 | 14,10–21,50 | "Convido vocês … chamada ITCONT, da UEFS." | Pausa encurtada; removido "tá certo?" (21,50–22,50) |
| C | 0:21,60–0:26,33 | 22,50–27,23 | "Vai acontecer nos dias 21 e 22 de outubro, desse mês." | Removido "tá?" (27,23–27,90) |
| D | 0:26,33–0:29,17 | 27,90–30,73 | "Corre, se inscreve lá no Even" | Removida a hesitação "né, Eventos," + pausa (30,72–32,10) |
| E | 0:29,17–0:36,53 | 32,10–39,47 | "e aqui no link na descrição. E sucesso! Espero vocês lá, tá bom? Venha para o ITCONT!" | Convite final preservado na íntegra |
| — | 0:36,53–0:39,53 | — | Tela de encerramento (3 s) | Texto editorial, sem fala atribuída a você |

Duração final: 39,53 s (original: 39,47 s). A frase "Venha para o ITCONT!" aparece duas vezes, como gancho e como
fecho, por ser o trecho mais forte e curto para os primeiros 2 segundos. Os cortes de A–E disfarçam os jump cuts com
mudança de enquadramento (punch-in).

## Imagem

- **Cor:** o arquivo vem marcado como HLG/BT.2020 (foi recodificado pelo clideo). A conversão HLG→SDR literal deixava a
  imagem lavada ou escura e avermelhada, então o sinal foi interpretado como BT.709, com correção discreta: contraste
  +4 %, saturação +8 %, gama 0,98, altas luzes levemente mais frias (parede) e nitidez leve. A saída é marcada
  explicitamente como BT.709 (primárias, transferência e matriz, faixa limitada) para não aparecer desbotada.
- **Marca d'água "clideo.com":** removida por reenquadramento, sem borrão nem clonagem. Nenhum quadro exibe as linhas
  do original onde ela estava (y ≥ 1836 px); um teste automático verifica isso nos 1.186 quadros.
- **Recorte do apresentador:** RobustVideoMatting (ResNet-50, temporal), com a cor das bordas reconstruída a partir do
  interior (cabelo, pele, camiseta), o que evita halo. O fundo é substituído só no gancho (1,7 s, fundo azul-marinho).
  No restante, a parede real é mantida e grade, circuitos, partículas, títulos e cards ficam **atrás** de você.
  Só passam à frente a tarja, as legendas e as transições; mãos e gestos sempre cobrem os gráficos.
- **Espaço para títulos:** a parede foi estendida acima do quadro (até 240 px), sintetizada a partir da própria parede,
  o que permite "inclinar" a câmera e abrir área para os títulos sem cobrir o rosto.
- **Zooms:** de 1,00× a 1,235× no máximo, com pequenos push-ins contínuos e punch-ins em "Convido vocês", no
  ITCONT e no convite final.

## Motion sincronizado à fala (tempos do vídeo final)

| Tempo | Elemento |
|---|---|
| 0,0 s | Fundo azul-marinho com grade e circuitos; título "O futuro da / contabilidade / está chegando" em revelação por máscara |
| 1,7 s | Cortina de transição (azul elétrico/ciano) revela a parede real; a grade e os circuitos se desenham |
| 3,4 s | Tarja: "Rômulo Benício" / "Coordenador do Projeto de Extensão" / "**Contador do Amanhã**" |
| 5,9 s | Selo "UEFS" no momento em que você diz "UEFS" |
| 7,3–12,5 s | "Formação acadêmica — Contabilidade": linha de conexão chega a Graduação, Mestrado e Doutorado (em conclusão) quando cada um é dito |
| 16,8 s | Selo "1ª edição" em "primeira" |
| 17,2 / 17,9 / 18,8 s | "IMERSÃO" · "TECNOLÓGICA" · "CONTÁBIL", palavra a palavra |
| 19,96 s | Revelação de **ITCONT** (máscara do centro para as bordas, brilho e linhas de circuito) + leve zoom |
| 20,1 / 21,1 s | "Imersão Tecnológica Contábil" + selo "UEFS" |
| 22,4–25,4 s | Card de data: "21" e "e 22" entram quando são ditos, depois "de outubro" e "2026" |
| 25,9 / 26,5 s | Cards de horário e local |
| 29,6 s | Cards saem; entra "Inscrições — Link na descrição" |
| 35,3 s | "ITCONT" atrás da sua cabeça no "Venha para o ITCONT!" |
| 36,3–39,5 s | Encerramento: ITCONT, Imersão Tecnológica Contábil · UEFS, data, horário, local, inscrições, "Participe do ITCONT. Esperamos você!", Realização: Projeto de Extensão Contador do Amanhã |

**Tipografia:** Sora (títulos), Inter (legendas/textos) e JetBrains Mono (rótulos técnicos), todas com licença
SIL OFL e incluídas em `projeto/graphics/fonts`.
**Paleta:** azul-marinho #0A1B3F, azul elétrico #1F5EFF, branco e detalhes ciano #22D3EE.
**Áreas seguras:** todos os textos ficam entre y = 236 e y = 1500 px, e as legendas entre x = 130 e x = 950 px,
longe dos controles do Reels e dos Stories.

## Legendas

Embutidas no vídeo e entregues em `.srt`. Caixa azul-marinho translúcida, Inter Bold 42 px, no máximo duas linhas
com quebra equilibrada. Os termos-chave (ITCONT, UEFS, Rômulo Benício, Imersão Tecnológica Contábil,
21 e 22 de outubro, link na descrição) aparecem em ciano, sem animação, para não competir com os títulos.

## Áudio

- **Voz:** mono, passa-altas em 80 Hz, redução de ruído moderada (~10 dB), expansor suave para encurtar a cauda de
  reverberação, EQ (−2,5 dB em 280 Hz; +2 dB em 3,4 kHz), compressão 2,8:1 e de-esser.
- **Trilha:** composição eletrônica instrumental original (120 BPM, Lá menor, Am–F–C–G: pad, arpejo, baixo e
  bateria), sintetizada pelo próprio script `audio.py`, sem samples nem material de terceiros. Por isso não há
  restrição de licença. Fica 10,5 dB abaixo da base durante a fala (ducking automático) e sobe no encerramento.
- **Efeitos:** whoosh, pop, tick, impacto e hit, também sintetizados e com volume discreto. Os efeitos que caíam sobre
  palavras foram reduzidos ou removidos depois da checagem de inteligibilidade.
- **Loudness final:** −14 LUFS integrado, pico real ≤ −1,2 dBTP.

## Conferência feita no resultado renderizado

- Folhas de contato e recortes em resolução real de quadros-chave (gancho, tarja, formação, revelação, cards,
  encerramento): margens, ortografia (Rômulo Benício, ITCONT, UEFS, Contador do Amanhã, Imersão Tecnológica
  Contábil) e recorte do cabelo.
- A mixagem final foi transcrita de novo: todas as frases estão íntegras e sem sobras dos trechos removidos.
- Metadados do MP4 conferidos (resolução, fps, codecs, BT.709).
- **Limitação:** não consigo ouvir. A verificação do áudio foi feita por medições, espectrograma e reconhecimento
  de fala. Recomendo ouvir antes de publicar.

## Como reproduzir ou alterar

```bash
# requisitos: ffmpeg, Python 3 (numpy, opencv-python-headless, onnxruntime, scipy, soundfile, sherpa-onnx), Node 18+ com Playwright
# modelo de recorte: https://github.com/PeterL1n/RobustVideoMatting/releases (rvm_resnet50_fp32.onnx)
./projeto/run_all.sh IMG_6490.mp4 ./modelos ./trabalho
```

Para mudar textos, tempos ou cortes, edite `projeto/edit.json` (EDL, palavras, legendas, deixas gráficas e dados do
evento). O visual fica em `projeto/graphics/index.html` e `anim.js`.
