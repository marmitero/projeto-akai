# ADR-009 — Autoridade online e identidade sem serviço contratado

15/10/2026. Adotada sob autonomia autorizada para F5.

Problema: domínio local e RNG previsível não podem provar saldo, e não há conta/infra externa configurada. Precisamos testar persistência, identidade e concorrência de verdade sem contratar serviços.

Decisão: PostgreSQL 16 no ambiente reproduzível/CI, Fastify, cookie opaco HttpOnly de sete dias, convidado recuperável por chave independente e adaptador Google GIS/JWKS opcional. Sem importação de saves, fusão de saldos ou provedores falsos no runtime. Auth Google real requer configuração do titular e teste de integração posterior; testes de assinatura usam chaves locais explícitas.

Uma transação por conta com lock de linha liquida simulação e grava snapshot, ledger append-only, idempotência e outbox. É o escritor lógico, eliminando necessidade de lease de worker de batalha com estado em memória nesta fase. Distinguimos commandVersion e stateVersion para não conflitar clique com tick. RNG online injetado usa crypto.randomInt limitado a cada sorteio. Domínio local mantém RNG determinístico e testes existentes.

Presença: snapshot/heartbeat a cada segundo, janela de três segundos; após ausência, só minas até oito horas e deadline de boss. Streams têm limite dois/conta e lease dez segundos. Reconexão usa snapshot autoritativo integral; histórico durável disponível por cursor sem reproduzir grants. Um comando pendente por cliente; timeout preserva UUID/envelope. Pagamento e mercado não foram liberados.

Consequências: SQLite/fake backend não substitui o teste de concorrência PostgreSQL. Sem Redis/broker/serviço pago adicional. Snapshot por segundo é suficiente para desenvolvimento e precisa de medição de escala antes de produção; não alegar capacidade comercial. Recuperação por chave requer guardá-la; sem chave/cookie/Google não há recuperação por nome. Cookies exigem mesma origem, CSRF e HTTPS fora de loopback. Nenhum custo ou pilar fundamental alterado.

Contrato, limites, execução, permissões e pendências em [ONLINE](../ONLINE.md). Critério de saída técnico: concorrência/replay/rollback/IDOR/clock/bucket, migração de esquema, JWT/nonce, smokes local e online, restart/reconexão e documentação. Deploy público/Google real têm gates externos separados.
