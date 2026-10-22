# ITCONT UEFS — Arte "336 inscritos"

Post para Instagram (1080 × 1350 px) celebrando as inscrições da I Imersão Tecnológica Contábil.

| Arquivo | Conteúdo |
| --- | --- |
| `itcont-336-inscritos.png` | Arte final, pronta para publicação |
| `index.html` | Arquivo-fonte editável (HTML/CSS + SVG) |
| `render.mjs` | Exporta o PNG com Playwright |
| `preview-guias.png` | Conferência das margens de segurança de 64 px |
| `assets/` | Logos oficiais (originais `.webp` e versões `-recorte.png`, só com a área transparente aparada) |
| `fonts/` | Sora e Manrope (licença OFL incluída) |

## Como editar
- **Textos e números:** procure no `index.html` os comentários `<!-- 336 -->`, `<!-- Cards -->` e `<!-- Encerramento -->`. O número 336 aparece três vezes (camadas de profundidade, face e brilho); altere as três.
- **Cores:** variáveis no bloco `:root` (azul-marinho, ciano, dourado).
- **Pré-visualização:** abra `index.html` no navegador. Para ver as guias de margem, adicione `?guides` ao endereço.

## Como exportar
```bash
node render.mjs           # gera itcont-336-inscritos.png
node render.mjs --guides  # gera também preview-guias.png
```
O script falha se a soma dos cards for diferente do número principal (hoje: 276 + 19 + 41 = 336).
