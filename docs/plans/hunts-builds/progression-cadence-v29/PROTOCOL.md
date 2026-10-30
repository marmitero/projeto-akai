# H29 — protocolo operacional congelado antes das campanhas

Implementa a proposta histórica ../progression-shadow-v28/H29.md, que permanece intacta e vinculada por hash. Nenhum resultado H29 foi usado para ajustar taxas, casos ou critérios.

## Intervenção

Modificar somente o nextAt externo agendado após vitória completa. Domínio/carry/crédito usam o corpo nativo R6 original. Não acumular H26. Primeira aproximação, seleção manual, derrota/timeout, pausa, retorno, entrada offline, descarte por quota e evento semanal continuam nativos; transições internas entre ondas permanecem 3000ms, somando os 6000ms efetivamente transcorridos que R6 inclui em Q.

Cada nova espera começa com 3000 unidades de trabalho. A velocidade é 10000/(10000-bonusBps) por ms; integrar por trechos do calendário com frações BigInt exatas e arredondar somente a conclusão para cima. Em elegibilidade constante: ceil(3000*(1-b)), mínimo 1800ms. Nenhum recurso ou domínio é concedido durante a espera. Chamadas parciais preservam o deadline calculado; checkpoints diários preservam também a espera pendente e a evidência do observador.

Guilda hipotética rank1 após 26/10/2026 00h Brasília (10%); tabela social 10/7/5/3/1% preservada. Evento online 12h–18h (30%); soma máxima 40%. Mesmo calendário global e mesmos horários de criação V24/H26. Não há população social adquirida nem bônus autoritativo no jogo.

O motor nativo abandona o encontro/espera ao iniciar offline, muda o andar para um já comprovado, congela stats e agenda nova aproximação de 3000ms. No retorno e nos saltos por quota também descarta o encontro/espera. H29 preserva isso: a espera online anterior é cancelada, sem carregar bônus do evento para a ausência. Somente novas vitórias offline podem agendar espera reduzida pela guilda. Preservar limite de oito horas/quota civil e evento semanal, sem alterar a política para favorecer resultados.

## Matriz e gates

Os 14 casos exatos V24/H26, dois braços novos por caso (zero/calendar), 120 dias por braço. Reexecutar todos os controles; exigir cada linha diária e estado semântico final integralmente iguais às referências, além de trace/digests integrais iguais ao H26 zero. Nenhum resultado parcial conta como campanha completa.

Manter compareCampaignV22 e seus endpoints observados: domínio/andar finais não menores, máximo e torre observados não atrasados, benefício primário mínimo 1% em cada caso. Quando o máximo não é observado, comparar domínio no mesmo endpoint de 120 dias; null é censura. Registrar também timestamps exatos de máximo como diagnóstico, sem trocar o gate original por outra resolução. Todos os casos negativos e censurados permanecem na decisão. Não promover por melhoria média, oráculo H28 ou álgebra local.

## Integridade e evidência

Adaptador/observador descartáveis em arquivos temporários; fontes nativas/V22/V24/V26/V28 preservadas. Modelo H29 é ESM executado diretamente, sem build intermediário; vincular sua fonte executável, factory, observador-base, runner, validador, referências, protocolo e manifesto do runtime JS compilado realmente executado. Não recompilar nem editar fontes durante as campanhas. Auditor é pós-processador separado, também identificado por hash em seu relatório.

Ledger diário privado limitado a 100.000 eventos/64MiB descomprimidos: agendamento com instante, elegibilidade offline, Q, referência/andar e crédito/carry antes/depois; consumo e cancelamento da espera. Hashes raw/arquivo e cadeia por dia. Arquivar o ledger antes do checkpoint atômico. Auditor reexecuta a cotação e o ciclo de vida de todas as esperas, confere cada crédito nativo com cotação zero, reconcilia prefixos/carry, grupos de tempo, quotas, stats/itens, proteção, compras e estado final. Testar adulterações com hashes recalculados, incompletude e arquivo ausente.

Retomar somente checkpoints diários de sessões encerradas, com fontes/configuração idênticas; arquivos órfãos de um dia sem checkpoint podem ser substituídos por recomputação. Não serializar como checkpoint completo o snapshot intermediário de um observador cujo digest diário ainda está aberto. Máximo de oito campanhas simultâneas; salvar sessões/checkpoints durante trabalho longo.

Publicar somente conclusões, endpoints e hashes autorizados. Estados, saldos, séries e ledgers permanecem locais ignorados. Qualquer aprovação do laboratório ainda exige etapas posteriores de consumidor autoritativo, coortes sociais e playtest. H26/V22 seguem reprovadas. runtimeEnabled=false; balanceApproved=false; activationReady=false; sem merge/ativação. Monetização desligada.
