# R4 — hunts e seleção de atividade

20/10/2026. Implementação modular, com economia v2 ainda desligada. **Mais → Laboratório de builds → Atividade** permite testar carvão, ferro e ouro, com o motor R3, build editável, prazo exclusivo de 30s e prévia de material por vitória. Cenário possui movimento e filtro distinto; é uma prévia visual, não uma arena de combate com sprites. Não altera conta, XP ou carteira. A batalha antiga continua em segundo plano como na R3.

## Regras implementadas

- Mil andares por hunt, progresso independente. Carvão/ferro exigem torre5; ouro exige torre20 no seletor autoritativo preparado. O laboratório usa cenários livres para testar dificuldade, sem alegar desbloqueio real.
- Âncora de força no múltiplo de10 seguinte da torre; um inimigo por hunt. Carvão×1, ferro×1,25, ouro×1,6. Mistura mágica30%/10%/60%; intervalo1800ms. Usa números base, sem executar boss nem seu prêmio.
- Offset no bloco: HP1+0,04r, ataque1+0,025r. Envelope crescente mantém o maior valor anterior, corrigindo queda de dificuldade ao reiniciar r nos blocos tardios. Rampas após100: HP e ataque×(1+t²), ataque adicional×(1+4t³), t=(andar−100)/900. Isso é uma revisão explícita da candidataR1.1; não reaprova suas coortes.
- Material por vitória: floor(base×(1+0,2×(andar−1))^0,65), bases4/8/2. Tabela congelada gerada comDecimal60dígitos. Valores em unidades convertidos a milésimos no plano. Sem Coin, equipamento, pergaminho ou Jade; derrota,timeout e parcial concedem zero.
- Seleção impede saltar andares e repetir boss; torre comum vencida pode ser selecionada. Boss novo permanece reservado à etapa própria. Uma atividade/floor por snapshot; revisão esperada e cursor econômico liquidado antes de trocar.
- Conclusão de hunt altera somente seu maior andar e revisão, em cópia. Revisão antiga e atividade divergente são recusadas. O plano de material é separado e **não é um endpoint de resgate**. O futuro servidor deve manter encontro/RNG privados, validar vitória e aplicar progresso+ledger+saldo na mesma transação, com ID idempotente. Não aceitar resultado informado pelo cliente.

## Limites e integração

R4 prepara seleção/progressão/plano e playtest de encontros; **não liga ganhos reais**, mineração permanece até o corteR6. XP qualificado ainda não é creditado: R6 precisa consumir ciclos confirmados com teto de tempo e benchmark, integrar cada nível cruzado, carry e cursor; perdas/tempo incompleto não concedem XP. Não reutilizar o XP por abate antigo. Offline/cota Brasília/fallback seguro/lease entre aparelhos pertencem R6/R7; revisão pura sozinha não é trava distribuída. Repetição de torre aqui é validação do seletor, sem substituir a tela antiga.

A ordem de HP/ATQ é carvão<ferro<ouro, mas defesas específicas podem mudar a dificuldade percebida. Não promete que toda build terá o mesmo ranking de tempo. Faltam coortes integradas de aquisição/refino/XP e teste humano para aprovar90–120dias e conteúdo avançado. PróximoR5: refino/equipamentos; depois integraçãoR6/R7 e bosses/JadeR8. Monetização continua desligada/final.

## Evidências locais

Cinco testes R4 passaram, incluindo invariantes nos1000andares e avanço/replay. `npm run check` passou antes do teste adicional de conclusão:111testes locais aprovados/97PostgreSQLpulados; o teste adicional foi executado depois (5R4aprovados), comtypecheck ebuild atualizados. ACI executa a suíte completa comPostgreSQL16. Laboratóriodev/preview passou nas quatro resoluções320/390/844/1280; testa cada hunt, imagemHTTP200, logs, carteira inalterada e transição de volta à torre. Captura390×844revisada; não certificaAndroid físico.

[Grade216encontros](audit-results.json), níveis100/500/1000, andares10/100/500/900, seisbuilds, épico+9 e seedfixa4213. Carvão54vitórias/10derrotas/8timeouts; ferro54/12/6; ouro44/12/16. Esses resultados mostram barreiras em cenários sem poder suficiente, não aprovam a duração da campanha ou equilíbrio de todas as builds. Gear/pontos são de cenário, sem custos/aquisição. CIinclui a grade e smoke atualizado. Publicação àmain depende dechecks aprovados.
