# Registro de decisões e questões abertas

15/10/2026. Aprovado = explícito no Master Prompt ou solicitação do usuário. Proposto = escolha técnica/de design detalhada nesta documentação; revisar antes da fase afetada. Não pedir todas as decisões ao usuário de uma vez: primeiro preparar experimento/evidência aplicável.

| ID | Decisão | Estado | Gate |
|---|---|---|---|
| D01 | Batalha/Mina/Produção separadas e HUD inferior | Aprovado | Todos |
| D02 | Ferro 1/clique; carvão automático; ouro exige carvão 50; Jade oficial | Aprovado | F3/F4 |
| D03 | 3 ondas×3 inimigos; boss a cada dez; falha pausa e retry manual | Aprovado | F3 |
| D04 | TypeScript, Phaser 3, Vite, Node, PostgreSQL; versões a verificar | Diretriz do prompt; versões pendentes | F1 |
| D05 | Fastify e Supabase como infraestrutura de auth/banco | Proposto; Supabase opcional no prompt | F1/F5 |
| D06 | 20 andares na primeira fatia; 1.000 na meta de produto | Proposto como estratégia incremental | F3 |
| D07 | Offline só minas no MVP; cap experimental 8h | Proposto em ADR-003 | F3 |
| D08 | Inimigos simultâneos; alvo frontal; morte comum pausa | Proposto | F3 |
| D09 | Raridades, slots, afixos e curvas de BALANCE/DROP_TABLES | Curvas locais simuladas; RPG provisório | F4 |
| D10 | Nível de conta: XP/curva; recrutamento; habilidades automáticas | Escopo previsto, conteúdo/fórmulas pendentes | F4 |
| D11 | Regras de posição PvP concorrente, empate e troféus | Proposta parcial; não ativar sem especificação final | F6 |
| D12 | Guilda 20 no nível1, +2 por nível até 38; bônus de presença/cap | Capacidade proposta; bônus pendente | F6 |
| D13 | Guerra de guildas e prêmio semanal | Pendente: inscrição, matchmaking, pontuação, empate, cronograma | F6 |
| D14 | Mercado 10%, 100 mil coins e prazos do prompt | Valores experimentais; taxa de recurso proposta em ECONOMY | F7 |
| D15 | Ruby negociável e conversões premium | Desabilitado até revisão específica | F7/F8 |
| D16 | Preços, cooldowns de anúncios, acúmulo de buffs e permanent boosts | Pendente de simulação/compliance | F8 |
| D17 | Identidade de mascotes, retrato de rei e Coin | Pendente artístico | F4/lançamento |
| D18 | Licenças/proveniência dos packs | Sem comprovação; todos pendentes | Lançamento |
| D19 | Plataforma/hospedagem, região, quotas e metas operacionais | Pendente de infraestrutura e orçamento | F5 |
| D20 | Público etário, política de retenção/exclusão, moderação | Pendente de produto/privacidade | Online público |
| D21 | Pausa após documentação inicial | Histórica; superada pelas autorizações expressas de F1/F2 | Histórico |

Mudança de decisão aprovada exige motivo e atualização dos documentos envolvidos; mudança técnica relevante exige ADR. Não há deadline externo ou contrato de hospedagem aprovado.

## Delegação e triagem atualizadas

As regras de autonomia da Constituição foram aprovadas explicitamente pelo usuário. “Proposto” não significa automaticamente “aguarda o usuário”: o agente pode adotar decisões não financeiras/reversíveis, registrá-las e validá-las tecnicamente. A triagem inicial era revisão de pendências, anterior à implementação de F1–F3.

| Pendência | Quem resolve | Quando é necessária |
|---|---|---|
| D04/D05: versões, organização, framework HTTP, adaptadores | Agente; sem contratar serviço | F1/F5 |
| D06: primeira fatia de 20 andares | Adotada pelo agente sob delegação; mantém meta de 1.000 | F3 |
| D07: offline só minas, cap inicial de 8h | Adotada como parâmetro experimental pelo agente; sem alegar equilíbrio | F3 |
| D08–D10: alvo, morte comum, slots, raridades, XP e curvas | Agente, com testes/simulações e sem alterar pilares | F3/F4 |
| D11–D13: PvP, guildas e guerra | Agente detalha dentro das regras; consulta só mudança profunda | F6 |
| D14: taxas de moeda virtual e arredondamento | Agente, com simulação e rastreabilidade | F7 |
| D15/D16: ruby negociável, preços reais e bônus pagos de impacto | Agente prepara análise; usuário decide impactos financeiros/mudança material | F7/F8 |
| D17: ícones, mascotes e retrato | Agente seleciona/valida arte permitida | F2/F4 |
| D18: licenças | Agente investiga; usuário fornece comprovante privado se necessário ou decide aquisição paga | Antes de distribuir assets afetados |
| D19: infraestrutura | Agente escolhe tecnicamente; usuário decide contratação/custo relevante e realiza atos exclusivos do titular | F5/lançamento |
| D20: privacidade/moderação/público | Agente prepara solução; usuário realiza declarações/aceites que dependam do responsável legal | Antes do online público |

Não há pendência de design que obrigue consulta ao usuário antes de começar desenvolvimento local. Recortes/pivôs, compatibilidade e versões são tarefas técnicas do agente. Licenças seguem não verificadas e condicionam distribuição; não presumir uso comercial autorizado. Esse registro de triagem antecede as entregas de código F1–F3 abaixo.

## Decisões da F1 — 15/10/2026

Stack/versões e npm workspaces adotados em ADR-005; Fastify escolhido, sem contratar Supabase. IndexedDB com cópia anterior/quarentena e proteção de geração, primeiro schema real1, sem migração fictícia de save inexistente. Cliente só local; modo online falha fechado; servidor de diagnóstico não aceita gameplay. A pausa D21 foi superada pela autorização expressa de implementar a próxima etapa. Relatório final passa a incluir feito, estado/completude e próximo passo. Não houve gasto ou mudança de pilar do jogo.

## Decisões da F2 — delegação técnica

Adotado subset medieval pixel art (Character, Skeleton, Normal BG, nós e Hud), derivados com pivô comum e hashes, uma cena com grupos por tela e UI DOM, fallback de quatro botões até419px, iniciais em vez de retrato não confirmado e moeda Coin textual. Preload apenas do subset pequeno e compartilhado, com packs maiores por demanda nas expansões. Ataque/derrota/impacto são prévias sem efeito econômico; loja/minas futuras ficam explicitamente indisponíveis. Nenhuma contratação, preço ou regra fundamental alterada. Licenças e teste em aparelho continuam pendentes; não exigem decisão do usuário nesta etapa.

## Decisões da F3

D06/D07/D08 adotadas e testadas localmente:20 andares, cap minas8h, inimigos simultâneos/alvo frontal, falha comum pausada. D22: motor agenda/cura entre andares/pausa manual, deadline do boss corre ausente/pausado e stall>5s tratado como ausência. D23: treino manual9/19 após boss, volta a pausar ao concluir, para evitar softlock de Coin observado em simulação. D24: configuração local-loop-1 com fórmulas de BALANCE e níveis até100, unidade mínima/remainder, schema2 e migração real1→2. D25: boss Guardião Ossudo usa Skeleton2,8× e Run do herói é derivado rastreável, sem misturar rigs vetoriais.

Tudo sob delegação, sem gasto ou alteração de pilar. Primeiras melhorias/carvão mais rápidas que hipóteses iniciais; registrado para playtest, sem fingir balanceamento final. F4 define dados RPG/curvas, F5 segurança econômica online. Nenhuma decisão obrigatória do titular agora.

## Decisões F4 — delegação de implementação

D26:curvas polinomiais depois20,1.000 definições/mesmo bioma e família; caps locais, sem declarar1.000 mapas ou balanceamento comercial. D27:14 categorias/9 slots,5 raridades/afixos, inventário120, overflow de drop em ferro e Forja comum para evitar dependência exclusiva de RNG. D28:Musgo como slime domesticado do próprio acervo, um ativo e passivos explícitos. D29:tônicos de duração wall-clock, sem stack do mesmo tipo, minas ouro/jade com custos experimentais e requisito carvão50 preservado. D30:schema3/migrações reais, XP separado do rei/guerreiro, sem recompensa retroativa nem cura por equipamento.

Fonte e consequência em ADR-008/RPG_SYSTEMS. Sem gasto, contratação ou preço real. O ritmo inicial acelerado foi medido e registrado, não tratado como aprovação de equilíbrio. F5 permanece sem implementação/serviços e não inicia nesta etapa.

## Decisões F5 — delegação técnica

D31: PostgreSQL16 reproduzível, sem contratar Supabase; migração separada de runtime. D32: convidado com chave de recuperação rotacionada e cookie opaco HttpOnly7dias; Google GIS/JWKS por configuração do titular, sem fusão de contas. D33: lock por conta, ledger/outbox/idempotência transacionais; commandVersion separado de stateVersion; sem importação de save. D34: RNG criptográfico injetado em cada sorteio online, relógio/watermark no servidor; presença3s e stream1s. D35: reconexão por snapshot, um comando pendente por cliente e retry com mesmo UUID; limite2streams/conta e bucket10cliques/s/burst10 persistido.

Sem custo real, contratação ou mudança de pilar. Gates do titular somente ao ativar OAuth/hospedagem pública ou aceitar políticas/contratos. Licenças/playtest/aparelhos continuam abertos. F6 não iniciada. [ADR-009](ADR/0009-authoritative-online.md) e [ONLINE](ONLINE.md).

## Decisões F6 — autonomia de implementação

D36: migração social002, lock transacional social por piloto, limites5000perfis/200boss, sem serviço pago. D37: chat literal/block/report e moderação por CLI auditada, brasão16×16/paleta8, capacidade20–38 e convites24h, permissões e custos de guilda experimentais. D38: arena autoritativa sem tônico, cinco reais acima, troca de posições/+20ou−10troféus, empate para defesa,60s/20por24h. D39: semana de Brasília, arquivos/pagamentos únicos e bônus de guilda por classificação anterior, vínculo24h e expiração segmentada. D40: boss22h/30min, presença3s/1tick porsegundo, outros membros+1%até20%, último golpe único. D41: XPglobal12h–18h+30%,loteria18h/100Rubies comGoogle/presença histórica/conta10min/andar10,raid20h–21h/baúuma vez. D42: guerra domingo18h–19h, roster de inscrição confiável/24h, uma luta por participante, desempate e prêmios virtuais documentados.

Regras/fórmulas/recompensas e consequências em COMMUNITY_SYSTEMS/ADR-010. Substituem propostas sociais pendentes quando há definição concreta, sem mudar pilares ou contratar serviços. Nenhum preço real ou pagamento ativado. D18licenças/D19infra/D20políticas continuam gates externos; equilíbrio humano/escala/aparelhos ainda pendentes. F7 não iniciada.

## Resoluções F7 — 15/10/2026

D14 adotada no desenvolvimento por delegação: taxa10% na própria moeda com ceil de milésimos, anúncio100milCoins sem reembolso,72h; simulação registra pressão no início. Andar10 e caps de piloto; resgate explícito preserva item com mochila cheia. Cooldown24h por procedência de equipamento e por categoria de recurso/conta resolve pilhas fungíveis de forma conservadora. Contraoferta até24h sem reserva, revalidada na aceitação. ADR-011/MARKET_SYSTEMS/STAGE_07_REPORT contêm decisões e evidências.

D15 continua desabilitada. Musgo é singleton de conta e skins não têm instâncias implementadas: somente equipamentos e recursos elegíveis atuais entram na F7; não inventar ativos transferíveis para preencher categorias futuras. Nenhum preço real, contratação, SDK de anúncio ou pagamento foi ativado. Não há decisão financeira do usuário bloqueando o código desta fase.
