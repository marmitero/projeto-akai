# H26 — três passos concluídos; candidata reprovada

Os três passos autorizados foram concluídos separadamente. A implementação e sua integridade técnica passaram. A H26 não passou no balanceamento longitudinal e permanece desligada. Nenhuma fórmula/taxa foi alterada após observar os resultados.

## 1. Implementação isolada

Commit d922a7f5cf54192c8ba88c32d1ef82ab7ac4c4de: subpath @akai/shared/progression-bonus-v26, sem export no root ou consumidor no jogo. Fórmula exatamente como a hipótese prévia: Rb=min(1,R×(1+b)); Cb=C+(1−C)×b; taxa=Rb×Cb. BigInt/carry, taxas sociais e teto por tempo qualificado preservados. Build/typecheck do pacote passaram.

## 2. Regras e limites

Commit545cffe1de69668df75222d9964daefbcb612dc5: sete testes matemáticos e nove testes do adaptador passaram localmente e na CI. Incluem189combinações zero-bônus contra o corpo nativo original, oráculo racional independente, carry, níveis, teto, monotonicidade local, penalidade de referência, dados inválidos, elegibilidade, janelas12h/18h/semanal, offline sem evento, meia-noite/quota, observador transparente e retomada. Dois smokes de um dia, argumentos inválidos e auditoria V24 --verify passaram; não substituem os120dias.

CI completa desse mesmo código aprovada nas execuções [40300901477](https://github.com/marmitero/projeto-akai/actions/runs/40300901477) e [40300894664](https://github.com/marmitero/projeto-akai/actions/runs/40300894664):431testes/49arquivos, os16novos testes Node H26, auditorias, regressões dev/preview e Windows/LAN. Campanhas completas e testes privados de corrupção foram locais; a CI não reexecutou3.360dias-conta.

## 3. Painel longitudinal completo

14pares,28braços novos de120dias,3.360dias-conta. Todos os14controles foram reexecutados e reproduziram integralmente suas120linhas diárias e o estado semântico final arquivado; excluído apenas provenance de execução da referência V10. Nenhum controle foi presumido equivalente só por endpoint. Matriz exata V24, cinco seeds, três builds/rotinas e casual00h/12h/20h com17/4213; todos os casos negativos preservados.

Três processos inicialmente encerrados137 sob pressão de memória e17pausados foram retomados com checkpoints/fontes idênticos ou reiniciados quando não havia checkpoint. O paralelismo foi reduzido para8. Todos os28terminaram com exit0; interrupções e ensaios parciais não contam como resultado. Controles e validação diária/final confirmaram a integridade das retomadas.

| Critério previamente fixado | V22 no painel14pares | H26 |
| --- | ---: | ---: |
|Integridade|14/14|14/14|
|Não regressão|7/14|4/14|
|Benefício primário mínimo1%|2/14|2/14|
|Ambos os critérios de benefício/não regressão|2/14|1/14|

Não regressão exige domínio/andar finais não menores e nenhum atraso em máximo/torre1000 observado no controle. O benefício primário é redução do prazo até máximo quando o controle o alcança, ou aumento relativo de domínio final quando censurado. Os gates são separados; um ganho de1% não aprova um caso cujo andar/torre piorou. Null permanece censura.

### Todos os14casos

Setas: controle nativo → H26. Dias são desde a criação; valores apresentados arredondados. — significa não observado até120dias, nunca zero ou prazo futuro estimado.

| Rotina/build/seed/hora | Nível | Andar | Máximo (dias) | Torre1000 (dias) | Benefício primário | Não regressão |
| --- | --- | --- | --- | --- | ---: | --- |
|best/swift/1/00h|1000 →1000|1000 →1000|106,916667 →106,472222|104,951389 →105,052199|+0,4157%|Falhou|
|best/swift/4213/00h|1000 →1000|1000 →1000|106,885417 →106,427083|105,961921 →106,010417|+0,4288%|Falhou|
|best/swift/3735928559/00h|1000 →1000|1000 →1000|106,576389 →106,572917|104,649306 →105,139005|+0,0033%|Falhou|
|regular/swift/4213/00h|1000 →1000|1000 →1000|108,000000 →107,225694|109,513889 →105,066088|+0,7169%|Passou|
|casual/swift/4213/00h|731 →731|741 →739|— →—|— →—|+0,1802%|Falhou|
|best/balanced/4213/00h|1000 →1000|1000 →959|111,371528 →109,565972|116,416667 →—|+1,6212%|Falhou|
|best/brute/4213/00h|1000 →1000|979 →1000|111,489583 →110,125000|— →117,861111|+1,2240%|Passou|
|best/swift/17/00h|1000 →1000|1000 →1000|106,618056 →106,701389|101,937500 →104,760417|-0,0782%|Falhou|
|best/swift/1337/00h|1000 →1000|1000 →1000|107,309028 →106,687500|105,093866 →103,951389|+0,5792%|Passou|
|casual/swift/17/00h|731 →732|743 →737|— →—|— →—|+0,1869%|Falhou|
|casual/swift/17/12h|731 →733|743 →741|— →—|— →—|+0,6126%|Falhou|
|casual/swift/17/20h|731 →733|743 →740|— →—|— →—|+0,5438%|Falhou|
|casual/swift/4213/12h|731 →733|741 →745|— →—|— →—|+0,8527%|Passou|
|casual/swift/4213/20h|731 →729|741 →736|— →—|— →—|-0,4048%|Falhou|

### Janelas casuais

| Primeira sessão | Não regressão H26 | Benefício≥1% |
| --- | ---: | ---: |
|00h|0/2|0/2|
|12h|1/2|0/2|
|20h|0/2|0/2|

Horário desloca criação e ciclos de24h, mantendo o calendário global; idade da conta no corte da guilda também muda. São perfis de calendário, não intervenção causal isolada no evento. Guilda/rank seguem hipotéticos; não houve população social acoplada, vínculos adquiridos ou playtest humano.

## O que impediu a aprovação

- Balanced4213 ganhou1,6212% no prazo até máximo, mas terminou no andar959 contra1000 e não alcançou a torre1000 em120dias. É um dos dois benefícios primários≥1%, mas falhou em não regressão. Só brute4213 passou em ambos os critérios.
- Swift1 e4213 em rotina contínua chegaram mais cedo ao máximo, mas atrasaram torre1000. O caso3735928559 também continuou reprovado por torre, mesmo com máximo ligeiramente antecipado.
- Swift17 contínuo atrasou o máximo exato em7.049.663ms (1h57min29,663s); diferença contábil: mais transições externas e perda de referência, parcialmente compensadas por crédito extra e menos pausas. Não é prova causal isolada de uma compra ou sorteio.
- Casual4213/20h terminou no nível729/andar736, contra731/741. Perdeu domínio equivalente a15.042.967ms (4h10min42,967s), com6h adicionais de salto até retorno offline no balanço de tempo. Isso não é estimativa de atraso para alcançar o máximo censurado.
- A fórmula respeitou as invariantes locais, mas isso não assegurou progresso global monotônico ao alterar trajetórias adaptativas de combate, compras e RNG. H26 teve menos casos sem regressão que V22; não selecionar só os favoráveis nem ajustar taxas para esconder isso.

## Auditoria final

Geração e --verify passaram, reauditaram o painel anterior, exigiram28braços completos e compararam cada controle ao estado nativo completo. Fontes/configurações, hashes, schema, relógio, tempo exclusivo, quota offline, domínio/carry, stats/itens, proteção e contabilidade foram conciliados; tempo não classificado zero. As identidades de tempo/crédito fecharam. Decomposição até máximo só é emitida quando não há salto de retorno sem localização de fase; não há atribuição arbitrária de saltos antes/depois do máximo.

O teste local completo passou: round-trip JSON e reprodução do relatório após cópia dos28braços; rejeição de10adulterações (fonte, horário, relógio, carteira, quota, endpoint, incompletude, tempo do trace, declaração de replay e campo do estado nativo) e arquivo ausente. Hashes foram recalculados nas adulterações para exercitar as verificações internas. Diagnóstico é contabilidade de trajetórias distintas, não identificação causal independente nem replay de uma campanha H26 anterior inexistente.

Fontes/modelo/adapter/runner/protocolo/validador permaneceram congelados no commit545cffe durante todo o experimento. V22/V23/V24/R6/R7/controlador preservados. A conclusão acrescenta documentação sobre esse código validado. Dados completos, saldos, séries e snapshots permanecem em local/, ignorado. Reprodução em [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Decisão e próximo trabalho

H26 reprovada para integração; não promover sobre V22 nem integrar consumidor autoritativo. Antes de outra fórmula, rever o desenho do bônus e medir seu limite de benefício sobre uma trajetória fixa separadamente do efeito adaptativo. Os resultados não justificam apenas aumentar percentuais ou mudar o critério após o teste. Qualquer nova intervenção deve ser pré-definida, preservar estes negativos e repetir os mesmos gates; coortes sociais e playtest continuam posteriores.

runtimeEnabled=false; balanceApproved=false; activationReady=false. PR30rascunho, sem merge/ativação. Economia real/+16–20/monetizaçãooff.
