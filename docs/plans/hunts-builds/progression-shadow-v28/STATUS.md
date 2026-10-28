# H28 — diagnóstico concluído; correção de smoke aguardando CI

Em 28/10/2026, as duas recomputações completas terminaram com exit 0 e relatórios JSON integralmente iguais, inclusive SHA-256: 3a9e59cefb4897eeb610488225d101687ad2864666257a4da1ca9d9c160a9fe6. São 14 casos, 120 dias cada, 1.680 dias-conta e 2.779.683 vitórias reprocessadas. Os sete testes H28 e dois testes privados finais passaram. Onze adulterações e ausência de ledger foram rejeitadas; limites inválidos e arquivos ausentes no pool também.

H26 sombra: benefício primário ≥1% em 1/14; oráculo relaxado: 9/14. Ver RESULTS.md para todos os casos, endpoints exatos, censuras e limites de interpretação. Isso não aprova H26 ou o gate adaptativo de torre. Fontes das campanhas congeladas em 0912cf1c; auditor final em 118ce689. Nenhuma campanha foi repetida nesta retomada.

A CI geral do push 40743338134 falhou em smoke-online.mjs após aprovar os testes H28, auditorias e simulações. O teste podia aceitar uma vitória antiga em cache e pausar a luta da fixture antes da recompensa. Corrigido para recarregar o estado e aguardar vitória com recompensa antes de pausar; preservadas asserções de Coins/XP e persistência. Correção ainda aguarda CI, portanto a validação geral não está concluída neste checkpoint.

Próximo passo proposto, após confirmar a CI: implementar o adaptador isolado H29 para reduzir apenas a espera externa pós-vitória, com domínio e transições internas nativos. H29.md é proposta não implementada/não executada.

Dados completos/saldos/séries/estados/ledgers permanecem privados e ignorados. runtimeEnabled=false; balanceApproved=false; activationReady=false. PR #30 em rascunho, sem merge/ativação. Monetização desligada.
