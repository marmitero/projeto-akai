# R7 — farm offline, agenda e consumidores

20/10/2026. Implementação autorizada após a validação dos gates. Entrega o offline da nova economia no runtime compartilhado, ensaio PostgreSQL privado e prévia explícita; contas reais permanecem na economia antiga. `ECONOMY_V2_ACTIVE=false`, sem novas rotas públicas, migração ou Jade provisória.

## Regras implementadas

- Uma atividade econômica, até8h por ausência **e** por dia civil em `America/Sao_Paulo` (IANA). Conta o primeiro intervalo de até8h desde o cursor anterior; não escolhe retroativamente as melhores horas/dias de uma ausência longa. Dias posteriores fora desse intervalo não produzem ganhos. Tempo qualificado inclui combate e caminhada; XP continua excluindo caminhada/derrota, como no ativo.
- Farm no andar selecionado se concluído; caso esteja progredindo, usa o último concluído dessa atividade, limitado ao andar selecionado. Torre em múltiplo de10 recua para o comum anterior. Sem andar elegível/desbloqueio ou se pausado, pula ausência sem ganhos. Não sobe andares, não repete bosses, não participa de eventos/ranking/presença e não concede Jade. “Seguro” significa concluído/elegível; não garante vitória após trocar a build: uma derrota encerra o farm e mantém pausa. Abates parciais confirmados seguem a regra ativa, sem XP de vitória na derrota.
- Descarta encontro ativo incompleto e paga caminhada inicial3s. Não recupera a luta parcial para duplicar loot. Os sete atributos/equipamentos viram um snapshot de combate congelado por toda a ausência, mesmo após ganhar níveis. Continua usando as fórmulas R3 de acerto/crítico/defesas/ASPD e recompensas R6, mesma agenda e PRNG/chaves; nenhuma multiplicação aproximada de ciclos ou nova rolagem na coleta.
- Persiste `offlineJob` no snapshot R6 com defaults para saves antigos. Prazo da ausência, instante de retorno, build e seleção de retorno são imutáveis durante a retomada. Cada comando do ensaio executa no máximo1.000 eventos de ataque. Enquanto pendente, não aplica treino/refino/equipamento/seleção/fechamento solicitado; retorna `settling/SETTLEMENT_BACKLOG`, confirma a parcela e exige novo comando/revisão para a ação. Recibo repetido retorna a resposta anterior, sem avançar novamente. A revisão stale rejeita sem ganhos.
- Cota, snapshot, ledger e outbox são confirmados na mesma transação sob `FOR UPDATE` da conta de ensaio. Reinício retoma o mesmo job; dois aparelhos não recebem dois intervalos. Na virada de dia cada segmento debita sua própria cota; tempo sem cota não resolve ataques e abandona encontro parcial. Na derrota debita apenas até o instante da morte. Ao concluir, restaura atividade/andar/auto anteriores, descarta eventual luta parcial final e continua ativo a partir do retorno, sem repetir tempo anterior. Ganhos parciais já confirmados ficam preservados.

## Teste no jogo

Mais → Prévia da economia → Batalha → **Ausência de teste** (1min/1h/8h/24h) → **Simular ausência**. É uma simulação explícita do intervalo no relógio da prévia, não relógio real enquanto o navegador estiver fechado. Requer andar concluído: vença um andar primeiro; o cenário100 já libera comuns da torre. Não cria material de hunt ainda não concluída.

A prévia processa até10 parcelas de500 ataques, cedendo a thread entre parcelas; salva cada parcela. Se restar trabalho, **Continuar processamento offline**, inclusive após recarregar. Logs ficam em60 linhas e cada snapshot de combate em64 hits; não cria elemento DOM por ataque. A prévia é sandbox local e não prova exclusão entre abas; a autoridade e a exclusão entre aparelhos são do serviço PostgreSQL, sem endpoint liberado para contas reais.

## Consumidores e compatibilidade

Torre/hunts/XP/loot offline usam os sete stats efetivos do mesmo motor R3/R6. Nenhum treino v2 está à venda/aplicado na conta legada. Arena, eventos, mercado, ranking e combate normal da conta antiga ainda consomem o modelo legado; não misturar esses modos com stats v2 antes do corte. Regressões desses consumidores devem continuar verdes, mas não certificam sua migração. A migração desses consumidores segue gate explícito do corte, junto com mercado v2 e R8. Boss global/Jade/broadcast e evento semanal de proteção não são executados offline. +16–20 e monetização seguem bloqueados.

## Evidências e limites

Testes compartilhados: Brasília/midnight, relógio regressivo, cota por ausência/dia/retornos, pausa/sem andar, derrota, congelamento através de nível, equivalência de XP/material/equipamento/proteção/PRNG com ativo, partições curtas/JSON/backlog, bloqueio de mutações. PostgreSQL: duas sessões, replay, retomada por nova instância, ledger, rollback conjunto de loot/cota quando outbox falha; sem alteração da carteira real. Navegador: botão de ausência curta, material e cota, sem avanço/coin indevido, recarga e layouts mobile.

`audit-r7.mjs` drena8h em uma fixture sintética de5APS, nível1000, AGI800/orçamento5994, conjunto lendário+20 e carvão900 já concluído. Esse +20 é somente cenário matemático; não libera o executor de refino. Resultado local inicial:78.189 eventos/157 parcelas de no máximo500, cota28.800.000ms,4.718abates; p95~29,3ms/máximo~55,6ms por parcela e total~3,88s nesta máquina. Sem SLA de produção ou equivalência entre máquinas. Auditoria salva JSON com medição atual; não comparar tempos como hashes determinísticos. A agenda continua exata, mas o total é amortizado entre comandos: não executa uma ausência inteira em cada leitura. Inventário/cofre de torre e populações grandes ainda exigem avaliação de capacidade antes de produção; não inferir isso da fixture hunt sem itens.

Verificação local inicial: `npm run check` aprovado,136 testes passaram/108 dependentes de PostgreSQL pulados; teste adicional de nível/drop executado depois. A CI PostgreSQL16 e regressões completas devem passar antes da main. Prazo90–120dias, raridade+20 e dificuldade dos bosses avançados não foram revalidados por esta etapa.

Próximo: mercado v2/reconciliação → R8 bosses/Jade/proteção semanal → migração dos consumidores e coortes integradas/playtest → revisão de corte. A entrega R7 não é ativação da economia nova.
