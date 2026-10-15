# Relatório Fase 6 — comunidade

15/10/2026. **Implementação e validação técnica em desenvolvimento concluídas; publicação/CI remota ainda pendentes.** Base remota:1dd97b6f8628198a9cb8de842f669ee683cec7df. Sem contratação, publicação pública, alteração dos sprites originais ou início da F7.

## Entregas

- Comunidade online em Mais: perfil/apelido, chat global e de guilda, bloqueio/desbloqueio, denúncias e CLI de moderação auditada. Texto literal, sem HTML executável.
- Guildas com vagas20–38, convites24h, cargos/permissões, entrada/saída/transferência, evolução por XP/Coins e brasão16×16/paleta8 usando grade limitada.
- Arena com cinco adversários reais acima, duelo autoritativo, atributos sem tônico, empate/timeout para defesa, troca atômica de posições, troféus, cooldown60s e limite20/24h.
- Rankings permanentes e semanais, força única, arquivo de temporadas, pagamentos únicos e bônus de XP por classificação anterior com expiração segmentada.
- Boss diário22h de Brasília, presença validada, guildbonus limitado, contribuição e último golpe com concessões únicas; scheduler resiliente a repetição/restart e sem rota pública de início manual.
- Eventos XP30%/6h, loteria100Rubies com elegibilidade histórica verificada e raid individual com baú rolado uma vez. Guerra semanal com inscrição/roster confiáveis, um ataque por membro, pontuação e fechamento.
- Migração002aditiva, comandos/grants/auditoria persistidos e transações com ledger/outbox; interface online com reconexão e retry do mesmo UUID. jogar.bat/perfil local permanecem separados.

Regras/fórmulas/custos/horários/caps em [COMMUNITY_SYSTEMS](COMMUNITY_SYSTEMS.md); razões em [ADR-010](ADR/0010-community-authority.md). Parâmetros são experimentais e não avaliação de equilíbrio humano/comercial.

## Verificação

| Evidência | Resultado |
|---|---|
| Suite total |94testes em9arquivos, incluindo66anteriores e28novos (2puros+26PostgreSQL) |
| Schema/contrato | TypeScript estrito, builds local/online, hashes de90arquivos de assets sem mudanças de originais |
| Chat |30replays concorrentes → uma mensagem; cooldown/mute/block/report; mensagem HTML literal e isolamento de guilda |
| Guildas | Criação sem débito duplo, cargos/transferência, último líder, convite expirado,20ªvaga com aceites concorrentes, XP/custo e pixel inválido |
| Arena | Cinco reais,20replays → um match, posições únicas/troféus, defesa vence empate, cooldown e limite atravessando semana |
| Eventos | Worker concorrente/último golpe único, saída/ausência, loteria sem elegíveis e100Rubies únicos, rollback após falha de outbox, raid sem novo roll/expiração |
| Tempo/temporada |22h BRT sobre data UTC seguinte, segunda00h, rollover/arquivo/prêmio único, XP30% e bônus de guilda vencendo no meio do intervalo |
| Operação | CLI real de mute com auditoria; API sem admin/event-start; migração001→002 preservando conta/sessão/snapshot |
| Navegador | Seis smokes: local/online/comunidade emdev/produção; comunidade com2perfis de fixture, conversa literal, convite/aceite, brasão após reload, chat privado, arena e boss |
| Layout/estabilidade |320/390/768px na comunidade;30ciclos de tabs com contagemDOM constante; regressões locais50ciclos,35texturas/38objetos, sem pageerrors |

[Smoke comunidade dev](phase6-browser-dev.json), [produção](phase6-browser-preview.json), [captura](phase6-screenshots/community-guild-390.png). Testes de navegador usam contas semeadas no banco isolado com recursos/andar de fixture; não medem progressão orgânica ou equilíbrio de PvP/guerra. Resultados de produção visual rechecados após aplicar molduras da HUD.

Ambiente local: Node24.19, Chromium153, PostgreSQL nativo18.4 em runtime isolado. Ajuste de UID do harness do contêiner não integra o projeto ou implantação. O workflow de CI permanece com imagem oficialPostgreSQL16, mas a execução desta F6 só pode ser afirmada após publicação/consulta ao run. Não houve novo soak30min nem teste de escala comercial. Os soaks F3/F4 permanecem históricos, sem serem reapresentados como execução nova.

## Decisões autônomas

Lock social global no primeiro piloto, limites5000perfis/200inscritos por boss, origens/contas daF5 e sem serviços pagos adicionais. Nomes/cargos/brasão/punições/tempos/custos e recompensas virtuais adotados conforme ADR. Google único para loteria, roster congelado e presença3s para eventos; sem criação de bots. Interface por menus com molduras existentes, sem nova arte incompatível. Dados e forma do save local preservados, apenas modificadores online por intervalo no domínio compartilhado.

## Estado e próximo passo

Conclusão técnica de desenvolvimento: pronta, com evidências locais. Falta publicar o commit e consultar a CI remota desta entrega; não declarar os runs antigos como validação da F6. Antes de público continuam configuraçãoGoogle real, banco/TLS/WSS/backups, moderação humana/políticas/retencão/privacidade, licenças, playtest de ritmo/competição e aparelhos/carga. Não houve gasto ou ativação de mercado/pagamentos. Próxima fase recomendada após fechamento: **F7 — mercado e economia compartilhada**, ainda não iniciada.

## Pendência de publicação

A revisão automática rejeitou o push da F6 à main: a autorização para prosseguir a fase não foi considerada autorização explícita para publicar este novo payload. Nenhum conteúdo F6 foi enviado ao remoto, nem há PR/CI da F6. O resultado está no commit local revisável. Publicação e CI dependem de autorização explícita; os testes locais acima permanecem válidos e não são apresentados como CI remota.
