# Fase 2 — resultado da liquidez adquirida

**Integridade do ensaio aprovada. Liquidez de população e equilíbrio econômico ainda não aprovados.** Economia real, +16–20 e monetização permanecem desativados. Esta etapa publica auditoria reproduzível; não altera imposto, taxa de anúncio ou recompensas do jogo.

## Evidência

Sete carteiras conquistadas em 120 dias na V10, reidentificadas reversivelmente para formar uma coorte privada. Duas alternativas independentes de produção por seis horas: só torre; ou carvão/ferro/ouro por três produtores, com quatro personagens na torre. Nunca somar as moedas das alternativas nem tratar os sete mundos originais como população acoplada. Hash da fonte do experimento: `54639e3c351a41e1cce8c42eacd4b56b7da4d6832db0def491aafc1b51b74e58`. Protocolo detalhado em [IMPLEMENTATION.md](IMPLEMENTATION.md); saldos, origem dos arquivos, itens comprados/resultados reais, taxas medidas, falhas e hashes finais em [results.json](results.json).

| Oferta | Preço | Anúncios | Itens vendidos | Materiais vendidos | Expirados/resgatados | Compras equipadas após refino real | Coin inicial retirado por taxas |
|---|---:|---:|---:|---:|---:|---:|---:|
| Só torre | 0.25× | 4 | 4 | 0 | 0 | 0 | 0.00044% |
| Só torre | 1× | 4 | 4 | 0 | 0 | 0 | 0.00060% |
| Só torre | 4× | 4 | 3 | 0 | 1 | 0 | 0.00101% |
| Oferta especializada | 0.25× | 19 | 2 | 17 | 0 | 1 | 0.00465% |
| Oferta especializada | 1× | 19 | 2 | 16 | 1 | 1 | 0.01286% |
| Oferta especializada | 4× | 19 | 2 | 0 | 17 | 0 | 0.00203% |

Os percentuais descrevem uma única observação finita do livro, sem reposição: **não são taxas diárias nem previsão de inflação**. Todos os fills são decisões síncronas da política; não medimos tempo até encontrar jogador real. Preço é multiplicador da referência de oportunidade, com piso da taxa; não representa valor empírico da comunidade. Oito cotações por nível são reserva hipotética, não garantia de completar refino em oito tentativas.

## Fontes, consumos e utilidade

Na oferta especializada a 1×: volume 130.047.716,131 Coin; anúncios queimam 1.900.000 Coin e imposto 13.004.771,622 Coin. Os refinos posteriores gastam 3.830.105 Coin, com recursos realmente debitados. O preparo de seis horas criou 275.185.375,921 Coin por combate, além dos materiais dos produtores. As taxas desse pequeno livro não demonstram absorção da emissão nem redução sustentável do estoque. Alterar só a taxa fixa de anúncio não é uma solução demonstrada.

A especialização fornece material negociável; sem ela, os personagens retêm as poucas reservas para seus próprios refinos e não há oferta material. Na oferta especializada o preço alto reduz drasticamente as compras. A comparação confirma sensibilidade à política/estoque, não uma população saudável. Concentração de volume por comprador/vendedor e maior carteira final estão no JSON, com apenas sete membros — não estimam concentração real ou multicontas.

Avaliar equipamento pelo potencial no mesmo refino evita descartar toda base +0 frente a um item já refinado. Porém comprar potencial não equivale a equipar uma melhoria: são necessários  Coin, carvão/ferro/ouro, proteção e sucessos reais. O ensaio agora compra primeiro os itens e depois tenta financiar o plano específico deles, sem equipar uma promessa. O relatório conserva os itens que não atingiram a utilidade projetada.

Força permanece sem vencer o boss 1000 nos três replays antes/depois em todos os cenários. Isso mantém a pendência do andar 979 da V10; não prova que todas as builds físicas ou armas de duas mãos sejam inviáveis. Outros recursos/refinos podem melhorar sobrevivência sem resolver o encontro. Não conceder arma lendária +15 para declarar o gate aprovado.

A taxa de 100 mil Coin é alcançada no primeiro saldo diário observado entre os dias 1–3 destas campanhas (rotinas diferentes). Isso não mede o instante de acesso nem certifica entrada nas primeiras horas. O benchmark antigo de nível 10 continua mostrando peso elevado da taxa. Não aumentar custo inicial para tentar resolver excesso de Coin de contas avançadas.

## Decisões e sequência

1. Preservar por enquanto taxa de 100 mil Coin/imposto de 10%, com caráter provisório; não ativar mercado real v2 baseado nesta amostra.
2. Calibrar emissão/consumos tardios de Coin em candidatos versionados, preservando acesso inicial. Medir Coin acumulado e saldo por dia, custo/tempo de aquisição útil e consumo recorrente; taxa de venda depende de giro efetivo, não do estoque total. Não escolher novo multiplicador arbitrário nem introduzir um consumo obrigatório sem ensaiar.
3. Rever seleção de base/refino e orçamento de materiais/proteção da política, comparar armas físicas e reproduzir conquistas reais. Reexecutar a campanha de 90–120 dias e os dois cenários de mercado se o runtime/custos/drops mudarem.
4. Ampliar coorte acoplada com iniciantes, intermediários, produtores e compradores; múltiplas janelas, relistagem paga, estoque não vendido, orçamentos, ausências, concentração e critérios de utilidade/tempo explicitamente aceitos. Estes cenários finais não substituem esse gate.
5. A fase 3 seguinte analisa população do boss global/Jade, ranking, último hit e concentração. Continuam obrigatórios consumidores autenticados, capacidade/corte/backup/rollback e playtest gratuito antes de ativação. Monetização por último.

## Validação

Check local completo passou: 168 testes executados e 125 testes PostgreSQL omitidos por ausência de banco local; os 293 testes SQL/shared completos dependem da CI. Testes Node de campanha/integridade e quatro regressões novas verificam remapeamento reversível, conservação com escrow, rejeição de moeda/qualidade/proteção adulteradas, utilidade/escudo/nível e planejamento do refino +0 sem proteção indevida. CI refaz o relatório integral com igualdade exata e a campanha V10 original com alvo obrigatório. A validação remota foi concluída com sucesso em 22/10/2026 UTC.

### Fechamento remoto

- Publicação: [PR #21](https://github.com/marmitero/projeto-akai/pull/21).
- Candidato validado: `bf4e890d679d58dd3d38c1e588c4c528c1002c94`; árvore `54c15a26bfd994df15771a34fdee417ac1bfd504`.
- [CI 39696622200](https://github.com/marmitero/projeto-akai/actions/runs/39696622200) aprovada: 293 testes em 34 arquivos com PostgreSQL 16, sem skips; mais seis testes de campanha, um de integridade dos arquivos, quatro regressões de liquidez e quatro de rede mobile. Auditorias econômicas, replay exato V11, campanha V10 original, dev/build/online/mobile aprovados.
- [Windows 39696622199](https://github.com/marmitero/projeto-akai/actions/runs/39696622199) aprovada: preparação por BAT com Node portátil, dependências novas/cache, execução local e LAN mobile. Não é playtest em Android físico.
- A conferência de recursos passou nos seis cenários: 50 trocas e 572 tentativas de refino pagas no total. As alternativas são independentes e não devem ter seus saldos somados.
- O fechamento posterior altera apenas AI_STATE.md, IMPLEMENTATION.md e este relatório; scripts, testes, JSON, runtime e fontes V10 permanecem exatamente como no candidato validado.

Aprovação técnica da publicação não remove os bloqueios econômicos descritos acima.
