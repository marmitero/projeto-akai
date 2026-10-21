# Fase 1 — resultado da campanha adquirida

**Meta do melhor cenário validada na amostra:** nível máximo entre **106,58 e 106,92 dias**; torre 1.000 conquistada entre **104,65 e 105,96 dias**. Os três seeds da política Agilidade passaram. A tabela mantém o piso de 96 dias qualificados; nenhuma conta recebeu moeda, material, XP, equipamento ou proteção externa. Economia real, monetização e +16–20 permanecem desligados.

## Trajetórias completas

Sete campanhas independentes, cada uma iniciada no nível 1 com a espada inicial e observada até o dia 120. Não são uma população de mercado.

| Rotina diária | Build | Seed | Nível máximo no dia | Torre 1000 no dia | Nível / andar no dia 120 |
|---|---|---:|---:|---:|---:|
| 24h ativas | Agilidade | 1 | 106,92 | 104,95 | 1000 / 1000 |
| 24h ativas | Agilidade | 4213 | 106,89 | 105,96 | 1000 / 1000 |
| 24h ativas | Agilidade | 3735928559 | 106,58 | 104,65 | 1000 / 1000 |
| 16h + 8h offline | Agilidade | 4213 | 108,00 | 109,51 | 1000 / 1000 |
| 2h + 8h offline | Agilidade | 4213 | não atingiu | não atingiu | 731 / 741 |
| 24h ativas | Equilibrada | 4213 | 111,37 | 116,42 | 1000 / 1000 |
| 24h ativas | Força | 4213 | 111,49 | não atingiu | 1000 / 979 |

A rotina casual termina no nível 731, andar 741, e permanece censurada para o prazo do máximo. Com apenas 10h elegíveis por dia, não há 96 dias de presença qualificada em 120 dias civis; não extrapolamos uma data de conclusão. Na política Força, o máximo chegou no dia 111,49, mas a torre parou no 979: há pendência de revisão de seleção de arma, upgrades de bases e desempenho tardio dessa build antes da ativação. A estratégia usa arma de uma mão e não prova inviabilidade de outras estratégias físicas. A build Equilibrada venceu a torre no dia 116,42.

## Equipamento e dificuldade

Nos 27 replays pareados do boss 1.000, usando os snapshots finais efetivamente adquiridos: 7/9 vitórias com o conjunto equipado/refinado; 0/9 com as mesmas peças sem refino; 0/9 sem equipamento. A seed 4213 venceu 1/3 dos replays equipados, preservando as duas derrotas. São diagnósticos isolados com seeds pareadas, sem produzir loot/XP ou contar novos clears da campanha; não substituem as vitórias adquiridas registradas acima nem provam necessidade universal para toda build.

Carvão e ferro chegaram ao andar 1.000 nas três campanhas do cenário máximo. Ouro terminou em 801/702/707: acesso avançado foi medido, mas não certificamos a conclusão de todas as hunts ou futuras raids.

## Integridade e reprodução

- 107.705.869 eventos de ataque R6 processados individualmente, sem multiplicação de ciclos ou média atribuída a derrotas.
- Compras de atributos, refinos, falhas, regressões, equipamento, descarte e cofre usam transições reais. Todos os saldos conciliam com ganhos menos gastos; pergaminhos conciliam separadamente.
- Cada campanha ganhou 540 pergaminhos nos 18 eventos semanais, mais os raros drops elegíveis da torre. Cada evento consumiu presença real exclusiva; grants únicos, semana atual e duração mínima são verificados pelo auditor.
- Tempo ativo, offline, eventos e inatividade somam exatamente 120 dias por campanha. Offline respeita quota/ausência de 8h, stats congelados, andar previamente vencido e interrupção por derrota. Só andares com pelo menos três vitórias observadas são selecionados para ausência.
- Checkpoints foram retomados durante a execução, preservando seed, relógio, inventário, extratos e milestones; o teste de retomada JSON reproduz o estado integral. Fonte diferente é rejeitada.
- Hash das fontes simuladas: `e53da017e142a366cbc7f456332bb76c0d99260c654cc7973de493c4a9916cd5`. Configuração: `economy-v2-config-3`. O auditor verifica esse hash, a série diária, snapshots finais, teto temporal, entregas semanais e SHA256 dos arquivos comprimidos e do JSON original.
- Observação de milestones ativos tem até 5min de incerteza; no offline, até 8h. A amostra é pequena e não estima P95/população nem prova a estratégia ótima.

Comandos:

```sh
npm run simulate:campaign -- --seed=4213 --schedule=best --build=swift --days=120 --out=backups/campaign.json
npm run simulate:campaign -- --resume --days=120 --out=backups/campaign.json
node scripts/economy-v2/audit-campaign.mjs --verify --require-target
node --test scripts/tests/campaign-audit.test.mjs
```

Os checkpoints comprimidos em [samples/](samples/) podem ser descomprimidos com gzip/zlib antes de retomar. [results.json](results.json) contém extratos, atributos, equipamentos, resultados de refino, falhas, tempos, marcos e diagnósticos completos. [preliminary-results.json](preliminary-results.json) conserva observações anteriores com controladores rejeitados, incluindo interrupções; elas não certificam a calibragem. Coin agrega combate/descarte, e gastos agregam treino/refino: não são um ledger SQL linha a linha.

## Próxima fase e limites de ativação

A próxima fase é a liquidez do mercado v2 com carteiras e itens adquiridos: demanda real, anúncios sem venda, concentração, preços, taxa de 100 mil e queima de Coin. As três carteiras do cenário máximo encerram com 22,15–23,86 bilhões de Coin: esse estoque e o fluxo de emissão precisam entrar no ensaio de fontes/sinks, sem declarar a economia inteira aprovada por esta etapa.

Também continuam pendentes a revisão física apontada pela amostra, população/Jade do boss global, consumidores públicos autenticados, capacidade/corte/rollback e playtest gratuito. Nenhuma futura raid ou +16–20 foi simulada como se já estivesse liberada. A certificação desta amostra de campanha não ativa contas reais.

## Validação técnica

Candidato validado: `8b009ef193d94481201d6f89f27e5563fbb94db2`, árvore `7cfaaafc55043b6501d792ac8fa5e22ef507d45e`. [CI 39690887554](https://github.com/marmitero/projeto-akai/actions/runs/39690887554) e [Windows 39690887504](https://github.com/marmitero/projeto-akai/actions/runs/39690887504) aprovadas: **293 testes em 34 arquivos com PostgreSQL 16, sem skips**, mais 6 testes de campanha, 1 de integridade dos relatórios e 4 de rede mobile. Typecheck, assets, builds, auditorias R2–R8/mercado/V9/V10/prontidão e os fluxos de navegador em desenvolvimento/produção passaram, incluindo viewport mobile. Não houve teste em aparelho Android físico.

Cinco mutações também foram rejeitadas ao gerar um relatório novo, sem depender do SHA de referência anterior: fonte, tempo exclusivo, saldo (com a última linha diária alterada para permanecer consistente), status de conclusão e entrega semanal. A regressão semanal foi demonstrada falhando no controlador anterior (`30 != 60`) e passando após a correção.

O fechamento posterior altera somente documentação. Runtime, testes, scripts, SQL, dados JSON e checkpoints permanecem idênticos aos validados na CI. Publicação pelo [PR 20](https://github.com/marmitero/projeto-akai/pull/20).
