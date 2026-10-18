# Modelo analítico da curva candidata

Planejamento-v1,18/10/2026. Artefato de análise; não é configuração importada pelo jogo. [Dados completos](curve-analysis.json). Nenhum teste de gameplay ou benchmark novo foi executado nesta etapa documental.

## Método reproduzível

Estados transitórios i=0..alvo−1 representam o nível atual; alvo é absorvente. Para uma tentativa de destino n=i+1:

- Sucesso com p(n): vai para i+1; se alcançou alvo, sai dos estados transitórios.
- Falha com n≤3: permanece em i.
- Falha com n≥4 sem quebra: vai para max(0,i−1).
- Sem proteção, falha destrutiva: perde a instância; o modelo de esforço de obtenção recomeça com uma substituta idêntica+0.
- Com proteção, quebra vira regressão. Uma unidade de proteção por tentativa de destino≥8, incluindo sucesso; destinos abaixo de8não consomem.

As probabilidades de cada transição formam Q. F=I−Q; resolver F×E=1 fornece tentativas esperadas por estado. Para custo c(i) de cada recurso ou consumo de pergaminho, resolver F×C=c. A soma das visitas a transições destrutivas fornece substitutas esperadas. O segundo momento é solução de F×S=1+2QE; desvio=sqrt(S−E²). A distribuição após k tentativas é e0Q^k; CDF=1−soma(e0Q^k). Percentil q é o menor k com CDF≥q.

Parâmetros completos, nível100, multiplicador lendário2,25, custos e resultados em JSON. Cálculo efetuado nesta pesquisa com álgebra linear NumPy, sem amostragem Monte Carlo, sem seed aleatória e sem executar o loop real do jogo. Percentis buscados até100.000tentativas; `null`/ausência de percentil significa censura, não zero. Para a candidata sem proteção até+20, P95não foi alcançado dentro desse teto.

Os valores publicados são arredondados apenas para apresentação. Modelo não inclui aquisição da base, preços de mercado, farm, raridade/slot/afixos, tentativas interrompidas por saldo, calendário de eventos, proteção paga, resposta de jogadores ou buffs.

## Resultados principais

| Alvo | Proteção | Média de tentativas | P50 | P95 | Média de substitutas destruídas |
|---|---|---:|---:|---:|---:|
| +3 | Sim, destinos≥8 | 3.16 | 3 | 4 | 0.00 |
| +7 | Sim, destinos≥8 | 9.25 | 9 | 15 | 0.00 |
| +12 | Sim, destinos≥8 | 29.06 | 25 | 58 | 0.00 |
| +15 | Sim, destinos≥8 | 70.44 | 57 | 167 | 0.00 |
| +20 | Sim, destinos≥8 | 708.03 | 504 | 2040 | 0.00 |
| +3 | Não | 3.16 | 3 | 4 | 0.00 |
| +7 | Não | 9.25 | 9 | 15 | 0.00 |
| +12 | Não | 42.28 | 32 | 104 | 1.00 |
| +15 | Não | 452.75 | 318 | 1331 | 19.62 |
| +20 | Não | 67791.50 | 46995 | >100000 | 3074.64 |

A hipótese de substituição instantânea torna a rota sem proteção artificialmente barata em tempo e em preço de base; na realidade, substituir milhares de lendários úteis seria um enorme limitante. O custo de uma trajetória não é o preço da última tentativa dividido pela sua chance de sucesso.

Não há garantia, piso de nível, bônus de falha, taxa personalizada por conta, sorte de atributo, bônus pago ou mudança de probabilidades durante a trajetória. Inserir qualquer um desses mecanismos invalida os números e exige nova análise. O pergaminho modifica a consequência, não p(n).

## ASPD própria

A tabela no JSON avalia q de0a1,ASPD=150+40q^1,25e intervalo inteiro=ceil(max(200,20(200−ASPD))). O arredondamento para cima assegura que a velocidade efetiva não passe5APS. O caminho de treinamento+equipamentos é hipótese de design; só se comprovou a função matemática e o teto, não o tempo necessário para alcançá-lo.

## Próximo modelo necessário

Um modelo de conta por tempo deve dividir o orçamento real entre torre, hunts e eventos, gerar equipamentos úteis, investir atributos, comprar materiais, consumir/refazer refino, sofrer perdas e negociar. Comparar sem compra, compra limitada e estresse de compra abundante. Medir mediana/P90/P95/P99,censura e abandono por bloqueio; nunca usar só a média dos sobreviventes que conseguiram+20.

Validar também dois ciclos de economia: fabricar→salvar/descartar e comprar→proteger→revender. Verificar que custo e raridade não possam ser contornados por troca de dono, item listado, backup, versão antiga, conta alternativa ou compra repetida. Este documento fornece uma candidata mensurável; não comprova equilíbrio da economia completa.
