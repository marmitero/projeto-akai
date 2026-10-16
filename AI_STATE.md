# AI_STATE — Projeto Akai

16/10/2026. **F1–F8 técnicas publicadas; CI F8 aprovada após corrigir clique durante sincronização. Monetização externa adiada por decisão do usuário para a fase final; prioridade atual: polimentos do jogo. F9 não iniciada.** Base F8:3ccfdc436706f77fbc6ba7aa8ac12206a5b63ac3.

## Autorização e governança

Usuário pediu prosseguir F8 após publicação F7. Resolver escolhas técnicas/reversíveis sem consultas; reservar gastos relevantes, alterações profundas e atos do titular. Encerrar com feito, completude/faltas, decisões, pendências e próximo passo. Atualizar docs por etapa. Não antecipar F9, contratar serviços ou abrir produção pública.

## Implementado

F4 local: save schema3/local-rpg-1, migrações1/2,1000definições reutilizando bioma/família,9slots/5raridades/afixos, inventário120, Forja/tônicos/Musgo/minas. Não são1000cenários exclusivos nem balanceamento humano comprovado. F5: PostgreSQL, cookies/convidado recuperável/Google opcional, RNG/tempo/grants autoritativos, ledger/outbox/idempotência/reconexão. Save local nunca concede saldo online. Evidências antigas preservadas.

F6 `community-1`: packages/shared/src/community.ts, apps/server/src/community*.ts, migrations/002_community.sql, ui/community.ts e smoke-community.mjs. Migração aditiva mantém contas/sessões/saldos/itens. Comunidade só online, em Mais; modo local mostra indisponibilidade explícita sem inventar jogadores. Campo local para renderer é adaptador de leitura, não autoridade.

- Chat global após andar1, guilda para membros atuais desde ingresso,500caracteres/3s, texto literal, block/unblock/report. Moderação mute/unmute/suspend/restore/remove-message/resolve-report só por CLI com credencial operacional e auditoria; não há rota admin pública.
- Guilda500Coins/andar5; nível1–10 e20+2(n−1)até38vagas, XP/custos experimentais, convite24h, roles e transferência; brasão16×16/paleta8, sem upload. Bônus XP da semana anterior10/7/5/3/1%, vínculo24h, expiração exata; guerra semanal com roster congelado,2membros24h mínimo, um ataque, encerramento/prêmio únicos.
- Arena: cinco reais imediatamente acima, andar5, sem bots. Stats autoritativas sem tônico, dupla batida simultânea/120s, empate favorece defesa. Vitória troca posições/+20troféus; derrota mantémposição/−10min0.60s entre desafios e20/24h atravessando reset. Matches auditam stats/posições/motivo.
- Temporadas segunda00h Brasília, arquivos e grants únicos; reset de posições/troféus/pontos, não saldos/itens. Força=10ATQ+HP+20DEF, rankingCoin BigInt, guildas/dano e histórico últimosgolpes. Premiação exige match elegível e vínculo; números em COMMUNITY_SYSTEMS.
- Boss diário22h–22h30/1MHP, andar10,200inscritos/edição máximo, tick1s e presença até3s. Outros membros ativos+1%até20%, não o próprio. Último golpe e contribuição únicos. Sair impede renovação até novo ingresso. Sem dano arbitrário, horas de ataque offline ou reinício por jogador.
- XP diário12h–18h+30%, somado ao bônus de guilda, segmentado no tempo. Loteria18h/100Rubies: Google vinculado único, perfil, andar10, conta10min e presença histórica cobrindo instante; sem elegíveis, sem vencedor. Raid20h–21h, uma tentativa e baú persistido, raro superior ao comum; expirou/perdeu não concede. Rubies são virtuais, mercado/premium não ativados.
- Scheduler2s e read/command usam lock transacional social41652006 antes de locks de conta, snapshot/ledger/outbox/claim confirmam juntos. Piloto5000perfis, histórico limitado por query. Não prometer escala ilimitada ou eliminação de toda conta alternativa. Comandos sociais têm idempotência própria, rejeições persistidas,60/min/sessão; UI um pendente, sem saldo/dano otimista.

## Validação F6 preservada

94testes em9arquivos (66anteriores+28F6), typecheck, hashes e builds local/online passaram. Migração real001→002 preservando conta/sessão/snapshot,30replayschat,20replaysarena, vaga concorrente, TTL/roles/IDOR/mute, loteria/raid/rollover/últimogolpe/rollbackoutbox e CLI operacional. Smokes local/online/comunidade dev/produção passaram; community usa2contas de fixture isoladas, testa XSSliteral, guilda/emblema, arena/boss, reload,30ciclos e320/390/768px. DOM constante e sem pageerrors; local mantém35texturas/38objetos. Captura revisada e guiada para molduras existentes.

Sem novo soak30min, escala comercial, playtest humano competitivo, aparelho real ou provedorGoogle real nesta entrega. [CI F6 38803335641](https://github.com/marmitero/projeto-akai/actions/runs/38803335641) aprovada com PostgreSQL16 e os seis smokes de navegador. Ler STAGE_06_REPORT e phase6-browser-*.json.

## Operação e próximo passo

Executar db:migrate antes do servidor atualizado; CLI e regras em COMMUNITY_SYSTEMS/ADR-010/API. Mute/suspensão não podem ser administrados por usuário comum. start-boss de desenvolvimento só com AKAI_COMMUNITY_DEBUG=1, NODE_ENV não production, operador/banco e edição ainda agendada; sem reabrir ativa/fechada. Nada disso existe em endpoint público.

jogar.bat segue local: Node24 portátil/checksum quando necessário, cache npm, sprites e5173fixo; [CI Windows 38803335493](https://github.com/marmitero/projeto-akai/actions/runs/38803335493) aprovada novamente nesta entrega. Recursos sociais exigem conta/servidor; não iniciar banco/Google silenciosamente no BAT.

Sem validação de design obrigatória do usuário agora. Permanecem gates públicos: OAuth/hospedagem/TLS/banco/backups, moderação humana/privacidade/retencão/alertas/carga, licenças e playtest/aparelhos. Próximo atual: polimentos; pendências externas preservadas em docs/MONETIZATION_DEFERRED.md, retomada somente na fase final.

## Publicação da F6

Usuário autorizou explicitamente a publicação em 15/10/2026. Implementação publicada na main em `c00a93a733c7e8e59b4aeae1feeb7e8ebed2b20e`; árvore remota `91544ca82d3e2d47596454c4dd551fab0ac08cf8` idêntica à validada localmente. [CI F6 38803335641](https://github.com/marmitero/projeto-akai/actions/runs/38803335641) e [CI Windows 38803335493](https://github.com/marmitero/projeto-akai/actions/runs/38803335493) aprovadas. Bloqueio anterior resolvido; nenhuma autorização de publicação pendente naquela entrega F6. F7 tratada na seção atual abaixo.


## Implementação atual F7 — market-1

MarketService/migração003 e shared/market.ts: escrow de peça não equipada ou recurso fungível, compra/oferta atômicas, prazo72h/custo100milCoins/taxa10% na própria moeda com ceil de milésimos. Equipamento conserva atributos/procedência ao receber ID de inventário novo; resgate explícito de cancelado/expirado/removido preserva bem com mochila cheia. Cancelamento impõe24h por procedência ou recurso inteiro na conta contra divisão/mesclagem. Expiração natural não impõe cooldown. Oferta até24h, sem reserva, revalida saldo/mochila/contas e fecha irmãs na venda.

Mais→Mercado só online, sprite frames existentes, revisão das ações, filtros/páginas, resgates/ofertas/histórico, comando pendente em sessionStorage por conta para resposta perdida/reload. Ruby/Musgo singleton/skins sem instância não elegíveis. Nenhum pagamento ou fake backend. ModeraçãoCLI com motivo/DB, perfis moderáveis mesmo sem abrir comunidade; sem endpointadmin. Caps5000anúnciosativos,20pendências/vendedor e20ofertas/comprador. Market usa lock social41652006 antes dos locks ordenados de contas; trade/snapshots/ledger/outbox/resultado confirmam juntos. Histórico/commands/audit append-only, expiração auditada.

117testes/10arquivos (23novos) passaram com PostgreSQL real; migração001/002→003, concorrência/replays/cancelamento×compra/oferta×compra/overflow/rollbackoutbox/IDOR/suspensão/CLI/rate validados. Typecheck/hashes/builds passaram. Todos os oito smokes local/online/comunidade/mercado passaram em dev/preview. Simulação salva mostra custo alto no começo, sem afirmar equilíbrio humano. Regras/evidências em MARKET_SYSTEMS/ADR-011/STAGE_07_REPORT e phase7-*.json. [CI F7 38823228249](https://github.com/marmitero/projeto-akai/actions/runs/38823228249) e [CI Windows 38823228224](https://github.com/marmitero/projeto-akai/actions/runs/38823228224) aprovadas para a própria entrega F7.

## Publicação F7

Usuário autorizou explicitamente em15/10/2026. Implementação publicada na main em `a190b725a3d5f07d37079ea283be983b40a0327a`; árvore `1c2b4667082756883908523c824e7ac96cfb90fc` idêntica à validada localmente. [CI F7 38823228249](https://github.com/marmitero/projeto-akai/actions/runs/38823228249) e [CI Windows 38823228224](https://github.com/marmitero/projeto-akai/actions/runs/38823228224) aprovadas. Sem pendência de autorização ou validação obrigatória desta publicação. F8 atual descrita abaixo.


## F8 atual — monetization-test-1

Default off. Sandbox local assinado e GooglePlayTestProvider restrito a contexto TEST, sem modo de produção monetizada. Migração004 aditiva; marcador impede reaproveitar banco de teste como normal. Exige loopback, NODE_ENV não production, declaração de banco separado e chave privada64hex. Loja com pacotes experimentais100/550/1200/2600Ruby e título Guardião das Minas sem atributos; sem preço real, poder permanente, conversão ou gasto de Ruby. jogar.bat continua local.

PurchaseProvider independente; conta ofuscada, SKU, unidade e estado verificados no backend. Todos os comprovantes persistidos são cifrados AES-GCM; hash único identifica replay. Grant/snapshot/ledger/outbox/intenção/auditoria atômicos e histórico append-only. Consumo/ack pós-commit, restore50/lote, worker5recibos/10s e backoff individual2s–15min. Estorno retira Ruby disponível, registra dívida; compra posterior abate dívida. Cosmético revogado por fonte, sem editar grant. Pending por conta em sessionStorage recupera resposta perdida/reload; nenhum booleano do cliente concede.

Recompensas voluntárias somente no simulador:120s autoclick3/s,2×Coins/XP da torre sem duplicar itens,2×dano da torre ou Coins10×inimigo do maior andar (piso30/teto1milhão). Até8solicitações/24h, cooldown5min, TTL10min, sem empilhar, com presença; fim exclusivo no instante do golpe. Multiplicadores não são aplicados diretamente à arena/boss global/guerra ou offline; ganhos de progressão podem influenciar poder futuro, sem promessa de equilíbrio. Assinatura AdMob SSV pura testada com fixtures, sem SDK/transporte/rotação real de chaves.

143testes/12arquivos (26novos), PostgreSQL real, typecheck/builds/hashes90 e10smokes dev/preview passaram. DOM75→75 em30navegações premium, zero pageerrors,320/390/768px. APIs Play/OAuth mockadas e criptografia local não equivalem a homologação nas contas Google/AdMob. Sem novo Windows, soak30min, aparelho, playtest econômico ou carga. Regras/evidências em STAGE_08_REPORT, MONETIZATION_SYSTEMS, ADR-012 e phase8-*.json.

Publicação autorizada em16/10/2026: base main `089aa10a06c6190e595ffd2cf0f0335b8e758093`; correção de clique na sincronização `c007562fcbf0f5141804175c168df7f9b1c732af`. CI aprovada. Pendências de Google/AdMob/Android, catálogo e lançamento preservadas em [MONETIZATION_DEFERRED](docs/MONETIZATION_DEFERRED.md). Usuário adiou integração/ativação de monetização até a fase final; não solicitar credenciais ou iniciar F9 agora. Prioridade: [polimentos](docs/POLISH_PLAN.md), P1 no rascunho PR1; P2 concluída e validada localmente. P2 implementa HUD, nick/guilda, recursos, varal e HP na arena; críticos seguem pendentes P3. Sem merge na main ou avanço automático à F9. Envio da P2 ao GitHub bloqueado pela revisão automática por falta de autorização de publicação específica desta fatia; pedir aprovação antes de reenviar.

Validação P2:149testes/14arquivos com PostgreSQL, typecheck/builds/hashes e nove smokes (HUD/movimento/loop local dev/preview, comunidade dev/preview e premium preview).54texturas/70objetos estáveis em50ciclos por modo local. Evidências e pendências em docs/POLISH_PLAN.md e docs/polish-battle-p2-validation.json; preservar evidências históricas P1/F6.

P2: implementação local em3a4962c, árvore4772abb7e5f43517c4174db472e71376dfafd181. O PR1 remoto ainda contém somente P1. Atualizar o payload a partir do HEAD local antes de uma publicação autorizada; não contornar o bloqueio por git push ou outro meio.

16/10/2026: usuário autorizou explicitamente enviar P2 ao rascunho PR1 e prosseguir P3. Bloqueio anterior de autorização resolvido; monetização continua adiada.
