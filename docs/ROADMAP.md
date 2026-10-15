# Roadmap e gates de entrega

Baseline v1 — 15/10/2026. Sem estimativas de calendário: duração depende da integração artística e validação do loop. Estado atual: documentação entregue; desenvolvimento aguardando nova instrução. Todos os marcos abaixo são futuros salvo as entregas documentais explicitadas.

| Fase | Entrega e dependências | Critério de saída | Estado |
|---|---|---|---|
| 0 — Inspeção e planejamento | Auditoria, guias, Constituição, GDD, arquitetura, dados, economia, segurança e testes | Documentos rastreáveis, riscos e decisões abertos explícitos | Documentação preparada; licenças/arte ainda parciais |
| 1 — Fundação | Após liberação para implementar; cliente e servidor independentes, TS estrito, contratos, fixtures, saves e configuração | Build/testes executáveis, perfil local rotulado, isolamento online/local, sem segredos | Não iniciada |
| 2 — Vertical visual | F1 + recortes/pivôs de herói/inimigo/HUD/mina | Três telas navegáveis com sprites, input isolado, estado compartilhado e safe areas | Não iniciada |
| 3 — Loop local | F2 + configuração inicial validável | Andares 1–20, bosses 10/20, clique, carvão, upgrades, salvar/carregar e offline conforme MVP_ACCEPTANCE | Não iniciada |
| 4 — Progressão RPG | F3 + aceitação de mecânicas propostas | Equipamentos, raridades, drops, mascotes, ouro/jade, fabricação, buffs, dados escaláveis até 1.000 andares | Não iniciada |
| 5 — Online autoritativo | Fundação do servidor F1 + domínio estabilizado | Auth, persistência, ledger, reconexão, simulação confiável, testes de concorrência/abuso | Não iniciada |
| 6 — Comunidade | F5 + decisões sociais resolvidas | Chat/moderação, guildas/brasões, PvP, rankings/temporadas, boss global e eventos idempotentes | Não iniciada |
| 7 — Mercado | F4/F5 + definições de negociação | Reserva, compra/oferta atômicas, taxas, expiração/relistagem e auditoria verificadas | Não iniciada |
| 8 — Monetização | F5 + economia simulada + contas de provedores | Compras/anúncios em sandbox validados e reconciliados, sem grants duplicados | Não iniciada |
| 9 — Android | Loop estável + adaptação de plataforma | Build de teste em aparelhos, ciclo de vida, auth, compras e áudio validados | Não iniciada |
| 10 — Candidato a lançamento | Gates anteriores + licenças + operação | RELEASE_CHECKLIST cumprido, riscos aceitos, rollback e restauração ensaiados | Não iniciada |

A F1 prepara o servidor e seus limites, mas a implementação completa de economia online fica em F5. Nenhum fake backend deve ser apresentado como seguro. F6 e F7 podem ter planejamento independente; integração depende de F5. Mil andares são meta de conteúdo do produto e não condição para experimentar a primeira fatia de 20.

## Backlog inicial com dependências

| ID | Trabalho | Depende de | Evidência requerida |
|---|---|---|---|
| F1-01 | Selecionar versões compatíveis, package manager e lockfile | Nova autorização | ADR atualizado, comandos reproduzíveis |
| F1-02 | Criar cliente/servidor/shared e contratos puros | F1-01 | Builds independentes e typecheck |
| F1-03 | Estado/simulação local desacoplados da tela | F1-02 | Teste de navegar sem reiniciar domínio |
| F1-04 | Save versionado e relógio controlável | F1-03 | Round-trip, migração e corrupção |
| F2-01 | Integrar subset artístico com pivôs aprovados | F1-02, arte | Prévia completa de idle/ataque/morte |
| F2-02 | HUD/telas responsivas | F1-03, F2-01 | 320/360/390/768 CSS px sem controles ocultos |
| F3-01 | Combate, ondas, boss e recompensas únicas | F1-03, config | Cenários determinísticos de vitória/derrota |
| F3-02 | Clique, upgrades e carvão | F1-03, config | Ganhos corretos, sem saldo negativo |
| F3-03 | Retomada/offline e tutorial curto | F1-04, F3-01/02 | Crédito único e execução ponta a ponta |

## Riscos por gate

F2 pode ser bloqueada por recortes/compatibilidade artística. F3 depende de curvas ainda não simuladas. F5 exige banco e serviços confiáveis. F6/7 dependem de regras competitivas e proteção de concorrência. F8/9 exigem integrações externas e políticas vigentes verificadas na data da implementação. Lançamento depende de licença confirmada de cada asset efetivamente distribuído.

Não declarar F0 integralmente encerrada por haver documentação: a revisão de licenças, aprovação visual e decisões listadas em DECISIONS permanecem abertas. Após esta entrega, aguardar; não executar F1 automaticamente.

## Atualização de governança — 15/10/2026

Etapa de triagem/autonomia: concluída documentalmente. O agente pode resolver escolhas rotineiras dentro do escopo e deve reportar decisões/validações ao terminar cada etapa, atualizando este roadmap, AI_STATE e documentos pertinentes. D06 (fatia20) e D07 (offline experimental8h) adotadas sob delegação, sem resultados de teste presumidos. F1 continua não iniciada: a mensagem atual solicita listar pendências. Não há bloqueio de design que exija decisão do usuário antes do desenvolvimento local; gates de licença, contratação, conta do titular e monetização permanecem nas fases correspondentes. Ver DECISIONS para responsáveis.
