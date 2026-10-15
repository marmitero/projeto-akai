# Modelo de dados proposto

Estado lógico v1; não há banco nem migrações existentes. PostgreSQL online, IndexedDB local proposto. Nomes são conceituais; schema físico definitivo será criado com migrações testadas na fase apropriada.

## Convenções e invariantes

PK opaca UUID/ULID. account_id confiável derivado da sessão. created_at/updated_at em UTC, versões monotônicas para concorrência. Quantidades em inteiros de unidade mínima com tipo amplo e overflow verificado (numeric(38,0) proposto online); API serializa como string. Frações de produção são remainder separado em unidade mínima. Não usar float para saldo, taxa ou chance.

Definições (conteúdo versionado) diferem de instâncias (propriedade do jogador). Nunca alterar retroativamente afixos de uma instância só porque um catálogo mudou. Saldo ≥0 e nível ≥limite mínimo são constraints, além da validação do domínio.

| Entidade/tabela lógica | Campos essenciais | Restrições/índices |
|---|---|---|
| Account | id, auth_subject, provider, status | Unique(provider,auth_subject); identidade externa não é nickname |
| PlayerProfile | account_id, nickname, normalized_name, account_level, account_xp, portrait_key | PK/FK conta; normalized_name único; limites de Unicode antes de normalizar |
| PlayerProgress | account_id, current_floor, highest_floor, auto_advance, version | floor 1..conteúdo disponível, highest não decresce |
| Hero | id, account_id, definition_id, level, upgrades | Dono indexado; atributos finais derivados de configuração/itens |
| ResourceBalance | account_id, resource_id, amount, version | PK composta; amount≥0; resource_id de enum versionado |
| ResourceLedger | entry_id, transaction_id, account_id, resource_id, delta, reason, source_id, balance_after | Unique(transaction,account,resource,leg); append-only, índice conta/tempo e source |
| Mine | account_id, mine_id, level, unlocked_at, settled_at, remainder, version | PK composta; watermark atualizado com crédito |
| Upgrade/Perk | account_id, definition_id, level | PK composta, limites configurados |
| ContentDefinition | kind, id, version, data, hash, active_from | PK(kind,id,version); regras antigas rastreáveis |
| EquipmentInstance | id, owner_id, definition_version, level, rarity, rolled_stats, state | Estado owned/equipped/reserved; owner e estado indexados |
| EquippedSlot | owner_id, hero_id, slot, instance_id | Unique(hero,slot), unique(instance); dono/requisitos validados transacionalmente |
| PetInstance | id, owner_id, definition_version, rarity, level, active | Identidade única; limite ativo validado sob lock |
| InventoryStack | owner_id, definition_id, quantity, version | Unique(owner,definition), quantidade≥0; item único não entra aqui |
| BattleSession | id, account_id, floor, attempt_id, state, checkpoint, seed_ref, deadline_at, version | Um escritor/lease por sessão; índice conta/estado |
| BattleEvent | battle_id, sequence, event_id, payload, occurred_at | Unique(battle,sequence), unique(event_id); retenção por tier |
| FloorProgress | account_id, floor, first_clear_at, best_attempt_id | Unique(conta,andar); first-clear grant usa source único |
| RewardClaim | source_kind, source_id, account_id, reward_version, granted_at | Unique(source_kind,source_id,account,reward_version) |
| CommandResult | account_id, command_id, type, payload_hash, result, status | Unique(account,command); persistir com efeito econômico |
| Outbox | event_id, stream, sequence, payload, published_at, retry_count | Unique event_id; índice parcial pending |
| AuditLog | id, actor_id, action, subject, reason, request_id, changes | Append-only; sem segredo/recibo bruto no payload |

## Modelos de expansão

| Domínio | Entidades e invariantes |
|---|---|
| Mercado | MarketListing(id,seller,item/stack,quantity,currency,price,expires_at,state), MarketOffer(id,listing,buyer,price,expires_at,state), MarketTransaction(id,listing,buyer,seller,total,fee). Uma compra confirmada por listing; reserva persistente; índice active/expires_at; histórico de item para cooldown de relistagem. |
| Premium | Purchase(id,account,provider,provider_transaction,status,product,grant_transaction); unique(provider,provider_transaction). Ledger de ruby usa ResourceLedger com razões e controles premium; não manter segundo saldo concorrente. |
| Boss global | GlobalBossEvent(id,edition_key,state,hp,start/end), GlobalBossContribution(event,account,damage), GlobalBossLastHit(event,account). edition_key e last-hit por evento únicos. |
| Temporários | FlashEvent(definition,edition,start/end,state), PlayerBuff(account,source,start/end,modifier). Execução por edição única; claim separado. |
| PvP | PvPMatch(id,attacker,defender,snapshot_version,result), PvPRating(account,season,position,trophies), TrophyLedger(match,account,delta). Posição única por temporada com atualização serializada e estratégia de swap. |
| Guildas | Guild(id,name,level,emblem_version), GuildMember(guild,account,role,joined_at), GuildInvite(guild,account,expires_at), GuildEmblem(guild,version,palette,pixels), GuildWar(id,season,state,config). Um vínculo de guilda ativo por conta. |
| Social/ranking | ChatMessage(id,channel,author,text,created_at,moderation_state), RankingSnapshot(season,type,account,score,rank,captured_at). Histórico e snapshots separados de saldo real. |

Convites, buffs, perks e definições de boss/pet/equipment são incluídos para representar os conceitos do Master Prompt sem uma tabela vazia por nome. Separar tabelas específicas quando consultas/constraints justificarem.

## Transações críticas

Compra de upgrade bloqueia saldos em ordem de resource_id, valida requisitos/versões, debita, atualiza nível, registra ledger/command/outbox e confirma junto. Compra de mercado bloqueia anúncio, reserva e contas em ordem estável; transfere item/débitos/créditos/taxa e encerra ofertas elegíveis na mesma transação. Não permite saldo negativo ou vendedor comprar anúncio próprio. Batch de listing empilhável precisa de escrow por quantidade, não apenas booleano no ícone.

Reconcile de mina bloqueia watermark e saldo; crédito e novo settled_at são atômicos. Recompensa de morte associa source à tentativa e enemyInstanceId, não só floorId. Último golpe global é inserido com chave única sob serialização do HP. Season closure usa edição única e claims idempotentes.

## Save local e migrações

Envelope proposto: schemaVersion, configVersion, savedAt, generation, profile, progress, balances, mines, upgrades, battleCheckpoint, RNG local e checksum para corrupção acidental. Checksum não é anticheat. Não armazenar classes/objetos gráficos. Gravar snapshot novo e referência atual em transação; manter anterior recuperável. Migrações puras N→N+1 com fixtures; versão futura desconhecida não é sobrescrita automaticamente. Export/import de save é somente local e precisa de validação de tamanho/schema.

## Privacidade, retenção e recuperação

Proposta inicial: eventos detalhados de batalha 7 dias e logs operacionais 30 dias em ambientes de teste; duração final depende de custo/privacidade. Histórico financeiro, ledger e auditoria precisam de política específica, acesso restrito e revisão de obrigações aplicáveis antes do online público. Não há prazo legal presumido. Exclusão de conta precisa anonimizar dados sociais e desvincular identidade preservando somente registros legitimamente necessários. Backup/restore e migração reversível/compatível devem ser testados antes de produção; metas RPO/RTO em OPERATIONS são propostas.
