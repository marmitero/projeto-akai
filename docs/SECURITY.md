# Plano de segurança e fronteiras de confiança

Modelo de ameaças inicial, sem código auditado. Não representa conformidade ou segurança implementada. Aplica-se ao online; save local é modificável pelo usuário e nunca prova de saldo online.

## Ativos, ameaças e controles exigidos

| Ameaça | Controle de projeto | Evidência de aceite |
|---|---|---|
| Cliente forja dano/saldo/drop/tempo | Domínio no servidor, tempo confiável, RNG no servidor | Payload adulterado não altera economia |
| Replay/timeout concede duas vezes | CommandId + hash do payload + unique claim + transação | Cem retries = um efeito |
| Duas compras do mesmo item | Reserva persistente, lock/constraints, transferência atômica | Concorrência gera um comprador e débito único |
| Acesso a conta/item de outro | Owner derivado de sessão, autorização por ação | Testes IDOR em todas as rotas |
| Cliques automatizados impossíveis | Limite por conta, burst controlado, elegibilidade e telemetria | Ganhos não excedem limite; erro previsível |
| Refresh/reconexão reinicia boss | BattleSession/deadline persistidos, retry manual | Timeout não pode ser evitado trocando tela |
| Múltiplos workers duplicam evento | Lease com fencing, edição única, outbox/claims | Crash/restart não repete prêmio |
| Compra/anúncio falsificado | Validação confiável de provedor, assinatura, grant único | Recibo inválido/reutilizado rejeitado |
| XSS/chat/brasão malicioso | Texto escapado, limites, paleta/grade fechadas, CSP | Nenhum HTML executado nem SVG arbitrário |
| Debug exposto | Build flags e permissão administrativa no servidor | Usuário comum recebe 403; sem segredo no bundle |
| Vazamento por logs | Redação de auth/PII, requestId e razões estruturadas | Revisão de logs sem tokens/recibos |

## Identidade e sessões

Validar tokens com biblioteca mantida e configuração explícita de issuer/audience/algoritmo; não aceitar token só por decodificar. Rotacionar credenciais, revogar sessão suspensa, proteger vinculação convidado→Google por prova das duas identidades. Não mesclar duas contas com saldo automaticamente. Proposta: uma sessão de escrita econômica por conta; outras podem ler ou receber SESSION_REPLACED. Decisão/teste necessários em F5.

Cookies exigem CSRF; bearer exige armazenamento e ciclo de renovação seguros e prevenção de XSS. CORS allowlist não é autorização. WebSocket exige autenticação no handshake, autorização de streams, expiração/revalidação e limites de tamanho/frequência.

## Mineração, RNG e abusos

Proposta de teste: até 10 cliques aceitos/s com burst de 10 por conta; confirmar acessibilidade/UX e não usar esse número como promessa de anticheat. Autoclick autorizado é job calculado pelo servidor e não aumenta o limite de mensagens do jogador. Não banir apenas por IP compartilhado ou latência. RNG de drops online não aceita seed escolhido pelo cliente; auditar fonte/versão sem expor estado que permita prever grants.

## Transações e saldo

Débito, crédito, taxa, item, claim e resultado idempotente devem confirmar juntos. Nunca confiar em botão disabled como proteção. Constraints de saldo, unicidade e versão complementam locks. Retentativas de serialização têm limite e backoff, sem repetir compra com chave nova. Reconciliação ledger↔saldo deve detectar diferenças e suspender o caminho afetado; correção por lançamento compensatório auditado, nunca edição silenciosa.

## Segredos e dependências

Arquivos de exemplo contêm nomes de variáveis, sem valores reais. Chave pública de cliente não confere privilégios; service role fica exclusivamente no servidor. Separar ambientes e permissões mínimas do banco. Revisar dependências/licenças/lockfile, scanner de segredos e acesso CI antes do online. Integrações de pagamento não devem coletar cartão diretamente no jogo.

## Moderação e proteção operacional

Chat/guilda exigem denúncia, rate limit, silenciar/bloquear, trilha administrativa e recurso conforme política futura. Brasão aceita matriz limitada, não upload livre. Ações administrativas têm ator, motivo, data e antes/depois. Acesso a suporte não dá acesso indiscriminado a recibos/PII.

Incidente: conter feature afetada por flag confiável, preservar evidência restrita, revogar chaves se necessário, reconciliar economia, restaurar somente com plano de reprocessamento idempotente e registrar postmortem. Ver OPERATIONS. Pen tests/testes de abuso só se aplicam quando existirem ambientes autorizados; nenhum foi executado nesta entrega.

## Estado implementado na F4

RPG local usa drafts validados, limites de inventário/nível/saldo, referências únicas de equipamento e migração com SHA do payload original. SHA detecta corrupção acidental; não autentica um save contra edição deliberada. RNG xorshift32 e relógio do dispositivo são exclusivamente locais e previsíveis/manipuláveis. Servidor continua sem grants online. Nunca importar itens, XP, buffs, pet ou saldo desse save como autoridade de conta. F5 deverá validar comandos, custos, cooldowns, loot e produção no servidor, com RNG apropriado, idempotência e transações/ledger. Nenhuma proteção de antiabuso online foi declarada concluída na F4.

## Atualização F5 — 15/10/2026

F5 implementa identidade de sessão opaca/cookie, Origin/header anti-CSRF, prova de convidado recuperável, Google JWKS/claims/nonce, schemas strict, autoridade temporal/RNG, rate limits persistidos, lock/transação, replay/rollback/IDOR e histórico append-only. Testes e limitações em [ONLINE](ONLINE.md) e [STAGE_05_REPORT](STAGE_05_REPORT.md). Modelo acima mantém controles de sistemas futuros. Não declarar auditoria externa, integração Google real ou aptidão pública: configuração OAuth, TLS, papéis do banco, retenção, alertas e testes de escala ainda são gates de implantação.
