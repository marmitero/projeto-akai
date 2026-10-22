# Contratos API — implementação F5 e desenho futuro

A F5 instala as rotas abaixo quando DATABASE_URL está configurado e o schema foi migrado. Sem banco configurado, /health continua diagnóstico onlineGameplay=false e /api/v1/* retorna503. A descrição posterior é o desenho inicial: rotas específicas antigas não foram instaladas em paralelo ao envelope único. [ONLINE](ONLINE.md) e os schemas executáveis prevalecem para esta versão.

## Contrato instalado na F5

| Método /api/v1 + rota | Entrada | Saída |
|---|---|---|
| POST /auth/guest | {} | accountId/recoveryKey e cookie HttpOnly |
| POST /auth/recover | recoveryKey | Chave rotacionada, cookie novo, sessões anteriores revogadas |
| POST /auth/logout | {} | Revogação e expiração do cookie |
| GET /auth/config | — | googleClientId público ou null |
| POST /auth/google/nonce | {} + sessão | Nonce de vinculação pertencente à conta |
| POST /auth/google/link | idToken + sessão | linked=true; não mescla contas |
| POST /auth/google/login/nonce | {} | Nonce independente para entrar |
| POST /auth/google/login | idToken | Cookie para identidade já vinculada |
| GET /bootstrap, GET /state | Sessão | OnlineState: snapshot, stateVersion, commandVersion, serverTime |
| POST /commands | OnlineCommand | Resultado aplicado/recusado persistido |
| GET /commands/:id | UUID da própria conta | Resultado ou404 |
| POST /presence/away | {} + sessão | Liquidação e presença encerrada |
| GET /events?after=N | Cursor >=0 | Até100 eventos próprios ordenados |
| GET /stream | Upgrade WebSocket + cookie + Origin | Snapshots confirmados a cada segundo |

Todos os HTTP /api/v1 exigem X-Akai-Client:1; mutações exigem Origin igual a PUBLIC_ORIGIN. WebSocket exige Origin exato. Não há CORS aberto. JSON máximo16KB, comandos strict sem campos adicionais. UUIDs são account-scoped quando se trata de commandId; itens item-N são account-scoped, nunca globais.

Exemplo instalado:

```json
{"commandId":"a7ecb023-86a0-4cb3-bbbc-6995340aa80f","expectedVersion":0,"action":{"type":"mining.click"}}
```

Ações: mining.click; upgrade com kind=attack/vitality/click/coal; battle com action=pause/resume/retry/train; rpg com command validado por RpgCommandSchema. expectedVersion é commandVersion, não stateVersion. Não há Idempotency-Key alternativo HTTP nesta implementação; commandId do envelope é a única chave. Replay devolve o mesmo CommandResult; não inclui snapshot antigo. Cliente então consulta /state. Campo rng nunca sai do servidor.

CommandResult tem commandId, status=applied/rejected, code, stateVersion e commandVersion. Recusas de domínio são esse resultado (422 pré-condição,409 versão,429 limite); erros anteriores à aplicação usam envelope error estruturado (400 schema,401 credencial,403 CSRF/origem,404 dono/rota,409 payload divergente,429 abuso,500 interno sem detalhes). Retry-After acompanha429. Reenvio de comando recusado continua recusado; corrigir a intenção exige novo UUID após ler estado.

Snapshot possui mode=online, profile.id UUID da conta e rpg sem rng. A forma interna compartilhada do domínio usa LocalSnapshot sem permitir importação remota; adaptador de leitura do cliente adiciona placeholders apenas para reutilizar renderer, sem simular ou salvar esse perfil em IndexedDB. O estado nunca vem do cliente.

## Referência de desenho inicial e expansões futuras

## Convenções e autenticação

Base planejada `/api/v1`. HTTPS em ambientes públicos. Sessão autenticada validada no servidor, com issuer/audience/expiração e revogação; estratégia cookie/token depende do provedor no ADR da F5. Se cookies forem usados, proteção CSRF e SameSite apropriados são obrigatórias. Nunca transmitir token em query string de WebSocket. Credencial/ticket de conexão curto e de uso único é proposta a validar.

Quantidades econômicas são strings decimais inteiras em unidade mínima (`"1234"`), nunca float JSON. IDs UUID/ULID opacos; datas RFC3339 UTC. TTL e prazos são do servidor. `configVersion` identifica regras; `stateVersion` é inteiro monotônico por agregado, não timestamp do dispositivo.

### Envelope de comando

```json
{
  "commandId": "uuid",
  "expectedVersion": 42,
  "type": "upgrade.purchase",
  "payload": {"upgradeId": "mining.click", "quantity": 1}
}
```

`commandId` também pode ser a Idempotency-Key do HTTP; rejeitar divergência entre os dois. Chave é escopada por conta e tipo; mesmo ID com payload diferente → 409 IDEMPOTENCY_CONFLICT. Não reexecutar automaticamente uma compra com nova chave após timeout. Consultar o resultado pela chave original.

Resposta planejada:

```json
{
  "commandId": "uuid",
  "status": "applied",
  "stateVersion": 43,
  "serverTime": "2026-10-15T12:00:00Z",
  "events": [],
  "delta": {"resources": {"iron": "-100"}}
}
```

`delta` é resultado calculado pelo servidor, nunca entrada de saldo. Comandos rejeitados não debitam nada. Erro: `{error:{code,message,retryable,requestId}, stateVersion?}`. Não expor stack trace ou SQL. Resposta de auth 401, permissão 403, schema 400, conflito 409, pré-condição/economia 422, limite 429 com Retry-After, falha transitória 503.

## Rotas planejadas de fundação/loop

| Método e rota | Entrada | Resultado/regras |
|---|---|---|
| GET /bootstrap | Sessão | Perfil, recursos, progresso, minas, catálogo autorizado, configVersion, stateVersion e cursor de eventos |
| GET /state | Cursor opcional | Snapshot confiável; usar após gap/reconexão |
| GET /commands/{commandId} | Sessão | Resultado da própria conta ou 404; não revelar comandos de terceiros |
| POST /mining/click | commandId, expectedVersion, mineId=iron | Um toque; servidor calcula ganho e rate limit. Não aceita amount nem elapsed do cliente |
| POST /upgrades/purchase | upgradeId, quantity inicialmente 1, versões/chave | Debitar custos e elevar nível na mesma transação |
| POST /mines/unlock | mineId | Validar pré-requisitos e custo; já desbloqueada não cobra de novo |
| POST /battle/control | action=pause/resume/retry, battleId | Retry só em falha elegível, sem ação de dano enviada pelo cliente |
| POST /equipment/equip | instanceId, slot | Validar dono, reserva, requisitos e conflito de duas mãos |
| POST /production/reconcile | commandId | Intervalo e cap obtidos do servidor; grant único e watermark atômico |

A semântica exata de expectedVersion por comando é do agregado afetado. Não usar uma única versão de toda a conta para bloquear cliques por cada tick de batalha. Snapshot contém versões de economy, inventory, progression e battle; a rota valida a pertinente. Conflito retorna versão e instrução de ressincronizar; o cliente preserva o commandId para retry do mesmo intento.

## Rotas futuras por domínio

Mercado: criar anúncio, cancelar, comprar, fazer/aceitar/rejeitar oferta; IDs de item e preço/quantidade, nunca saldo final. PvP: listar elegíveis e solicitar desafio, sem resultado fornecido. Guilda: criar/entrar/convidar/aceitar/sair/alterar cargo e brasão, todas com permissão por ação. Eventos: listar edição, participar e obter status de claim; dano validado pelo domínio. Compras: enviar comprovante pelo fluxo autorizado e consultar status; webhook do provedor tem assinatura e deduplicação. Chat: enviar texto com limites e receber cursor; nenhuma imagem arbitrária no brasão. Definir schemas completos e autorização antes de liberar qualquer rota dessas áreas.

## WebSocket e reconexão

Envelope de evento: `{eventId, stream, sequence, type, occurredAt, configVersion, payload}`. Eventos previstos: battle.started, battle.damage, enemy.defeated, battle.failed, floor.completed, resource.changed, mine.updated, inventory.changed, event.updated e notification.created. O stream é autorizado por conta/edição; jamais assinar conta arbitrária.

Proposta de recuperação: conectar com ticket → enviar último cursor → servidor reenvia janela retida; cursor expirado/gap exige snapshot → aplicar snapshot em versão V → consumir somente eventos posteriores. Deduplicar eventId e ignorar sequence já aplicada. Não reproduzir grant econômico pelo fato de reproduzir animação. Cliente mostra reconectando e bloqueia comandos econômicos quando não pode confirmar o resultado; só impacto visual do toque pode ser antecipado.

Limites iniciais propostos para testes: payload HTTP 16 KB em comandos comuns, chat 500 caracteres, brasão 16×16 com paleta limitada, heartbeat 15s e timeout 45s. Valores exigem validação de carga/UX; não são configuração instalada. IP é camada adicional ao limite por conta, nunca substituto de identidade.

## Evolução e contrato

Mudança compatível adiciona campo opcional; mudança de significado/tipo exige nova versão ou negociação. Clientes incompatíveis recebem UPDATE_REQUIRED. Não emitir preços/configurações futuras ao cliente como se fossem catálogo ativo. Testes de contrato devem verificar schema, erro, auth, idempotência e perda/reordenação de eventos. Nenhum teste de API foi executado nesta entrega documental.

## Atualização F6 — 15/10/2026

F6 instala GET /api/v1/community e POST /api/v1/community/commands sob os mesmos cookies/Origin/header da F5. Envelope {commandId,action}, schemas strict em shared/community.ts, sem expectedVersion global: seleção/vagas/permissões são revalidadas sob lock social. CommunityResult retorna commandId/status/code; recusas persistem para retries, conteúdo alterado com mesmo UUID409. Ações: profile,chat,block,report,guild.create/invite/accept/leave/role/emblem/upgrade,arena,boss(join/leave),raid,war.enroll/attack. Snapshot inclui chat permitido, vínculo/convites, arena/matches, eventos, rankings, arquivos e recompensas, sem segredos ou RNG. Rotas de moderação/iniciar evento não existem para jogadores; CLI operacional separada. Limites/eligibilidade em COMMUNITY_SYSTEMS; blueprint social antigo acima não é lista de outras rotas instaladas.

## Atualização F7 — mercado

- GET `/api/v1/market?kind=item|resource&currency=coin|iron|coal|gold|jade&offset=0`: filtros opcionais, página de 50, `hasMore`; também retorna inventário anunciável, saldos, pendências próprias, ofertas privadas, cooldowns e últimas 50 transações. Sem RNG ou dados de sessão. Offset inteiro entre 0 e 5.000.
- POST `/api/v1/market/commands`: `{commandId:UUID,action}`, strict, 30/min/sessão. Ações `list.item(itemId,price,currency)`, `list.resource(resource,quantity,price,currency)`, `buy/cancel/claim(listingId)`, `offer(listingId,price,currency)` e `offer.accept/reject/withdraw(offerId)`. Preço/quantidade são strings de unidades mínimas, não valores já abreviados da UI. Exemplo: 1,125 ferros = `"1125"`.
- Resposta `MarketResult`: commandId/status/code e listingId quando aplicável. Domínio rejeitado HTTP422 (permissão403), sem efeitos econômicos; resultado persiste. Conflito de payload no mesmo UUID é recusado. Erros inesperados revertem a transação e são retryáveis com o mesmo UUID. Sem `expectedVersion`: anúncio, oferta e ambos os perfis são revalidados sob locks.

Ruby e campos arbitrários de saldo/itens são recusados pelo schema. Proteções de sessão, Origin, header CSRF e limite HTTP continuam as da F5. Moderação é CLI auditada; nenhuma rota `/market/admin`. Contratos exatos em shared/market.ts, regras em MARKET_SYSTEMS.

## Atualização F8 — premium de teste

GET `/api/v1/premium` retorna modo off/sandbox/google-play-test, catálogo experimental sem preço real, accountBinding ofuscado, intenções próprias, estado de entrega, entitlements/benefícios e Ruby/dívida. Não retorna token, cipher, chave ou credential. POST `/api/v1/premium/commands` recebe união strict com commandId: `purchase.intent(productId)`, `purchase.verify(intentId,purchaseToken)`, `intent.cancel(intentId)`, `restore`, `ad.intent(reward)`. Taxa20/min/sessão, mesmas proteções Origin/CSRF/cookie da F5. Fonte/grant é por recibo, além da idempotência por comando; não há grant booleano/quantidade arbitrária.

Somente modo sandbox instala POST `/api/v1/premium/sandbox` com `{intentId}`: emulador explícito,12/min/sessão, compra de teste assinada ou recompensa após5s do servidor. Fora do sandbox essa rota é404. Não é callback Google/AdMob nem processamento de pagamento real. Sem webhook RTDN/SSV público nesta entrega. Transporte nativo e credenciais dependem do gate externo descrito em MONETIZATION_SYSTEMS.

### Identidade compacta do cabeçalho (polimento P2)

`GET /api/v1/community/identity`, com a mesma sessão/header de leitura, devolve `{name,guild?}` apenas da conta autenticada. É uma leitura sem concessões, criação de perfil ou atualização de presença: não avança combate nem renova boss/raid. O cabeçalho consulta a cada15s enquanto visível; a comunidade aberta conserva seu fluxo próprio. Alteração de nick continua usando o comando `profile` idempotente existente. Não há novo armazenamento de saldo, endpoint administrativo ou migração.

## V13/V14 — ensaio autenticado isolado

Rotas abaixo existem somente com V13_HTTP_TEST/V13_TEST_DATABASE e banco isolado local/LAN não production. Não substituem as rotas legadas acima nem migram saldos.

- GET `/api/v1/test-v2/state`: sessão determina conta/run; DTO próprio, eventos e mercado canônicos. Economia em transação REPEATABLE READ READ ONLY, sem presença ou ganhos. Sem parâmetros de conta/run/realm. Mercado: anúncios públicos elegíveis e resgates próprios, ofertas/histórico somente das partes; IDs privados de run/realm não são transmitidos. Expiração projetada pelo relógio do servidor.
- POST `/api/v1/test-v2/events` e `/economy`: envelope strict `{commandId,expectedRevision,action}`; intenções nativas de evento e economia, sem close administrativo. Conflitos retornam recibos rejeitados; valores, tempo, dano e RNG são autoritativos.
- POST `/api/v1/test-v2/market`: mesmo envelope e regras MarketV2CommandSchema. `list.item`, `list.resource`, `buy`, `offer`, `offer.accept/reject/withdraw`, `cancel`, `claim`, `sync`. Preço/quantidade são strings de milésimos; somente Coin precifica, materiais carvão/ferro/ouro. Conta/run/mercado derivam da sessão e dos pins fixados pelo operador; nenhum ID de ator/realm no payload. Mercado precisa de bind-market com roster exatoV13 de2–20runs.

Mesmos cookies HttpOnly, Origin/header CSRF e limites HTTP; comandos v2 compartilham limite60/min/sessão. Escritores revalidam sessão após locks e antes de replay. Aplicado e processamento parcial retornam recibo; recusa de domínio422 com commandId/status/code, conteúdo divergente no mesmo UUID409; erros de autenticação401/403. Sem pin de mercado409; flags off404. Backlog confirma progresso limitado, sem executar a compra/anúncio; nova intenção somente após concluir e revisar. Resposta desconhecida deve repetir o mesmo UUID/payload. Uma recusa stale exige atualização e nova decisão, sem compra automática.

Operação/limites em [authenticated-market-v14/IMPLEMENTATION.md](plans/hunts-builds/authenticated-market-v14/IMPLEMENTATION.md). Economia real, +16–20 e monetização continuam desativados.

### Arena autenticada V15 (ensaio)

`GET /api/v1/test-v2/state` inclui `arena`: semana/revisão/clock, elegibilidade, própria posição/troféus, classificação pública, até cinco oponentes acima, cooldown, quota móvel e últimos50duelos próprios. Somente leitura; sem seeds/stats/run IDs alheios.

`POST /api/v1/test-v2/arena`: `{commandId,expectedRevision,arenaRevision,seasonId,action}`; `action:{type:'enroll'}` ou `{type:'challenge',opponentId:UUID público}`. Sessão/CSRF/flags V13 obrigatórios. Recibos applied/rejected/settling, replay idempotente,409UUIDreusado,422recusa de domínio. Sem recompensas econômicas. Contrato e operação em [V15](plans/hunts-builds/authenticated-arena-v15/IMPLEMENTATION.md).

### Guildas autenticadas V16 (ensaio)

GET /api/v1/test-v2/state inclui guilds: revisão/cursor, guilda própria/membros/brasão/nível/XP/custos, diretório público, convites próprios, convites enviados/candidatos administrativos e chat privado pós-ingresso. Sem runs, seeds ou carteiras de terceiros; GET não inscreve, liquida farm ou concede XP.

POST /api/v1/test-v2/guilds aceita {commandId,expectedRevision,guildRevision,action}, ações create(name), invite(accountId), accept/decline(guildId), revoke(accountId), leave, role(accountId,role), emblem(pixels256), upgrade, chat(text). Sessão/CSRF/flags V13; applied/rejected/settling,422domínio,409UUIDreusado, replay durável. Ator/guilda própria/custos/XP/tempo são determinados pelo servidor. [Contrato/operação](plans/hunts-builds/authenticated-guilds-v16/IMPLEMENTATION.md).
