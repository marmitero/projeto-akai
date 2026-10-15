# AI_STATE — Projeto Akai

15/10/2026. **F1–F4 preservadas; F5 concluída no escopo de desenvolvimento. F6 não iniciada.** Base desta etapa: main `eaaeb9d283bd57a046cd0cabd2dd282aaa891e3b`.

## Autorização e governança

Usuário autorizou prosseguir F5. Resolver escolhas técnicas/reversíveis sem consulta; gastos relevantes, alterações profundas e atos do titular exigem participação somente quando necessários. Ao encerrar: feito, completude/faltas, decisões, validações e próximo passo; atualizar documentos. Não antecipar F6 nesta entrega. Nenhum serviço foi contratado/publicado.

## Estado implementado

Local F4 preservado: schema3/local-rpg-1,1000 definições reutilizando mesmo bioma/família, inventário120,9slots/5raridades/afixos, Forja/enhance/tônicos/Musgo/minas e migrações. Não afirmar1000 mapas exclusivos nem balanceamento humano comprovado. Evidências F3/F4 históricas preservadas.

F5: apps/server/src/online.ts é autoridade de domínio; database.ts + migrations/001_online.sql persistem accounts/sessions/commands/ledger/events/auth_limits/nonces/streams. PostgreSQL16 no Compose/CI. Migração separada de runtime. Transação/SELECT FOR UPDATE por conta liquidam simulação e gravam estado/ledger/idempotência/outbox juntos, sem worker em memória com estado concorrente.

Cliente `VITE_GAME_MODE=online` usa OnlineSession e snapshots via WebSocket; não usa IndexedDB, relógio, RNG ou LocalSession para decidir recursos. A forma local usada pelo renderer é apenas adaptador de leitura. Nunca importar save/itens/saldos locais. Modo local é padrão. Sem banco configurado, servidor continua diagnóstico e503; banco indisponível impede online saudável.

- Convidado explícito, UUID e chave secreta256bits de recuperação; recuperar rotaciona chave e revoga sessões. Cookie opaco256bits/HttpOnly/SameSiteStrict,7dias; hashes de segredos no banco. Secure exigido fora de loopback. Logout revoga no banco.
- Google opcional configurável: GIS/JWKS, RS256/issuer/audience/exp/iat/sub/nonce; nonce5min de uso único, vínculo com prova da sessão e Google. Login somente identidade previamente vinculada; nunca mescla contas. Configuração/teste real do titular pendentes.
- Comandos strict: mineração/upgrade/battle/RPG. commandId+hash escopados por conta, resultados inclusive recusas persistidos. commandVersion só ações aplicadas, stateVersion todo commit. Mesmo UUID/payload devolve resultado; divergência409. Nunca recriar compra automaticamente com chave nova após timeout.
- RNG online por crypto.randomInt injetado em cada sorteio. Relógio/watermark do servidor; presença3s renovada a cada snapshot1s, ausência só minas8h e deadlineboss. Queda abrupta pode permitir até3s já autorizados de batalha; documentado, não combate offline ilimitado.
- Bucket10cliques/s/burst10 persistido. Limites HTTP/auth e2streams/conta com lease10s; mensagensstream recusadas, backpressure limitado. Rate limits não equivalem a detecção humana ou prova de escala.
- Ledger todos recursos+castIron e outbox append-only por triggers; reconciliação CLI detecta divergências sem reparo automático. Eventos próprios por cursor; reconexão entrega snapshot atual, sem reproduzir grants nem cada animação perdida.

## Validação e limites

Baseline F4 revalidada:45testes/hashes/typecheck/builds. F5:66testes no PostgreSQL local (20 de integração +1JWT além45anteriores), smokes online dev/produção com convidado/clique/cookie/reload/resposta perdida/restart/recuperação/revogação/logout; smokes locais dev/produção com50ciclos e fluxos F4. Evidências finais em STAGE_05_REPORT e phase5-browser-*.json. CI [38792734890](https://github.com/marmitero/projeto-akai/actions/runs/38792734890) concluída com sucesso no commit364384b3313ddbc99b44d569b6c77d6424e2baa5: PostgreSQL16, testes/builds/simulações e smokes locais/online em desenvolvimento/produção.

Não houve novo soak30min nesta fase; históricos F3/F4 não são execução nova. Google real/staging externo/escala/backups gerenciados/aparelho físico não foram testados. Licenças/playtest humano continuam abertos. Hospedagem/credenciaisOAuth/políticas públicas somente quando for ativar esse ambiente, com decisão financeira concreta preparada.

## Próximo trabalho

Ler ONLINE.md, API.md, ADR-009, STAGE_05_REPORT e testes antes de editar. Próxima fase técnica recomendada: F6 comunidade, após reler regras específicas, mantendo gates públicos e financeiros. Google/provider e operação pública têm pendências próprias; não anunciar lançamento online público por causa de uma CI local aprovada.

## Estado de publicação F5

Usuário autorizou explicitamente publicação e integração à main em15/10/2026, resolvendo o bloqueio anterior. Implementação publicada na main no commit364384b3313ddbc99b44d569b6c77d6424e2baa5; árvore remota2d8eda31cfa54c219af3473e41dae9a8e6dc88f3 idêntica ao conteúdo local revisado. CI38792734890 success. Este fechamento altera apenas documentação de estado; não há pendência de publicação da implementação. F6 não iniciada. Nenhum deploy público, gasto ou cadastroOAuth foi realizado.

## Entrega auxiliar — iniciador Windows

Usuário solicitou jogar.bat e autorizou sua publicação. Iniciador publicado na main no commitab36b2e9d1532805e49cb3386a2e6a2cfc768579. BAT→PowerShell→Node: Node24 portátil oficial com checksum quando necessário, npm ci com cache por manifests/lock/plataforma, verificação de sprites, build shared e Vite local em127.0.0.1:5173. Sem banco/conta externa; força local mesmo com .env online. Cache ignorado pelo Git; originais/saves preservados.

[CI Windows38795097309](https://github.com/marmitero/projeto-akai/actions/runs/38795097309) success: BAT real via cmd/PowerShell em diretório com espaços, download oficial do Node portátil forçado, instalação limpa, reutilização de dependências e Chromium carregando sprites/minerando ferro com VITE_GAME_MODE externo online. Testes locais de preparação/cache/HTTP/PNG também passaram. O download Chromium é exclusivo de CI; jogador usa o navegador padrão. CI geral38795097207 em execução no momento deste registro; consultar resultado antes de alegar aprovação dessa execução. Nenhuma validação obrigatória do usuário para usar o iniciador. Ler docs/LOCAL_PREVIEW.md. F6 não iniciada.
