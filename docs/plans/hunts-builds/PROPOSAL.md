# Reforma de progressão — hunts, builds e fortalecimento

**Versão: proposta-v1,18/10/2026. Somente planejamento. Nenhuma fórmula deste documento está ativa no jogo.** Regras expressas do usuário são requisitos de design; números e escolhas adicionais são candidatos do agente, sujeitos a simulação integrada e playtest antes de qualquer implementação. [Roadmap](ROADMAP.md), [pesquisa](REFERENCES.md), [modelo matemático](CURVE_MODEL.md), [dados](curve-analysis.json).

## 1. Objetivo e escopo

Substituir o clique e as minas passivas por escolha de atividade de combate. Preservar uma progressão básica acessível, permitir builds distintas e fazer um lendário+20 ser aspiracional e raro, com circulação no mercado da comunidade. Não tornar +20 requisito da campanha nem prometer que escassez criará preço alto.

O mercado, a base de boss diário e a base técnica de monetização já existem em caráter experimental no projeto. Precisam de adaptação; não serão reinventados como se fossem inexistentes. Bosses terão etapa própria. Nenhum design definitivo de boss ou integração comercial será executado nesta fase documental.

## 2. Requisitos confirmados versus propostas

| Tema | Confirmado pelo usuário | Proposta adicional do agente |
|---|---|---|
| Fontes | Torre principal:Coin,XP,equipamento; hunts:XP+material específico; jade apenas boss global diário futuro | Separar recompensas por atividade antes do sorteio; nenhuma hunt sorteia equipamentos/pergaminhos/Coins |
| Hunts | Carvão mais difícil que torre normal; ferro mais que carvão; ouro mais que ferro; referência de inimigos com poder de boss | Comparar dificuldade na mesma faixa de progressão; um elite por encontro nas hunts, sem herdar timer/regra/recompensa de boss |
| Atributos | Coin nos níveis usuais; material extra nos marcos; novos AGI,DefF,DefM,Sorte,Destreza | Limite de pontos investidos por nível para haver escolha real; fórmulas e pesos abaixo são candidatos |
| Repetição | Repetir andares concluídos, exceto bosses | Progresso e seleção separados por atividade; um combate econômico ativo por conta; farm automático de andar concluído |
| Fortalecimento | +1–3 falha mantém; +4–7 regride1; +8–12 pode regredir/quebrar; +13–20 falha desprotegida quebra | Todas as faixas se referem ao nível de destino; sem piso de proteção+3, sem pity/checkpoint na candidata |
| Materiais | +1–5 Coin/carvão; +6–10 adiciona ferro; +11–15 adiciona ouro; +16–20 adiciona jade e exige Lendário+ | Aplicar desde a tentativa para entrar na faixa, sem cobrar material de etapa posterior ao regredir |
| Pergaminhos | Loja por Ruby, eventos periódicos e drop muito raro na torre comum | Uma unidade por tentativa protegida a partir do destino+8, consumida mesmo no sucesso; sem bônus de chance; fonte vinculada à conta |
| ASPD | AGI aumenta gradualmente; extremo late-game perto de5ataques/s, inspirado no Ragnarok clássico | Cap global200ms, inclusive equipamento/buffs;200ms equivale aASPD190; caminho próprio abaixo |
| Offline | Não foi fechado pelo usuário | Farm apenas na atividade selecionada e andar concluído; teto inicial experimental8h; sem novos andares ou boss offline |
| Cenário | Diferenciar hunts com filtro/variação do parallax | Paletas só do cenário/chão e assets existentes; manter legibilidade de personagens/HP/HUD |

A publicação desta documentação **não autoriza começar código de gameplay**. Implementação depende de instrução posterior; a regra de publicar ao final vale também para esta etapa documental.

## 3. Recompensas e progressão das atividades

| Atividade | Recompensa direta | Nunca concede nesta proposta |
|---|---|---|
| Torre principal, inimigo comum | Coin,XP herói/rei,chance de equipamento; pergaminho muito raro em faixa elegível | Carvão,ferro,ouro,jade como drop direto |
| Boss da torre principal | Coin,XP,equipamento pela tabela própria futura | Farm de boss já concluído; jade exclusiva do evento global |
| Hunt de carvão | XP+carvão | Coin,equipamento,pergaminho,jade |
| Hunt de ferro | XP+ferro | Coin,equipamento,pergaminho,jade |
| Hunt de ouro | XP+ouro | Coin,equipamento,pergaminho,jade |
| Boss global diário | Jade; demais recompensas específicas ainda não definidas | Jade offline ou por mina comum |

Repetição de boss concluído é bloqueada; repetir uma tentativa perdida antes da primeira vitória continua possível. Separar primeira conclusão de kill normal e impedir duplicação ao alternar destino, reconectar ou repetir comando. Não remover recompensas já confirmadas para corrigir navegação.

**Acesso inicial:** abrir ferro quando uma build financiada só com Coin e equipamentos iniciais garantidos conseguir enfrentar a primeira hunt. Não depender de drop aleatório para sair de um bloqueio. Carvão deve abrir ainda antes/na mesma fase de poder; ouro fica depois. Um elite por encontro permite aproximar poder de boss sem somar três bosses simultâneos. Inimigos permanecem comuns/elites do bestiário; o uso de um orçamento de poder não os transforma em bosses.

A faixa carvãoH1–H9 pode usar como referência o entorno do boss10 da torre principal, com progressão interna moderada. Ferro/ouro aplicam orçamentos superiores à mesma faixa. Esses anchors terão de ser recalibrados após ASPD/defesa/acerto; não multiplicar cegamente as fórmulas atuais. O boss10 atual tem400HP e10ATQ/1,8s; isso é referência histórica, não promessa de stats futuros.

**Rendimento:** medir material/minuto e XP/minuto incluindo deslocamento/transições, derrotas e cura. Um andar que dá mais por morte pode render menos por hora; a UI deve mostrar rendimento estimado e perigo, sem prometer taxa garantida. Repetir andar seguro é opção legítima. Não recompensar ação manual por segundo ou alternância de tela.

**Escolha ativa/offline proposta:** uma atividade econômica por conta, progresso independente e relógio único. Ao sair do combate, resolver abandono/reset de inimigo/transição de forma consistente; nunca permitir recuperar HP sem reiniciar o mesmo desafio ou pular o custo de transição para acelerar drops. Offline somente no último andar concluído selecionado, build/bônus válidos naquele intervalo, teto8h experimental; parar se a simulação morrer. Sem first-clear, novo andar, novo boss, presença social ou jade offline. Modelar por trechos/checkpoints verificáveis para não executar144.000golpes de herói por conta por8h a5APS em cada leitura.

## 4. Oferta renovável de equipamento

**Lacuna detectada no código vigente:** `rollRarity(false)` não gera épico/lendário; só bosses oferecem essas raridades. Se bosses concluídos não repetem, a oferta por personagem fica finita, incompatível com destruição recorrente e mercado duradouro.

Proposta: manter bosses como conquistas únicas e permitir raridades altas, muito raras, em inimigos comuns avançados da torre principal. Exemplo candidato a partir do andar100: equipamento em0,5%das mortes; dentro do equipamento,74%comum,20%incomum,5%raro,0,6%épico,0,4%lendário. Total100%; lendário por morte=0,005×0,004=0,00002, ou1/50.000em média. Isso não garante arma, slot, nível ou afixos desejados. Chefes mantêm tabela própria para etapa posterior, sem definir taxas agora.

A média não é calendário: a10mortes/min,50.000mortes equivalem a83,3h de farm de torre; a30/min,27,8h. Hunt não produz essas mortes elegíveis, e nem todo tempo da conta é farm de equipamento. Examinar primeiro lendário, slots úteis, estoque, reposição e oferta do servidor antes de fechar a taxa. Equipamento fora do nível ou build pode ter demanda diferente.

Salvamento e mochila cheia atualmente podem gerar ferro. Proposta de revisão: não gerar materiais exclusivos de hunt por descarte; conversão controlada em Coin/recuperação de custos ou outra política a definir, com teste de ciclo fabricação→descarte. Nunca descartar automaticamente um lendário por mochila cheia: usar bloqueio de coleta/caixa pendente limitada e aviso, com regra de capacidade explícita. Ferro fundido pode continuar como produto de fabricação a partir dos materiais; não é drop paralelo de mina.

## 5. Atributos e escolhas de build

Manter Força e Vitalidade e acrescentar:

| Atributo | Função | Restrição de design |
|---|---|---|
| Força | Ataque físico por golpe | Não conceder velocidade junto sem custo explícito |
| Vitalidade | HP máximo | Sem cura explorável ao redistribuir pontos |
| Agilidade | Reduz intervalo de ataque | Cap global5APS; ritmo final exige treino+equipamento avançado |
| DefesaF | Mitiga dano físico | Não mitiga magia por nome do ataque/sprite |
| DefesaM | Mitiga dano mágico | Só fica comprável quando houver dano mágico implementado e identificado |
| Sorte | Chance de crítico | Não aumenta loot, raridade, pergaminhos ou chance de fortalecer |
| Destreza | Chance de acerto | Crítico é sorteado depois do acerto; não ignora erro |

Hoje não existe sistema completo de dano mágico/acerto/evasão nem AGI dinâmica; são mudanças futuras reais, não novos rótulos de atributos já prontos. Ataques antigos de boss continuam físicos até sua etapa própria. Inimigos mágicos comuns devem ser planejados explicitamente, não inferidos pela aparência.

**Orçamento de build candidato:** B=6×(nível do herói−1); treino custaCoin e ocupa orçamento, não compra pontos livres extras. Peso1 por nível de Força/Vitalidade/DefF/DefM/Sorte/Destreza; peso5 por nível deAGI. Cap1000por atributo usual;AGI treinada até800 e ainda limitada por ceil(0,8×(nível−1)). Equipamentos têm orçamento independente auditado. No nível1000,B=5994; maximizarAGI ocupa4000e impede maximizar todos os demais. Os pesos são hipótese, não prova de equivalência entre builds.

Alternativas de identidade: dano por golpe, velocidade/precisão, crítico, resistência física ou resistência mágica. Comparar com igual orçamento/qualidade de equipamento. Evitar uma build vencer todas as atividades. Redistribuição gratuita no início e depois porCoin com cooldown/custo previsível é proposta; não vender reset obrigatório porRuby. Desbloquear1000níveis de treino não significa comprar todos automaticamente por ter moedas.

## 6. Curva candidata de ASPD e combate

A referência clássica é o limite e a relação intervalo↔ASPD. Não copiamos a fórmula de classe/arma/AGI/DEX do Ragnarok.

- T=AGI treinada efetiva, entre0e800, respeitando nível e orçamento.
- G=AGI de equipamento/buffs, entre0e200 no total; esse orçamento precisa exigir equipamento de fim de jogo. Sem item barato isolado concedendo200AGI.
- q=clamp((T+G)/1000,0,1).
- ASPD=150+40×q^1,25.
- intervalo=ceil(max(200,20×(200−ASPD)))ms.
- APS=1000/intervalo. Aplicar cap depois de todos os bônus.

A baseline150mantém1ataque/s. Não somar haste multiplicativa depois do cap. Destreza não aumenta ASPD nesta proposta para não torná-la obrigatória em duas funções. ZeroAGI não significa personagem incapaz de atacar. Atrasos acumulam agenda no servidor; latência/FPS/número de requests não criam ataques.

| q efetivo | ASPD aproximada | Ritmo aproximado |
|---:|---:|---:|
| 0 | 150 | 1/s |
| 0,25 | 157,07 | 1,16/s |
| 0,50 | 166,82 | 1,51/s |
| 0,75 | 177,92 | 2,26/s |
| 0,90 | 185,06 | 3,34/s |
| 1 | 190 | 5/s |

Valores exatos com arredondamento em `curve-analysis.json`. O cap5APS sozinho multiplica DPS potencial por5; demanda rebalancear HP, recompensas/hora, crítico e animações, não apenas trocar1000ms por200ms.

**Demais fórmulas candidatas:** conservar a base atual de Força/HP (6+2F+2×(nível−1)+ATQ de equipamento;100+15V+10×(nível−1)+HP de equipamento/mascote), antes de bônus explícitos. DefF/DefM recebem2por treino mais o equipamento correspondente. Mitigação proposta=0,75×D/(D+K), K=100+2×andar equivalente do inimigo, para cada tipo físico/mágico; máximo assintótico75%, dano positivo mínimo1. Golpes mistos exigem separar parcelas, sem aplicar ambas as defesas integralmente ao mesmo dano.

Crítico candidato=clamp(5%+0,04p.p.×SorteTotal,5%,45%); multiplicador1,5×inicial, com cap separado antes de novos afixos. Acerto candidato=clamp(85%+0,015p.p.×DestrezaTotal−0,01p.p.×EvasãoInimiga,60%,99,5%). Evasão inimiga necessita tabela própria por faixa/papel; não há fórmula aprovada ainda. UI mostrachance efetiva contra o alvo. O teste crítico vem após o acerto, sem ataque garantido por crítico. Essas fórmulas são independentes da referência Ragnarok e devem ser avaliadas juntas.

DPS esperado de referência=ATQefetivo×APS×pAcerto×[1+pCrit×(multiplicadorCrit−1)]. Não basta comparar um ponto deAGI com um ponto deSorte. Limites/custo/orçamento devem ser ajustados se velocidade dominar todas as builds.

## 7. Custos de atributos

Candidato para comprar nível destino n: C=ceil(Bs×1,18^min(n−1,20)×[1+max(n−21,0)/20]^2). Bs:Força100,Vitalidade80,AGI150,DefF100,DefM100,Sorte120,Destreza90Coins. Crescimento inicial exponencial e continuação polinomial limitada, evitando1,18^1000/overflow ou preços impraticáveis. Não usar os preços fictícios citados na conversa como contrato.

Materiais adicionais só quando n é múltiplo10. Candidato: ferro=25×(n/10); a partir de50adicionar carvão=10×(n/10); a partir de200adicionar ouro=2×(n/10). Jade não é exigida para atributos básicos. Esses gates só podem entrar depois das hunts correspondentes estarem acessíveis sem o próprio gate. Sem jade obrigatória para comprar DefM/AGI básica. Custos e pontos são mostrados antes de confirmar.

## 8. Fortalecimento: regras e curva própria

**Nível de destino** resolve as faixas: tentativa+3→+4usa a regra+4 e pode voltar a+2. +3não é checkpoint. +0nunca fica negativo. A proteção não permite ultrapassar o limite de raridade. Comum/incomum/raro/épico param em+15; Lendário vai a+20; raridades superiores futuras precisam de definição própria, não são criadas agora.

Na candidata não há failstack, piso ou sucesso garantido acima do inicial. A proteção não aumenta chance e só pode ser selecionada no destino+8ou maior; uma unidade é consumida na tentativa, mesmo no sucesso. Falta de proteção não autoriza confirmar uma tentativa destrutiva automaticamente. Mostrar resultado e chance real de destruição por tentativa, não só a chance condicional.

| Destino | Sucesso | Quebra entre falhas sem proteção | Resultado restante da falha |
|---:|---:|---:|---|
| +1 | 98% | 0% | Mantém |
| +2 | 95% | 0% | Mantém |
| +3 | 92% | 0% | Mantém |
| +4 | 90% | 0% | −1 |
| +5 | 85% | 0% | −1 |
| +6 | 80% | 0% | −1 |
| +7 | 75% | 0% | −1 |
| +8 | 70% | 5% | −1 |
| +9 | 65% | 8% | −1 |
| +10 | 60% | 12% | −1 |
| +11 | 55% | 18% | −1 |
| +12 | 50% | 25% | −1 |
| +13 | 48% | 100% | Quebra |
| +14 | 46% | 100% | Quebra |
| +15 | 44% | 100% | Quebra |
| +16 | 42% | 100% | Quebra |
| +17 | 40% | 100% | Quebra |
| +18 | 38% | 100% | Quebra |
| +19 | 35% | 100% | Quebra |
| +20 | 30% | 100% | Quebra |

Com proteção, toda falha destrutiva destas faixas passa a−1. Destino+8tem1,5%de quebra por tentativa(30%×5%);+12tem12,5%;+20tem70%sem proteção. Quebra elimina a instância e seu fortalecimento/atributos, sem gerar cópia recuperável nesta candidata. Material eCoin da tentativa são gastos também na falha.

**Ganho de poder candidato:** G(n)=1+0,025n+0,0015n², aplicado aos atributos primários do item(ATQ/HP/DefF/DefM) e não ao personagem inteiro. G(3)=1,0885;G(7)=1,2485;G(12)=1,516;G(15)=1,7125;G(20)=2,1. +20é22,63%maior que+15nos atributos afetados do mesmo item; não é10vezes mais forte nem bônus de22,63%garantido no DPS total. Não multiplicarAGI/Sorte/Destreza automaticamente porG. Arredondamento precisa garantir feedback real em item inicial sem fabricar atributos ausentes: candidato mínimo+1no atributo primário positivo após primeiro fortalecimento, e cálculo por base imutável para não acumular arredondamentos a cada avanço/recuo.

**Custo por tentativa candidato**, com L=nível do item(1–100), V=1+(L−1)/25, R por raridade(comum1,incomum1,15,raro1,35,épico1,75,lendário2,25), n=destino:

- Coin=ceil(100VR×1,32^(n−1)).
- Carvão=ceil(2VR×1,25^(n−1)), sempre.
- Ferro=ceil(10VR×1,25^(n−6)), somente n≥6.
- Ouro=ceil(2VR×1,25^(n−11)), somente n≥11.
- Jade=ceil(0,1VR×1,25^(n−16)), somente n≥16.

Custos são exponenciais no nível de fortalecimento limitado20, não no nível de conta. Ferro recebe base maior para cumprir seu papel de alto consumo. Preços acima são hipótese auditável, não implantação comercial ou curva já equilibrada com as hunts. Ferro fundido não participa desta receita candidata; permanece fabricação separada até revisão das receitas antigas.

## 9. Resultado matemático e escassez

Cadeia de Markov a partir de+0, probabilidades fixas, sem garantia. Protegida usa um pergaminho por tentativa destino≥8. A versão desprotegida assume reposição instantânea de uma base idêntica+0após quebra, sem custo de aquisição; portanto subestima o esforço real. [Detalhes e limites](CURVE_MODEL.md).

| Alvo | Tentativas médias com proteção | P95 com proteção | Pergaminhos médios | Tentativas médias sem proteção |
|---|---:|---:|---:|---:|
| +7 | 9,25 | 15 | 0 | 9,25 |
| +12 | 29,06 | 58 | 17,82 | 42,28 |
| +15 | 70,44 | 167 | 58,27 | 452,75 |
| +20 | 708,03 | 2.040 | 685,31 | 67.791,50 |

P95significa que5%das trajetórias protegidas excedem esse número, não um limite/garantia. Última tentativa a30%não significa uma média total de3,33tentativas para transformar+0em+20. A variante sem proteção espera cerca de3.074,64bases destruídas até+20e pressupõe que sempre existam substitutas idênticas. Na prática, proteção será economicamente essencial nas faixas altas: isso precisa ser reconhecido no design da loja.

Exemplo analítico de **uma base lendária nível100**, protegida até+20: média26.724.323Coins,255.567carvão,418.197ferro,25.301ouro,236jade e685,31pergaminhos. Exclui preço da base, farm, despesas concorrentes e mudanças de build. A média de cada recurso não descreve a mesma trajetória individual nem é um orçamento garantido.

A curva permite +20difícil mesmo com proteção, mas **não prova escassez no servidor**. Se milhões de tentativas forem financiadas, surgirão muitos+20. Meta de teste candidata: campanha e hunts principais viáveis sem+20; acompanhar proporção de contas elegíveis com+20por coorte/90dias, estoque por slot, tempo de permanência de anúncio e volume real. O objetivo de raridade precisa de denominador e horizonte; uma hipótese inicial é1–3%das contas elegíveis maduras possuírem ao menos um+20na primeira janela de90dias, a confirmar por simulação de aquisição. Não é resultado obtido.

## 10. Pergaminhos, Ruby e mercado

Fontes confirmadas: lojaRuby,eventos periódicos,drop muito raro na torre comum. Candidatos para simular:30pergaminhos/semana em participação acessível de eventos; drop independente de equipamento em20ppm(0,002%,média1/50.000mortes)elegíveis em andares comuns≥100. Não conceder em hunt/boss repetível. Evitar que farm de andar trivial seja a melhor fonte; comparar mortes/minuto por faixa. Sorte não altera essa taxa. Essas quantidades/desbloqueios não foram aprovados como definitivos.

A10mortes/min,8h/dia exclusivamente na torre por7dias rendem33.600mortes e0,672pergaminho semanal esperado nessa taxa, além dos eventos. Esse teto de dedicação não pode ser somado a8h/dia de hunt simultânea.685pergaminhos divididos por30,672/semana dão22,34semanas **de obtenção média dos pergaminhos**, sem contar materiais/lendário/elegibilidade; não é previsão de tempo até+20. A cauda pode ser muito maior. Economias de eventos e jade devem ser modeladas junto com as hunts, sem exigir compra para completar a campanha.

LojaRuby terá vantagem econômica real: preservar itens e permitir mais tentativas não é cosmético. Proposta de mitigação a avaliar: mesmo pergaminho e mesmas chances em todas as fontes; sem pergaminho premium superior; fonte não negociável diretamente; teto de loja por conta/semana(por exemplo10)sem restringir drop gratuito, trilha de origem e análise de contas alternativas. Itens protegidos continuam negociáveis, portanto a venda ainda se transmite ao mercado; limitar contas não elimina essa vantagem. PreçoRuby, renda gratuita deRuby e limite definitivo ficam abertos até modelo de oferta/consumo. Nenhuma compra real ou produto será ativado antes da fase final de monetização já adiada.

O mercado existente deve preservar ID/nível/raridade/afixos/refino no escrow. Item listado não pode ser fortalecido; quebra não pode coexistir com anúncio ativo. Alterar dono não reseta qualquer limite/histórico de tentativas, mas a candidata não possui failstack transferível. Ofertas antigas precisam revalidar a instância. Não haverá transferência automática de+20para outra base ou aumento de raridade para contornar caps sem regra futura explícita.

Jade continua pendência da etapa própria do boss global: quantidade e distribuição por participação, elegibilidade, janelas e claims únicos precisam ser definidas. Sem depender só de último golpe ou ranking de dano. Até existir fonte justa e validada, o trecho+16–+20não deve ser liberado como progressão obrigatória ou vendido como alcançável normalmente.

## 11. Impactos técnicos e migração

A mudança não se resume aUI. Atualmente o herói usa1000ms fixos, crítico5%/1,5×, defesa física genérica; fortalecimento é determinístico e produz5%por nível em atributos, sem quebra. Regras antigas de mina, tutorial, equipamentos, tônicos, mascote, ledger, drops e eventos precisam ser revisadas.

Arquitetura proposta inspirada em OpenRPG: definições estáticas versionadas para atividade, dano, atributo, refino e recompensa; estado por conta/instância guarda progresso, destino ativo, agenda e tentativa. Um pipeline autoritativo resolveacerto→crítico→mitigação por tipo→HP→morte→recompensa. Fortalecimento valida propriedade/raridade/escrow/saldo/proteção, reserva e resolve uma única tentativa atômica, registrando RNG/versão de regra/resultado sem expor mecanismo de manipulação. Retry/reconexão não sorteia novamente.

Arena, boss global, rankings e eventos também consomem atributos hoje. Precisam de uma matriz de compatibilidade: velocidade/acerto/crítico/defesas devem ter efeito coerente ou indisponibilidade explícita em cada modo. Não conceder pontuação de força por DefM sem efeito no encontro nem deixar AGI funcionar só na torre sem avisar. A revisão do consumidor de stats do boss global pertence à sua etapa própria; não se presume que o tick atual1s já represente5APS.

A5APS, uma animação atual de0,8s e uma aproximação de680msnão cabem em200ms. Precisamos desacoplar golpes econômicos de animações e agrupar números visuais com contagem/total/críticos, preservando todos os resultados do servidor. O buffer atual de8hits não representa adequadamente atrasos longos; requer sequência/agrupamento limitado e verificável, sem DOM/textura novos por golpe. Validar CPU, requests e fairness com latência/FPS diferentes e modo de movimento reduzido.

Migração futura exige backup por conta, versão/config nova e ensaio de rollback de dados, não apenas revert de código. Preservar saldos e IDs; desligar fontes antigas exatamente no corte, sem receber produção e hunt pelo mesmo intervalo. Capturar compras antigas; converter/reembolsar clique/minas/tônicos/bônus aposentados com política explicitada, possivelmente crédito de reforma vinculado em vez de material negociável que infle o mercado. Não converter clique emAGI gratuitamente por equivalência arbitrária.

Há itens antigos não lendários acima de+15permitidos pelo jogo atual: não destruir ou reduzir silenciosamente. Definir preservação em versão legada ou conversão com compensação e histórico antes de aceitar migração. Atributos acima do orçamento novo necessitam exceção de transição/compensação; não amputar treino. Jade antiga em estoque pode permanecer como saldo legado identificado; exclusividade da nova fonte vale a partir do corte. Toda compensação usa fonte única e não pode repetir por restaurar backup/reconectar.

## 12. Pendências que impedem chamar a curva de balanceada

1. Simular aquisição, custos de atributos, equipamentos úteis, hunt/torre/eventos alternados e perdas reais, incluindo cauda e jogadores sem compra.
2. Garantir acesso a carvão/ferro sem material necessário ao próprio desbloqueio; testar a partir de conta vazia sem sorte de drop.
3. Definir evasão, dano mágico e orçamento deAGI em equipamento; não vender DefM sem efeito.
4. Validar diversidade de builds com igual orçamento; impedir uma solução única deASPD/crit dominar tudo.
5. Fechar fonte renovável de lendários com bosses concluídos não repetíveis e proteger mochila cheia.
6. Calibrar jade e pergaminhos gratuitos/loja: a raridade não pode ser inferida só da taxa final de30%.
7. Validar desempenho5APS/offline e transações de reforço/mercado sob concorrência, falha e replay.
8. Aprovar compensação/migração antes do corte; manter comercialização adiada e bosses em etapa separada.

Próxima entrega prevista é o modelo integrado de economia/builds, após autorização para avançar. Nada neste plano alterou gameplay, banco, preços ativos, probabilidade ou sprites.


## Calibração posterior R1.1

A candidata histórica acima foi preservada. Para novos números deXP/tempo, requisito de equipamento, rampa comum/hunts, custo de refino e chances+16–20, consultar [R1.1](r11/CALIBRATION_REPORT.md). Meta explicitada pelo usuário:90–120dias no melhor cenário; +20é prestígio separado, não requisito para cap. Candidata3passou gates numéricos, mas segue sem aprovação completa de produção. Nada deste planejamento está ativo no jogo.
