# V19 — resultados e limites

V19 concluída para ensaio isolado, [PR29](https://github.com/marmitero/projeto-akai/pull/29). Candidato `9351eeef911ecb124b724c9d470e40180cf1c449`, árvore `17e9e663f7b0cfa21f7548d9c1e5754ec83ff9a2`. [CI PR39878174935](https://github.com/marmitero/projeto-akai/actions/runs/39878174935) e [push39878169657](https://github.com/marmitero/projeto-akai/actions/runs/39878169657) completas aprovadas:412testes/47arquivos PostgreSQL16 sem skips, auditorias e regressões browser dev/preview. [Windows39878174938](https://github.com/marmitero/projeto-akai/actions/runs/39878174938)/39878169667 aprovados no mesmo SHA. Fechamento posterior somente Markdown, preservando código/SQL/testes/scripts/JSON do candidato.

## Resultado funcional

Inscrição autenticada por líder, snapshot v2 confiável de elenco/vínculos/atributos/nível, abertura com filtro de disponibilidade e vínculo exato, pareamento semanal por nível/UUID e bye sem prêmio. Alvo por índice com módulo, duelo nativo V15/seed privada, um ataque por conta/semana. Pontos3por vitória, desempate por frações racionais exatas de HP removido, igualdade total preservada.

Fechamento explícito após domingo19h: arquivo público sem dados privados,500/250/100Coin somente atacantes ainda elegíveis conforme vitória/empate/derrota e100XP de guilda vencedora com dois membros elegíveis restantes. Fontes únicas semana/conta, XP datado close−1, ausência longa sem fabricar semanas. Guilda congelada desde abertura até fechamento; temporada aguarda a guerra. GET puro, sem scheduler/grants implícitos. Relógio compartilhado e autorização depois dos locks/antes de replay. Arquivo/XP/wallet/ledger/receipt/outbox atômicos, rollback/retry sem duplicação. UI com revisão/confirmar, intenção persistida antes do envio, UUID conservado em recarga, textos literais e painéis mutuamente bloqueados enquanto há pendência.

## Evidências finais

V19 concluída para ensaio isolado, [PR29](https://github.com/marmitero/projeto-akai/pull/29). Candidato `9351eeef911ecb124b724c9d470e40180cf1c449`, árvore `17e9e663f7b0cfa21f7548d9c1e5754ec83ff9a2`. [CI PR39878174935](https://github.com/marmitero/projeto-akai/actions/runs/39878174935) e [push39878169657](https://github.com/marmitero/projeto-akai/actions/runs/39878169657) completas aprovadas:412testes/47arquivos PostgreSQL16 sem skips, auditorias e regressões browser dev/preview. [Windows39878174938](https://github.com/marmitero/projeto-akai/actions/runs/39878174938)/39878169667 aprovados no mesmo SHA. Fechamento posterior somente Markdown, preservando código/SQL/testes/scripts/JSON do candidato.

- 20novos casos:17SQL+3domínio, cobrindo pureza/privacidade/contratos/gates/CSRF,24h/vínculo exato, snapshots nativos, abertura/bye/freeze, ataque único/replay/concorrência, fonteCoin/XP/draw, rollbackoutbox, calendário/temporada, indisponibilidade parametrizada, revogação pós-lock, ausência35dias/restart/append-only e relógio regressivo.
- Browser dev e preview aprovados: quatro contas/duas guildas, duelos nativos reais, revisão/confirmação, resposta perdida após commit/reload/replay mesmaUUID, somente atacantes pagos, arquivos literais semHTML, desktop1280×900/mobile390×844 emulado, sem overflow/erros, saldos reconciliados. Regressões V13–V18 e todos os demais fluxos da suíte passaram.
- Windows: BAT real em modo local e LAN, sem certificação de Android físico.
- Local:190testes sem banco/35arquivos passaram;218SQL ignorados antes das quatro ampliações por ausência de PostgreSQL. Types/build/assets e tipos posteriores passaram;19Node adicionais passaram sem skips. A CI final acima certifica412/47 sem skips.
- Análise contábil19cenários (2–20contas) passou: teto conservador500Coin/conta/semana e10000/coorte20 da guerra; com tetosV17,1300/conta e16900/coorte20.100XP por vitória de guilda. BalanceApproved/activationReadyfalse. Não são elencos sociais adquiridos, aprovação de matchmaking ou orçamento competitivo.

## Ocorrências anteriores à integração

Candidato83c57a85 preserva primeiro checkpoint. PR39877832038/push39877818099 passaram406/408testes em PostgreSQL16: duas fixtures novas falharam. Uma tentava alterar atributo sem orçamento disponível (ATTRIBUTE_BUDGET_EXCEEDED), substituída por equipar arma válida para provar snapshot congelado. Outra simulava35dias sem renovar a sessão, corrigida no dado sintético de teste. Regras de admissão/budget/sessão não foram afrouxadas. Windows passou, mas rodadaSQL falha não conta como evidência completa.

Candidatoc994f845 acrescenta indisponibilidade parametrizada, concessões exatas, UI/limites/gates; rodadas completas canceladas por substituição não provam resultado final. Candidato9351eeef corrige somente a fixture de equipamento em relação ac994f845. PR39878174935/push39878169657 e Windows39878174938/39878169667 completos aprovados no mesmo SHA. Histórico preservado.

## Decisões e próximos passos

Motor V15 reutilizado sobre snapshots v2, sem importar bônus/grants/saldos legados; novos fontes/versionamento/SQL isolados preservam root/shared/hashes adquiridos. Coin500/250/100 e100XP seguem contrato social de teste, não ativam economia real nem mudamJade. Congelamento de gestão durante a janela e guarda da temporada impedem troca retroativa. Desempate racional evita vencedor causado por arredondamento. Fixtures de vínculo/builds/placares explicitamente técnicas; dano nativo real testado separadamente. Sem decisão obrigatória do usuário.

Próximo: bônus de progressão compatíveis com domínio por tempo e calibragem, depois playtest gratuitoPvP/guildas adquirido e análise conjunta dos sinks/estoques/concentração. GatesCoin/Força/HP/Jade/refino/liquidez/população/capacidade/retenção/moderação/corte/backup/reconciliação/rollback permanecem. Economiareal/+16–20/monetizaçãooff, activationReadyfalse. Sem Android físico, playtest humano ou infraestrutura pública; publicação é código para local/LAN.
