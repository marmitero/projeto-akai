# V27 — revisão do desenho e limites de benefício

Revisão concluída em26/10/2026, sem nova fórmula, concessão de bônus ou campanha. Os28braços H26 e as referências foram reauditados para estudar todos os14casos, preservando seus resultados e critérios. A integridade desta análise passou; H26 continua reprovada e desligada.

## Decisão de desenho

Não há evidência para escolher outra taxa ou relaxar a meta1%. O próximo ensaio deve separar o efeito da cotação em uma trajetória congelada da realimentação sobre combate, compras e RNG. Foram mantidos três objetivos distintos: crédito local de domínio, prazo até máximo e progresso da torre. Melhorar o primeiro não demonstrou melhora dos demais.

O próximo passo foi especificado em [H28.md](H28.md): observação sombra em controles nativos, com prefixos por vitória e comparação zero/H26/oráculo, sem mudar combate, loot, compras, decisões ou RNG. H28 é um protocolo diagnóstico ainda não implementado nem executado. Não constitui uma nova candidata aprovada.

## 1. Tetos otimistas dos seis casuais

No horizonte fixo120dias, o teto relaxado é min(máximo,Q), onde Q soma o tempo qualificado das mesmas vitórias nativas. Cada ms qualificado renderia1ms, ignorando referência, benchmark e elegibilidade social. É um limite deliberadamente generoso; sua viabilidade não foi demonstrada por uma fórmula. Não inclui novas vitórias, novos itens, outro RNG ou progresso de torre.

| Perfil casual/swift | Teto relativo otimista de domínio | Ganho H26 real | Diferença de andar H26 |
| --- | ---: | ---: | ---: |
|4213/00h|+3,0106%|+0,1802%|-2|
|17/00h|+2,6840%|+0,1869%|-6|
|17/12h|+2,6840%|+0,6126%|-2|
|17/20h|+2,6840%|+0,5438%|-3|
|4213/12h|+3,0106%|+0,8527%|+4|
|4213/20h|+3,0106%|-0,4048%|-5|

Nos seis casos, o teto não exclui1%; isso não equivale a atingir1%. Os tetos são aproximadamente2,6840% para seed17 e3,0106% para4213. Todos os ganhos H26 reais ficaram abaixo de1%. Em quatro casos houve maior domínio e menor andar; não há justificativa para aprovar o bônus só pelo crédito.

## 2. Crédito local versus resíduo de trajetórias

Para o mesmo horizonte e endpoints não saturados:

Δdomínio = extra cotado nos encontros H26 + (base cotada nos estados H26 − crédito do controle nativo).

A base cotada usa o estado, referência e carry reais da H26 em cada encontro; não é uma segunda campanha nativa executada nessa trajetória. O resíduo inclui diferenças entre trajetórias, inclusive compras, RNG, relógios, carry e atividades. É uma identidade contábil, sem atribuição causal isolada a qualquer componente. Valores em horas equivalentes de domínio, nunca tempo causalmente economizado.

| Perfil casual/swift | Extra cotado | Resíduo de trajetórias | Δdomínio final |
| --- | ---: | ---: | ---: |
|4213/00h|0,533418|1,326935|1,860353|
|17/00h|0,775262|1,156691|1,931952|
|17/12h|1,808238|4,525579|6,333817|
|17/20h|1,455399|4,166733|5,622131|
|4213/12h|1,400570|7,401208|8,801778|
|4213/20h|1,039446|-5,218047|-4,178602|

Cinco resíduos foram positivos; o mecanismo adaptativo não piorou o domínio em todos os casos. No4213/20h, extra cotado+1,039446h foi superado pelo resíduo−5,218047h, produzindo−4,178602h de domínio. A soma fecha exatamente em inteiros. Não chamar o resíduo de custo causal medido de uma compra ou do RNG.

## 3. Crédito disponível não identifica prazo de conclusão

Para os oito controles que atingiram máximo, o domínio final está saturado. Um teto de domínio final igual ao nativo não significa ausência de antecipação possível. O total de perdas antes do máximo também não determina quantos dias podem ser economizados: é necessário saber quando ocorreram as vitórias e pausas.

| Perfil | Perdas nativas referência+benchmark até máximo (h) | Limite global frouxo de antecipação |
| --- | ---: | ---: |
|best/swift/1|16,597000|+10,2084%|
|best/swift/4213|19,944507|+10,1831%|
|best/swift/3735928559|16,415673|+9,9209%|
|regular/swift/4213|22,008768|+11,1006%|
|best/balanced/4213|70,694422|+13,8016%|
|best/brute/4213|41,163120|+13,8929%|
|best/swift/17|17,236711|+9,9578%|
|best/swift/1337|27,588544|+10,5377%|

O limite global usa apenas o mínimo96dias de tempo qualificado: (tempo nativo exato−96dias)/tempo nativo exato. Não é previsão, prazo alcançável pela H26 nem teto específico da trajetória congelada. Nenhum dos oito prazos congelados foi identificado nesta etapa. Truncamento no máximo foi separado das perdas de referência/benchmark, sem contá-lo como penalidade recuperável.

Um teste independente demonstra a não identificação: duas sequências artificiais com mesmo prazo nativo100, crédito96 e tempo qualificado97 permitem antecipação ideal0ou4, dependendo da posição das vitórias. Logo,1unidade de crédito perdido não limita a antecipação a1unidade de calendário. A fixture serve para validar o raciocínio; não substitui dados longitudinais.

## Validação e reprodução

- Sete testes unitários passaram: teto relaxado, limiar1% em inteiros, saturação/truncamento, ponte de crédito, contraexemplo temporal, dados inválidos/overflow e imutabilidade/JSON. Incluídos na CI.
- Geração e --verify passaram. O teste local completo reproduziu a análise após copiar os28braços e confirmou o round-trip JSON. Rejeitou cinco adulterações (fonte, tempo qualificado, carteira, incompletude e estado nativo), com hashes recalculados, e arquivo ausente.
- A auditoria H26 foi reexecutada, vinculando os bytes lidos aos hashes auditados. Nenhum resultado anterior, modelo, controlador ou fonte nativa foi alterado. Não houve novo replay longitudinal nesta etapa.
- A nova execução remota de CI deve ser conferida por SHA; testes locais aprovados não são uma declaração de CI completa no commit novo. A CI completa anterior H26 já foi aprovada no545cffe.

```sh
node --test scripts/tests/progression-envelope-v27.test.mjs
node scripts/economy-v2/progression-envelope-v27.mjs
node scripts/economy-v2/progression-envelope-v27.mjs --verify
node --test scripts/tests/progression-envelope-v27.local-check.mjs
```

São necessários os28braços H26 completos e suas referências privadas. Revisão detalhada e dados derivados ficam em local/, ignorado; somente este resumo de conclusões/testes é público.

## Estado final

H26 preservada com não regressão4/14 e benefício mínimo1%2/14; ambos1/14. V22 preservada com7/14 e2/14. Não se decidiu diminuir a meta, mudar a semântica do bônus ou integrar outro sistema. Próximo: implementar e validar H28 antes de medir seus resultados, mantendo os14casos e todos os negativos.

runtimeEnabled=false; balanceApproved=false; activationReady=false. PR30rascunho, sem merge/ativação. Economia real/+16–20/monetizaçãooff.
