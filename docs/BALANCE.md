# Balanceamento experimental e fórmulas

**Tudo numérico nesta página, exceto regras fixas do prompt, é proposta de configuração para testes locais. Não houve simulação nem playtest.** Configuração futura deve ser versionada e carregada por dados, nunca espalhada na UI.

## Regras fixas

Ferro inicial 1/clique; andares comuns 3 ondas×3 inimigos, sem tempo; boss nos múltiplos de 10 com timeout; ouro exige carvão 50. Falha de boss retorna ao anterior e exige tentativa manual. 1.000 andares planejados, não mil conjuntos de arte.

## Convenções determinísticas

Tempo em milissegundos inteiros; simulação por agenda/relógio injetável. Arredondar custos para cima, dano/ganhos inteiros para baixo após multiplicadores, dano mínimo 1. Ordem proposta no mesmo instante: expiração de buff → deadline de boss (se t≥deadline, falha) → ataque do herói → ataques dos inimigos → mortes/grants → transições. Essa ordem favorece deadline, impedindo golpe em t=deadline; precisa de fixture explícita. Todos os atores mortos são removidos antes de novos ataques no instante seguinte.

Atributos ativos propostos: HP, ataque físico, defesa, intervalo de ataque, crítico e multiplicador crítico. Ataque mágico, resistência, evasão e precisão são extensões desativadas até fórmulas próprias. Não criar atributos sem uso para parecer RPG completo.

## Fórmulas candidatas do primeiro loop

Para andar f≥1 e nível de melhoria n≥0:

- HP de inimigo comum = ceil(18 × 1,12^(f−1)).
- Ataque de inimigo comum = ceil(2 × 1,10^(f−1)); intervalo 2.000ms.
- Coin por inimigo = ceil(3 × 1,10^(f−1)).
- Boss: HP = 8 × HP comum(f); ataque = 2 × ataque comum(f); intervalo 1.800ms; timeout experimental 30.000ms.
- Coin de boss = 15 × Coin comum(f), sem somar nove recompensas comuns nesse andar.
- Herói inicial: HP=100, ataque=6, defesa=0, intervalo=1.000ms; crítico inicial=0% para fixture determinística.
- Ataque após upgrade de guerreiro n: 6 + 2n; custo do próximo nível: ceil(20×1,20^n) ferro e ceil(10×1,18^n) Coin.
- HP após upgrade de vitalidade n: 100 + 15n; custo próximo: ceil(15×1,18^n) ferro e ceil(8×1,18^n) Coin.
- Dano base = max(1, floor(ataque × 100/(100+defesa))); defesa não pode ser negativa neste modelo.
- Dano final = floor(dano base × multiplicador crítico × bônus válido), mínimo 1. Roll crítico é servidor/local seedado; animação não decide dano.
- Intervalo final = max(200ms, floor(intervalo base/(1+bônusVelocidade))); limite experimental impede frequência impossível.

Não extrapolar crescimento exponencial sem análise até 1.000: atributos podem exceder tipos e criar paredes de progressão. F4 precisa de curvas por faixas/caps e simulação de overflow antes de gerar o conteúdo completo. Este conjunto só é candidato à fatia de 20 andares.

## Clicker e carvão

- Melhoria de clique n concede 1+n ferros/clique antes de buffs; custo próximo = ceil(10×1,25^n) Coin e ceil(25×1,22^n) ferro.
- Desbloqueio experimental de carvão: 100 ferro + 50 Coin; inicia nível 1.
- Produção carvão(L) = 0,1×L unidades/s, L≥1; nível 0 bloqueado produz zero.
- Custo de L→L+1: ceil(75×1,15^(L−1)) ferro e ceil(30×1,15^(L−1)) Coin.
- Crédito em unidade mínima = floor(taxaEmMilésimosPorSegundo × deltaMs/1000 + remainderAnterior), preservando resto racional na implementação.
- Offline experimental: max(0,min(tempoAusente,8h)), somente minas.

Quando implementado, comparar produção segmentada com produção em um intervalo único para provar que frequência de saves não altera ganho. Ouro/Jade, fabricação, pets, afixos, XP e perks ainda precisam de curvas em F4; não usar zero ou fórmula copiada como balanceamento definitivo.

## Plano de simulação e métricas de aceite

Executar sementes reproduzíveis, salvar versão e resultados para perfis ativo lento/moderado/intenso e idle. Medir tempo até primeira melhoria, carvão, andar10/20, falhas por boss, estoque e gastos. Hipóteses de ritmo propostas: primeiro upgrade em 30–120s; carvão em 3–10min de jogo ativo; primeiro boss exige ao menos uma decisão de fortalecimento e não deve travar sem explicação. São hipóteses a avaliar, não resultados nem garantias.

Comparar dano esperado/segundo = danoPorAtaque×1000/intervalo e tempo de abate aproximado = HP/DPS, depois usar simulação real para ondas e mortes. Avaliar compra alternativa, jogador que guarda recursos, ausência longa e jogador sem anúncios. Antes de F5 exigir nenhuma transição impossível, valores não negativos, ausência de overflow e grants únicos; antes de F8 medir impacto de bônus permanentes/PvP. Alterações documentam antes/depois e configVersion.
