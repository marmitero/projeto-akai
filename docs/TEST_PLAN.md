# Plano de testes e qualidade

**Plano de gameplay ainda futuro; fundação testada na F1.** Há 14 testes Vitest de contratos, sessão, persistência e servidor, com typecheck/build executados. Ver STAGE_01_REPORT para comandos e limites; combate/economia/PvP/mercado continuam sem implementação ou testes de gameplay.

## Camadas e evidências

| Camada | Casos mínimos | Evidência futura |
|---|---|---|
| Domínio unitário | Dano, crítico, cooldown, ondas, custo, ganho, requisitos, arredondamento e cap | Testes determinísticos com relógio/RNG injetados |
| Persistência local | Round-trip, schema antigo/futuro, corrupção, backup, falha de escrita | Fixtures e testes de migração sem perda silenciosa |
| Integração online | Auth, transações, ledger, comando/outbox e watermark | PostgreSQL de teste isolado e rollback/constraints |
| Contrato | Schemas DTO, códigos de erro, versão, payload malformado | Teste client/server contra mesmos contratos |
| E2E local | Critérios M01–M15 de MVP_ACCEPTANCE | Roteiro automatizável e capturas/contexto |
| Visual | Recortes, pivôs, safe areas, rótulos, foco e estados | Capturas de referência por viewport e revisão humana |
| Concorrência | Duas compras, grants repetidos, dois workers | Número de efeitos exato e invariantes no banco |
| Operação | Crash/restart, restore, migração e perda de rede | Runbook ensaiado e registro de resultados |
| Desempenho | PERFORMANCE e sessão prolongada | Dispositivo/carga, métricas e limites declarados |

## Casos obrigatórios de regressão

Clique inicial=1 ferro; taxa acima do permitido rejeita; sem saldo não compra; saldo não negativo; carvão por tempo correto; ouro bloqueado antes de carvão50. Ganhos segmentados equivalem a ganho contínuo, incluindo fração. Offline respeita cap/expiração e concilia uma vez. Navegação não conta como offline, não duplica timers/handlers e cena oculta não recebe input. Modal bloqueia mina.

Comum: exatamente três ondas de três, sem timeout. Boss: uma onda/um alvo, timer, vitória antes do deadline, falha no deadline conforme BALANCE, retorno/pausa e retry manual inclusive quando outra tela está aberta. Desconexão não reseta deadline. Morte comum segue política proposta, sem grants duplicados na mesma tentativa.

Equipment: dono/requisito/slot, duas mãos versus escudo, item reservado não equipável. Drops: pool válido, pesos somam, limites RNG e distribuição com tolerância estatística explícita. Mascote: limite ativo/custos e buffs sem multiplicação indevida.

Mercado: dois compradores disputam anúncio, só um débito/transferência; falha intermediária reverte tudo; cancelamento vs compra serializados; expiração vs oferta; pilha não negativa; cooldown de relistagem; taxa na moeda correta. Não repetir grant com novo evento após timeout.

Evento global: edição diária única, timezone correto, dois golpes letais simultâneos produzem um último golpe, crash após commit antes de publicar não repete prêmio. PvP: desafios concorrentes não duplicam posições; troféu calculado pelo servidor. Guildas: permissões, capacidade, saída/cargo, brasão limitado, presença e encerramento semanal idempotente. Sem dados suficientes de regra, registrar teste bloqueado em vez de inventar resultado.

Premium: recibo inválido/repetido, produto divergente, compra pendente, revogação, restauração e webhook reordenado. Anúncio não concede pelo booleano do cliente. Não usar dinheiro real para teste sem necessidade explicitamente autorizada e sandbox apropriado.

## Segurança e falhas

Testar IDOR, sessão expirada, payload enorme, números negativos/overflow, auth de streams, CSRF quando aplicável, XSS em chat e impersonação de nickname. Simular resposta perdida, mensagem duplicada/fora de ordem, reconnect com cursor vencido, falha de banco, processo morto após commit e lease vencida. Estado confirmado deve ser recuperável sem duplicação.

## Execução e gates

F1 define comandos reais de lint/typecheck/test/build e os documenta; atualmente não existem. Em cada mudança executar somente camadas pertinentes, registrar comando, commit, ambiente, resultado e limitações no AI_STATE. Cobertura numérica não substitui cenários. CI futura bloqueia regressão crítica, segredo e build quebrado. Antes de F5 exigir transações e reconexão testadas; antes de lançamento cumprir RELEASE_CHECKLIST. Dados de teste isolados, seeds versionadas e sem PII de produção.

## Evidência F2

14 testes unitários/regressão da F1 continuam passando; verificação de assets e smoke ampliado em dev e build estático foram executados. Oito animações e conclusão de morte,50 ciclos, input oculto/modal bloqueado, foco/Escape, alvos/scroll, save/reload e falha de asset validados. Esses testes não provam vida, ondas, produção ou segurança online, que não existem ainda. CI configurada para repetir check e ambos os smokes; confirmar run antes de declarar resultado remoto.
