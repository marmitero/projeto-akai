# Contratos de API propostos — v1

Nenhum endpoint existe atualmente. Este documento é contrato de implementação futura, não documentação de serviço disponível. Local usa adaptador em memória/IndexedDB com semântica equivalente de comandos, sem chamar endpoints fictícios.

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
