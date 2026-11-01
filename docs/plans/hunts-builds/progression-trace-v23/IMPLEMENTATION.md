# V23 — observador de progressão

Etapa de instrumentação, sem nova fórmula e sem consumidor no jogo. V20/V21/V22, R6/R7, controlador nativo, carteiras e SQL permanecem intactos. A candidata V22 continua reprovada para integração e desligada.

## Medições

O adapter cria cópias descartáveis dos módulos compilados. Os wrappers chamam a função original uma única vez e observam o resultado, sem fornecer entropia alternativa. Âncoras de fonte ausentes ou duplicadas interrompem a montagem. O modo zero usa a mesma fórmula com taxa zero, já equivalente à fonte nativa; calendar mantém exatamente calendário/taxas V22.

Por atividade, online/offline e antes/depois do máximo, mede combate, transições internas/externas, pausa e tempo não classificado. Intervalos são recortados em cada chamada e unidos para não contar de novo as transições que atravessam requests. A soma reconcilia com o relógio nativo; saltos de retorno offline e tempo de evento são separados. Tempo de combate observado inclui derrotas e encontros abandonados; tempo qualificado é registrado apenas em vitórias. Não confundir essas medidas.

Para cada vitória, registra crédito real e uma cotação sem bônus no mesmo estado. A diferença é ganho direto por encontro, não ganho causal da campanha. Decompõe o crédito base em perda de referência, perda adicional de benchmark e truncamento no máximo, nessa ordem; a atribuição é dependente da ordem e não prova causalidade. O relógio continua sendo o original. O instante exato da vitória que alcança o máximo e os eventos anteriores/posteriores também são medidos, sem substituir os marcos observados em blocos de5min das referências.

Conta compras por tipo/atributo, recursos debitados/creditados nas ações, necessidades de material e mudanças de atividade. RNG observa categoria, entrada e saída do draw nativo: combate/refino/drop/raridade/base/qualidade/proteção. Apenas digests diários dos draws, ações e decisões são guardados, sem registrar cada sorteio. O observador não consome RNG. Contadores/digests são separados do estado da campanha e retomados somente em fronteiras diárias.

## Validação prévia ao diagnóstico

Reexecutar o caso negativo best/swift/seed3735928559 por 120 dias, sem bônus e com V22. Cada linha diária deve ser exatamente igual à referência correspondente; o estado semântico completo final também, incluindo RNG, itens, compras, contabilidade e cursor de combate. Somente version/provenance/v22 (metadados do executor) são excluídos da comparação. Falta de referência ou hash divergente interrompe a execução.

Checkpoints locais são atômicos e vinculam fontes nativas, modelo, observador, factory, executor e referência. Contêm estado completo e ficam ignorados. Um teste compara estados em requests parciais, interrupção de encontro, comando inválido e offline. Outro compara observação ligada/desligada e retomada de observador, exigindo igualdade completa de estado e digests. Testes de classificação/contabilidade rejeitam sobreposição e corrupção.

Reprodução: `npm run build:shared`; `node --test scripts/tests/progression-trace-v23.test.mjs`; `node scripts/economy-v2/trace-progression-campaign-v23.mjs --mode=zero --days=120`; a mesma execução com `--mode=calendar`. Para retomada, acrescentar `--resume=true`, preservando fontes e parâmetros. Depois das duas execuções completas: `node scripts/economy-v2/audit-progression-trace-v23.mjs` e novamente com `--verify`; `node --test scripts/tests/progression-trace-v23.local-check.mjs`. A auditoria exige os120dias completos, hash do trace, fontes, referência, crédito e compras conciliados. Sua identidade temporal soma perdas/transições/eventos menos crédito extra por encontro; é uma decomposição contábil de trajetórias diferentes, não uma intervenção causal isolada. As referências V22 completas do caso negativo precisam estar presentes localmente; não substituir por fixtures ausentes. Casos curtos não autorizam conclusão sobre 120 dias.

Somente código, documentação e resumo das conclusões são públicos. Saldos, séries diárias, checkpoints e traces completos ficam em local/, ignorado. A CI executa os cinco testes do observador, não as duas campanhas de 120 dias.

Próximo após o diagnóstico: ampliar seeds/janelas e definir outra candidata com critérios prévios. Não recalibrar a fórmula nesta etapa nem promover um resultado parcial a aprovação. Economia real/+16–20/monetização off.
