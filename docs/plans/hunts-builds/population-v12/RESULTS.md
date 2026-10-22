# Fase 3 — população do boss global e Jade

**Integridade do ensaio aprovada; população pública e ativação ainda bloqueadas.** Os prêmios definidos pelo usuário não mudaram. Nenhum HP, custo, carteira real ou desbloqueio de +16–20 foi alterado. Monetização continua adiada.

## Ensaio reproduzível

Fonte: `7fec168f8af89696e813209fc925324541947542086bdb04ede4ea94b66e30b7`. Foram executados 17 cenários nativos, seis chegadas tardias e três sensibilidades de HP. Atributos vêm de snapshots diários observados de sete campanhas V10, em estágios diferentes, com arquivo e SHA256 preservados noJSON. Os arquétipos são reaproveitados para modelar até20contas; não são20campanhas independentes nem população pública. As três seeds não constituem amostra estatística/P95. Não há XP/farm/offline/Coin concorrente ao evento. [Protocolo](IMPLEMENTATION.md) · [Resultados completos](results.json).

A tabela mostra a seed4213 e os cenários adicionais, com duração de900s ou1300s conformeJSON. Tempos de derrota são medidos desde o início do cenário, não desde a chegada do último participante.

| Cenário | Contas | Derrota coletiva | Participações qualificadas | Jade total |
|---|---:|---:|---:|---:|
| solo-entry-4213 | 1 | Não derrotado | 1 | 3 |
| solo-earned-late-4213 | 1 | 275.454s | 1 | 453 |
| 20-entry-4213 | 20 | Não derrotado | 20 | 60 |
| 20-earned-late-4213 | 20 | 17.616s | 20 | 1410 |
| staggered-entry-middle-late | 20 | 268.514s | 20 | 1410 |
| lease-expired | 20 | Não derrotado | 0 | 0 |
| leave-and-rejoin | 7 | 43.350s | 7 | 1251 |
| 10-account-coalition | 20 | 17.616s | 20 | 1410 |

Com20avançados e o HP atual100milhões, as três mortes ocorreram entre17,616e17,858s. Os11grants competitivos (top10+último hit) de cada uma ocorreram antes de600s possíveis de presença. A base só chegou após600s válidos, inclusive no combate privado posterior à morte coletiva, conforme a regra R8 existente. Iniciantes solo/grupo não mataram o boss na janela; ainda assim receberam3cada ao cumprir a participação. Não extrapolar a derrota deles em900s para impossibilidade no dia inteiro.

Os cenários conciliam dano coletivo comHP restante, limitam overkill, preservam uma única chave por recompensa/conta, um último hit e um broadcast. Lease expirada não gera presença retroativa; sair/retornar não duplica grants. Processamento limitado e JSON resume preservam o resultado.

## Calibragem de janela competitiva

| HP hipotético, não aplicado | Morte com20avançados | Grants competitivos antes de600s possíveis |
|---|---:|---:|
| 1.000.000.000 | 148.558s | 11 |
| 3.500.000.000 | 512.194s | 11 |
| 5.000.000.000 | 730.272s | 0 |

O cenário de5bilhões dura cerca de12min10s com esse grupo e permitiria qualificação antes da morte, mas **não é recomendação universal nem valor publicado no jogo**. Um iniciante ou população pequena teria outra dificuldade. A definição pública deve escolher uma janela de disputa, população esperada e composição; então fixar oHP na criação da edição com base em métricas anteriores/roster autorizado, nunca curar ou recalcularHP a cada login. Novos testes devem incluir baixa presença e variação de horários. A regra atual permite base após a derrota, então sua acessibilidade não depende de inflarHP.

## Ranking, último hit e concentração

As seis chegadas tardias receberam bônus de ranking sem600s, com poucos segundos de contribuição coletiva. Nenhuma tomou o último hit nesta amostra; não declarar exploit reproduzido de roubo do último hit. O contrato permite, porém,200+250para uma conta com dano positivo que seja a única elegível, mesmo sem base; teste dirigido verifica450nesse caso. O teto453inclui os3depois da qualificação. Mudar a exigência competitiva para600s ou criar janela de inscrição é uma decisão de design futura, não correção silenciosa nesta etapa. O teste tardio usa conhecimento posterior da morte determinística, sem representar taxa real de sucesso.

Na hipótese de10contas avançadas controladas pelo mesmo dono, o agrupamento recebeu630de1410Jade (44,68%). São10de20contas e perfis já desenvolvidos, não criação gratuita instantânea nem identificação de pessoas reais. Não prova que coalizão sempre ganhe o último hit ou vantagem proporcional. A base cresce3por conta elegível; sem identidade canônica e regras de conta/personagem, vários personagens/sessões podem virar risco de multiplicação. IP ou aparelho compartilhado não identifica dono. O sistema público precisa limitar grants pela conta autenticada/edição e medir abuso; este ensaio não implementa detector de contas alternativas.

## Uma edição global, um orçamento competitivo

Teto por edição derrotada com pelo menos10contribuintes elegíveis:3N+1100+250. Sem derrota não há ranking/último hit, e a base depende da participação real. Para menos de10contas, somar somente as posições preenchidas. Estes são tetos aritméticos com presença/derrota completas, não simulação de combate de1000pessoas, frequência real ou desempenho de servidor.

| Contas qualificadas | Jade/dia, uma edição global | Coortes independentes de20 | Jade/dia se cada coorte pagar tudo |
|---|---:|---:|---:|
| 20 | 1410 | 1 | 1410 |
| 100 | 1650 | 5 | 7050 |
| 1000 | 4350 | 50 | 70500 |
| 5000 | 16350 | 250 | 352500 |

Com1000contas, dividir em50bosses privados e pagar uma escada em cada sala elevaria o teto de4350para70500Jade/dia. Isso não é sharding global correto. Não publicar a fonte R8 como global apenas removendo o limite de20.

Requisitos do consumidor global futuro:

- Uma identidade de edição e política congelada por dia civil de Brasília; uma autoridade deHP, placar, corte de overkill e ordem de golpes, compartilhada entre instâncias. Separar trabalho de processamento preservando o mesmo orçamento de prêmios.
- Unicidade de grant por edição/conta/tipo e um broadcast global de último hit, com carteira/ledger/outbox na mesma transação. As PKs atuais incluemrealm_id; protegem cada ensaio privado, não um conjunto global de salas. O mesmo run não pode entrar em duas coortes atuais, mas essa guarda privada não resolve a futura coordenação de contas públicas.
- Ranking canônico único; manter top10de200a20 e último hit250 definidos pelo usuário. Ordenação estável de empates porUUID deve ser pública e testada; não prometer loteria justa de desempate por ser UUID.
- Estado de trabalho limitado e histórico durável separados. O snapshot atual limita grants a10000: reutilizá-lo sem retenção para milhares de contas/dias falharia. Arquivar o histórico sem perder dedupe, recibos, grants e reconciliação; não apagar prêmios para liberar memória.
- Autenticação, DTO sem seed/secreto, leases autoritativas e exclusividade de atividade por conta; nenhuma contribuição aceita do cliente. Validar concorrência entre instâncias, fronteira de dia, reconexão, rollback e capacidade com o volume escolhido antes do corte.

## Jade versus fortalecimento extremo

Usamos o lendário+15 realmente adquirido na V10 (machado nível76) apenas como base matemática. Uma sequência perfeita de+16a+20custaria10Jade. Considerando sucessos e regressões com proteção a partir de+8, a expectativa matemática de custo para atingir+20a partir de+15é aproximadamente2864.5Jade, 17978.8pergaminhos e18304.7tentativas, com Coin/materiais ilimitados. A cauda é pesada; uma média não descreve mediana/P95 nem o prazo de um jogador real.

Dividir a expectativa de Jade por3/dia dá uma escala de orçamento de954.8dias; por453/dia,6.3dias. Esses quocientes **não são datas de conclusão** e453/dia não é garantido nem repetível para todos. A proteção também é um limitador forte:30/semana não deve ser tratada como oferta ilimitada. A análise R5 anterior possui trajetórias sintéticas com sorte/caudas, mas começa com lendário pronto e recursos ilimitados; não substitui aquisição/refino/Jade acoplados. Não usar esta etapa para certificar raridade+20, liberar loja de proteção ou afirmar pay-to-win aprovado.

As cinco cotações superiores continuam available=false. A meta de nível máximo90–120dias daV10 permanece intacta; não exige que+20esteja pronto nessa data.

## Decisões e próximos passos

1. Preservar valores de recompensa e runtime atuais; não ativar fonte pública nem+16–20.
2. Implementar a próxima fase de consumidores autenticados respeitando a autoridade de edição/conta, antes de expor boss/ranking/ledger públicos. O projeto de contrato global acima é requisito, não serviço entregue.
3. Definir janela competitiva e revalidarHP por população/horário; decidir explicitamente se ranking/último hit exigem presença adicional. Manter a participação acessível.
4. Revalidar aquisição de lendário, proteção gratuita e custo+16–20 em coortes acopladas com Jade real do mesmo evento. Preservar censura e comparar concentração. Permanecem os bloqueios V11 deCoin/mercado e Força tardia.
5. Executar capacidade/retencão, corte/backup/rollback e playtest gratuito; somente depois revisar ativação. Monetização fica para o final.

## Validação

Check local completo passou (168testes,125PG omitidos por ausência de banco). Quatro testes Node novos cobrem orçamento único versus coortes, concentração por dono sem inventar enforcement, rejeição de duplicação/dano adulterado, ranking antes da base e lease ausente. Auditoria integral reproduzível, fingerprints V10/V11 preservados; CI completa, PostgreSQL, Windows e browser em validação. A conclusão econômica permanece populationApproved=false/activationReady=false.
