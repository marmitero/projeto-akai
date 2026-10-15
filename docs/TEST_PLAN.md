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

## Execução F3

31 testes Vitest em 5 arquivos: agenda/3×3/boss/deadline/pausa/treino, grants e compras exatas, produção fracionária,30min de domínio/18.000 passos, sessão/ausência/regresso, migração1→2 com fixture/checksum e backup/CAS, contratos/servidor. npm run check também valida72 arquivos/fontes do subset, typecheck e builds.

Smokes dev e build estático em Chromium153 headless:50 ciclos, mineração inicial10 ferros, invisível/modal bloqueados, movimento reduzido, compra e carvão após reload,8h de crédito e reload sem duplicar, timeout/treino de boss, conclusão enquanto Mina ativa, morte, menus/foco/safe areas e erro de asset. Fixtures de cenários são injetadas como saves válidos no teste; nenhum debug/API de grant é embarcado. Simulação de economia1/3/5 cliques/s deve concluir20; executada também pelaCI.

Soak real30min via npm run test:soak no build preview: mineração/compras/navegação, heap após GC, DOM/listeners, objetos/texturas e média de rAF por minuto. Relatório só comprova a duração/ambiente registrados, não aptidão Android. Não usar o teste puro acelerado como prova de 30min reais de render. Licenças e playtest humano seguem outros gates.

Resultado executado da sessão prolongada F3: 30min reais (1800914ms),1784 ciclos,127 listeners/34 texturas/37 objetos estáveis, heap apósGC5.91–6.64MiB e média rAF por minuto59.95–60.02 após aquecimento; zero pageerrors. CPU/navegador/ambiente em STAGE_03_REPORT e amostras no JSON.

## F4 — critérios e execução

45 testes:31 regressões adaptadas ao schema3/escopo atual,12 casos RPG e2 migrações reais2→3. Equipamento único/slots/duas mãos/anéis, transações/rejeições/capacidade/reciclagem, atributo aprimorado sem reroll, morte persistida, RNG/bins/estatística, ouro/carvão50/jade/Musgo, buffs com expiração exata e percurso numérico1.000. Vitalidade com HP0 permanece derrotada.

Smokes dev/produção: fabricar/equipar/aprimorar, Forja/ferro fundido/tônico, adoção, ouro bloqueado49/liberado50, jade, save/reload e tabs por teclado, além dos fluxos F3. Setup por snapshots válidos, sem grant de debug no jogo. Capturas inspecionadas.

Soak F4 separado do arquivo F3,30min reais no build preview5185,120 peças/reciclagem/recompra e navegação repetidas. Medir heap apósGC, DOM/listeners, texturas/objetos e média rAF; critério de listeners tolera oscilação nativa limitada e rejeita crescimento. Não é benchmark de aparelho nem playtest orgânico. JSON/ambiente/limitações em STAGE_04_REPORT.

## Atualização F5 — 15/10/2026

F5 acrescenta integração PostgreSQL opcional local e obrigatória na CI, testes de JWT assinado e smokes online dev/produção. Abrange100 replays concorrentes, versões, abuso, IDOR, rollback após falha de persistência, deadlines/offline, craft/equip/enhance, ledger, recuperação/revogação e restart com resposta perdida. Os testes sem TEST_DATABASE_URL não validam persistência online. Evidências e limites em STAGE_05_REPORT. Nenhum novo soak30min foi exigido/alegado para esta fase; os soaks F3/F4 continuam históricos.

## Atualização F6 — 15/10/2026

F6 soma28casos aos66anteriores: regras de calendário/duelo e26integrações PostgreSQL, incluindo concorrência, permissão/chat privado, bloqueio/mute/denúncia, roles/vagas, fonte de dano confiável, rollover, loteria/raid/restart/rollback, limites e migração real001→002. Smoke-community emdev/produção com2contas semeadas no banco isolado, sem confundí-las com jornada humana: textoXSSliteral, convite/aceite, emblema persistido, chat privado, arena/boss, recarga,30ciclos e320/390/768px. Workflows preparados para repetir emPostgreSQL16; resultado remoto só afirmar após publicar/consultar. Não houve novo soak30min ou carga comercial.
