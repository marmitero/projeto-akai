# V22 — recalibração experimental por tempo qualificado

Candidata isolada; sem consumidor no jogo/ensaio, migração, endpoint ou alteração de conta. V20/V21 e fontes R6/R7/V10 preservadas para reprodução. Runtime, aprovação de equilíbrio e ativação continuam false.

## Hipótese e fórmula prévia às campanhas

V20 recuperava somente a penalidade de referência e mantinha o benchmark como teto absoluto. A sequência de compras/equipamentos/combates divergiu, e ambas as campanhas V21 falharam na não regressão. A comparação observada sugere interação com o controlador adaptativo e RNG; não isola causalidade nem prova defeito no combate. No código nativo, combate, loot e refino consomem o mesmo run.seed. A transição externa de3s não rende domínio: matar mais rápido pode aumentar sua proporção por hora. Esses mecanismos explicam por que monotonicidade por encontro não prova monotonicidade da campanha; não quantificam a contribuição causal de cada fator. O mesmo seed deixa de representar os mesmos sorteios após a sequência de ações divergir.

V22 testa recuperar parte da ineficiência combinada, sem alterar combate, recompensas ou o controlador. Se Q é o tempo qualificado de uma vitória completa, B(L) o benchmark nativo, r a referência e L o nível:

`taxa = min(1, min(r²,L²)/L² × min(Q,B(L))/Q × (1+b))`.

Diferentemente da V20, o crédito pode superar o benchmark, mas nunca o tempo qualificado real de vitória. Este é um experimento de balanceamento, não uma regra aprovada. Segmentos e fronteiras de nível recalculados com carry micro-ms. Eficiência plena não recebe tempo extra. Piso de 96 dias qualificados, derrota/timeout zero, quota offline e exclusividade temporal preservados. Nenhum Coin/material/Jade/proteção, desconto ou atributo adicional.

Taxas mantidas para isolar a mudança de fórmula: guilda 10/7/5/3/1%, evento diário 12h–18h Brasília 30%, soma máxima 40%. Rank1 hipotético a partir do dia 8, mesma rotina diária de evento, offline somente guilda. Não são vínculos adquiridos. Não alterar parâmetros após observar o painel para selecionar apenas resultados favoráveis.

## Painel e critérios

Reexecutar as sete referências V10: best/swift com seeds 1,4213,3735928559; regular/swift, casual/swift, best/balanced, best/brute com seed4213. Todos começam do zero, sem recursos externos, por120dias, com política, compras, refino, loot e relógio nativos. Janelas fixas Brasília: casual online00h–02h/offline 02h–10h (não participa do evento global), regular online00h–16h/offline16h–24h, best24h. Não representam a distribuição de horários da população. V22 tem subpath/export e adapters temporários próprios; não modifica módulos originais. Hashes vinculam modelo, runner, controlador e fontes compiladas a cada campanha.

Não regressão exige, em cada caso, domínio final e andar principal pelo menos iguais à referência e nenhum atraso em máximo/torre1000 já observados na referência. Null é censura, nunca conclusão. Critério experimental adicional: benefício primário de pelo menos1% em cada caso (prazo até máximo quando observado na referência; domínio final nos casos censurados). Esses critérios são necessários, não suficientes para equilíbrio populacional ou ativação.

A auditoria longitudinal exige os sete snapshots completos localmente, verifica schemas, hashes das referências, equipamento/stats diários, tempo exclusivo, recursos e censura. Só o resumo de conclusões, endpoints e hashes é versionado. A CI executa os testes de domínio V20/V22 e regressões existentes; os diagnósticos pareados V22 e testes Node de métricas são executados localmente. Não é alegada reexecução pública das campanhas completas de 120 dias.

Reprodução: `npm run build:shared`; `node scripts/economy-v2/audit-progression-bonus-v22.mjs` e depois a mesma auditoria com `--verify` (o resumo derivado não acompanha o checkpoint de código); `node --test scripts/tests/progression-campaign-v22.test.mjs`; `node scripts/economy-v2/progression-campaign-v22.mjs --schedule=best --build=swift --seed=4213 --days=120` (ou os outros seis casos); `node scripts/economy-v2/audit-progression-campaign-v22.mjs --verify` após gerar os sete casos e os dois controles sem bônus de8dias (`--schedule=best --mode=zero --days=8` e `--schedule=casual --mode=zero --days=8`). Omitir --verify somente na geração inicial do resumo. Resume usa checkpoint com mesmas fontes.

Resultado longitudinal concluído: integridade aprovada, não regressão6/7, benefício primário mínimo 1% em 2/7; gates globais falharam. Ver RESULTS.md. Não integrar esta candidata. Economia real/+16–20/monetização off.
