"""Render calibration evidence and split raw trajectories for reviewable publication."""
import json,hashlib,math
from pathlib import Path
import calibrate as c
r=json.loads((c.OUT/'results.json').read_text());s=r['summaries'];tests=json.loads((c.OUT/'tests.json').read_text());raw=json.loads((c.OUT/'cohorts.json').read_text())
def pct(v):return f'{100*v:.1f}%'.replace('.',',')
def days(v):return 'não atingiu na janela' if v is None else str(v)
rows='\n'.join(f"| {name} | {p['n']} | {p['active']}+{p['offline']} | {days(p['maxLevelDays']['min'])} | {days(p['maxLevelDays']['p50'])} | {days(p['maxLevelDays']['p90'])} | {pct(p['maxLevelBy120Fraction'])} |" for name,p in s.items() if not p['mature'])
gates='\n'.join(f"| {name} | {'PASSOU no modelo' if value else 'NÃO APROVADO / pendente'} |" for name,value in r['gates'].items())
thresholds=[dict(level=L,minimumEffectiveHours=round(c.THRESHOLDS[L-1]/3600,2),idealCalendarDays=round(c.THRESHOLDS[L-1]/86400,2),maxEquippableItemLevel=c.item_level(L)) for L in (1,100,250,500,750,900,1000)]
(c.OUT/'thresholds.json').write_text(json.dumps(thresholds,indent=2)+'\n')
table='\n'.join(f"| {v['level']} | {v['minimumEffectiveHours']} | {v['idealCalendarDays']} | {v['maxEquippableItemLevel']} |" for v in thresholds)
strong=[]
for a in r['ablation']:
 if a['build']=='swift':strong.append(f"| {['Comum','Incomum','Raro','Épico','Lendário'][a['rarity']]} +{a['refine']} | {'Vence' if a['encounters']['main999']['safe'] else 'Falha'} | {'Vence' if a['encounters']['gold1000']['safe'] else 'Falha'} |")
fixture='\n'.join(strong)
free=s['mature_free'];paid=s['mature_paid'];n=sum(p['n'] for p in s.values());best=s['best_24h'];hold=s['best_holdout'];ci=c.m.wilson(round(best['maxLevelBy120Fraction']*best['n']),best['n'])
status='Gates numéricos passaram; aprovação de produção ainda bloqueada.' if r['numericalApproval'] else 'Há gates numéricos reprovados; não aprovar produção.'
text=f'''# R1.1 — Calibração de tempo e conquistas

18/10/2026. **{status}** Esta é uma calibração executável, não uma atualização do jogo instalado. Nenhum save/banco/launcher foi modificado. [Critérios](criteria.json) · [Resultados](results.json) · [Reprodução](../../../../scripts/economy-r11/README.md).

## Resultado principal

Pedido: no melhor cenário legal, chegar ao nível máximo em aproximadamente90–120dias; conteúdo avançado deve exigir bons equipamentos/refino e conquistas, sem depender apenas de nível ou tempo.

Candidata2: melhor perfil contínuo, desde conta nova, mediana **{best['maxLevelDays']['p50']}dias**, mínimo observado **{best['maxLevelDays']['min']}**, p90 **{best['maxLevelDays']['p90']}**; {pct(best['maxLevelBy120Fraction'])}até120dias. Holdout independente: mediana **{hold['maxLevelDays']['p50']}**, {pct(hold['maxLevelBy120Fraction'])}até120. Perfil16honline+8hoffline: mediana **{s['optimized_16plus8']['maxLevelDays']['p50']}dias**.

O modelo possui piso matemático de **96dias**: mesmo com equipamento transferido, todos os drops favoráveis e recursos abundantes, a conta não gera mais de um segundo de XP qualificado por segundo de atividade econômica válida. O máximo exige2304horas qualificadas. Nenhuma combinação online/offline pode somar mais de24h/dia. Isso depende de o futuro motor aplicar o mesmo pipeline a todas as fontes deXP; não é uma proteção já implantada no servidor.

Os90–120dias são o cenário eficiente, não promessa para toda conta. Na coorte principal houve uma trajetória de{best['maxLevelDays']['max']}dias. Perfis com menos tempo ou escolhas/equipamento menos eficientes demoram mais. A proporção observada de conclusão até120d tem IC95% {pct(ci[0])}–{pct(ci[1])}:24contas/perfil permitem calibrar, mas não provar estatisticamente um resultado populacional de90%. Modelos também não substituem playtest humano.

## Curva de XP proposta

Unidade de simulação: segundo qualificado de domínio em vitória. **Não é o `heroXp` antigo e não pode substituir seus valores diretamente.**

Para cada nível destino, peso w(n)=0,05+2×(n/999)^1,7, com n=1…999. Normalizar a soma para2304horas. Curva crescente: início com conquistas frequentes, metade final concentra a maior parte do esforço. Na implementação futura, usar tabela inteira versionada e carry/remainders determinísticos; não calcular floats diferentes no cliente e servidor.

| Nível | Horas qualificadas acumuladas mínimas | Dias ideais a24h | Nível máximo de item equipável |
|---:|---:|---:|---:|
{table}

Esses são limites ideais, não datas prometidas de cada marco. Tempo em eventos, escolhas de farm, equipamento inadequado, derrotas, loot, transições e fracionamento dos encontros aumentam as datas orgânicas.

Recompensa por vitória: `min(tempo do ciclo concluído, tempo de referência no mesmo encontro) × min(1,(andar equivalente/nível do herói)²)`. Referência: build ágil com orçamento legal e equipamento épico+10 apropriado ao nível. Um conjunto fraco leva mais tempo que a referência e rende menosXP/h; matar inimigos triviais abaixo do nível sofre redução. Ao atingir a eficiência de referência, o teto estabiliza o prazo mesmo com bônus. O ciclo inclui a transição daquele encontro concluído; não há crédito por espera livre, batalha perdida, login, entrar/sair ou encontro parcial. É uma regra nova candidata de recompensa/limitação de fluxo, não apenas multiplicar a antigaXP.

Não é necessário completar missão diária para receberXP, nem existe reset diário dessa barra. Não há estoque inicial/catch-up que permita atravessar o piso. Repetir andares elegíveis segue permitido; bosses concluídos não. No offline, só a atividade já concluída/selecionada; stats congelados. Recalcular referência e elegibilidade em cada nível cruzado evita usar por8h a taxa fácil do primeiro nível do lote. O teste de200encontros em lote versus separados verifica esse caminho com stats fixos; não equivale à determinística do motor inteiro com loot.

## Tempo + conquistas + equipamento

Equipar item de nívelL requer herói `10×(L−1)+1`; item100 exige herói991. Isso fecha a rota antiga de usar todo o conjunto máximo ao chegar apenas ao nível100. Nível por si só não dá uma arma forte: é preciso obter base adequada, farmar materiais, escolher atributos e financiar fortalecimento.

Inimigos comuns após andar100 recebem rampa gradual, com t=max(0,(andar−100)/900): HP×(1+2t²), ATQ×(1+25t³). Hunts usam âncoras de poder da proposta, dificuldade carvão<ferro<ouro, rampa adicional e janela de execução nas faixas finais. A partir do andar750, a janela do encontro cresce de20s até30s no1000, exigindo dano e não só vida para aguentar indefinidamente. Esses números são orçamentos de teste, não fases/mecânicas novas de boss.

Ablation no herói1000: mesmos pontos e mesmo nível de equipamento; só raridade/refino variam. Exemplo da build ágil:

| Conjunto | Andar comum999 | Hunt ouro1000 |
|---|---|---|
{fixture}

Nas seis builds testadas, comum+0 e raro+0 falham em ambos os desafios. Uma build épica+12 legal passa; lendário+15 oferece alternativas nas demais. Isso prova necessidade de investimento no envelope testado; não que todo equipamento lendário deva ser+15, nem que todos os slots precisem do mesmo refino. Grade registra resultados por build/raridade em `results.json`. O agente orgânico compra equipamento/refino com saldo limitado, começa sem doações e prioriza todos os slots até+7 antes de refino alto na arma. Resultados ainda dependem de modelar afixos/pets/consumos e inimigos mágicos reais.

Para futuras raids avançadas: usar esse envelope de equipamento/DPS/sobrevivência e conquistas prévias de torre/hunts como base de acesso, não vender entrada apenas por nível. **Não existem raids novas implementadas ou validadas por este ensaio.** Mecânicas e recompensas dos bosses continuam em etapa própria. As definições dos bosses atuais da torre foram preservadas byte a byte; por isso a dificuldade deles ainda precisa de calibração na fase específica e não se afirma que a campanha inteira está pronta para produção.

## Fortalecimento e prestígio

- +1–3: falha mantém; +4–7:−1; +8–12: regressão/quebra; +13–20: falha sem proteção quebra. Todas as consequências originais preservadas.
- Proteção não aumenta a chance; consome um pergaminho por tentativa protegida e transforma falha em−1. A política simulada recusa risco sem proteção a partir de+8; o produto futuro permitirá decisão explícita conforme requisitos.
- Chances+1–15 preservadas. Novas candidatas+16–20: **32%,27%,22%,17%,12%**. +20 não é requisito para nível máximo nem para vencer o envelope final.
- Manter materiais por destino e limite de raridade:16–20só lendário+. A partir de+11, custos anteriores×4Coin/×4carvão/×8ferro/×4ouro; jade inalterada. Aumentar demanda real dos materiais, sem tornar o bootstrap caro. Detalhes em código/config versionados.
- Reduzir crescimento dos drops de materiais para expoente0,65; Coin final reduzida gradualmente até25%da recompensa base. Custos competem com treinamento e gear; não há recursos infinitos nas contas orgânicas.

Coorte madura90dias,300contas gratuitas, base lendária100 já disponível: **{pct(free['any20'])}com+20** (IC95% {pct(free['any20Wilson95'][0])}–{pct(free['any20Wilson95'][1])}), contra32,7% na candidata anteriorR0. Com dez pergaminhos pagos/semana hipoteticamente financiados: **{pct(paid['any20'])}**. Não confundir esse fixture com chegar à maturidade em90dias. Estoques/múltiplas bases/item baixo/mercado podem alterar a escassez global; a proporção real ainda precisa de amostra maior e contratos definitivos.

Continuam hipóteses:30pergaminhos/eventos por semana,10de loja e3jade/dia com participação. Jade segue exclusiva do futuro boss global diário; nenhuma fonte alternativa foi criada. PreçoRuby, tradabilidade e proteção contra funil de alts não foram definidos/ativados. Não se deve aprovar comércio monetizado com base apenas no gap medido.

## Coortes e gates

Total: **{n}trajetórias**, de90a365dias. Seeds de aceite88452001 e holdout99337001; pilotos separados. Contas que não terminam continuam no denominador; quantil censurado aparece como “não atingiu”.

| Perfil | Contas | Horas online+offline/dia | Primeiro máximo | Mediana | p90 | Máximo até120d |
|---|---:|---:|---:|---:|---:|---:|
{rows}

Horas “online” significam jogo em batalha automática, não quantidade de cliques.8hoffline é o limite herdado/proposto nesta candidata. Os perfis regulares não foram apresentados como se jogassem24h. O piso teórico de2304h implica no mínimo230,4dias a10h/dia ou144dias a16h/dia, antes de ineficiências. Alterar esse limite offline muda os prazos e exige nova simulação.

| Gate fixado antes do aceite | Resultado |
|---|---|
{gates}

O primeiro candidato, com referência épico+12, foi rejeitado:62,5%do melhor perfil até120dias, embora a mediana fosse115. Resultados brutos e resumo preservados em `rejected-candidate-1*.json`; não relaxamos gates. Candidata2 mudou a referência para épico+10, preservou o piso96dias e rodou seeds novas. O primeiro ensaio foi interrompido após os perfis suficientes para identificar a reprovação; não é apresentado como validação completa daquele candidato.

{tests['tests']}testes passaram, incluindo limite temporal, contabilidade por fonte/gasto, fontes exclusivas das hunts, equipamento por nível, ausência deXP sem vitórias, falha/proteção, bosses preservados, retorno a andar seguro, batches cruzando níveis e censura de amostra. `assert` verifica saldos não negativos, tempo e teto de domínio ao longo das contas. Esses testes validam o modelo, não servidor/concorrência/banco/Windows. Dados e scripts têm hashes no manifesto; os resultados principais registram os hashes dos seus insumos.

## Limites e decisão de implementação

**Ainda não há aprovação integral para ativar gameplay.** Falta fechar oferta definitiva de jade/participação do boss, Ruby/eventos/transferência de pergaminhos, afixos/pets/forja/descarte/overflow, compensações e migração. O mercado continua sem demanda/liquidez humana acoplada; o teste de conservação anterior não prova preço nem acesso a equipamento. Doações, compra de gear e alts não encurtam o piso temporal se o futuro pipeline for respeitado, mas podem alterar a chance de completar perto dele e o número de+20.

A bolsa futura de itens nesta simulação limita100candidatos e descarta excessos; o stash segue a políticaR1. Não é a UI de inventário final, nem auditoria completa de conservação de cada instância. Combate usa dano esperado e reserva25%deHP, não caudas reais de esquiva/crítico. Fonte de eventos/recompensas legadas e bosses atuais exigem revisão antes de lançamento. A novaXP exige migração versionada: não zerar nem reinterpretar saldos antigos.

Esta etapa entrega a curva candidata, o prazo medido, a exigência de equipamento e a validação reproduzível. O histórico e o jogo publicado ficam preservados. Próximo passo: fechar entradas materiais e validar mercado/migração/boss em seus escopos; iniciarR2 somente quando os gates completos autorizarem, mantendo a nova economia desativada durante a preparação. Monetização permanece adiada.
'''
# Readable separation in generated Portuguese; preserve paths/code expressions.
import re
text=re.sub(r'(?<=\d)(?=[A-Za-zÀ-ÿ])',' ',text)
(c.OUT/'CALIBRATION_REPORT.md').write_text(text)
# Preserve raw trajectories without a giant unreviewable JSON file in git.
folder=c.OUT/'cohorts';folder.mkdir(exist_ok=True)
for name,profile in raw.items():
 for start in range(0,len(profile['rows']),50):
  payload={k:v for k,v in profile.items() if k!='rows'};payload['rowStart']=start;payload['rows']=profile['rows'][start:start+50]
  (folder/f'{name}-{start:03d}.json').write_text(json.dumps(payload,separators=(',',':'))+'\n')
manifest={str(p.relative_to(c.ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(list((c.ROOT/'scripts/economy-r11').glob('*.*'))+[p for p in c.OUT.rglob('*') if p.is_file() and p.name not in ('cohorts.json','manifest.json')])}
(c.OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Report rendered; numerical approval:',r['numericalApproval'],'implementation:',r['implementationApproved'])
