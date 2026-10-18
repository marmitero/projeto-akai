"""Render the evidence report from committed simulator outputs."""
import json,re
import model as m
r=json.loads((m.DATA/'results.json').read_text());audit=json.loads((m.DATA/'audit-results.json').read_text());probes=json.loads((m.DATA/'probes.json').read_text());p={x['name']:x for x in r['profiles']}
pct=lambda x:f'{100*x:.1f}%'
rows='\n'.join(f"| {x['name']} | {x['n']} | {pct(x['main100by30'])} | {pct(x['huntsBy30'])} | {pct(x['legendary'])} | {pct(x['any20'])} |" for x in r['profiles'])
gates='\n'.join(f"| {k} | {'PASSOU no modelo' if v else 'REPROVADO / pendente'} |" for k,v in r['gates'].items())
sens='\n'.join(f"| {x['scrollBudget']} | {pct(x['any20'])} | {pct(x['confidence95'][0])}–{pct(x['confidence95'][1])} |" for x in probes['protectionBudgetSensitivity'])
text=f'''# R1 — Validação da economia proposta

18/10/2026. **Resultado: NÃO APROVADA. Implementação R2 não iniciada.** O pedido condiciona a implementação à aprovação. Esta entrega publica ferramentas, resultados e impedimentos; nenhuma regra nova está ativa no jogo. Bosses e monetização continuam em etapas próprias.

## Método e critérios

Critérios fixados em `criteria.json`, commit local ba8367a, antes da execução das coortes. O checkpoint remoto preserva o modelo. Python3.12.14, biblioteca padrão; seeds, tamanhos e hashes em `results.json`. Fontes de conteúdo: definições publicadas de1000andares e encontros do bestiário comum (HP/ataque/intervalo/recompensa por papel),14itens e raridades. Receitas propostas não se confundem com as atuais.

Foram simuladas **{sum(x['n'] for x in r['profiles']):,} trajetórias de contas de90dias**, incluindo cinco perfis de contas novas (120por perfil) e sete cenários de contas maduras (300por cenário). Seeds compartilhadas nos comparativos; seis preferências de build; holdout separado para crescimento reduzido dos materiais. Perfis novos começam sem saldos e apenas espada comum inicial. Ensaios adicionais retiram também essa espada. A disponibilidade de equipamento, Coins, tempo, materiais, jade e pergaminhos é finita no modelo. Não há reposição gratuita de itens destruídos.

Conta madura é **fixture de estresse**: nível1000, torres concluídas, nove equipamentos nível100, arma lendária, demais raros, sem refino; saldos iniciais registrados. Ela testa escassez após elegibilidade, não prova que alguém alcança esse estado organicamente. Nenhum participante travado é retirado do denominador.

Combate integrado usa dano esperado por acerto/crítico, agenda por inimigo/onda,25%de reserva deHP e limite de30sde boss. Não equivale a MonteCarlo completo do combate nem ao motor futuro. Há prova separada de5000encontros iniciais com sorteios individuais; sobrevivência {pct(audit['earlyCombat']['survival'])}, limitada ao primeiro andar. Hipóteses: divisão física/mágica, evasão, defesa de equipamento em ambos os tipos, orçamentoAGI e descarte porCoin; afixos, pets, tônicos e inventário futuro ainda precisam de contrato.

A política do agente reserva uma oportunidade a cada quatro blocos para avançar a torre e procura as hunts iniciais antes de perseguir compras opcionais. Um piloto mostrou que priorizar exclusivamente contas de treinamento prendia o bot no farm; esse defeito de estratégia foi corrigido antes da amostra de aceite. Isso não é prova de equilíbrio humano.

## Gates

| Critério | Resultado |
|---|---|
{gates}

A conservação passa apenas no escopo simulado. Completude continua reprovada: preçosRuby, fonte definitiva de jade, contratos de migração, afixos/consumos antigos e comportamento de mercado não estão definidos/validados. Um gate numérico favorável não remove essa pendência.

## Resultados das coortes

| Perfil | Contas | Torre100 até30d | Hunts carvão5/ferro5/ouro1 até30d | Algum lendário até90d | Algum +20 até90d |
|---|---:|---:|---:|---:|---:|
{rows}

A coluna lendário inclui qualquer slot, não garante arma ou equipamento ideal. Na fixture madura a base já existe no dia0. O critério renovável usa elegibilidade e aquisição de uma base até90dias; não representa disponibilidade de toda coleção. `first20Wilson` registra intervalo95% das proporções, não uma garantia sobre o jogo real. O simulador fortalece a arma: atingir +20 nela já conta como possuir algum +20; não modela otimização simultânea de nove slots.

### Escassez e proteção

Meta candidata anterior:1%–3%das contas maduras com algum+20 em90dias. Resultado gratuito: **{pct(p['mature_free']['any20'])}** (IC95% {pct(p['mature_free']['first20Wilson'][0])}–{pct(p['mature_free']['first20Wilson'][1])}); com dez pergaminhos semanais hipoteticamente pagos: **{pct(p['mature_paid']['any20'])}**. Diferença de {100*(p['mature_paid']['any20']-p['mature_free']['any20']):.1f}pontos percentuais. O gate estreito de vantagem paga não substitui preços reais ou avaliação comercial.

A hipótese de30pergaminhos gratuitos/semana é incompatível com a raridade pretendida neste candidato. A média analítica de708tentativas não prova dificuldade suficiente: existe uma cauda relevante que consegue muito antes da média. Com390pergaminhos e recursos ilimitados, o ensaio separado encontra {pct(r['protectionStress'][2]['any20'])}de sucesso. Esse ensaio é teto de acessibilidade, não previsão de conta nova.

Diagnóstico com20.000trajetórias por orçamento, seed nova, sem limites nos outros recursos:

| Pergaminhos totais | +20 | IC95% |
|---|---:|---:|
{sens}

Cerca de40pergaminhos **totais por90dias**, nesse teto isolado, aproxima a meta. Isso NÃO aprova reduzir eventos para esse valor: drops, compras, estoque antigo, alts, comércio, múltiplas bases e jade alteram o total. A oferta precisa ser recalculada de todas as fontes juntas, preservando progressão divertida até+15. Outra alternativa a testar é uma curva mais difícil de+16a+20; ela deve preservar exatamente as regras de falha solicitadas e revalidar custos/caudas. Não mudar chances silenciosamente nem usar a média como critério.

### Sensibilidades e progressão

Sem jade: {pct(p['mature_no_jade']['any20'])}chega a+20; jade em dobro: {pct(p['mature_double_jade']['any20'])}; metade dos pergaminhos de eventos: {pct(p['mature_half_events']['any20'])}; loja hipotética sem limite econômico (1000/semana): {pct(p['mature_unbounded_shop']['any20'])}. Esses valores demonstram dependência de regras ainda não decididas. Não foi criado boss ou SKU real.

Reduzir o expoente de crescimento das hunts de1,3 para0,65, com seed holdout, produz {pct(p['mature_bounded_materials_holdout']['any20'])}de+20. Essa alteração isolada não estabelece aprovação. A candidata original foi preservada; nenhum gate foi relaxado após os resultados.

Em24contas novas de diagnóstico,2hativas+8hoffline/dia, a mediana chega ao nível1000 em7dias e ao andar1000 em30dias. A mediana de Coins brutos obtidos até30dias é {probes['progression'][-1]['earnedMedian']['coin']:,}. São fluxos acumulados antes dos gastos, não saldo nem inflação medida de um mercado real. Mesmo sem meta contratada de duração de campanha, isso é um alerta contra chamar esse estágio de extremo late-game. Curvas deXP, escalonamento quadrático de equipamento/recompensa, orçamento de atributos e duração pretendida precisam ser calibrados juntos.

### Builds, acesso e fontes

As seis preferências acessam carvão e ferro sem sorte de equipamento: com espada, cerca de0,5h/1hativas; sem espada, cerca de2,5h/3h. Resultado restrito ao modelo/estratégia, com valores por build em `bootstrap-builds.json`.

Grade de16contextos, orçamento igual de pontos e equipamento igual por nível: vencedores {r['builds']['wins']}; maior participação {pct(r['builds']['largestWinnerShare'])}. Cumpre o gate mínimo de dois vencedores, mas **não prova utilidade equivalente deDefF,DefM,Sorte eDestreza**: builds defensivas não vencem o objetivo de abates/hora desta grade. Precisam de perfis de sobrevivência/inimigos e testes reais adicionais antes de implementação de todos os atributos.

Hunts não concedemCoin/equipamento/pergaminho/jade; principal geraCoin/XP/equipamento e drop elegível de pergaminho. Um único contexto econômico por vez;8hoffline no contexto já concluído, build congelada, sem novos andares nem boss repetido. Contas verificam saldo inicial+fontes−gastos, sem negativos ou vazamento no escopo simulado.

## Mercado e consumidores antigos — cobertura e bloqueios

| Sistema | Evidência / situação | Ação necessária antes do corte |
|---|---|---|
| Mercado finito |120contas,90rodadas;{audit['market']['trades']}negociações; sem Coin/material criado nas transferências, taxa de anúncio100.000Coin e10%de venda | Validar preços/liquidez/demanda com produção real; não tratar ordem sintética como jogador |
| Concentração e alts | Sem modelo de coordenação ou funil de pergaminhos | Definir vinculação/tradabilidade e limites antes de aprovar vantagem paga |
| Descarte atual | `packages/shared/src/rpg.ts`:cada item devolve10×nível em ferro | Cortar/converter essa fonte junto das minas, ou viola exclusividade da hunt; modelo usaCoin por hipótese |
| Overflow de evento | `apps/server/src/community-events.ts`:inventário cheio pode converter equipamento em ferro | Revisar conversão também; não basta esconder botão de mineração |
| Fundição/forja | Ferro+carvão→ferro fundido; fabricação consomeCoin,ferro,carvão,ferro fundido,ouro/jade em níveis avançados | Definir permanência/custos, proibir geração de jade por rota alternativa; incluir na próxima simulação |
| Pet/tônicos/afixos | Efeitos e receitas ligados à produção/mineração atual | Redesenhar ou aposentar com compensação; não vender atributo sem efeito |
| Eventos existentes | Boss/eventos/arena/guerra concedemCoin e loteria concedeRuby | Separar exceções às fontes, revisar renda deRuby que compra proteção; não simulado como renda grátis |
| Loja e anúncios experimentais | Bônus deCoin/XP/dano/autoclique herdados | Permanecem desativados; não manter renda dupla no corte; sem publicação comercial |
| Jade | Produção passiva atual conflita com fonte exclusiva futura | Remover fonte antiga atomicamente; registrar saldo legado separado e contrato do boss em etapa própria |
| Migração | Itens não lendários antigos+16–20, investimentos e estoques existentes | Ensaiar compensação/backup/idempotência/reversão antes deR2/R6; sem alteração do banco nesta etapa |
| Motor completo | Invariantes do modelo, não concorrência/ledger do servidor | Validar contratosR2, replay/escrow/FPS/offline, Windows e bancos nas etapas respectivas |

No estresse de mercado, taxas drenaram {pct(audit['market']['coinBurned']/audit['market']['initialCoin'])}do caixa inicial. O mercado deste ensaio não tem novas fontes durante as rodadas e a procura é hipotética; isso **não mede** a taxa ideal nem prova escassez/inflação em produção. A conservação foi testada, o equilíbrio do mercado está pendente. Recursos/slots/estoques e compensações não definidos não foram escondidos atrás de uma aprovação geral.

## Decisão e próximo passo

**Reprovada a candidataR0. R2 não começou.** Código do jogo, saves, banco, launchers, bosses e loja permanecem na versão publicada anterior. O checkpoint contém a análise executável e os resultados, para não perder progresso.

Próxima iteraçãoR1.1: (1)recalibrar oferta total de proteção e curva+16–20 com a meta intacta; (2)ajustar tempo de campanha/XP e relação fontes×consumos; (3)fechar contratos de descarte/forja/pet/eventos e saldos legados; (4)testar jade/loja como faixas e impedir ativação+16–20 enquanto a fonte definitiva não existir; (5)validar com seed nova, grade de sobrevivência, mercado finito acoplado à renda e playtest. Só depois de passar os gates e eliminar entradas materiais indefinidas iniciar contratos/migração. Não trocar a condição do usuário por uma aprovação parcial.

## Reprodução e verificações

Ver `scripts/economy-r1/README.md`. `audit.py`: **{audit['tests']}testes, zero falhas/erros**, inclusive comparação independente com a médiaMarkov do refino. `npm run typecheck`, compilação Python e `git diff --check` aprovados. Não foram alegados novos testes Windows/PostgreSQL/online, pois não há mudança de runtime e o modelo não implementa esses caminhos.

Dados: `criteria.json`, `content-baseline.json`, `results.json`, `audit-results.json`, `bootstrap-builds.json`, `probes.json`. Os hashes do simulador, conteúdo e critérios e as seeds estão no resultado principal. Cenários amadurecidos não são contados como novos jogadores, sensitividades não são decisões do produto e conservação não equivale a balanceamento.
'''
text=re.sub(r'(?<=\d)(?=[A-Za-zÀ-ÿ])',' ',text)
(m.DATA/'VALIDATION_REPORT.md').write_text(text)
