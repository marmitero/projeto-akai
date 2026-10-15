# Orçamentos e verificação de desempenho

Metas paraF2/F3; medições locais têm escopo documentado, sem benchmark Android ainda. Escolher e registrar aparelho Android de entrada real e navegador desktop na F1/F2, com modelo, SO, resolução, versão e cenário. Não declarar FPS com base apenas em PC potente.

| Área | Meta inicial de teste | Como verificar |
|---|---|---|
| Render mobile | 30 FPS estáveis no cenário de aceitação; buscar 60 quando possível | Distribuição de frame time p50/p95, 10min de combate/mineração |
| Input | Feedback de toque local p95 <100ms em dispositivo de referência | Marcas input→frame, sem incluir crédito online |
| Bootstrap | Até 5 MB de assets transferidos para HUD/primeira cena como orçamento inicial | Relatório de build/rede, cache frio |
| Sessão | Sem aumento sustentado de listeners/texturas após 50 trocas de tela | Contagem antes/depois e heap quando disponível |
| Memória gráfica | Medir e limitar explicitamente por pack antes de aprovar boss | largura×altura×4 por RGBA + runtime; PNG comprimido não é VRAM |
| Rede | Eventos agregados e snapshot; nenhum envio por frame | Mensagens/segundo por conta e bytes/s |
| API | Orçamento experimental p95 <300ms sem latência de acesso | Staging com carga e hardware registrados |
| Produção offline | Custo proporcional aos intervalos/configs, não segundos ausentes | Comparar retorno 1h/8h/24h |

O acervo tem ~1,25 GB de origem e múltiplas representações; não é pacote distribuível do cliente. Preload só subset selecionado, cache por hash e carregamento por tela/família. Não carregar AI/EPS/PSD/Aseprite, GIF preview, peças de rig e sheets/sequências duplicadas juntos. Atlases derivados precisam de padding e teste contra bleeding; compressão não pode destruir pixel art.

Objetos de FX reutilizáveis, texto de dano agregado, HUD atualizada por evento e não cada frame. Pausar render/audio de cena oculta. Se orçamento falhar, primeiro medir gargalo; reduzir partículas/resolução de derivados/atores ativos antes de modificar gameplay. Servidor não grava banco por frame; checkpoint e eventos econômicos respeitam recuperação. Metas de capacidade/conexões só após teste de carga, sem promessa de escala antecipada.

## Medição local F3

Build cliente~1,47MB em disco incluindo Phaser; subset72 arquivos/fontes verificados/263.199 bytes de autoria (não bytes transferidos). Smokes dev/produção50 ciclos mantêm34 texturas/37 objetos. Soak real concluído: 30min reais (1800914ms),1784 ciclos,127 listeners/34 texturas/37 objetos estáveis, heap apósGC5.91–6.64MiB e média rAF por minuto59.95–60.02 após aquecimento; relatório phase3-browser-soak.json e ambiente em STAGE_03_REPORT. Não converter FPS de headless/software em garantia Android/WebGL; aparelho/latência de input/p95 ainda pendentes.

Produção offline tem custo constante por configuração vigente;8h não viram28.800 passos. Testes provam produção segmentada igual a intervalo único. Combate por agenda e limite20 evitam extrapolação numérica; níveis experimentais até100. Pool6 de poeira independe de cliques econômicos.

## F4 — inventário limitado e pressão RPG

35 texturas/38 objetos e10 animações no renderer, incluindo Musgo.90 arquivos/fontes verificados/278.153 bytes de autoria, não bytes de rede. Inventário120, handlers delegados, cache de lista e atualização de custos sem remontar toda Forja por tick. Catálogo1.000 e dados de item não carregam o acervo completo.

30min reais (1801134ms), 1238 ciclos; 35 texturas/38 objetos constantes, 136–140 listeners sem acúmulo e heap após GC 7.06–8.33MiB após aquecimento. Média rAF por minuto 36.75–48.25 no stress de inventário cheio; zero pageerrors. Cenário com120 peças e fabricação/equipamento/reciclagem/minas/tônicos/navegação, não ritmo humano. O renderer permaneceu estável nos limites observados; não representa60FPS em celular. JSON/ambiente em phase4-browser-soak.json. Variação nativa de listeners foi limitada conforme critério documentado. UI final passou smokes/inspeção. Benchmark Android/WebGL e latência de input p95 continuam pendentes.

Limite de UI atual: até120 cards DOM, sem virtualização. O cache evita reconstruir o inventário sem mudança, mas a fixture força ações/reconstruções frequentes e custa mais que a navegação vazia da F3. Comparar FPS entre esses cenários como se tivessem a mesma carga seria incorreto. Antes de ampliar capacidade, medir lista/handlers/latência em aparelho e decidir paginação ou virtualização com base nessa evidência.
