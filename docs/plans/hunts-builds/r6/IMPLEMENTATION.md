# R6 — integração e ensaio pré-corte

20/10/2026. Integração dos módulos R2–R5, sem ativar economia real ou migrar contas. O contrato exige validação acoplada de mercado, offline e fonte definitiva de Jade antes do corte. Essa dependência permanece; não foi substituída por uma flag de ativação.

## Entregas

- Runtime integrado `economy-run-v6`: torre com três ondas, hunts, progresso independente, repetição comum, primeira vitória de boss, XP temporal, loot renovável, mochila/cofre, equipar, treino, refino e descarte por Coin. Não aceita comandos de clique/mina/fundição/tônico/pet.
- Prévia jogável em Mais → Prévia da economia, com save separado neste navegador. Tempo real apenas enquanto aberta/visível, avanço de 60s simulado, nível 1 inicial ou cenário sintético nível 100 claramente identificado. Não chama endpoints de compra/recompensa, não importa para conta real e não oferece offline. A batalha antiga da conta pode continuar ao fundo.
- Migração SQL005 aditiva cria somente tabelas de ensaio isoladas. Serviço operador `EconomyRehearsalService` e CLI `economy:rehearsal`: estágio idempotente de uma cópia R2, arquivo imutável, comandos transacionais, revisão, recibos, ledger de diferenças líquidas e eventos anexáveis. Não há rota HTTP de ativação ou transferência para a conta.

## Fronteiras econômicas

Torre por morte: Coin, chance 0,5% de equipamento e pergaminho 20ppm em comum>=100. Drops comuns antes de 100:80/17/3% comum/incomum/raro; desde 100:74/20/5/0,6/0,4% incluindo épico/lendário renovável. NívelItem=ceil(andar/10), qualidade90–110%, sem afixos novos. Cofre preserva identidade sem conversão automática; resgate exige espaço e nível. Descarte voluntário exige confirmação para raro/refinado, recusa equipado e gera sóCoin sem ressarcir refino.

Hunts geram somente seu material na morte e XP na vitória; sem Coin/equipamento/pergaminho/Jade. Tabelas R4 preservadas. XP não é concedido em derrota, caminhada ou pausa. Loot de inimigos efetivamente mortos antes de uma derrota permanece, uma vez por identidade; isso difere da aproximação de ciclos integralmente vencedores do simulador R1.1 e exige nova coorte integrada. O servidor nunca aceita morte/loot alegado pelo cliente.

Bosses da torre usam somente âncoras físicas e intervalos do catálogo existente `floorDefinition`, sem rebalancear ou desenhar boss novo. São adaptados ao pipeline R3, com evasão por andar e sem crítico de NPC. Não confundir esse adaptador com a etapa R8 de design/boss global/Jade. Seleção e avanço automático impedem repetir boss concluído, inclusive ao farmar andar anterior.

## Tempo e XP

Agenda e snapshots serializáveis, eventos em blocos de 32 para registrar morte com horário preciso; teto de trabalho preserva backlog. Mesma trajetória por leitura curta/lote/JSON, descontada revisão administrativa. HP/stats congelados entre ondas; treino/equipar/refino afetam o próximo ciclo. Pausar abandona o combate atual e seu XP parcial, sem desfazer loot confirmado, com transição de 3s. Trocar atividade também abandona o ciclo; não existe retomada com inimigo ferido e HP gratuito.

XP em ms qualificados, limitado ao tempo de combate confirmado da vitória e ao benchmark ofensivo de build Veloz/épico +9/nível legal. Benchmark usa dano esperado do pipeline R3, acerto/crítico e ataques inteiros por inimigo; não simula sobrevivência ou preço da build. Recalcula elegibilidade e teto a cada nível cruzado: min(1,(andar equivalente/nível)²). Carry em micro-ms persistido; aritmética racional e teto de 96 dias da tabela R2. Caminhadas foram excluídas do benchmark/XP; R1.1 aproximava ciclos incluindo transições, portanto suas medianas 109/107 dias **não revalidam esta implementação**. Prazo de 90–120 dias depende da calibração conjunta futura.

## Ensaio PostgreSQL

Stage adquire o lock social antes do lock de conta, lê snapshot/escrow/ofertas/dívida Ruby/gastos, verifica plano R2 e recusa pendências de mercado. O backup e o estado inicial são imutáveis; repetir requestId retorna o mesmo ensaio. Não resolve anúncios nem devolve taxa de uma conta real silenciosamente. Novo domínio não copia Ruby ou dívida para uma segunda carteira.

Comandos exigem ID, hash do payload e revisão. Mesmo ID/hash retorna recibo; mesmo ID com payload divergente é recusado. Duas operações concorrentes são serializadas pelo lock da linha; a segunda revisão antiga é rejeitada e fica registrada. Estado, diferenças de saldo/proteção/XP, evento e recibo confirmam juntos. Falha SQL retorna tudo ao estado anterior. Ledger registra diferenças líquidas por transação, não uma auditoria de fluxos brutos intratransação; isso deve ser ampliado antes do corte definitivo. Não interpretar ausência de diferença líquida como ausência de loot/gasto durante um comando.

Entropia de loot/refino deriva de HMAC-SHA256 privado por identidade estável do evento/comando, com rejeição sem viés de módulo. Seed do combateR3 permanece privada ao servidor; o RNG visual/local da prévia não tem autoridade. Nenhuma seed, clock ou saldo livre do cliente entra no serviço operador. Leituras `inspect` são internas e contêm estado privado; não registrar como resposta pública.

Ensaio só liquida intervalos explícitos até 30s; ausência maior é pulada, abandonando o encontro parcial. Não tenta conceder 8h offline antes da R7. Encerrar ensaio é reversível por novo ensaio, sem apagar histórico; rollback-export verifica hash e exporta o arquivo original, **não sobrescreve uma conta real que continuou jogando**.

CLI após `db:migrate`: `npm run economy:rehearsal -w @akai/server -- stage --account UUID --request UUID`. Comandos via arquivo JSON privado: `command --run UUID --file caminho.json`, com `{commandId,expectedRevision,action}`. Ação `settle`, `close` ou tipos do runtime integrado. `report --run UUID` reconcilia ledger; `rollback-export --run UUID --out backup-privado.json` cria arquivo 0600 sem sobrescrever. Não publicar arquivo com dados pessoais/recuperação. `jogar.bat`/`servidor.bat` continuam padrão; usuário testa a prévia pelo menu, semCLI.

## Antes do corte real

Permanecem necessários: reconciliação acoplada de fontes, mercado/escrow/taxas/ofertas e populações legadas; ledger bruto e inventário/procedência; consumidores de stats e fontes sociais antigas aposentadas; offline/cota Brasília/concorrência entre aparelhos R7; bosses/Jade R8; coortes reais da nova agenda e playtest gratuito. Não declarar campanha ou raridade+20 aprovadas. +16–20 continuam bloqueados, sem Jade provisória, e monetização segue desligada/final. Nenhum comando nesta etapa encerra a economia antiga de uma conta ou converte saldo real.

## Evidências locais

`npm run check` aprovado com 127 testes executados/105 testes PostgreSQL pulados (232 testes/26 arquivos no total). Oito testes do runtime integram ondas/transições, retomada JSON, lote/leitura curta/backlog, fontes exclusivas de hunts, boss não repetível, mochila cheia/cofre sem perda, stats congelados, XP/carry/cruzamento de nível, pausa/derrota, fontes aposentadas, resgate legado bloqueado e descarte por Coin. Caso de equivalência usa timeout 15s para a carga de clonagem/validação, sem reduzir os 60s simulados.

[Política inicial determinística](audit-results.json): starter/seed 4213, sem Ruby/refino/equipar loot e somente treino Força/Vitalidade até 9 por Coin. Torre 5 em 190s; carvão 1 em 1540s; ferro 1 em 2430s, nível 3. Não demonstra jogador médio, prazo da campanha, economia com mercado ou variedade ótima de builds. Demonstra um caminho de acesso sem exigir material antes de desbloquear sua fonte. Jade 0 e nenhum recurso emprestado.

Smokes dev/preview da prévia: 320/390/844/1280px, vitória inicial, treino com débito, refino protegido com consumo, hunt sem Coin/pergaminho, save/reload idêntico, carteira real inalterada, cinco ciclos sem duplicar diálogo/canvas e sem erros de página. Captura 390×844 revisada. Relatórios economy-preview-dev/preview.json. Primeira execução dev coincidiu com recompilação compartilhada/HMR e perdeu o menu; com fontes estáveis, reexecução dev e preview aprovadas. Não certifica Android físico.

Pergaminhos da torre estão integrados; os planos semanais R5 continuam preparados, sem evento jogável/grant semanal nesta etapa. A integração de eventos exclusivos e a oferta gratuita total seguem como gate antes do corte. Não alegar que todos os consumidores sociais legados já foram migrados.

## Fechamento validado

Runtime `3dfc469e546867fbac07ac1ec5f90fe10be48a53`, árvore `c06e4fda732f48450b90576f9ecd3be7cb8d4fa3`. [CI principal](https://github.com/marmitero/projeto-akai/actions/runs/39462975288) e [Windows](https://github.com/marmitero/projeto-akai/actions/runs/39462975278) aprovadas: **232 testes em 26 arquivos, PostgreSQL16, sem skips**, auditorias R2–R6, três prévias/laboratórios dev/preview e regressões completas local/online/chat/mobile/bestiário/comunidade/mercado/loja. SQL005 e os oito testes transacionais foram executados com banco real. Windows executou iniciadores BAT local e mobile; não certifica Android físico ou Docker Desktop no Windows.

[PR13](https://github.com/marmitero/projeto-akai/pull/13). Fechamento posterior somente em documentação; runtime, tabelas, migração SQL, scripts, testes e cliente idênticos ao commit validado. Publicação autorizada permanentemente. Entregue a integração jogável e o ensaio pré-corte. **Corte real de contas não executado nem liberado:** permanecem os gates de mercado/ledger bruto/consumidores, eventos gratuitos, R7 offline e R8 bosses/Jade. Não declarar aposentadoria da mineração no jogo atual ou economia nova ativa. Próximo trabalho recomendado: R7, seguido da revisão dos gates e da etapa própria R8. Monetização permanece final/desligada.
