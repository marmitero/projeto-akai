# R1.1 — Calibração de tempo e conquistas

18/10/2026. **Há gates numéricos reprovados; não aprovar produção.** Esta é uma calibração executável, não uma atualização do jogo instalado. Nenhum save/banco/launcher foi modificado. [Critérios](criteria.json) · [Resultados](results.json) · [Reprodução](../../../../scripts/economy-r11/README.md).

## Resultado principal

Pedido: no melhor cenário legal, chegar ao nível máximo em aproximadamente90–120 dias; conteúdo avançado deve exigir bons equipamentos/refino e conquistas, sem depender apenas de nível ou tempo.

Candidata2: melhor perfil contínuo, desde conta nova, mediana **112 dias**, mínimo observado **106**, p90 **118**; 95,8%até120 dias. Holdout independente: mediana **112**, 87,5%até120. Perfil16 honline+8 hoffline: mediana **114 dias**.

O modelo possui piso matemático de **96 dias**: mesmo com equipamento transferido, todos os drops favoráveis e recursos abundantes, a conta não gera mais de um segundo de XP qualificado por segundo de atividade econômica válida. O máximo exige2304 horas qualificadas. Nenhuma combinação online/offline pode somar mais de24 h/dia. Isso depende de o futuro motor aplicar o mesmo pipeline a todas as fontes deXP; não é uma proteção já implantada no servidor.

Os90–120 dias são o cenário eficiente, não promessa para toda conta. Na coorte principal houve uma trajetória de133 dias. Perfis com menos tempo ou escolhas/equipamento menos eficientes demoram mais. A proporção observada de conclusão até120 d tem IC95% 79,8%–99,3%:24 contas/perfil permitem calibrar, mas não provar estatisticamente um resultado populacional de90%. Modelos também não substituem playtest humano.

## Curva de XP proposta

Unidade de simulação: segundo qualificado de domínio em vitória. **Não é o `heroXp` antigo e não pode substituir seus valores diretamente.**

Para cada nível destino, peso w(n)=0,05+2 ×(n/999)^1,7, com n=1…999. Normalizar a soma para2304 horas. Curva crescente: início com conquistas frequentes, metade final concentra a maior parte do esforço. Na implementação futura, usar tabela inteira versionada e carry/remainders determinísticos; não calcular floats diferentes no cliente e servidor.

| Nível | Horas qualificadas acumuladas mínimas | Dias ideais a24 h | Nível máximo de item equipável |
|---:|---:|---:|---:|
| 1 | 0.0 | 0.0 | 1 |
| 100 | 18.67 | 0.78 | 10 |
| 250 | 87.18 | 3.63 | 25 |
| 500 | 404.41 | 16.85 | 50 |
| 750 | 1101.34 | 45.89 | 75 |
| 900 | 1754.77 | 73.12 | 90 |
| 1000 | 2304.0 | 96.0 | 100 |

Esses são limites ideais, não datas prometidas de cada marco. Tempo em eventos, escolhas de farm, equipamento inadequado, derrotas, loot, transições e fracionamento dos encontros aumentam as datas orgânicas.

Recompensa por vitória: `min(tempo do ciclo concluído, tempo de referência no mesmo encontro) × min(1,(andar equivalente/nível do herói)²)`. Referência: build ágil com orçamento legal e equipamento épico+10 apropriado ao nível. Um conjunto fraco leva mais tempo que a referência e rende menosXP/h; matar inimigos triviais abaixo do nível sofre redução. Ao atingir a eficiência de referência, o teto estabiliza o prazo mesmo com bônus. O ciclo inclui a transição daquele encontro concluído; não há crédito por espera livre, batalha perdida, login, entrar/sair ou encontro parcial. É uma regra nova candidata de recompensa/limitação de fluxo, não apenas multiplicar a antigaXP.

Não é necessário completar missão diária para receberXP, nem existe reset diário dessa barra. Não há estoque inicial/catch-up que permita atravessar o piso. Repetir andares elegíveis segue permitido; bosses concluídos não. No offline, só a atividade já concluída/selecionada; stats congelados. Recalcular referência e elegibilidade em cada nível cruzado evita usar por8 h a taxa fácil do primeiro nível do lote. O teste de200 encontros em lote versus separados verifica esse caminho com stats fixos; não equivale à determinística do motor inteiro com loot.

## Tempo + conquistas + equipamento

Equipar item de nívelL requer herói `10 ×(L−1)+1`; item100 exige herói991. Isso fecha a rota antiga de usar todo o conjunto máximo ao chegar apenas ao nível100. Nível por si só não dá uma arma forte: é preciso obter base adequada, farmar materiais, escolher atributos e financiar fortalecimento.

Inimigos comuns após andar100 recebem rampa gradual, com t=max(0,(andar−100)/900): HP×(1+2 t²), ATQ×(1+25 t³). Hunts usam âncoras de poder da proposta, dificuldade carvão<ferro<ouro, rampa adicional e janela de execução nas faixas finais. A partir do andar750, a janela do encontro cresce de20 s até30 s no1000, exigindo dano e não só vida para aguentar indefinidamente. Esses números são orçamentos de teste, não fases/mecânicas novas de boss.

Ablation no herói1000: mesmos pontos e mesmo nível de equipamento; só raridade/refino variam. Exemplo da build ágil:

| Conjunto | Andar comum999 | Hunt ouro1000 |
|---|---|---|
| Comum +0 | Falha | Falha |
| Raro +0 | Falha | Falha |
| Raro +7 | Vence | Falha |
| Épico +12 | Vence | Vence |
| Lendário +15 | Vence | Vence |

Nas seis builds testadas, comum+0 e raro+0 falham em ambos os desafios. Uma build épica+12 legal passa; lendário+15 oferece alternativas nas demais. Isso prova necessidade de investimento no envelope testado; não que todo equipamento lendário deva ser+15, nem que todos os slots precisem do mesmo refino. Grade registra resultados por build/raridade em `results.json`. O agente orgânico compra equipamento/refino com saldo limitado, começa sem doações e prioriza todos os slots até+7 antes de refino alto na arma. Resultados ainda dependem de modelar afixos/pets/consumos e inimigos mágicos reais.

Para futuras raids avançadas: usar esse envelope de equipamento/DPS/sobrevivência e conquistas prévias de torre/hunts como base de acesso, não vender entrada apenas por nível. **Não existem raids novas implementadas ou validadas por este ensaio.** Mecânicas e recompensas dos bosses continuam em etapa própria. As definições dos bosses atuais da torre foram preservadas byte a byte; por isso a dificuldade deles ainda precisa de calibração na fase específica e não se afirma que a campanha inteira está pronta para produção.

## Fortalecimento e prestígio

- +1–3: falha mantém; +4–7:−1; +8–12: regressão/quebra; +13–20: falha sem proteção quebra. Todas as consequências originais preservadas.
- Proteção não aumenta a chance; consome um pergaminho por tentativa protegida e transforma falha em−1. A política simulada recusa risco sem proteção a partir de+8; o produto futuro permitirá decisão explícita conforme requisitos.
- Chances+1–15 preservadas. Novas candidatas+16–20: **32%,27%,22%,17%,12%**. +20 não é requisito para nível máximo nem para vencer o envelope final.
- Manter materiais por destino e limite de raridade:16–20 só lendário+. A partir de+11, custos anteriores×4 Coin/×4 carvão/×8 ferro/×4 ouro; jade inalterada. Aumentar demanda real dos materiais, sem tornar o bootstrap caro. Detalhes em código/config versionados.
- Reduzir crescimento dos drops de materiais para expoente0,65; Coin final reduzida gradualmente até25%da recompensa base. Custos competem com treinamento e gear; não há recursos infinitos nas contas orgânicas.

Coorte madura90 dias,300 contas gratuitas, base lendária100 já disponível: **0,7%com+20** (IC95% 0,2%–2,4%), contra32,7% na candidata anteriorR0. Com dez pergaminhos pagos/semana hipoteticamente financiados: **0,7%**. Não confundir esse fixture com chegar à maturidade em90 dias. Estoques/múltiplas bases/item baixo/mercado podem alterar a escassez global; a proporção real ainda precisa de amostra maior e contratos definitivos.

Continuam hipóteses:30 pergaminhos/eventos por semana,10 de loja e3 jade/dia com participação. Jade segue exclusiva do futuro boss global diário; nenhuma fonte alternativa foi criada. PreçoRuby, tradabilidade e proteção contra funil de alts não foram definidos/ativados. Não se deve aprovar comércio monetizado com base apenas no gap medido.

## Coortes e gates

Total: **744 trajetórias**, de90 a365 dias. Seeds de aceite88452001 e holdout99337001; pilotos separados. Contas que não terminam continuam no denominador; quantil censurado aparece como “não atingiu”.

| Perfil | Contas | Horas online+offline/dia | Primeiro máximo | Mediana | p90 | Máximo até120 d |
|---|---:|---:|---:|---:|---:|---:|
| best_24 h | 24 | 24+0 | 106 | 112 | 118 | 95,8% |
| optimized_16 plus8 | 24 | 16+8 | 105 | 114 | 118 | 95,8% |
| paid_best_24 h | 24 | 24+0 | 106 | 112 | 116 | 91,7% |
| regular_2 plus8 | 24 | 2+8 | 255 | 294 | 333 | 0,0% |
| dedicated_8 plus8 | 24 | 8+8 | 161 | 186 | 195 | 0,0% |
| best_holdout | 24 | 24+0 | 104 | 112 | 120 | 87,5% |

Horas “online” significam jogo em batalha automática, não quantidade de cliques.8 hoffline é o limite herdado/proposto nesta candidata. Os perfis regulares não foram apresentados como se jogassem24 h. O piso teórico de2304 h implica no mínimo230,4 dias a10 h/dia ou144 dias a16 h/dia, antes de ineficiências. Alterar esse limite offline muda os prazos e exige nova simulação.

| Gate fixado antes do aceite | Resultado |
|---|---|
| absoluteMinimum | PASSOU no modelo |
| bestMedian | PASSOU no modelo |
| bestBy120 | PASSOU no modelo |
| holdoutMedian | PASSOU no modelo |
| holdoutBy120 | NÃO APROVADO / pendente |
| bootstrap | PASSOU no modelo |
| gearAblation | PASSOU no modelo |
| matureScarcity | NÃO APROVADO / pendente |
| paidGap | PASSOU no modelo |
| completeness | NÃO APROVADO / pendente |

O primeiro candidato, com referência épico+12, foi rejeitado:62,5%do melhor perfil até120 dias, embora a mediana fosse115. Resultados brutos e resumo preservados em `rejected-candidate-1*.json`; não relaxamos gates. Candidata2 mudou a referência para épico+10, preservou o piso96 dias e rodou seeds novas. O primeiro ensaio foi interrompido após os perfis suficientes para identificar a reprovação; não é apresentado como validação completa daquele candidato.

16 testes passaram, incluindo limite temporal, contabilidade por fonte/gasto, fontes exclusivas das hunts, equipamento por nível, ausência deXP sem vitórias, falha/proteção, bosses preservados, retorno a andar seguro, batches cruzando níveis e censura de amostra. `assert` verifica saldos não negativos, tempo e teto de domínio ao longo das contas. Esses testes validam o modelo, não servidor/concorrência/banco/Windows. Dados e scripts têm hashes no manifesto; os resultados principais registram os hashes dos seus insumos.

## Limites e decisão de implementação

**Ainda não há aprovação integral para ativar gameplay.** Falta fechar oferta definitiva de jade/participação do boss, Ruby/eventos/transferência de pergaminhos, afixos/pets/forja/descarte/overflow, compensações e migração. O mercado continua sem demanda/liquidez humana acoplada; o teste de conservação anterior não prova preço nem acesso a equipamento. Doações, compra de gear e alts não encurtam o piso temporal se o futuro pipeline for respeitado, mas podem alterar a chance de completar perto dele e o número de+20.

A bolsa futura de itens nesta simulação limita100 candidatos e descarta excessos; o stash segue a políticaR1. Não é a UI de inventário final, nem auditoria completa de conservação de cada instância. Combate usa dano esperado e reserva25%deHP, não caudas reais de esquiva/crítico. Fonte de eventos/recompensas legadas e bosses atuais exigem revisão antes de lançamento. A novaXP exige migração versionada: não zerar nem reinterpretar saldos antigos.

Esta etapa entrega a curva candidata, o prazo medido, a exigência de equipamento e a validação reproduzível. O histórico e o jogo publicado ficam preservados. Próximo passo: fechar entradas materiais e validar mercado/migração/boss em seus escopos; iniciarR2 somente quando os gates completos autorizarem, mantendo a nova economia desativada durante a preparação. Monetização permanece adiada.
