# ITCONT — vídeo do Matheus Neris: relatório de edição

## Entregáveis

| Arquivo | Conteúdo |
|---|---|
| `ITCONT_MatheusNeris_1080x1920.mp4` | Versão principal: 1080 × 1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, cor BT.709, 42,5 s, −14 LUFS |
| `legendas_MatheusNeris_ITCONT.srt` | Legendas revisadas em português, sincronizadas com o vídeo editado |
| `transcricao.md` | Transcrição do original, com tempos e os pontos a confirmar |
| `projeto/` | Projeto editável (`edit.json`) e scripts que reproduzem a edição (`run_all.sh`), incluindo a restauração do áudio (`restauro/`) |

O sistema visual é o mesmo dos vídeos anteriores:

- Cores: azul-marinho, azul elétrico, ciano e branco.
- Fontes: Sora, Inter e JetBrains Mono.
- Estrutura: gancho com título e cortina, tarja, tipografia cinética sincronizada à fala, cards de informação, legendas em caixa navy e o mesmo encerramento.
- Logo oficial do ITCONT sobre placa clara.

## O vídeo original e o que foi resolvido

| Problema | Solução |
|---|---|
| Marca d'água "clideo.com" (canto inferior direito, y ≈ 1833–1899 px) | Removida quadro a quadro. A máscara exata vem da mediana temporal do vídeo; a reconstrução usa LaMa (rede de preenchimento de imagens) numa janela de 512 × 512 px, com borda suave e mediana de 5 quadros contra cintilação. O enquadramento não precisou cortar nada |
| Áudio estourado: a fala foi saturada em ±0,93 antes de uma recompressão AAC de 66 kb/s; cerca de 10 % dos ciclos mais fortes batiam no teto (pior em 2,0–3,2 s e 34,8–36,0 s) | Reconstrução autorregressiva (Janssen/LSAR) só nas amostras saturadas: 0,12 % do áudio; o resto fica intacto, bit a bit. Depois, um tratamento leve: passa-altas 80 Hz, −2 dB em 280 Hz, de-esser só acima de 4,5 kHz, −3 dB acima de 13,5 kHz e compressão 2:1. Detalhes na seção Áudio |
| Rosto e barba muito grandes: ocupam ~1060 px dos 1920 (a barba vai até ~1300–1370 px). Sobra pouco espaço para gráficos | Uma faixa única no peito (1380–1500 px), abaixo da barba mesmo quando ele se inclina (verificado quadro a quadro). Tarja, títulos e legendas usam a faixa um de cada vez. Quando um título cinético mostra as palavras que ele está dizendo, ele substitui a legenda daquele trecho; o `.srt` mantém todas. Cards de datas e local ficam na parede, à direita da cabeça |
| Arquivo marcado como HLG/BT.2020 | Interpretado como BT.709 (o sinal real), com correção leve de cor; saída marcada BT.709 |

## Conferência dos dados

| Dado | O que ele diz | No vídeo |
|---|---|---|
| Nome | "Matheus Neris" (os reconhecedores ouvem "Neres"/"Nery") | "Matheus Neris", grafia do seu pedido |
| Função | "contador especialista em Creator Economy" | Tarja: "Contador · especialista em Creator Economy"; tela final: "Contador · Creator Economy" |
| Empresa | "cofundador da CACS Contabilidade, uma empresa focada em afronegócios" | Só na legenda, como "CACS Contabilidade" (grafia a confirmar). Em destaque aparece apenas "AFRONEGÓCIOS" |
| Evento | "a primeira Imersão Tecnológica Contábil, o primeiro ITCONT" | Logo oficial + "1ª EDIÇÃO" |
| Datas e local | "entre os dias 21 e 22 de outubro, na UEFS" | Cards "21 e 22 de outubro" e "UEFS"; tela final: "21 e 22 de outubro de 2026" |
| Horário e sala | não falados | Tela final: "· 19h às 21h30" e "UEFS — Auditório III · Módulo IV" (dados do planejamento do evento, os mesmos do vídeo do Rômulo; para tirar, `show_unspoken_info: false` em `projeto/edit.json`) |

Nada foi inventado: não há link, QR code nem preço.

## Relação de cortes

| # | Tempo no vídeo | Tempo no original | Conteúdo |
|---|---|---|---|
| H | 0:00,00–0:02,07 | 28,17–30,23 | Gancho: "automação e inteligência artificial" + "O FUTURO DA CONTABILIDADE / ESTÁ CHEGANDO" |
| A | 0:02,07–0:37,17 | 1,40–36,50 | A fala completa, sem cortes internos (as pausas têm no máximo 0,2 s). O ruído de boca antes de "Olá" (0,96–1,22 s) fica de fora |
| — | 0:36,83–0:42,50 | — | Encerramento: a cortina sobe depois de "Espero por você!"; a tela final fica completa por ~3,6 s |

## Motion sincronizado à fala (tempos do vídeo final)

| Tempo | Elemento |
|---|---|
| 0,0–2,1 s | Título do gancho no peito, em revelação por máscara; cortina de transição |
| 3,0–6,6 s | Tarja "Matheus Neris" a partir de "meu nome é"; "Contador · especialista em Creator Economy" entra em "contador" |
| 9,3–11,5 s | Digitação "UMA EMPRESA FOCADA EM" → "AFRONEGÓCIOS" |
| 12,0–13,5 s | Digitação "EU VOU TE FAZER" → "UM CONVITE" (a batida completa da trilha entra aqui) |
| 15,6–19,3 s | Logo oficial em "Imersão"; "O PRIMEIRO ITCONT / 1ª EDIÇÃO" em "primeiro" |
| 20,1–25,1 s | Cards na parede: "21" → "e 22" → "de outubro"; "UEFS" |
| 25,2–28,1 s | Digitação "APRENDER UM POUCO MAIS SOBRE" / "ROTINAS" · "PROCESSOS", cada um na sua palavra |
| 28,8–31,2 s | "AUTOMAÇÃO" / "E INTELIGÊNCIA ARTIFICIAL" |
| 31,2–35,7 s | Digitação "COMO ISSO VEM IMPACTANDO" + selos "NA MINHA VIDA", "NO MEU NEGÓCIO", "NA CONTABILIDADE", cada um na sua palavra |
| 35,7–37,4 s | "ESPERO POR VOCÊ!"; continua sobre a cortina e se funde com a entrada da logo |
| 36,8–42,5 s | Encerramento: logo grande; "com Matheus Neris — Contador · Creator Economy"; datas e horário; local; "Participe do ITCONT. Esperamos você!"; Realização: Projeto de Extensão Contador do Amanhã |

Câmera: enquadramento fixo (1,00×) no corpo, porque qualquer zoom desceria a barba sobre a faixa de textos; aproximação leve (1,00× a 1,025×) no gancho. O movimento vem da própria câmera na mão e da tipografia.

## Áudio

**Restauração da saturação.** Três abordagens independentes foram testadas no mesmo banco de testes: reconstrução esparsa (A-SPADE), reconstrução autorregressiva (Janssen/LSAR) e modelos neurais pré-treinados.

- O banco de testes usa trechos limpos da voz do próprio Matheus, saturados artificialmente em 0,93 e passados pelo mesmo AAC de 66 kb/s, para que haja uma referência conhecida.
- A LSAR venceu no caso que corresponde ao arquivo real e no de saturação forte. Ela recupera picos perdidos (no teste forte, de 1,0 para ~1,75, com referência 1,92) sem criar cliques.
- Nenhum modelo neural de restauração estava acessível na rede deste ambiente; os dois encontrados só removem ruído e pioravam o resultado.
- Uma revisão cética apontou que a versão inicial podia rebaixar alguns picos para um patamar fixo. Corrigido: a reconstrução nunca fica abaixo do valor gravado.

**Tratamento da voz e mixagem.**

- O tratamento da voz está descrito na tabela do topo. Ele não usa o redutor de ruído que atrasava a voz (o telefone já silenciava as pausas). O atraso de fase do tratamento (0,1 ms) é medido e compensado.
- **Trilha:** a mesma composição eletrônica original da série, sintetizada no script, sem restrição de licença. Fica 10,5 dB abaixo durante a fala; a batida completa entra no "convite".
- **Efeitos:** whoosh, pop, tick e impacto, com volume discreto, cada um preso ao elemento visual correspondente.
- **Loudness:** −14 LUFS, pico ≤ −1,2 dBTP.
- **Limite:** a saturação foi reduzida, não eliminada. Parte da distorção ficou espalhada pela compressão AAC do arquivo recebido e não é recuperável. As sílabas mais fortes (2,0–3,2 s e 34,8–36,0 s) ficaram menos ásperas, mas não perfeitas. Não consigo ouvir o áudio; recomendo ouvir antes de publicar.
