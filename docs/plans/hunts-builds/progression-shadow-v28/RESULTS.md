# H28 — diagnóstico concluído em 28/10/2026

As 14 campanhas nativas de 120 dias reproduziram integralmente os controles arquivados. Os bancos zero/H26/oráculo foram reexecutados a partir de todas as 2.779.683 vitórias, em 1.680 ledgers diários privados. O experimento está concluído como diagnóstico; nenhuma candidata foi aprovada para o jogo.

## Validação

- Duas execuções completas do mesmo auditor, em processos separados, geraram objetos JSON integralmente iguais. Cada execução reprocessou cada vitória; não é uma implementação matemática independente nem uma segunda simulação do combate.
- Sete testes H28 passaram novamente. O código das campanhas permanece congelado em 0912cf1c46e6fd41846cecee4d8295efbb4199ec. Somente o pós-processador foi ajustado para até quatro workers por auditoria, sem reduzir verificações ou alterar ordem, modelos, parâmetros ou dados.
- A forma de verificação nesta retomada foi recomputação completa em dois processos e comparação integral; não se alega execução da opção CLI --verify.
- Testes privados finais passaram: 11 adulterações e ausência de ledger rejeitadas, com hashes recalculados; limites inválidos e ausência de evidência no pool de workers também rejeitados. Dois testes privados, zero falhas.

## Benefício na trajetória fixa

H26 sombra atingiu benefício primário mínimo de 1% em **1/14** casos. O oráculo relaxado atingiu esse patamar em **9/14**. Os critérios não foram alterados.

| Caso | Métrica primária | H26 sombra | Oráculo | Oráculo ≥1% |
|---|---|---:|---:|:---:|
| best-swift-1-h00 | antecipação do máximo | 0.042312% | 0.720251% | não |
| best-swift-4213-h00 | antecipação do máximo | 0.060372% | 0.847794% | não |
| best-swift-3735928559-h00 | antecipação do máximo | 0.100215% | 0.699898% | não |
| regular-swift-4213-h00 | antecipação do máximo | 0.062469% | 0.936993% | não |
| casual-swift-4213-h00 | domínio em 120 dias (máximo censurado) | 0.070640% | 3.010610% | sim |
| best-balanced-4213-h00 | antecipação do máximo | 1.837673% | 2.945367% | sim |
| best-brute-4213-h00 | antecipação do máximo | 0.765387% | 1.712686% | sim |
| best-swift-17-h00 | antecipação do máximo | 0.071698% | 0.754040% | não |
| best-swift-1337-h00 | antecipação do máximo | 0.416611% | 1.217029% | sim |
| casual-swift-17-h00 | domínio em 120 dias (máximo censurado) | 0.051948% | 2.684015% | sim |
| casual-swift-17-h12 | domínio em 120 dias (máximo censurado) | 0.083372% | 2.684015% | sim |
| casual-swift-17-h20 | domínio em 120 dias (máximo censurado) | 0.070288% | 2.684015% | sim |
| casual-swift-4213-h12 | domínio em 120 dias (máximo censurado) | 0.106838% | 3.010610% | sim |
| casual-swift-4213-h20 | domínio em 120 dias (máximo censurado) | 0.089211% | 3.010610% | sim |

Nos oito casos com máximo nativo observado, a antecipação é calculada com timestamps exatos das vitórias. Nos seis casuais, o máximo permanece censurado e a métrica compara o domínio no mesmo endpoint de 120 dias. Arredondamentos da tabela não decidem o gate: o auditor compara razões inteiras com BigInt.

## Prazos exatos até o máximo

Tempos decorridos desde a criação, em milissegundos. São endpoints; não são séries diárias ou saldos.

| Caso | Nativo (ms) | H26 sombra (ms) | Oráculo (ms) |
|---|---:|---:|---:|
| best-swift-1-h00 | 9237392392 | 9233483872 | 9170860027 |
| best-swift-4213-h00 | 9234792509 | 9229217309 | 9156500464 |
| best-swift-3735928559-h00 | 9207906013 | 9198678265 | 9143460059 |
| regular-swift-4213-h00 | 9330101668 | 9324273220 | 9242679293 |
| best-balanced-4213-h00 | 9622447944 | 9445618845 | 9339031530 |
| best-brute-4213-h00 | 9632651698 | 9558924600 | 9467674642 |
| best-swift-17-h00 | 9211684171 | 9205079593 | 9142224342 |
| best-swift-1337-h00 | 9271392581 | 9232766980 | 9158557082 |

## Decisão e limites

Mesmo o oráculo relaxado fica abaixo de 1% em cinco casos: best-swift-1-h00, best-swift-4213-h00, best-swift-3735928559-h00, regular-swift-4213-h00, best-swift-17-h00. Isso limita apenas intervenções que preservam essa sequência de vitórias, concedem crédito no instante da vitória e não superam seu tempo qualificado. Não é um limite para trajetórias adaptativas diferentes.

A H26 adaptativa continua com os gates anteriores: não regressão 4/14, benefício observado ≥1% em 2/14 e ambos em 1/14. Ganho sombra não reverte essa reprovação. A torre é nativa por construção e sua igualdade neste estudo não aprova o gate adaptativo. Não aumentar taxas, retirar negativos ou mudar critérios para obter aprovação.

Próximo passo proposto: H29, uma hipótese diferente sobre reduzir apenas a espera externa pós-vitória, mantendo domínio e transições internas nativos. Ver H29.md. A proposta ainda não foi implementada ou executada e precisa passar por testes de invariantes, controles e painel adaptativo completo antes de qualquer integração.

## Vínculos de evidência

- Runtime das campanhas: 0912cf1c46e6fd41846cecee4d8295efbb4199ec.
- Auditor e testes privados atualizados: 118ce68930e055e096fcffb57db26eb0d9934e94.
- SHA-256 do relatório privado completo: 3a9e59cefb4897eeb610488225d101687ad2864666257a4da1ca9d9c160a9fe6.
- SHA-256 do auditor: 5ddfe6e832db295d1e69aa96239cf7d63086ba6cfc5fe5ec2ca43faf06887195.
- SHA-256 do protocolo: f30a9d380fd61d2ecb815fab66337f6a528a33327a99934e9f90c6804a4c00fa.
- SHA-256 do painel anterior: ff510f7ead1d0a136ea53e09decbbe1b8dac09642f4e16c42c0d524a15fa3f91.

Snapshots, saldos, séries, estados completos e ledgers permanecem privados e ignorados. Somente conclusões, endpoints e hashes são publicados. runtimeEnabled=false; balanceApproved=false; activationReady=false. PR #30 em rascunho, sem merge/ativação. Monetização desligada.

## Validação geral de CI na retomada

A CI do checkpoint 118ce689 aprovou testes matemáticos/H28, auditorias de economia e simulações, mas o push 40743338134 falhou em smoke-online.mjs: o teste aceitava uma vitória antiga no DOM antes de a luta semeada gerar Coins/XP. A correção recarrega o estado após a fixture e aguarda recompensa e vitória antes de pausar, sem remover as asserções de conteúdo/persistência. A nova CI precisa confirmar a correção; este checkpoint não declara a validação geral concluída. Não há alteração de código do jogo nessa correção.
