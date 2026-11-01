# V24 — ampliação prévia de seeds e horários

Protocolo definido antes dos novos resultados. Fórmula/taxas V22 e artefatos V23 congelados; observador V24 estende a classificação para início de onda pendente após esgotar o orçamento de processamento (3s antes do combate futuro), com teste de igualdade nativa; sem consumidor no jogo, alteração de R6/R7, carteira, SQL, API ou RNG. RuntimeEnabled/balanceApproved/activationReady=false.

## Matriz

Preservar os sete pares V22 já auditados (incluindo best/swift/3735928559 negativo). Acrescentar sete pares, cada um com controle nativo sem bônus e candidata V22, ambos do zero por120dias:

| Rotina / build | Seed | Primeira sessão (Brasília) | Online / offline por ciclo |
| --- | ---: | --- | --- |
| best / swift |17|00h|24h /0h|
| best / swift |1337|00h|24h /0h|
| casual / swift |17|00h|2h /8h|
| casual / swift |17|12h|2h /8h|
| casual / swift |17|20h|2h /8h|
| casual / swift |4213|12h|2h /8h|
| casual / swift |4213|20h|2h /8h|

Total planejado:14pares (sete herdados e sete novos), cinco seeds, três builds e três rotinas no conjunto; horários00h/12h/20h cruzados com duas seeds na rotina casual, incluindo o caso00h/4213 herdado. Não é um cruzamento completo de todas as builds/rotinas/seeds nem amostra aleatória da população.

## Semântica do horário

O perfil define a hora de criação/primeira sessão em19/10/2026 e ciclos de24h desde essa criação. Cada braço recebe exatamente120ciclos, sem adicionar espera fictícia para alinhar à meia-noite. Casual online12h–14h sobrepõe o evento diário;00h–02h e20h–22h não. Offline vem imediatamente após a sessão, por até8h com quota e build congelada nativas;20h cruza a meia-noite civil. O restante do ciclo é pausa/ausência nativa. Evento global nunca vale offline.

A data global hipotética do bônus de guilda permanece26/10/2026 00h Brasília para todos os braços, e o evento global permanece12h–18h. Logo, criação deslocada altera a idade no corte semanal; isso é um perfil de calendário, não uma intervenção isolada apenas no evento. Comparar bônus e controle sempre dentro do mesmo perfil/seed. Datas/quotas/eventos sociais usam funções nativas. Vínculo/rank continuam hipotéticos.

## Critérios e controles

Mantidos antes de observar dados: domínio e andar final não menores, nenhum atraso em máximo/torre1000 já observado no controle; benefício primário experimental mínimo1% por caso. Null continua censura. Não excluir seed negativa, ajustar critérios/percentuais após resultados nem agregar censuras como sucessos. Fórmula atual já falhou no painel anterior; esta etapa mede abrangência e sensibilidade, não promove sua aprovação.

O braço zero concede domínio com o corpo original de mastery R6, não com a fórmula V22. A candidata usa V22. Só cópias descartáveis do controlador recebem START deslocado; o calendário global não se desloca. Registrar hash do controlador nativo e da cópia deslocada, modelo, observador, factory, runner, validador e protocolo. Os arquivos V10/V20/V22/V23 não são modificados.

Verificar igualdade com controle nativo em offset0, limites12h/18h, offline sem global, corte semanal, relógio/quota ao cruzar meia-noite, observador ligado/desligado e retomada. Auditoria final exige todos os14braços novos completos, saldos/tempo/itens/stats/carry e fontes conciliados, e reaudita os sete pares herdados. Rodadas curtas não contam para resultados longitudinais.

## Reprodução e publicação

`npm run build:shared`; `node --test scripts/tests/progression-panel-v24.test.mjs`; `node scripts/economy-v2/run-progression-panel-v24.mjs --case=casual-swift-17-h12 --mode=zero --days=120`, e o mesmo caso com --mode=calendar (repetir os sete casos). Acrescentar --resume=true apenas com checkpoint/fontes/parâmetros idênticos. Após os14braços completos: `node scripts/economy-v2/audit-progression-panel-v24.mjs` e a mesma auditoria com `--verify`; `node --test scripts/tests/progression-panel-v24.local-check.mjs`. As sete referências herdadas precisam estar disponíveis e válidas, conforme ../progression-bonus-v22/IMPLEMENTATION.md. Dados completos e checkpoints ficam em local/, ignorado; publicar somente código, protocolo e resumo de conclusões, sem saldos ou séries diárias. CI testa o adapter e a contabilidade em casos curtos; não reexecuta o painel de120dias.

Depois: avaliar sensibilidade por perfil sem inferência causal isolada nem aprovação populacional; só então definir outra candidata. Economia real/+16–20/monetização off.

## Determinismo da validação de navegador

Durante a CI, o smoke de prévia econômica encontrou a virada de dia/semana usando Date.now real: a presença expirou antes do marco semanal e o assert de5pergaminhos falhou. A outra rodada do mesmo SHA passou fora desse intervalo. A fixture do smoke agora fixa apenas o relógio Date do navegador em19/10/2026 12h Brasília, preservando timers. Dois testes nativos reproduzem a concessão inalterada em horário estável e a expiração correta perto da virada. As regras e o calendário nativos não foram modificados; os14braços V24 usam horários explícitos e permanecem intactos.
