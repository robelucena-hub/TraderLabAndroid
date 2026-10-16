# ITCONT — vídeo do Angelo Loula: relatório de edição

## Entregáveis

| Arquivo | Conteúdo |
|---|---|
| `ITCONT_AngeloLoula_1080x1920.mp4` | Versão principal: 1080 × 1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, cor BT.709, 28,4 s, −14 LUFS |
| `legendas_AngeloLoula_ITCONT.srt` | Legendas revisadas em português, sincronizadas com o vídeo editado |
| `transcricao.md` | Transcrição do original, com tempos e os pontos a confirmar |
| `projeto/` | Projeto editável (`edit.json`) e scripts que reproduzem a edição (`run_all.sh`) |

O modelo é o mesmo dos vídeos do André Dedeko e da Anna Clara:

- Gancho com o título da série e cortina de transição.
- Tarja com nome e função.
- Faixa de títulos acima da cabeça, com tipografia cinética sincronizada à fala.
- Legendas em caixa navy no peito.
- Logo oficial do ITCONT sobre placa clara.
- O mesmo encerramento.

Cores, fontes (Sora, Inter, JetBrains Mono), trilha e efeitos sonoros também são os da série.

## O vídeo original e o que foi resolvido

| Situação | Solução |
|---|---|
| Arquivo do WhatsApp em baixa resolução (478 × 850, 29,5 qps) | Ampliado para 1080 × 1920 (Lanczos), com redução leve de ruído, nitidez moderada e cor um pouco mais fria e contrastada. A conversão para 30 qps repetia um quadro a cada ~2 s; cada repetição virou um quadro intermediário, interpolado por fluxo óptico. Não há como recuperar detalhe que o arquivo não tem: a imagem fica limpa, mas mais macia que a de uma câmera em 1080p |
| A cabeça quase encostava no topo do quadro (topo da cabeça entre y ≈ 210 e 380 px), sem espaço para a faixa de títulos do modelo | Acima do quadro original foram sintetizados 240 px do próprio teto, que é liso, sempre sob a faixa escura dos títulos. Um movimento suave de câmera mantém o topo da cabeça em y ≈ 440 px, o que abre a faixa de títulos em 220–415 px. Nada do rosto foi cortado; perdem-se só 80–230 px da camisa, embaixo |
| O rosto ocupa quase metade da altura, e a barba desce até ~1455 px quando ele abaixa o queixo | Legendas sempre em uma linha, com a caixa em y ≈ 1463–1537 (dentro da área segura). Onde ele abaixa o queixo, a câmera sobe o quadro só o necessário para a barba ficar acima da caixa; a cabeça continua abaixo dos títulos. Medido quadro a quadro: a barba fica pelo menos 15 px acima da caixa, e a cabeça fica pelo menos 21 px abaixo dos títulos. Sem zoom, porque qualquer aproximação desceria a barba |
| Áudio limpo, sem saturação, mas com picos muito agudos | Tratamento leve da voz; um limitador rápido controla os picos antes da normalização (detalhes na seção Áudio) |

## Conferência dos dados

| Dado | O que ele diz | No vídeo |
|---|---|---|
| Nome | "Angelo Loula" (os reconhecedores ouvem "Ângelo Lula"/"Lola") | "Angelo Loula", grafia do seu pedido |
| Funções | "professor da UEFS, pesquisador de inteligência artificial" | Tarja: "Professor da UEFS", que rola para "Pesquisador de Inteligência Artificial" quando ele diz "pesquisador". Tela final: "Professor da UEFS" |
| Programa e agência | "coordeno o programa de aceleração de startups"; "trabalho na Agência de Inovação" | Títulos com as mesmas palavras. Nenhum nome próprio de programa foi acrescentado |
| Tema | "inteligência artificial e inovação como estratégia empresarial" | Gancho e bloco "TEMA" |
| Evento | "na Imersão Tecnológica Contábil" | Logo oficial + "IMERSÃO / TECNOLÓGICA / CONTÁBIL" |
| Datas, horário e local | não falados | Só na tela final: "21 e 22 de outubro de 2026 · 19h às 21h30" e "UEFS — Auditório III · Módulo IV". São os dados do planejamento do evento que você confirmou. Para tirar, `show_unspoken_info: false` em `projeto/edit.json` |

Nada foi inventado: não há link, QR code nem preço.

**A confirmar:** em 3,9 s, um reconhecedor ouve "pesquisador **de**" e o outro, "pesquisador **em**" inteligência artificial. Usei "de", que o espectrograma sustenta (ver `transcricao.md`). Se ele disse "em", a troca é de uma palavra na legenda e na tarja.

## Relação de cortes

| # | Tempo no vídeo | Tempo no original | Conteúdo |
|---|---|---|---|
| H | 0:00,00–0:03,40 | 11,47–14,87 | Gancho: "inteligência artificial e inovação como estratégia empresarial" + "O FUTURO DA CONTABILIDADE / ESTÁ CHEGANDO" |
| A | 0:03,40–0:23,03 | 0,30–19,93 | A fala completa, sem cortes internos |
| — | 0:22,52–0:28,37 | — | Encerramento: a cortina sobe depois de "Participe!"; a tela final fica completa por ~4 s |

O gancho começa dentro da fala contínua ("sobre‿inteligência"). O corte está depois do "b" de "sobre", na nasal que abre "inteligência", e fica coberto pelo impacto de abertura.

## Motion sincronizado à fala (tempos do vídeo final)

| Tempo | Elemento |
|---|---|
| 0,0–3,4 s | Gancho: "O FUTURO DA CONTABILIDADE / ESTÁ CHEGANDO" na faixa de cima; a fala aparece nas legendas; cortina de transição |
| 4,2–8,4 s | Tarja "Angelo Loula" em "Angelo"; "Professor da UEFS" em "professor"; em "pesquisador", a placa alarga e o texto rola para "Pesquisador de Inteligência Artificial" |
| 8,5–11,5 s | Digitação "E COORDENO O" → "PROGRAMA DE" → "ACELERAÇÃO" → "DE STARTUPS", com conector animado; a batida completa da trilha entra em 9,0 s |
| 11,5–13,2 s | Digitação "TRABALHO NA" → "AGÊNCIA DE" → "INOVAÇÃO", com sublinhado |
| 13,1–18,4 s | Selo "TEMA" + "VOU FALAR COM VOCÊS SOBRE", digitado palavra por palavra com a fala → "INTELIGÊNCIA" → "ARTIFICIAL" → "E" → "INOVAÇÃO". Em "como", o rótulo vira "INTELIGÊNCIA ARTIFICIAL E INOVAÇÃO" e as linhas grandes trocam para "COMO ESTRATÉGIA" → "EMPRESARIAL" |
| 18,5–21,0 s | Logo oficial em "Imersão" e, ao lado, "IMERSÃO" → "TECNOLÓGICA" → "CONTÁBIL", cada palavra na sua vez |
| 20,95–22,9 s | "VAMOS" → "LÁ?" → "PARTICIPE!", que continua sobre a cortina e some antes de a logo abrir |
| 22,5–28,4 s | Encerramento: logo grande; "com Angelo Loula — Professor da UEFS"; datas e horário; local; "Participe do ITCONT. Esperamos você!"; Realização: Projeto de Extensão Contador do Amanhã |

Câmera: o acompanhamento suave da cabeça descrito acima, sem zoom. Os circuitos decorativos ficam junto às bordas da parede, longe dos óculos e das mãos.

## Áudio

- **Voz:**
  - passa-altas em 80 Hz;
  - redução leve de ruído;
  - expansor suave contra a cauda de sala;
  - −2,5 dB em 280 Hz e +1,5 dB em 3,4 kHz;
  - compressão 2,8:1;
  - de-esser mais firme que nos vídeos anteriores (os "s" estavam brilhantes demais no celular).
  O atraso da redução de ruído (25 ms) é medido e compensado; a sincronia labial fica exata (0 ms medido contra o original).
- **Trilha:** a composição eletrônica original da série, sintetizada no script, sem restrição de licença. Fica 10,5 dB abaixo durante a fala e já começa a abaixar 0,12 s antes de cada frase, também sob as palavras fracas. A batida completa entra em 9,0 s, depois do "e" fraco de "e coordeno", para não cobri-lo.
- **Efeitos:** whoosh, pop, tick e impacto, discretos, cada um preso ao elemento visual correspondente; as caudas terminam naturalmente. Nenhum efeito cai sobre palavras fracas. O áudio abre com um fade de 4 ms (sem estalo no início nem no loop do Reels).
- **Loudness:** −14,0 LUFS e pico real −1,5 dBTP no MP4 final, com ganho constante (sobra margem para a recompressão do Instagram). A voz original tem picos muito agudos (cerca de 20 dB acima do nível médio). Para chegar a −14 LUFS sem passar do pico, um limitador rápido segura as sílabas mais fortes antes da normalização (até ~5 dB por algumas dezenas de milissegundos). A revisão de áudio mediu a redução como espectralmente plana, sem distorção, e a julgou improvável de ser percebida. Mesmo assim, vale ouvir antes de publicar: eu não consigo ouvir o áudio.

## Revisão adversarial do vídeo renderizado

Duas rodadas de revisão independente do MP4 final, com três revisores (imagem; texto, fatos e layout; sincronia e áudio). Cada achado médio ou grave passou por um verificador cético, que tentou refutá-lo refazendo as medidas. Depois de cada rodada, as correções foram aplicadas e conferidas quadro a quadro.

**Confirmado sem problemas:** grafia e fatos (nada fora da lista de dados permitidos); nenhum título atrás ou encostado na cabeça; área segura do Reels; legenda presente em toda a fala, com o texto falado; títulos a até 3 quadros das palavras; sincronia labial de 0 ms; costura do teto sintetizado invisível; transição do gancho e cortina final sem falhas; −14 LUFS com ganho constante; nada de áudio depois do fim.

**Corrigido:**

| Achado | Correção |
|---|---|
| Legendas de duas linhas cobriam a ponta da barba no gancho e em 14,7–15,7 s (grave) | Todas as legendas em uma linha, mais baixas; zoom retirado; a câmera sobe o quadro onde ele abaixa o queixo |
| Na correção anterior, as legendas passaram a sair em ~16 px em vez de 42 px (grave) | Tamanho restaurado; conferido no vídeo final |
| Após a troca do TEMA, ficava "VOU FALAR COM VOCÊS SOBRE / COMO ESTRATÉGIA EMPRESARIAL" | O rótulo passa a "INTELIGÊNCIA ARTIFICIAL E INOVAÇÃO"; digitação palavra por palavra com a fala |
| Circuito da parede direita encostava nos óculos e depois na orelha | Circuitos do corpo só na parede esquerda; no encerramento, longe das linhas de informação e do botão |
| Um quadro repetido a cada ~2 s (conversão 29,5 → 30 qps) | Quadros intermediários por fluxo óptico; nos dois de movimento rápido em que a interpolação rasgava a imagem (11,8 s e 19,4 s), fica o quadro original |
| Textos sobrepostos por 2–3 quadros nas passagens (TEMA × "AGÊNCIA DE INOVAÇÃO"; "PARTICIPE!" × logo do encerramento); função da tarja cortada ao trocar; sublinhado do gancho rente à cabeça | Saídas mais curtas e entradas depois; a placa da tarja alarga antes do texto rolar; gancho 14 px mais alto |
| Faixa escura do topo sumia entre o gancho e a tarja; risco de faixas no degradê após a recompressão | Faixa contínua; pontilhado de ±1 nível sob o degradê |
| "s" brilhantes; "e" fraco coberto pela entrada da bateria e por um efeito; estalo no quadro 0; "ESTRATÉGIA" 3 quadros adiantada | De-esser mais firme; bateria a partir de 9,0 s; efeito retirado; fade de 4 ms; deixa corrigida |
| Legendas .srt com quebras ruins e fim da última diferente da tela | Uma linha por legenda, igual à tela; fim quando a cortina cobre a legenda |

**Fica como está (detalhes menores):**

- Na troca do bloco TEMA, durante 2 quadros as duas frases aparecem pela metade, uma saindo e outra entrando. É o rolamento do texto e não forma sobreposição legível.
- O limitador abaixa até ~4–5 dB as sílabas mais fortes por dezenas de milissegundos. Foi medido sem distorção e com redução espectralmente plana.
- O gancho começa no meio da fala contínua ("sobre‿inteligência"). Não sobra pedaço de "sobre"; o "in-" inicial soa um pouco seco.
- O "e" de "e coordeno" e o "o" de "o programa" são muito fracos na gravação original. A legenda mostra as duas palavras.

