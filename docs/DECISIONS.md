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

## Delegação e triagem atualizadas

As regras de autonomia da Constituição foram aprovadas explicitamente pelo usuário. “Proposto” não significa automaticamente “aguarda o usuário”: o agente pode adotar decisões não financeiras/reversíveis, registrá-las e validá-las tecnicamente. A etapa atual é revisão de pendências, não início de F1.

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

Não há pendência de design que obrigue consulta ao usuário antes de começar desenvolvimento local. Recortes/pivôs, compatibilidade e versões são tarefas técnicas do agente. Licenças seguem não verificadas e condicionam distribuição; não presumir uso comercial autorizado. Início de código continua não executado nesta revisão.

## Decisões da F1 — 15/10/2026

Stack/versões e npm workspaces adotados em ADR-005; Fastify escolhido, sem contratar Supabase. IndexedDB com cópia anterior/quarentena e proteção de geração, primeiro schema real1, sem migração fictícia de save inexistente. Cliente só local; modo online falha fechado; servidor de diagnóstico não aceita gameplay. A pausa D21 foi superada pela autorização expressa de implementar a próxima etapa. Relatório final passa a incluir feito, estado/completude e próximo passo. Não houve gasto ou mudança de pilar do jogo.
