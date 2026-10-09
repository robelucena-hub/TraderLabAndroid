# ITCONT — vídeo do André Dedeko: relatório de edição

## Entregáveis

| Arquivo | Conteúdo |
|---|---|
| `ITCONT_AndreDedeko_1080x1920.mp4` | Versão principal: 1080 × 1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, cor BT.709, 40,5 s, −14 LUFS |
| `legendas_AndreDedeko_ITCONT.srt` | Legendas revisadas em português, sincronizadas com o vídeo editado |
| `transcricao.md` | Transcrição do original, com tempos |
| `projeto/` | Projeto editável (`edit.json`) e scripts que reproduzem a edição (`run_all.sh`) |

O sistema visual é o mesmo dos vídeos do Rômulo e da Anna Clara:

- Cores: azul-marinho, azul elétrico, ciano e branco.
- Fontes: Sora, Inter e JetBrains Mono.
- Estrutura: gancho com título, tarja, tipografia cinética sincronizada à fala, cards, legendas em caixa navy e encerramento.
- Logo oficial do ITCONT sobre placa clara.

## O vídeo original

| Característica | Tratamento |
|---|---|
| Vídeo do WhatsApp: 576 × 1024, taxa de quadros variável | Convertido para 30 fps constantes. Ampliado para 1080 × 1920 com Lanczos, redução leve de ruído (hqdn3d) e nitidez suave |
| Luz quente e rosto um pouco escuro em relação à parede | Correção leve: meios-tons mais claros (gama 1,03), contraste +3 %, dominante amarela reduzida |
| Câmera na mão, rosto grande no quadro | Zoom digital contido (1,00× a 1,09×), porque o original já foi ampliado. A faixa do teto, acima da cabeça, concentra os títulos |
| Som limpo, sem trilha | Voz original tratada, sem separação de fontes |
| Sem marca d'água nem textos queimados | Nada a remover |

## Conferência dos dados

| Dado | O que ele diz | No vídeo |
|---|---|---|
| Nome | "André Dedeco/Dedeko" (o som é o mesmo) | "André Dedeko", grafia do seu pedido |
| Função | "contador, empresário, professor e palestrante" | Tarja e tela final: "Contador e Palestrante" (como você pediu); a legenda traz a frase completa |
| Data | "no dia 21 de outubro" | Card "21 de outubro"; tela final: "21 de outubro de 2026" |
| Local | "na querida cidade de Feira de Santana" | Card "Feira de Santana" |
| Evento | "Imersão Tecnológica Contábil 2026" | Logo oficial e "2026", no momento em que ele fala |
| Tema | "o uso da inteligência artificial na rotina contábil" | "INTELIGÊNCIA ARTIFICIAL / NA ROTINA CONTÁBIL" |
| Sala | não falado | Tela final: "UEFS — Auditório III · Módulo IV" (dado do planejamento; para tirar, `show_unspoken_info: false` em `projeto/edit.json`) |
| Horário | não falado | **Não aparece.** O planejamento informa 19h às 21h30 para o evento, mas não o horário da fala dele; mostrar "19h" poderia sugerir um horário que não foi confirmado |

Nada foi inventado: não há link, QR code nem preço. "Inscreva-se e participe!" aparece porque ele fala essa frase. Nenhum endereço de inscrição foi acrescentado.

## Relação de cortes

| # | Tempo no vídeo | Tempo no original | Conteúdo |
|---|---|---|---|
| H | 0:00,00–0:02,37 | 19,60–21,97 | Gancho: "A tecnologia está transformando o mercado" + "O FUTURO DA CONTABILIDADE / ESTÁ CHEGANDO" |
| A | 0:02,37–0:35,20 | 0,70–33,53 | A fala completa, sem cortes internos (as pausas são curtas, de 0,2 a 0,45 s; cortá-las criaria saltos visíveis com a câmera na mão) |
| — | 0:35,05–0:40,53 | — | Encerramento: a cortina sobe depois de "Espero você lá!"; a tela final fica completa por ~3,6 s |

## Motion sincronizado à fala (tempos do vídeo final)

| Tempo | Elemento |
|---|---|
| 0,0–2,4 s | Faixa escura no topo + título do gancho em revelação por máscara |
| 2,4 s | Cortina de transição para o corpo |
| 2,8–6,3 s | Tarja "André Dedeko" acima da cabeça, quando ele diz o nome; "Contador e Palestrante" entra em "contador" (3,5 s) |
| 6,4–13,4 s | Cards na parede, ao lado da cabeça: "21" (6,6 s), "de outubro" (7,1 s), "Feira de Santana" (9,2 s) |
| 10,7–13,4 s | Logo oficial em "Imersão"; "2026" em 12,6 s |
| 14,7–20,9 s | "TEMA" + digitação "CADA VEZ MAIS IMPORTANTE"; "INTELIGÊNCIA" (18,4 s) "ARTIFICIAL" (19,0 s) → traço de circuito → "NA ROTINA CONTÁBIL" (19,9 s) |
| 21,3–23,7 s | "A TECNOLOGIA ESTÁ" / "TRANSFORMANDO" (22,3 s) "O MERCADO" (23,0 s) |
| 23,9–27,1 s | Digitação "PRECISAMOS ACOMPANHAR"; "ESSA" (25,2 s) "EVOLUÇÃO" (25,5 s) com barra de progresso |
| 27,4–30,2 s | "PREPARADOS" → "E ALINHADOS ÀS" → "NOVAS EXIGÊNCIAS" (29,2 s) |
| 30,5–32,1 s | "VOCÊ NÃO PODE" / "FICAR DE FORA!" (31,4 s) |
| 32,3–35,8 s | "INSCREVA-SE" / "E PARTICIPE!" (33,2 s); continua sobre a cortina e se funde com a entrada da logo |
| 35,1–40,5 s | Encerramento: logo oficial grande, "com André Dedeko — Contador e Palestrante", data, cidade, local, "Participe do ITCONT. Esperamos você!", Realização: Projeto de Extensão Contador do Amanhã |

Camadas:

- Tarja, títulos e cards ficam atrás do apresentador, recortado por máscara (RobustVideoMatting), na faixa do teto ou na parede ao lado da cabeça.
- Legendas ficam na frente, no peito, abaixo do queixo.

## Áudio

- **Voz:** a fala original, com pequena limpeza de ruído, passa-altas em 80 Hz, EQ, compressão e de-esser.
- **Trilha:** a mesma composição eletrônica original da série (120 BPM, lá menor). É sintetizada no próprio script, então não há restrição de licença. Fica 10,5 dB abaixo durante a fala. A batida completa entra no "21" e a trilha sobe no encerramento.
- **Efeitos:** whoosh, pop, tick e impacto, com volume discreto, cada um preso ao elemento visual correspondente.
- **Loudness:** −14 LUFS, pico ≤ −1,2 dBTP.
- **Conferência:** a mixagem final foi transcrita por reconhecimento de fala e todas as frases estão íntegras. Não consigo ouvir o áudio; recomendo ouvir antes de publicar.

## Revisão do vídeo renderizado

**Conferências automáticas:**

- Nenhum gráfico da camada da frente toca o rosto, em todos os 1032 quadros com o apresentador (verificação pela máscara).
- O alinhamento entre voz e imagem foi medido por correlação com o áudio original em 7 pontos do vídeo: 0 ms.
- A mixagem final foi transcrita e todas as frases estão íntegras. O Whisper confirma "Imersão Tecnológica Contábil 2026".

**Revisão independente** (um revisor separado analisou os quadros em resolução real). Confirmado:

- Nenhum halo no cabelo nem nas tranças.
- Nenhum card escondido atrás da cabeça.
- Grafia e acentos corretos.
- Textos dentro das áreas seguras do Reels.
- Títulos a até 3 quadros das palavras.
- Nenhum dado fora da lista confirmada.

Corrigido a partir das revisões:

| Achado | Correção |
|---|---|
| A voz ficava 25 ms atrás da imagem (o filtro de redução de ruído atrasa o sinal) | O script mede o atraso contra o original e compensa: 0 ms |
| "E ALINHADOS ÀS" e o traço de circuito fora de posição | Medidos pelo texto real; o rótulo fica ao lado de "PREPARADOS" |
| 21–24 s sem gráfico, justamente na frase reaproveitada pelo gancho | Novo bloco "A TECNOLOGIA ESTÁ / TRANSFORMANDO O MERCADO" sincronizado à fala |
| 22–27 s sem gráfico | Novo bloco "PRECISAMOS ACOMPANHAR / ESSA EVOLUÇÃO" com barra de progresso |
| Rótulos em fonte mono pequenos para celular | De 26–31 px para 35–36 px, em negrito e branco |
| A tela da TV aparecia através do card "LOCAL" | Cards mais opacos |
| Cards vazios por ~0,35 s antes da data e da cidade | Os cards entram logo antes da palavra |
| "INSCREVA-SE" ficava ~0,4 s sozinho sobre o fundo do encerramento | Cruza diretamente com a entrada da logo |
| Legendas quebravam "Imersão Tecnológica / Contábil 2026" e "inteligência / artificial" | Quebras definidas no projeto; a caixa da legenda se ajusta ao texto |
| A última legenda do SRT invadia o encerramento | Termina quando a cortina sobe |

## Observações

- **Inscrição:** ele diz "Inscreva-se", mas o vídeo não mostra onde se inscrever, porque nenhum link ou canal de inscrição foi informado. Se houver um (por exemplo, "link na bio"), é só me passar que eu incluo.
- **TV ao fundo:** a TV atrás dele mostra a página "O novo cenário dos negócios já começou!". É do vídeo original; os cards de data e local cobrem a tela entre 6 e 13 s. Se preferir, posso desfocar a tela da TV no vídeo inteiro.
