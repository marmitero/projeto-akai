# H26 — implementação e execução em três passos

## Passo1 — módulo isolado

Implementada a hipótese prévia ../progression-diagnosis-v25/H26.md, sem ajustar percentuais. Subpath @akai/shared/progression-bonus-v26, sem export no root nem consumidor no jogo. Rb=min(1,R×(1+b)); Cb=C+(1−C)×b; crédito Rb×Cb, com R=min(r²,L²)/L² e C=min(Q,B(L))/Q. Q é do encontro inteiro, inclusive ao cruzar segmentos/níveis. Aritmética BigInt, carry em milionésimos, teto de tempo qualificado e máximo nativos. Guilda/evento/calendário/taxas permanecem os mesmos.

Compilação e typecheck do pacote são verificações deste primeiro passo. Passo2 deve validar invariantes e adapter de laboratório antes de qualquer campanha. Passo3 deve repetir os14pares completos de120dias com controles nativos, mesmos critérios V22/V24 e todos os negativos/censuras. Não declarar os passos seguintes concluídos com cotações ou rodadas curtas.

V22/V23/V24, fontes R6/R7 e controlador preservados. O pacote não concede recursos, equipamentos, proteção ou crédito por derrota/pausa/transição. RuntimeEnabled/balanceApproved/activationReady=false. Publicar apenas resumo de conclusões/testes, sem saldos/séries/snapshots. Economia real/+16–20/monetizaçãooff.

## Passo2 — regras e limites validados

Sete testes matemáticos passaram contra o corpo original de mastery nativo: crédito/carry zero-bônus em189combinações, monotonicidade local, teto por tempo e máximo96dias, penalidade quadrática, oráculo racional independente por segmento com Q inteiro do encontro, carry/coalescência/níveis/teto, inputs inválidos e elegibilidade social. Nove testes do adaptador passaram: matriz exata14casos, controlador nativo completo em dia adquirido, bônus zero dentro da janela elegível, limites12h/18h/semanal/offline, duas janelas com relógio/quota à meia-noite, retomada/digests, onda futura pendente e observador transparente durante bônus ativo. Não extrapolar monotonicidade local para campanha adaptativa.

Adapter V26 usa cópias descartáveis das fontes e o observador V24 congelado, cuja cotação zero-bônus segue nativa; nenhuma alteração em V23/V24. O runner aceita somente os14casos definidos e rejeita argumentos inválidos. Dois smokes de um dia passaram (controle casual4213/00h e candidata casual17/12h). Auditoria V24 --verify continuou passando. Esses smokes não contam como campanhas longitudinais.

Protocolo executável em scripts/economy-v2/progression-panel-v26.mjs. Cada controle será reexecutado por120dias e comparado linha a linha e por estado completo com o arquivo nativo de referência (excluindo apenas provenance de execução V10). Não se reutiliza controle sem reexecução. A auditoria final exige28braços completos, hashes/fontes/configurações idênticos, contabilidade completa e14reproduções nativas. A decomposição reaproveita identidades V25; pré-máximo só quando não há salto de retorno sem fase identificada. O teste privado de adulteração só deve rodar após os28braços, jamais com fixtures substituindo evidência ausente.

## Passo3 — reprodução longitudinal

Fontes/modelo/protocolo/runner/adapter/validador devem ficar congelados antes de iniciar. Para cada caso de CASES_V26, executar ambos os modos:

```sh
node scripts/economy-v2/run-progression-panel-v26.mjs --case=best-swift-1-h00 --mode=zero --days=120
node scripts/economy-v2/run-progression-panel-v26.mjs --case=best-swift-1-h00 --mode=calendar --days=120
```

Repetir os14casos. Checkpoints atômicos em local/; --resume=true exige fontes/parâmetros iguais e valida o checkpoint antes de continuar. Não iniciar duplicatas de sessões ativas nem concluir por arquivos parciais. Depois dos28braços completos:

```sh
node scripts/economy-v2/audit-progression-panel-v26.mjs
node scripts/economy-v2/audit-progression-panel-v26.mjs --verify
node --test scripts/tests/progression-panel-v26.local-check.mjs
```

Publicar somente conclusões agregadas/endpoints/testes. Comparar os14casos com V22 preservando todos os negativos e censuras. Mesmos gates: domínio/andar não menores, máximo/torre observados não atrasados e benefício primário mínimo1% em cada caso. Qualquer falha bloqueia aprovação, mesmo se houver ganhos médios. Não alterar taxas, critérios, controlador ou selecionar casos depois dos resultados. Sem integração/merge/ativação por este ensaio.


## Passo3 — concluído, candidata reprovada

Todos os28braços terminaram120dias (3.360dias-conta),14controles com igualdade integral das120linhas diárias e do estado completo arquivado. Auditoria/--verify e teste privado de dez adulterações/arquivo ausente passaram. Não regressão4/14; benefício mínimo1%2/14; ambos1/14. Resultado pior que V22 em não regressão (7/14). Ver RESULTS.md para todos os14casos, censuras e limites. Sem ajuste de taxas/fórmula após resultados nem ativação. CI completa do código545cffe aprovada (40300901477/40300894664 e Windows/LAN); conclusão documental posterior não altera esse código.
