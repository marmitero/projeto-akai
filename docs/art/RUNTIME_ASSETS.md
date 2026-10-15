# Integração de assets — subset F2/F3

Guia de implementação real do subset, complementar à auditoria integral. Fontes/recortes/hashes em [Runtime_Asset_Manifest.json](Runtime_Asset_Manifest.json). Licença permanece **unverified** em todos os casos. Nenhum original foi sobrescrito.

## Registro e reconstrução

O catálogo TS em apps/client/src/assets/catalog.ts referencia apenas22 derivados e22 originais diretos. Incluindo fontes dos derivados são50 originais únicos (72 arquivos verificados), somando263.199 bytes de autoria/derivados nesta verificação. Build não copia AI/EPS/PSD/SCML, previews GIF ou o acervo inteiro. PNGs derivados já estão versionados; `npm run check:assets` valida hashes, dimensões, grades e pivôs sem Python. Para reautorizar recortes: `python scripts/prepare-visual-assets.py` com Pillow, revisar imagens/manifesto e executar os checks.

## Atores e animações

Todos os atores derivados usam células160×128, pivot80,112; ordem horizontal, margin/spacing0. Padding comum evita reposicionar pés quando muda animação. Não cortar cada bbox individualmente. A morte do herói exige marcos verticais explícitos por quadro, pois a sheet original usa outra linha de chão; os quadros inteiros são preservados.

| Key | Fonte | Célula de origem / quantidade | Tratamento | FPS / loop |
|---|---|---|---|---|
| heroRun | Character/Run/Run-Sheet.png |80×80 /8 | Origem40,68; offset40,44 |10 /sim durante transição |
| heroIdle | Character/Idle/Idle-Sheet.png | 64×80 /4 | Origem32,64; offset48,48 |10 /sim |
| heroAttack | Character/Attack-01/Attack-01-Sheet.png |96×80 /8 | Origem48,64; offset32,48 |10 /não |
| heroDead | Character/Dead/Dead-Sheet.png |80×64 /8 | Origem X40; Y48/50/48/48/48/48/48/53 por quadro; padding mantém piso comum |10 /não; segura fim na prévia |
| skeletonIdle | Enemies/Skeleton/PNG/idle-1..4 |128×96 /4 | Origem44,96; offset36,16 |8 /sim |
| skeletonAttack | Enemies/Skeleton/PNG/attack-A1..8 |128×96 /8 | Mesmo pivot; não confundir A/B |10 /não |
| skeletonDead | Enemies/Skeleton/PNG/dead-1..4 |128×96 /4 | Mesmo pivot; imagem completa preservada |10 /não |

Caminhos da tabela relativos a sprites/. Esqueletos são espelhados horizontalmente em runtime para atacar à esquerda; como pivot é central em X no derivado, não há deslocamento pela inversão. Herói permanece à direita. Escala lógica2 para herói e1,45–1,55 para os três inimigos; pés em Y240. Sala lógica384×300, Phaser FIT com proporção preservada e pixelArt/roundPixels. Não herdar esses pivôs para outro pack.

F3 conecta ataques/morte/Run aos snapshots reais: vida zero segura o último quadro, sem retorno arbitrário ao idle. Atores que morrem fora da tela chegam à pose final; não reencenar recompensa ao voltar. Pausa/modal/grupo oculto só controlam animação. Guardião Ossudo usa Skeleton2,8× noX282, único alvo nos bosses10/20; os demais inimigos ficam invisíveis. HeroRun anda deX83 até113 durante a transição3s e reposiciona no encontro seguinte. Modo reduzido usa pose estática e reduz efeitos. Nenhum quadro é motor econômico.

## Ambiente

Normal BG em seis camadas (sky, hills, castle, forestFar, forestMiddle, forestNear), escala proporcional240/346, crop horizontal pelo viewport. O castelo não virou retrato ou alvo. Piso de batalha vem de Floor Tiles1 [32,0,64,32]. Mina: interior[32,32,64,64], lateral[0,32,32,64] e borda[32,64,64,96] invertida verticalmente, todos do mesmo tileset. A borda é uma faixa sobre chão, não o atlas inteiro repetido. Sem geração procedural de desenho.

Torch usa recorte[0,32,192,64], seis frames32×32,9FPS loop. Dust usa Effects/21.png, grade6×2 de32px,12 frames,24FPS, incluindo encerramento transparente. Pool de seis sprites reutilizados; cliques rápidos podem coalescer a representação quando todos estiverem ativos, sem condicionar o crédito de recursos à disponibilidade de efeito. Nó de ferro16×16 em6×; carvão/ouro/jade em4× em Produção. Não clicar manualmente nas outras minas.

## Interface

Painel C96×96 com CSS border-image-slice24 e borda12px; evita esticar cantos. Nav usa quatro regiões96×32 da manaTabD (normal/selecionada/pressionada/indisponível como convenção da integração, não significado original comprovado). Botões usam manaSoulButtonB normal e variante de pressão. Slots/options/close são recortes separados, nunca a tira inteira. Originais e retângulos exatos no JSON.

Ícones: espada Icon1, picareta Icon292, mochila Icon290, maleta Icon291; nó de carvão para Produção. Materiais ferro15/carvão13/ouro35/jade40 e gema Ruby328 conforme guia. Coin continua com rótulo textual C/Coins; não usar lingote de ouro como Coin. A moldura de retrato contém iniciais AK, não um retrato de rei alegadamente pronto.

Até419px, a barra mantém Batalha/Mina/Produção/Mais e inclui Mochila/Loja no menu. Em480px de área de jogo aparecem seis atalhos. Botões≥44px verificados nas larguras de teste; scroll ocorre no conteúdo acima da HUD. Texto é DOM acessível; não depende de desenhar rótulo no sprite.

## Lifecycle e limites

Uma cena/grupos para as três atividades, somente grupo ativo visível; animações de grupo oculto e de modais são pausadas. Sessão/save fora do renderer. Morte/ataque são apresentação do domínio F3; não basear economia em callback de frame. Schema2 do domínio não contém objetos gráficos.

O pequeno subset compartilhado é carregado uma vez (~1,45MB no build total com Phaser). Não expandir esse preload para todos os packs: adicionar carregamento por demanda antes de crescer conteúdo. 34 texturas e37 objetos do renderer estáveis após50 ciclos nesta implementação; isso não mede VRAM real nem garante FPS Android. Licenças de originais e derivados continuam pendentes, conforme [ASSET_LICENSES](ASSET_LICENSES.md).
