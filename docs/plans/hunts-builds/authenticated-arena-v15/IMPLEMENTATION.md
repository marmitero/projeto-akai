# Fase 6 / V15 — arena autenticada de teste

Implementação e validação concluídas para o ensaio isolado. Continuação autorizada da V14; não ativa economia real, capacidade pública ou monetização.

## Identidade e operação

A arena usa os mesmos runs v2 admitidos na autoridade canônica V13, sem copiar a carteira legada. SQL010 cria ranking semanal, cursor global, cooldown por conta, histórico, recibos e outbox próprios. Não há novo pin ou roster selecionável pelo cliente. Executar build e migrações usuais no banco isolado já configurado para V13. Manter V13_HTTP_TEST/V13_TEST_DATABASE explicitamente ativos apenas nesse ambiente local/LAN, fora de production e com monetização off. As rotas continuam off por padrão.

Mais → Ensaio online v2 → Arena online v2 de teste. Concluir o andar principal 5; revisar e confirmar Atualizar inscrições da arena. A ação admite os membros elegíveis reais do roster canônico, ordenados por registro e UUID; novos membros são anexados. GET não inscreve ninguém. Primeiro colocado não recebe oponente artificial. Até cinco jogadores elegíveis imediatamente acima podem ser desafiados.

## Regras e combate

Vitória troca somente as posições de atacante/defensor e soma20troféus; derrota retira10, mínimozero. Troféus do defensor não mudam. Intervalo60s, máximo20desafios em janela móvel24h, inclusive entre semanas. Semana segue calendário America/Sao_Paulo, segunda-feira. Novo ranking exige inscrição explícita; histórico anterior, cooldown e contagem móvel permanecem. Sem Coin/XP/Jade/material/prêmios de guilda ou de temporada. Guildas e liquidação de temporadas continuam como etapa posterior.

Stats atuais de ambos vêm exclusivamente de heroStatsV3 após liquidar tempo R7 devido: ataque/HP/defesa física e mágica/intervalo/destreza/esquiva/crítico. Builds atuais de jogador são físicas; defesa mágica não reduz dano físico. Vida cheia independente da torre. Fórmulas v3 de acerto/dano/crítico, intervalo real mínimo200ms (5APS). Adaptador puro resolve ataques simultâneos antes de aplicar ambos os danos: KO simultâneo e timeout favorecem defesa. Prazo120s; nenhum ataque no instante do prazo. Tempo virtual não avança relógio econômico nem cria farm. Seed CSPRNG e stats/revisões/posições congelados ficam no audit interno; DTO entrega somente resultado e identidades públicas.

## Transação e recuperação

POST /api/v1/test-v2/arena aceita estritamente {commandId,expectedRevision,arenaRevision,seasonId,action}, action enroll ou challenge com opponentId público. Conta/run derivam da sessão; ator, stats, tempo, seed e posições não são fornecidos pelo cliente. CSRF/origem/rate limit V13 preservados. Ordem de locks: advisory41652015 → mundo da arena → runs canônicos ordenados → reautorização e membros. Não adquire lock de evento/mercado depois dos runs. Relógio pós-lock limitado por cursor persistido. Participação ativa em evento de qualquer combatente bloqueia duelo.

Liquidação nativa limitada1000eventos por combatente precede o duelo. Backlog confirma somente progresso nativo, recibo settling e revisões pertinentes; sem match/quota/cooldown/troféus. Rejeição de domínio deixa recibo e incrementa revisão do ator, sem efeito econômico. Match, troca de posições, revisões de ambos, ledger de deltas R7, cooldown, recibo e outbox são atômicos. Históricos/recibos/outbox append-only. Falha inesperada reverte tudo. Repetir UUID/payload devolve o mesmo recibo sem reroll; payload diferente com mesmo UUID é409. Acesso revogado é recusado inclusive em replay após espera por locks.

A revisão na interface congela personagem, board, semana e alvo antes da confirmação. Intenção é persistida em sessionStorage por conta antes do envio; resposta perdida/recarga reenvia o mesmo UUID. Stale/settling encerra a intenção e exige nova revisão; nunca escolhe novo alvo ou repete desafio automaticamente com novo ID. Mercado, economia e arena bloqueiam novas mutações enquanto há resultado pendente; a recuperação de recibos segue disponível. Sem saldo ou resultado otimista.

## Limites

Autoridade de ensaio1–20, sem sharding global, aprovação de liquidez/população, corte de contas ou prêmios competitivos econômicos. Não certifica balanceamento PvP de todas as builds nem dispositivo Android físico. Regras antigas de arena, guilda e temporadas não são migradas nesta fase. Economia real/+16–20/monetização off; activationReady=false.

O adaptador puro tem export separado `@akai/shared/arena-v15`; não altera o entrypoint ou os módulos usados pela campanha econômica adquirida. Auditorias V10/V11/V12 continuam verificando seus hashes e artefatos originais; o código novo de arena é coberto pelos testes V15, não por aqueles hashes de campanha.

## Fechamento

Candidato `ad04f77a90287787a0fde737db5eea572791e3e8`, árvore `66d01441d5f32bf8763b1a83dee9d949392ccf55`. CI39818218318 e Windows39818218329 aprovadas:335testes/38arquivos PostgreSQL16 sem skips,13SQL+6combate novos,19Node adicionais, auditorias e browser dev/preview desktop/mobile emulado completos. Sem Android físico. Evidências, fixtures corrigidas e limites em [RESULTS.md](RESULTS.md). Fechamento somente documental após validação, sem alterar runtime/SQL/testes/scripts/JSON.
