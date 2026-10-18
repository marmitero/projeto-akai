# Bestiário de inimigos comuns — common-1

Inventário e implementação de 18/10/2026. Bosses fora do escopo: arte, regras, timer, recompensas e geometria direta mantidos.

## Inventário real

762 arquivos, 732 PNG em 19 diretórios. Os 17 pacotes não modulares fornecem 19 visuais independentes (Slime possui três cores). Male/Female Base contêm 291 PNG de componentes, não 291 criaturas prontas. [Inventário completo, dimensões e hashes](asset-inventory.json).

| Pasta | Arquivos | PNG |
|---|---:|---:|
| Archer | 44 | 40 |
| Bat | 8 | 8 |
| Dude_Monster | 17 | 17 |
| Female Base | 167 | 167 |
| Inquisitor | 156 | 145 |
| Lancer Skeleton | 40 | 36 |
| Male Base | 124 | 124 |
| Mushroom | 7 | 7 |
| Owlet Monster | 17 | 17 |
| Pink Monster | 17 | 17 |
| Shadow | 46 | 45 |
| Shield Skeleton | 47 | 43 |
| Skeleton | 46 | 42 |
| Slime | 5 | 3 |
| Warrior | 1 | 1 |
| Zombie_1 | 5 | 5 |
| Zombie_2 | 5 | 5 |
| Zombie_3 | 5 | 5 |
| Zombie_4 | 5 | 5 |

## Composição modular

Male Base: 10 peles, 33 cabelos, 26 peças de roupa, 22 chapéus, 18 itens de mão, 7 braços/luvas, 5 orelhas e 3 máscaras (124 PNG). Female Base: 10 peles, 35 cabelos, 68 roupas, 19 chapéus, 20 itens de mão, 7 braços/luvas, 5 orelhas e 3 máscaras (167 PNG).

Um subconjunto conservador permite calcular 10×34(cabelo opcional)×19(mão opcional)×5camisas×5calças×2calçados = **323.000** receitas masculinas; 10×36×21×5corpetes de mangas longas×1saia×1bota = **37.800** femininas. Total teórico: **360.800** receitas. Não é contagem de visuais únicos ou de personagens aprovados: ferramentas não são todas armas, roupas podem sobrepor, nem todas as combinações foram revisadas. Chapéus, máscaras e orelhas ficaram fora dessa estimativa. Não multiplicar cada roupa como se fosse traje completo.

Foram selecionadas **oito composições vestidas**, descritas abaixo. As folhas normalmente possuem 10×7 células de 80×64; orelhas têm grade distinta e não são usadas nessas receitas. Camadas selecionadas compartilham a grade; idle linha0, caminhada1, ataque5 e morte6. São NPCs, não novos equipamentos do jogador.

## Estrutura e referência

Referência consultada: [OpenRPG](https://github.com/openrpg/OpenRpg) e [Templates](https://github.com/openrpg/OpenRpg/blob/master/docs/templates.md). Inspiramo-nos na separação de definições estáticas (Templates) e estado da instância (TemplateData): fichas imutáveis em shared, HP/agenda/identidade persistidos no snapshot. O framework não fornece uma curva universal de balanceamento. A implementação é TypeScript própria, sem dependência C# ou código copiado.

Fonte declarativa: scripts/bestiary-spec.json. O gerador scripts/prepare-bestiary-assets.py produz os atlases, catálogo de assets, dados compartilhados e inventário; os originais não são modificados. [Prancha visual](contact-sheet.png).

## Curvas de dificuldade e recompensa

A base vigente floorDefinition(f) permanece: para f≤20, HP=ceil(18×1,12^(f−1)), ATQ=ceil(2×1,10^(f−1)), Coins=ceil(3×1,10^(f−1)); depois, com q=1+(f−20)/20, HP=ceil(156q²), Coins=ceil(19q²), ATQ=ceil(13×(1+(f−20)/40)). Comuns têm três ondas de três unidades, sem limite de tempo. Os múltiplos de10 mantêm os bosses anteriores.

Cada ficha aplica multiplicadores fixos à base; HP e ATQ arredondados ao inteiro mais próximo, mínimo1.

| Papel | HP | ATQ | Intervalo | Orçamento B |
|---|---:|---:|---:|---:|
| Combatente | 1× | 1× | 2s | 1 |
| Ágil | 0.85× | 0.8× | 1.6s | 0.8875 |
| Brutamontes | 1.25× | 1.2× | 2.4s | 1.1875 |
| Tanque | 1.35× | 0.9× | 2.25s | 1.2125 |
| Arqueiro | 0.9× | 0.9× | 1.8s | 0.925 |

B=75%×multiplicadorHP +25%×multiplicadorDPS. Coins=round(CoinsBase×B), mínimo1; XPbp=round(10000B). XP guerreiro=floor(10f×XPbp/10000), XP rei=floor(2f×XPbp/10000), antes dos bônus autoritativos existentes. A curva do nível do guerreiro permanece 1+floor(sqrt(XP/100)), limitada1000. Maior durabilidade e DPS rendem mais; o orçamento fixo evita oscilações causadas por arredondamentos de atributos.

O papel arqueiro muda intervalo, atributos e apresentação de alcance/projétil. Tanques não possuem bloqueio adicional, sombras não são imunes e nenhum nome implica veneno, stun ou magia não implementados. Flechas são cosméticas, disparadas após o golpe confirmado; o servidor continua calculando o dano e as recompensas.

Drops comuns permanecem **0,5%** por morte; quando ocorre, raridade comum/incomum/rara em 80/17/3%, nível do item min(100,ceil(f/10)), pool existente de equipamentos. Sem loot exclusivo inventado. Mochila cheia conserva conversão em ferro. Crítico do herói e RNG de loot mantidos; a seleção do encontro não consome RNG.

## Seleção e fichas completas

Pool cumulativo por minFloor. Três unidades cíclicas a partir de (f−1)×7+(onda−1)×3, sem bosses. minFloor é elegibilidade; primeira aparição pode ser posterior pela rotação. Todas as27 aparecem até o andar81. Stats abaixo usam o andar da primeira aparição, sem bônus externos.

| ID / Nome | Família / Papel | Elegível / 1ª aparição | HP | ATQ / intervalo | Coins | XP herói / rei |
|---|---|---|---:|---|---:|---|
| slime-green — Gosma do musgo | Slime / Combatente | 1 / 1 | 18 | 2 / 2s | 3 | 10 / 2 |
| slime-blue — Gosma do orvalho | Slime / Ágil | 2 / 2 | 18 | 2 / 1.6s | 4 | 17 / 3 |
| slime-red — Gosma ferrugem | Slime / Brutamontes | 3 / 3 | 29 | 4 / 2.4s | 5 | 35 / 7 |
| bat — Morcego das copas | Bat / Ágil | 4 / 4 | 22 | 2 / 1.6s | 4 | 35 / 7 |
| mushroom — Cogumelo errante | Mushroom / Tanque | 5 / 5 | 39 | 3 / 2.25s | 6 | 60 / 12 |
| dude — Pestinha do bosque | Dude_Monster / Combatente | 7 / 7 | 36 | 4 / 2s | 6 | 70 / 14 |
| owlet — Corujito feroz | Owlet Monster / Ágil | 8 / 8 | 34 | 3 / 1.6s | 5 | 71 / 14 |
| pink — Espinheiro rosado | Pink Monster / Brutamontes | 9 / 9 | 56 | 6 / 2.4s | 8 | 106 / 21 |
| skeleton — Ossada errante | Skeleton / Combatente | 11 / 11 | 56 | 6 / 2s | 8 | 110 / 22 |
| shield-skeleton — Sentinela de ossos | Shield Skeleton / Tanque | 16 / 16 | 134 | 8 / 2.25s | 16 | 194 / 38 |
| lancer — Lanceiro sepulcral | Lancer Skeleton / Brutamontes | 21 / 21 | 215 | 17 / 2.4s | 25 | 249 / 49 |
| archer — Arqueiro proscrito | Archer / Arqueiro | 25 / 26 | 238 | 14 / 1.8s | 31 | 240 / 48 |
| shadow — Sombra rastejante | Shadow / Ágil | 41 / 43 | 614 | 17 / 1.6s | 78 | 381 / 76 |
| inquisitor — Inquisidor renegado | Inquisitor / Tanque | 61 / 63 | 2090 | 24 / 2.25s | 229 | 763 / 152 |
| warrior — Guerreiro exilado | Warrior / Combatente | 31 / 33 | 425 | 18 / 2s | 52 | 330 / 66 |
| zombie-1 — Andarilho putrefato | Zombie_1 / Combatente | 12 / 13 | 71 | 7 / 2s | 10 | 130 / 26 |
| zombie-2 — Carcereiro pútrido | Zombie_2 / Tanque | 18 / 18 | 167 | 10 / 2.25s | 19 | 218 / 43 |
| zombie-3 — Devorador das ruínas | Zombie_3 / Brutamontes | 24 / 27 | 356 | 19 / 2.4s | 42 | 320 / 64 |
| zombie-4 — Corredor febril | Zombie_4 / Ágil | 32 / 34 | 383 | 14 / 1.6s | 49 | 301 / 60 |
| male-bandit — Saqueador da estrada | Male Base / Combatente | 6 / 6 | 32 | 4 / 2s | 5 | 60 / 12 |
| male-orc — Lenhador orc renegado | Male Base / Brutamontes | 35 / 36 | 633 | 23 / 2.4s | 74 | 427 / 85 |
| male-deserter — Guarda desertor | Male Base / Tanque | 45 / 46 | 1115 | 20 / 2.25s | 122 | 557 / 111 |
| male-plague — Carrasco da peste | Male Base / Combatente | 71 / 71 | 1966 | 30 / 2s | 240 | 710 / 142 |
| female-scout — Batedora renegada | Female Base / Ágil | 14 / 14 | 67 | 6 / 1.6s | 10 | 124 / 24 |
| female-guard — Guarda da ruína | Female Base / Tanque | 28 / 28 | 413 | 14 / 2.25s | 46 | 339 / 67 |
| female-cultist — Acólita da penumbra | Female Base / Combatente | 51 / 52 | 1055 | 24 / 2s | 129 | 520 / 104 |
| female-revenant — Revenante escarlate | Female Base / Brutamontes | 81 / 81 | 3199 | 40 / 2.4s | 371 | 961 / 192 |

## Receitas selecionadas (ordem de composição)

### Saqueador da estrada

`sprites/Enemies/Male Base/Male Skin/Male Skin2.png` → `sprites/Enemies/Male Base/Male Clothing/Pants.png` → `sprites/Enemies/Male Base/Male Clothing/Boots.png` → `sprites/Enemies/Male Base/Male Clothing/Shirt v2.png` → `sprites/Enemies/Male Base/Male Hair/Male Hair3.png` → `sprites/Enemies/Male Base/Male Hand/Iron Sword.png` → `sprites/Enemies/Male Base/Male Mask/Male Bandit Scarf.png`

### Lenhador orc renegado

`sprites/Enemies/Male Base/Male Skin/Male Orc skin.png` → `sprites/Enemies/Male Base/Male Clothing/Green Pants.png` → `sprites/Enemies/Male Base/Male Clothing/Boots.png` → `sprites/Enemies/Male Base/Male Clothing/Green Shirt v2.png` → `sprites/Enemies/Male Base/Male Hair/Male Hair7.png` → `sprites/Enemies/Male Base/Male Hand/Iron Axe.png`

### Guarda desertor

`sprites/Enemies/Male Base/Male Skin/Male Skin3.png` → `sprites/Enemies/Male Base/Male Clothing/Blue Pants.png` → `sprites/Enemies/Male Base/Male Clothing/Boots.png` → `sprites/Enemies/Male Base/Male Clothing/Chainmail.png` → `sprites/Enemies/Male Base/Male Hair/Male Hair12.png` → `sprites/Enemies/Male Base/Male Hat/Guard Helmet.png` → `sprites/Enemies/Male Base/Male Hand/Iron Sword.png`

### Carrasco da peste

`sprites/Enemies/Male Base/Male Skin/Male Ghost skin.png` → `sprites/Enemies/Male Base/Male Clothing/Purple Pants.png` → `sprites/Enemies/Male Base/Male Clothing/Boots.png` → `sprites/Enemies/Male Base/Male Clothing/Purple Shirt v2.png` → `sprites/Enemies/Male Base/Male Hair/Male Hair1.png` → `sprites/Enemies/Male Base/Male Hand/Bronze Axe.png` → `sprites/Enemies/Male Base/Male Mask/Male Plague Mask.png`

### Batedora renegada

`sprites/Enemies/Female Base/Female Skin/Female Skin2.png` → `sprites/Enemies/Female Base/Female Clothing/Skirt.png` → `sprites/Enemies/Female Base/Female Clothing/Boots.png` → `sprites/Enemies/Female Base/Female Clothing/Green Bodice Long Sleeves.png` → `sprites/Enemies/Female Base/Female Hair/Female Hair3.png` → `sprites/Enemies/Female Base/Female Hand/Iron Sword.png`

### Guarda da ruína

`sprites/Enemies/Female Base/Female Skin/Female Skin3.png` → `sprites/Enemies/Female Base/Female Clothing/Skirt.png` → `sprites/Enemies/Female Base/Female Clothing/Boots.png` → `sprites/Enemies/Female Base/Female Clothing/Blue Bodice Long Sleeves.png` → `sprites/Enemies/Female Base/Female Hair/Female Hair12.png` → `sprites/Enemies/Female Base/Female Hand/Iron Sword.png`

### Acólita da penumbra

`sprites/Enemies/Female Base/Female Skin/Female Devil skin.png` → `sprites/Enemies/Female Base/Female Clothing/Skirt.png` → `sprites/Enemies/Female Base/Female Clothing/Boots.png` → `sprites/Enemies/Female Base/Female Clothing/Purple Bodice Long Sleeves.png` → `sprites/Enemies/Female Base/Female Hair/Female Hair20.png` → `sprites/Enemies/Female Base/Female Hat/Witch hat.png` → `sprites/Enemies/Female Base/Female Hand/Bronze Sword.png`

### Revenante escarlate

`sprites/Enemies/Female Base/Female Skin/Female Ghost skin.png` → `sprites/Enemies/Female Base/Female Clothing/Skirt.png` → `sprites/Enemies/Female Base/Female Clothing/Boots.png` → `sprites/Enemies/Female Base/Female Clothing/Red Bodice Long Sleeves.png` → `sprites/Enemies/Female Base/Female Hair/Female Hair30.png` → `sprites/Enemies/Female Base/Female Hand/Iron Axe.png`

## Validação e limites

Simulação determinística dos 900 andares comuns: 900 vitórias com build de referência; 15–33s por andar. Todas as fichas alcançáveis; HP, ataque, XP e Coins individuais não decrescem entre andares comuns. Isso não implica totais iguais entre formações adjacentes.

A referência fornece equipamento comum completo a partir do andar2, nível ceil(f/10), melhorias f−1, enhancement floor(f/100) e XP prévia25f². Não simula custos de aquisição, farm, tempo de jogador, todas as builds ou economia competitiva. O balanceamento precisa de playtest; a simulação não é garantia de diversão ou dificuldade humana. [Dados reproduzíveis](balance-simulation.json).

Mais → Bestiário é consulta: não concede itens ou recursos nem altera o combate. Saves antigos sem identidade são aceitos e preservados até o próximo encontro. Campos opcionais templateId/enemyId no schema3; atualizar cliente e servidor juntos, sem migração SQL. Novas recompensas comuns podem afetar indiretamente a preparação do jogador para bosses, cujas regras diretas permanecem intactas.

Atlases padronizados1280×512,32células160×128; 27 atlases representam67,5MiB RGBA antes de overhead. Sem medição de GPU em aparelho. Licenças dos assets continuam com o estado anterior do manifesto; presença no repo não comprova licença comercial. Monetização continua adiada.
