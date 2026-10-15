# Drops, raridades e recompensas

Especificação v1; tabelas abaixo são candidatas locais da F4, **adotadas experimentalmente e implementadas na F4 local**. F3 histórica usava Coin; F4 local agora resolve equipamentos raros com RNG persistido. Online sempre sorteia no servidor.

## Ordem de resolução e unicidade

Ao confirmar morte elegível: construir sourceId com battleId/attemptId/enemyInstanceId → validar grant inexistente → conceder Coin → sortear chance de equipamento → escolher categoria/item elegível → rolar raridade/afixos → persistir instância, ledger e claim atomicamente. Retry devolve o mesmo resultado, sem reroll. Boss em timeout não usa tabela de vitória.

| Fonte | Coin | Chance candidata de equipamento | Quantidade |
|---|---|---:|---:|
| Inimigo comum | BALANCE, conforme andar | 0,5% | 0 ou 1 |
| Boss de dezena | BALANCE, prêmio de boss | min(20%, 10% + 0,1 ponto percentual × (andar/10−1)) | 0 ou 1 |
| Primeira conclusão | Separada da morte; sem prêmio adicional definido | Não configurar até design de milestone | — |
| Raid surpresa | Baú de equipamento conforme prompt | Baú deve abrir por tabela versionada | Um baú por edição elegível |
| Boss global | Faixas de contribuição/último golpe | Valores e tabela pendentes | Claim por edição/faixa |

Não existe drop direto de ruby, material ou mascote em inimigo comum neste desenho inicial. Acrescentar exige tabela e motivo; imagem de loot na pasta não é probabilidade implícita.

## Raridade condicionada a haver equipamento

| Raridade proposta | Comum | Boss | Multiplicador de atributo candidato | Afixos candidatos |
|---|---:|---:|---:|---:|
| Comum | 80% | 50% | 1,00× | 0 |
| Incomum | 17% | 32% | 1,15× | 1 |
| Raro | 3% | 15% | 1,35× | 2 |
| Épico | 0% | 2,8% | 1,70× | 3 |
| Lendário | 0% | 0,2% | 2,20× | 4 |

Colunas somam 100%; probabilidades condicionais não são a chance final. Por exemplo, boss inicial: 10%×0,2%=0,02% de equipamento lendário por vitória, antes de qualquer modificador autorizado. Não há pity, chance paga ou luck aprovado; não adicionar implicitamente.

Pool deve filtrar tipos/níveis disponíveis e ativos na versão. Se vazio, erro de configuração antes do evento, não conceder objeto inválido ou reroll infinito. Categoria pode começar uniforme entre categorias explicitamente habilitadas; pesos definitivos pendentes. Mesmo ícone pode ser usado em várias instâncias com stats distintos; ID não é nome do PNG.

## Itens, afixos e baús

Definição de item exige atributos-base e faixa de nível; afixos elegíveis por categoria, sem duplicar incompatíveis. Não há tabela numérica de afixos aprovada ainda; F4 deve criá-la e testar extremos antes de ativar as linhas acima. Ao abrir baú, consumir instância e criar conteúdo na mesma transação, com resultado idempotente. Ruby e recompensas premium seguem validação de provedor, não RNG de cliente.

## Testes estatísticos planejados

Verificar pesos não negativos e soma exata por tabela; probabilidades em inteiros de resolução suficiente. Testes determinísticos nos limites do RNG e testes amostrais com intervalo de confiança/binomial e tolerância pré-definida, sem exigir porcentagem exata em amostra pequena. Para evento de probabilidade 0,02%, 10 mil tentativas dão expectativa de apenas dois sucessos, insuficiente para validação estreita; usar análise e amostras compatíveis. Seeds de teste não entram no online público. Estatística F4 executada conforme seção abaixo.

## Resultado e implementação F4

200.000 mortes simuladas por fonte com seed reproduzível:1.038 drops comuns(0,519%, alvo0,5%) e19.875 no boss10(9,9375%, alvo10%). Bins condicionais de boss10 enumerados sobre10.000 rolls:5.000/3.200/1.500/280/20. Tolerância conservadora nos testes:800–1.200 comuns e19.000–21.000 bosses; não exigir porcentagem exata em amostra finita. Fonte/resultado em scripts/simulate-rpg.mjs e phase4-rpg-results.json.

Raridade muda multiplicador e0–4 afixos únicos; atributos-base têm variação90–110%. Nível de drop=ceil(andar/10), limitado100. Categorias14 uniformes. Boss posterior transfere10BP por dezena de comum para raro, até10pp; chance total chega19,9% no1000. Sem ruby/material/pet direto, pity ou luck pago.

RNG local xorshift32/seed de desenvolvimento é persistido com próximo ID; morte já confirmada não é rerrolada ao carregar. Não é autoridade nem aleatoriedade segura online. Timeout não concede vitória/drop. Inventário120 inclui equipados; excedente vira ferro atomicamente. Instâncias guardam atributos/afixos, aprimoramento não rerrola. Baús, raids/global e RNG servidor continuam fases futuras.
