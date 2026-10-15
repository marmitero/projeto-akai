# Interface e experiência do jogador

Especificação de UX v1 com subset visual implementado na F2. Combate/economia ainda não implementados. Direção: RPG mobile vertical com sprites reais, não dashboard administrativo.

## Mapa de navegação

Tela inicial: Batalha. Barra inferior persistente: Batalha, Mina, Produção, Mochila, Loja, Mais. Mais abre destinos implementados de Perfil, equipamentos, mascotes, habilidades, eventos, mercado, arena, guildas, rankings e configurações. Loja não se confunde com mercado entre jogadores. Apenas um viewport principal ativo.

HUD superior compacta com retrato/nome do rei, nível de conta e saldos essenciais; tocar saldos abre detalhe sem perder tela atual. Na ausência do retrato aprovado, usar moldura com identificação textual de perfil local e registrar lacuna, sem inventar retrato liberado. Barra inferior sempre acima da safe area. A grade de seis botões cabe quando os rótulos não truncam; em largura insuficiente manter Batalha/Mina/Produção/Mais e agrupar Mochila/Loja em Mais, conforme Master Prompt.

## Especificação por tela

| Tela | Informação e ação principal | Estados exigidos |
|---|---|---|
| Batalha | Andar/onda, herói/inimigos, HP, dano, timer de boss, pausa/retomar/retry | Carregando, combate, transição, pausado, falha, vitória, reconectando |
| Mina | Nó de ferro central, ferro/clique, saldo, nível, bônus e melhoria | Carregando, pronta, impacto visual, comando pendente, rate limit, erro |
| Produção | Seleção/lista de carvão/ouro/jade, nível, taxa, custo e unlock/upgrade | Bloqueada com requisito, disponível, produzindo, saldo insuficiente, transação pendente |
| Mochila | Itens/slots/filtros, detalhe, equipar e atributos comparados | Vazia, carregando, item reservado, requisito insuficiente, equipado |
| Loja | Catálogo elegível, preço/moeda, detalhe e confirmação | Desabilitada no MVP sem sistema, carregando, indisponível, compra pendente, sucesso/erro |
| Mais/Perfil | Destinos disponíveis, identidade, configurações, debug local separado | Bloqueado/não implementado claramente identificado, sem compra falsa |

Nó de minério é alvo clicável real, não botão invisível sobre toda a tela. Clique só na Mina ativa, sem modal cobrindo input. No online: animação imediata, saldo confirmado pelo servidor; pendência não pode aparentar saldo gastável. Não somar crédito duas vezes quando chegar resposta e evento.

## Feedback e interrupções

Mudança de HP e ataque deve ser legível mesmo sem números flutuantes. Mostrar custo e benefício de upgrade antes de gastar; compra irreversível/premium exige detalhe explícito do produto. Falha preserva contexto e oferece ação concreta de retry/reconexão. Retry de rede reutiliza commandId, não cria nova compra. Desabilitar ação durante envio não substitui idempotência.

Derrota de boss fora da Batalha marca badge discreto, mantém progressão pausada e não força navegação. Toasts não cobrem nó/menu; conquistas e eventos ficam consultáveis depois. Nenhum modal de recompensa exige toque para conceder produção já conciliada. Back/Escape fecha modal, depois retorna ao contexto anterior; não reseta sessão.

## Responsividade e acessibilidade

Alvos ≥44×44 CSS px, gap suficiente e área independente do tamanho do ícone. Testar 320/360/390/768 CSS px e redimensionamento desktop. Scroll só no conteúdo, com padding para HUD e safe areas; canvas não distorce proporções. Escolher escala inteira de pixel art, centralizar viewport quando necessário. Texto principal proposto 16 CSS px e rótulos mínimos 12–14, ajustar com testes reais; nunca inserir texto essencial na textura sem alternativa acessível.

Botões DOM com nomes, tab order e foco visível; teclado acessa menus. Estado ativo usa borda/ícone/rótulo, não só cor. Raridade apresenta nome e símbolo além da cor. Opções reduzir movimento, remover tremor e limitar flashes; não usar flashes rápidos como feedback único. Separar música/efeitos quando houver áudio. Formatar números em pt-BR; abreviações têm detalhe acessível e não arredondam preço real.

## Carregamento, reconexão e desempenho

HUD e primeira cena primeiro; demais assets sob demanda. Mostrar progresso/erro recuperável por pacote; não deixar tela vazia indefinidamente. Em desconexão, sinalizar estado e bloquear gasto não confirmável. Reconexão traz snapshot/cursor antes de liberar ações. Suspender partículas/áudio de cena oculta, preservar seleção/scroll/filtros. Metas de desempenho em PERFORMANCE; funcionamento background em ADR-003.

## Integração artística

Ícones concretos e recortes em Asset_Usage_Guide; painéis/abas de Hud com tema consistente. Não exibir spritesheet inteira como botão. Acessibilidade e integração não estão testadas; aceite visual e funcional em MVP_ACCEPTANCE/TEST_PLAN.

## Implementação F2 e limites observados

HUD persistente e destinos implementados visualmente; fallback até419px deixa Mochila/Loja em Mais. Todos os alvos do menu≥44px nas larguras testadas. O conteúdo rola acima da HUD. Modais nativos bloqueiam input e devolvem foco; Escape fecha modal ou retorna de Mochila/Loja à última atividade. Scroll de cada página é preservado enquanto navega. Não há timer/HP/recompensas falsos: cena de teste, minas inativas e loja indisponível estão identificados. O retrato ainda usa iniciais, sem desenho de rei presumido. Redução de movimento é opção da sessão, com padrão do sistema ao abrir. Ver STAGE_02_REPORT para evidência e capturas.

## UI jogável F3

Topo exibe Coins e acesso aos recursos; Batalha mostra andar/onda, vida por ator, prazo de boss, falha e melhorias de força/vitalidade com custos. Pausar/Retomar controla ataques, não minas nem prazo de boss. Falha não força navegação: aviso global informa estado; Batalha oferece retry e treino manual no anterior quando elegível. Treino/retry recolocam conteúdo no topo para ver o encontro.

Mina concede1+n ferro por toque, anuncia saldo e mostra melhoria de picareta. Produção mostra nível/taxa/custo de carvão; sem botão de coleta. Ouro/jade continuam bloqueados e Mochila/Loja declaram indisponibilidade. Tutorial curto acompanha flags persistidas sem bloquear destinos. Retomada mostra carvão já aplicado e período limitado8h; o resumo não concede nada. Frações de recurso são exibidas até3 casas sem usar float no saldo. Modais bloqueiam input mas não param renda/combate; para parar batalha há controle explícito.

## UI RPG F4

Mochila funcional em três tabs:Equipamento(filtro/slots/ações),Forja(peça/nível/ingredientes/material/tônicos) eCompanheiro(Musgo/passivos/custos/estado). Tabs com controles de teclado; transações com estado de insuficiência/limite/requisito, sem recriar listeners por item. Dois anéis distintos e duas mãos/escudo explícitos. Lista mostra atributos-base e+n; resumo mostra atributos finais.

Ouro/jade têm custo, taxa incluindo bônus e requisito real; minério não virou botão de clique manual. Totais grandes abreviados apenas na HUD, detalhes exatos no dialogRecursos. Resumo offline só aparece em ausências≥1s, crédito também é conciliado em intervalos menores. Nove-slice do pack HUD reaproveitado nos controles RPG; spriteMusgo e ícones reais. Perfil separa rei/guerreiro, sem conta online simulada. Loja premium ainda indisponível.
