# H29 — recuperação da evidência em andamento

O código H29 permanece implementado/validado em e2c857d7579a9b5a1d0df3bdf2e46492e3c14053, com sete testes e CI completa aprovados. A manutenção automática do workspace foi confirmada como causa da remoção dos arquivos locais; não foi uma reprovação do modelo. A tentativa anterior terminou sem painel/auditoria completos e não conta como conclusão.

Em31/10/2026, um checkout separado e as dependências foram restaurados. Os dados sobreviventes foram preservados em cópia privada persistente. Foi reconstruído o controle H26 zero best/swift/1 com hash exatamente igual ao original; balanced4213 zero foi concluído pelo runner nativo e o arquivo balanced4213/calendar completo recuperado passou na validação de integridade. A confirmação global das referências continua pendente.

A rotina recover-h29.py recompõe as referências V22/V24/H26 com os programas originais e exige o hash canônico H26 já publicado antes de iniciar uma nova H29 completa. São79tarefas de runner no plano,28delas H29; tarefas legadas não contam como conclusão H29. Três testes da rotina passaram. Ver RECOVERY.md para evidência, hash esperado, dependências e backups.

O manifesto compilado fresco difere do anterior; não serão combinados checkpoints H29 antigos com a nova tentativa. Modelo, taxas, horários, casos e critérios permanecem inalterados. Ainda faltam completar a recuperação, todos os28braços H29/120dias, duas auditorias completas/comparação e os testes privados finais. Não há aprovação de balanceamento H29.

runtimeEnabled=false; balanceApproved=false; activationReady=false. H26/V22 continuam reprovadas, H28 diagnóstico concluído. PR#30emrascunho, sem merge/ativação. Dados completos/saldos/séries/estados/ledgers privados; monetização desligada.


## H29 — retomada validada das referências (31/10/2026)

Ambiente novamente acessível; processos antigos não estavam ativos. Retomada pelo checkout 4f7a6b0, sem recompilar ou alterar fontes científicas. Dez testes H29/recuperação passaram novamente. V22 (nove tarefas, incluindo dois controles curtos) e V24 (14 braços) foram reconstruídas e passaram nos auditores originais; backups privados confirmados antes da retomada e após essas auditorias. Não confundir referências legadas com validação H29.

Recuperação H26 em andamento, ainda condicionada ao hash canônico original ff510f7ead1d0a136ea53e09decbbe1b8dac09642f4e16c42c0d524a15fa3f91. Painel H29 completo e duas auditorias/adulterações permanecem pendentes. Sem conclusão de benefício ou aprovação de balanceamento. runtimeEnabled=false; balanceApproved=false; activationReady=false. PR30 rascunho, sem merge/ativação, dados completos privados.
