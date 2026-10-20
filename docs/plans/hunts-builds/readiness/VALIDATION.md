# Validação de mercado, offline e bosses

Atualização mercado v2: o relatório abaixo é histórico da inspeção anterior às entregas. Offline R7 e transações privadas de mercado v2 foram implementados; consulte [R7](../r7/IMPLEMENTATION.md), [mercado v2](../market-v2/IMPLEMENTATION.md) e a auditoria atual. Liquidez/corte real, migração dos consumidores e bosses/Jade continuam pendentes.

20/10/2026. Base analisada: R6 publicada `a274b04b06b480aa8fd14d797095b8a9ae8887a9`. **Corte da nova economia não aprovado.** Validar implementações existentes não substitui funcionalidades ainda ausentes. Nesta etapa há uma correção pontual, sem ativação, migração real, rebalanceamento de bosses ou loja.

[Resultados reproduzíveis](audit-results.json): `node scripts/economy-v2/audit-readiness.mjs` após build compartilhado. O script verifica contratos em runtime, reproduz o prazo do boss e registra inspeções de código explicitamente. Código de saída0 significa auditoria executada sem erro, **não** liberação dos gates; consultar `activationReady:false`. Não é ferramenta capaz de aprovar automaticamente uma integração futura desconhecida.

| Área | O que foi validado | Resultado para o corte |
|---|---|---|
| Mercado | Parser real aceita Jade como mercadoria e cinco moedas; recusa ID de item v2. Suíte PostgreSQL cobre integridade do mercado legado. | **Bloqueado:** legado não é adaptador v2 Coin-only e não preserva ainda as regras de vínculo/instância/escrow do novo domínio. |
| Offline | Ensaio R6 pula ausências >30s; teste PostgreSQL confirma ausência de ganho v2 nessa condição. Offline legado produz minas, não combate v2. | **Bloqueado:** faltam orçamento diário e por ausência, virada de Brasília, andar seguro e paridade por reconexão/aparelhos. |
| Bosses da torre | Reproduzido e corrigido prazo de30s omitido no adaptador R6; primeiro clear e falha são testados. | **Parcial:** prazo corrigido, mas isso não certifica dificuldade/aquisição de toda a campanha. |
| Boss diário/Jade | Plano matemático cumpre3 de base, ranking200→20, último golpe250, máximo453; vínculo, elegibilidade e empate têm testes. Runtime diário legado ainda grava Coins. | **Bloqueado:** falta fonte autoritativa de Jade com edição diária completa e grants transacionais únicos. |

## Mercado

`MARKET_CURRENCIES` ativo: Coin/ferro/carvão/ouro/Jade. `MARKET_RESOURCES` inclui Jade. `MarketActionSchema` permite anunciar Jade e exige itens com formato legado `item-N`, recusando a identidade de uma peça v2 real. Isso é compatibilidade do jogo antigo, não uma vulnerabilidade nova introduzida nesta etapa. Não alterar o mercado legado silenciosamente enquanto contas reais continuam nessa economia.

Para liberar o domínio novo: adaptar moeda únicaCoin e materiais carvão/ferro/ouro, bloquear Jade/pergaminhos/Ruby/crédito legado, conservar identidade e refino, impedir mutação em escrow e validar compra/oferta/cancelamento/resgate concorrentes no mesmo ledger da economia v2. Antes do corte, resolver anúncios/ofertas antigos com retorno de bens/taxas elegíveis uma única vez e reconciliar com os arquivos de migração. Reavaliar liquidez/custo100.000Coin/anúncio com renda nova; não inferir acessibilidade pelo teste de parser ou pela renda do cenário sintético.

## Offline

O método privado `EconomyRehearsalService.command` ignora a lacuna maior que30s e abandona encontro parcial. É comportamento intencional pré-R7. A suíte antiga testa produção de minas limitada por ausência e ausência sem combate, que não atende ao contrato de farm v2.

R7 precisa implementar até8h por dia **e** por ausência, dia de Brasília, gasto de cada segundo no dia correto, mesma cota entre abas/aparelhos/reconexões, build congelada, andar comum vencido e seguro, sem subir andares/repetir boss/eventos. Exigir cenários de virada de dia, retorno repetido, relógio regressivo, saturação de cota, falta de andar seguro e agenda com backlog sem pular eventos. Campos `offline.day/usedMs` e contratoJSON sozinhos não demonstram execução. Não simular um avanço ativo de8h e apresentar isso como teste offline.

## Bosses: defeito confirmado e corrigido

Reprodução anterior: run v2 no andar100, nível100, Vitalidade594 (orçamento legal), espada inicial, HP suficiente e dano insuficiente para vencer rapidamente. Após31s o guardião ainda estava `fighting`, sem deadline. O jogo legado usa `LOOP.bossMs=30000` e prazo exclusivo. R6 aplicava deadline apenas às hunts, omitindo o boss da torre.

Correção mínima: o início de encontro agora aplica `at+30000` também a andares múltiplos de10 da torre. HP, ATQ, intervalos, loot e chances não mudaram. Teste aos30000ms confirma pausa por timeout, nenhum abate, nenhum Coin/XP ou avanço de andar; reler aos31000ms não concede prêmio. Não confundir essa correção com rebalanceamento da etapaR8.

O boss global legado usa janela22h–22h30, pipeline antigo e contribuição/último golpe emCoins. `planDailyBossJade` calcula a distribuição nova, mas não é escritor transacional de saldo. O broadcast R2 é consumidor de registros v2 confirmados; fixture de leitura não prova fonte real. Faltam janela diária de contribuição, qualificação por600s, edição de contribuição pós-morte sem segundo ranking/último hit, dano efetivo com acerto/crit/stats novos, teto/grant único por conta, ledger/outbox/broadcast atômicos e testes de reinício/concorrência. +16–20 continua bloqueado; não introduzir Jade provisória para fazer validação passar.

## Evidências e limites

Local: typecheck aprovado; suíte dirigida executou19 testes e pulou83 testes dependentes de PostgreSQL. Auditoria funcional detecta as incompatibilidades acima e valida prazo/cálculo Jade. A CI deve executar a suíte com PostgreSQL16 sem skips e as regressões do jogo antes de publicar a correção. Não há migração de conta ou modificação de saldo real. Salvos relatórios/dados de fixtures sem arquivos privados de contas.

Ordem recomendada: R7 offline/consumidores → mercado v2 e reconciliação da migração → R8 bosses/Jade/evento semanal de proteção → coortes integradas90–120dias e playtest gratuito → revisão final do corte. Monetização continua adiada. A correção do prazo pode ser publicada com os demais gates bloqueados; não habilita a economia nova.

## Amostra adicional de bosses da torre

[boss-sample.json](boss-sample.json):216 encontros, quatro andares10/100/500/1000, herói no nível equivalente ao andar, seis presets de orçamento igual, equipamentos inicial/épico+9/lendário+15, seeds1/4213/3735928559. Abre encontro pelo adaptadorR6 e resolve seu snapshotR3 até deadline30000ms. Equipamentos elegíveis por nível, qualidade100%; custo/aquisição e tempo para possuir o conjunto **não** são simulados. Conjunto lendário+15 é cenário sintético, não tentativa liberada de+16–20.

Inicial:18 vitórias/54 timeouts (72 casos). Épico+9:72 vitórias; lendário+15:72 vitórias. Nenhum caso terminou por HP0. Isso confirma comportamento do prazo e diferença de poder, mas não certifica dificuldade dos100 bosses, utilidade defensiva ou campanha90–120dias. O catálogo de boss ainda usa ataque físico básico e âncoras antigas: não concluir que já pressiona builds bem equipadas ou que o novo boss diário está pronto. R8 deve avaliar ameaça recebida, fases/tipos de dano, recompensas e aquisição, preservando o objetivo de+20 opcional.

Sinal concreto de dificuldade insuficiente: no boss1000 com épico+9 (18 casos), vitórias em6,30–11,28s e perda de apenas0,096–0,397% do HP. Na comparação com o mesmo herói1000/Veloz/épico+9/seed4213, o ciclo comum999 de três ondas levou34,35s, enquanto o boss1000 levou6,30s. A comparação de tempo inclui as transições entre ondas do comum; mesmo assim, a ameaça recebida muito baixa no boss é evidência separada de pressão insuficiente. Amostra não prova inversão em todos os pares de andares, mas impede certificar o high-end atual como equilibrado. Rebalancear bosses permanece etapaR8, sem alterar seus atributos de forma oportunista neste relatório.

Recuperação de saves ativos R6 anteriores: boss em andamento sem deadline recebe o prazo original calculado por relógio de combate menos tempo acumulado, acrescido de30s. Não recebe30s novos a cada recarga. Se já acumulou30s ou mais, o encontro é encerrado por tempo no cursor atual, sem voltar o relógio ou conceder novos recursos/XP/clear. Teste cobre JSON com20s, retomada aos25s, expiração aos30s e snapshot antigo já em31s. Vitórias já concluídas antes da correção não são desfeitas; nenhum saldo real de conta é alterado.

## Fechamento validado

Runtime `c8c973d77accefbdb70dcc92034edadd16e27c8a`, árvore `58a1fc8a3463f4ca622ac8e9ebc783e409c092e9`. [CI completa](https://github.com/marmitero/projeto-akai/actions/runs/39469147459) e [Windows](https://github.com/marmitero/projeto-akai/actions/runs/39469147460) aprovadas:234 testes/26 arquivos com PostgreSQL16, sem skips; tipos/build/assets, auditoriasR2–R6/readiness, laboratórios/prévia, chat/mobile, bestiário, online/comunidade/mercado e regressões dev/preview. Localmente, os10 testes do runtimeR6 e typecheck passaram após acrescentar recuperação dos saves.

Este fechamento posterior altera apenas documentação. Os três gates permanecem bloqueados (`activationReady:false`): CI verde certifica a execução da auditoria e ausência de regressões cobertas, não prontidão do mercado/offline/boss diário v2. Nenhuma ativação, migração de conta, mudança de atributos/recompensas dos bosses ou monetização. A amostra de216 encontros mantém aberto o bloqueio de pressão insuficiente dos bosses avançados. Próximo trabalho: R7, mercado v2, R8 e coortes/playtest antes de revisar o corte.
