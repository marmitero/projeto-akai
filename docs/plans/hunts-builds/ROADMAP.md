# Roadmap proposto — reforma de progressão

18/10/2026. **R1 executada após autorização para validar e implementar somente se passar. A candidata foi reprovada; R2 não foi iniciada.** Resultados e correções em [R1 — validação](r1/VALIDATION_REPORT.md). A publicação desta análise não ativa a nova economia.

[Proposta completa](PROPOSAL.md) · [Referências](REFERENCES.md) · [Modelo](CURVE_MODEL.md).

| Etapa | Entrega futura | Dependências | Gate de saída | Complexidade |
|---|---|---|---|---|
| R0 — Pesquisa e proposta | Consolidar decisões, candidatos, análise matemática e este roadmap; publicar documentação | Instrução atual | Fontes verificadas, regras/exemplos/propostas separados, nenhuma alteração de runtime | Concluída nesta etapa documental |
| R1 — Modelo integrado | Simular conta, tempo de farm, builds, aquisição de equipamento/material/jade/pergaminho, fortalecimento e mercado | Autorização posterior; proposta R0 | Sem bloqueio de entrada; custo acumulado/cauda conhecidos; fonte renovável de lendários; metas de escassez testáveis; opções de proteção pagas/gratuitas comparadas | Alta |
| R2 — Contratos e ensaio de migração | Especificar nova versão de snapshot/config, atividades, dano, atributos, instância de refino e compensação | R1 e política de migração aceita | Backups reais, ensaio repetido idempotente, rollback de dados, preservação de IDs/saldos e destino de itens antigos incompatíveis definido | Alta |
| R3 — Combate e builds | AGI dinâmica, Força/VIT, acerto/crítico, dano físico/mágico, orçamentos, redistribuição e interface | R1/R2 |5APS máximo após todos os bônus; mesmo resultado por delta/reconexão/FPS; builds comparadas com igual orçamento; DefM com inimigo mágico comum funcional | Alta |
| R4 — Hunts e repetição | Contextos de torre/carvão/ferro/ouro, progresso independente, farm de andares concluídos não bosses, parallax por atividade | R2/R3 | Uma fonte ativa; hierarquia por faixa; carvão/ferro acessíveis sem sua própria melhoria; tabelas de recompensa isoladas; boss concluído não repetível | Alta |
| R5 — Fortalecimento e proteção não comercial | Faixas de recursos/raridade, chances, manutenção/regressão/quebra, uso explícito de pergaminho e fontes gratuitas | R1/R2/R4 | UI de probabilidades/consequências, custo e recurso atômicos, nenhum reroll/replay; proteção muda quebra em−1; mercado não altera item listado | Alta |
| R6 — Economia e migração final | Ajustar drops renováveis, descarte/forja, atributos porCoin/marcos, aposentar minas/clique e converter investimentos | R2–R5 | Corte único sem renda dupla, compensações únicas, mercado/ledger reconciliados, backups/rollback ensaiados, campanha viável sem+20 | Alta |
| R7 — Offline, consumidor de stats e desempenho | Farm offline limitado, agenda altaASPD, agrupamento visual, compatibilidade com arena/eventos/rankings | R3–R6 | Sem144.000eventos por conta a cada leitura; sem recompensa fora da atividade; limites de animação/DOM estáveis; nenhum stat comprado sem efeito no modo declarado | Alta |
| R8 — Bosses e jade | Etapa própria para revisar bosses e finalizar boss global diário/fonte exclusiva de jade | Autorização da etapa dos bosses; R3/R6 | Participação justa, horário/eligibilidade/grants únicos, oferta de jade simulada, repetição/ausência sem abuso | Alta; escopo separado |
| R9 — Playtest consolidado e comercialização futura | Ajustes com métricas; lojaRuby de proteção e integrações comerciais somente na fase final | R1–R8, playtest e gates externos existentes | Preços/limites/renda gratuita/risco econômico aceitos, métricas por coorte e retorno seguro, integrações/sandbox/políticas validadas quando aplicáveis | Alta; monetização segue adiada |

R3 e R4 precisam de trabalho incremental em branch, mantendo o jogo antigo jogável. A chave de ativação só muda quando o conjunto mínimo de fontes/consumos/migração está pronto; não liberar a nova AGI contra uma economia ainda balanceada para1APS sem ajuste. Se R5 preceder a fonte definitiva de jade, +16–+20 fica desativado/indisponível em produção. Não substituir a etapa específica de bosses por mudanças silenciosas em R3.

## Critérios de aceite transversais

- Fonte de drop explícita: torre comum geraCoin/XP/equipamento/pergaminho elegível; hunts sóXP+material; jade de boss global. Nenhum descarte cria material exclusivo por acidente.
- Conta inicial vence/farma até acessar ferro/carvão sem depender de sorte de equipamento ou comprarRuby; marcos não exigem o próprio recurso para desbloquear sua fonte.
- Todos os andares concluídos não boss podem ser selecionados; abandono/repetição respeitam agenda, cura e transições; não repetir first-clear.
- Atacantes rápidos e críticos não duplicam grants; chances de acerto/crítico têm limites e ordem inequívoca. Dano mágico possui casos reais antes de cobrarDefM.
- +1–3 não perde nível ao falhar; demais faixas seguem destino; raro não passa+15; proteção não aumenta chance e preserva item com−1na falha. Todos os custos persistem uma única vez.
- Ensaiar falha com item equipado e perda deHP máximo, item em escrow, duas sessões concorrentes, resposta perdida, interrupção e troca de dono.
- Simular aquisição/consumo integral, incluindo ausência, jogadores sem compra, disponibilidade de jade, eventos e famílias/slots úteis; registrar censura e caudas, não selecionar só os vencedores.
- Verificar modelos de build ofensiva/veloz/crítica/resistente contra encontros adequados, com igual orçamento e qualidade; não exigir uma única build para todas as atividades.
- Preservar isolamento local/online e autoridade no servidor. Dano, drops, relógio e chance não vêm de valores livres do cliente.
- Executar checks relevantes e smokes Windows/dev/build/online nas etapas de código; salvar evidências e publicar ao terminar. Falhas conhecidas ficam em checkpoint remoto até correção, sem integrar à main.

## Decisões que continuam abertas

1. Um combate ativo e farm offline8h são propostas, não decisões explícitas do usuário.
2. Orçamento/limites de treino, custo de redistribuição, evasão e orçamento deAGI nos itens precisam do modelo integrado.
3. Tabela de sucesso e quebra, custos e30pergaminhos gratuitos/semana são candidatos; o modelo atual só resolve a trajetória do refino.
4. Taxa/andar de lendário renovável e de pergaminho, oferta de jade e regra do boss global são candidatos ou pendências.
5. PreçoRuby, limite da loja e vinculação dos pergaminhos exigem análise de vantagem paga e contas alternativas; não ativar agora.
6. Política de itens antigos>+15não lendários e conversão de minas/clique/afixos exige decisão explícita antes da migração.

Sem cronograma de calendário contratado. A sequência é por dependências e evidência; não por prometer número de dias sem implementação e playtest. Próximo trabalho: R1.1, corrigir proteção/XP/fontes e fechar entradas indefinidas, preservando os gates e usando seed nova. R2 continua condicionada à aprovação integral; nenhuma implementação de gameplay começou nesta validação.
