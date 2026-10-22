# Fase 2 — liquidez adquirida (V11)

Ensaio privado do mercado v2 com os sete estados finais reais da V10. Não altera a economia ativa, taxas do jogo, carteira legada, monetização ou bloqueio +16–20.

## Protocolo

- Remapeamento reversível dos UUIDs dos sete mundos independentes, incluindo IDs/referências dos itens; nenhum saldo, qualidade ou fortalecimento é criado. A origem de cada arquivo é conferida contra o SHA256 certificado da V10.
- Duas alternativas independentes: todos fazem seis horas adicionais de combate R6 na torre; ou três personagens produzem carvão/ferro/ouro e os outros quatro farmam a torre. Nas hunts de produção, começa em 70% do maior andar já conquistado, com perdas registradas sem reinício lucrativo. Drops reais ficam em mochila/cofre. Esse é um cenário adicional de oferta; não reescreve nem certifica outra campanha de 120 dias. A rotina casual também recebe seis horas somente neste ensaio independente de fornecimento.
- Cópias isoladas medem uma hora de renda por atividade para estimar custo de oportunidade. Ao perder, o diagnóstico recua10% até sobreviver uma hora; todos os resultados de tentativa ficam registrados. Nenhuma renda dessas cópias é creditada às carteiras do mercado.
- Demanda de material: após comprar equipamento, oito cotações por nível até o alvo de refino dos itens comprados; sem compra, os próximos três níveis de um equipamento equipado, no máximo +15. O vendedor retém a mesma reserva. Comprador gasta no máximo 5% do saldo por compra. Isso é uma hipótese de política, não demanda observada de jogadores.
- Equipamento: somente loot realmente possuído e não equipado; vendedor conserva candidatos úteis para si. Comprador compara potencial no refino do item atual, descontando escudo perdido por arma de duas mãos e exigência de nível. Uma compra por slot por cenário evita demanda duplicada. O ganho projetado não garante equipamento utilizável: recursos, proteção e RNG ainda precisam permitir o refino pago.
- As compras de itens precedem as de materiais para que a reserva financie o equipamento efetivamente comprado, em vez de outro alvo. Preços de referência usam Coin por hora e material por hora de cada vendedor. Três sensibilidades de preço (0,25×/1×/4×), mais piso que cobre a taxa de 100 mil Coin após imposto de 10%. Comprador compara sua própria alternativa de farm; oferta só aceita desconto de até 20%. Itens são cotados por 1/24 da renda horáriaCoin, com a mesma sensibilidade/piso. Tetos são hipóteses explícitas.
- Compras, ofertas, aceite, escrow, imposto, expiração de 72h e resgate usam o motor real. Personagens ficam pausados durante a observação do livro; 73h de relógio do mercado não rendemXP/farm/offline/eventos.
- Após negociar, refinos reais consomem Coin/materiais/proteção e PRNG; até 100 tentativas por alvo, interrupção por falta de recurso/proteção. Não expor item adquirido à quebra para gerar volume. Só equipar se o resultado efetivamente pago melhorar o conjunto atual.
- Conferir conservação por transação e resgate, incluindo escrow e taxas; conferir custos das cotações e identidade dos itens antes/depois do refino. Replays pareados de boss 1000 com Força antes/depois não concedem recompensa.

## Reprodução

`npm run test:liquidity` · `npm run audit:liquidity`.

`results.json` contém hashes das fontes, origens, taxas medidas, falhas de diagnóstico, oferta, compras, impostos, consumo e censura. CI refaz o experimento inteiro e exige igualdade exata. A auditoria V10 continua verificando as campanhas originais, com fontes compartilhadas intactas.

## Estado

Ensaio executado em seis cenários; resultados em [RESULTS.md](RESULTS.md). CI e Windows aprovadas; evidências finais em RESULTS.md. Liquidez de população, equilíbrio de fontes/consumosCoin, preço empírico, tempo de venda/P95, builds finais, consumidores públicos e corte continuam bloqueados. Resultados e validação final serão fechados em RESULTS.md; integridade técnica não significa ativação econômica aprovada.
