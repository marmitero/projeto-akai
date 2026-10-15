# ADR-006 — Subset visual, pivôs comuns e navegação

Data:15/10/2026. Estado: adotado/implementado pelo agente sob delegação para F2.

## Contexto

Acervo tem estilos e pipelines diferentes, spritesheets com alturas/larguras distintas e mais de1,2GB de fontes. F2 precisa de aparência verificável antes da economia F3, sem confundir animação com regra de combate.

## Decisão

Selecionar Character, Skeleton, Normal BG, nós de Mine, Tiles/Effects/Torch e Hud. Gerar21 derivados não destrutivos com hashes e atores160×128/pivot80,112. Renderizar oito animações em uma cena com grupos mutuamente visíveis, sessão fora do renderer e HUD/menus DOM. Usar preload único apenas para o subset pequeno compartilhado; packs maiores exigirão demanda. Isso reduz complexidade do protótipo sem colocar o acervo no cliente.

Mochila/Loja são páginas; Mais/Recursos usam dialog nativo. Até419px agrupar Mochila/Loja em Mais para não comprimir rótulos/alvos. Iniciais na moldura até existir retrato aprovado. Nenhuma alteração de regras econômicas: ganho/produção continuam0 e a prévia está rotulada.

## Alternativas e consequências

Usar PNGs heterogêneos com bbox por frame causaria pivôs saltando. Normalizar padding preserva todos os pixels e simplifica espelhamento, ao custo de áreas transparentes. Usar bosses vetoriais/top-down sem avaliação comprometeria a primeira composição; ficam para seleção posterior. Uma PhaserScene por página é possível, mas não necessária para separar telas: grupos e UI exclusivos preservam estado sem teardown repetido.

Texturas/objetos permanecem estáveis em navegação, e derivados são reproduzíveis via script. Autoria/licença não é resolvida pela transformação. Perfil de aparelho, bosses, caminhada/transição e regras reais permanecem no roadmap. Evidência em STAGE_02_REPORT e RUNTIME_ASSETS.
