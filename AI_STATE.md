# AI_STATE — continuidade do Projeto Akai

Atualizado: 15/10/2026. **F2: PROTÓTIPO VISUAL CONCLUÍDO NO ESCOPO DA ETAPA. F3 (loop jogável) ainda não iniciada.**

## Pedido e regras de trabalho

Usuário autorizou a Fase2 após a fundação. Em todo encerramento: atualizar este arquivo, ROADMAP e documentos afetados; listar feito, completude/faltas, decisões autônomas, pendências que exigem validação e próximo passo. Resolver escolhas técnicas/reversíveis sem consultar; reservar ao usuário gastos relevantes, mudanças profundas e atos exclusivos do titular.

## Base e implementação real

Base desta etapa: `2f34ad1d7768a299322e0269811cf9392df77bc3`. F1 preservada: npm workspaces, shared Zod, cliente/servidor independentes, save IndexedDB versionado/backup/concorrência e 14 testes. O CI remoto da F1 foi posteriormente consultado e terminou com sucesso (run38733018634).

F2: telas Batalha/Mina/Produção separadas, HUD persistente com seis destinos quando há espaço e fallback para quatro até419px, Mochila/Loja em Mais. Mochila/Loja possuem páginas próprias e indicam indisponibilidade dos sistemas. Mais oferece perfil/salvamento e opção de reduzir movimento; Recursos mostra saldos. Dialog nativo bloqueia input; Escape/foco/scroll de tela tratados.

Renderização Phaser com floresta em camadas, herói e três esqueletos laterais. Oito animações: idle/ataque/morte de herói e esqueleto, tocha e poeira. Derivados têm célula/pivô comum160×128 com âncora80,112 para os atores, sem alterar originais. Mina usa nó de ferro e pool limitado de seis impactos; Produção mostra carvão/ouro/jade inativos e requisitos. Renderer é uma cena com grupos separados por atividade; a sessão local continua fora dele.

**Não há combate real, vida, ondas, drops, ganhos de clique, upgrades, produção, offline econômico ou boss implementados.** Ataques/derrota/impactos são demonstrações identificadas na interface. Recursos não são concedidos. Servidor continua só diagnóstico e 503 para gameplay; sem auth/banco/pagamento online.

## Assets e guias

Registro curado: [Runtime_Asset_Manifest](docs/art/Runtime_Asset_Manifest.json), 21 derivados e22 originais diretos, rastreando49 originais únicos/70 arquivos com hashes. `npm run check:assets` confere integridade/dimensões/grades. Script Pillow opcional regenera derivados; npm build não depende de Python. Acervo integral e manifesto da auditoria permanecem preservados. Licenças de todos os packs continuam pendentes. Capturas da composição em [STAGE_02_REPORT](docs/STAGE_02_REPORT.md) e guias de arte atualizados.

## Validação

npm run check: hashes, TypeScript,14 testes e builds. Smoke em desenvolvimento e build estático, Chromium headless153:50 ciclos sem aumento de33 texturas/37 objetos, oito animações e conclusão de morte, save/reload, mina oculta/modal sem input, redução de movimento, menus/foco, larguras320/360/390/768, botões≥44px e scroll sem esconder a última mina. Falha de asset e modo online indisponível tratados; zero pageerrors/404 no fluxo normal e zero grants. Medição não equivale a profiling Android/WebGL; CI F2 só será confirmada por run efetivo após publicação.

## Decisões e limites

Subset medieval pixel art, fundo Normal, esqueletos e tema roxo/dourado do pack Hud; sem retrato inventado (iniciais na moldura), Coin com rótulo e Ruby com gema328. Recorte/padding não destrutivos, nearest-neighbor, GPU/canvas com proporção384:300. Preload único do subset pequeno é escolha da prévia; carregar packs maiores sob demanda nas expansões, sem levar1,25GB ao cliente. Bundle atual ~1,45MB em disco, avisos de Phaser/Zod já conhecidos. Preferência de movimento vale na sessão; padrão acompanha configuração do sistema ao abrir.

Sem gasto, contratação ou mudança de pilar. F1 e F2 concluídas nos respectivos escopos; F0 continua parcial em licença/aprovação integral de arte. Validação externa do usuário não é necessária agora. Licenças/contas/custos reais permanecem gates futuros.

## Próximo passo recomendado

F3: domínio local de combate (3×3, bosses10/20 e retry), ferro por clique, upgrades, carvão e save/offline de minas. Configs experimentais precisam de simulação; evoluir save real1 com migração testada quando mudar schema. Conectar eventos do domínio à apresentação; não usar loop de animação como motor econômico. Manter meta de1.000 andares, primeira fatia20 e cap offline experimental8h.
