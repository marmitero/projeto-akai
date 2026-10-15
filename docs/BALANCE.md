# Balanceamento experimental e fórmulas

**F3 histórica:local-loop-1; F4 atual:local-rpg-1 com XP/itens e curvas limitadas em RPG_SYSTEMS. Simulação determinística executada; sem playtest humano nem equilíbrio comercial comprovado.** Configuração futura deve ser versionada e carregada por dados, nunca espalhada na UI.

## Regras fixas

Ferro inicial 1/clique; andares comuns 3 ondas×3 inimigos, sem tempo; boss nos múltiplos de 10 com timeout; ouro exige carvão 50. Falha de boss retorna ao anterior e exige tentativa manual. 1.000 andares planejados, não mil conjuntos de arte.

## Convenções determinísticas

Tempo em milissegundos inteiros; simulação por agenda/relógio injetável. Arredondar custos para cima, dano/ganhos inteiros para baixo após multiplicadores, dano mínimo 1. Ordem proposta no mesmo instante: expiração de buff → deadline de boss (se t≥deadline, falha) → ataque do herói → ataques dos inimigos → mortes/grants → transições. Essa ordem favorece deadline, impedindo golpe em t=deadline; precisa de fixture explícita. Todos os atores mortos são removidos antes de novos ataques no instante seguinte.

Atributos ativos propostos: HP, ataque físico, defesa, intervalo de ataque, crítico e multiplicador crítico. Ataque mágico, resistência, evasão e precisão são extensões desativadas até fórmulas próprias. Não criar atributos sem uso para parecer RPG completo.

## Fórmulas candidatas do primeiro loop

Para andar f≥1 e nível de melhoria n≥0:

- HP de inimigo comum = ceil(18 × 1,12^(f−1)).
- Ataque de inimigo comum = ceil(2 × 1,10^(f−1)); intervalo 2.000ms.
- Coin por inimigo = ceil(3 × 1,10^(f−1)).
- Boss: HP = 8 × HP comum(f); ataque = 2 × ataque comum(f); intervalo 1.800ms; timeout experimental 30.000ms.
- Coin de boss = 15 × Coin comum(f), sem somar nove recompensas comuns nesse andar.
- Herói inicial: HP=100, ataque=6, defesa=0, intervalo=1.000ms; crítico inicial=0% para fixture determinística.
- Ataque após upgrade de guerreiro n: 6 + 2n; custo do próximo nível: ceil(20×1,20^n) ferro e ceil(10×1,18^n) Coin.
- HP após upgrade de vitalidade n: 100 + 15n; custo próximo: ceil(15×1,18^n) ferro e ceil(8×1,18^n) Coin.
- Dano base = max(1, floor(ataque × 100/(100+defesa))); defesa não pode ser negativa neste modelo.
- Dano final = floor(dano base × multiplicador crítico × bônus válido), mínimo 1. Roll crítico é servidor/local seedado; animação não decide dano.
- Intervalo final = max(200ms, floor(intervalo base/(1+bônusVelocidade))); limite experimental impede frequência impossível.

Não extrapolar crescimento exponencial sem análise até 1.000: atributos podem exceder tipos e criar paredes de progressão. F4 precisa de curvas por faixas/caps e simulação de overflow antes de gerar o conteúdo completo. Este conjunto só é candidato à fatia de 20 andares.

## Clicker e carvão

- Melhoria de clique n concede 1+n ferros/clique antes de buffs; custo próximo = ceil(10×1,25^n) Coin e ceil(25×1,22^n) ferro.
- Desbloqueio experimental de carvão: 100 ferro + 50 Coin; inicia nível 1.
- Produção carvão(L) = 0,1×L unidades/s, L≥1; nível 0 bloqueado produz zero.
- Custo de L→L+1: ceil(75×1,15^(L−1)) ferro e ceil(30×1,15^(L−1)) Coin.
- Crédito em unidade mínima = floor(taxaEmMilésimosPorSegundo × deltaMs/1000 + remainderAnterior), preservando resto racional na implementação.
- Offline experimental: max(0,min(tempoAusente,8h)), somente minas.

Quando implementado, comparar produção segmentada com produção em um intervalo único para provar que frequência de saves não altera ganho. Ouro/Jade, fabricação, pets, afixos, XP e perks ainda precisam de curvas em F4; não usar zero ou fórmula copiada como balanceamento definitivo.

## Plano de simulação e métricas de aceite

Executar sementes reproduzíveis, salvar versão e resultados para perfis ativo lento/moderado/intenso e idle. Medir tempo até primeira melhoria, carvão, andar 10/20, falhas por boss, estoque e gastos. Hipóteses de ritmo propostas: primeiro upgrade em 30–120s; carvão em 3–10min de jogo ativo; primeiro boss exige ao menos uma decisão de fortalecimento e não deve travar sem explicação. São hipóteses a avaliar, não resultados nem garantias.

Comparar dano esperado/segundo = danoPorAtaque×1000/intervalo e tempo de abate aproximado = HP/DPS, depois usar simulação real para ondas e mortes. Avaliar compra alternativa, jogador que guarda recursos, ausência longa e jogador sem anúncios. Antes de F5 exigir nenhuma transição impossível, valores não negativos, ausência de overflow e grants únicos; antes de F8 medir impacto de bônus permanentes/PvP. Alterações documentam antes/depois e configVersion.

## Resultado F3 — simulação reproduzível

`npm run simulate:loop`; para salvar JSON: `node scripts/simulate-loop.mjs --write` após build shared. Script e [resultado](phase3-balance-results.json) usam política explícita de compras/treino, sem grants de teste. Horizonte7200s. Cliques constantes1/3/5 por segundo são perfis de stress, não previsão de esforço humano.

| Cliques/s | Primeira melhoria | Carvão | Boss10 | Torre20 | Treinos manuais |
|---|---|---|---|---|---|
|0 | — | — | — | — |0 |
|1 |20s |144s |344s |2286s |15 |
|3 |15s |80s |308s |1118s |7 |
|5 |15s |80s |308s |1118s |7 |

A política do perfil 0 ainda aperta retry comum; não representa jogador totalmente ausente. Sem ferro não compra melhorias, parando na parede do andar 4. Perfis ativos concluem com treino manual; sem essa saída,3/5 ficaram sem Coin no boss20. Resultado anterior motivou ADR-007, não alteração silenciosa dos custos.

Hipóteses iniciais de primeira melhoria30–120s/carvão3–10min não foram atingidas: o começo ficou mais rápido (15–20s/80–144s). Mantidas fórmulas para esta fatia, com resultado registrado; F4 deve playtestar antes de rebalancear. Tempo total envolve cliques contínuos e política informada; usuário pode demorar mais. Nenhuma semente aleatória é necessária porque crítico é0 e não há drops aleatórios na F3.

Soak de domínio1800s:um intervalo e18.000 passos100ms produzem os mesmos recursos/progresso/remainder; teste não substitui medição de renderização. Deadline vence empate, cura entre andares e pausa manual/boss wall deadline conforme ADR-007.

## F4 — resultado versionado

Fórmulas completas em RPG_SYSTEMS e content.ts. Inimigos1–20 preservados; XP/equipamentos mudam o poder, portanto números de F3 acima são históricos. A mesma política1/3/5 cliques/s agora vence20 em575/538/538s; primeiro upgrade20/15/15s, carvão144/69/69s, boss10 em269/262/262s. Sem cliques, a política ainda aperta retries comuns e chega ao19 por XP; não representa ausência offline. Dados em phase4-loop-results.json.

Não afirmar que o ritmo está equilibrado: XP acelerou a primeira fatia, que precisa de playtest humano. Até1.000 usam curvas polinomiais ancoradas, níveis e custos limitados. Fixture de nível/XP final e arma lendária+20 percorreu todos os encontros até1000, sem overflow, com8.388 golpes; prova numérica/agenda, não percurso orgânico nem tempo comercial prometido. Resultado em phase4-rpg-results.json.

Custos de adoção/minas/tônicos/Forja adotados sem usar Ruby, versionados e testados por pré-condição/transação. Eventos sociais, anúncios, buffs pagos, XP premium e probabilidades de baús continuam desativados. Mudança posterior deve criar novo config/migração quando necessário, sem debitar retroativamente compras antigas.

### Protocolo de playtest pendente

Executar com perfil novo, sem fixtures/grants, registrando configVersion, tempo ativo/ausente, cliques observados, compras, XP, drops e tentativas de boss. Comparar sessões curtas com pausas naturais; cliques contínuos de simulação não substituem esse comportamento.

| Cenário | Registrar / verificar |
|---|---|
| Começo até20 | Primeira melhoria, carvão, boss10/20; clareza de retry/treino e aceleração causada pelo XP |
| Primeira Forja | Tempo até fabricar/equipar/aprimorar, ingredientes e diferença de poder percebida |
| Faixas21–100/101–500/501–1000 | Paredes de dano/vida, custo versus renda, patamar de peça/nível e necessidade de repetição |
| Ouro/jade/Musgo | Acesso a carvão50, custo de oportunidade, primeiro ganho útil e utilidade dos passivos |
| Tônicos e ausência | Compreensão da duração/custo, expiração fora do app e resumo do crédito |
| Mochila cheia | Filtro/equipados/reciclagem, mensagem de conversão em ferro e conforto em tela pequena |

Registrar bloqueadores e tempos observados antes de propor metas/ajustes por faixa. A aprovação desse playtest e o equilíbrio comercial não foram presumidos nesta entrega. Ajustes rotineiros podem ser decididos pelo agente sob a governança vigente; cobrar do usuário somente decisões com impacto financeiro relevante ou mudança profunda de escopo.
