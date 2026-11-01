# V25 — diagnóstico dos novos casos e próxima hipótese

Diagnóstico concluído em26/10/2026. Todas as sete comparações novas V24 foram lidas e validadas novamente, incluindo o contraste positivo1337; seis falharam em não regressão. Nenhuma campanha foi alterada, nenhum bônus foi ativado e nenhuma nova candidata foi declarada aprovada.

## O que a instrumentação demonstrou

As identidades inteiras de tempo/crédito fecharam nos14braços. Para rotinas contínuas, comparar até o instante exato do máximo, com crédito final igual nos dois braços. Para casuais censurados, comparar os mesmos120dias: diferença de crédito é o oposto da diferença líquida de tempo sem crédito. Não converter isso em prazo estimado para alcançar o máximo.

| Perfil swift | Horizonte do diagnóstico | Diferença líquida, candidata menos controle (horas) | Leitura |
| --- | --- | ---: | --- |
|best/17/00h|Até máximo exato|+3,514682|Atraso de3h30min52,855s|
|best/1337/00h|Até máximo exato|−11,995785|Antecipação de11h59min44,827s|
|casual/17/00h|120dias|−2,051778|Mais domínio, mas andar final menor|
|casual/17/12h|120dias|−3,452477|Mais domínio, mas andar final menor|
|casual/17/20h|120dias|−5,463251|Mais domínio, mas andar final menor|
|casual/4213/12h|120dias|−4,327127|Mais domínio, mas andar final menor|
|casual/4213/20h|120dias|+1,839053|Menos domínio e andar menor|

Valores negativos compensam perdas; positivos as aumentam. A unidade é tempo equivalente de domínio, não moeda, receita ou duração causalmente economizada.

## Dois mecanismos contábeis diferentes

| Componente (diferença em horas) | best17 até máximo | casual4213/20h em120dias |
| --- | ---: | ---: |
|Encontros sem crédito de vitória|+1,184161|−1,545565|
|Transições externas|−0,067664|+9,214988|
|Pausas dentro do avanço nativo|+4,613887|−9,194497|
|Salto de relógio até retorno offline, fora do avanço|0|+6,000000|
|Perda de referência|−0,025154|−0,161630|
|Perda adicional de benchmark|+1,133566|−0,642007|
|Truncamento no máximo|+0,002999|0|
|Crédito extra bruto no mesmo encontro|−3,327113|−1,832237|
|Eventos|0|0|
|**Saldo**|**+3,514682**|**+1,839053**|

No best17, transições externas diminuíram: reduzir esse componente isoladamente não explica sua regressão. No contraste positivo best1337, elas cresceram cerca de7,590h e mesmo assim houve antecipação do máximo. Já no casual4213/20h, ignorar o salto de retorno de6h produziria uma conclusão errada. Esse salto é tempo fora de advanceRunV6, conciliado por farm/finish offline; a observação agregada não identifica sozinha qual derrota, pausa ou retorno o originou.

Nenhum componente isolado explica todos os casos. Maior crédito local por vitória não garante maior domínio acumulado ou melhor andar após decisões adaptativas. Diferenças de compras, ações, sorteios e decisões foram contadas para o horizonte completo, sem publicação de saldos/séries e sem tratá-las como efeitos causais isolados.

## Primeiras divergências observadas por dia

| Perfil | Domínio | Andar | Digest de sorteios | Digest de ações | Digest de decisões |
| --- | ---: | ---: | ---: | ---: | ---: |
|best17/00h|1|2|1|1|1|
|best1337/00h|1|1|1|1|1|
|casual17/00h|8|9|9|9|8|
|casual17/12h|1|2|1|1|1|
|casual17/20h|7|11|8|8|8|
|casual4213/12h|1|3|1|1|1|
|casual4213/20h|7|9|9|9|8|

Perfis20h começam mais velhos no corte global da guilda e podem divergir no ciclo7, antes dos digests do ciclo8/9. Digests distintos não demonstram erro do RNG nem consumo pelo observador. São comparações diárias, não timestamps exatos da primeira ação causal.

## Implementação e validação

Novo leitor scripts/economy-v2/progression-diagnosis-v25.mjs: reexecuta a auditoria completa V24/V22, vincula os bytes efetivamente lidos aos hashes auditados e decompõe atividades online/offline, perdas, eventos, pausas e saltos de retorno. O cálculo até máximo recusa saltos sem localização de fase; não os atribui arbitrariamente antes/depois do máximo. O leitor não importa um writer nem altera estados.

Cinco testes unitários passaram: identidades calculadas à mão; retorno offline; recorte pré/pós-máximo e censura; diferenças de tempo versus crédito; corrupção de contadores; primeiras divergências independentes e round-trip JSON. O teste local completo passou após normalizar a expectativa de zero com sinal na asserção: reproduz os sete pares e rejeita remoção do salto de retorno, fonte adulterada, carteira adulterada, braço incompleto e arquivo ausente, inclusive com hashes recalculados. Geração e --verify do diagnóstico passaram. O novo conjunto de cinco testes foi incluído na CI; não confundir validação local com o estado de uma execução remota ainda não conferida.

Reprodução, com os dados privados V24/V22 presentes:

```sh
node --test scripts/tests/progression-diagnosis-v25.test.mjs
node scripts/economy-v2/progression-diagnosis-v25.mjs
node scripts/economy-v2/progression-diagnosis-v25.mjs --verify
node --test scripts/tests/progression-diagnosis-v25.local-check.mjs
```

Dados completos/diagnósticos derivados ficam em local/, ignorado. Não houve novo replay longitudinal nem prova causal isolada. Fórmula/taxas V22 e arquivos V23/V24/nativos permanecem intactos. Os gates V24 continuam reprovados:7/14 não regressão e2/14 benefício mínimo1%.

## Próxima hipótese previamente especificada

Ver [H26.md](H26.md). O próximo experimento deve testar a recuperação proporcional da perda de benchmark, preservando a penalidade quadrática de referência, as taxas sociais atuais e o teto de tempo real de vitória. A hipótese tem mecanismo e critérios fixados; ainda não foi implementada nem avaliada em campanhas. Não há aprovação de balanceamento por esta documentação.

runtimeEnabled=false; balanceApproved=false; activationReady=false. PR30 permanece rascunho; economia real/+16–20/monetizaçãooff.
