# Operação, ambientes e recuperação

Runbook planejado; nenhum serviço foi provisionado. Não há URLs operacionais, banco de produção, alertas ou comandos de deploy prontos. Definir fornecedor/região/orçamento e testar procedimentos antes de F5.

## Ambientes e implantação

Local: fixtures e save de teste. Staging: backend/banco/provedores sandbox isolados. Produção: dados/chaves/recebíveis reais somente após gates. Não reutilizar service role, conta de pagamento ou banco entre ambientes. Build imutável por commit, configVersion e migrações explícitas; feature flags de mercado, premium, social e import de save são do servidor.

Fluxo futuro: checks → artefato versionado → staging → migração compatível → smoke de login/estado/compra não premium → revisão de release → produção → monitoramento. Migração usa estratégia expand/contract para suportar cliente anterior; rollback do binário não desfaz schema destrutivo por mágica. Não há deploy autorizado nesta etapa.

## Jobs e relógio

Boss global às 22h America/Sao_Paulo; guardar edição local e timestamps UTC. Executor tem lease/fencing e chave única de edição. Reinício verifica edição atual/pendente em vez de disparar outra. Outbox faz retry com backoff e dead-letter operacional; claims garantem concessão única mesmo após reenvio. Temporadas, mercado expirado e buffs usam deadlines persistidos. Não depender do cron do dispositivo.

## Métricas e alertas propostos

Latência/erros por rota, sessões, rejeições por auth/rate, locks/deadlocks, backlog/idade da outbox, jobs sem lease, grants repetidos evitados, saldo divergente e crescimento de moeda por coorte. Queda de FPS/falha de asset/save são métricas client-side sem dados pessoais. Alertar imediatamente para discrepância ledger↔saldo e repetição confirmada de compra/grant; thresholds de tráfego/latência dependem do baseline de staging.

## Backup e restauração

Metas iniciais propostas: RPO≤15min e RTO≤4h para online, sujeitas a provedor/orçamento e teste; não são SLA. Backup criptografado, controle de acesso, restauração em ambiente isolado e verificação de constraints/ledger. Preservar recibos/claims e cursores necessários para não reemitir grants após restore. Simular falha antes de produção. Save local tem snapshot anterior/export de teste, mas não se promete recuperação após limpeza de armazenamento do navegador.

## Incidentes

1. Identificar impacto e pausar apenas feature afetada por flag confiável.
2. Preservar logs restritos com requestId/transactionId, sem copiar segredos para issue pública.
3. Se comprometimento: revogar credenciais/sessões, revisar permissões e conter emissão econômica.
4. Reconciliar saldo/ledger/itens/claims. Preferir ajustes compensatórios auditados a apagar histórico.
5. Restaurar/reprocessar em staging, verificar idempotência e só então reabrir.
6. Registrar causa, janela, contas afetadas, correção e prevenção; comunicação ao usuário conforme impacto e política aplicável.

## Administração e suporte

RBAC específico, autenticação forte, ações auditadas com motivo e escopo mínimo. Debug local não compartilha endpoint público. Sem alteração manual de saldo por SQL sem trilha e plano de conciliação. Suspensão/denúncia/remoção de conteúdo devem ter política de moderação antes do online público. Retenção/exclusão de dados e requisitos de privacidade ainda precisam de decisão; ver DATA_MODEL e DECISIONS.
