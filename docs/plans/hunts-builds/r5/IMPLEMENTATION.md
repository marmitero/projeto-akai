# R5 — fortalecimento e proteção

20/10/2026. Nova economia ainda desativada. **Mais → Laboratório de refino** permite simular tentativas com item/recursos de cenário, sem alterar a conta. A forja antiga não foi substituída, nenhum saldo real foi debitado e nenhum pergaminho novo foi concedido nesta etapa.

## Regras e implementação

`refinement-v5.ts` oferece cotação, resolução matemática e transição de snapshot em cópia. Destino é sempre refino atual+1. Sucessos, custos e quebras seguem o contrato da candidata R1.1; não há failstack, pity, bônus de Sorte ou compra de chance.

| Destino | Sucesso | Falha sem proteção |
|---|---|---|
| +1 / +2 / +3 | 98 / 95 / 92% | Mantém nível |
| +4 / +5 / +6 / +7 | 90 / 85 / 80 / 75% | Reduz 1 nível |
| +8 / +9 / +10 / +11 / +12 | 70 / 65 / 60 / 55 / 50% | Quebra condicional de 5 / 8 / 12 / 18 / 25%; restante reduz 1 nível |
| +13 / +14 / +15 | 48 / 46 / 44% | Quebra |
| +16 / +17 / +18 / +19 / +20 | 32 / 27 / 22 / 17 / 12% | Quebra; somente lendário; execução bloqueada até fonte definitiva de Jade |

Proteção disponível a partir do destino +8, consome 1 inclusive no sucesso, não altera a chance e converte qualquer falha em −1. Risco de quebra por tentativa é (1−sucesso)×quebra condicional; a interface diferencia esse risco da probabilidade condicional após falhar. Custos são pagos também em manutenção, regressão e quebra. Quebra remove exatamente a instância e limpa seu slot equipado, sem devolver material, pergaminho ou criar substituto.

### Custos exatos

v=(1+(nívelItem−1)/25)×multiplicador de raridade: 1/1,15/1,35/1,75/2,25. Coin=ceil(100v×1,32^(n−1)), carvão=ceil(2v×1,25^(n−1)), ferro desde +6=ceil(10v×1,25^(n−6)), ouro desde +11=ceil(2v×1,25^(n−11)), Jade desde +16=ceil(0,1v×1,25^(n−16)). A partir de +11 multiplicar o resultado já arredondado por Coin 4/carvão 4/ferro 8/ouro 4/Jade 1, conforme R1.1. Usa BigInt racional e retorna milésimos inteiros; sem potência fracionária ou preço float em runtime. Multiplicador de receita épico 1,75 não é o multiplicador de atributo épico 1,7.

Transição valida revisão esperada, item presente na mochila, raridade, faixa e todos os saldos/pergaminhos antes de avançar RNG ou produzir débito. Cofre/instância ausente são recusados. Seed xorshift32 privada e amostragem inteira por rejeição, sem viés de módulo; a simulação usa seed pública somente porque não gera riqueza real. Resultado é determinístico e retorna seed seguinte e recibo. Não é RNG criptográfico.

**R6 deve manter seed e snapshot privados e confirmar comando idempotente, revisão, saldo, inventário, seed, ledger, recibo e outbox na mesma transação.** Não aceitar seed ou resultado do cliente. Retry deve recuperar recibo salvo, sem novo sorteio. Revisão pura não é trava distribuída. Itens em escrow ficam fora da mochila; revalidar anúncio/locks sob transação para impedir mutação de peça listada. O módulo não torna o mercado legado compatível por si só.

### Fontes gratuitas preparadas

`protection-v5.ts` gera planos com chaves estáveis por conta+morte ou semana+marco. Torre comum >=100, boss excluído, 20 chances por milhão, somente morte confirmada, nunca hunts. Sorte/buffs não são parâmetros. Registrar rolagem junto da morte; offline não sorteia de novo na coleta.

Evento: seis marcos de 300.000ms qualificados, cinco pergaminhos por marco, teto 30/semana. Input é contador cumulativo autoritativo; marcos já entregues não geram outro plano. Semana recebida é a segunda-feira da edição de Brasília, validada como data real. R6/R8 precisam calcular edição pelo fuso, liquidar presença válida e persistir contador+chaves únicas+saldo atomicamente. Repetir um plano tem as mesmas chaves e não equivale a um novo prêmio; não há endpoint público ou saldo gratuito a partir de tempo informado pelo cliente. Evento jogável e grants reais serão integrados depois. Loja Ruby permanece desligada.

## Laboratório

Escolha raridade, nível, refino atual e seed. Alterar campos ou usar Recriar cenário reinicia explicitamente a fixture; tentativas consecutivas avançam a seed, debitam carteira simulada e preservam a trajetória. Histórico limitado a 30 linhas. Pergaminho indisponível antes de +8. Mostra chance/custos, ATQ/HP antes e depois de sucesso e consequência da falha; +16–20 pode ser inspecionado em lendário, mas o botão não executa essa faixa. Não representa item adquirido nem certificado de raridade. Batalha antiga pode continuar em segundo plano como nos laboratórios R3/R4.

R5 não liga mineração nova, migração, drops de equipamento, mercado v2, XP ou eventos reais. Próximo R6: integrar fontes/consumos/migração/ledger; R7: offline e consumidores; R8: bosses/Jade. +20 é prestígio opcional, não requisito da campanha. Prazo de 90–120 dias e raridade com nova distribuição competitiva de Jade ainda exigem validação acoplada.

## Evidências e sensibilidade

Localmente: tipos/assets/build aprovados, 119 testes passaram e 97 testes PostgreSQL foram pulados (216 no total); os sete testes R5 foram repetidos após ajuste do teto do contador semanal. Laboratório dev/preview passou em 320/390/844/1280px, incluindo sucesso protegido com consumo de pergaminho, manutenção, regressão, quebra, seed/recriação determinística, bloqueios de raridade/Jade, carteira real preservada e cinco ciclos de abrir/fechar sem duplicar dialog/canvas. Captura 390×844 revisada. Android físico não certificado.

[Análise de sensibilidade](audit-results.json): quatro cenários de 512 trajetórias/120 dias, com lendário 100 já possuído no dia 1, Coin/materiais ilimitados, tentativas baixas livres, proteção sempre em +8 ou mais, orçamento semanal completo disponível na segunda e **sem drop de pergaminhos da torre**. Não são coortes da campanha nem aprovação de produção. Com 3 Jade/dia e 30 pergaminhos/semana, 14/512 chegaram a +20 (2,73%); com 40/semana, 21/512 (4,10%). Com 453 Jade/dia, 14/512 e 22/512 (2,73%/4,30%). Nesse recorte o pergaminho limita mais que a Jade; aquisição, pergaminhos da torre, mercado, alts e concentração de equipamento continuam pendentes. Não reutilizar 1,67% histórico nem esses percentuais como raridade definitiva.

Cadeia de Markov de suprimento ilimitado e proteção contínua em +8–20: 18.375,11 tentativas esperadas de +0 a +20, com cauda longa. Não significa que um jogador terá 18 mil tentativas disponíveis nem 18 mil dias; a conta precisa adquirir peças e recursos e pode atingir antes ou muito depois da média. Executor da conta continua bloqueando +16–20; só o resolvedor matemático é usado na sensibilidade da faixa alta. Auditoria compara tabelas do runtime com os contratos e usa seed determinística, sem modificar chances para atingir uma taxa desejada.

Verificação numérica adicional: [cost-audit.json](cost-audit.json) compara 8.000 cotações legais/40.000 preços com avaliação independente em Python Fraction: todos iguais à fórmula racional. Em 79 preços, o modelo Python float histórico cobrava acima do teto matemático por erro binário (ex.: Coin de item comum nível 4/destino +1: 112 exatos versus 113 no float; diferenças de uma unidade antes do multiplicador tardio). Correção explícita para aritmética exata, não mudança de curva para aprovar teste. Coortes antigas com floats não são prova de paridade de centavo desta implementação.

Na integração, liquidar a atividade anterior antes de trocar equipamento/stats e conservar o snapshot congelado do encontro, sem cura/reinício gratuito em cada tentativa. O gerador do laboratório é determinístico para teste; o adaptador autoritativo precisa de entropia criptográfica privada por comando ou algoritmo auditado antes do mercado v2. Seed pública ou sucessão xorshift do navegador não é fonte de sorte de uma conta real.

## Fechamento validado

Runtime `7f1a001d37682afdf0f875e286913f73f35f3bc1`, árvore `e1e77f205064d6a9c213a388f21d3f37bd1557bf`. [CI principal](https://github.com/marmitero/projeto-akai/actions/runs/39456982011) e [Windows](https://github.com/marmitero/projeto-akai/actions/runs/39456982062) aprovadas: **216 testes em 24 arquivos com PostgreSQL16, sem skips**, auditorias R2–R5, laboratório de refino dev/preview e todas regressões local/online/chat/mobile/bestiário/comunidade/mercado/loja. Windows validou os iniciadores BAT local e mobile; não certifica Android físico nem Docker Desktop no Windows.

[PR12](https://github.com/marmitero/projeto-akai/pull/12). Fechamento posterior somente em documentação/evidências: relatório, cost-audit.json e AI_STATE; cliente, servidor, tabelas, scripts e testes permanecem iguais ao runtime validado. Publicação autorizada pela regra permanente. R5 é módulo/laboratório: não houve migração, grants gratuitos reais, gasto real, ativação da economia ou loja. Próxima etapa R6, integração transacional das fontes/consumos e migração; R7 offline, R8 bosses/Jade. Fonte definitiva de Jade ainda bloqueia execução+16–20.
