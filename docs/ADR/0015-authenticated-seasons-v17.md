# ADR-015 — Fechamento de temporadas autenticadas v2

22/10/2026. Aceita no escopo autorizado de próximos passos e autonomia técnica. [Contrato V17](../plans/hunts-builds/authenticated-seasons-v17/IMPLEMENTATION.md).

V15/V16 possuem resultados competitivos e carteiras isoladas. Importar pagamentos legados ou premiar semanas anteriores à instrumentação não oferece origem auditável. Multiplicar domínio por bônus de XP antigo alteraria o contrato de tempo adquirido.

Decisão: acompanhamento semanal explicitamente iniciado no ensaio, fronteira de Brasília e archive append-only. Fecha somente semana acompanhada e inicia atual, sem simular semanas de inatividade. Arena/guildas recusam mutações após a fronteira até o fechamento; recibos anteriores continuam recuperáveis. Isso mantém o vínculo na fronteira sem reconstruir histórico legado. Suspensos/desabilitados/fechados continuam excluídos da seleção ativa no fechamento. Histórico original permanece em suas tabelas; arquivo congela ranking ativo e nomes selecionados.

Prêmios Coin da comunidade (arena500/300/100, guildas300/200/100por membro24h) tornam-se fontes nativas, únicas por semana/tipo/conta na mesma transação do ledger/carteiras/recibos/outbox. Coin não gera tempo qualificado, Jade ou poder concedido diretamente. Configuração seasons-v17-1 vale para acompanhamento iniciado nesta etapa; saldo legado não recebe nada. Não é declaração de balanceamento adquirido ou aprovação de nova emissão pública.

Locks compartilhados guild→arena→seasonworld→runsordenadas→sessão/membros. Arena/guilda não adquirem seasonworldFORUPDATE após runs; a guarda apenas lê sob advisory já serializado. Outros writers não adquirem locks competitivos depois das runs. Rollover compete atomicamente com gestão/match; revisão antiga exige confirmação nova. UI persiste intenção antes do POST e recupera o mesmoUUID após recarga.

Alternativas: fechamento em GET quebraria leitura pura; pagamento automático dentro de match alteraria carteiras além da revisão confirmada e complicaria rollback; permitir saída antes de fechar exigiria histórico temporal completo para reconstruir elegibilidade. A guarda explícita torna o fechamento visível e testável. Inicialização voluntária impede prêmios retroativos não instrumentados.

Consequências: primeiro fechamento nativo arena/guildas funcional no ensaio; requer ação de qualquer membro admitido para acompanhar/fechar, sem scheduler público novo. Histórico de dano de boss, XP de boss/guerra, guerra autenticada e bônus de progressão exigem próximas fatias. Preservados todos os gates econômicos/operacionais, monetização por último. Sem decisão financeira ou abertura de infraestrutura.
