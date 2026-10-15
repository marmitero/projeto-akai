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
| D09 | Raridades, slots, afixos e curvas de BALANCE/DROP_TABLES | Provisório; sem simulações executadas | F4 |
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
| D21 | Escrever documentos e aguardar; sem implementar agora | Instrução atual explícita | Parada após entrega |

Mudança de decisão aprovada exige motivo e atualização dos documentos envolvidos; mudança técnica relevante exige ADR. Não há deadline externo ou contrato de hospedagem aprovado.
