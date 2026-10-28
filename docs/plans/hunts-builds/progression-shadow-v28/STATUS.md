# H28 — auditoria final retomada em 28/10/2026

As 14 campanhas nativas de 120 dias continuam completas, com 1.680 dias-conta e 2.779.683 vitórias. As fontes das campanhas permanecem congeladas em 0912cf1c46e6fd41846cecee4d8295efbb4199ec; nenhuma campanha foi repetida nesta retomada.

O ambiente voltou. Os relatórios das auditorias antigas não estavam disponíveis; não foram contados como validação. Os sete testes H28 passaram novamente (zero falhas).

A auditoria foi ajustada apenas no pós-processamento: até quatro casos em workers isolados, resultados na ordem original e rejeição de lote com qualquer falha. Duas recomputações completas estão em execução. As tentativas sequenciais interrompidas para esse ajuste não contam como conclusão. Ainda faltam confirmar a conclusão, comparar integralmente os relatórios e executar os testes privados de adulteração e falha de worker. Nenhum resultado de benefício está aprovado neste checkpoint.

Dados completos, snapshots, saldos, séries e ledgers continuam privados/ignorados. O protocolo original H28.md, fontes nativas, modelos compilados, parâmetros e critérios permanecem idênticos. CI do runtime congelado aprovada anteriormente; auditor atualizado ainda depende das validações finais.

Próximo: concluir as duas auditorias, comparar os objetos JSON e executar progression-shadow-v28.local-check.mjs. Somente então publicar as conclusões sanitizadas. Sombra mantém a trajetória nativa e não aprova o gate adaptativo de torre. H26/V22 permanecem reprovadas.

runtimeEnabled=false; balanceApproved=false; activationReady=false. PR #30 em rascunho, sem merge/ativação. Monetização desligada.
