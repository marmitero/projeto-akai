# R6 — integração e ensaio pré-corte

20/10/2026. Integração dos módulos R2–R5, sem ativar economia real ou migrar contas. O contrato exige validação acoplada de mercado, offline e fonte definitiva de Jade antes do corte. Essa dependência permanece; não foi substituída por uma flag de ativação.

## Entregas

- Runtime integrado `economy-run-v6`: torre com três ondas, hunts, progresso independente, repetição comum, primeira vitória de boss, XP temporal, loot renovável, mochila/cofre, equipar, treino, refino e descarte por Coin. Não aceita comandos de clique/mina/fundição/tônico/pet.
- Prévia jogável em Mais → Prévia da economia, com save separado neste navegador. Tempo real apenas enquanto aberta/visível, avanço de60s simulado, nível1 inicial ou cenário sintético nível100 claramente identificado. Não chama endpoints de compra/recompensa, não importa para conta real e não oferece offline. A batalha antiga da conta pode continuar ao fundo.
- Migração SQL005 aditiva cria somente tabelas de ensaio isoladas. Serviço operador `EconomyRehearsalService` e CLI `economy:rehearsal`: estágio idempotente de uma cópia R2, arquivo imutável, comandos transacionais, revisão, recibos, ledger de diferenças líquidas e eventos anexáveis. Não há rotaHTTP de ativação ou transferência para a conta.

## Fronteiras econômicas

Torre por morte: Coin, chance0,5% de equipamento e pergaminho20ppm em comum>=100. Drops comuns antes100:80/17/3% comum/incomum/raro; desde100:74/20/5/0,6/0,4% incluindo épico/lendário renovável. NívelItem=ceil(andar/10), qualidade90–110%, sem afixos novos. Cofre preserva identidade sem conversão automática; resgate exige espaço e nível. Descarte voluntário exige confirmação para raro/refinado, recusa equipado e gera sóCoin sem ressarcir refino.

Hunts geram somente seu material na morte e XP na vitória; semCoin/equipamento/pergaminho/Jade. TabelasR4 preservadas. XP não é concedido em derrota, caminhada ou pausa. Loot de inimigos efetivamente mortos antes de uma derrota permanece, uma vez por identidade; isso difere da aproximação de ciclos integralmente vencedores do simuladorR1.1 e exige nova coorte integrada. O servidor nunca aceita morte/loot alegado pelo cliente.

Bosses da torre usam somente âncoras físicas e intervalos do catálogo existente `floorDefinition`, sem rebalancear ou desenhar boss novo. São adaptados ao pipelineR3, com evasão por andar e sem crítico deNPC. Não confundir esse adaptador com a etapaR8 de design/boss global/Jade. Seleção e avanço automático impedem repetir boss concluído, inclusive ao farmar andar anterior.

## Tempo e XP

Agenda e snapshots serializáveis, eventos em blocos de32 para registrar morte com horário preciso; teto de trabalho preserva backlog. Mesma trajetória por leitura curta/lote/JSON, descontada revisão administrativa. HP/stats congelados entre ondas; treino/equipar/refino afetam o próximo ciclo. Pausar abandona o combate atual e seu XP parcial, sem desfazer loot confirmado, com transição de3s. Trocar atividade também abandona o ciclo; não existe retomada com inimigo ferido e HP gratuito.

XP em ms qualificados, limitado ao tempo de combate confirmado da vitória e ao benchmark ofensivo de buildVeloz/épico+9/nível legal. Benchmark usa dano esperado do pipelineR3, acerto/crítico e ataques inteiros por inimigo; não simula sobrevivência ou preço da build. Recalcula elegibilidade e teto a cada nível cruzado: min(1,(andar equivalente/nível)²). Carry em micro-ms persistido; aritmética racional e teto96dias da tabelaR2. Caminhadas foram excluídas do benchmark/XP; R1.1 aproximava ciclos incluindo transições, portanto suas medianas109/107dias **não revalidam esta implementação**. Prazo90–120dias depende da calibração conjunta futura.

## Ensaio PostgreSQL

Stage adquire o lock social antes do lock de conta, lê snapshot/escrow/ofertas/dívidaRuby/gastos, verifica planoR2 e recusa pendências de mercado. O backup e o estado inicial são imutáveis; repetir requestId retorna o mesmo ensaio. Não resolve anúncios nem devolve taxa de uma conta real silenciosamente. Novo domínio não copiaRuby ou dívida para uma segunda carteira.

Comandos exigem ID, hash do payload e revisão. Mesmo ID/hash retorna recibo; mesmoID com payload divergente é recusado. Duas operações concorrentes são serializadas pelo lock da linha; a segunda revisão antiga é rejeitada e fica registrada. Estado, diferenças de saldo/proteção/XP, evento e recibo confirmam juntos. Falha SQL retorna tudo ao estado anterior. Ledger registra diferenças líquidas por transação, não uma auditoria de fluxos brutos intratransação; isso deve ser ampliado antes do corte definitivo. Não interpretar ausência de diferença líquida como ausência de loot/gasto durante um comando.

Entropia de loot/refino deriva de HMAC-SHA256 privado por identidade estável do evento/comando, com rejeição sem viés de módulo. Seed do combateR3 permanece privada ao servidor; o RNG visual/local da prévia não tem autoridade. Nenhuma seed, clock ou saldo livre do cliente entra no serviço operador. Leituras `inspect` são internas e contêm estado privado; não registrar como resposta pública.

Ensaio só liquida intervalos explícitos até30s; ausência maior é pulada, abandonando o encontro parcial. Não tenta conceder8h offline antes daR7. Encerrar ensaio é reversível por novo ensaio, sem apagar histórico; rollback-export verifica hash e exporta o arquivo original, **não sobrescreve uma conta real que continuou jogando**.

CLI após `db:migrate`: `npm run economy:rehearsal -w @akai/server -- stage --account UUID --request UUID`. Comandos via arquivoJSON privado: `command --run UUID --file caminho.json`, com `{commandId,expectedRevision,action}`. Ação `settle`, `close` ou tipos do runtime integrado. `report --run UUID` reconcilia ledger; `rollback-export --run UUID --out backup-privado.json` cria arquivo0600 sem sobrescrever. Não publicar arquivo com dados pessoais/recuperação. `jogar.bat`/`servidor.bat` continuam padrão; usuário testa a prévia pelo menu, semCLI.

## Antes do corte real

Permanecem necessários: reconciliação acoplada de fontes, mercado/escrow/taxas/ofertas e populações legadas; ledger bruto e inventário/procedência; consumidores de stats e fontes sociais antigas aposentadas; offline/cota Brasília/concorrência entre aparelhosR7; bosses/JadeR8; coortes reais da nova agenda e playtest gratuito. Não declarar campanha ou raridade+20 aprovadas. +16–20 continuam bloqueados, sem Jade provisória, e monetização segue desligada/final. Nenhum comando nesta etapa encerra a economia antiga de uma conta ou converte saldo real.
