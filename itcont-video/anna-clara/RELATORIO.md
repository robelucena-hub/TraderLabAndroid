# ITCONT — vídeo da Anna Clara Silva: relatório de edição

## Entregáveis

| Arquivo | Conteúdo |
|---|---|
| `ITCONT_AnnaClara_1080x1920.mp4` | Versão principal: 1080 × 1920 (9:16), 30 fps, H.264 High + AAC 48 kHz, cor BT.709, 30,5 s, −14 LUFS |
| `legendas_AnnaClara_ITCONT.srt` | Legendas revisadas em português, sincronizadas com o vídeo editado |
| `transcricao.md` | Transcrição do original, com tempos |
| `projeto/` | Projeto editável (`edit.json`) e scripts que reproduzem a edição (`run_all.sh`) |

Mesmo sistema visual do vídeo do Rômulo: azul-marinho, azul elétrico, ciano e branco; Sora, Inter e JetBrains Mono;
gancho com título, tarja, tipografia cinética, cards de informação, legendas em caixa navy e encerramento.
A **logo oficial do ITCONT** entra numa placa clara, porque as partes azul-marinho da logo somem sobre fundo escuro.

## O que o vídeo original trazia (e foi resolvido)

O arquivo recebido já tinha uma edição anterior "queimada" na imagem e no som:

| Problema no original | Solução |
|---|---|
| Legendas brancas sobre o peito (y≈1034–1093 px) | Removidas quadro a quadro: Telea sobre a camisa e LaMa onde o texto cruzava mãos e braços. As novas legendas ficam exatamente nessa faixa e acompanham o zoom, cobrindo qualquer resíduo |
| Assinatura "Anna Clara Silva" sobre o pôster | Removida reconstruindo o pôster real: placa limpa montada a partir dos próprios quadros, alinhados por homografia (a edição anterior aplicava zoom digital) |
| Marca d'água clideo.com | Cortada pelo enquadramento: nenhum quadro mostra as linhas de origem ≥ 1836 px (verificação automática) |
| Trilha musical misturada à voz | Voz isolada com MDX-Net (média de Kim_Vocal_2 e Voc_FT): música −83 dB no trecho sem fala, voz preservada (±0,5 dB entre 150 Hz e 12 kHz), alinhamento exato com a imagem |
| Fade para preto e cartela com assinatura (22,45–25,8 s) | Cortados: a cortina do encerramento sobe logo depois da última palavra, e os quadros sob a cortina são congelados antes do fade, que nunca aparece |

## Conferência dos dados

| Dado | O que ela diz | No vídeo |
|---|---|---|
| Nome | "Anna Clara Silva" (grafia da assinatura dela, confirmada por você) | Tarja e tela final |
| Função | "contadora" | "Contadora" |
| Evento / local | "no ITCONT, na UEFS" | Logo oficial + "NA UEFS" |
| Data e hora | "no dia 22 de outubro, às 19 horas" | Cards "22 de outubro" e "19h"; na tela final, "22 de outubro de 2026 · 19h" |
| Sala | não falado | Tela final: "UEFS — Auditório III · Módulo IV" (dado do planejamento do evento; para tirar, `show_unspoken_info: false` em `projeto/edit.json`) |

Nada foi inventado: não há link, QR code nem nome de palestra. "Inscrições: link na descrição" não aparece, porque ela não fala disso.

## Relação de cortes

| # | Tempo no vídeo | Tempo no original | Conteúdo |
|---|---|---|---|
| H | 0:00,00–0:02,73 | 11,17–13,90 | Gancho: "tecnologia alinhada ao mundo contábil" + "O FUTURO DA CONTABILIDADE / ESTÁ CHEGANDO" |
| A | 0:02,73–0:25,20 | 0,00–22,47 | A fala completa, sem cortes internos (não havia pausas longas nem erros) |
| — | 0:25,06–0:30,53 | — | Encerramento: a cortina sobe depois de "contábil"; a tela final fica completa por ~3,4 s |

## Motion sincronizado à fala (tempos do vídeo final)

| Tempo | Elemento |
|---|---|
| 0,0–2,7 s | Faixa escura no topo + título do gancho em revelação por máscara |
| 2,7 s | Cortina de transição para o corpo |
| 3,8–7,5 s | Tarja "Anna Clara Silva" na faixa acima da cabeça (nunca sobre o rosto); "Contadora" entra quando ela diz "contadora" (5,9 s) |
| 7,6–12,3 s | Logo oficial (placa clara) quando ela diz "ITCONT"; "NA UEFS" em 8,5 s |
| 9,2–12,3 s | Cards na parede: "22" → "de outubro" → "19h", cada um quando é dito |
| 14,0–17,3 s | "TECNOLOGIA" → traço de circuito "alinhada ao" → "MUNDO CONTÁBIL" |
| 23,1 / 24,3 s | "VAI TRACIONAR" / "O MUNDO CONTÁBIL" (permanece sobre a cortina até a logo entrar) |
| 25,1–30,5 s | Encerramento: logo oficial grande, "com Anna Clara Silva — Contadora", data e hora, local, "Participe do ITCONT. Esperamos você!", Realização: Projeto de Extensão Contador do Amanhã |

Câmera: zooms suaves e discretos (1,05× a 1,14×), porque a edição anterior já tinha zoom digital.

## Áudio

- **Voz isolada:** passa-altas em 75 Hz, EQ leve (−2 dB em 300 Hz; +2 dB em 3,4 kHz), compressão 2,5:1 e de-esser.
- **Trilha:** a mesma composição eletrônica original do vídeo do Rômulo, sintetizada no script, sem restrição de licença. Fica 10,5 dB abaixo durante a fala e, na frase final, mais 9 dB abaixo, porque a última sílaba é dita baixo. Sobe no encerramento.
- **Efeitos:** whoosh, pop, tick e impacto, com volume discreto. No encerramento, o whoosh acompanha a cortina e o impacto acompanha a logo, ambos depois da fala.
- **Loudness:** −14 LUFS, pico ≤ −1,2 dBTP.
- A trilha termina numa frase (sem batida cortada no fim nem no loop do Reels).
- **Conferência:** a mixagem final foi transcrita com dois reconhecedores (Parakeet e Whisper) e todas as frases estão íntegras. Não consigo ouvir o áudio; recomendo ouvir antes de publicar.

## Revisão adversarial do vídeo renderizado

Três revisores independentes analisaram o MP4 final em resolução real, cada um com um foco: artefatos de imagem;
texto, fatos e layout; sincronia. Os itens graves passaram por um cético que tentou refutá-los. Confirmado:
nenhum resíduo das legendas antigas, da assinatura, da marca d'água ou do fade; nenhum halo; nada sobre o rosto;
grafia e acentos corretos; logo sem distorção; textos dentro das áreas seguras; lábios em sincronia (0 ms) e gráficos a
até 3 quadros das palavras. Corrigido a partir da revisão:

| Achado | Correção |
|---|---|
| A cortina final começava durante "contábil"; "O MUNDO CONTÁBIL" ficava legível só ~0,6 s | A cortina só sobe depois da fala; o título final fica sobre a cortina até a logo entrar |
| Efeitos do encerramento ~0,7 s atrasados, com um trecho quase mudo | Whoosh na cortina, impacto na logo; trilha sobe logo após a última palavra |
| Cartão final completo por só ~2 s | Encerramento mais longo (~3,4 s com tudo na tela) e entrada mais rápida |
| Cards de data e hora encostavam nos óculos em 12,4–12,7 s | Cards mais estreitos e saída antecipada para 12,3 s |
| Nome duplicado e apertado (tarja + legenda) | Nome sem destaque ciano na legenda |
| Tarja do nome na altura do queixo e da boca (apontado por você) | Tarja movida para a faixa superior, atrás da apresentadora, acima da cabeça |
| Logo do meio pequena; rótulos de 14–18 px | Logo de 344 para 372 px; rótulos aumentados (22–28 px) |
| A caixa de legenda "piscava" entre frases, expondo a faixa limpa por 1–4 quadros | Legendas consecutivas contíguas: a caixa fica sempre na tela |
| Faixa escura do topo "pulsava" entre os cards e "TECNOLOGIA" | Faixa mantida contínua |
| "MUNDO CONTÁBIL" ficava ~1 s; legenda 8 entrava 0,18 s atrasada | Título até 17,3 s; tempo de "e, nossa" corrigido |
| SRT quebrava "22 de / outubro" e a última legenda passava sobre o encerramento | Quebra após a vírgula; fim junto com a fala |
| Quadro 0 sem texto (capa fraca) | O título do gancho já aparece no primeiro quadro |
