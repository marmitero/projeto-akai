# V23 — instrumentação e diagnóstico do caso negativo

**Instrumentação validada; candidata V22 continua reprovada e desligada.** Nenhuma fórmula, taxa, fonte nativa, política de compras, carteira, endpoint ou RNG foi alterado nesta etapa.

Duas reexecuções do caso best/swift/seed3735928559, 120 dias sem bônus e 120 dias com V22. As 240 linhas diárias e os dois estados semânticos completos finais foram idênticos às respectivas referências. Somente metadados de execução são excluídos da comparação. Tempo não classificado: zero.

O atraso real até o máximo foi **4.870.192 ms (81 min 10,192 s)**. Os marcos observados em blocos de 5 min sugeriam 80 min; o relógio exato confirma a regressão, sem alterar os resultados anteriores. A torre 1000 mantém o atraso registrado na V22; esta decomposição se refere ao prazo até o máximo.

## Decomposição contábil até o máximo

Diferença entre as duas trajetórias, em horas. Valores positivos aumentam o saldo de tempo sem crédito líquido; negativos compensam esse saldo. Crédito extra é cotação no mesmo encontro/estado, não tempo causalmente economizado numa campanha alternativa.

| Componente | Diferença (horas) |
| --- | ---: |
| Encontros sem crédito de vitória | -0,844625 |
| Transições externas | +9,203156 |
| Pausas | -6,453694 |
| Perda de referência | +1,480792 |
| Perda adicional de benchmark | +1,503021 |
| Truncamento no máximo | -0,002520 |
| Crédito extra bruto por encontro | -3,533298 |
| **Saldo / atraso real** | **+1,352831** |

Eventos e tempo não classificado não tiveram diferença. Os componentes inteiros em ms somam exatamente o atraso; a tabela arredonda somente a apresentação.

Houve cerca de 9h12min a mais em transições externas, parcialmente compensadas por 6h27min a menos de pausas e menos encontros sem crédito de vitória. Perdas de referência e benchmark cresceram juntas cerca de 2h59min; o crédito extra bruto equivaleu a 3h32min. O saldo foi pior. Essa identidade mede onde o tempo/crédito foi contabilizado em trajetórias distintas, não isola causalmente cada decisão, compra ou sorteio. A atribuição referência/benchmark é dependente da ordem descrita em IMPLEMENTATION.md.

Compras, equipamentos e RNG foram observados sem concessões artificiais; os digests de sorteios, ações e decisões já divergiram no primeiro dia. Isso não é consumo adicional de RNG pelo observador: cada reexecução reproduziu exatamente o estado e a semente final de sua própria referência.

## Validação

- Cinco testes do observador passaram: recortes/duplicações de intervalos, igualdade de estados em requests parciais e offline, comando rejeitado, observador ligado/desligado, retomada e fronteira exata do máximo. A CI executa esse conjunto.
- Geração e --verify do diagnóstico passaram. Um teste de integração local confirmou o round-trip JSON e rejeitou oito adulterações (fonte, hash de estado, tempo, crédito, compras, RNG, conclusão e duração) e um arquivo ausente.
- Contabilidade de compras, crédito, tempo, referências e hashes verificada. Não é uma prova independente de replay dos traces: os assertions de igualdade completa são executados pelo runner durante a reprodução.
- Campanhas completas e testes de corrupção foram executados localmente; a CI não reexecuta os 240 dias simulados. Estado da CI e SHA publicado devem ser conferidos na PR30.

## Próximo passo

Ampliar seeds e janelas online antes de escolher outra fórmula. Preservar o caso negativo como regressão fixa e separar hipóteses de transição, benchmark, escolha de atividade/material e política adaptativa. Definir critérios antes de medir os novos casos. Não ajustar percentuais só para fazer esta seed passar. Integração autoritativa no ensaio, coortes sociais/PvP e playtest humano continuam posteriores aos gates de benefício/não regressão.

RuntimeEnabled/balanceApproved/activationReady=false; economia real/+16–20/monetização off. Relatório público somente com testes e conclusões agregadas; sem saldos, séries diárias ou snapshots. Traces completos e diagnósticos derivados ficam em local/, ignorado.
