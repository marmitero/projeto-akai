# ADR-011 — Mercado com reserva e transação compartilhada

15/10/2026 · Aceita no escopo de desenvolvimento da F7 autorizada pelo usuário.

Mercado exige itens e saldos autoritativos F4/F5, concorrência e recuperação; contrapropostas não podem bloquear dinheiro indefinidamente. Adotamos reserva no anúncio, compra/aceitação atômicas com locks ordenados e o lock global social existente. Em vez de modificar o save ou confiar em flags do cliente, equipamento sai do inventário e recurso sai do saldo disponível. Isso impede uso simultâneo por todos os comandos existentes.

Anúncios cancelados/expirados/removidos guardam o bem até resgate explícito; inventário cheio não converte nem destrói equipamento. IDs locais são realocados na entrega e uma chave de procedência externa preserva a identidade para cooldown. Recurso fungível recebe cooldown por categoria/conta, resolvendo divisão e mesclagem de pilhas de forma conservadora.

Preço e quantidade são strings inteiras em milésimos; taxa de 10% arredondada para cima na própria moeda. Custo de 100 mil Coins e prazo de 72h são parâmetros experimentais do prompt, simulados, não validados comercialmente. Oferta não reserva saldo e expira em até 24h; aceitação reconcilia ambos os perfis e revalida tudo. Ruby, Musgo de conta e skins sem instâncias elegíveis ficam fora do contrato atual.

Consequências: simplicidade e segurança do primeiro piloto, com serialização e caps explícitos; não é arquitetura de bolsa de alta escala. Histórico imutável e ledger/outbox/resultado de comando confirmam juntos. Mais detalhes, limites, ferramentas e evidências em MARKET_SYSTEMS e STAGE_07_REPORT. F8/produção pública não são antecipadas.
