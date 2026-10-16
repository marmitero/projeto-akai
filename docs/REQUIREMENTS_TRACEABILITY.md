# Rastreabilidade de requisitos

Cada linha mapeia a intenção do Master Prompt a regra, fase e evidência de aceite. F1–F3 implementam fundação, apresentação e loop local20 andares. Evidência atual em STAGE_03_REPORT/MVP_ACCEPTANCE; linhas online/RPG ainda não representam implementação.

| ID | Requisito | Especificação | Fase | Evidência / gate |
|---|---|---|---|---|
| NAV-01 | Três telas/HUD persistente | UI_UX, ADR-002 | F2 | M02/M03/M12 |
| ART-01 | Sprites reais, inventário e preservação | Asset_Manifest, Asset_Usage_Guide, Visual_Catalog | F0/F2 | Hashes + prévias + pivôs aprovados |
| ART-02 | Licenças e consistência | ART_BIBLE, ASSET_LICENSES | F0/Release | Zero arquivo distribuído sem licença adequada |
| CBT-01 | Automático, 3×3, 1.000 andares planejados | GDD, BALANCE | F3/F4 | M07 + simulação/dados completos |
| CBT-02 | Boss a cada dez, timer, pausa e retry | GDD, BALANCE | F3 | M08/M09 |
| MIN-01 | Ferro 1/clique e upgrades | ECONOMY, BALANCE | F3 | M04/M05 |
| PRD-01 | Carvão/ouro/jade; carvão50 para ouro | GDD, ECONOMY | F3/F4 | M06 + teste de requisito |
| OFF-01 | Offline controlado e idempotente | ADR-003, DATA_MODEL | F3/F5 | M10/M11 + crash/replay |
| RPG-01 | Equipamentos/raridades/drops | GDD, DROP_TABLES | F4 | Slots/dono/pool/estatística |
| RPG-02 | Pets/habilidades/fabricação | GDD, DECISIONS | F4 | Definições completas + custos/buffs/receitas |
| EVT-01 | Boss global 22h Brasília | GDD, OPERATIONS, DATA_MODEL | F6 | Edição e último golpe únicos |
| EVT-02 | XP/loteria/raid | GDD, DROP_TABLES | F6 | Elegibilidade/expiração/claim único |
| AUTH-01 | Google/convidado, rei e nickname | GDD, SECURITY, DATA_MODEL | F5 | Identidade/uniqueness/vínculo seguro |
| NET-01 | Cliente/servidor separados e autoritativos | ARCHITECTURE, API, ADR-001 | F1/F5 | Contratos + adulteração rejeitada |
| SEC-01 | Economia/transações/concorrência | SECURITY, ECONOMY | F5 | Replay/rollback/locks |
| MKT-01 | Leilão/mercado/ofertas/taxas/prazos | GDD, ECONOMY, DATA_MODEL | F7 | Compra simultânea e escrow |
| PVP-01 | Cinco adversários, posição/troféus | GDD, DECISIONS | F6 | Regras finais + concorrência |
| GLD-01 | Guilda/cargos/brasão/guerra | GDD, DECISIONS | F6 | Permissões/capacidade/edição |
| RNK-01 | Rankings e fechamento semanal | GDD, DATA_MODEL, OPERATIONS | F6 | Snapshot/season/claim |
| MON-01 | Compras e anúncios voluntários | GDD, SECURITY, RELEASE_CHECKLIST | F8 | Provedor sandbox + grant único |
| AND-01 | Android desacoplado | ARCHITECTURE, RELEASE_CHECKLIST | F9 | Dispositivos/ciclo/SDKs verificados |
| OPS-01 | Observabilidade/backup/debug | OPERATIONS, SECURITY | F5/Release | Restore/alertas/permissões |
| QA-01 | Testes, desempenho e pronto | TEST_PLAN, PERFORMANCE, MVP_ACCEPTANCE | Todas | Comando/ambiente/resultado reais |
| PAUSE-01 | Documentar e aguardar | Constituição, AI_STATE | Histórico | Pausa documental superada por autorizações F1/F2/F3; sem serviços provisionados |

Nomes na coluna Especificação correspondem ao índice em README. Pendência numérica/funcional não pode ser fechada por um teste que apenas reproduza um placeholder; resolver regra e depois validar o comportamento.

F3: CBT-01 até20 (1.000 segueF4), CBT-02, MIN-01, PRD-01 somente carvão e OFF-01 local implementados/testados. NAV-01/ART-01 têm subset e capturas reais; ART-02 permanece pendente de licença. Segurança online/mercado/social/premium/Android não foram antecipados.

F4:RPG-01 implementado localmente em14 categorias/9 slots/raridades/afixos/drops; RPG-02 emForja/Musgo/tônicos, habilidades avançadas/recrutamento continuam expansão. PRD-01 inclui ouro/jade, com carvão50. CBT-01 alcança catálogo1.000/fixture numérica, não1.000 mapas/playtest completo. OFF-01 inclui buffs por intervalo e migração2→3. Evidências em STAGE_04_REPORT/RPG_SYSTEMS; linhas online/social/premium/Android mantêm seus gates.

## Evidência instalada na F5

| Requisito | Implementação | Verificação |
|---|---|---|
| Identidade e isolamento local/online | online-session.ts, routes.ts, google.ts | Convidado/recuperação/IDOR; Google JWT/nonce; sem importação local |
| Autoridade econômica | online.ts, domínio compartilhado com RNG injetado | Schema/payload, tempo do servidor, compras/RPG, limite de cliques |
| Persistência e efeito único | database.ts,001_online.sql | PostgreSQL real,100replays, versões concorrentes, rollback e ledger |
| Reconexão | /state, /events, /stream e cliente | Resposta perdida, mesmo UUID, restart, cookie/revogação |
| Operação | Compose, health, migração e reconciliação | Build/CI; implantação pública/OAuth real pendentes |

## Evidência implementada F6

| Requisito | Implementação | Verificação |
|---|---|---|
| Chat e moderação | community.ts/ui/community.ts/community-admin.ts | LiteralXSS,bloqueio,denúncia,muteCLI,semrotaadmin |
| Guildas/brasões | schemas/actions/migração002 | Roles,convites,vaga concorrente,limites,paleta e persistência |
| Arena/rankings | community-domain.ts/service | Cinco reais,stats,match único,posições/troféus/cooldown/24h |
| Temporadas | community-events.ts | CalendárioBrasília,arquivo,prêmio único,bônus expira |
| Boss/relâmpagos/guerra | scheduler/claims/ledger | Últimogolpe,presença,loteria,raid,roster e rollback |
| Integração | smoke-community.mjs | Dev/produção,dois perfis,UI/reload/responsividade |

## Evidência implementada F7

| Critério | Implementação | Evidência |
|---|---|---|
| MKT-01 reserva/compra/oferta/taxas | shared/market, MarketService, migração003 | market.test: compra dupla, replay, compra×aceitação, conservação e rollbackoutbox |
| Expiração/relistagem/recuperação | prazo72h, claim, procedência e cooldown24h | Limites exatos, restart, mochila cheia, split/merge de recurso |
| Histórico/moderação/abuso | trades/audit/commands append-only, CLI, auth/rate/suspensão | IDOR, sem adminHTTP, operador real, triggers e payloadstrict |
| Interface | Mais→Mercado, sprites existentes, revisão e pendingpersistido | phase7-browser-dev/preview: resposta perdida+reload, oferta, compra, resgate,30ciclos,320/390/768 |
| Parâmetros econômicos | market-1/ADR-011/MARKET_SYSTEMS | phase7-economy-simulation; sem alegação de equilíbrio humano |

Itens não elegíveis atuais: mascote de conta Musgo, skins não implementadas e Ruby desabilitado por D15; não apresentados como negociáveis.

## Evidência técnica F8

| Critério | Entrega | Limite |
|---|---|---|
| Catálogo premium | Quatro pacotes e entitlement cosmético experimentais, sem preço real | Poder permanente/baús pagos/conversão sem ativação |
| Compra/recibo | PurchaseProvider, sandbox assinado, GooglePlayTestProvider, token cifrado/único | API Google exercitada por mock HTTP; conta externa/nativo pendentes |
| Concessão/restore | Transação grant+ledger+outbox, ack/consume após commit, backoff por recibo | Restore50/lote; descoberta nativa de tokens depende de F9 |
| Estorno | Revogação por fonte, Ruby disponível/dívida, entitlement removido | Ruby ainda não possui gasto de produto ativo |
| Recompensas voluntárias | Quatro tipos com intervalos, limites, presença e expiração exata | Simulador local, não comprovação de anúncio real |
| AdMob SSV | Verificador puro ECDSA DER/raw query com chaves de fixture | SDK/transporte/rotação/unidade e callback real pendentes |
| Isolamento | Off padrão, loopback/test-only, banco marcado, sem modo produção | Não promove banco teste para normal |

Evidência em STAGE_08_REPORT/phase8-*.json; não declarar F8 externamente homologada por haver testes locais.
