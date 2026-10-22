# V17 — resultados e limites

Concluída para temporadas de arena/guildas no ensaio isolado,22/10/2026, [PR27](https://github.com/marmitero/projeto-akai/pull/27). Candidato `f604b879b5ba73036fd53676e7b90452afdaf98d`, árvore `398629061b62f7541a500f149f956b9c368aad0b`. [CI push39842426183](https://github.com/marmitero/projeto-akai/actions/runs/39842426183), [CI PR39842436517](https://github.com/marmitero/projeto-akai/actions/runs/39842436517) e [Windows39842436246](https://github.com/marmitero/projeto-akai/actions/runs/39842436246) aprovadas; Windows push39842426135 também aprovada. Fechamento posterior somente Markdown, sem mudar runtime/SQL/testes/scripts/JSON validados.

## Implementação

Calendário semanal America/Sao_Paulo e acompanhamento explicitamente iniciado, sem prêmios retroativos pré-acompanhamento. GET somente leitura, arquivo imutável arena/guildas, nomes congelados, histórico original preservado. Fechamento confirmado com seleção ativa e prêmios Coin únicos por semana/fonte/conta: arena500/300/100participantes e guildas300/200/100por membro com24h na fronteira. Mesma carteira/ledger canônicos, sem grants legados, Jade, proteção ou domínio extra.

Guardas impedem novos resultados/mudanças de vínculo após a fronteira até fechar. Mesmo lockguild antes de arena/run, relógio amostrado após espera e watermarks persistidos. Ausência longa fecha somente semana acompanhada e inicia atual; não fabrica semanas sem atividade ou bônus vencidos. Revalida sessão/admissão antes de replay. Arquivo/prêmios/ledger/carteiras/recibo/outbox transacionais, rollback integral em falha. Intenção da UI persistida porconta antes do POST e mesmoUUID após resposta perdida/recarga, bloqueio dos outros painéis até resolução.

## Evidências

- CI final:369testes/42arquivos PostgreSQL16 sem skips,13SQL+2contrato/calendário novos. Types/build/assets,19Node adicionais, oito contratos, auditorias/replays e regressões de navegador dev/preview completas passaram. Windows executou BATs reais e LAN.
- Local: types/build/assets e180testes passaram,186SQL ignorados por ausência de PostgreSQL antes dos três últimos casos. Tipos finais passaram depois dos testes adicionais.19Node (6campanha/1integridade/4liquidez/4população/4rede), oito auditorias de contratos e replays adquiridos V10/V11/V12 passaram. Núcleo/root/hashfiles econômicos não alterados; readiness mudou metadados do consumidor, activationReady=false.
- Novos testes:13SQL e2contrato/calendário. Incluem GETpuro/strict/identidade, fronteira exata, participantes por ataque ou defesa, troféus separados de posição, guildas e24h, concessões concorrentes/replay, revisão antiga, payload divergente, rollback de outbox, indisponibilidade, ausência longa, cursormonotônico, append-only, não retroatividade, privacidade e revogação pós-lock antes de receipt. Calendário inclui horário de verão histórico e segunda00h.
- Browser novo dev/preview: duas contas desktop1280×900/mobile390×844 emulados, início/revisão/fechamento, perda de resposta após commit/reload/mesmoUUID, quatro fontes sem duplicação, Coin800/600conforme colocação+guilda, arquivo literal/XSSsemexecução, reconciliação e ausência de overflow/erros. Ambos aprovados nas rodadas finais de push e PR, incluindo recuperação/única concessão e reconciliação.

## Ocorrências

Checkpointfdf5707 preserva início. Candidato0ca87ea teve364/366testes aprovados; duas falhas de preparação nos testes novos: requisição sem headers barrada peloCSRF403antes da identidade401, e sessão expirada no cenário de35dias sem servidor. Headers de cliente sem cookie e validade sintética da sessão corrigidos sem alterar autenticação/runtime. RodadaPR39840124390 falhou e não é evidência verde; falhas não foram integradas àmain.

Candidato65c1c644 passou369/369testes em42arquivosPG16 e Windows39841047621/BAT/LAN. A rodadaPR39841047736 passou contratos/auditorias/simulações, mas o browser V17 interrompeu na preparação: perfil já criado pelo fluxo normal e INSERT sintético sem conflito. Driver corrigido para upsert do nome da fixture, sem alteração do jogo. Essa rodada também não é evidência de suíte completa; candidato final é f604b879, que altera somente esse script em relação a65c1c644.

## Decisões e próximos passos

Acompanhamento explícito e fechamento antes de gestão/match evitam reconstrução de vínculo retroativo sem histórico temporal préV17. Prêmios virtuais seguem os valores documentados, com fontes próprias e ledger, sem copiar saldos/recibos legados. Nenhum bônus antigo multiplica segundos qualificados. Na coorte canônica de20contas, o teto aritmético é800Coin por conta/semana (500arena+300guilda) e6900Coin por coorte/semana (900arena+20×300guilda), antes de exclusões. Esse limite contabiliza a fonte nova, sem aprovar equilíbrio deCoin ou população pública. Não há decisão obrigatória do usuário para a etapa.

FixturesSQL de troféus/matches/pontos e builds fortes apenas testam calendário/pagamento/UX; não são progressão adquirida nem certificação de balanceamento. O duelo nativo/XP da arena continua coberto separadamente por V15/V16. Próximos: arquivo diário durável do boss antes do reset R8, fonte/escala de XP da guilda por contribuição, guerra autenticada e seus resultados/XP, bônus de progressão calibrados com modelo de tempo e playtest gratuitoPvP/guildas. Arquivo de dano de boss ainda não faz parte desta fatia.

GatesCoin/Força/HP/Jade/refino/liquidez/população/capacidade/retenção/moderação/corte/backup/reconciliação/rollback preservados. Economia real,+16–20,monetizaçãooff. Sem Android físico/playtest humano ou infraestrutura pública; publicação é código para teste local/LAN.
