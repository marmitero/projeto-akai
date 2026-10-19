# P8 — Global na batalha e contratos econômicos

19/10/2026. [PR6](https://github.com/marmitero/projeto-akai/pull/6).

Global agora é conversa embutida ao lado do Sistema, com histórico de50mensagens, envio, bloqueio/denúncia e leitura a cada2segundos enquanto canal/rota/documento estão visíveis. Retoma ao voltar; preserva posição de leitura e oferece Ver recentes. Texto/nick são inseridos com textContent. Comando pendente usa o mesmoUUID em tentativas de reconexão durante a sessão montada; reload não é garantia de reenvio de rascunho. Confirmação e cooldown3s permanecem no servidor. Mais→Comunidade mantém chat/guilda/arena/eventos; removido o atalho de saída do Global. Modo local informa indisponibilidade sem criar conversa falsa.

GET community/chat autentica, retorna somente conta/eligibilidade/mute/mensagens e filtra bloqueados/removidos/suspensos. Não liquida combate nem renova presença em boss/raid. Envio usa os comandos comunitários existentes, com idempotência e moderação. Nenhuma migração de banco foi necessária.

## Evidência

Runtime validado no head `cece0556761c015391ccff7473c3bc4384bfa62b`, árvore `af189f3e378125d22d451c122891980c707d048b`. A revisão posterior altera somente documentação/JSON de design, incluindo explicitação da cota offline diária e fonteCoin de descarte; não modifica cliente/servidor/testes/dependências. Auditoria do contrato reexecutada após essa explicitação.

- [Project checks39331368307](https://github.com/marmitero/projeto-akai/actions/runs/39331368307):sucesso.184testes/19arquivos com PostgreSQL16, tipos/assets/build, simulações e todos os smokes locais/online/dev/preview.
- Teste de navegador comunitário ampliado:duas contas permanecem na batalha ao enviar/receber;XSS literal;bloqueio;recarga;10alternâncias de aba;larguras320/390/1280sem overflow. Passou emdev epreview. Regressões de guilda/arena/eventos/mercado/premium passaram.
- [Windows39331368068](https://github.com/marmitero/projeto-akai/actions/runs/39331368068):sucesso na reexecução do mesmoSHA, incluindoBATmobile. Primeira tentativa atingiu timeout ao esperar readiness do jogo; nenhuma alteração ou ampliação de timeout foi usada para obter aprovação. Não é certificação de aparelhoAndroid físico.
- Local:89testes passaram,95dependentes de banco foram pulados; cobertura real de banco feita naCI acima. Tipos/build e diffcheck passaram.8auditorias do contrato passaram; relatório separado do gate de produção.

## Economia

[Regras fechadas](plans/hunts-builds/contracts/ECONOMY_RULES.md),[contrato](plans/hunts-builds/contracts/economy-v2.json),[auditoria](plans/hunts-builds/contracts/audit-results.json). Valores fechados como design; gameplay novo não está ativo. A candidataR1.1não foi reexecutada nesta etapa nem aprova automaticamente mercado/cofre/migração. Próximo:validar cenários alterados/legados e preparar ensaioR2desativado com backup, relatório antes/depois e rollback. Monetização permanece final.
