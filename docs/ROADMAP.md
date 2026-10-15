# Roadmap e gates de entrega

Baseline v1 — 15/10/2026. Sem estimativas de calendário: duração depende da integração artística e validação do loop. Estado atual: F1/F2 concluídas; F3 concluída no escopo local; F4 concluída no escopo local; F5 implementada no escopo de desenvolvimento; F6 é a próxima etapa técnica. As linhas de estado e entregas datadas prevalecem sobre registros históricos abaixo.

| Fase | Entrega e dependências | Critério de saída | Estado |
|---|---|---|---|
| 0 — Inspeção e planejamento | Auditoria, guias, Constituição, GDD, arquitetura, dados, economia, segurança e testes | Documentos rastreáveis, riscos e decisões abertos explícitos | Documentação preparada; licenças/arte ainda parciais |
| 1 — Fundação | Após liberação para implementar; cliente e servidor independentes, TS estrito, contratos, fixtures, saves e configuração | Build/testes executáveis, perfil local rotulado, isolamento online/local, sem segredos | Concluída no escopo de fundação; ver STAGE_01_REPORT |
| 2 — Vertical visual | F1 + recortes/pivôs de herói/inimigo/HUD/mina | Três telas navegáveis com sprites, input isolado, estado compartilhado e safe areas | Concluída no escopo visual; ver STAGE_02_REPORT |
| 3 — Loop local | F2 + configuração inicial validável | Andares 1–20, bosses 10/20, clique, carvão, upgrades, salvar/carregar e offline conforme MVP_ACCEPTANCE | Concluída no escopo local; ver STAGE_03_REPORT |
| 4 — Progressão RPG | F3 + aceitação de mecânicas propostas | Equipamentos, raridades, drops, mascotes, ouro/jade, fabricação, buffs, dados escaláveis até 1.000 andares | Concluída no escopo local; ver STAGE_04_REPORT |
| 5 — Online autoritativo | Fundação do servidor F1 + domínio estabilizado | Auth, persistência, ledger, reconexão, simulação confiável, testes de concorrência/abuso | Concluída e publicada; CI aprovada, ver STAGE_05_REPORT |
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
| F4-01 | Catálogo 1.000, curvas limitadas e XP | F3 validada | Todos os dados válidos e percurso numérico completo |
| F4-02 | Itens, raridades, slots, afixos e drops | F4-01 | Instâncias/rolls persistidos; incompatibilidades e capacidade testadas |
| F4-03 | Forja, aprimoramento e tônicos | F4-02 | Custos/débito/resultado atômicos e expiração exata |
| F4-04 | Musgo e minas ouro/jade | F4-01, arte | Passivos, custos, carvão50 e produção fracionária validados |
| F4-05 | Save schema3, interface e estabilidade | F4-01/02/03/04 | Migrações1/2, smokes dev/produção, soak30min e documentação |

## Riscos por gate

F2 pode ser bloqueada por recortes/compatibilidade artística. F3 depende de curvas ainda não simuladas. F5 exige banco e serviços confiáveis. F6/7 dependem de regras competitivas e proteção de concorrência. F8/9 exigem integrações externas e políticas vigentes verificadas na data da implementação. Lançamento depende de licença confirmada de cada asset efetivamente distribuído.

Não declarar F0 integralmente encerrada por haver documentação: a revisão de licenças, aprovação visual e decisões listadas em DECISIONS permanecem abertas. A pausa histórica após documentação foi superada pela autorização expressa do usuário para F1. Encerrar cada etapa com relatório e próximo passo.

## Atualização de governança — registro histórico anterior à F1

Etapa de triagem/autonomia: concluída documentalmente. O agente pode resolver escolhas rotineiras dentro do escopo e deve reportar decisões/validações ao terminar cada etapa, atualizando este roadmap, AI_STATE e documentos pertinentes. D06 (fatia20) e D07 (offline experimental8h) adotadas sob delegação, sem resultados de teste presumidos. F1 continua não iniciada: a mensagem atual solicita listar pendências. Não há bloqueio de design que exija decisão do usuário antes do desenvolvimento local; gates de licença, contratação, conta do titular e monetização permanecem nas fases correspondentes. Ver DECISIONS para responsáveis.

## Entrega F1 — fundação técnica

F1-01/02/03/04 concluídos no escopo desta fase: npm workspaces/lockfile, cliente e servidor independentes, schemas compartilhados, runtime local sem economia, IndexedDB com backup/hash/geração, testes/configuração e workflow CI. Schema1 é a primeira versão real; migrações de schemas antigos serão implementadas quando houver um formato anterior concreto, sem inventar compatibilidade. F3 ainda precisa acrescentar estado de combate/minas e cálculo offline.

Fase 0 segue parcial em licenças e aprovação artística; isso não foi marcado como resolvido. F2: selecionar subset visual e recortes/pivôs, integrar protagonista/inimigos/mina/HUD e telas finais, mantendo o lifecycle validado. Nenhum sistema RPG/online foi antecipado ou removido.

## Entrega F2 — integração visual (histórico)

F2-01 e F2-02 concluídos: subset de atores/cenário/minérios/HUD, pivôs comuns, oito animações incluindo morte, três telas independentes, Mochila/Loja/Mais e perfil/salvamento, erro de asset, redução de movimento, foco, alvos e scroll responsivos. Originais intactos; hashes/recortes no Runtime_Asset_Manifest. Testes de navegação e build estático sem concessão de recurso. Atores demonstram animações, não batalha econômica real.

Fase 3 continua não iniciada. Próximas tarefas F3-01/02/03: motor local determinístico, boss/retry, cliques/upgrades/carvão, migração do save se necessária e offline de minas. Boss art, transição de caminhada e feedback de recompensa precisam acompanhar o domínio quando esses estados existirem. Licenças e profiling em aparelho seguem abertos, sem bloquear código local.

## Entrega F3 — loop local

F3-01/02/03 concluídos:20 andares,3×3, bosses10/20 com prazo/pausa/retry, treino manual no anterior, upgrades/cliques/carvão, tutorial, schema 2 com migração real1→2, save e minas offline até 8h. Economia em BigInt/remainder, motor independente das telas e da animação. Fórmulas experimentais e simulação reproduzível; sprites de Run e boss da família Skeleton integrados. Ver [STAGE_03_REPORT](STAGE_03_REPORT.md) e [ADR-007](ADR/0007-local-loop.md).

Validação concluída:31 testes/builds, smokes dev/produção incluindo horizontal e 30min reais (1800914ms),1784 ciclos,127 listeners/34 texturas/37 objetos estáveis, heap apósGC5.91–6.64MiB e média rAF por minuto59.95–60.02 após aquecimento. Relatório e JSON preservam evidência; CI do commit no [workflow do GitHub](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml). Licenças e aparelhos continuam gates próprios, sem presumir liberação comercial. F4 não iniciada. Próxima fatia: dados escaláveis e progressão RPG (inventário/equipamentos/raridades/receitas, pets e ouro/jade).

## Entrega F4 — progressão RPG local

F3 revalidada conforme [STAGE_03_VALIDATION](STAGE_03_VALIDATION.md). F4-01 catálogo/curvas1.000 e XP, F4-02 itens/raridades/slots/drops, F4-03 Forja/aprimoramento/tônicos, F4-04 Musgo/ouro/jade e F4-05 migração2→3/UI integrados.45 testes, smokes e simulações em [STAGE_04_REPORT](STAGE_04_REPORT.md); soak próprio concluído: 30min reais (1801134ms), 1238 ciclos; 35 texturas/38 objetos constantes, 136–140 listeners sem acúmulo e heap após GC 7.06–8.33MiB após aquecimento. Média rAF por minuto 36.75–48.25 no stress de inventário cheio; zero pageerrors. Regras completas em [RPG_SYSTEMS](RPG_SYSTEMS.md)/[ADR-008](ADR/0008-local-rpg.md).

Catálogo1.000 é reutilização de bioma/família com atributos limitados, não1.000 mapas exclusivos nem balanceamento comercial. Equipamentos alteram atributos e ícones, sem vestir outro rig. Números de XP/recursos são experimentais. F5 não iniciada; próxima entrega é autoridade online, auth, ledger, persistência e reconexão, sem tratar save local como saldo confiável. Licenças/aparelhos seguem gates próprios.

## Entrega F5 — online autoritativo de desenvolvimento

Autorizada pelo usuário após F4. F5-01 identidade de convidado/cookie/recuperação e adaptador Google; F5-02 PostgreSQL/snapshot/ledger/outbox/comandos atômicos; F5-03 simulação de batalha/minas com relógio/RNG do servidor e watermark; F5-04 cliente online sem save local, WebSocket/reconexão; F5-05 concorrência/abuso/rollback/restart e documentação. Estado e evidências em [STAGE_05_REPORT](STAGE_05_REPORT.md), decisões em [ADR-009](ADR/0009-authoritative-online.md).

Não foi contratado ou publicado serviço externo. Google real depende de client ID/origins do titular; código/provas e validações criptográficas são testáveis sem esse cadastro. Staging público exige HTTPS/WSS, banco com backup/permissões, observabilidade/retencão e gates de privacidade/licenças. Essas dependências não são declaradas concluídas pela suíte local. Próxima fase técnica: F6, comunidade, após reler suas regras e sem ativar gastos ou políticas públicas unilateralmente.

Publicação F5 concluída após autorização explícita do usuário em15/10/2026: implementação364384b na main, [CI38792734890](https://github.com/marmitero/projeto-akai/actions/runs/38792734890) success com PostgreSQL16 e smokes locais/online. Bloqueio anterior resolvido, sem pendência de autorização agora. F6 não iniciada; hospedagem pública/Google real e demais gates continuam separados.
