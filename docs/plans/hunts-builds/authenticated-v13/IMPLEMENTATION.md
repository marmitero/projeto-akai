# Fase 4 — consumidores autenticados e autoridade única de eventos (V13)

Implementação e validação remota concluídas na PR23. Entrega HTTP autenticado de teste para progresso v2 e eventos, com uma única autoridade canônica por banco de ensaio. Não migra contas reais, não ativa economia v2/+16–20/monetização e não certifica capacidade de milhares de jogadores.

## Contratos

- SQL008 fixa um único realm R8 em `akai_v13_world`, imutável; operador vincula o roster existente por CLI. Identidade conta→run fica fixa e única; somente enabled permite retirar/restaurar acesso. Não há autoinscrição, escolha de sala, cópia de HP/prêmio ou reset público.
- HTTP desligado por padrão; habilitação exige `V13_HTTP_TEST=true`, `V13_TEST_DATABASE=true`, DATABASE_URL, NODE_ENV não production, API em loopback, origem local ou LAN_PREVIEW permitido, monetização off. Não habilitar em banco real. Migração cria somente tabelas vazias.
- GET `/api/v1/test-v2/state`: sessão existente, projeção permitida do próprio run/carteira/inventário/stats e ranking/HP/broadcast da autoridade canônica. Consulta econômica REPEATABLE READ READ ONLY; não liquida farm nem cria presença/recompensas. Não aceita account/run/realm em query. Contadores antiabuso HTTP continuam escrevendo seus próprios registros.
- POST `/api/v1/test-v2/events`: `{commandId,expectedRevision,action}`; action é join boss/protection, heartbeat, leave ou sync. Mesmos cookies HttpOnly, origem/CSRF, limites e envelope de erro do servidor. Clock, stats, dano e seeds nunca vêm do cliente. Tempo do evento é amostrado após os locks e limitado inferiormente pelo cursor global persistido, evitando recuo quando outro escritor avança enquanto o pedido espera.
- Resolução inicial por sessão é repetida dentro da transação R8 depois dos locks, antes de consultar recibos antigos. A sessão e a autorização do membro ficam bloqueadas em leitura durante a escrita; revogação enquanto o pedido aguarda não entrega recompensa nem recibo a sessão inválida.
- Escrita reutiliza os mesmos runs, revisões, ledger/outbox/grants/broadcast R8. Uma pool canônica, um HP e uma escada por edição, compartilhados pelas sessões admitidas; salas privadas adicionais não são selecionáveis pelo HTTP. Replay/idempotência, exclusividade v2 e rollback continuam no motor existente.
- Limite inicial permanece20participantes e snapshot até10000grants. Não é sharding público ou retenção/capacidade definitiva. A CLI privada R8 ainda serve outros ensaios, sem transformá-los em novas edições públicas. O operador deve usar somente a pool canônica neste teste autenticado.
- POST `/api/v1/test-v2/economy`: ações nativas R6 e settle sobre o próprio run, com a mesma revalidação de sessão dentro da transação. Fechamento administrativo close não é aceito. Preços, recursos, limites e RNG são calculados pelo servidor; exclusividade de evento bloqueia treino/farm simultâneo. Mercado permanece em leitura; sua escrita, arena, guilda e temporadas são etapas seguintes. A conta atual continua legada e separada; nunca somar essa carteira ao ensaio.

## Cliente

Mais → Ensaio online v2, somente no modo online quando auth/config anuncia o teste habilitado. Exibe saldo próprio, HP/qualificação, ranking e broadcast; permite torre/hunts, pausa e treino de atributos com preço visível; entra/sai do boss ou proteção e permite continuar processamento limitado. Heartbeats/atualizações acontecem apenas com a janela aberta e página visível. Fechar/ocultar interrompe a presença após o lease; GET não concede presença. Dados de nomes/mensagens usam textContent. Heartbeat/sync/settle podem atualizar uma revisão obsoleta e tentar novamente no máximo três vezes; compras/treinos/alterações de atividade não são repetidos automaticamente, preservando a decisão de preço e alvo. Observadores pausados consultam GET sem criar presença. A prévia local existente permanece independente.

## Operação em banco isolado

1. `npm run build` e migrations usuais (`npm run db:migrate -w @akai/server`).
2. Criar runs privados para as contas de teste com a CLI `economy-rehearsal-cli.js stage --account UUID`; progredir no ensaio antes dos andares exigidos (boss: torre principal100; proteção: torre principal1). Sem atribuir equipamento/fundos sintéticos a conta real.
3. `node apps/server/dist/boss-events-v8-cli.js stage --file private-run-ids.json`; roster1–20 e contas distintas.
4. `node apps/server/dist/authenticated-v13-cli.js bind --realm UUID`; depois `disable --account UUID` ou `enable --account UUID` quando necessário. O realm não pode ser substituído depois do bind.
5. Habilitar as duas variáveis de teste no `.env` do banco isolado e iniciar `servidor.bat`. Entrar com a mesma conta autenticada incluída no roster e abrir o menu. Contas não incluídas recebem403; servidor sem flags retorna404. Não criar fixtures sintéticas pelas rotas públicas.

## Validação exigida

Configuração fail-closed; sessão ausente/revogada, não membro e tentativa de escolher outro personagem; nenhuma chave seed/secret/arquivo fonte no DTO; pin de autoridade única; presença/dano autoritativos; uma morte/prêmio/broadcast entre duas sessões; replay sem duplicação; revogação enquanto aguarda lock, inclusive replay de recibo; rollback de outbox sem débito/crédito parcial; carteira legada preservada. Browser desktop/mobile em dev/build, mesmo HP e broadcast, Jade isolada, sem overflow. Campanhas V10/mercado V11/população V12 precisam continuar reproduzíveis.

## Evidência de fechamento

Candidato `f370e682ac32c6d6ff82c79bc07e9de1ff6341ac`, árvore `e18bf4710bcfb5690f8345e172b5b484a054dcd4`: CI39762989855 e Windows39762990067 aprovadas. São303testes/35arquivos com PostgreSQL16 sem skips, replays V10/V11/V12 e browser dev/preview desktop/mobile. Evidências e limites em RESULTS.md. Fechamento posterior altera somente três documentos; código validado preservado.
