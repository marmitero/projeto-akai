# Relatório Fase 5 — online autoritativo

15/10/2026. **Concluída e publicada na main, com CI aprovada no escopo de desenvolvimento.** Base F4: `eaaeb9d283bd57a046cd0cabd2dd282aaa891e3b`. Escopo desta entrega: ambiente de desenvolvimento reproduzível, sem contratar hospedagem, provisionar contas ou publicar um serviço de jogadores.

## O que foi feito

- Servidor autoritativo de combate, mineração, produção, upgrades e RPG; tempo e sorteios calculados no servidor. Perfil online nasce do zero e não importa save local.
- PostgreSQL com migração, lock por conta, snapshot validado, ledger/outbox append-only e resultado idempotente na mesma transação. Separação entre versão de comando e sequência de estado. Reconciliação ledger/saldos por CLI, sem reparo silencioso.
- Convidado com chave de recuperação rotacionada, cookie HttpOnly e revogação de sessões. Integração Google com verificação criptográfica/claims/nonce, vinculação sem fusão de saldo e entrada em identidade já vinculada. Provedor permanece desabilitado sem configuração.
- Cliente online reutiliza telas/assets da F4 com snapshots confirmados, WebSocket, bloqueio durante falta de conexão/resultado pendente e retry com o mesmo UUID. Logout e recuperação em outro navegador. Modo local continua disponível e isolado.
- Schemas strict, CSRF/origem, limites persistidos de cliques/HTTP/auth/streams, expiração e backpressure. Compose de desenvolvimento e CI com PostgreSQL16.

## Evidências e critérios

| Critério | Verificação |
|---|---|
| Base preservada |45testes/hashes/typecheck/builds da F4 revalidados antes de alterações |
| Domínio/persistência |66testes, sendo20 integração PostgreSQL e1JWT além45anteriores; contagem total inclui testeJWT como um caso |
| Replay/concorrência |100reenvios do mesmo comando por dois pools/serviços → um comando/crédito/ledger/evento;20intenções na mesma versão → uma aplicada |
| Rollback real | Falha SQL injetada na gravação do outbox após ledger reverte débito/crédito/estado/resultado; retry posterior aplica uma vez |
| Economia/RPG | Custos sem alteração parcial, craft/equip/enhance persistidos, inventário estrangeiro recusado, overflow/limites do domínio compartilhado |
| Abuso/identidade | Payload forjado, CSRF/origin, IDOR, sessões expiradas/revogadas, bucketpersistido e leases de stream |
| Tempo | Minas8h uma vez, sem combate offline; boss expira, relógio retrocede sem voltar watermark |
| Google | JWTs assinados: assinatura/aud/iss/exp/idade/nonce; prova controlada de vinculação/login/replay/conflito. Não é login real com conta Google |
| Navegador local | Dev/produção,50ciclos,35texturas/38objetos, layout320/360/390/768/844, fluxosF4 e falha fechada sem API |
| Navegador online | Dev/produção: convidado, mineração, HttpOnly, semsaveIndexedDB, reload, resposta perdida sem crédito duplo, restart, recuperação em outro contexto, revogação e logout |

Dados dos smokes: [desenvolvimento](phase5-browser-dev.json), [produção](phase5-browser-preview.json). Captura de produção sem credenciais: [Mina online390px](phase5-screenshots/online-mine-390.png).

Ambiente local: Node24.19, Chromium153 e PostgreSQL nativo18.4 isolado no contêiner; a implantação reproduzível e a CI usam imagem oficialPostgreSQL16. O harness local precisou adaptar identificação de usuário do runtime de teste porque o contêiner mapeia somente UID0; esse ajuste não integra o projeto, o Compose ou a CI, e não é modelo de implantação. As provas usam banco real, sem emulador de locks/transações. Não foi executado novo soak30min nem carga de escala comercial nesta fase.

## Decisões autônomas

PostgreSQL sem serviço pago, cookie opaco/convidado recuperável, Google por configuração, transações por conta sem worker de batalha em memória, versões separadas, presença3s/snapshot1s e recuperação por snapshot. Limite2streams/conta, bucket10cliques/s/burst10; um comando pendente por cliente e nenhum saldo otimista. Custos/regras RPG preservados. Sem mudança de pilar, preço real ou gasto. Motivos e consequências em [ADR-009](ADR/0009-authoritative-online.md).

## Documentação

AI_STATE, roadmap, README/índice, arquitetura, API, modelo de dados, segurança, operação, testes, decisões, GDD e rastreabilidade atualizados; [ONLINE](ONLINE.md) contém execução, configuração, permissões e limites. Documentos/soaks históricos F3/F4 preservados; sprites originais intactos.

## Pendências e próximo passo

Nenhuma decisão obrigatória do usuário para concluir a entrega técnica de desenvolvimento. **Antes da ativação pública:** infraestrutura persistente eHTTPS/WSS com orçamento aprovado se houver gasto; client ID/originsOAuth e testeGoogle real; políticas/aceites do titular; backups/restauração, observabilidade/retenção e carga em staging. Licenças, playtest humano de ritmo e aparelhos reais continuam pendentes antes da distribuição. Não chamar esse ambiente de lançamento público ou de segurança auditada.

Próxima fase técnica recomendada: **F6 — comunidade**, com especificação de chat/moderação, guildas, PvP/rankings/eventos conforme roadmap; não iniciada nesta entrega. A ativação pública pode ser preparada em paralelo, sem contratar serviços sem autorização.

## Publicação e CI

O bloqueio anterior de publicação foi resolvido pela autorização explícita do usuário em15/10/2026. Implementação integrada à main em [364384b](https://github.com/marmitero/projeto-akai/commit/364384b3313ddbc99b44d569b6c77d6424e2baa5). Árvore remota2d8eda31cfa54c219af3473e41dae9a8e6dc88f3 conferida como idêntica ao conteúdo revisado localmente.

[CI38792734890](https://github.com/marmitero/projeto-akai/actions/runs/38792734890): success, com PostgreSQL16 real, npm ci, testes/typecheck/builds/hashes, duas simulações e smokes de navegador local/online em desenvolvimento/produção. Esta atualização final registra os resultados e não modifica a implementação validada. Não há validação obrigatória do usuário agora; gates de ativação pública acima permanecem abertos. F6 não iniciada.
