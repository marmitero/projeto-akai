# ADR-012 — Monetização de teste isolada, sem produção simulada

15/10/2026 · Aceita no escopo técnico de F8 autorizado pelo usuário.

Monetização exige prova externa, idempotência, recuperação e tratamento de estornos. O projeto ainda é navegador e não possui contas/produtos/SDK Android configurados. Não é legítimo declarar integração real completa por um botão ou booleano do cliente. Escolhemos três estados explícitos: off padrão, simulador local assinado e adaptador backend Google Play restrito a compras TEST. Não existe modo de produção monetizada.

O banco de teste tem marcador persistente e não pode virar banco normal; modos de teste exigem loopback, chave privada, confirmação de banco separado e NODE_ENV não production. Preços reais não foram definidos. Pacotes experimentais100/550/1200/2600Rubies e um título cosmético sem poder permitem testar consumível/entitlement. Conversão premium, Ruby negociável, baús pagos e bônus permanentes de poder continuam sem ativação.

Token verificado é globalmente único e criptografado para restauração. Concessão/fonte/snapshot/ledger/outbox confirmam em uma transação; consumo/ack fica na fila persistente posterior. Recibo com falha tem backoff próprio e não bloqueia os demais. Reembolso revoga por fonte, retira Ruby disponível e registra dívida sem saldo negativo; nova compra abate dívida. Histórico não é reescrito.

Recompensas voluntárias de teste usam intenção/recibo assinados, limite8/24h, cooldown5min e duração120s; cliques/dano/Coins/XP só no intervalo de presença confiável. Multiplicadores de golpes respeitam fim exclusivo. Nada altera arena/boss global/guerra nem simula combate offline. Valores são de desenvolvimento, não equilíbrio comercial.

Consequência: F8 técnica pode ser exercitada agora, mas o gate externo permanece parcial até conta/produtos/license testers/cliente Android e AdMob SSV reais de teste. Verificador SSV puro com chaves de fixture não substitui SDK/transporte/rotação de chaves/configuração de unidade. MONETIZATION_SYSTEMS e STAGE_08_REPORT registram o que foi executado e o que depende do titular/plataforma. F9 e publicação comercial não são iniciadas por esta decisão.
