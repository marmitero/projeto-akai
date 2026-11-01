# H28 — concluído e validado em 28/10/2026

- 14 controles nativos completos de 120 dias: 1.680 dias-conta, 1.680 ledgers privados e 2.779.683 vitórias.
- Estados/campanhas/traces nativos integralmente reproduzidos. Bancos zero/H26/oráculo reexecutados por vitória em duas auditorias completas; objetos JSON e SHA-256 integralmente iguais: 3a9e59cefb4897eeb610488225d101687ad2864666257a4da1ca9d9c160a9fe6.
- Sete testes H28 e dois testes privados finais passaram. Rejeitadas 11 adulterações, ledger ausente, limites inválidos e evidência ausente no pool de workers, inclusive hashes recalculados.
- CI completa do código 26e6a3d aprovada: Project checks push 40746443363 e PR 40746452497; Windows push 40746443278 e PR 40746452474. Suíte principal: 431 testes/49 arquivos; também passaram Node, auditorias/simulações e navegador em dev/preview.

A falha de sincronização do smoke online no checkpoint anterior foi corrigida: recarga após a fixture e espera por recompensa/vitória antes da pausa. O smoke passou nas quatro combinações dev/preview × push/PR. Nenhum código do jogo mudou nessa correção. Ver RESULTS.md para links e histórico verificável.

H26 sombra atingiu benefício primário mínimo de 1% em 1/14; o oráculo relaxado, em 9/14. Isso é diagnóstico em trajetória fixa e não aprova H26 ou o gate adaptativo de torre. Todos os negativos e censuras estão em RESULTS.md. Fontes das campanhas congeladas em 0912cf1c; auditor final em 118ce689; correção do smoke/CI em 26e6a3d. Hashes das fontes reconferidos após a correção e limpeza, sem mudanças. Nenhuma campanha foi repetida nesta retomada; processos encerrados, sem auditoria pendente.

Próximo passo: implementar o adaptador isolado H29 para reduzir somente a espera externa pós-vitória, mantendo domínio e transições internas nativos. Primeiro validar equivalência com bônus zero e invariantes temporais; depois executar o painel adaptativo completo de 14 pares/120 dias com os mesmos critérios. H29.md permanece proposta não implementada/não executada.

Este encerramento é documental; a CI acima valida o código 26e6a3d, não presume conclusão dos workflows de um commit documental posterior. Dados completos/saldos/séries/estados/ledgers permanecem privados e ignorados. runtimeEnabled=false; balanceApproved=false; activationReady=false. PR #30 em rascunho, sem merge/ativação. Monetização desligada.
