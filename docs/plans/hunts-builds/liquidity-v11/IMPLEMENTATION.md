# Fase 2 — liquidez adquirida (V11)

Ensaio privado do mercado v2 com os sete estados finais reais da V10. Não altera a economia ativa, taxas do jogo, carteira legada, monetização ou bloqueio +16–20.

## Protocolo

- Remapeamento reversível dos UUIDs dos sete mundos independentes, incluindo IDs/referências dos itens; nenhum saldo, qualidade ou fortalecimento é criado. A origem de cada arquivo é conferida contra o SHA256 certificado da V10.
- Cada personagem faz seis horas adicionais de combate R6 em seu andar seguro da torre, retendo drops em mochila/cofre. Esse é um cenário adicional de oferta; não reescreve nem certifica outra campanha de120dias. A rotina casual também recebe seis horas somente neste ensaio independente de fornecimento.
- Cópias isoladas medem uma hora de renda por atividade para estimar custo de oportunidade. Ao perder, o diagnóstico recua10% até sobreviver uma hora; todos os resultados de tentativa ficam registrados. Nenhuma renda dessas cópias é creditada às carteiras do mercado.
- Demanda de material: oito cotações por nível para os próximos três níveis de um equipamento equipado, no máximo+15. O vendedor retém a mesma reserva. Comprador gasta no máximo5% do saldo por compra. Isso é uma hipótese de política, não demanda observada de jogadores.
- Equipamento: somente loot realmente possuído e não equipado; vendedor conserva candidatos úteis para si. Comprador compara potencial no refino do item atual, descontando escudo perdido por arma de duas mãos e exigência de nível. Uma compra por slot por cenário evita demanda duplicada. O ganho projetado não garante equipamento utilizável: recursos, proteção e RNG ainda precisam permitir o refino pago.
- Preços de referência usam Coin por hora e material por hora de cada vendedor. Três sensibilidades de preço (0,25×/1×/4×), mais piso que cobre a taxa100k após imposto de10%. Comprador compara sua própria alternativa de farm; oferta só aceita desconto de até20%. Itens são cotados por1/24da renda horáriaCoin, com a mesma sensibilidade/piso. Tetos são hipóteses explícitas.
- Compras, ofertas, aceite, escrow, imposto, expiração72h e resgate usam o motor real. Personagens ficam pausados durante a observação do livro;73h de relógio do mercado não rendemXP/farm/offline/eventos.
- Após negociar, refinos reais consomem Coin/materiais/proteção e PRNG; até100tentativas por alvo, interrupção por falta de recurso/proteção. Não expor item adquirido à quebra para gerar volume. Só equipar se o resultado efetivamente pago melhorar o conjunto atual.
- Conferir conservação por transação e resgate, incluindo escrow e taxas; conferir custos das cotações e identidade dos itens antes/depois do refino. Replays pareados de boss1000 com Força antes/depois não concedem recompensa.

## Reprodução

`npm run build:shared` · `node --test scripts/tests/liquidity.test.mjs` · `node scripts/economy-v2/audit-liquidity.mjs --verify`.

`results.json` contém hashes das fontes, origens, taxas medidas, falhas de diagnóstico, oferta, compras, impostos, consumo e censura. CI refaz o experimento inteiro e exige igualdade exata. A auditoria V10 continua verificando as campanhas originais, com fontes compartilhadas intactas.

## Estado

Em execução. Liquidez de população, equilíbrio de fontes/consumosCoin, preço empírico, tempo de venda/P95, builds finais, consumidores públicos e corte continuam bloqueados. Resultados e validação final serão fechados em RESULTS.md; integridade técnica não significa ativação econômica aprovada.
