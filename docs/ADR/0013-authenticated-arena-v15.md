# ADR-013 — Arena v2 autenticada no ensaio canônico

22/10/2026. Aceita como decisão técnica sob a autorização de prosseguir para arena autenticada e autonomia de implementação. Validação final registrada nos [resultados V15](../plans/hunts-builds/authenticated-arena-v15/RESULTS.md). Não aprova produção ou equilíbrio PvP.

Contexto: V13 fixa identidade/run/autoridade de eventos; V14 negocia no mesmo ensaio. A arena legada consome outra economia, atributos e bônus; reutilizar seus snapshots ou prêmios misturaria os domínios durante a migração v2.

Decisão: arena separada, derivada exclusivamente do roster canônico V13. Mantém seleção dos cinco acima, posições/troféus, cooldown e quota móveis. Ranking semanal segue o calendário existente; não concede recursos, XP de guilda ou prêmios. Reutiliza stats e fórmulas v3, mas resolve ataques simultâneos por timestamp para preservar desempate da defesa. Full HP e máximo120s virtual; não avança tempo econômico nem altera HP da torre. Seed do servidor e entradas congeladas permitem replay interno; DTO não revela seed, run ou stats alheios. Export próprio @akai/shared/arena-v15 preserva módulos/entrypoint da campanha adquirida, que não dependem de PvP.

Transações serializam arena→runs ordenados; reautorizam após locks antes de recibos, sem adquirir lock de mercado/evento depois dos runs. R7 liquida parcelas nativas limitadas; backlog não executa duelo. Match/rank/cooldown/ledger/recibo/outbox atômicos. Revisões de personagem, board e semana validam a intenção revisada. SessionStorage recupera o mesmo comando; stale exige nova confirmação, sem reroll ou troca automática de alvo.

Alternativas: chamar a arena legada foi descartado por misturar carteiras/stats/bônus. O motor v3 sequencial favoreceria quem atacasse primeiro em timestamps iguais; adapter simultâneo evita essa preferência. Adiar todo o PvP até guildas/temporadas manteria o consumidor sem validação; o ensaio delimitado permite testar agora, sem fontes econômicas novas.

Consequências: coorte1–20 local/LAN, flags V13 off por padrão. Histórico durável, temporada semanal própria, sem integração de prêmios ou pontos de guilda. Retenção/escala, balanceamento PvP, temporadas/guildas v2 e corte de contas continuam pendentes. ADR-010 segue vigente para o legado. Economia real/+16–20/monetização off.
