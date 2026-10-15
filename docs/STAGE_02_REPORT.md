# Relatório da etapa2 — protótipo visual

15/10/2026. Base: `2f34ad1d7768a299322e0269811cf9392df77bc3`. **Fase2 concluída no escopo visual/interativo; Fase3 de gameplay não iniciada.**

## O que foi feito

- Batalha, Mina e Produção com composições distintas, usando sprites reais e HUD inferior persistente.
- Guerreiro e três esqueletos laterais, floresta em camadas, idle/ataque/morte, tochas e poeira: oito animações.
- Feedback de toque no ferro por pool de sprites, sem crédito de recursos; Produção apresenta carvão/ouro/jade inativos e requisitos.
- Mochila/Loja como páginas identificadas como indisponíveis; Mais/Recursos com foco/escape, perfil, salvamento e redução de movimento.
- Navegação responsiva com quatro ou seis atalhos, alvos≥44px e conteúdo rolável sem cobrir controles.
-21 derivados rastreáveis,49 originais únicos preservados, verificação de assets e atualização dos guias/estado/roadmap. CI com checkout parcial e smokes dev/produção configurados.

## Evidência de validação

| Check | Resultado |
|---|---|
| `npm run check` | Hashes/grades/pivôs, TypeScript,14 testes e builds passaram |
| Registro de assets |22 originais diretos +21 derivados;70 arquivos/fontes únicos verificados,251.929 bytes |
| Smoke em dev | Passou: canvas e oito animações, conclusão de morte,50 ciclos, save/reload, input/menus/erro de asset |
| Smoke em build estático | Mesmo fluxo passou no bundle emitido, sem404/pageerrors normais |
| Lifecycle |33 texturas/37 objetos estáveis após50 ciclos; input oculto/modal bloqueado; efeito não concede ferro |
| Responsividade |320/360/390/768px, HUD acessível, alvos≥44px, última mina alcançável por scroll |
| Modos/erros | Modo online bloqueado; asset obrigatório ausente mostra falha e impede mineração |
| Build cliente | Aproximadamente1,45MB em disco, incluindo Phaser, sem empacotar acervo completo |
| Inspeção visual | Capturas compostas revisadas: atores/chão/pivôs, minério, HUD e páginas auxiliares |

Navegador usado: Chromium headless153.0.8010.0, execução por software no ambiente desta entrega. Não equivale a teste em Android/WebGL ou benchmark de memória/FPS. CI da F1 foi confirmada como sucesso; a CI desta entrega só pode ser afirmada após consultar o run próprio. Nenhuma dependência runtime nova foi adicionada nesta fase.

## Composição — Batalha

![Batalha em390px](art/previews/F2_Battle.png)

## Composição — Mina

![Mina em390px](art/previews/F2_Mine.png)

## Composição — Produção

![Produção em390px e viewport mais alto para mostrar a lista](art/previews/F2_Production.png)

## Decisões autônomas

Subset medieval pixel art e tema roxo/dourado; pivô comum em derivados; renderer único com grupos e HUD DOM; breakpoint419px; iniciais em vez de retrato não confirmado; Coin textual; preload apenas do subset leve. Detalhamento em [ADR-006](ADR/0006-visual-subset.md) e [guia runtime](art/RUNTIME_ASSETS.md). Sem custo, contratação, publicação comercial ou mudança de pilar.

## O que falta e validação necessária

Sem pendência obrigatória do usuário para concluir F2. Permanecem licenças/proveniência de assets e teste real de aparelho antes de distribuição/lançamento. Avisos conhecidos de chunk Phaser e comentários de dependência não bloqueiam build. Preferência de movimento é da sessão; áudio/retrato/bosses e demais packs ainda não estão integrados. A auditoria técnica original não foi confundida com licença resolvida.

Ataques/derrota/impactos são demonstrações identificadas; não há HP, ondas, avanço, drops, ganho por clique, upgrades, produção ou offline econômico. Loja não compra e Mochila não simula itens. Esses limites são deliberados do escopo incremental, não sistemas concluídos.

## Próximo passo recomendado

F3: motor local determinístico, três ondas de três por andar comum, bosses10/20 com timer/retry manual, Coin/ferro/upgrades/carvão, migração do save real se precisar mudar schema, produção offline de minas e testes de economia/recuperação. Conectar a apresentação ao domínio confirmado, mantendo20 andares na primeira fatia e a meta de1.000.
