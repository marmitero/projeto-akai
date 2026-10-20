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

v=(1+(nívelItem−1)/25)×multiplicador de raridade: 1/1,15/1,35/1,75/2,25. Coin=ceil(100v×1,32^(n−1)), carvão=ceil(2v×1,25^(n−1)), ferro desde +6=ceil(10v×1,25^(n−6)), ouro desde +11=ceil(2v×1,25^(n−11)), Jade desde +16=ceil(0,1v×1,25^(n−16)). A partir de +11 multiplicar o resultado já arredondado por Coin4/carvão4/ferro8/ouro4/Jade1, conforme R1.1. Usa BigInt racional e retorna milésimos inteiros; sem potência fracionária ou preço float em runtime. Multiplicador de receita épico1,75 não é o multiplicador de atributo épico1,7.

Transição valida revisão esperada, item presente na mochila, raridade, faixa e todos os saldos/pergaminhos antes de avançar RNG ou produzir débito. Cofre/instância ausente são recusados. Seed xorshift32 privada e amostragem inteira por rejeição, sem viés de módulo; a simulação usa seed pública somente porque não gera riqueza real. Resultado é determinístico e retorna seed seguinte e recibo. Não é RNG criptográfico.

**R6 deve manter seed e snapshot privados e confirmar comando idempotente, revisão, saldo, inventário, seed, ledger, recibo e outbox na mesma transação.** Não aceitar seed ou resultado do cliente. Retry deve recuperar recibo salvo, sem novo sorteio. Revisão pura não é trava distribuída. Itens em escrow ficam fora da mochila; revalidar anúncio/locks sob transação para impedir mutação de peça listada. O módulo não torna o mercado legado compatível por si só.

### Fontes gratuitas preparadas

`protection-v5.ts` gera planos com chaves estáveis por conta+morte ou semana+marco. Torre comum >=100, boss excluído, 20 chances por milhão, somente morte confirmada, nunca hunts. Sorte/buffs não são parâmetros. Registrar rolagem junto da morte; offline não sorteia de novo na coleta.

Evento: seis marcos de 300.000ms qualificados, cinco pergaminhos por marco, teto30/semana. Input é contador cumulativo autoritativo; marcos já entregues não geram outro plano. Semana recebida é a segunda-feira da edição de Brasília, validada como data real. R6/R8 precisam calcular edição pelo fuso, liquidar presença válida e persistir contador+chaves únicas+saldo atomicamente. Repetir um plano tem as mesmas chaves e não equivale a um novo prêmio; não há endpoint público ou saldo gratuito a partir de tempo informado pelo cliente. Evento jogável e grants reais serão integrados depois. Loja Ruby permanece desligada.

## Laboratório

Escolha raridade, nível, refino atual e seed. Alterar campos ou usar Recriar cenário reinicia explicitamente a fixture; tentativas consecutivas avançam a seed, debitam carteira simulada e preservam a trajetória. Histórico limitado a30 linhas. Pergaminho indisponível antes de +8. Mostra chance/custos, ATQ/HP antes e depois de sucesso e consequência da falha; +16–20 pode ser inspecionado em lendário, mas o botão não executa essa faixa. Não representa item adquirido nem certificado de raridade. Batalha antiga pode continuar em segundo plano como nos laboratórios R3/R4.

R5 não liga mineração nova, migração, drops de equipamento, mercado v2, XP ou eventos reais. Próximo R6: integrar fontes/consumos/migração/ledger; R7: offline e consumidores; R8: bosses/Jade. +20 é prestígio opcional, não requisito da campanha. Prazo90–120dias e raridade com nova distribuição competitiva de Jade ainda exigem validação acoplada.
