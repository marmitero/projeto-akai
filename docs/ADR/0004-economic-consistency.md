# ADR-004 — Efeitos econômicos únicos com transações e outbox

Data: 15/10/2026. Estado: proposto como solução técnica das invariantes obrigatórias do Master Prompt. Não implementado.

## Contexto

Resposta de rede pode se perder após commit, WebSocket pode duplicar eventos e dois processos podem tentar comprar/conceder o mesmo item. Prometer exatamente uma entrega no transporte não garante efeito econômico único.

## Decisão proposta

PostgreSQL como fonte de estado; saldos materializados com ledger append-only. commandId escopado por conta, payload hash, unique claims e locks/constraints preservam idempotência. Estado, ledger, resultado do comando e outbox confirmam na mesma transação. Publicador faz retry; consumidor deduplica eventId/sequence. Scheduler usa lease/fencing e edição única. Ruby reutiliza ledger com trilha premium, sem segundo saldo desconectado.

## Alternativas e consequências

Só botão disabled falha com replay; só Redis lock pode falhar em expiração; só event log sem modelo de leitura complica consultas. Ledger+saldo exige reconciliação e outbox exige worker/retentativas/retention. Falha após commit pode atrasar UI, mas não precisa repetir grant. Limpeza de idempotência deve preservar fontes econômicas duráveis. Ver SECURITY, DATA_MODEL e OPERATIONS.
