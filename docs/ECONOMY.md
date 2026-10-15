# Economia e regras de transação

Regras do produto e propostas de implementação v1. Economia local F3/F4, autoridade online F5 e comunidade/mercado F6/F7 em desenvolvimento. Números de teste em BALANCE não são balanceamento comercial aprovado.

## Fontes e sumidouros

| Recurso | Fonte primária | Sumidouros previstos | Primeira fatia |
|---|---|---|---|
| Coin | Vitória de inimigos e recompensas explícitas | Upgrades, perks, desbloqueios e mercado | Sim |
| Ferro | Mineração manual; autoclick autorizado em fase futura | Guerreiro, equipamentos, mascotes, minas, fabricação | Sim |
| Carvão | Mina automática | Equipamentos e ferro fundido | Produção sim; receitas futuras |
| Ouro | Mina automática; carvão nível 50 como requisito | Equipamento/mascote avançado e minas | Implementado F4 |
| Jade | Mina automática avançada | Equipamento/mascote/receitas de nível alto | Implementado F4 |
| Ruby | Compra validada e eventos/recompensas explícitas | Produtos premium/configurados | F8; sem saldo premium real no local |

Não converter Coin em ouro por compartilharem cor. Ferro fundido é material de fabricação futuro, não sétima moeda já implementada. Sem receita aprovada não há razão para criar conversão automática entre materiais.

## Representação e arredondamento

Implementado na F3:1.000 unidades mínimas = 1 unidade exibida, para permitir carvão fracionário sem float. Saldo persistido é inteiro não negativo; UI pode abreviar, mas detalhe mostra valor real. Clique inicial de 1 ferro credita 1.000 unidades mínimas. Recursos indivisíveis como item/equipamento têm contagem inteira própria e não usam milésimos.

Custos de upgrade arredondados para cima em unidades inteiras de recurso; ganhos de produção acumulam remainder para que frequência de reconciliação não mude a renda. Multiplicadores representados por razões ou basis points; aplicar ordem fixa documentada. Overflow/limite excedido rejeita antes do commit. API nunca aceita saldo final do cliente.

## Semântica de compras e recompensas

Compra: verificar pré-requisito, calcular custo usando configVersion e nível vigente, reservar/bloquear saldos, debitar, aplicar benefício, ledger, command result e outbox na mesma transação. quantity=1 inicialmente. Compra em lote futura calcula soma dos níveis individualmente, não custo inicial×quantidade.

Grant: source único inclui edição/tentativa e beneficiário. Moeda de morte comum é por enemyInstanceId da tentativa; primeira conclusão de andar é outra fonte. Não conceder prêmio de boss derrotado por timeout. Uma apresentação visual atrasada não altera o grant confirmado.

Produção é automática, sem necessidade de tocar “coletar” repetidamente. Retomada exibe resumo do que foi conciliado; clicar no resumo não concede segunda vez. Watermark e crédito são atômicos. Fração não exibida não é descartada a cada troca de tela.

## Upgrades e desbloqueios

Toda definição exige ID estável, efeito, custo por recurso, nível máximo quando aplicável, pré-requisitos, configVersion e disponibilidade por ambiente. Custos sempre exibidos antes da confirmação. Carvão custa ferro+coins; ouro exige carvão 50 e recursos; Jade exige ferro/ouro/carvão/coins. Quantidades de ouro/Jade permanecem não aprovadas, fora do MVP, até F4. Não inventar obrigação de ruby para progressão básica.

## Mercado: regras propostas para fechar lacunas

Referências do prompt: duração 3 dias, taxa 10%, custo de anúncio 100.000 Coin, relistagem após remoção antecipada do mesmo item aguarda 24h. Valores monetários são provisórios. Proposta: vendedor paga custo de anúncio ao publicar, sem reembolso em cancelamento/expiração; comprador paga preço anunciado, vendedor recebe preço menos taxa; taxa cobrada na moeda da transação, arredondada para cima na unidade mínima. Rejeitar preço tão baixo que o líquido seja ≤0. Esta política precisa ser confirmada/simulada em F7 antes de ativar.

Itens em anúncio ficam em escrow: não equipar, consumir, anunciar novamente ou transferir. Pilhas reservam quantidade, equipamento reserva instância. Contraoferta proposta não reserva saldo indefinidamente; aceitação revalida saldo e disponibilidade de forma atômica. Se indisponível, não debitar ninguém. Oferta aceita encerra anúncio e demais ofertas. Vendedor não compra próprio anúncio. Identificação de cooldown de pilhas precisa de regra anti-divisão/mesclagem antes de F7.

Ruby como moeda negociável fica desligado até decisão D15. Nenhuma negociação representa dinheiro real entre jogadores.

## Offline e bônus

Ver ADR-003: MVP acumula apenas minas, cap experimental de 8h, sem vitória/andar/drop offline. Integrar por intervalos de taxa e bônus; não aplicar bônus expirado a todo o período. Tempo negativo produz zero; navegação interna produz zero tempo de ausência. Online não usa relógio local. Bônus temporários são identificados por source/start/end; regra inicial proposta de mesmo tipo: estender apenas até cap configurado, sem multiplicar 2× em 4× silenciosamente. Não ativar anúncios antes de aprovar caps/cooldowns.

## Observabilidade econômica e rebalanceamento

Medir fontes e gastos por recurso/dia/coorte, tempo entre upgrades, tempo até carvão/primeiro boss, estoque mediano e p95, retenção e discrepâncias ledger↔saldo. Nada disso foi medido ainda. Simular jogadores ativos a 1/3/5 cliques por segundo e retornos em 1h/8h/24h, sem supor clique contínuo humano.

Rebalancear cria configVersion nova com data efetiva e plano para saves/instâncias. Não recalcular compra passada, não editar ledger retroativamente nem reduzir saldo sem operação compensatória explícita e auditada. Critérios de experimento e fórmulas em BALANCE; probabilidades em DROP_TABLES.

## Implementação F3

Config local-loop-1 usa as fórmulas de BALANCE, níveis 0–100, ferro/Coin nos custos, saldo BigInt em strings e acumulador de carvão com denominador1000. Grant local ocorre na mudança HP>0→0 e é persistido junto ao cadáver/checkpoint; não foi criado ledger online. Força altera dano futuro; vitalidade aumenta HP atual/máximo em 15; cura inteira ao iniciar andar/tentativa/treino, sem cura entre ondas.

Produção continua entre telas; ocultação/fechamento concilia até 8h uma vez por watermark. Sem simular vitórias offline. Boss preserva prazo de expiração. Treino manual do andar anterior após falha de boss elimina softlock de Coin identificado em simulação, concede recompensas normais e para novamente antes do boss. Custos/política em ADR-007; o botão de resumo offline não concede nada porque não há coleta manual. Ouro/jade/Ruby e receitas continuam futuros.

## Implementação F4

Custos experimentais adotados pelo agente em RPG_SYSTEMS: Forja, ferro fundido, aprimoramento, tônicos, Musgo e minas ouro/jade. Todos quantity1, pré-requisitos e saldos verificados juntos no draft. Ruby não é fonte nem sumidouro desses sistemas. Ferro fundido é material em rpg.castIron, separado das seis moedas/recursos principais. Nenhum preço ou serviço pago foi definido.

Ouro exige carvão50; jade paga ferro/ouro/carvão/Coin. Passivos de equipamento/Musgo e tônico de produção integram somente o prazo válido. Resto por mina usa denominador40.000.000; migração do resto F3 multiplica40.000, sem perder fração. Ganhos manuais arredondam para baixo na unidade mínima; atributos aprimorados para cima.

Inventário cheio converte drop em10×nível ferros, sem fila ilimitada; não pode fabricar cheio nem reciclar equipado. Aprimorar não rerrola atributos e reciclar não devolve seus custos. Equipe/desequipe não cura. XP muda poder e circulação de Coin; simulações locais versionadas não substituem monitoramento/ledger da F5 nem playtest comercial.

## Atualização F6 — 15/10/2026

F6 acrescenta custos virtuais de guilda500Coins/evolução1000×nível, prêmios experimentais de arena/guildas/boss/guerra, baú de raid e100Rubies da loteria prevista no prompt. Rubies online podem ser creditados somente pelo servidor na edição única elegível; não há compra, conversão monetária ou negociação. Ledger/outbox/claims atômicos e reconciliação testados; parâmetros/tabelas/limites em COMMUNITY_SYSTEMS. Não foram contratados serviços ou definidos preços reais.

## Implementação F7 — market-1

A proposta de mercado acima foi adotada no piloto de desenvolvimento com [regras completas](MARKET_SYSTEMS.md), [ADR-011](ADR/0011-market-escrow.md) e [simulação reproduzível](phase7-economy-simulation.json). Anúncio100.000Coins/72h; venda10% na própria moeda com ceil em milésimos; mínimo0,002. Sem reembolso, Ruby, conversão premium ou transferência de dinheiro real. Negociação após andar10. Lote inteiro de recurso ou uma peça não equipada; Musgo/skins não têm instância elegível. Cooldown24h por procedência de peça ou categoria de recurso na conta; retorno por claim seguro.

A taxa de anúncio pesa no começo: equivale a834vitórias individuais no andar10 e15no100, sem considerar tempo/derrotas/outros ganhos. Conservaram-se os números propostos para o teste de desenvolvimento; não abrir produção assumindo equilíbrio. O simulador verifica arredondamento/conservação e pressão por estágio; não substitui telemetria/coortes/playtest humano. Auditoria SQL de volume/taxas em OPERATIONS; `db:reconcile` continua verificando snapshots↔ledger sem editar histórico.
