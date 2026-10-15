# AI_STATE — Projeto Akai

15/10/2026. **F1–F5 e iniciador Windows preservados; F6 concluída e publicada na main; CI remota aprovada. F7 não iniciada.** Base remota desta entrega:1dd97b6f8628198a9cb8de842f669ee683cec7df.

## Autorização e governança

Usuário pediu prosseguir F6. Resolver escolhas técnicas/reversíveis sem consultas; reservar gastos relevantes, alterações profundas e atos do titular. Encerrar com feito, completude/faltas, decisões, pendências e próximo passo. Atualizar docs por etapa. Não antecipar F7, contratar serviços ou abrir produção pública.

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

## Validação atual

94testes em9arquivos (66anteriores+28F6), typecheck, hashes e builds local/online passaram. Migração real001→002 preservando conta/sessão/snapshot,30replayschat,20replaysarena, vaga concorrente, TTL/roles/IDOR/mute, loteria/raid/rollover/últimogolpe/rollbackoutbox e CLI operacional. Smokes local/online/comunidade dev/produção passaram; community usa2contas de fixture isoladas, testa XSSliteral, guilda/emblema, arena/boss, reload,30ciclos e320/390/768px. DOM constante e sem pageerrors; local mantém35texturas/38objetos. Captura revisada e guiada para molduras existentes.

Sem novo soak30min, escala comercial, playtest humano competitivo, aparelho real ou provedorGoogle real nesta entrega. [CI F6 38803335641](https://github.com/marmitero/projeto-akai/actions/runs/38803335641) aprovada com PostgreSQL16 e os seis smokes de navegador. Ler STAGE_06_REPORT e phase6-browser-*.json.

## Operação e próximo passo

Executar db:migrate antes do servidor atualizado; CLI e regras em COMMUNITY_SYSTEMS/ADR-010/API. Mute/suspensão não podem ser administrados por usuário comum. start-boss de desenvolvimento só com AKAI_COMMUNITY_DEBUG=1, NODE_ENV não production, operador/banco e edição ainda agendada; sem reabrir ativa/fechada. Nada disso existe em endpoint público.

jogar.bat segue local: Node24 portátil/checksum quando necessário, cache npm, sprites e5173fixo; [CI Windows 38803335493](https://github.com/marmitero/projeto-akai/actions/runs/38803335493) aprovada novamente nesta entrega. Recursos sociais exigem conta/servidor; não iniciar banco/Google silenciosamente no BAT.

Sem validação de design obrigatória do usuário agora. Permanecem gates públicos: OAuth/hospedagem/TLS/banco/backups, moderação humana/privacidade/retencão/alertas/carga, licenças e playtest/aparelhos. Próximo recomendado: F7mercado, não iniciada.

## Publicação da F6

Usuário autorizou explicitamente a publicação em 15/10/2026. Implementação publicada na main em `c00a93a733c7e8e59b4aeae1feeb7e8ebed2b20e`; árvore remota `91544ca82d3e2d47596454c4dd551fab0ac08cf8` idêntica à validada localmente. [CI F6 38803335641](https://github.com/marmitero/projeto-akai/actions/runs/38803335641) e [CI Windows 38803335493](https://github.com/marmitero/projeto-akai/actions/runs/38803335493) aprovadas. Bloqueio anterior resolvido; nenhuma autorização de publicação pendente nesta entrega. F7 não iniciada.
