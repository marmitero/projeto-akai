# H28 — bancos sombra em trajetória nativa

Implementação do protocolo prévio ../progression-envelope-v27/H28.md. Não é outra fórmula nem consumidor de bônus no jogo. R6/R7, V22/V23/V24/V26, controlador, taxas, calendário e política permanecem congelados.

## Implementação

Quatorze reexecuções nativas de120dias, mesmas seeds/builds/rotinas/janelas V24/H26. Em cada vitória, callback somente de leitura recebe timestamp/Q/atividade/andar/referência/offline e crédito/carry nativos antes/depois. Bancos privados zero/H26/oráculo são integrados separadamente; nenhum alimenta stats, compras, combate, loot, decisões ou RNG.

Zero deve reproduzir cada crédito/carry nativo. H26 usa banco/carry e nível próprios, com benchmark nativo para o mesmo andar/atividade observado e Q inteiro do encontro; calendário global inalterado, evento nunca offline. Oráculo credita1por ms qualificado, até máximo, ignorando penalidades/elegibilidade. É teto diagnóstico, não fórmula para jogo. O máximo só pode ser concedido na vitória observada, com timestamp exato e piso96dias qualificados.

Ledger diário limitado a100.000vitórias, gravado em array JSON comprimido (limite64MiB descomprimido na leitura). Hashes de arquivo/raw e cadeia de prefixos, contagem/ordinal/Q/bancos e testemunho exato de conclusão. Checkpoint atômico somente após gravar o ledger do dia. Uma falha entre ledger e checkpoint permite recalcular e substituir o dia órfão, sem duplicar crédito. Dados completos locais ignorados. Não publicar saldos, séries, snapshots ou ledgers.

Fontes incluem modelo compilado V26, base compilada V22 e manifesto de todos osJS não temporários do runtime shared; também fonte do modelo, factory, observer, banco, runner, validador, referência, protocolo e hipótese. Retomada recusa fontes/parâmetros diferentes. Não recompilar/editar fontes durante a execução. Publicar checkpoint antes das campanhas.

## Validação antes das campanhas

Sete testes passaram: fronteiras12h/18h/semanal/offline; prefixos/carry e hashes; rejeição de timestamps/Q/carry; testemunho exato/censura/piso96dias; transparência com observador desligado durante janela elegível; igualdade com controlador original e retomada JSON numa janela que cruza meia-noite; onda futura pendente e vínculo de fontes compiladas. Ensaio curto do runner casual17/12h de um dia e argumentos inválidos passaram. Isso não substitui os120dias.

A auditoria final exige os14casos completos, contabilidade nativa,120linhas diárias e estado final semanticamente iguais às referências, trace/digests exatamente iguais aos controles H26 e zero-carry igual em cada vitória. Reexecuta todos os bancos a partir de cada ledger, sem reconstruir prefixos por agregados. Auditoria de bancos não é uma segunda simulação independente do combate; a reprodução nativa foi feita pelo runner e vinculada aos estados/traces arquivados.

## Reprodução

```sh
npm run build:shared
node --test scripts/tests/progression-shadow-v28.test.mjs
node scripts/economy-v2/run-progression-shadow-v28.mjs --case=best-swift-1-h00 --days=120
```

Repetir os14casos de CASES_V28. Usar no máximo8processos simultâneos para evitar a pressão de memória observada na H26; registrar sessões. Retomar somente sessões encerradas, com --resume=true e checkpoint/fontes idênticos. Não contar ensaio curto ou processo parcial como resultado.

Depois de todos encerrarem exit0:

```sh
node scripts/economy-v2/audit-progression-shadow-v28.mjs
node scripts/economy-v2/audit-progression-shadow-v28.mjs --verify
node --test scripts/tests/progression-shadow-v28.local-check.mjs
```

O teste privado usa o painel completo e uma cópia isolada do primeiro caso, mantendo os outros disponíveis. Evita repetir desnecessariamente o replay íntegro já executado pela geração/--verify, mas adulterações aceitas teriam os demais casos válidos e falhariam no teste. Cobre modelo/runtime compilado, banco/carry/testemunho, relógio/Q, estado nativo, incompletude e arquivo ausente, inclusive hashes recalculados. Fixtures unitárias não substituem arquivos longitudinais ausentes.

## Leitura dos resultados

Prazo sombra e zero são comparados por timestamps exatos; nos controles censurados, comparar domínio ao final120dias. Diagnóstico da H26 adaptativa também usa timestamp exato quando disponível, mas os gates originais observados H26 permanecem preservados. A torre fica nativa por construção: não aprovar seu gate adaptativo com esse ensaio. Benefício sombra≥1% é somente sinal diagnóstico; não aprova balanceamento, coorte social, playtest ou integração.

runtimeEnabled/balanceApproved/activationReady=false. Sem merge/ativação. Economia real/+16–20/monetizaçãooff.

## Retomada da auditoria em 28/10/2026

As campanhas e suas fontes continuam congeladas em 0912cf1c. O pós-processador foi ajustado para executar até quatro casos em workers isolados por auditoria, com ordem determinística no relatório. Cada lote aguarda todos os workers, inclusive em caso de erro; qualquer rejeição impede a geração de um relatório de sucesso. A função importada mantém execução sequencial por padrão, usada nas adulterações para rejeitar a evidência inválida antes de processar casos posteriores. Nenhuma verificação matemática, fonte de campanha, ledger ou critério foi reduzido.

A retomada usa duas recomputações completas e comparação integral de seus objetos JSON. Isso verifica o relatório independentemente de chamar a opção CLI --verify; registrar a forma efetivamente executada nos resultados. As tentativas anteriores interrompidas para esse ajuste não contam como validações concluídas.

## Encerramento validado

As duas auditorias completas e a comparação integral passaram; sete testes H28 e dois testes privados passaram. A CI completa do código 26e6a3d foi aprovada no push e na PR, incluindo Windows e navegador dev/preview. Uma corrida de sincronização no smoke online foi corrigida sem alterar código do jogo; detalhes, resultados, hashes e links estão em RESULTS.md. Todas as fontes de campanha permanecem idênticas e os processos foram encerrados.

H28 conclui somente o diagnóstico; H26 continua reprovada e os bônus permanecem desligados. H29.md documenta o próximo experimento proposto, ainda não implementado.
