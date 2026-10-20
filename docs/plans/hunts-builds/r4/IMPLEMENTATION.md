# R4 — hunts e seleção de atividade

20/10/2026. Implementação modular, com economia v2 ainda desligada. **Mais → Laboratório de builds → Atividade** permite testar carvão, ferro e ouro, com o motor R3, build editável, prazo exclusivo de 30s e prévia de material por vitória. Cenário possui movimento e filtro distinto; é uma prévia visual, não uma arena de combate com sprites. Não altera conta, XP ou carteira. A batalha antiga continua em segundo plano como na R3.

## Regras implementadas

- Mil andares por hunt, progresso independente. Carvão/ferro exigem andar 5 da torre; ouro exige andar 20 da torre no seletor autoritativo preparado. O laboratório usa cenários livres para testar dificuldade, sem alegar desbloqueio real.
- Âncora de força no múltiplo de 10 seguinte da torre; um inimigo por hunt. Carvão×1, ferro×1,25, ouro×1,6. Mistura mágica 30%/10%/60%; intervalo 1800ms. Usa números base, sem executar boss nem seu prêmio.
- Offset no bloco: HP 1+0,04r, ataque 1+0,025r. Envelope crescente mantém o maior valor anterior, corrigindo queda de dificuldade ao reiniciar r nos blocos tardios. Rampas após 100: HP e ataque×(1+t²), ataque adicional×(1+4t³), t=(andar−100)/900. Isso é uma revisão explícita da candidata R1.1; não reaprova suas coortes.
- Material por vitória: floor(base×(1+0,2×(andar−1))^0,65), bases 4/8/2. Tabela congelada gerada com Decimal com 60 dígitos. Valores em unidades convertidos a milésimos no plano. Sem Coin, equipamento, pergaminho ou Jade; derrota,timeout e parcial concedem zero.
- Seleção impede saltar andares e repetir boss; torre comum vencida pode ser selecionada. Boss novo permanece reservado à etapa própria. Uma atividade/floor por snapshot; revisão esperada e cursor econômico liquidado antes de trocar.
- Conclusão de hunt altera somente seu maior andar e revisão, em cópia. Revisão antiga e atividade divergente são recusadas. O plano de material é separado e **não é um endpoint de resgate**. O futuro servidor deve manter encontro/RNG privados, validar vitória e aplicar progresso+ledger+saldo na mesma transação, com ID idempotente. Não aceitar resultado informado pelo cliente.

## Limites e integração

R4 prepara seleção/progressão/plano e playtest de encontros; **não liga ganhos reais**, mineração permanece até o corte R6. XP qualificado ainda não é creditado: R6 precisa consumir ciclos confirmados com teto de tempo e benchmark, integrar cada nível cruzado, carry e cursor; perdas/tempo incompleto não concedem XP. Não reutilizar o XP por abate antigo. Offline, cota de Brasília, fallback seguro e lease entre aparelhos pertencem a R6/R7; revisão pura sozinha não é trava distribuída. Repetição de torre aqui é validação do seletor, sem substituir a tela antiga.

A ordem de HP/ATQ é carvão<ferro<ouro, mas defesas específicas podem mudar a dificuldade percebida. Não promete que toda build terá o mesmo ranking de tempo. Faltam coortes integradas de aquisição/refino/XP e teste humano para aprovar 90–120 dias e conteúdo avançado. Próximo: R5, refino/equipamentos; depois integração R6/R7 e bosses/Jade R8. Monetização continua desligada/final.

## Evidências locais

Cinco testes R4 passaram, incluindo invariantes nos 1000 andares e avanço/replay. `npm run check` passou antes do teste adicional de conclusão:111 testes locais aprovados/97 testes PostgreSQL pulados; o teste adicional foi executado depois (5 testes R4 aprovados), com typecheck e build atualizados. A CI executa a suíte completa com PostgreSQL 16. Laboratório dev/preview passou nas quatro resoluções 320/390/844/1280; testa cada hunt, imagem HTTP 200, logs, carteira inalterada e transição de volta à torre. Captura 390×844 revisada; não certifica Android físico.

[Grade de 216 encontros](audit-results.json), níveis 100/500/1000, andares 10/100/500/900, seis builds, épico +9 e seed fixa 4213. Carvão: 54 vitórias/10 derrotas/8 timeouts; ferro: 54/12/6; ouro: 44/12/16. Esses resultados mostram barreiras em cenários sem poder suficiente, não aprovam a duração da campanha ou equilíbrio de todas as builds. Gear/pontos são de cenário, sem custos/aquisição. CI inclui a grade e smoke atualizado. Publicação à main depende de checks aprovados.

Ponto de calibração: ouro 900, no nível 1000, épico +9, somente Veloz venceu (21s); demais cinco presets atingiram 30s com HP restante alto. Assim, esse recorte pressiona dano/tempo mais que sobrevivência e não demonstra utilidade equivalente de builds defensivas. Reavaliar composição, ameaça recebida e aquisição na simulação integrada; não apresentar a grade como economia definitivamente balanceada. Não exigir +20 para a campanha por causa desse resultado isolado.

## Fechamento validado

Runtime `a22f9751c461be3dc679d118684193a9ea565bbf`, árvore `c2d09abd6d80af7f5700e8b2d3370b41c4f5296a`. [CI principal](https://github.com/marmitero/projeto-akai/actions/runs/39448268706) e [Windows](https://github.com/marmitero/projeto-akai/actions/runs/39448268764) aprovadas: **209 testes em 23 arquivos, PostgreSQL 16, sem skips**, grade R4 de 216 encontros, laboratório dev/preview e regressões completas local/online/mobile/bestiário/chat/mercado/loja. Windows testou os iniciadores BAT local e mobile. Não certifica aparelho Android físico ou Docker Desktop no Windows.

[PR11](https://github.com/marmitero/projeto-akai/pull/11). Fechamento posterior apenas em documentação, sem alterar runtime, testes, tabelas ou scripts validados. Publicação autorizada pela regra permanente. Próximo: R5, equipamentos e refino; ativação econômica e ganhos reais continuam reservados à integração.
