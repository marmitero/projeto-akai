# V15 — resultados e limites

Etapa concluída para ensaio isolado em22/10/2026. Candidato `ad04f77a90287787a0fde737db5eea572791e3e8`, árvore `66d01441d5f32bf8763b1a83dee9d949392ccf55`. [CI39818218318](https://github.com/marmitero/projeto-akai/actions/runs/39818218318) e [Windows39818218329](https://github.com/marmitero/projeto-akai/actions/runs/39818218329) aprovadas. Fechamento posterior somente documental; código, SQL, testes, scripts e JSON iguais ao candidato validado.

## Evidências

- 335testes em38arquivos com PostgreSQL16, sem skips. Novos:13SQL e6combate puro.
- SQL: GET sem inscrição, roster real de8contas e cinco alvos; UUID/payload/replay e auditoria imutável; desafios concorrentes com revisão única; relógio após lock e cursor; vitória/troca de duas posições/+20, derrota/mínimozero;60s/20por24h através da semana; inscrição explícita e histórico preservado; stale board/semana; sessão/CSRF/flags/IDOR/andar5; evento/desabilitação; revogação de sessão/membro antes de replay após espera; rollback de estados/ranking/quota/recibos/outbox; backlog nativo limitado sem duelo e reconciliação dos recursos. Snapshots legados preservados.
- Combate puro: KO simultâneo favorável à defesa; intervalo real e replay determinístico; timeout120s sem ataque no prazo; defesa física versus mágica; limite5APS/1198ataques; seeds inválidas e campos forjados. Entradas congeladas não são mutadas.
- Browser V15 dev e preview, desktop1280×900 e mobile390×844: inscrições/oponentes reais e nenhum alvo falso no topo; desafio confirmado com resposta perdida, reload do mesmo comando e exatamente um match; histórico próprio de ataque/defesa; board obsoleto exige nova revisão e confirmação; DTO sem run/seed/stats privados; carteiras reconciliadas, Coin/Jade legados preservados e sem overflow/erros de página. O teste de stale no navegador incrementa a revisão do board como fixture; a concorrência entre desafios reais é coberta no SQL.
- Types/build/assets;19testes Node adicionais (6campanha,1integridade,4liquidez,4população,4rede); auditorias/replays V10/V11/V12; regressões combate/refino/economia, V13/V14, chat/mobile/bestiário, loop/RPG/mercado/monetização e browser local/online/comunidade/mercado/premium dev/preview aprovados. Windows executou os BATs reais e verificou fluxo LAN. Nenhum Android físico testado.

## Correções durante a validação

Checkpoint inicial `afa6f14520c3c7da1bebfd1c106472b2d954a74b` preservado na branch. Primeira CI39817846342 encontrou3falhas emfixtures: comparação confundia revisão interna com saldo; build forte não tinha andar conquistado configurado; salto de7dias expirava sessão antes do teste de semana. Corrigidas para verificar todos os campos econômicos exceto revisão, configurar explicitamente o andar sintético e mudar semana com sessão ainda válida. Acrescentados testes reais de desafios concorrentes e relógio em espera. CI final335 passou integralmente. O primeiro check local tinha175aprovados/157SQLignorados por ausência de PostgreSQL; evidência completa é a CI final, não esse resultado parcial.

As builds fortes e os20matches históricos inseridos para quota são fixtures técnicas, não progressão adquirida ou capacidade pública. A interface apresenta os stats atuais, duelos físicos e motivo do desempate em português. Mercado/arena compartilham bloqueio de novas mutações enquanto há intenção pendente, mantendo reenvio do mesmo recibo.

O export próprio @akai/shared/arena-v15 mantém entrypoint e módulos da campanha econômica intactos. Nenhum artefato numérico V10/V11/V12 foi reescrito; só metadados de consumidor no readiness mudaram. A primeira tentativa de export pelo entrypoint alterava hashes de proveniência e foi substituída antes do checkpoint.

## Decisões e próximos passos

Mesma identidade/run v2, ranking/histórico próprios e combate simultâneo v3 sem fontes econômicas novas. Semana da arena é ciclo de ranking; não implementa pagamentos ou pontuação de guilda. R7 liquida somente tempo nativo devido, nunca os segundos virtuais de duelo. Revisões de ator/board/semana congelam a intenção; stale/settling não recriam desafio com novo UUID. Reautorização ocorre depois de locks e antes de replay.

Não há decisão obrigatória do usuário para encerrar esta etapa. Próximos: guildas autenticadas, depois temporadas/arquivo/fechamento v2 em escopo delimitado; balanceamento PvP e playtest gratuito. Calibragem Coin/Força/HP/Jade/refino, liquidez/população, capacidade/retenção, corte/backup/reconciliação/rollback continuam gates. Economia real/+16–20/monetização off; activationReady=false. Publicação é código GitHub para ensaio local/LAN, sem contratar ou abrir infraestrutura pública.
