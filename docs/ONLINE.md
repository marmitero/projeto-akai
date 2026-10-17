# Online autoritativo — Fase 5

Implementação de desenvolvimento, sem hospedagem contratada. O perfil local da F4 continua disponível por padrão. `VITE_GAME_MODE=online` seleciona a conta no servidor; nunca importa save, saldos, equipamentos ou XP locais.

## Execução reproduzível

Node 24 e npm 11 conforme `.nvmrc`/lockfile. PostgreSQL 16 no Compose e na CI; banco exclusivo para testes.

```bash
npm ci
docker compose up -d db
export DATABASE_URL=postgres://akai:akai_dev_only@127.0.0.1:5432/akai
npm run db:migrate -w @akai/server
PUBLIC_ORIGIN=http://localhost:5173 npm run dev:server
# Em outro terminal:
VITE_GAME_MODE=online npm run dev:client
```

O Vite encaminha `/api/v1` e WebSocket ao servidor em 127.0.0.1:3000. Usar `localhost` no navegador, pois Origin deve corresponder exatamente a PUBLIC_ORIGIN. O servidor não cria tabelas com a credencial de runtime no startup: a migração é uma ação separada. Sem DATABASE_URL, conserva diagnóstico e rejeita gameplay; banco configurado mas indisponível impede inicialização/health saudável.

```bash
# Criar akai_test separado antes de usar; não executar contra dados reais.
TEST_DATABASE_URL=postgres://akai:akai_dev_only@127.0.0.1:5432/akai_test npm run check
TEST_DATABASE_URL=postgres://akai:akai_dev_only@127.0.0.1:5432/akai_test node scripts/smoke-online.mjs
# Após os smokes LOCAIS, compilar explicitamente o modo online para o preview:
VITE_GAME_MODE=online npm run build
TEST_DATABASE_URL=postgres://akai:akai_dev_only@127.0.0.1:5432/akai_test node scripts/smoke-online.mjs --preview
npm run db:reconcile -w @akai/server
```

`npm test` sem TEST_DATABASE_URL pula explicitamente a suíte de integração PostgreSQL; não equivale à validação completa da F5. A CI fornece PostgreSQL real e executa a suíte e os smokes dos dois modos. Dependência de Chromium: `npx playwright install --with-deps chromium`. `AKAI_CHROMIUM_EXECUTABLE` permite usar um runtime de teste já disponível; não altera o jogo.

## Iniciar com servidor.bat no Windows

1. Instale Docker Desktop com suporte a containers Linux (a instalação pode solicitar WSL2/virtualização e reinício). Isso é feito uma vez pela interface do instalador; o BAT não instala componentes de sistema.
2. Atualize/extraia a pasta completa do projeto. Feche a janela do jogar.bat ou outro servidor do projeto.
3. Dê dois cliques em **servidor.bat**. Se necessário, ele tenta abrir Docker Desktop e aguarda o mecanismo Linux. Node24 portátil, dependências e sprites são preparados pelo mesmo bootstrap do jogar.bat.
4. Aguarde o primeiro download da imagem PostgreSQL16. O iniciador cria/inicia o banco do Compose, aguarda readiness, executa migrações e abre API/cliente em **http://localhost:5173**.
5. Crie um convidado, guarde sua chave e confirme a entrada. Google não é necessário.

Mantenha a janela aberta enquanto joga. Ctrl+C encerra o cliente/API iniciados pelo BAT. **O banco fica no Docker e conserva as contas**, inclusive entre reinícios. Para pará-lo também, use Docker Desktop→container db→Stop; não remova o volume se quiser manter o progresso. Nunca é usado `down -v` ou reset de banco. O iniciador não apaga perfis nem fecha outros programas para liberar portas.

Este fluxo é somente para teste no próprio computador: API127.0.0.1:3000, cliente localhost:5173, banco127.0.0.1:5432. Monetização fica off e DATABASE_URL externa é ignorada; não conecta silenciosamente a bancos remotos. Utiliza o banco `akai`/volume de desenvolvimento do compose.yaml existente. Banco de monetização sandbox não deve substituir esse volume. O iniciador não altera .env.

Erros de Docker ausente/inativo, containers Windows ou porta ocupada aparecem na janela. Se Docker Desktop foi instalado em outro local ou ainda está iniciando, abra-o manualmente, aguarde Linux pronto e execute o BAT novamente. Na primeira vez precisa de internet e escrita na pasta. Depois, runtimes, dependências e imagem são reaproveitados quando disponíveis.

Opções técnicas: `servidor.bat -NoBrowser` não abre navegador; `-PrepareOnly` prepara dependências/banco/migrações sem iniciar API/cliente; `-SmokeTest` usa Playwright instalado para criar conta descartável e verificar um crédito real de ferro, depois encerra API/cliente. O navegador Playwright é exclusivo de testes; uso normal abre seu navegador padrão.

O fluxo manual abaixo continua disponível para diagnóstico. `jogar.bat` continua sendo o modo local, sem Docker/contas online. Não execute ambos ao mesmo tempo: os dois usam5173.

## Testar no Windows (PowerShell)

O jogo ainda não tem um servidor público hospedado. É possível testar o modo online completo no próprio computador. Instale Node24/npm11 e Docker Desktop com o mecanismo de containers Linux iniciado. Se usa apenas o Node portátil do jogar.bat, ele não instala os comandos npm/node no PATH; para os comandos abaixo use uma instalação Node24 disponível no terminal.

Feche o jogar.bat/servidores Vite anteriores para liberar5173. Abra PowerShell na pasta do projeto atualizado. A senha abaixo pertence apenas ao Compose de desenvolvimento, já versionado; não a reutilize em um servidor publicado.

**Terminal1 — banco e API:**

```powershell
npm ci
docker compose up -d db
$env:DATABASE_URL = "postgres://akai:akai_dev_only@127.0.0.1:5432/akai"
npm run db:migrate -w @akai/server
$env:PUBLIC_ORIGIN = "http://localhost:5173"
$env:MONETIZATION_MODE = "off"
npm run dev:server
```

**Terminal2 — cliente**, na mesma pasta:

```powershell
$env:VITE_GAME_MODE = "online"
npm run dev:client
```

Abra **http://localhost:5173**. Se o Vite informar outra porta, libere5173 e reinicie o cliente para que a origem corresponda à API. Escolha criar conta de convidado, guarde a chave de recuperação em local privado e confirme a entrada. Google não é necessário. O perfil local continua separado; não há importação de saldo ou itens locais.

Teste Mina, Melhorias e Batalha→Sistema; recarregue e confira os dados. Chat e outros jogadores estão em Mais→Comunidade; a conversa embutida na aba Global está prevista para P8. Para simular dois jogadores, use perfis diferentes do navegador (ou janela anônima) e crie um convidado em cada sessão. Apenas abrir duas abas com o mesmo cookie usa a mesma conta.

Para encerrar, Ctrl+C em ambos os terminais e `docker compose stop db`. Isso preserva o volume do banco. Para voltar ao modo local, use jogar.bat. A publicação no GitHub não cria hospedagem para jogar pela internet.

## Separar o banco do cliente

Essa separação já existe: o navegador chama `/api/v1` e o servidor acessa PostgreSQL por `DATABASE_URL`. Essa variável não possui prefixo VITE e não é enviada ao cliente. Dano, recursos, custos, XP e loot online são calculados no servidor.

Na hospedagem, cliente e API podem compartilhar uma origem pública via proxy e o banco ficar em outro servidor/rede privada. Restrinja a conexão PostgreSQL à API, com credenciais de runtime próprias e permissões mínimas; mantenha a porta do banco fora do acesso público. Para mover os dados, planeje backup/restauração e execução das migrações, alterando a conexão apenas no servidor. Nenhuma credencial de banco precisa ir para o jogador. Ainda não foi provisionada hospedagem, rede privada ou transferência de banco para produção.

## Identidade e autenticação

Convidado: criação explícita gera UUID de conta, sessão opaca de 256 bits e chave de recuperação independente de 256 bits. Apenas hashes SHA-256 dos dois segredos ficam no banco. Chave aparece uma vez na interface, sem persistência no save local; usuário confirma que a guardou. A chave é credencial completa da conta e deve ficar privada. Recuperar preserva estado, rotaciona a chave e revoga todas as sessões anteriores. Perder cookie e chave sem Google vinculado significa não poder recuperar o convidado; não existe recuperação por nome.

Sessão: cookie HttpOnly, SameSite=Strict, Path=/api/v1, expiração de sete dias sem renovação silenciosa; Secure obrigatório fora de loopback HTTP. Logout revoga no banco. Recuperação/entrada Google substitui as sessões de escrita anteriores; requisições revalidam a sessão depois de obter o lock. Não há senha, JWT próprio nem token de sessão no localStorage/query string. CSRF: Origin exato em mutações, header X-Akai-Client:1 em HTTP e Origin exato obrigatório no handshake WebSocket. Reverse proxy deve remover cabeçalhos de IP externos; o servidor não confia em X-Forwarded-For por padrão.

Google opcional: configurar GOOGLE_CLIENT_ID do cliente web e origins autorizadas no console do titular. GIS carrega somente quando configurado e solicitado. Vinculação exige sessão do convidado + ID token Google verificado com JWKS oficial, RS256, issuer, audience, validade, idade máxima de cinco minutos, sub e nonce aleatório de uso único com TTL de cinco minutos. Nonce de vinculação pertence à conta; login usa nonce separado sem conta. Login só encontra identidade já vinculada. Nunca mescla contas ou transfere saldos; vínculo ocupado retorna conflito. Nenhum client secret é enviado ao navegador. Tokens Google não são persistidos.

**Pendente antes de ativar Google publicamente:** cadastrar aplicativo/origins no console do titular e executar teste real ponta a ponta. Testes locais verificam JWTs assinados e provas controladas; não afirmam que o provedor real já foi conectado.

## Autoridade, presença e regras

Toda ação é intenção: clique, compra de upgrade, controle de batalha ou comando RPG. Servidor calcula custos, dano, minério, atributos, XP, drop e tempo usando o domínio compartilhado, com `crypto.randomInt(max)` injetado em cada sorteio online. O seed local não é usado nem exposto na resposta online. Nenhuma rota de importação/debug/grant foi criada.

O banco serializa cada conta com SELECT FOR UPDATE. Não existe worker de combate com estado divergente em memória: toda requisição de sincronização ou comando liquida o intervalo ainda não reconciliado sob o mesmo lock. Dois processos podem atender a conta sem duplicar ticks. Três segundos de lease de presença são renovados pelos snapshots a cada segundo; fechamento explícito sinaliza ausência. Queda abrupta pode deixar até três segundos de combate já autorizados. Após isso só minas, até oito horas; boss continua expirando na ausência. Cada liquidação avança watermark na mesma transação que os créditos. Uma retomada longa nunca simula horas de combate. Esta granularidade é uma escolha técnica experimental, documentada em ADR-009.

Comando só é novo quando commandId ainda não existe para aquela conta. Payload validado é hasheado; replay idêntico devolve o resultado persistido antes de conferir versão/limite. Mesmo UUID e payload diferente gera 409. expectedVersion refere-se a commandVersion, alterada apenas por comandos aplicados. stateVersion sequencia toda confirmação de estado, inclusive ticks e rejeições. Rejeição também tem resultado persistido; para uma nova intenção após sincronizar, criar novo UUID. Repetir o UUID recusado nunca transforma a recusa em compra posterior. O cliente mantém um comando pendente por vez; perda de resposta reenvia o mesmo envelope, sem antecipar saldo. Recarregar descarta o intento em memória e lê o estado confirmado; não recria uma compra com nova chave.

Cliques: token bucket persistido, burst 10 e reposição 10/s por conta; não é prova de origem humana. Limite HTTP 600/min por IP, comandos 1.200/min por sessão, criar convidado 5/min por IP, recuperação/Google 10/min por IP. Valores experimentais; implantação com proxy deve rever limites por IP compartilhado. No máximo dois streams simultâneos por conta, com lease persistido de dez segundos; mensagens de cliente no stream são recusadas. Payload HTTP 16KB, WebSocket 1KB de entrada e fechamento se fila de saída exceder 1MB.

## Persistência e reconexão

Tabelas reais: accounts (snapshot validado, versões, watermark/presença/bucket), sessions, commands, ledger, events, auth_limits, nonces, streams. Ledger inclui deltas e saldo final de todos os recursos e ferro fundido. Snapshot, ledger, resultado do comando e evento outbox confirmam juntos. Itens estão no snapshot autoritativo, identificados por conta + item-N; o identificador isolado não é global. Triggers recusam UPDATE/DELETE do ledger e eventos; permissões de runtime também devem proibi-los. Não há grants durante transporte/replay.

Outbox durável `akai_events`: sequence por conta, eventId UUID e metadados da transação. GET /events entrega até 100 após cursor, apenas da própria conta. WebSocket é canal de snapshots integrais confirmados, não reenvio de animações históricas. Na reconexão o cliente obtém snapshot atual e ignora snapshots de sequência antiga; eventos podem ser consultados por integrações. Não prometer exatamente uma vez no transporte. A recuperação atual privilegia estado íntegro sobre reproduzir cada impacto visual perdido.

`db:reconcile` lê snapshot consistente e compara cada saldo materializado com a soma do ledger; retorna exit code 1 se houver discrepância, sem corrigir silenciosamente. Em discrepância, suspender o serviço econômico e investigar; não executar alterações diretas para compensar sem registro. Configurar alerta operacional antes do público.

## Publicação e limites

Não houve contratação nem deploy público. Para staging: preparar PostgreSQL persistente, migração com usuário proprietário, runtime com permissões mínimas, HTTPS/WSS e mesma origem para cliente/API, PUBLIC_ORIGIN exato e COOKIE_SECURE=true. Proxy deve suportar upgrade WebSocket e encaminhar cookies; nunca registrar corpos de auth ou tokens. Exemplo de grants para role existente `akai_runtime` (executar como proprietário, revisar nomes do ambiente):

```sql
GRANT CONNECT ON DATABASE akai TO akai_runtime;
GRANT USAGE ON SCHEMA public TO akai_runtime;
GRANT SELECT, INSERT, UPDATE ON akai_accounts, akai_sessions TO akai_runtime;
GRANT SELECT, INSERT ON akai_commands, akai_ledger, akai_events TO akai_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON akai_auth_limits, akai_nonces, akai_streams TO akai_runtime;
```

DB/migração devem estar em rede privada; revogar criação de objetos por runtime/public conforme ambiente. Backup/PITR, retenção de ledger/comandos/eventos, limpeza de nonces/sessões/limites expirados, monitoramento e exclusão de contas precisam de política operacional antes do público. Não apagar idempotências indiscriminadamente: isso pode permitir reexecução de compras antigas. Testes locais/CI não são teste de escala ou auditoria independente de segurança. Comunidade e Mercado estão implementados no modo online de desenvolvimento. Pagamentos reais continuam indisponíveis; monetização foi adiada para a fase final.

Fontes técnicas: [locks PostgreSQL](https://www.postgresql.org/docs/16/explicit-locking.html), [Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html), [Google ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), [GIS nonce](https://developers.google.com/identity/gsi/web/reference/js-reference#nonce).
