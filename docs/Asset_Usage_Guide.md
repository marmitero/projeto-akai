# Asset Usage Guide — Projeto Akai

Guia de aplicação para pessoas e agentes de IA. Leia junto do [Master Prompt](master-prompt.md), [inventário completo](Asset_Manifest.md), [índice técnico](art/asset_inventory.json) e [catálogo visual](Visual_Catalog.md). Auditoria de origem: commit `367032aff1b4d41c99f8bdb963acedfc0eea96d1`, em 15/10/2026. Este documento especifica integração futura; não existe implementação de jogo neste snapshot.

## 1. Como decidir com segurança

1. Procure o caminho exato nas páginas JSON listadas em `asset_inventory.json.asset_pages`, com capitalização e espaços preservados. Não construa nomes a partir de números presumidos.
2. Verifique a imagem original e a folha de contato. O nome da pasta é evidência de organização, não prova de animação, compatibilidade ou licença.
3. Consulte a família e o uso abaixo. Use o ID estável do inventário no registro de assets; mantenha IDs de itens/recursos separados de IDs de textura.
4. Para sheets, declare retângulos/frames, margem, espaçamento, direção, FPS, loop e pivô. Se esses dados não estiverem confirmados, mantenha `unmapped` e faça uma prévia antes de integrar.
5. Valide em escala mobile, fundo claro/escuro e animação completa. Só então marque o asset como integrado. A presença em uma folha de contato não é aprovação de todos os seus frames.
6. Licença de todos os packs está pendente: confirmar origem, comprovante/licença, uso comercial, modificações, distribuição e créditos antes do lançamento. Não inferir autorização a partir do nome de autor em arquivo.

## 2. Mapeamento das três telas

| Tela | Assets de base | Composição e comportamento |
|---|---|---|
| Batalha | `Character/`, famílias laterais de `Enemies/`, `Backgrounds/Normal BG/`, efeitos selecionados | Herói à esquerda olhando à direita; inimigos à direita olhando à esquerda; chão comum e barras acima dos atores. Uma atividade principal por tela. |
| Mina | `Mine/ironNode.png`, `Tiles/Floor Tiles1.png`, `Materials/Icon31_15.png` | Nó clicável central, chão recortado do tileset, ferro/clique e upgrades. Nó é imagem estática 16×16; impacto é efeito separado. |
| Produção | `Mine/coalNode.png`, `goldNode.png`, `jadeNode.png` e respectivos materiais | Gestão das três minas automáticas, com nível, recurso/s, custo, requisitos e estado. Não criar máquinas industriais nem produção manual desses recursos. |
| Mochila | `Equipments/`, `Acessories/`, `Misc/`, molduras de `Hud/` | Grade de itens, detalhes/equipar, raridade textual e visual. Ícones de equipamento não são camadas de roupa do personagem. |
| Loja | Botões/abas de `Hud/`, ícones dos produtos reais | Produtos e preços vêm do domínio. Gemas não concedem moeda por exibição. Loja premium e Mercado são fluxos distintos. |
| Mais | `Hud/20250425optionsButton-Sheet.png`, botões com rótulo | Perfil, sistemas sociais, eventos e configurações quando disponíveis. Não simular sistemas ainda não implementados. |

Todos os caminhos da tabela são relativos a `sprites/`. O viewport ativo fica entre a HUD superior e a barra inferior. Simulação compartilhada continua ao trocar de tela; apenas renderização e input da cena oculta param. Não crie um timer econômico por cena nem recalcule recompensa offline a cada navegação.

### Seleção concreta de ícones de navegação

| Ação | Caminho relativo a `sprites/` | Evidência visual e decisão |
|---|---|---|
| Batalha | `Equipments/Swords/Icon1.png` | Espada simples: usar como ícone, não como arma animada. |
| Mina | `Misc/Tools/Icon292.png` | Picareta observada; alternativa `Materials/Icon31_01.png`. |
| Produção | `Mine/coalNode.png` | Nó de carvão 16×16, ampliar em múltiplo inteiro; rótulo obrigatório. |
| Mochila | `Misc/Tools/Icon290.png` | Mochila com aba e fecho, observada na folha Misc 04. |
| Loja | `Misc/Tools/Icon291.png` | Maleta/baú com fechos: símbolo proposto para comércio, manter rótulo “Loja”. Não é desenho de fachada. |
| Mais | `Hud/20250425optionsButton-Sheet.png` | Recortar um estado 32×32; nunca exibir a tira de quatro estados inteira. |

A barra usa uma família de botões consistente do pack Hud, com ativo, pressionado, foco e indisponível distinguíveis por mais que cor. Rótulos DOM acessíveis, alvos mínimos 44×44 CSS px e safe-area inferior. Ícone pequeno não define o tamanho da área clicável. Manter seis atalhos quando couberem; fallback estreito agrupa Mochila/Loja em Mais conforme seção 7 do prompt.

## 3. Recursos: associação canônica

| Recurso | Nó de cena | Ícone de saldo/custo | Observação |
|---|---|---|---|
| Ferro | `sprites/Mine/ironNode.png` | `sprites/Materials/Icon31_15.png` | Nó azulado; ícone é lingote metálico. Clicker começa com 1 ferro/clique. |
| Carvão | `sprites/Mine/coalNode.png` | `sprites/Materials/Icon31_13.png` | Nó escuro e pilha de mineral; produção automática. |
| Ouro | `sprites/Mine/goldNode.png` | `sprites/Materials/Icon31_35.png` | Nó com veios dourados; lingote amarelo/alaranjado. Ouro exige mina de carvão nível 50. |
| Jade | `sprites/Mine/jadeNode.png` | `sprites/Materials/Icon31_40.png` | Nó verde e lingote verde. Nome oficial Jade, nunca alternar com Diamante. |
| Coin | Sem nó | Não há associação oficial confirmada | Selecionar desenho específico e registrar decisão antes de implementar saldo; não usar lingote de ouro como Coin. |
| Ruby | Sem nó | Candidato: `sprites/Misc/Enchantment/Icon328.png` | Gema vermelha facetada observada; adoção semântica proposta, não definida no prompt original. Não confundir com minério automático. |

Os oito caminhos de nós/ícones previstos no prompt e o chão da mina existem. Materiais 36 e 37 não existem; o conjunto tem 38 arquivos. Números de ícones não são IDs de recurso, nível ou raridade. A associação mineral↔lingote acima é decisão do design, não identificação mineralógica da arte.

## 4. Protagonista: geometria utilizável

| PNG em `sprites/Character/` | Tamanho | Célula | Quadros | Reprodução |
|---|---|---|---:|---|
| `Idle/Idle-Sheet.png` | 256×80 | 64×80 | 4 | Horizontal; loop. |
| `Attack-01/Attack-01-Sheet.png` | 768×80 | 96×80 | 8 | Horizontal; uma vez por ataque. |
| `Run/Run-Sheet.png` | 640×80 | 80×80 | 8 | Horizontal; loop durante transição. |
| `Dead/Dead-Sheet.png` | 640×64 | 80×64 | 8 | Horizontal; uma vez, manter último frame. |
| `Jump-End/Jump-End-Sheet.png` | 192×64 | 64×64 | 3 | Horizontal; uma vez, opcional. |
| `Jump-Start/Jump-Start-Sheet.png` | 256×64 | 64×64 candidato | 4 candidatos | Validar no Aseprite antes de usar. |
| `Jumlp-All/Jump-All-Sheet.png` | 960×64 | 64×64 candidato | 15 candidatos | Não assumir que equivale ao GIF de Jump. |

Nas cinco primeiras linhas, as dimensões e a contagem são corroboradas pelos GIFs correspondentes, todos com duração nominal observada de 100 ms/frame (10 FPS), além da prévia visual. Ordem inicial: esquerda para direita; margem/espaçamento propostos 0, validar movimento completo antes de publicar. Para os saltos sem GIF equivalente, a divisibilidade é somente hipótese. A pasta `Jump/` tem GIF e Aseprite, **não tem PNG sheet**; seu GIF é 192×256 e não deve ser tratado como célula de 64×64.

Herói pixel art de cabelo branco e espada, leitura lateral. Escala inicial proposta 2× ou 3× conforme viewport; não é resolução final aprovada. `origin=(0.5,1)` é ponto de partida, não pivô medido. Ataque tem quadro mais largo e morte tem outra altura: definir offsets por animação e medir posição dos pés para evitar saltos. Não recortar bbox individualmente em cada frame. Espelhar somente o ator quando necessário; não inverter HUD, dano textual ou cenário.

## 5. Inimigos e composição por camadas

- `Archer`, `Inquisitor`, `Lancer Skeleton`, `Shield Skeleton`, `Skeleton` e `Shadow` têm PNGs de ações em arquivos separados, além de fontes PSD. Agrupar por ação e ordenar sufixos numericamente (`A2` antes de `A10`); ordem lexicográfica está errada. Frames de ações diferentes podem ter dimensões diferentes: padding e pivô devem ser comuns por ator.
- `Bat`, `Mushroom`, `Slime`, `Warrior`, `Zombie_1`–`Zombie_4` e os três pequenos monstros incluem sheets e/ou tiras com estruturas distintas. Não aplicar o recorte do herói a essas famílias. Slimes contêm múltiplas linhas e ações; não executar a sheet inteira como uma única animação.
- `Male Base` tem 124 PNGs e `Female Base` 157 PNGs, em telas 800×448. Existem Arm Layers, Clothing, Ears, Hair, Hand, Hat, Mask e Skin. São partes de um mesmo sistema de composição, não 281 inimigos completos prontos.
- A tela 800×448 admite grade candidata 32×32 (25×14), **ainda não aprovada**. Igualdade de dimensões não prova ordem de animações ou alinhamento de todas as roupas.
- Para compor: escolher Skin + roupa + cabelo/equipamento compatível; usar exatamente mesmo frame, direção, escala e offset em todas as camadas. Ordem inicial proposta: braço/mão traseiros → pele/corpo → roupa → orelhas → cabelo → máscara → chapéu → braço/mão frontais. Validar oclusão por direção: não existe ordem universal já confirmada para todos os frames.
- Não misturar Male/Female, Arm/Hand ou paletas sem teste. Gerar prévia de idle, caminhada e ataque à esquerda/direita antes de produzir variações. Se roupa encobre pele de forma errada, excluir combinação. Anéis/armaduras de ícone não entram nesse rig.

Priorizar um subconjunto lateral coerente com o protagonista. Pequenos monstros de olhos grandes têm proporção cartoon; podem servir como família específica ou candidatos a mascotes, mas não há mascote oficialmente aprovado. O nome `Dude_Monster` não prova identidade de mascote.

## 6. Bosses: três pipelines diferentes

| Família | Estrutura real | Uso correto |
|---|---|---|
| Assassin, Caveman Boss, Chief Goblin, Female Goblin, Giant Goblin, Male Goblin, Pirate Leader, Pirate Zombie, Robber, Squidman, Thug, Viking Leader | AI/EPS, `PNG/Vector Parts`, `PNG/PNG Sequences`, `PNG/Spritesheets`, SCML | Preferir sequência PNG completa da ação e direção para confirmar recorte/pivô da sheet. Usar Left/Right; Front/Back ficam fora do combate principal. |
| Robot1, Robot2, Robot3 | Sequências numeradas por ação em subpastas | Não são partes do rig medieval anterior. Grande resolução e acabamento distinto; manter fora do conjunto inicial até validar direção artística e custo de memória. |
| Troll1, Troll2, Troll3 | PNGs `Attack_000`, `Dead_000`, `Hurt_000`, `Idle_000`, `Jump_000`, `Run_000`, `Walk_000` e seguintes | Sequências prontas, ordenar por índice, usar padding/anchor comum. Inspecionar estilo antes de misturar com pixel art. |

Exemplo real: `sprites/Boss/Assassin/PNG/Spritesheets/Left - Idle.png` tem 1920×1920; os frames da sequência correspondente são 480×480, resultando em grade candidata 4×4. `Left - Attacking.png` tem 2400×960 e admite 5×2 células 480×480. Corroborar contagem/ordem comparando a sequência, não preencher células vazias só por caberem. Outros bosses podem usar 840×720: nunca herdar 480×480 globalmente. FPS/pivô/ordem de todos os bosses ainda não estão aprovados; consultar SCML quando presente e gerar prévia.

As peças `Vector Parts` não são inimigos completos. AI/EPS e SCML são fontes para edição/animação, não texturas de runtime. Não carregar simultaneamente sequência + sheet + fontes do mesmo boss. Não converter tudo em baixa resolução automaticamente: bosses cartoon vetoriais e robots têm acabamento diferente do herói.

## 7. Cenários, tiles e efeitos

- Backgrounds tem três conjuntos (Normal, Autumn, Winter), seis imagens 1024×346 em cada: cinco camadas e castelo. Composição candidata do fundo para frente: layer 5 (céu), layer 4 (relevo), castelo, layer 3, layer 2, layer 1. Confirmar sobreposição no viewport; não tratar cada camada transparente como cenário acabado.
- Preservar proporção; recorte horizontal adaptativo e parallax discreto são preferíveis a esticar 1024×346 para uma tela vertical inteira. A área de combate ocupa parte do viewport da tela Batalha, deixando espaço para status/controles.
- `Floor Tiles1.png` e `Floor Tiles2.png` são atlas de pisos e bordas; `Tall Grass.png` é vegetação. Tamanho e recortes constam do inventário técnico, mas grade/margens não estão aprovadas. Selecionar retângulos explícitos, gerar teste de repetição e só então montar o chão. Não usar a imagem inteira como piso repetido.
- `Assets/Decor.png` é atlas de objetos; árvores e salgueiros são imagens próprias; `Torch.png` contém estágios de chama. Validar quadros antes de animar. Não tratar atlas decorativo como cena pronta.
- `Effects/01.png`–`35.png` têm efeitos e quadros com desenhos diferentes. As folhas coloridas “Effect Bullet Impact Explosion 32x32” misturam várias animações; 32×32 no nome não define quais frames pertencem a cada ação. GIFs Introl/Preview são demonstrações, não assets a carregar durante combate.
- Para mineração, selecionar impacto de poeira/pedra nas famílias 21–35 e mapear a sequência; evitar explosão que esconda o minério. Limite inicial proposto: 1 impacto por toque visual e pool de até 24 partículas simultâneas; medir em celular. Nunca vincular a quantidade de partículas ao crédito econômico.

## 8. HUD: recortar estados, não animar tudo

| Família Hud | Geometria observada/proposta | Regra |
|---|---|---|
| `20250420manaSoul9SlicesA`–`F` | 96×96, painel único | Nome indica intenção de nine-slice; bordas internas ainda precisam ser medidas. Não dividir automaticamente em nove frames de animação. |
| `20250420manaTabC`–`G` | 384×32, quatro regiões 96×32 candidatas | Estados/cores; confirmar significado antes de mapear normal/ativo/disabled. A e B têm outras dimensões. |
| `20250421manaSoulButtonA`–`C` | 384×22, quatro regiões 96×22 candidatas | Variantes de aparência; não declarar ordem sem teste de interação. |
| `20250423*Frame-Sheet.png` e `ringPants` | 160×32, cinco células 32×32 | Slots com contorno/ícone/variante; não usar como cinco níveis de raridade automaticamente. |
| close/exit/help/options | 128×32, quatro células 32×32 | Controles de menu; sem reprodução em loop. |
| less/more | 96×24, quatro células 24×24 | Ajuste de quantidade; exigir ação acessível e limites no domínio. |
| barA/barB/barC | 95×17, 95×15, 95×15 | Molduras de barra, não animação. Máscara do preenchimento deve respeitar área interna medida. |
| portraitFrame | 48×72 | Moldura de retrato, não retrato do rei. |
| compass | 76×74 | Ornamento circular, não navegação mundial pronta. |

Use rótulos, foco de teclado e estado desabilitado sem depender só da paleta. A família roxo/dourado (painel C, abas D, botões B) é proposta de unidade visual; não misturar todos os temas simultaneamente. Não esticar ornamentos de canto; nine-slice após medir bordas. Não existe fonte tipográfica no acervo.

## 9. Contrato de integração recomendado

Criar no cliente um registro gerado/curado separado deste inventário de auditoria. Exemplo de formato, **não código já existente**:

```json
{
  "key": "hero.idle",
  "source": "sprites/Character/Idle/Idle-Sheet.png",
  "frameWidth": 64,
  "frameHeight": 80,
  "margin": 0,
  "spacing": 0,
  "frames": [0, 1, 2, 3],
  "fps": 10,
  "loop": true,
  "origin": [0.5, 1],
  "offset": [0, 0],
  "filter": "nearest",
  "licenseStatus": "unverified",
  "pivotStatus": "proposed; validate feet alignment"
}
```

O caminho aponta para a origem; o build poderá copiar arquivos selecionados para um diretório público mantendo rastreabilidade. Phaser deve usar `load.spritesheet` somente com geometria aprovada, `load.image` para ícones/nós e atlas para recortes heterogêneos. Assets HTML precisam de `image-rendering: pixelated`; imagens não pixel art exigem decisão própria, não filtro nearest universal.

Não carregar o inventário completo como lista de preload: são 1.248.212.340 bytes de origem e muitas representações redundantes. Carregar HUD + herói + inimigo/fundo inicial; Mina e Produção por demanda. Texturas não comprimidas custam aproximadamente largura × altura × 4 bytes por frame RGBA, podendo exceder muito o PNG. Derivados/atlases devem registrar hash e caminho de origem, escala, recortes e versão. Preservar originais.

## 10. Checklist de aceite para integrar uma família

- Arquivo e hash conferem; não há caminho inventado.
- Origem/licença e atribuição têm registro; pendências não foram marcadas como resolvidas.
- Prévia confirma recortes, ordem, animações, direção e pivô sem cortes ou deriva dos pés.
- Herói, inimigos e cenário compartilham chão e escala legível; efeitos não ocultam a ação.
- Ícone de item não virou roupa do rig; moldura não virou retrato; tira de estados não virou botão inteiro.
- Troca de tela não duplica loaders, timers, handlers ou recompensas.
- Alvos de toque, foco, texto, safe area, falha de carregamento e reconexão foram verificados.
- Medição real de memória/renderização registrada; nenhum resultado de teste de jogo é alegado nesta entrega documental.

Pendências prioritárias: licenças de todos os packs; retrato do rei; ícone definitivo de Coin; identidade de mascotes; pivôs/animações de camadas, bosses e efeitos; recortes de tiles e nine-slice; prévia composta e desempenho em dispositivos.

## 11. Verificação desta entrega

Auditoria executada com Python e Pillow 12.3.0: 7.568 arquivos versionados cobertos exatamente pelas páginas do índice JSON, IDs únicos, soma de bytes conferida, nenhum erro de decodificação em PNG/GIF, 47 páginas de inventário cobrindo todos os arquivos e 23 folhas de contato. Todos os links Markdown locais foram resolvidos e os documentos ficaram abaixo de 500 KB por página para leitura no GitHub. `git diff --check` passou. Nenhum arquivo de `sprites/` foi alterado. Não há build/testes de gameplay aplicáveis porque ainda não existe código de jogo.

O script regenera o inventário técnico, as páginas e as prévias; este guia e o catálogo são curados e devem ser revisados quando houver novos assets. Para reproduzir, disponibilize Pillow no ambiente e execute `python docs/tools/audit_assets.py` na raiz. Antes de comparar resultados, considere que o SHA de snapshot será o HEAD da nova execução.
