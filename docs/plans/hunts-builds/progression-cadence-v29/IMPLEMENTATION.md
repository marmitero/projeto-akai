# H29 — implementação isolada e validação

Implementa a proposta histórica em ../progression-shadow-v28/H29.md e os detalhes operacionais de PROTOCOL.md. Não há consumidor de jogo, API, SQL ou wallet H29. Fontes R6/R7, controlador, modelos anteriores e critérios preservados.

## Código

- progression-cadence-v29.mjs: integração racional BigInt da espera, ledger de agendamento/consumo/cancelamento, prefixos de crédito/carry nativo, hashes e validação.
- progression-adapter-v29.mjs: cópias temporárias do kernel, offline, controlador e observador. O único ajuste físico é o nextAt externo após vitória completa. O corpo de mastery é nativo; não há H26 acumulada. O observador corrige a geometria do tempo externo para a duração real, mantendo os campos/identidades V24.
- progression-sources-v29.mjs: fontes e manifesto dos JS compilados do runtime, além do modelo H29 executável ESM, protocolo e hipótese histórica. Nenhum build do shared é necessário para o modelo novo e não se deve recompilar durante o painel.
- run-progression-cadence-v29.mjs: um braço adquirido, checkpoints diários atômicos e ledgers privados; todos os controles devem reproduzir cada linha diária, estado completo e trace H26 zero.
- audit-progression-cadence-v29.mjs: revalida H26, exige os 28 braços completos e reexecuta cada evento dos ledgers, incluindo cotação nativa de crédito/carry. Recalcula gates originais. Até quatro workers isolados por auditoria; aguarda o encerramento dos workers, inclusive em caso de erro, e nunca aceita relatório parcial.

## Validação anterior ao painel

Sete testes passaram: oráculo racional independente por milissegundo nas fronteiras de evento/guilda e ranks; ciclo de vida/hashes/dados inválidos; bônus zero com estado nativo integral em orçamentos parciais; igualdade até a primeira vitória, ausência de recurso/domínio durante espera e preservação dos 6000ms internos; cancelamentos nativos em offline/pausa/seleção; campanha nativa integral; transparência e retomada diária JSON com quota/meia-noite; derrota e timeout sem desconto e vínculos de fontes executadas. O teste de derrota/timeout foi ampliado para exercitar explicitamente ambos e passou novamente. Conjunto incluído na CI.

Runner: controle casual17/12h de um dia e retomada real do checkpoint ao segundo dia passaram, com igualdade de linhas/digests às referências. Ensaio calendário de um dia e replay integral de seu ledger (3508 eventos) passaram. CLI inválida e retomada com factoryHash alterado foram rejeitados. São ensaios curtos, sem conclusão longitudinal.

## Execução e auditoria

```sh
node --test scripts/tests/progression-cadence-v29.test.mjs
node scripts/economy-v2/run-progression-cadence-v29.mjs --case=best-swift-1-h00 --mode=zero --days=120
node scripts/economy-v2/run-progression-cadence-v29.mjs --case=best-swift-1-h00 --mode=calendar --days=120
```

Repetir os 14 casos de CASES_V29; no máximo oito campanhas simultâneas. Publicar o checkpoint com as fontes/protocolo antes de iniciar. Não alterar fontes, parâmetros, critérios ou negativos para obter aprovação. Registrar IDs/logs das sessões em local/execution-sessions.json; retomar somente processos encerrados com checkpoint e --resume=true. Um dia órfão sem checkpoint será recalculado e substituído, sem duplicar crédito.

Após todos os 28 braços terminarem exit0:

```sh
node scripts/economy-v2/audit-progression-cadence-v29.mjs
node scripts/economy-v2/audit-progression-cadence-v29.mjs --verify
node --test scripts/tests/progression-cadence-v29.local-check.mjs
```

Alternativamente, duas recomputações completas do mesmo auditor em processos separados, seguidas de comparação integral dos JSON, verificam o mesmo relatório. Registrar a forma realmente executada, sem alegar --verify se não foi chamado. Testes privados preparados para 13 adulterações (incluindo espera calendário com controle completo válido), ledger ausente e limites/falha de workers. Ainda não passaram: precisam do painel completo e validado.

Dados completos/saldos/séries/estados/ledgers ficam em local/ ignorado. Publicar apenas conclusões, endpoints e hashes. Não aprovar por potencial de tempo economizado no agendamento: parte das esperas é cancelada e trajetórias adaptativas podem piorar. H26/V22 continuam reprovadas. runtimeEnabled/balanceApproved/activationReady=false; sem merge/ativação. Monetização desligada.
