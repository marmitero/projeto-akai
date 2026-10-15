# ADR-010 — Comunidade autoritativa de desenvolvimento

15/10/2026. Adotada sob autonomia aprovada para escolhas não financeiras da F6.

Contexto: F5 já tem identidade/transações/ledger; faltavam os sistemas de comunidade previstos no Master Prompt. Não há serviços públicos contratados ou equipe de moderação configurada.

Decisão: serviços sociais PostgreSQL na migração002; lock transacional social antes de locks de contas, registro idempotente de comandos e concessões. Simplifica concorrência de vagas, posição PvP, último golpe e fechamentos nesta entrega. Processo/leituras/comandos podem avançar calendário, mas só um escritor social é efetivo por vez. Sem Redis/broker adicional, sem relógio/dano do cliente.

Interface online em Mais→Comunidade. Chat literal com bloqueio/denúncia e moderação por CLI auditada, sem endpoint administrativo público. Guildas20–38, cargos e convite24h, brasão16×16/paleta8; parâmetros de custos em COMMUNITY_SYSTEMS. Arena: cinco reais acima, troca de posições, resultado por stats confiáveis sem tônico, empate favorece defesa, cooldown60s e limite20/24h.

Temporadas em semanas de Brasília, arquivo e pagamentos únicos. Boss22h/30min com presença3s e tick1s, dano/guildbonus limitados e último golpe único. Eventos XP12h–18h(+30%),loteria18h/100Rubies com Google/presença comprovada e raid20h–21h. Guerra dominical18h–19h com inscrição/roster confiáveis, um ataque por membro e fechamento único. Horários/custos/tabelas são escolhas experimentais, não equilíbrio comercial comprovado.

Consequências: piloto limitado a5000perfis e200inscritos/boss; escala exige medir/substituir gargalos. Requisitos de Google na loteria e ausência de bots evitam elegibilidade fictícia, sem prometer eliminação de toda conta alternativa. Nenhum pagamento/mercado foi ativado. jogar.bat permanece local e não simula multiplayer. Nenhum save schema novo é necessário, XP online recebe modificadores por intervalo; local usa defaults anteriores.

Alternativas adiadas: serviços sociais terceirizados e scheduler distribuído com filas; nenhum custo foi autorizado/contratado. Permissões, fórmulas, dados, migração, cronograma, guardas de debug e gates públicos em [COMMUNITY_SYSTEMS](../COMMUNITY_SYSTEMS.md). Evidência em STAGE_06_REPORT. F7 não é parte da entrega.
