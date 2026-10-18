# AI_STATE — Projeto Akai

16/10/2026. **F1–F8 técnicas publicadas; CI F8 aprovada após corrigir clique durante sincronização. Monetização externa adiada por decisão do usuário para a fase final; prioridade atual: polimentos do jogo. F9 não iniciada.** Base F8:3ccfdc436706f77fbc6ba7aa8ac12206a5b63ac3.

## Entrega atual — bestiário comum (18/10/2026)

27fichas comuns(19visuais+8composições Male/Female), inventário762arquivos/732PNG/19diretórios, catálogo Mais→Bestiário, stats/XP/Coins por papel, identidade opcional no snapshot/diário e projétil visual para arqueiro. Fonte scripts/bestiary-spec.json e gerador prepare-bestiary-assets.py; documentos docs/bestiary/BESTIARY.md e BESTIARY_IMPLEMENTATION.md. Bosses diretos preservados, sem mudança em content.ts ou sprites originais. Sem migração SQL; atualizar cliente e servidor juntos.

Guard de PNG valida702frames ativos, excluindo padding transparente; pivô de morte do Inquisitor normalizado separadamente. Reconstrução validada com177testes/17arquivos e PostgreSQL18.4;900andares comuns simulados; smokes específicos e gerais dev/preview passaram. Build de referência não simula aquisição/farm ou comprova equilíbrio humano. PR4 concentra publicação e CI da entrega. Checkpoint remoto3c215904df3580e731aa9ef1dad52bf956c86dd6. Próximo: playtest e ajustes das curvas; etapa dos bosses separada. Monetização permanece adiada; não antecipar P8 do chat nesta entrega.

## Publicação ao concluir cada etapa

Regra permanente solicitada pelo usuário em 18/10/2026: toda etapa concluída deve ser validada, commitada e publicada no GitHub sem nova confirmação. Preservar commits anteriores para rollback por revert, sem apagar histórico ou forçar main. Em etapas longas, enviar checkpoints à branch remota. Se houver falha real de publicação, informar e preservar o trabalho em branch remota quando possível. Publicar código no repositório não autoriza gastos ou deploy público de infraestrutura.

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

Publicação autorizada em16/10/2026: base main `089aa10a06c6190e595ffd2cf0f0335b8e758093`; correção de clique na sincronização `c007562fcbf0f5141804175c168df7f9b1c732af`. CI aprovada. Pendências de Google/AdMob/Android, catálogo e lançamento preservadas em [MONETIZATION_DEFERRED](docs/MONETIZATION_DEFERRED.md). Usuário adiou integração/ativação de monetização até a fase final; não solicitar credenciais ou iniciar F9 agora. Prioridade: [polimentos](docs/POLISH_PLAN.md). P1–P3 publicados na main em16/10/2026, merge9f04b8184dce0cfa699a9440dc65c45695ea30fd (PR1). Árvoreac0c8213e16eab9b575e3c3cff49db2e212933d6 idêntica à validada. [CI principal38893556081](https://github.com/marmitero/projeto-akai/actions/runs/38893556081) e [Windows38893556065](https://github.com/marmitero/projeto-akai/actions/runs/38893556065) aprovados para o head ef8781c. CI inicial P2 havia encontrado espera por banner ONLINE removido; correção705b792 e sua CI38892587375 aprovadas. Autorizações de publicação resolvidas.

P3: crítico de torre5%/1,5× experimental, domínio/RNG autoritativos, até8hits confirmados no snapshot, efeito dourado e número do dano real; sem replay na recarga. Não modifica fórmulas diretas de arena/guerra/boss global.156testes/14arquivos com PostgreSQL e smokes críticos/HUD/loop/online/mercado/loja;54texturas/70objetos estáveis. Evidências em docs/POLISH_P3_REPORT.md e docs/polish-battle-p3-validation.json. Nenhuma monetização ativada, sem avanço automático à F9.

P4 publicada: investidas dos inimigos de trás até contato, retorno e espaço na formação; alvo do herói preservado ao alcance. Números do mesmo alvo separados.159testes/14arquivos PostgreSQL, typecheck/build/hashes e smokes de aproximação/loop/críticos;54texturas/70objetos estáveis. Publicação autorizada em16/10/2026, PR2, merge c97e59a0121e0e2eb890fc7e64a0c65ee50ace59. Head validado67bfd2d3565b0957e5f8ed5f8ed7edea9415621e: CI38896597933 e Windows38896598093 aprovados. Ver docs/POLISH_P4_REPORT.md. Próximo: playtest Windows via jogar.bat, ajustes de feedback antes de F9; monetização na fase final.


## Novo pedido — P5–P8 (16/10/2026)

Referência Screenshot_9.png lida. Plano em docs/POLISH_PLAN.md: P5 arena integral; P6 unir Mina/Produção e criar Melhorias; P7 log Sistema confirmado; P8 Global usando chat online existente. P5 implementada localmente: removido limite326px em telas baixas, largura integral com proporção384/300. Typecheck/build e smoke-arena-layout dev/preview passaram em484×730,320×640,390×844,844×390 e1280×800, sem overflow horizontal ou pageerrors. Captura revisada. Navegação/cartões atuais preservados nesta fatia; P6 é a próxima implementação. Chat real apenas online, nenhum recurso/recompensa inventado no Sistema. Sem publicação nova, F9 ou monetização.


P5 publicada após autorização explícita em16/10/2026: main50f2913c1187b859f7a3111665639d3726e3a692. CI inicial38901546147 revelou teste premium de expiração que ignorava críticos autoritativos; correção de teste e62f131ee931c417e413adad2701f6406f2f4a2d considera hit confirmado e exige dano base sem multiplicador de anúncio. Regra do jogo intacta. Windows38901885853 aprovado; CI principal38901885885 aprovada (159testes PostgreSQL e regressões completas online/dev/preview).

P6 publicada: Mina reúne mineração/produção; Melhorias substitui Produção no menu com Força/Vitalidade; batalha sem cartões. Save production normalizado para mine sem alterar schema. Ver docs/POLISH_P6_REPORT.md e polish-battle-p6-validation.json. Typecheck/build,68testes locais (91PostgreSQL não executados), loop dev/preview e HUDdev/preview aprovados; compras/recarga, compatibilidade, minas avançadas,50ciclos e54/70 estáveis. P6 publicada após autorização explícita: headf31ca2971938887a59eb482a6ad52aec79af64bc, CI38908937775 e Windows38908937828 aprovados (159testes PostgreSQL e regressões completas). Próxima P7 Sistema, depois P8 Global; sem F9/monetização.


P7 publicada: painel Sistema/Global no lugar dos cartões da batalha, controles compactos dentro da faixa inferior da arena. Domínio registra recompensas reais por morte, vitória, derrota/timeout em battle.reports (máximo60), serial ordenado, defaults para saves antigos, sem reconstruir ganhos. Relatório docs/POLISH_P7_REPORT.md;77testes locais/9novos,91PostgreSQL sem execução; tipos/build e smokes journal/loop dev/preview aprovados,54/70estáveis. Global local indisponível, online abre Comunidade; conversa embutida fica para P8. PostgreSQL/online e CI P7 concluídos conforme registro abaixo. Monetização adiada, F9 não iniciada.


P7: validações pendentes concluídas após autorização explícita de publicação em16/10/2026.170testes/16arquivos com PostgreSQL real, zero skips; typecheck/assets/build aprovados. Testes novos verificam journal persistido em conta antiga, recompensa/ledger e perda do boss no andar original. Smokes online dev/preview reais aprovados, recarga/reinício sem duplicação; evidência polish-battle-p7-online-*.json. Guia PowerShell Windows e arquitetura de banco separado em docs/ONLINE.md. CI PostgreSQL16/Windows e publicação concluídas, próxima P8. Sem hospedagem pública/monetização ativada.


P7 publicada após autorização explícita: [PR3](https://github.com/marmitero/projeto-akai/pull/3), merge `7033dde145fea04444f2266cf6f28cdee7bac066`. Head validado `a397e225c800214cc6c9edb730409c500653b06b`, árvore `015e070abe618072941089e2cd2210380b7cd317`. [CI principal38923516737](https://github.com/marmitero/projeto-akai/actions/runs/38923516737) e [Windows38923516798](https://github.com/marmitero/projeto-akai/actions/runs/38923516798) aprovados.170testes PostgreSQL16 sem skips e regressões completas local/online/dev/preview. Sem pendência técnica obrigatória da P7. Próxima implementação: P8, conversa Global integrada; sem F9 ou monetização automática.


## Iniciador online solicitado (16/10/2026)

servidor.bat/scripts/servidor.mjs publicados na main após autorização explícita. Bootstrap jogar.ps1 aceita modo Online; jogar.bat continua local por padrão. Node24 portátil/cache, Compose db/migrações/API/Vite/browser automáticos; Docker Desktop Linux é pré-requisito externo. Banco e contas preservados; encerra só cliente/API próprios; guardas para portas/contextos Docker remotos/binding do banco. Monetização off e conexão local fixa, .env intacto. Relatório docs/SERVER_LAUNCHER_REPORT.md e server-launcher-validation.json. API/PostgreSQL/Chromium reais testados com CLI Docker de fixture; erros/cache/persistência/regressão local passaram. Sem execução real Windows/PowerShell/Docker engine disponível; essa validação ainda precisa ocorrer. Não confundir com CI Windows P7 anterior, que não exercita este novo iniciador. P8 não iniciada.


Publicado na main após autorização explícita em16/10/2026: implementação3e05dd067a27cefe6d1854f96e2ff7924c5685ae. CI principal38987019738 e Windows38987019786 iniciadas (ainda sem resultado no fechamento). CI Windows existente testa jogar.bat, não executa Docker Desktop/servidor.bat. Limitações do teste específico do iniciador online permanecem registradas.
