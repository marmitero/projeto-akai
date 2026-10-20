# Mercado v2 — transações e ensaio de reconciliação

20/10/2026. Etapa autorizada após R7. Implementa contratos, transições de propriedade, servidor PostgreSQL isolado e prévia jogável. Não ativa a economia v2 nem substitui o mercado das contas antigas.

## Regras e propriedade

Somente Coin precifica anúncios/ofertas. Materiais:carvão,ferro,ouro. Equipamentos v2 conservam exatamente ID/origem/base/raridade/nível/qualidade/refino em todas as vendas e resgates. IDs não são renumerados ao trocar de dono; equipamento acima do nível do comprador ou mochila cheia vai ao cofre, sem perda/descarte automático. Afixos aleatórios legados continuam aposentados pelo contratoR2 e preservados no arquivo original, não reintroduzidos como poder negociável.

Jade/Ruby/pergaminhos/créditos legados/XP não são ativos negociáveis. Taxa inicial100.000Coin/anúncio,10% arredondado para cima sobre o preço total na venda, prazo72h,24h de cooldown após cancelar, andar10concluído para anunciar/comprar/ofertar. Valores em inteiros de milésimos, sem Number para saldos/preços. Preço precisa exceder a taxa arredondada; valores máximos e overflow rejeitam sem mutação.

Anúncio remove o bem da carteira/mochila e o mantém em escrow. Nenhuma via de equipar/refinar/descartar/resgatar cofre consegue acessá-lo. Compra transfere uma única instância e debita comprador/credita vendedor líquido/queima imposto no mesmo commit. Cancelamento e expiração mantêm escrow até um único resgate; taxa de anúncio não é devolvida no fluxo normal. Cancelar cria cooldown por vendedor+identidade do item ou tipo de material. Oferta não reserva Coin (regra do mercado legado preservada), tem prazo limitado pelo anúncio e revalida saldo/instância/atividade no aceite. Aceite/compra fecha ofertas concorrentes; retirar/recusar não cria reembolso fictício.

## Servidor e integração R7

`MarketV2Service`: apenas operador/CLI, sem rotaHTTP registrada. Coortes privadas de2–20 ensaios, conta única na coorte e run em apenas um mercado; identidade duplicada em carteiras/escrow rejeitada. Não é serviço público com20jogadores de capacidade final: esse limite delimita o ensaio e a ordem dos locks, e não substitui o desenho de particionamento/paginação/retention de produção.

Lock no mercado, seguido dos runs em ordemUUID; nenhum lock inverso é requerido pelo comando econômico. Comandos usam commandId/hash/expectedRevision da linha do ator. Receipt repetido retorna a resposta gravada; reutilização para outro conteúdo rejeita. Antes de negociar, cada membro aberto liquida até1.000 eventos pela agendaR7/HMAC privado. Se houver backlog, confirma as parcelas/ledger/cota, retorna settling e **não aplica a negociação solicitada**; reenviar nova ação com novo ID/revisão após concluir. Essa liquidação por coorte é limitada20×1000, não uma varredura de toda população real. Suspensão de participantes e fechamento são revalidados. Não é permitido fechar ensaio com escrow ou ofertas pendentes.

Snapshot/propriedade/ledger de cada run, recibo, livro, trade bruto(preço/imposto/líquido), taxas separadas e outbox são uma transação. Histórico de trades/taxas/comandos/eventos é imutável. Receita de venda é transferência, sem concessão deXP/conquistas, e os sinks de taxas ficam explícitos. Livro e posições nos membros são a autoridade deste ensaio; clientes não enviam saldo, instância, dano, relógio ou resultado.

CLI após build, em ambiente de teste com DATABASE_URL:

- `node apps/server/dist/market-v2-cli.js stage --file private-run-ids.json --request UUID`: arquivo contém array deUUIDs de runs existentes.
- `node apps/server/dist/market-v2-cli.js command --realm UUID --actor RUN_UUID --file private-command.json`: `{commandId,expectedRevision,action}`.
- `node apps/server/dist/market-v2-cli.js report --realm UUID`: livro e revisões/estados da coorte para revisão.

Arquivos operacionais com dados reais permanecem privados; exemplos acima não são credenciais ou implantação pública.

## Reconciliação legada

`prepareLegacyMarketReconciliation`: plano puro verificável, com hash do contexto original e recibos por anúncio/oferta. `stage-market-reconciled` no CLI de ensaio econômico executa esse plano **somente numa cópia**, dentro do lock global do mercado legado e da conta. `rollback-export` verifica e exporta o contexto anterior completo, sem sobrescrever conta que continuou jogando. Mesmo requestId reapresenta o ensaio; trocar modalidade com a mesma chave rejeita.

Equipamento em escrow retorna ao cofre projetado, conversãoR2 mantém nível/raridade, limita refino a+7 e guarda valores/afixos originais no arquivo. Material devolvido e taxa de anúncio ainda elegível entram na quarentena legada, não nos saldos gastáveis v2. Taxa só é elegível para anúncio ativo ainda no prazo, mediante gastoCoin exato100.000 identificado por `market:list:ID`; faltando prova bloqueia. Anúncio removido requer revisão explícita, sem supor motivo/reembolso. Ofertas legadas eram sem reserva: encerrá-las não cria Coin/Jade ou outro reembolso. IDs duplicados/owner errado e forma de ativo desconhecida rejeitam. Ruby/dívida seguem a política original, sem copiar saldo.

O plano não executa cancelamento/reembolso nas tabelas reais. Corte futuro ainda deve congelar gravações, resolver comandos em voo, aplicar retornos/recibos atomicamente uma única vez e arquivar o contexto atualizado. Não declarar esse corte ensaiado operacionalmente só porque o plano determinístico passou.

## Teste no jogo

Mais → Prévia da economia → **Mercado v2**. Duas carteiras fictícias financiadas, seletor vendedor/comprador, anúncio de item/material, compra, oferta/aceite/retirada/recusa, cancelamento/resgate, simular73h e reset próprio. Save separado da préviaR6/R7 e da conta real. Nenhuma chamada de negociação real. O motor é o mesmo das transições do servidor; a prévia não é autoridade entre abas/aparelhos.

## Validação e limites econômicos

Testes: moeda/ativos vinculados, precisão/extremos, item em escrow e suas mutações, conservação deCoin+taxas/material, compra única, IDs/qualidade/refino, cancelamento/cooldown/expiração/resgate, oferta sem fundos/concorrentes, overflow/cofre e relógio. PostgreSQL: concorrência de compra/cancelamento, idempotência e chave reaproveitada, ledger/fee/trade bruto, falha da outbox desfazendo tudo, suspensão, backlogR7, encerramento bloqueado e reconciliação legada sem editar conta/listagem real. Navegador: ida e volta do mesmo item, oferta, taxas, cancelamento/resgate/cooldown, reload e carteira antiga preservada.

Auditoria200 ciclos:133vendas, conservação exata dos materiais e deCoin somado aos sinks;20.000.182,160Coin consumidos em anúncios+impostos no cenário financiado. Isso testa contabilidade, não demanda real.

Amostra integrada de1h de torre fixa com buildVeloz:nível10/andar9/inicial9.387Coin; nível100/andar99/épico+9:531.822Coin; nível500/499:7.711.389,072Coin; nível1000/999:11.102.943,623Coin. Relação taxa/renda medida:~10,65h no primeiro caso,~11,28min no100 e~32,42s no1000. São builds sintéticas; custo/aquisição e renda estacionária não foram simulados. Esse contraste **não aprova acessibilidade nem liquidez**: taxa fixa pesa muito no início e pouco no late-game. Preservada nesta versão por contrato; calibrar versão explícita com coortes/demanda antes da ativação. Sem concluir que1h dessa fixture equivale a uma hora de campanha normal.

Local `npm run check` passou:146 testes/116PG pulados; CI PostgreSQL16/regressões completa obrigatória antes da main. Próximos: R8 bosses/Jade/evento proteção, consumidores, coortes/mercado/legado/capacidade e playtest, depois revisão do corte. +16–20bloqueado/monetizaçãooff. Mercado técnico isolado não aprova economia real/campanha90–120dias.

Primeira CI do candidato5bb5bdd:262 testes passaram e um teste legado de rollback encontrou deadlock deDDL no DROP TRIGGER emakai_events, concorrente com migração de outra suíte. A suíte nova de mercado passou todos os8 casos. Corrigido isolamento da fixture nova: schema PostgreSQL próprio por suíte, mesmo padrão do ensaioR2, sem mudar runtime ou remover concorrência dentro dos casos. Nova CI completa exigida; não integrar o candidato com falha.

## Fechamento validado

Runtime `ebbdf41045261c7e7b5765786695cc43b6b1b962`, árvore `e899ffee565f12c009a95f122a9ca3125c616c95`. [CI completa](https://github.com/marmitero/projeto-akai/actions/runs/39516514169) e [Windows](https://github.com/marmitero/projeto-akai/actions/runs/39516513954) aprovadas:263 testes/29 arquivos PostgreSQL16 sem skips, incluindo8 testes shared de mercado,8 transacionais de mercado e2 novos de reconciliação legada. Tipos/build/assets, auditoriasR2–R7/mercado/readiness, laboratórios e prévia dev/preview, chat/mobile, bestiário, online/comunidade/mercado e regressões completas passaram. Novo fluxo browser conferiu compra/revenda por oferta do mesmo ID/qualidade/refino, taxa, cancelamento/resgate/cooldown, reload e carteira legada preservada. Isolamento do schema resolveu a falha de fixture da primeira CI sem alterar regras do runtime.

Fechamento posterior somente documental; código, scripts, testes, SQL e JSON de auditoria idênticos ao runtime validado. PR16 publicado por autorização permanente, com SHA remoto a confirmar. A implementação técnica do mercado privado está validada; liquidez/coortes/concentração/capacidade e corte operacional seguem pendentes. Taxa/renda é amostra com níveis iniciais declarados, não renda estacionária ou campanha validada. Nenhuma conta real/listagem legada foi cancelada/reembolsada; sem ativação, boss/Jade novo ou monetização. PróximoR8 e consumidores/coortes/playtest antes da revisão do corte.
