# AI_STATE — continuidade do Projeto Akai

Atualizado:15/10/2026. **F3 — LOOP LOCAL CONCLUÍDO E VALIDADO NO ESCOPO DA ETAPA. F4 não iniciada.**

## Pedido e regras

Usuário autorizou Fase 3 após F2. Encerrar atualizando estado/roadmap/documentos; listar feito, completude/faltas, decisões, validações pendentes e próximo passo. Agente decide assuntos técnicos/reversíveis, sem gastos relevantes nem mudança profunda. Não iniciar F4 sem instrução nova. Fonte de implementação F2 remota: `2abdc637d2607af72c7641e1c4ca4f81681d765a` (CI38738933626 passou).

## O que existe

F1/F2 preservadas: npm workspaces, Phaser/Vite, Fastify diagnóstico, Zod, três telas e HUD, IndexedDB com SHA/backup/quarentena/CAS. F3 conecta apresentação ao motor determinístico em packages/shared/src/loop.ts e sessão local100ms. Nenhuma recompensa depende de callback de animação.

Andares1–20; comuns3×3, bosses10/20 com um alvo/30s; alvo frontal, agenda por cooldown e desempate deadline→herói→inimigos vivos. Coin por morte única no snapshot; transição3s/Run; cura entre andares/tentativas, não entre ondas. Falha comum pausa no mesmo andar; boss retorna ao anterior e exige retry manual. Treino manual9/19 após boss elimina trava de Coin e volta a pausar após uma execução, sem auto-retry. Pausa/retomada manual; prazo de boss continua correndo pausado e ausente.

Ferro1/clique inicial, melhorias de clique/força/vitalidade e carvão: desbloqueio100 ferro+50Coins,0,1×nível/s, níveis até 100 experimentais. Frações preservadas com BigInt/remainder. UI mostra vida, ondas, timer, custos, níveis, taxa, tutorial retomável, falha em outra tela e resumo de ausência já creditada. Batalha/minas continuam entre telas, modais só bloqueiam input/apresentação. Mochila/Loja continuam claramente indisponíveis; ouro/jade/pets/loot/XP/receitas/Ruby não foram antecipados.

Schema2/config local-loop-1; migração real de schema 1/foundation-1 valida SHA original antes de transformar, preserva saldos/perfil/tela/geração e inicia combate no1. Save de progresso/upgrades/cooldowns/HP; minas offline até 8h por watermark, crédito único persistido, zero combate/drop/clique offline. Timeout de boss pode ocorrer na ausência. Relógio regressivo e stall>5s tratados. Autosave15s, boot/retomada/ações econômicas/ocultação; encerramento abrupto pode perder último intervalo. Save futuro/corrupto continua preservado; concorrência não sobrescreve outra aba.

Servidor continua diagnóstico/503 para gameplay. Perfil local nunca é conta online. Sem contratação, auth, banco, pagamento, anúncio ou deploy público.

## Arte

22 derivados e22 originais diretos,50 originais únicos/72 arquivos/fontes verificados (263.199 bytes de autoria). Novo heroRun80×80×8, derivado160×128 pivot80,112 com origem40,68. Skeleton ampliado2,8× como Guardião Ossudo nos dois bosses; não alegar pack exclusivo. Nove animações;34 texturas/37 objetos. Originais e auditoria integral preservados; todas as licenças continuam não comprovadas.

## Evidências atuais

31 testes de contratos/domínio/sessão/save/HTTP, typecheck e builds passam. Simulação1/3/5 cliques/s com política explícita conclui a torre; resultados em docs/phase3-balance-results.json. Primeira melhoria15–20s; carvão80–144s; torre1118–2286s de tempo simulado. Cliques contínuos são stress comparativo, não expectativa humana. Modelo sem clique não progride além da parede de fortalecimento.

Smokes dev/produção:50 ciclos, input oculto/modal, movimento reduzido, tamanhos320/360/390/768 e844×390 horizontal e844×390 horizontal, save/reload, compra/carvão/offline, boss timeout/treino, conclusão com outra tela ativa, morte e erro de asset. Capturas revisadas. Soak real: 30min reais (1800914ms),1784 ciclos,127 listeners/34 texturas/37 objetos estáveis, heap apósGC5.91–6.64MiB e média rAF por minuto59.95–60.02 após aquecimento; dados em docs/phase3-browser-soak.json. CI própria: resultado autoritativo no [workflow do GitHub](https://github.com/marmitero/projeto-akai/actions/workflows/check.yml), conferir o run do commit publicado. Teste puro30min/18.000 passos equivale ao intervalo único, mas não substitui benchmark real.

## Decisões, pendências e próximo passo

ADR-007 registra motor/tempo/cura, unidade mínima, migração, treino e arte de boss. Fórmulas de BALANCE adotadas como experimento local, sem alteração financeira. Sem validação obrigatória do usuário nesta fase; licenças/proveniência e Android/WebGL em aparelho permanecem gates futuros. Playtest humano de ritmo/legibilidade recomendado, sem converter em bloqueio arbitrário.

Próximo: F4 de progressão RPG, começando por dados/curvas, inventário/equipamentos/raridades e fabricação, depois pets/ouro/jade. Meta1.000 preservada; não extrapolar exponenciais além20 sem análise. Ler STAGE_03_REPORT/ADR-007 antes de alterar; dados de simulação não provam economia online segura.
