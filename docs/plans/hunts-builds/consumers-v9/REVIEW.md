# Revisão da etapa V9

21/10/2026. Revisão solicitada após a publicação da PR18, base main `db4c3b104471cfd23c8f7482ac5260b7a2547169`. Escopo: coordenador integrado, projeções shared/SQL, interface, persistência, testes, coortes e limites declarados. Economia real, monetização e +16–20 permanecem desligados.

## Falhas e lacunas corrigidas

| Área | Problema encontrado | Correção e evidência |
|---|---|---|
| Ausência explícita | Intervalos até30s passavam pelo inferidor do servidor e eram tratados como atividade online, permitindo loot em andar ainda não concluído | O coordenador usa início/drenagem explícitos do R7 para toda ausência solicitada. Regressão10s sem andar concluído não mata, não concede loot e avança apenas o cursor. Retomada em fatias após JSON/reload compara ganhos e quota com processamento integral |
| Mercado/relógio | Avançar o relógio não expirava anúncios/ofertas; a interface podia continuar mostrando compra de anúncio vencido | Sincroniza o book com o relógio processado, inclusive quando existe backlog, e normaliza o book de saves anteriores na carga sem avançar tempo. Regressão73h exige expiração e resgate único; browser cobre80h e oferta expirada |
| Saída de evento | `leave` fora de um evento limpava o encontro econômico e reiniciava caminhada/HP | Só entrada ou saída de participação realmente ativa pode limpar o encontro. Regressão preserva exatamente a batalha em andamento ao sair sem evento |
| Progresso semanal | A projeção mostrava progresso da semana anterior após mudar a edição | Deriva progresso somente da semana da snapshot; mantém histórico e pergaminhos ganhos intactos. Teste cobre registro antigo sem reescrever estado |
| Consistência do save | O coordenador aceitava cursores de economia/book à frente do relógio da coorte | Validação rejeita relógio incoerente; loader verifica o roster esperado da prévia e evita renderizar personagem inexistente |
| Ofertas na interface | Motor e projeção tinham ofertas, mas a carteira integrada não oferecia botões de envio/retirada/recusa/aceite | Fluxo completo na aba integrada, com preço informado, histórico de preço/taxa/líquido e preservação da mesma carteira. Browser confere saldos e resgate após expiração |
| Clareza dos controles | Melhorias não mostravam custos; presença e saída podiam ser solicitadas fora de evento; ações incompatíveis apareciam disponíveis | Custos de atributos visíveis, controles de evento condicionados à participação, ações de gear/cofre condicionadas à localização e bloqueio de alterações durante evento/processamento. Sem alterar preços/chances |

Os três primeiros problemas foram reproduzidos antes da correção:3regressões falharam e os6testes existentes passaram. Após as correções,11testes shared de integração passam. O check local com os4primeiros casos novos passou164testes e pulou125dePostgreSQL; o11ºteste shared também passou. A evidência SQL e browser completa é registrada no fechamento abaixo.

## Validação e limite de conclusão

Coortes de entrada e tardias foram executadas novamente, com os mesmos resultados e sem alteração do JSON publicado:18/18entradas liberam carvão/ferro;12fixtures tardias distribuem1386Jade e conservam materiais/taxas. `audit-readiness` mantém `activationReady:false`. Não se aumentou renda, chance ou equipamento para fazer o ensaio passar.

Os consumidores de leitura continuam sem RNG/segredos/carteiras alheias; CLI usa snapshot SQL consistente e somente leitura. Não foi criada rota pública ou conversão de patrimônio. As validações completas dev/preview/Windows/PostgreSQL estão em andamento nesta branch; nenhuma falha conhecida será integrada à main.

**Pendente por escopo, não esquecido nesta revisão:** campanha adquirida90–120dias, liquidez/demanda/população global, consumidores sociais autenticados e corte/rollback/capacidade/playtest. São gates explícitos de ativação em [CAMPAIGN_GATE](CAMPAIGN_GATE.md); não são certificados por estes testes funcionais. O ensaio V9 não é uma ativação parcial das contas reais.
