# Consumidores v2 e coortes — V9

21/10/2026. Economia real permanece `ECONOMY_V2_ACTIVE=false`; monetização e +16–20 continuam indisponíveis. Esta etapa integra consumidores em ensaio, antes do corte. Nenhum saldo legado é gasto, cancelado ou convertido.

## Fluxo integrado

Mais → Prévia da economia → **Integrado v2**. Dois personagens persistidos em um único estado versionado. Cada personagem usa a mesma carteira/inventário em torre, hunts, atributos, refino, mercado e eventos. A compra conserva ID/qualidade/refino; equipar recalcula os mesmos stats consumidos por combate/eventos. Jade e pergaminhos de eventos entram nessa carteira uma vez por fonte/conta. Banner e ranking leem a mesma edição que concede Jade.

O ensaio começa no nível 1 sem recursos extras. Um botão separado carrega uma fixture explicitamente sintética nível1000/lendário+15/2milhõesCoin. Reiniciar substitui os dois personagens e o mercado/eventos somente desse ensaio. Os laboratórios antigos continuam disponíveis como testes isolados; seus saves não são somados/importados. Relógio de teste explícito: fechar a janela não simula presença nem concede offline automaticamente.

O coordenador `integrated-v9.ts` reutiliza R6/R7/mercado/R8 sem copiar fórmulas. Processa fatias limitadas, persiste alvo pendente, recusa novo alvo/mutações durante backlog. Eventos reservam tempo exclusivo inclusive em ausência após expirar lease; sem XP/Coin/farm duplo. Heartbeats são simulados apenas no botão de presença, a cada10s. O retorno de ausência não renova presença retroativa.

## Consumidor de leitura no servidor

`economyConsumersV9` é projeção por lista explícita de campos: HUD/carteira, stats, mochila/cofre, combate/hits, quota offline, histórico próprio de mercado, edição/ranking/broadcast. Não transmite RNG, segredos, jobs offline, stats privados de outros participantes ou suas carteiras. Não é o snapshot privado dos serviços.

`npm run economy:rehearsal -w @akai/server -- consumers --run UUID` usa uma transação **REPEATABLE READ READ ONLY** para ler o mesmo run SQL compartilhado por R6/mercado/eventos e projetar seus dados, com revisão autoritativa da linha. Não avança tempo, cria grant ou grava recibos. Exige acesso operacional ao banco, sem rota HTTP pública. Uma API futura deve autenticar e derivar pertencimento pela sessão; nunca aceitar UUID livre como autorização. Relatórios não publicam nome de guilda/chat privado.

O coordenador de navegador é ferramenta determinística local, não substituto do backend: tempo/seeds no navegador não concedem saldo online. Escritas do servidor continuam nos adapters SQL existentes, com HMAC privado, relógio do servidor, locks, idempotência, ledger/outbox e revisão única. Os testes SQL desta etapa exercitam os três adapters sobre os mesmos runs e comparam a projeção. A interface pública antiga, arena competitiva, guildas e temporadas ainda não foram cortadas para v2.

## Validação das coortes

`node scripts/economy-v2/audit-consumers-v9.mjs` grava `cohort-results.json`. Coortes de entrada: 3 políticas ×3seeds ×2contas, nível1 sem moeda/equipamento/XP extra; treino adquirido por Coin e materiais reais, até2h para liberar carvão/ferro; depois ausência8h em andar concluído. Registra censura, saldos, atributos, progressos e acessibilidade da taxa de anúncio, sem descartar perdedores.

Coorte tardia:12participantes com equipamento/atributos/fundos **sintéticos declarados**, combate real/leases, dano coletivo limitado a100milhões, top10, último golpe, base de participação, broadcast, proteção semanal, compra de material e conservação após taxas. Não representa aquisição dos itens, esforço para+15 ou demanda de mercado. Não há +20 de teste fingido como adquirido.

A barreira temporal de XP é calculada separadamente. Um piso96dias qualificados não prova campanha terminável em120dias, nem aquisição/fortalecimento/conquistas compatíveis. O relatório mantém `activationReady:false` mesmo se a integração passar. Pendente: campanha longa adquirindo gear/refino/materiais, distribuição e demanda de mercado, taxa100k, população/sharding/alt/último golpe do boss, capacidade, migração dos consumidores sociais públicos, ensaio de corte/rollback e playtest gratuito. Não há aprovação automática da economia por um exit0 do script.

## Evidências

Testes shared de carteira/ID/stats, grants únicos, exclusividade, backlog/reload e redação. Suíte SQL própria em schema isolado, com fluxo mercado→equipamento→projeção e evento→carteira→projeção, preservando conta real. Smoke dev/preview ampliado cobre mercado/Jade/pergaminhos na mesma carteira, ausência, recarga e320/390/844/1280px. Check e CI em execução; fechamento registra os resultados efetivos.

Próxima fase: campanha longa com política de aquisição/consumo/refino reproduzível e revisão das falhas econômicas encontradas; depois integração autenticada em ambiente de playtest e consumidores de arena/guilda/temporadas. Ativar somente após os gates pendentes passarem.

Resultado local das coortes:18/18liberaram carvão/ferro; ferro entre2430s e4240s na amostra. Após a ausência, nenhuma das18carteiras podia pagar100milCoin; saldo final entre1192 e81345Coin. Isso é uma observação do período/políticas testados, não prova de impossibilidade futura ou recomendação de taxa definitiva. Variação finalnível3–23 e interrupções por derrota exigem política de farm seguro/recuperação na campanha longa. Coorte12tardia:1386Jade=36participação+1100top10+250último; maior recebedor313Jade(22,58%daemissão),1broadcast,5pergaminhos/conta e120000Coin queimados em anúncio+venda, carvão conservado. Piso de XP96dias qualificados, campanha90–120ainda não certificada.

## Fechamento validado

Runtime validado: `4874740b61bd6c08c01fa72d6eae53f728caa90f`, árvore `a40db6e4c9597e278fbfaa11d58fce0493e703fc`. [CI principal39582409783](https://github.com/marmitero/projeto-akai/actions/runs/39582409783) e [Windows39582409841](https://github.com/marmitero/projeto-akai/actions/runs/39582409841) aprovadas. **285testes/33arquivos com PostgreSQL16, sem skips**, incluindo6shared e3SQL novos; typecheck, assets, builds, auditorias R2–R8/mercado/V9/readiness e regressões completas dev/preview aprovadas. O check local inicial teve159pass/125PGskips; os6shared finais passaram localmente e a CI fornece a evidência SQL completa.

Browser: carteira única em compra de carvão,453Jade e broadcast250,5pergaminhos semanais, ausência sem farm de evento duplicado, reload e320/390/844/1280px. O participante da simulação fica fixo e o seletor é bloqueado durante processamento. Teste shared adicional compra ferro no mercado, ganha proteção no evento e consome ambos no mesmo refino, conferindo cada débito e preservação do item.

Uma rodada anterior (`e9ee823`, CI39579624916) passou todos os285testes SQL, mas expirou aguardando o texto transitório de confirmação no smoke do mercado legado em preview. A revisão de runtime seguinte (`199a1b9`, CI39581583619) passou a suíte completa. O helper do smoke foi então fortalecido para exigir o recibo HTTP bem-sucedido com `status=applied`, além do painel confirmado/sincronizado; uma atualização automática do texto não é a única prova. A CI final passou esse fluxo em dev e produção. Nenhuma fórmula/regra do mercado legado foi alterada.

Coortes e relatório de prontidão permanecem `activationReady:false`. **Não estão aprovados** campanha adquirida90–120dias, liquidez/demanda/população, corte de contas reais ou consumidores sociais públicos. Ver [protocolo da próxima campanha](CAMPAIGN_GATE.md). Publicação via [PR18](https://github.com/marmitero/projeto-akai/pull/18); fechamento posterior apenas documental, sem alterar runtime, testes, scripts, SQL ou JSON validados.
