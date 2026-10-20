# R3 — motor de combate e builds

20/10/2026. [PR10](https://github.com/marmitero/projeto-akai/pull/10). Motorv3implementado e laboratório acessível em **Mais → Laboratório de builds**. A economia nova continua desativada:esta etapa não migra a conta nem substitui automaticamente a batalha antiga. O laboratório permite revisar as mecânicas antes da integraçãoR4/R6.

## Como testar

Abra `jogar.bat`, `servidor.bat` ou `celular.bat` com o projeto atualizado. No menuMais, abra o laboratório. Escolha nível, preset, equipamento de cenário, andar comum, inimigo e semente; pressione **Simular60segundos**. O resultado mostra pontos,ATQ,HP,DefF,DefM,ataques/s,crítico,acerto e os últimos64golpes. Mesma configuração/semente produz o mesmo resultado.

“Equipamento de cenário” não é item recebido:nenhuma moeda,XP ou peça é concedida/gasta pela simulação. O jogo normal pode continuar sua batalha automática em segundo plano; o laboratório não envia comando de treino/compra ao servidor. Os presets distribuem pontos iguais, sem alegar que a conta possui recursos para comprá-los. É possível ajustar manualmente a distribuição; excesso de pontos é recusado. Andares de boss não são simulados por este catálogo comum. Se escolher um inimigo antes do seu desbloqueio, a simulação informa o bloqueio.

## Contratos do motor

| Atributo | Efeito |
|---|---|
|Força|+2ATQ/treino, além de base e equipamento|
|Vitalidade|+15HP/treino|
|Agilidade|Redução gradual do intervalo, com custo5pontos/nível|
|Defesa física|+2defesa/treino, aplicada à parcela física|
|Defesa mágica|+2defesa/treino, aplicada à parcela mágica|
|Sorte|Crítico:5%+0,04ponto percentual/treino, teto45%|
|Destreza|Acerto:+0,015ponto percentual/treino, sem acelerar ataques|

Orçamento6×(nível−1). Atributos comuns até1000;AGIatémin(800,ceil(0,8×(nível−1))). AGImáxima custa4000dos5994pontos no nível1000; não é possível maximizar tudo. BaseATQ6+2F+2(nível−1);HP100+15V+10(nível−1).

### Equipamento e ASPD

Atributos do item calculados pela base imutável, nível,raridade,qualidade e ganho de refino G=1+0,025n+0,0015n². Defesa usa escala linear de nível;ATQ/HP, quadrática, conforme modelo anterior. Defesa genérica de equipamentos é mapeada paraDefF eDefM; treino diferencia os tipos. Sem novos bônus de pet,tônico ou afixos. Há mínimo+1de feedback no primeiro refino de atributo primário positivo, sem fabricar atributo ausente.

AGIde equipamento tem orçamento conjunto200, distribuído entre as peças equipadas:nível>70,raridade acima de incomum e refino. Soma das frações é arredondada uma única vez; nove peças lendárias100/+20chegam exatamente a200, sem perder2pontos por arredondar cada peça. Uma peça barata não entrega200. AGItreinada≤800 + equipamento≤200 alimenta tabela congelada de1001intervalos:

ASPD=150+40×q^1,25; intervalo=ceil(max(200,20×(200−ASPD)))ms. Base1000ms; mínimo200ms=5ataques/s. Não é uma cópia da fórmula de classes/armas deRagnarok:usa o limite/ritmo como referência da proposta. Destreza não reduz intervalo. Não há multiplicador aplicado depois do teto. Para atingir exatamente5/s é necessária build especializada e equipamento extremo; presets equilibrados podem ficar abaixo disso mesmo no nível máximo.

`scripts/economy-v2/generate-aspd.py` gera a tabela comDecimal60dígitos. Runtime não executa potência fracionária. Equipamento bloqueado por nível/slot, duas mãos e identidades duplicadas continuam validados pelaR2.

### Acerto → crítico → mitigação → dano

Chance de acerto:85%+0,015p.p.×Destreza−0,01p.p.×Evasão, limitada60%–99,5%. No snapshot técnico,evasãoé armazenada em décimos para representar0,1×andar sem truncar casas; a probabilidade é inteira por100.000. Só um golpe acertado pode critar. Crítico multiplica o dano bruto por1,5; não ignora defesa. Erro causa0 e nunca é crítico.

Mitigação de cada tipo:0,75D/(D+K),K=100+2×andar equivalente. Dano misto separa as parcelas, aplica somente sua defesa e soma as frações antes do arredondamento final. BigIntevita perda de precisão intermediária. Dano positivo mínimo1; dano confirmado limitado aoHP restante, sem premiar overkill. Esse pipeline é compartilhável entre modos, mas **arena,raid,boss e guerra legados ainda não o utilizam**; integração e balanceamento por modo serão posteriores.

Inimigos comuns:R1.1mantém rampas tardias deHP/ATQ; não modifica as definições antigas. Shadow é mágico;Inquisitor70%mágico,Mushroom25%,Owlet50%, a partir do andar11respeitando desbloqueios. Arqueiros continuam físicos e possuem metadado de alcance. Catálogo não gera fichas de boss. NPCs têm acerto real e não critam nesta versão; a calibração anterior de dano esperado não substitui o combate real.

## Agenda e persistência

`startCombatV3` congela stats/HP/intervalos do encontro. Primeiro golpe ocorre depois de um intervalo completo. Datas são milissegundos inteiros; instantes simultâneos usam guerreiro primeiro e inimigos porID estável. Mortos não atacam; alvo do guerreiro é o primeiro vivo nessa ordem. Deadline é exclusivo, inclusive no instante exato. Terminal não cria novos ataques. Não há cura/recriação de encontro ao redistribuir pontos dentro da agenda; o motor não lê alterações externas de build após o início.

`advanceCombatV3` resolve os mesmos eventos por delta curto ou em lote; o limite de trabalho retorna `backlog=true` com cursor preservado, nunca pula golpes nem credita tempo ainda não processado. RNG/agenda/hits são serializáveis para retomada. RNGxorshift32é determinístico, **não criptográfico**:numa conta real, seed/estado devem ser privados do servidor e nunca aceitos do cliente. O laboratório usa semente pública por ser simulação sem recompensas. A projeção pública do servidor deve ocultar oRNG quando este motor for integrado.

O teste de equivalência faz60segundos a30/60/144FPS(14.040avanços), compara com lote único e comJSONsalvo/recarregado. Seu timeout de teste é30spara essa carga de validação/clonagem; isso não significa que cada frame deva executar todo o motor no produto nem certifica desempenho emAndroid. A renderização deve consumir hits confirmados; o servidor usa a agenda, nãoFPS ou número de requisições.

## Compra de atributos

`attributeCost` congela o contrato com aritmética racional59/50para1,18, sem floats em preços. Coinbase por atributo:100/80/150/100/100/120/90. A partir do21crescimento polinomial; marcos de10exigem ferro25×marco, carvão10×marco desde50 e ouro2×marco desde200. Jade não é exigida. Retorno em milésimos inteiros/string.

`trainAttribute` é uma transição pura de tudo-ou-nada:valida orçamento/cap/todos os saldos antes de produzir cópia debitada+revisão. Recusa não altera o original. **Não é ainda o endpoint transacional de compra**:R6deve proteger comando esperado/IDidempotente, saldo,ledger,outbox e atualização concorrente. Não habilitar esse endpoint sobre o save legado. Redistribuição paga/equipamento/refino não são concedidos pelo laboratório.

## Evidência e limites

[Grade de270encontros](audit-results.json):3níveis×3inimigos×6presets×5sementes, pontos iguais e conjunto épico+9de cenário. Objetivo:minimizar tempo entre builds com maior número de vitórias. Vencedores por contexto:Veloz6/9,Crítico2/9,Equilibrada1/9. Essa diversidade restrita não prova equivalência das seis builds:DefF/DefM reduzem dano nos testes de pipeline, mas não lideram a grade de velocidade. Faltam cenários de sobrevivência de ondas completas, aquisição/custo e conteúdo avançado.

Testes cobrem custo/marco/rejeição atômica, orçamento ponderado, teto5APS, efeitos distintos deSorte/Destreza, defesa por tipo/dano misto, erros/críticos, FPS/lote/retomada, backlog, empate simultâneo, overkill, deadline e terminal. Navegador valida laboratóriodev/preview, reproduz resultado, recusa boss/orçamento, preserva carteira, abre/fecha sem duplicar canvas e verifica320/390/844/1280pxsem overflow horizontal. Relatórios combat-lab-dev/preview.json. Captura390×844revisada.

R3não reaprova o prazo109dias nem a raridade+20:XP/recompensas, hunts, aquisição/refino eJade competitiva ainda precisam da integraçãoR4–R8e validação acoplada. Economia permanece inativa; contas/bosses atuais não foram migrados. Próximo:R4hunts/repetição, usando o motor e preservando uma única atividade econômica. Monetização continua final.

### Fechamento validado

Runtime head `13cf7bfa7684883d0cc0c6a820ef5645de05e819`. [CI39439758129](https://github.com/marmitero/projeto-akai/actions/runs/39439758129) e [Windows39439758740](https://github.com/marmitero/projeto-akai/actions/runs/39439758740) aprovados:204testes/22arquivos comPostgreSQL16sem skips, builds/tipos/assets, auditoriasR2/R3 e regressões completas do jogo. Laboratóriodev/previewpassou também naCI. Localmente107testes passaram e97PGforam pulados, comtipos/build, laboratóriodev/preview e captura inspecionada. Verificação adicional do teto no motor:tentativas em200/400/600/800/1000ms, exatamente5/ssem golpe no instantezero.

O fechamento posterior altera apenas documentação/evidênciasJSON; cliente,servidor,tabelas,testes e scripts idênticos ao head validado. Próxima implementação:R4hunts e repetição; integrar recursos/XP somente respeitando a agenda e o teto temporal daR2. A publicação daR3habilita o laboratório, não o corte da economia da conta.
