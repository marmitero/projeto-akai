# V24 — painel ampliado: resultados

A ampliação está concluída no laboratório local. A integridade passou; a candidata V22 continua reprovada para integração. Nenhum bônus foi ativado no jogo. Fórmula, taxas e critérios permaneceram congelados.

## Cobertura e conclusão

Foram acrescentados sete pares controle nativo/candidata, com 14 braços completos de 120 dias (1.680 dias-conta novos). Os sete pares V22 anteriores foram preservados e reauditados, inclusive a seed negativa 3735928559. O conjunto tem 14 pares, cinco seeds (1,17,1337,4213,3735928559), três builds e três rotinas. A rotina casual cruza horários de primeira sessão 00h/12h/20h Brasília com seeds17/4213; não é um cruzamento completo de todas as dimensões nem amostra populacional.

| Critério previamente fixado | Herdados | Novos | Total |
| --- | ---: | ---: | ---: |
| Integridade |7/7|7/7|14/14|
| Não regressão por caso |6/7|1/7|7/14|
| Benefício primário mínimo de 1% |2/7|0/7|2/14|

Não regressão exige domínio e andar finais não menores, além de não atrasar máximo/torre1000 quando observados no controle. Benefício primário usa redução do tempo até o máximo quando o controle o alcança; caso contrário, aumento relativo do domínio final. Censuras continuam censuras. Integridade aprovada não equivale a balanceamento aprovado.

## Sete pares novos

Todos usam build swift. Setas indicam controle → candidata. Dias são desde a criação; arredondamento apenas nesta apresentação. Nível/andar são endpoints, não saldos nem séries diárias.

| Rotina / seed / hora | Nível final | Andar final | Máximo (dias) | Torre1000 (dias) | Benefício primário | Não regressão |
| --- | --- | --- | --- | --- | ---: | --- |
| best /17/00h |1000 →1000|1000 →1000|106,618056 →106,763889|101,937500 →104,045139|−0,1368%|Falhou|
| best /1337/00h |1000 →1000|1000 →1000|107,309028 →106,809028|105,093866 →103,815972|+0,4659%|Passou|
| casual /17/00h |731 →732|743 →737|Não observado em ambos|Não observado em ambos|+0,1985%|Falhou|
| casual /17/12h |731 →732|743 →739|Não observado em ambos|Não observado em ambos|+0,3339%|Falhou|
| casual /17/20h |731 →733|743 →740|Não observado em ambos|Não observado em ambos|+0,5284%|Falhou|
| casual /4213/12h |731 →732|741 →739|Não observado em ambos|Não observado em ambos|+0,4192%|Falhou|
| casual /4213/20h |731 →730|741 →736|Não observado em ambos|Não observado em ambos|−0,1782%|Falhou|

A seed17 em rotina contínua atrasou o máximo em3h30min e a torre em aproximadamente2,108dias. Entre casuais, maior domínio final não assegurou maior andar; seed4213/20h perdeu ambos. Não atribuir essas diferenças isoladamente a uma compra, sorteio ou ao evento diário.

## Sensibilidade das janelas casuais

Cada janela contém duas seeds, incluindo o caso00h/4213 herdado.

| Primeira sessão | Não regressão | Benefício ≥1% | Ganho primário seed17 | Ganho primário seed4213 |
| --- | ---: | ---: | ---: | ---: |
|00h|1/2|0/2|+0,1985%|+0,3488%|
|12h|0/2|0/2|+0,3339%|+0,4192%|
|20h|0/2|0/2|+0,5284%|−0,1782%|

Horário desloca criação/primeira sessão e ciclos de24h. Casual tem2h online,8h offline e14h de pausa por ciclo; o perfil20h cruza a meia-noite no offline. O calendário global de guilda/evento permanece fixo, logo a idade da conta no corte semanal muda. Estes são perfis de calendário, não uma intervenção causal isolada no evento12–18h. O evento nunca vale offline. Vínculo/rank continuam hipotéticos; não houve coorte social nem playtest humano.

## Validação

- Auditoria completa e repetição com --verify passaram, exigindo os14braços novos completos e reauditando os sete pares herdados. Fontes, hashes, endpoints, tempo, quotas, itens, domínio, carry, stats e contabilidade foram conciliados; tempo não classificado zero.
- O teste local do painel passou: igualdade da auditoria após cópia/round-trip JSON; rejeição de oito adulterações (fonte, horário, relógio, carteira, quota, endpoint, incompletude e tempo do trace) e de braço ausente. Hashes das adulterações foram recalculados para testar a validação sem depender apenas do digest.
- Sete testes V24 passaram localmente e na CI: controle nativo, limites de horário, offline sem evento, corte semanal, meia-noite/quota, igualdade com observador ligado/desligado, retomada e classificação da onda futura pendente. Fontes V23 e nativas permanecem congeladas.
- Controle anterior à elegibilidade:19prefixos diários em três perfis conservaram igualdade integral de linhas e digests de sorteios/ações/decisões entre controle e candidata.
- CI completa do código ada562d080ce7c4819f5c09b1a6650e0ec21c2f8 passou nas execuções40262379860 e40262375705:431testes/49arquivos, auditorias e regressões dev/preview, mais5testes V23,7V24 e2de calendário. Windows/LAN passou no mesmo SHA. A CI curta não reexecuta as campanhas de120dias.
- Uma falha anterior do smoke semanal na virada de dia/semana foi reproduzida e corrigida na fixture, fixando apenas Date do navegador em horário estável. As regras nativas e os14braços não mudaram; os dois testes de calendário preservam a concessão estável e a expiração correta na virada.

Código/protocolo foram publicados antes da conclusão longitudinal (checkpoints4f5074e/d1f811b); a correção da fixture foi publicada emada562d. Dados completos, snapshots, checkpoints e séries permanecem locais ignorados. Este resumo não substitui replay integral. Reprodução: [PROTOCOL.md](PROTOCOL.md).

## Próximo passo

Definir previamente uma nova hipótese de recalibração que considere a interação entre domínio, decisões adaptativas de atividade/compras e RNG. Usar a instrumentação V23/V24 para decompor os novos casos negativos, escolher a intervenção antes de rodar resultados e repetir o painel fixo completo com controles nativos e os mesmos critérios; preservar todos os negativos e censuras. Não ajustar taxas com base só nos casos favoráveis nem integrar consumidor autoritativo antes de passar os gates.

runtimeEnabled=false; balanceApproved=false; activationReady=false. Economia real, +16–20 e monetização permanecem desligados.
