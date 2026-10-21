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
